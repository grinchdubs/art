const express = require('express');
const router = express.Router();
const pool = require('../db');

// Get all tags
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT t.*, 
             COUNT(DISTINCT at.artwork_id) as artwork_count,
             COUNT(DISTINCT dwt.digital_work_id) as digital_work_count
      FROM tags t
      LEFT JOIN artwork_tags at ON t.id = at.tag_id
      LEFT JOIN digital_work_tags dwt ON t.id = dwt.tag_id
      GROUP BY t.id
      ORDER BY t.name
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching tags:', error);
    res.status(500).json({ error: 'Failed to fetch tags' });
  }
});

// Get single tag
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('SELECT * FROM tags WHERE id = $1', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Tag not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching tag:', error);
    res.status(500).json({ error: 'Failed to fetch tag' });
  }
});

// Create new tag
router.post('/', async (req, res) => {
  try {
    const { name, color } = req.body;
    
    if (!name) {
      return res.status(400).json({ error: 'Tag name is required' });
    }
    
    const result = await pool.query(
      'INSERT INTO tags (name, color) VALUES ($1, $2) RETURNING *',
      [name, color || '#3498db']
    );
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    if (error.code === '23505') { // Unique violation
      return res.status(409).json({ error: 'Tag already exists' });
    }
    console.error('Error creating tag:', error);
    res.status(500).json({ error: 'Failed to create tag' });
  }
});

// Update tag
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, color } = req.body;
    
    const result = await pool.query(
      'UPDATE tags SET name = COALESCE($1, name), color = COALESCE($2, color) WHERE id = $3 RETURNING *',
      [name, color, id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Tag not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating tag:', error);
    res.status(500).json({ error: 'Failed to update tag' });
  }
});

// Delete tag
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM tags WHERE id = $1 RETURNING *', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Tag not found' });
    }
    
    res.json({ message: 'Tag deleted successfully' });
  } catch (error) {
    console.error('Error deleting tag:', error);
    res.status(500).json({ error: 'Failed to delete tag' });
  }
});

module.exports = router;
