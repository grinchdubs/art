const express = require('express');
const router = express.Router();
const pool = require('../db');

// Get all artworks for public gallery (read-only)
router.get('/artworks', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        a.*,
        s.name as series_name,
        COALESCE(
          json_agg(
            json_build_object(
              'id', gi.id,
              'file_path', gi.file_path,
              'filename', gi.filename,
              'is_primary', ai.is_primary
            ) ORDER BY ai.display_order, ai.id
          ) FILTER (WHERE gi.id IS NOT NULL),
          '[]'
        ) as images,
        COALESCE(
          json_agg(
            DISTINCT jsonb_build_object(
              'id', t.id,
              'name', t.name,
              'color', t.color
            )
          ) FILTER (WHERE t.id IS NOT NULL),
          '[]'
        ) as tags
      FROM artworks a
      LEFT JOIN series s ON a.series_id = s.id
      LEFT JOIN artwork_images ai ON a.id = ai.artwork_id
      LEFT JOIN gallery_images gi ON ai.image_id = gi.id
      LEFT JOIN artwork_tags at ON a.id = at.artwork_id
      LEFT JOIN tags t ON at.tag_id = t.id
      WHERE a.is_public = true
      GROUP BY a.id, s.name
      ORDER BY a.creation_date DESC NULLS LAST, a.id DESC
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching public artworks:', error);
    res.status(500).json({ error: 'Failed to fetch artworks' });
  }
});

// Get single artwork for public detail view
router.get('/artworks/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(`
      SELECT 
        a.*,
        s.name as series_name,
        COALESCE(
          json_agg(
            json_build_object(
              'id', gi.id,
              'file_path', gi.file_path,
              'filename', gi.filename,
              'is_primary', ai.is_primary
            ) ORDER BY ai.display_order, ai.id
          ) FILTER (WHERE gi.id IS NOT NULL),
          '[]'
        ) as images,
        COALESCE(
          json_agg(
            DISTINCT jsonb_build_object(
              'id', t.id,
              'name', t.name,
              'color', t.color
            )
          ) FILTER (WHERE t.id IS NOT NULL),
          '[]'
        ) as tags
      FROM artworks a
      LEFT JOIN series s ON a.series_id = s.id
      LEFT JOIN artwork_images ai ON a.id = ai.artwork_id
      LEFT JOIN gallery_images gi ON ai.image_id = gi.id
      LEFT JOIN artwork_tags at ON a.id = at.artwork_id
      LEFT JOIN tags t ON at.tag_id = t.id
      WHERE a.id = $1 AND a.is_public = true
      GROUP BY a.id, s.name
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Artwork not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching public artwork:', error);
    res.status(500).json({ error: 'Failed to fetch artwork' });
  }
});

// Get all digital works for public gallery
router.get('/digital-works', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        dw.*,
        s.name as series_name,
        COALESCE(
          json_agg(
            json_build_object(
              'id', gi.id,
              'file_path', gi.file_path,
              'filename', gi.filename,
              'is_primary', dwi.is_primary
            ) ORDER BY dwi.display_order, dwi.id
          ) FILTER (WHERE gi.id IS NOT NULL),
          '[]'
        ) as images,
        COALESCE(
          json_agg(
            DISTINCT jsonb_build_object(
              'id', t.id,
              'name', t.name,
              'color', t.color
            )
          ) FILTER (WHERE t.id IS NOT NULL),
          '[]'
        ) as tags
      FROM digital_works dw
      LEFT JOIN series s ON dw.series_id = s.id
      LEFT JOIN digital_work_images dwi ON dw.id = dwi.digital_work_id
      LEFT JOIN gallery_images gi ON dwi.image_id = gi.id
      LEFT JOIN digital_work_tags dwt ON dw.id = dwt.digital_work_id
      LEFT JOIN tags t ON dwt.tag_id = t.id
      WHERE dw.is_public = true
      GROUP BY dw.id, s.name
      ORDER BY dw.creation_date DESC NULLS LAST, dw.id DESC
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching public digital works:', error);
    res.status(500).json({ error: 'Failed to fetch digital works' });
  }
});

// Get single digital work for public detail view
router.get('/digital-works/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(`
      SELECT 
        dw.*,
        s.name as series_name,
        COALESCE(
          json_agg(
            json_build_object(
              'id', gi.id,
              'file_path', gi.file_path,
              'filename', gi.filename,
              'is_primary', dwi.is_primary
            ) ORDER BY dwi.display_order, dwi.id
          ) FILTER (WHERE gi.id IS NOT NULL),
          '[]'
        ) as images,
        COALESCE(
          json_agg(
            DISTINCT jsonb_build_object(
              'id', t.id,
              'name', t.name,
              'color', t.color
            )
          ) FILTER (WHERE t.id IS NOT NULL),
          '[]'
        ) as tags
      FROM digital_works dw
      LEFT JOIN series s ON dw.series_id = s.id
      LEFT JOIN digital_work_images dwi ON dw.id = dwi.digital_work_id
      LEFT JOIN gallery_images gi ON dwi.image_id = gi.id
      LEFT JOIN digital_work_tags dwt ON dw.id = dwt.digital_work_id
      LEFT JOIN tags t ON dwt.tag_id = t.id
      WHERE dw.id = $1 AND dw.is_public = true
      GROUP BY dw.id, s.name
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Digital work not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching public digital work:', error);
    res.status(500).json({ error: 'Failed to fetch digital work' });
  }
});

module.exports = router;
