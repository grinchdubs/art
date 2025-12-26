const express = require('express');
const router = express.Router();

const IMMICH_SERVER = 'http://grnchnas:30041';
const IMMICH_API_KEY = 'XvAiawr3Ht7yWBfO4ldjNgp1b2eIW1b3zI5X2Ecck';

// Download image from Immich
router.get('/download/:assetId', async (req, res) => {
  try {
    const { assetId } = req.params;
    
    // Use native fetch (available in Node 18+)
    const response = await fetch(`${IMMICH_SERVER}/api/asset/file/${assetId}`, {
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
