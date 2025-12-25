const express = require('express');
const router = express.Router();
const pool = require('../db');

// Get all series with work counts
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT s.*,
             COUNT(DISTINCT a.id) as artwork_count,
             COUNT(DISTINCT dw.id) as digital_work_count
      FROM series s
      LEFT JOIN artworks a ON s.id = a.series_id
      LEFT JOIN digital_works dw ON s.id = dw.series_id
      GROUP BY s.id
      ORDER BY s.name ASC
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching series:', error);
    res.status(500).json({ error: 'Failed to fetch series' });
  }
});

// Get single series by ID with all works
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Get series details
    const seriesResult = await pool.query('SELECT * FROM series WHERE id = $1', [id]);
    
    if (seriesResult.rows.length === 0) {
      return res.status(404).json({ error: 'Series not found' });
    }
    
    const series = seriesResult.rows[0];
    
    // Get artworks in this series
    const artworksResult = await pool.query(`
      SELECT a.*,
             json_agg(DISTINCT jsonb_build_object(
               'id', gi.id,
               'filename', gi.filename,
               'file_path', gi.file_path,
               'is_primary', ai.is_primary
             )) FILTER (WHERE gi.id IS NOT NULL) as images
      FROM artworks a
      LEFT JOIN artwork_images ai ON a.id = ai.artwork_id
      LEFT JOIN gallery_images gi ON ai.image_id = gi.id
      WHERE a.series_id = $1
      GROUP BY a.id
      ORDER BY a.creation_date DESC
    `, [id]);
    
    // Get digital works in this series
    const digitalWorksResult = await pool.query(`
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
      WHERE dw.series_id = $1
      GROUP BY dw.id
      ORDER BY dw.creation_date DESC
    `, [id]);
    
    res.json({
      ...series,
      artworks: artworksResult.rows,
      digital_works: digitalWorksResult.rows
    });
  } catch (error) {
    console.error('Error fetching series:', error);
    res.status(500).json({ error: 'Failed to fetch series' });
  }
});

// Create new series
router.post('/', async (req, res) => {
  try {
    const { name, description, start_date, end_date } = req.body;
    
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Series name is required' });
    }
    
    const result = await pool.query(`
      INSERT INTO series (name, description, start_date, end_date)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `, [name.trim(), description, start_date, end_date]);
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    if (error.code === '23505') { // Unique violation
      return res.status(400).json({ error: 'A series with this name already exists' });
    }
    console.error('Error creating series:', error);
    res.status(500).json({ error: 'Failed to create series' });
  }
});

// Update series
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, start_date, end_date } = req.body;
    
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Series name is required' });
    }
    
    const result = await pool.query(`
      UPDATE series
      SET name = $1, description = $2, start_date = $3, end_date = $4, updated_at = CURRENT_TIMESTAMP
      WHERE id = $5
      RETURNING *
    `, [name.trim(), description, start_date, end_date, id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Series not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    if (error.code === '23505') { // Unique violation
      return res.status(400).json({ error: 'A series with this name already exists' });
    }
    console.error('Error updating series:', error);
    res.status(500).json({ error: 'Failed to update series' });
  }
});

// Delete series
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // series_id in artworks and digital_works will be set to NULL due to ON DELETE SET NULL
    const result = await pool.query('DELETE FROM series WHERE id = $1 RETURNING *', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Series not found' });
    }
    
    res.json({ message: 'Series deleted successfully' });
  } catch (error) {
    console.error('Error deleting series:', error);
    res.status(500).json({ error: 'Failed to delete series' });
  }
});

module.exports = router;
