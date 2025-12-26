const express = require('express');
const router = express.Router();
const pool = require('../db');

// Get all artworks
router.get('/', async (req, res) => {
  try {
    const { 
      creation_date_from, 
      creation_date_to, 
      price_min, 
      price_max, 
      location, 
      sale_status,
      tags,
      tag_match // 'all' or 'any'
    } = req.query;

    let whereConditions = [];
    let queryParams = [];
    let paramCount = 0;

    // Date range filter
    if (creation_date_from) {
      paramCount++;
      whereConditions.push(`a.creation_date >= $${paramCount}`);
      queryParams.push(creation_date_from);
    }
    if (creation_date_to) {
      paramCount++;
      whereConditions.push(`a.creation_date <= $${paramCount}`);
      queryParams.push(creation_date_to);
    }

    // Price range filter
    if (price_min) {
      paramCount++;
      whereConditions.push(`a.price >= $${paramCount}`);
      queryParams.push(parseFloat(price_min));
    }
    if (price_max) {
      paramCount++;
      whereConditions.push(`a.price <= $${paramCount}`);
      queryParams.push(parseFloat(price_max));
    }

    // Location filter
    if (location) {
      paramCount++;
      whereConditions.push(`a.location ILIKE $${paramCount}`);
      queryParams.push(`%${location}%`);
    }

    // Sale status filter
    if (sale_status) {
      paramCount++;
      whereConditions.push(`a.sale_status = $${paramCount}`);
      queryParams.push(sale_status);
    }

    // Tag filter
    let tagSubquery = '';
    if (tags) {
      const tagIds = tags.split(',').map(id => parseInt(id)).filter(id => !isNaN(id));
      if (tagIds.length > 0) {
        if (tag_match === 'all') {
          // Artwork must have ALL specified tags
          tagSubquery = `
            AND a.id IN (
              SELECT artwork_id 
              FROM artwork_tags 
              WHERE tag_id = ANY($${paramCount + 1})
              GROUP BY artwork_id 
              HAVING COUNT(DISTINCT tag_id) = ${tagIds.length}
            )
          `;
        } else {
          // Artwork must have ANY of the specified tags (default)
          tagSubquery = `
            AND a.id IN (
              SELECT artwork_id 
              FROM artwork_tags 
              WHERE tag_id = ANY($${paramCount + 1})
            )
          `;
        }
        paramCount++;
        queryParams.push(tagIds);
      }
    }

    const whereClause = whereConditions.length > 0 
      ? `WHERE ${whereConditions.join(' AND ')}` 
      : '';

    const query = `
      SELECT a.*,
             s.name as series_name,
             json_agg(DISTINCT jsonb_build_object(
               'id', gi.id,
               'filename', gi.filename,
               'file_path', gi.file_path,
               'is_primary', ai.is_primary
             )) FILTER (WHERE gi.id IS NOT NULL) as images,
             json_agg(DISTINCT jsonb_build_object(
               'id', t.id,
               'name', t.name,
               'color', t.color
             )) FILTER (WHERE t.id IS NOT NULL) as tags
      FROM artworks a
      LEFT JOIN series s ON a.series_id = s.id
      LEFT JOIN artwork_images ai ON a.id = ai.artwork_id
      LEFT JOIN gallery_images gi ON ai.image_id = gi.id
      LEFT JOIN artwork_tags at ON a.id = at.artwork_id
      LEFT JOIN tags t ON at.tag_id = t.id
      ${whereClause}
      ${tagSubquery}
      GROUP BY a.id, s.name
      ORDER BY a.created_at DESC
    `;

    const result = await pool.query(query, queryParams);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching artworks:', error);
    res.status(500).json({ error: 'Failed to fetch artworks' });
  }
});

// Get single artwork by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(`
      SELECT a.*,
             s.name as series_name,
             json_agg(jsonb_build_object(
               'id', gi.id,
               'filename', gi.filename,
               'file_path', gi.file_path,
               'is_primary', ai.is_primary,
               'display_order', ai.display_order
             ) ORDER BY ai.display_order) FILTER (WHERE gi.id IS NOT NULL) as images,
             json_agg(DISTINCT jsonb_build_object(
               'id', e.id,
               'name', e.name,
               'venue', e.venue,
               'start_date', e.start_date,
               'end_date', e.end_date
             )) FILTER (WHERE e.id IS NOT NULL) as exhibitions,
             json_agg(DISTINCT jsonb_build_object(
               'id', t.id,
               'name', t.name,
               'color', t.color
             )) FILTER (WHERE t.id IS NOT NULL) as tags
      FROM artworks a
      LEFT JOIN series s ON a.series_id = s.id
      LEFT JOIN artwork_images ai ON a.id = ai.artwork_id
      LEFT JOIN gallery_images gi ON ai.image_id = gi.id
      LEFT JOIN artwork_exhibitions ae ON a.id = ae.artwork_id
      LEFT JOIN exhibitions e ON ae.exhibition_id = e.id
      LEFT JOIN artwork_tags at ON a.id = at.artwork_id
      LEFT JOIN tags t ON at.tag_id = t.id
      WHERE a.id = $1
      GROUP BY a.id, s.name
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Artwork not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching artwork:', error);
    res.status(500).json({ error: 'Failed to fetch artwork' });
  }
});

// Create new artwork
router.post('/', async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const {
      inventory_number, title, creation_date, medium, dimensions,
      series_name, series_id, sale_status, price, location, notes, images
    } = req.body;

    // Insert artwork
    const artworkResult = await client.query(`
      INSERT INTO artworks (
        inventory_number, title, creation_date, medium, dimensions,
        series_id, sale_status, price, location, notes, is_public
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *
    `, [inventory_number, title, creation_date, medium, dimensions,
        series_id || null, sale_status || 'available', price, location, notes,
        req.body.is_public !== undefined ? req.body.is_public : true]);

    const artwork = artworkResult.rows[0];

    // Link images if provided
    if (images && images.length > 0) {
      for (let i = 0; i < images.length; i++) {
        const image = images[i];
        await client.query(`
          INSERT INTO artwork_images (artwork_id, image_id, is_primary, display_order)
          VALUES ($1, $2, $3, $4)
        `, [artwork.id, image.id, image.is_primary || false, i]);
      }
    }

    // Add location history entry
    if (location) {
      await client.query(`
        INSERT INTO location_history (artwork_id, location)
        VALUES ($1, $2)
      `, [artwork.id, location]);
    }

    await client.query('COMMIT');
    res.status(201).json(artwork);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error creating artwork:', error);
    res.status(500).json({ error: 'Failed to create artwork' });
  } finally {
    client.release();
  }
});

// Update artwork
router.put('/:id', async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { id } = req.params;
    const {
      inventory_number, title, creation_date, medium, dimensions,
      series_name, series_id, sale_status, price, location, notes, images
    } = req.body;

    const result = await client.query(`
      UPDATE artworks
      SET inventory_number = $1, title = $2, creation_date = $3,
          medium = $4, dimensions = $5, series_id = $6,
          sale_status = $7, price = $8, location = $9, notes = $10, is_public = $11
      WHERE id = $12
      RETURNING *
    `, [inventory_number, title, creation_date, medium, dimensions,
        series_id || null, sale_status, price, location, notes,
        req.body.is_public !== undefined ? req.body.is_public : true, id]);

    if (result.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Artwork not found' });
    }

    // Update image associations if provided
    if (images !== undefined) {
      // Remove old associations
      await client.query('DELETE FROM artwork_images WHERE artwork_id = $1', [id]);

      // Add new associations
      if (images && images.length > 0) {
        for (let i = 0; i < images.length; i++) {
          const image = images[i];
          await client.query(`
            INSERT INTO artwork_images (artwork_id, image_id, is_primary, display_order)
            VALUES ($1, $2, $3, $4)
          `, [id, image.id, image.is_primary || false, i]);
        }
      }
    }

    await client.query('COMMIT');
    res.json(result.rows[0]);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error updating artwork:', error);
    res.status(500).json({ error: 'Failed to update artwork' });
  } finally {
    client.release();
  }
});

// Delete artwork
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM artworks WHERE id = $1 RETURNING *', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Artwork not found' });
    }

    res.json({ message: 'Artwork deleted successfully' });
  } catch (error) {
    console.error('Error deleting artwork:', error);
    res.status(500).json({ error: 'Failed to delete artwork' });
  }
});

// Get location history for artwork
router.get('/:id/location-history', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(`
      SELECT * FROM location_history
      WHERE artwork_id = $1
      ORDER BY moved_date DESC
    `, [id]);

    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching location history:', error);
    res.status(500).json({ error: 'Failed to fetch location history' });
  }
});

// Add location history entry
router.post('/:id/location-history', async (req, res) => {
  try {
    const { id } = req.params;
    const { location, notes } = req.body;

    const result = await pool.query(`
      INSERT INTO location_history (artwork_id, location, notes)
      VALUES ($1, $2, $3)
      RETURNING *
    `, [id, location, notes]);

    // Also update current location in artwork
    await pool.query('UPDATE artworks SET location = $1 WHERE id = $2', [location, id]);

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error adding location history:', error);
    res.status(500).json({ error: 'Failed to add location history' });
  }
});

// Add tags to artwork
router.post('/:id/tags', async (req, res) => {
  try {
    const { id } = req.params;
    const { tagIds } = req.body; // Array of tag IDs

    // Delete existing tags first
    await pool.query('DELETE FROM artwork_tags WHERE artwork_id = $1', [id]);

    // Insert new tags
    if (tagIds && tagIds.length > 0) {
      const values = tagIds.map((tagId, index) => `($1, $${index + 2})`).join(',');
      const params = [id, ...tagIds];
      await pool.query(
        `INSERT INTO artwork_tags (artwork_id, tag_id) VALUES ${values}`,
        params
      );
    }

    res.json({ message: 'Tags updated successfully' });
  } catch (error) {
    console.error('Error updating artwork tags:', error);
    res.status(500).json({ error: 'Failed to update tags' });
  }
});

// Bulk update artworks
router.patch('/bulk', async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { ids, updates } = req.body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'Invalid or empty artwork IDs' });
    }

    if (!updates || typeof updates !== 'object') {
      return res.status(400).json({ error: 'Invalid updates object' });
    }

    // Build dynamic UPDATE query
    const allowedFields = ['sale_status', 'location', 'price', 'is_public'];
    const updateFields = [];
    const values = [];
    let paramCount = 1;

    for (const [field, value] of Object.entries(updates)) {
      if (allowedFields.includes(field) && value !== undefined && value !== null) {
        if (field === 'price' && updates.priceAdjustment) {
          // Handle price adjustment (percentage or fixed amount)
          const adjustment = updates.priceAdjustment;
          if (adjustment.type === 'percentage') {
            updateFields.push(`${field} = ${field} * (1 + $${paramCount} / 100)`);
            values.push(parseFloat(adjustment.value));
          } else if (adjustment.type === 'fixed') {
            updateFields.push(`${field} = ${field} + $${paramCount}`);
            values.push(parseFloat(adjustment.value));
          }
          paramCount++;
        } else if (field === 'price' && !updates.priceAdjustment) {
          // Direct price update
          updateFields.push(`${field} = $${paramCount}`);
          values.push(parseFloat(value));
          paramCount++;
        } else {
          // Regular field update
          updateFields.push(`${field} = $${paramCount}`);
          values.push(value);
          paramCount++;
        }
      }
    }

    if (updateFields.length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }

    // Add the IDs to the query
    const placeholders = ids.map((_, index) => `$${paramCount + index}`).join(',');
    values.push(...ids);

    const query = `
      UPDATE artworks
      SET ${updateFields.join(', ')}
      WHERE id IN (${placeholders})
    `;

    const result = await client.query(query, values);

    await client.query('COMMIT');

    res.json({
      message: `Successfully updated ${result.rowCount} artworks`,
      count: result.rowCount
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error bulk updating artworks:', error);
    res.status(500).json({ error: 'Failed to bulk update artworks' });
  } finally {
    client.release();
  }
});

module.exports = router;
