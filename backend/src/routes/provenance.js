const express = require('express');
const router = express.Router();
const pool = require('../db');

// Get ownership history for a specific artwork
router.get('/artwork/:artworkId/history', async (req, res) => {
  try {
    const { artworkId } = req.params;
    
    const result = await pool.query(
      `SELECT 
        oh.*,
        a.title as artwork_title,
        a.inventory_number
      FROM ownership_history oh
      LEFT JOIN artworks a ON oh.artwork_id = a.id
      WHERE oh.artwork_id = $1
      ORDER BY oh.transfer_date DESC, oh.created_at DESC`,
      [artworkId]
    );
    
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching artwork ownership history:', error);
    res.status(500).json({ error: 'Failed to fetch ownership history' });
  }
});

// Get ownership history for a specific digital work
router.get('/digital-work/:digitalWorkId/history', async (req, res) => {
  try {
    const { digitalWorkId } = req.params;
    
    const result = await pool.query(
      `SELECT 
        oh.*,
        dw.title as work_title,
        dw.inventory_number
      FROM ownership_history oh
      LEFT JOIN digital_works dw ON oh.digital_work_id = dw.id
      WHERE oh.digital_work_id = $1
      ORDER BY oh.transfer_date DESC, oh.created_at DESC`,
      [digitalWorkId]
    );
    
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching digital work ownership history:', error);
    res.status(500).json({ error: 'Failed to fetch ownership history' });
  }
});

// Record a new transfer
router.post('/transfer', async (req, res) => {
  const client = await pool.connect();
  
  try {
    const {
      artwork_id,
      digital_work_id,
      transfer_type,
      transfer_date,
      owner_name,
      owner_email,
      owner_phone,
      price_paid,
      payment_method,
      return_date,
      contract_url,
      notes
    } = req.body;

    // Validate that either artwork_id or digital_work_id is provided, but not both
    if ((!artwork_id && !digital_work_id) || (artwork_id && digital_work_id)) {
      return res.status(400).json({ 
        error: 'Must provide either artwork_id or digital_work_id, but not both' 
      });
    }

    // Validate required fields
    if (!transfer_type || !transfer_date) {
      return res.status(400).json({ 
        error: 'transfer_type and transfer_date are required' 
      });
    }

    await client.query('BEGIN');

    // Insert ownership history record
    const historyResult = await client.query(
      `INSERT INTO ownership_history (
        artwork_id, digital_work_id, transfer_type, transfer_date,
        owner_name, owner_email, owner_phone, price_paid, payment_method,
        return_date, contract_url, notes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *`,
      [
        artwork_id || null,
        digital_work_id || null,
        transfer_type,
        transfer_date,
        owner_name || null,
        owner_email || null,
        owner_phone || null,
        price_paid || null,
        payment_method || null,
        return_date || null,
        contract_url || null,
        notes || null
      ]
    );

    // Update current owner in artworks or digital_works table
    if (artwork_id) {
      await client.query(
        `UPDATE artworks 
         SET current_owner = $1, acquisition_date = $2, updated_at = CURRENT_TIMESTAMP
         WHERE id = $3`,
        [owner_name || null, transfer_date, artwork_id]
      );
    } else if (digital_work_id) {
      await client.query(
        `UPDATE digital_works 
         SET current_owner = $1, acquisition_date = $2, updated_at = CURRENT_TIMESTAMP
         WHERE id = $3`,
        [owner_name || null, transfer_date, digital_work_id]
      );
    }

    await client.query('COMMIT');
    
    res.status(201).json(historyResult.rows[0]);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error recording transfer:', error);
    res.status(500).json({ error: 'Failed to record transfer' });
  } finally {
    client.release();
  }
});

// Update an existing transfer record
router.put('/:id', async (req, res) => {
  const client = await pool.connect();
  
  try {
    const { id } = req.params;
    const {
      transfer_type,
      transfer_date,
      owner_name,
      owner_email,
      owner_phone,
      price_paid,
      payment_method,
      return_date,
      contract_url,
      notes
    } = req.body;

    await client.query('BEGIN');

    // Update the ownership history record
    const result = await client.query(
      `UPDATE ownership_history 
       SET transfer_type = COALESCE($1, transfer_type),
           transfer_date = COALESCE($2, transfer_date),
           owner_name = COALESCE($3, owner_name),
           owner_email = COALESCE($4, owner_email),
           owner_phone = COALESCE($5, owner_phone),
           price_paid = COALESCE($6, price_paid),
           payment_method = COALESCE($7, payment_method),
           return_date = $8,
           contract_url = $9,
           notes = $10,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $11
       RETURNING *`,
      [
        transfer_type,
        transfer_date,
        owner_name,
        owner_email,
        owner_phone,
        price_paid,
        payment_method,
        return_date,
        contract_url,
        notes,
        id
      ]
    );

    if (result.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Transfer record not found' });
    }

    const updatedRecord = result.rows[0];

    // Check if this is the most recent transfer for the artwork/digital work
    const mostRecentCheck = await client.query(
      `SELECT id FROM ownership_history
       WHERE ${updatedRecord.artwork_id ? 'artwork_id = $1' : 'digital_work_id = $1'}
       ORDER BY transfer_date DESC, created_at DESC
       LIMIT 1`,
      [updatedRecord.artwork_id || updatedRecord.digital_work_id]
    );

    // If this is the most recent transfer, update the current owner
    if (mostRecentCheck.rows[0].id === parseInt(id)) {
      if (updatedRecord.artwork_id) {
        await client.query(
          `UPDATE artworks 
           SET current_owner = $1, acquisition_date = $2, updated_at = CURRENT_TIMESTAMP
           WHERE id = $3`,
          [owner_name || null, transfer_date || updatedRecord.transfer_date, updatedRecord.artwork_id]
        );
      } else if (updatedRecord.digital_work_id) {
        await client.query(
          `UPDATE digital_works 
           SET current_owner = $1, acquisition_date = $2, updated_at = CURRENT_TIMESTAMP
           WHERE id = $3`,
          [owner_name || null, transfer_date || updatedRecord.transfer_date, updatedRecord.digital_work_id]
        );
      }
    }

    await client.query('COMMIT');
    
    res.json(updatedRecord);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error updating transfer:', error);
    res.status(500).json({ error: 'Failed to update transfer' });
  } finally {
    client.release();
  }
});

// Delete a transfer record
router.delete('/:id', async (req, res) => {
  const client = await pool.connect();
  
  try {
    const { id } = req.params;

    await client.query('BEGIN');

    // Get the record before deleting to know which artwork/digital work to update
    const recordResult = await client.query(
      'SELECT artwork_id, digital_work_id FROM ownership_history WHERE id = $1',
      [id]
    );

    if (recordResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Transfer record not found' });
    }

    const { artwork_id, digital_work_id } = recordResult.rows[0];

    // Delete the record
    await client.query('DELETE FROM ownership_history WHERE id = $1', [id]);

    // Update current owner to the most recent remaining transfer
    if (artwork_id) {
      const latestTransfer = await client.query(
        `SELECT owner_name, transfer_date FROM ownership_history
         WHERE artwork_id = $1
         ORDER BY transfer_date DESC, created_at DESC
         LIMIT 1`,
        [artwork_id]
      );

      await client.query(
        `UPDATE artworks 
         SET current_owner = $1, 
             acquisition_date = $2,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $3`,
        [
          latestTransfer.rows[0]?.owner_name || null,
          latestTransfer.rows[0]?.transfer_date || null,
          artwork_id
        ]
      );
    } else if (digital_work_id) {
      const latestTransfer = await client.query(
        `SELECT owner_name, transfer_date FROM ownership_history
         WHERE digital_work_id = $1
         ORDER BY transfer_date DESC, created_at DESC
         LIMIT 1`,
        [digital_work_id]
      );

      await client.query(
        `UPDATE digital_works 
         SET current_owner = $1, 
             acquisition_date = $2,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $3`,
        [
          latestTransfer.rows[0]?.owner_name || null,
          latestTransfer.rows[0]?.transfer_date || null,
          digital_work_id
        ]
      );
    }

    await client.query('COMMIT');
    
    res.json({ message: 'Transfer record deleted successfully' });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error deleting transfer:', error);
    res.status(500).json({ error: 'Failed to delete transfer' });
  } finally {
    client.release();
  }
});

// Get all transfers (admin view with filtering)
router.get('/all', async (req, res) => {
  try {
    const { transfer_type, owner_name, start_date, end_date, limit = 100 } = req.query;
    
    let query = `
      SELECT 
        oh.*,
        COALESCE(a.title, dw.title) as work_title,
        COALESCE(a.inventory_number, dw.inventory_number) as inventory_number,
        CASE 
          WHEN oh.artwork_id IS NOT NULL THEN 'artwork'
          ELSE 'digital_work'
        END as work_type
      FROM ownership_history oh
      LEFT JOIN artworks a ON oh.artwork_id = a.id
      LEFT JOIN digital_works dw ON oh.digital_work_id = dw.id
      WHERE 1=1
    `;
    
    const params = [];
    let paramCount = 1;

    if (transfer_type) {
      query += ` AND oh.transfer_type = $${paramCount}`;
      params.push(transfer_type);
      paramCount++;
    }

    if (owner_name) {
      query += ` AND oh.owner_name ILIKE $${paramCount}`;
      params.push(`%${owner_name}%`);
      paramCount++;
    }

    if (start_date) {
      query += ` AND oh.transfer_date >= $${paramCount}`;
      params.push(start_date);
      paramCount++;
    }

    if (end_date) {
      query += ` AND oh.transfer_date <= $${paramCount}`;
      params.push(end_date);
      paramCount++;
    }

    query += ` ORDER BY oh.transfer_date DESC, oh.created_at DESC LIMIT $${paramCount}`;
    params.push(parseInt(limit));

    const result = await pool.query(query, params);
    
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching all transfers:', error);
    res.status(500).json({ error: 'Failed to fetch transfers' });
  }
});

module.exports = router;
