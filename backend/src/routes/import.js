const express = require('express');
const router = express.Router();
const pool = require('../db');

// Attach gallery images to works in bulk, in a single transaction.
// Body: { attachments: [ { type: 'artwork' | 'digital', workId, imageIds, primaryImageId? } ] }
router.post('/attach', async (req, res) => {
  const { attachments } = req.body || {};

  if (!Array.isArray(attachments) || attachments.length === 0) {
    return res.status(400).json({ error: 'attachments must be a non-empty array' });
  }

  const tableMap = {
    artwork: { works: 'artworks', link: 'artwork_images', idColumn: 'artwork_id', label: 'artwork' },
    digital: { works: 'digital_works', link: 'digital_work_images', idColumn: 'digital_work_id', label: 'digital work' },
  };

  // Validate everything up-front so we don't write partial state.
  const problems = [];
  for (const [i, a] of attachments.entries()) {
    const meta = tableMap[a.type];
    if (!meta) {
      problems.push(`[${i}] unknown type "${a.type}"`);
      continue;
    }
    if (!Number.isInteger(a.workId)) {
      problems.push(`[${i}] invalid workId`);
      continue;
    }
    if (!Array.isArray(a.imageIds) || a.imageIds.length === 0 || !a.imageIds.every(Number.isInteger)) {
      problems.push(`[${i}] imageIds must be a non-empty array of integers`);
    }
  }
  if (problems.length) {
    return res.status(400).json({ error: 'Invalid attachments', details: problems });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const results = [];

    for (const a of attachments) {
      const meta = tableMap[a.type];

      // Verify the work exists.
      const workRes = await client.query(
        `SELECT id FROM ${meta.works} WHERE id = $1`,
        [a.workId]
      );
      if (workRes.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: `${meta.label} ${a.workId} not found` });
      }

      // Verify the images exist.
      const imgRes = await client.query(
        `SELECT id FROM gallery_images WHERE id = ANY($1::int[])`,
        [a.imageIds]
      );
      const foundIds = new Set(imgRes.rows.map((r) => r.id));
      const missing = a.imageIds.filter((id) => !foundIds.has(id));
      if (missing.length) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: `Image(s) not found: ${missing.join(', ')}` });
      }

      // Determine the next display_order and whether the work already has images.
      const orderRes = await client.query(
        `SELECT COALESCE(MAX(display_order), -1) + 1 AS next_order, COUNT(*)::int AS existing
         FROM ${meta.link} WHERE ${meta.idColumn} = $1`,
        [a.workId]
      );
      let nextOrder = orderRes.rows[0].next_order;
      const existingCount = orderRes.rows[0].existing;

      // Decide the primary image for this batch.
      const requestedPrimary = a.primaryImageId != null && a.imageIds.includes(a.primaryImageId)
        ? a.primaryImageId
        : null;
      const firstNew = a.imageIds[0];
      const hasPrimaryToSet = requestedPrimary || existingCount === 0 ? true : false;
      const newPrimaryId = requestedPrimary || (existingCount === 0 ? firstNew : null);

      // If a primary is being (re)assigned for this work, clear any existing primary first.
      if (newPrimaryId) {
        await client.query(
          `UPDATE ${meta.link} SET is_primary = false WHERE ${meta.idColumn} = $1`,
          [a.workId]
        );
      }

      for (const imageId of a.imageIds) {
        const isPrimary = imageId === newPrimaryId;
        await client.query(
          `INSERT INTO ${meta.link} (${meta.idColumn}, image_id, is_primary, display_order)
           VALUES ($1, $2, $3, $4)`,
          [a.workId, imageId, isPrimary, nextOrder++]
        );
      }

      results.push({ type: a.type, workId: a.workId, added: a.imageIds.length, primaryImageId: newPrimaryId });
    }

    await client.query('COMMIT');

    res.json({
      message: `Attached images to ${results.length} work(s)`,
      results,
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error attaching images:', error);
    res.status(500).json({ error: 'Failed to attach images', details: error.message });
  } finally {
    client.release();
  }
});

module.exports = router;
