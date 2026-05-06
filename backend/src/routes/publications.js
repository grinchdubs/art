const express = require('express');
const router = express.Router();
const pool = require('../db');

// Get all publications for an artwork
router.get('/artwork/:artworkId', async (req, res) => {
  try {
    const { artworkId } = req.params;
    const result = await pool.query(`
      SELECT * FROM publications
      WHERE artwork_id = $1
      ORDER BY publication_date DESC NULLS LAST, created_at DESC
    `, [artworkId]);
    
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching artwork publications:', error);
    res.status(500).json({ error: 'Failed to fetch publications' });
  }
});

// Get all publications for a digital work
router.get('/digital-work/:digitalWorkId', async (req, res) => {
  try {
    const { digitalWorkId } = req.params;
    const result = await pool.query(`
      SELECT * FROM publications
      WHERE digital_work_id = $1
      ORDER BY publication_date DESC NULLS LAST, created_at DESC
    `, [digitalWorkId]);
    
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching digital work publications:', error);
    res.status(500).json({ error: 'Failed to fetch publications' });
  }
});

// Get all publications (for reports/analytics)
router.get('/all', async (req, res) => {
  try {
    const { type, startDate, endDate } = req.query;
    
    let query = 'SELECT * FROM publications WHERE 1=1';
    const params = [];
    let paramCount = 1;
    
    if (type) {
      query += ` AND publication_type = $${paramCount}`;
      params.push(type);
      paramCount++;
    }
    
    if (startDate) {
      query += ` AND publication_date >= $${paramCount}`;
      params.push(startDate);
      paramCount++;
    }
    
    if (endDate) {
      query += ` AND publication_date <= $${paramCount}`;
      params.push(endDate);
      paramCount++;
    }
    
    query += ' ORDER BY publication_date DESC NULLS LAST, created_at DESC';
    
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching all publications:', error);
    res.status(500).json({ error: 'Failed to fetch publications' });
  }
});

// Create new publication record
router.post('/', async (req, res) => {
  try {
    const {
      artwork_id,
      digital_work_id,
      publication_type,
      publication_name,
      publication_date,
      url,
      page_number,
      author,
      article_title,
      notes
    } = req.body;

    // Validate that exactly one of artwork_id or digital_work_id is provided
    if ((!artwork_id && !digital_work_id) || (artwork_id && digital_work_id)) {
      return res.status(400).json({ error: 'Must provide either artwork_id or digital_work_id, not both' });
    }

    if (!publication_type || !publication_name) {
      return res.status(400).json({ error: 'publication_type and publication_name are required' });
    }

    const result = await pool.query(`
      INSERT INTO publications (
        artwork_id, digital_work_id, publication_type, publication_name,
        publication_date, url, page_number, author, article_title, notes
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `, [
      artwork_id || null,
      digital_work_id || null,
      publication_type,
      publication_name,
      publication_date || null,
      url || null,
      page_number || null,
      author || null,
      article_title || null,
      notes || null
    ]);

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating publication:', error);
    res.status(500).json({ error: 'Failed to create publication' });
  }
});

// Update publication record
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      publication_type,
      publication_name,
      publication_date,
      url,
      page_number,
      author,
      article_title,
      notes
    } = req.body;

    const result = await pool.query(`
      UPDATE publications
      SET publication_type = COALESCE($1, publication_type),
          publication_name = COALESCE($2, publication_name),
          publication_date = $3,
          url = $4,
          page_number = $5,
          author = $6,
          article_title = $7,
          notes = $8
      WHERE id = $9
      RETURNING *
    `, [
      publication_type,
      publication_name,
      publication_date,
      url,
      page_number,
      author,
      article_title,
      notes,
      id
    ]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Publication not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating publication:', error);
    res.status(500).json({ error: 'Failed to update publication' });
  }
});

// Delete publication record
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(`
      DELETE FROM publications
      WHERE id = $1
      RETURNING *
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Publication not found' });
    }

    res.json({ message: 'Publication deleted successfully', publication: result.rows[0] });
  } catch (error) {
    console.error('Error deleting publication:', error);
    res.status(500).json({ error: 'Failed to delete publication' });
  }
});

module.exports = router;
