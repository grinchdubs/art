const express = require('express');
const router = express.Router();

const IMMICH_SERVER = 'http://100.79.159.107:30041';
const IMMICH_API_KEY = 'XvAiawr3Ht7yWBfO4ldjNgp1b2eIW1b3zI5X2Ecck';

// Proxy: Get recent assets using search
router.get('/assets', async (req, res) => {
  try {
    const { take = 100, skip = 0 } = req.query;
    
    const response = await fetch(`${IMMICH_SERVER}/api/search/metadata`, {
      method: 'POST',
      headers: {
        'x-api-key': IMMICH_API_KEY,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        take: parseInt(take),
        skip: parseInt(skip)
      })
    });

    if (!response.ok) {
      return res.status(response.status).json({ error: 'Failed to fetch assets from Immich' });
    }

    const data = await response.json();
    // Return assets array from the response
    res.json(data.assets?.items || []);
  } catch (error) {
    console.error('Error fetching Immich assets:', error);
    res.status(500).json({ error: 'Failed to fetch assets' });
  }
});

// Proxy: Search assets
router.post('/search', async (req, res) => {
  try {
    const { q } = req.body;
    
    const response = await fetch(`${IMMICH_SERVER}/api/search/metadata`, {
      method: 'POST',
      headers: {
        'x-api-key': IMMICH_API_KEY,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        q: q,
        type: 'IMAGE'
      })
    });

    if (!response.ok) {
      return res.status(response.status).json({ error: 'Search failed' });
    }

    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error('Error searching Immich:', error);
    res.status(500).json({ error: 'Search failed' });
  }
});

// Proxy: Get albums
router.get('/albums', async (req, res) => {
  try {
    const response = await fetch(`${IMMICH_SERVER}/api/albums`, {
      headers: {
        'x-api-key': IMMICH_API_KEY,
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      return res.status(response.status).json({ error: 'Failed to fetch albums' });
    }

    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error('Error fetching albums:', error);
    res.status(500).json({ error: 'Failed to fetch albums' });
  }
});

// Proxy: Get album assets
router.get('/albums/:albumId', async (req, res) => {
  try {
    const { albumId } = req.params;
    
    const response = await fetch(`${IMMICH_SERVER}/api/albums/${albumId}`, {
      headers: {
        'x-api-key': IMMICH_API_KEY,
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      return res.status(response.status).json({ error: 'Failed to fetch album assets' });
    }

    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error('Error fetching album assets:', error);
    res.status(500).json({ error: 'Failed to fetch album assets' });
  }
});

// Proxy: Get thumbnail
router.get('/thumbnail/:assetId', async (req, res) => {
  try {
    const { assetId } = req.params;
    
    const response = await fetch(`${IMMICH_SERVER}/api/assets/${assetId}/thumbnail?size=preview`, {
      headers: {
        'x-api-key': IMMICH_API_KEY
      }
    });

    if (!response.ok) {
      return res.status(response.status).json({ error: 'Failed to fetch thumbnail' });
    }

    const contentType = response.headers.get('content-type');
    res.setHeader('Content-Type', contentType);
    
    response.body.pipe(res);
  } catch (error) {
    console.error('Error fetching thumbnail:', error);
    res.status(500).json({ error: 'Failed to fetch thumbnail' });
  }
});

// Download image from Immich
router.get('/download/:assetId', async (req, res) => {
  try {
    const { assetId } = req.params;
    
    // Use native fetch (available in Node 18+)
    const response = await fetch(`${IMMICH_SERVER}/api/assets/${assetId}/original`, {
      headers: {
        'x-api-key': IMMICH_API_KEY
      }
    });

    if (!response.ok) {
      return res.status(response.status).json({ error: 'Failed to fetch image from Immich' });
    }

    // Forward the image
    const contentType = response.headers.get('content-type');
    res.setHeader('Content-Type', contentType);
    
    response.body.pipe(res);
  } catch (error) {
    console.error('Error proxying Immich image:', error);
    res.status(500).json({ error: 'Failed to download image' });
  }
});

module.exports = router;
