const express = require('express');
const router = express.Router();
const pool = require('../db');

// Get works created over time (last 12 months)
router.get('/works-over-time', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        DATE_TRUNC('month', created_at) as month,
        COUNT(*) as count,
        'physical' as type
      FROM artworks
      WHERE created_at >= NOW() - INTERVAL '12 months'
      GROUP BY DATE_TRUNC('month', created_at)
      
      UNION ALL
      
      SELECT 
        DATE_TRUNC('month', created_at) as month,
        COUNT(*) as count,
        'digital' as type
      FROM digital_works
      WHERE created_at >= NOW() - INTERVAL '12 months'
      GROUP BY DATE_TRUNC('month', created_at)
      
      ORDER BY month ASC
    `);
    
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching works over time:', error);
    res.status(500).json({ error: 'Failed to fetch works over time' });
  }
});

// Get works by medium
router.get('/works-by-medium', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        COALESCE(medium, 'Unknown') as medium,
        COUNT(*) as count
      FROM artworks
      WHERE medium IS NOT NULL AND medium != ''
      GROUP BY medium
      ORDER BY count DESC
      LIMIT 10
    `);
    
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching works by medium:', error);
    res.status(500).json({ error: 'Failed to fetch works by medium' });
  }
});

// Get status distribution
router.get('/status-distribution', async (req, res) => {
  try {
    const artworksResult = await pool.query(`
      SELECT 
        COALESCE(sale_status, 'Unknown') as status,
        COUNT(*) as count
      FROM artworks
      GROUP BY sale_status
    `);
    
    const digitalResult = await pool.query(`
      SELECT 
        CASE 
          WHEN nft_token_id IS NOT NULL AND nft_token_id != '' THEN 'Minted'
          ELSE 'Not Minted'
        END as status,
        COUNT(*) as count
      FROM digital_works
      GROUP BY (nft_token_id IS NOT NULL AND nft_token_id != '')
    `);
    
    res.json({
      physical: artworksResult.rows,
      digital: digitalResult.rows
    });
  } catch (error) {
    console.error('Error fetching status distribution:', error);
    res.status(500).json({ error: 'Failed to fetch status distribution' });
  }
});

// Get price ranges
router.get('/price-ranges', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        CASE 
          WHEN CAST(price AS DECIMAL) < 100 THEN '< $100'
          WHEN CAST(price AS DECIMAL) >= 100 AND CAST(price AS DECIMAL) < 500 THEN '$100-$500'
          WHEN CAST(price AS DECIMAL) >= 500 AND CAST(price AS DECIMAL) < 1000 THEN '$500-$1K'
          WHEN CAST(price AS DECIMAL) >= 1000 AND CAST(price AS DECIMAL) < 5000 THEN '$1K-$5K'
          WHEN CAST(price AS DECIMAL) >= 5000 AND CAST(price AS DECIMAL) < 10000 THEN '$5K-$10K'
          ELSE '$10K+'
        END as range,
        COUNT(*) as count
      FROM artworks
      WHERE price IS NOT NULL AND price != '' AND price ~ '^[0-9.]+$'
      GROUP BY range
      ORDER BY 
        CASE range
          WHEN '< $100' THEN 1
          WHEN '$100-$500' THEN 2
          WHEN '$500-$1K' THEN 3
          WHEN '$1K-$5K' THEN 4
          WHEN '$5K-$10K' THEN 5
          WHEN '$10K+' THEN 6
        END
    `);
    
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching price ranges:', error);
    res.status(500).json({ error: 'Failed to fetch price ranges' });
  }
});

// Get summary statistics
router.get('/summary', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        (SELECT COUNT(*) FROM artworks) as total_artworks,
        (SELECT COUNT(*) FROM digital_works) as total_digital_works,
        (SELECT COUNT(*) FROM exhibitions) as total_exhibitions,
        (SELECT COUNT(*) FROM gallery_images) as total_images,
        (SELECT SUM(CAST(price AS DECIMAL)) FROM artworks WHERE price IS NOT NULL AND price != '' AND price ~ '^[0-9.]+$') as total_artwork_value,
        (SELECT COUNT(*) FROM artworks WHERE sale_status = 'sold') as artworks_sold,
        (SELECT COUNT(*) FROM digital_works WHERE nft_token_id IS NOT NULL AND nft_token_id != '') as digital_works_minted
    `);
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching summary:', error);
    res.status(500).json({ error: 'Failed to fetch summary' });
  }
});

module.exports = router;
