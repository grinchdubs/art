const express = require('express');
const router = express.Router();
const pool = require('../db');

// Get all digital works
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT dw.*,
             json_agg(jsonb_build_object(
               'id', gi.id,
               'filename', gi.filename,
               'file_path', gi.file_path,
               'is_primary', dwi.is_primary
             )) FILTER (WHERE gi.id IS NOT NULL) as images
      FROM digital_works dw
      LEFT JOIN digital_work_images dwi ON dw.id = dwi.digital_work_id
      LEFT JOIN gallery_images gi ON dwi.image_id = gi.id
      GROUP BY dw.id
      ORDER BY dw.created_at DESC
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching digital works:', error);
    res.status(500).json({ error: 'Failed to fetch digital works' });
  }
});

// Get single digital work by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(`
      SELECT dw.*,
             json_agg(jsonb_build_object(
               'id', gi.id,
               'filename', gi.filename,
               'file_path', gi.file_path,
               'is_primary', dwi.is_primary,
               'display_order', dwi.display_order
             ) ORDER BY dwi.display_order) FILTER (WHERE gi.id IS NOT NULL) as images,
             json_agg(DISTINCT jsonb_build_object(
               'id', e.id,
               'name', e.name,
               'venue', e.venue,
               'start_date', e.start_date,
               'end_date', e.end_date
             )) FILTER (WHERE e.id IS NOT NULL) as exhibitions
      FROM digital_works dw
      LEFT JOIN digital_work_images dwi ON dw.id = dwi.digital_work_id
      LEFT JOIN gallery_images gi ON dwi.image_id = gi.id
      LEFT JOIN digital_work_exhibitions dwe ON dw.id = dwe.digital_work_id
      LEFT JOIN exhibitions e ON dwe.exhibition_id = e.id
      WHERE dw.id = $1
      GROUP BY dw.id
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Digital work not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching digital work:', error);
    res.status(500).json({ error: 'Failed to fetch digital work' });
  }
});

// Create new digital work
router.post('/', async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const {
      inventory_number, title, creation_date, file_format, file_size, dimensions,
      sale_status, price, license_type, video_url, embed_url, platform,
      nft_token_id, nft_contract_address, nft_blockchain, notes, images
    } = req.body;

    const result = await client.query(`
      INSERT INTO digital_works (
        inventory_number, title, creation_date, file_format, file_size, dimensions,
        sale_status, price, license_type, video_url, embed_url, platform,
        nft_token_id, nft_contract_address, nft_blockchain, notes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
      RETURNING *
    `, [inventory_number, title, creation_date, file_format, file_size, dimensions,
        sale_status || 'available', price, license_type, video_url, embed_url, platform,
        nft_token_id, nft_contract_address, nft_blockchain, notes]);

    const digitalWork = result.rows[0];

    // Link images if provided
    if (images && images.length > 0) {
      for (let i = 0; i < images.length; i++) {
        const image = images[i];
        await client.query(`
          INSERT INTO digital_work_images (digital_work_id, image_id, is_primary, display_order)
          VALUES ($1, $2, $3, $4)
        `, [digitalWork.id, image.id, image.is_primary || false, i]);
      }
    }

    await client.query('COMMIT');
    res.status(201).json(digitalWork);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error creating digital work:', error);
    res.status(500).json({ error: 'Failed to create digital work' });
  } finally {
    client.release();
  }
});

// Update digital work
router.put('/:id', async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { id } = req.params;
    const {
      inventory_number, title, creation_date, file_format, file_size, dimensions,
      sale_status, price, license_type, video_url, embed_url, platform,
      nft_token_id, nft_contract_address, nft_blockchain, notes, images
    } = req.body;

    const result = await client.query(`
      UPDATE digital_works
      SET inventory_number = $1, title = $2, creation_date = $3, file_format = $4,
          file_size = $5, dimensions = $6, sale_status = $7, price = $8,
          license_type = $9, video_url = $10, embed_url = $11, platform = $12,
          nft_token_id = $13, nft_contract_address = $14, nft_blockchain = $15, notes = $16
      WHERE id = $17
      RETURNING *
    `, [inventory_number, title, creation_date, file_format, file_size, dimensions,
        sale_status, price, license_type, video_url, embed_url, platform,
        nft_token_id, nft_contract_address, nft_blockchain, notes, id]);

    if (result.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Digital work not found' });
    }

    // Update image associations if provided
    if (images !== undefined) {
      await client.query('DELETE FROM digital_work_images WHERE digital_work_id = $1', [id]);

      if (images && images.length > 0) {
        for (let i = 0; i < images.length; i++) {
          const image = images[i];
          await client.query(`
            INSERT INTO digital_work_images (digital_work_id, image_id, is_primary, display_order)
            VALUES ($1, $2, $3, $4)
          `, [id, image.id, image.is_primary || false, i]);
        }
      }
    }

    await client.query('COMMIT');
    res.json(result.rows[0]);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error updating digital work:', error);
    res.status(500).json({ error: 'Failed to update digital work' });
  } finally {
    client.release();
  }
});

// Delete digital work
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM digital_works WHERE id = $1 RETURNING *', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Digital work not found' });
    }

    res.json({ message: 'Digital work deleted successfully' });
  } catch (error) {
    console.error('Error deleting digital work:', error);
    res.status(500).json({ error: 'Failed to delete digital work' });
  }
});

module.exports = router;
