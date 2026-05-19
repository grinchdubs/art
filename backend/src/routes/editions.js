const express = require('express');
const router = express.Router();
const pool = require('../db');

// Ensure copies 1..edition_total exist for a work's 'regular' edition_type.
// Idempotent — leaves existing rows alone, only inserts missing copy_numbers.
// If edition_total drops, existing extra rows are kept (no destructive auto-delete).
async function ensureRegularCopies(client, workType, workId) {
  const workTable = workType === 'artwork' ? 'artworks' : 'digital_works';
  const workCol = workType === 'artwork' ? 'artwork_id' : 'digital_work_id';

  const workRes = await client.query(
    `SELECT edition_total FROM ${workTable} WHERE id = $1`,
    [workId]
  );
  if (workRes.rows.length === 0) {
    throw new Error('Work not found');
  }
  const editionTotal = workRes.rows[0].edition_total;
  if (!editionTotal || editionTotal <= 0) return { created: 0 };

  // generate_series + LEFT JOIN finds missing copy_numbers in one round trip.
  const result = await client.query(
    `
    INSERT INTO print_editions (${workCol}, edition_type, copy_number, status)
    SELECT $1, 'regular', gs.n, 'available'
    FROM generate_series(1, $2) AS gs(n)
    WHERE NOT EXISTS (
      SELECT 1 FROM print_editions
      WHERE ${workCol} = $1 AND edition_type = 'regular' AND copy_number = gs.n
    )
    RETURNING id
    `,
    [workId, editionTotal]
  );
  return { created: result.rowCount };
}

// Recompute the parent work's sale_status:
//   - If the work has an edition (any copies exist) and EVERY copy is 'sold' → 'sold'
//   - Else if it has an edition and any copy is 'sold' → 'available' (still has stock)
//   - Else leave it alone (non-editioned uniques are managed by the sales route directly)
async function recomputeWorkStatus(client, workType, workId) {
  const workTable = workType === 'artwork' ? 'artworks' : 'digital_works';
  const workCol = workType === 'artwork' ? 'artwork_id' : 'digital_work_id';

  const counts = await client.query(
    `SELECT
       COUNT(*)::int AS total,
       COUNT(*) FILTER (WHERE status = 'sold')::int AS sold
     FROM print_editions
     WHERE ${workCol} = $1`,
    [workId]
  );
  const { total, sold } = counts.rows[0];
  if (total === 0) return; // No copies tracked — leave status alone

  const newStatus = sold === total ? 'sold' : 'available';
  await client.query(
    `UPDATE ${workTable} SET sale_status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
    [newStatus, workId]
  );
}

// GET /api/editions/artwork/:id — list copies for an artwork
router.get('/artwork/:id', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT pe.*, s.sale_date, s.sale_price, s.buyer_name
       FROM print_editions pe
       LEFT JOIN sales s ON pe.sale_id = s.id
       WHERE pe.artwork_id = $1
       ORDER BY
         CASE pe.edition_type WHEN 'regular' THEN 0 WHEN 'AP' THEN 1 WHEN 'PP' THEN 2 ELSE 3 END,
         pe.copy_number`,
      [req.params.id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching artwork editions:', err);
    res.status(500).json({ error: 'Failed to fetch editions' });
  }
});

// GET /api/editions/digital-work/:id — list copies for a digital work
router.get('/digital-work/:id', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT pe.*, s.sale_date, s.sale_price, s.buyer_name
       FROM print_editions pe
       LEFT JOIN sales s ON pe.sale_id = s.id
       WHERE pe.digital_work_id = $1
       ORDER BY
         CASE pe.edition_type WHEN 'regular' THEN 0 WHEN 'AP' THEN 1 WHEN 'PP' THEN 2 ELSE 3 END,
         pe.copy_number`,
      [req.params.id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching digital work editions:', err);
    res.status(500).json({ error: 'Failed to fetch editions' });
  }
});

// POST /api/editions/artwork/:id/ensure — generate any missing 'regular' copies (idempotent)
router.post('/artwork/:id/ensure', async (req, res) => {
  const client = await pool.connect();
  try {
    const r = await ensureRegularCopies(client, 'artwork', req.params.id);
    res.json(r);
  } catch (err) {
    console.error('Error ensuring artwork copies:', err);
    res.status(500).json({ error: err.message || 'Failed to ensure copies' });
  } finally {
    client.release();
  }
});

router.post('/digital-work/:id/ensure', async (req, res) => {
  const client = await pool.connect();
  try {
    const r = await ensureRegularCopies(client, 'digital_work', req.params.id);
    res.json(r);
  } catch (err) {
    console.error('Error ensuring digital work copies:', err);
    res.status(500).json({ error: err.message || 'Failed to ensure copies' });
  } finally {
    client.release();
  }
});

// POST /api/editions/artwork/:id/copies — add a new copy of a variant (AP/PP/HC, or extra regular)
router.post('/artwork/:id/copies', async (req, res) => {
  try {
    const { edition_type = 'AP', copy_number } = req.body;
    if (!['regular', 'AP', 'PP', 'HC'].includes(edition_type)) {
      return res.status(400).json({ error: 'Invalid edition_type' });
    }

    let nextNumber = copy_number;
    if (!nextNumber) {
      const r = await pool.query(
        `SELECT COALESCE(MAX(copy_number), 0) + 1 AS n
         FROM print_editions
         WHERE artwork_id = $1 AND edition_type = $2`,
        [req.params.id, edition_type]
      );
      nextNumber = r.rows[0].n;
    }

    const result = await pool.query(
      `INSERT INTO print_editions (artwork_id, edition_type, copy_number, status)
       VALUES ($1, $2, $3, 'available')
       RETURNING *`,
      [req.params.id, edition_type, nextNumber]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error adding artwork copy:', err);
    res.status(500).json({ error: 'Failed to add copy' });
  }
});

router.post('/digital-work/:id/copies', async (req, res) => {
  try {
    const { edition_type = 'AP', copy_number } = req.body;
    if (!['regular', 'AP', 'PP', 'HC'].includes(edition_type)) {
      return res.status(400).json({ error: 'Invalid edition_type' });
    }

    let nextNumber = copy_number;
    if (!nextNumber) {
      const r = await pool.query(
        `SELECT COALESCE(MAX(copy_number), 0) + 1 AS n
         FROM print_editions
         WHERE digital_work_id = $1 AND edition_type = $2`,
        [req.params.id, edition_type]
      );
      nextNumber = r.rows[0].n;
    }

    const result = await pool.query(
      `INSERT INTO print_editions (digital_work_id, edition_type, copy_number, status)
       VALUES ($1, $2, $3, 'available')
       RETURNING *`,
      [req.params.id, edition_type, nextNumber]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error adding digital work copy:', err);
    res.status(500).json({ error: 'Failed to add copy' });
  }
});

// PUT /api/editions/:id — update a single copy (status / owner / notes / price)
router.put('/:id', async (req, res) => {
  const client = await pool.connect();
  try {
    const { status, owner_name, notes, price } = req.body;

    if (status && !['available', 'reserved', 'sold', 'destroyed', 'archived'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const result = await client.query(
      `UPDATE print_editions
       SET status = COALESCE($1, status),
           owner_name = COALESCE($2, owner_name),
           notes = COALESCE($3, notes),
           price = COALESCE($4, price),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $5
       RETURNING *`,
      [status || null, owner_name || null, notes || null, price || null, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Copy not found' });

    const copy = result.rows[0];
    if (copy.artwork_id) {
      await recomputeWorkStatus(client, 'artwork', copy.artwork_id);
    } else if (copy.digital_work_id) {
      await recomputeWorkStatus(client, 'digital_work', copy.digital_work_id);
    }
    res.json(copy);
  } catch (err) {
    console.error('Error updating copy:', err);
    res.status(500).json({ error: 'Failed to update copy' });
  } finally {
    client.release();
  }
});

// DELETE /api/editions/:id — remove a copy entirely (e.g. destroyed in production)
router.delete('/:id', async (req, res) => {
  const client = await pool.connect();
  try {
    const r = await client.query(
      'DELETE FROM print_editions WHERE id = $1 RETURNING artwork_id, digital_work_id',
      [req.params.id]
    );
    if (r.rows.length === 0) return res.status(404).json({ error: 'Copy not found' });
    const { artwork_id, digital_work_id } = r.rows[0];
    if (artwork_id) await recomputeWorkStatus(client, 'artwork', artwork_id);
    else if (digital_work_id) await recomputeWorkStatus(client, 'digital_work', digital_work_id);
    res.json({ message: 'Copy deleted' });
  } catch (err) {
    console.error('Error deleting copy:', err);
    res.status(500).json({ error: 'Failed to delete copy' });
  } finally {
    client.release();
  }
});

module.exports = router;
module.exports.ensureRegularCopies = ensureRegularCopies;
module.exports.recomputeWorkStatus = recomputeWorkStatus;
