const express = require('express');
const router = express.Router();
const pool = require('../db');

// Export all data
router.get('/export', async (req, res) => {
  const client = await pool.connect();
  try {
    const backup = {
      version: '1.0',
      timestamp: new Date().toISOString(),
      data: {}
    };

    // Export all tables
    const tables = [
      'artworks',
      'digital_works',
      'exhibitions',
      'sales',
      'tags',
      'series',
      'gallery_images',
      'artwork_images',
      'digital_work_images',
      'artwork_tags',
      'digital_work_tags',
      'artwork_exhibitions',
      'location_history'
    ];

    for (const table of tables) {
      const result = await client.query(`SELECT * FROM ${table}`);
      backup.data[table] = result.rows;
    }

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename=art-catalog-backup-${Date.now()}.json`);
    res.json(backup);
  } catch (error) {
    console.error('Error creating backup:', error);
    res.status(500).json({ error: 'Failed to create backup', details: error.message });
  } finally {
    client.release();
  }
});

// Import data
router.post('/import', async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const backup = req.body;
    
    if (!backup.data) {
      throw new Error('Invalid backup format');
    }

    // Define import order (respecting foreign key constraints)
    const importOrder = [
      'series',
      'tags',
      'gallery_images',
      'artworks',
      'digital_works',
      'exhibitions',
      'sales',
      'artwork_images',
      'digital_work_images',
      'artwork_tags',
      'digital_work_tags',
      'artwork_exhibitions',
      'location_history'
    ];

    let imported = {};

    for (const table of importOrder) {
      if (!backup.data[table] || backup.data[table].length === 0) {
        imported[table] = 0;
        continue;
      }

      const rows = backup.data[table];
      let count = 0;

      for (const row of rows) {
        const columns = Object.keys(row);
        const values = Object.values(row);
        const placeholders = values.map((_, i) => `$${i + 1}`).join(', ');
        
        // Use INSERT ... ON CONFLICT DO UPDATE to handle duplicates
        const conflictColumn = 'id';
        const updateSet = columns
          .filter(col => col !== 'id')
          .map(col => `${col} = EXCLUDED.${col}`)
          .join(', ');

        const query = `
          INSERT INTO ${table} (${columns.join(', ')})
          VALUES (${placeholders})
          ON CONFLICT (${conflictColumn}) 
          DO UPDATE SET ${updateSet}
        `;

        await client.query(query, values);
        count++;
      }

      imported[table] = count;

      // Update sequence for tables with auto-increment IDs
      if (rows.length > 0 && rows[0].id) {
        const maxId = Math.max(...rows.map(r => r.id));
        await client.query(`
          SELECT setval(pg_get_serial_sequence('${table}', 'id'), ${maxId}, true)
        `);
      }
    }

    await client.query('COMMIT');
    res.json({ 
      success: true, 
      message: 'Data imported successfully',
      imported 
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error importing backup:', error);
    res.status(500).json({ 
      error: 'Failed to import backup', 
      details: error.message 
    });
  } finally {
    client.release();
  }
});

// Clear all data (for fresh import)
router.post('/clear', async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Delete in reverse order to respect foreign keys
    const tables = [
      'location_history',
      'artwork_exhibitions',
      'digital_work_tags',
      'artwork_tags',
      'digital_work_images',
      'artwork_images',
      'sales',
      'exhibitions',
      'digital_works',
      'artworks',
      'gallery_images',
      'tags',
      'series'
    ];

    for (const table of tables) {
      await client.query(`DELETE FROM ${table}`);
      // Reset sequences
      await client.query(`
        SELECT setval(pg_get_serial_sequence('${table}', 'id'), 1, false)
      `);
    }

    await client.query('COMMIT');
    res.json({ success: true, message: 'All data cleared successfully' });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error clearing data:', error);
    res.status(500).json({ error: 'Failed to clear data', details: error.message });
  } finally {
    client.release();
  }
});

module.exports = router;
