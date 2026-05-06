const express = require('express');
const router = express.Router();
const pool = require('../db');

// Get all sales with related artwork/digital work info
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        s.*,
        a.title as artwork_title,
        a.inventory_number as artwork_inventory,
        dw.title as digital_work_title,
        dw.inventory_number as digital_work_inventory
      FROM sales s
      LEFT JOIN artworks a ON s.artwork_id = a.id
      LEFT JOIN digital_works dw ON s.digital_work_id = dw.id
      ORDER BY s.sale_date DESC, s.created_at DESC
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching sales:', error);
    res.status(500).json({ error: 'Failed to fetch sales' });
  }
});

// Get single sale by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(`
      SELECT 
        s.*,
        a.title as artwork_title,
        a.inventory_number as artwork_inventory,
        dw.title as digital_work_title,
        dw.inventory_number as digital_work_inventory
      FROM sales s
      LEFT JOIN artworks a ON s.artwork_id = a.id
      LEFT JOIN digital_works dw ON s.digital_work_id = dw.id
      WHERE s.id = $1
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Sale not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching sale:', error);
    res.status(500).json({ error: 'Failed to fetch sale' });
  }
});

// Get sales by artwork ID
router.get('/artwork/:artworkId', async (req, res) => {
  try {
    const { artworkId } = req.params;
    const result = await pool.query(`
      SELECT * FROM sales
      WHERE artwork_id = $1
      ORDER BY sale_date DESC
    `, [artworkId]);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching artwork sales:', error);
    res.status(500).json({ error: 'Failed to fetch artwork sales' });
  }
});

// Get sales by digital work ID
router.get('/digital-work/:digitalWorkId', async (req, res) => {
  try {
    const { digitalWorkId } = req.params;
    const result = await pool.query(`
      SELECT * FROM sales
      WHERE digital_work_id = $1
      ORDER BY sale_date DESC
    `, [digitalWorkId]);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching digital work sales:', error);
    res.status(500).json({ error: 'Failed to fetch digital work sales' });
  }
});

// Create new sale
router.post('/', async (req, res) => {
  try {
    const {
      artwork_id,
      digital_work_id,
      sale_date,
      sale_price,
      buyer_name,
      buyer_email,
      platform,
      notes
    } = req.body;

    // Validate that exactly one of artwork_id or digital_work_id is provided
    if ((!artwork_id && !digital_work_id) || (artwork_id && digital_work_id)) {
      return res.status(400).json({ 
        error: 'Must provide either artwork_id or digital_work_id, but not both' 
      });
    }

    if (!sale_date) {
      return res.status(400).json({ error: 'Sale date is required' });
    }

    // Clean and parse sale_price - remove currency symbols, commas, whitespace
    let cleanedPrice = null;
    if (sale_price) {
      const priceStr = String(sale_price).replace(/[$,\s]/g, '').trim();
      if (priceStr && !isNaN(priceStr)) {
        cleanedPrice = parseFloat(priceStr);
      }
    }

    const result = await pool.query(`
      INSERT INTO sales (
        artwork_id, digital_work_id, sale_date, sale_price,
        buyer_name, buyer_email, platform, notes
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `, [
      artwork_id || null,
      digital_work_id || null,
      sale_date,
      cleanedPrice,
      buyer_name || null,
      buyer_email || null,
      platform || null,
      notes || null
    ]);

    // Update the artwork or digital work status to 'sold'
    if (artwork_id) {
      await pool.query(
        `UPDATE artworks SET sale_status = 'sold', updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
        [artwork_id]
      );
    } else if (digital_work_id) {
      await pool.query(
        `UPDATE digital_works SET sale_status = 'sold', updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
        [digital_work_id]
      );
    }

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating sale:', error);
    res.status(500).json({ error: 'Failed to create sale' });
  }
});

// Update sale
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      sale_date,
      sale_price,
      buyer_name,
      buyer_email,
      platform,
      notes
    } = req.body;

    const result = await pool.query(`
      UPDATE sales
      SET 
        sale_date = COALESCE($1, sale_date),
        sale_price = COALESCE($2, sale_price),
        buyer_name = COALESCE($3, buyer_name),
        buyer_email = COALESCE($4, buyer_email),
        platform = COALESCE($5, platform),
        notes = COALESCE($6, notes),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $7
      RETURNING *
    `, [sale_date, sale_price, buyer_name, buyer_email, platform, notes, id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Sale not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating sale:', error);
    res.status(500).json({ error: 'Failed to update sale' });
  }
});

// Delete sale
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Get the sale first to know which item to update
    const saleResult = await pool.query('SELECT * FROM sales WHERE id = $1', [id]);
    
    if (saleResult.rows.length === 0) {
      return res.status(404).json({ error: 'Sale not found' });
    }

    const sale = saleResult.rows[0];
    
    // Delete the sale
    await pool.query('DELETE FROM sales WHERE id = $1', [id]);

    // Update the item status back to 'available'
    if (sale.artwork_id) {
      await pool.query(
        `UPDATE artworks SET sale_status = 'available', updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
        [sale.artwork_id]
      );
    } else if (sale.digital_work_id) {
      await pool.query(
        `UPDATE digital_works SET sale_status = 'available', updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
        [sale.digital_work_id]
      );
    }

    res.json({ message: 'Sale deleted successfully' });
  } catch (error) {
    console.error('Error deleting sale:', error);
    res.status(500).json({ error: 'Failed to delete sale' });
  }
});

// Get sales statistics
router.get('/stats/summary', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        COUNT(*) as total_sales,
        SUM(sale_price) as total_revenue,
        AVG(sale_price) as average_sale_price,
        COUNT(DISTINCT artwork_id) as artworks_sold,
        COUNT(DISTINCT digital_work_id) as digital_works_sold
      FROM sales
    `);
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching sales stats:', error);
    res.status(500).json({ error: 'Failed to fetch sales statistics' });
  }
});

module.exports = router;
