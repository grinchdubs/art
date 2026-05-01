const express = require('express');
const router = express.Router();
const pool = require('../db');

function wordCount(text) {
  if (!text || !text.trim()) return 0;
  return text.trim().split(/\s+/).length;
}

router.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM artist_statements ORDER BY is_active DESC, updated_at DESC'
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch statements' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM artist_statements WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch statement' });
  }
});

router.post('/', async (req, res) => {
  const { version_name, statement_text, bio_text, is_active } = req.body;
  try {
    const result = await pool.query(
      `INSERT INTO artist_statements (version_name, statement_text, bio_text, word_count, is_active)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [version_name, statement_text, bio_text || null, wordCount(statement_text), is_active !== false]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message || 'Failed to create statement' });
  }
});

router.put('/:id', async (req, res) => {
  const { version_name, statement_text, bio_text, is_active } = req.body;
  try {
    const result = await pool.query(
      `UPDATE artist_statements
       SET version_name = $1, statement_text = $2, bio_text = $3, word_count = $4, is_active = $5
       WHERE id = $6 RETURNING *`,
      [version_name, statement_text, bio_text || null, wordCount(statement_text), is_active !== false, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message || 'Failed to update statement' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM artist_statements WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete statement' });
  }
});

module.exports = router;
