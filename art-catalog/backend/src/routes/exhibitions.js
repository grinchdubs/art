const express = require('express');
const router = express.Router();
const pool = require('../db');

// Get all exhibitions
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT e.*,
             json_agg(DISTINCT jsonb_build_object(
               'id', a.id,
               'title', a.title,
               'inventory_number', a.inventory_number
             )) FILTER (WHERE a.id IS NOT NULL) as artworks,
             json_agg(DISTINCT jsonb_build_object(
               'id', dw.id,
               'title', dw.title,
               'inventory_number', dw.inventory_number
             )) FILTER (WHERE dw.id IS NOT NULL) as digital_works
      FROM exhibitions e
      LEFT JOIN artwork_exhibitions ae ON e.id = ae.exhibition_id
      LEFT JOIN artworks a ON ae.artwork_id = a.id
      LEFT JOIN digital_work_exhibitions dwe ON e.id = dwe.exhibition_id
      LEFT JOIN digital_works dw ON dwe.digital_work_id = dw.id
      GROUP BY e.id
      ORDER BY e.start_date DESC
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching exhibitions:', error);
    res.status(500).json({ error: 'Failed to fetch exhibitions' });
  }
});

// Get single exhibition by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(`
      SELECT e.*,
             json_agg(DISTINCT jsonb_build_object(
               'id', a.id,
               'title', a.title,
               'inventory_number', a.inventory_number
             )) FILTER (WHERE a.id IS NOT NULL) as artworks,
             json_agg(DISTINCT jsonb_build_object(
               'id', dw.id,
               'title', dw.title,
               'inventory_number', dw.inventory_number
             )) FILTER (WHERE dw.id IS NOT NULL) as digital_works
      FROM exhibitions e
      LEFT JOIN artwork_exhibitions ae ON e.id = ae.exhibition_id
      LEFT JOIN artworks a ON ae.artwork_id = a.id
      LEFT JOIN digital_work_exhibitions dwe ON e.id = dwe.exhibition_id
      LEFT JOIN digital_works dw ON dwe.digital_work_id = dw.id
      WHERE e.id = $1
      GROUP BY e.id
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Exhibition not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching exhibition:', error);
    res.status(500).json({ error: 'Failed to fetch exhibition' });
  }
});

// Create new exhibition
router.post('/', async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { name, venue, start_date, end_date, description, artworks, digital_works } = req.body;

    const result = await client.query(`
      INSERT INTO exhibitions (name, venue, start_date, end_date, description)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `, [name, venue, start_date, end_date, description]);

    const exhibition = result.rows[0];

    // Link artworks if provided
    if (artworks && artworks.length > 0) {
      for (const artworkId of artworks) {
        await client.query(`
          INSERT INTO artwork_exhibitions (artwork_id, exhibition_id)
          VALUES ($1, $2)
        `, [artworkId, exhibition.id]);
      }
    }

    // Link digital works if provided
    if (digital_works && digital_works.length > 0) {
      for (const digitalWorkId of digital_works) {
        await client.query(`
          INSERT INTO digital_work_exhibitions (digital_work_id, exhibition_id)
          VALUES ($1, $2)
        `, [digitalWorkId, exhibition.id]);
      }
    }

    await client.query('COMMIT');
    res.status(201).json(exhibition);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error creating exhibition:', error);
    res.status(500).json({ error: 'Failed to create exhibition' });
  } finally {
    client.release();
  }
});

// Update exhibition
router.put('/:id', async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { id } = req.params;
    const { name, venue, start_date, end_date, description, artworks, digital_works } = req.body;

    const result = await client.query(`
      UPDATE exhibitions
      SET name = $1, venue = $2, start_date = $3, end_date = $4, description = $5
      WHERE id = $6
      RETURNING *
    `, [name, venue, start_date, end_date, description, id]);

    if (result.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Exhibition not found' });
    }

    // Update artwork associations if provided
    if (artworks !== undefined) {
      await client.query('DELETE FROM artwork_exhibitions WHERE exhibition_id = $1', [id]);

      if (artworks && artworks.length > 0) {
        for (const artworkId of artworks) {
          await client.query(`
            INSERT INTO artwork_exhibitions (artwork_id, exhibition_id)
            VALUES ($1, $2)
          `, [artworkId, id]);
        }
      }
    }

    // Update digital work associations if provided
    if (digital_works !== undefined) {
      await client.query('DELETE FROM digital_work_exhibitions WHERE exhibition_id = $1', [id]);

      if (digital_works && digital_works.length > 0) {
        for (const digitalWorkId of digital_works) {
          await client.query(`
            INSERT INTO digital_work_exhibitions (digital_work_id, exhibition_id)
            VALUES ($1, $2)
          `, [digitalWorkId, id]);
        }
      }
    }

    await client.query('COMMIT');
    res.json(result.rows[0]);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error updating exhibition:', error);
    res.status(500).json({ error: 'Failed to update exhibition' });
  } finally {
    client.release();
  }
});

// Delete exhibition
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM exhibitions WHERE id = $1 RETURNING *', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Exhibition not found' });
    }

    res.json({ message: 'Exhibition deleted successfully' });
  } catch (error) {
    console.error('Error deleting exhibition:', error);
    res.status(500).json({ error: 'Failed to delete exhibition' });
  }
});

module.exports = router;
