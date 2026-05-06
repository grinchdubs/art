const express = require('express');
const router = express.Router();
const pool = require('../db');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp|bmp|tiff/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

// Get all gallery images
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT * FROM gallery_images
      ORDER BY uploaded_at DESC
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching gallery images:', error);
    res.status(500).json({ error: 'Failed to fetch gallery images' });
  }
});

// Get single gallery image
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('SELECT * FROM gallery_images WHERE id = $1', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Image not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching gallery image:', error);
    res.status(500).json({ error: 'Failed to fetch gallery image' });
  }
});

// Upload single image
router.post('/upload', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const result = await pool.query(`
      INSERT INTO gallery_images (filename, original_name, mime_type, file_size, file_path)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `, [
      req.file.filename,
      req.file.originalname,
      req.file.mimetype,
      req.file.size,
      `/uploads/${req.file.filename}`
    ]);

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error uploading image:', error);

    // Clean up uploaded file if database insert fails
    if (req.file) {
      fs.unlink(req.file.path, (err) => {
        if (err) console.error('Error deleting file:', err);
      });
    }

    res.status(500).json({ error: 'Failed to upload image' });
  }
});

// Batch upload multiple images
router.post('/upload/batch', upload.array('images', 50), async (req, res) => {
  const client = await pool.connect();
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'No files uploaded' });
    }

    await client.query('BEGIN');

    const uploadedImages = [];

    for (const file of req.files) {
      const result = await client.query(`
        INSERT INTO gallery_images (filename, original_name, mime_type, file_size, file_path)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *
      `, [
        file.filename,
        file.originalname,
        file.mimetype,
        file.size,
        `/uploads/${file.filename}`
      ]);

      uploadedImages.push(result.rows[0]);
    }

    await client.query('COMMIT');
    res.status(201).json({
      message: `Successfully uploaded ${uploadedImages.length} images`,
      images: uploadedImages
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error uploading images:', error);

    // Clean up uploaded files if database insert fails
    if (req.files) {
      req.files.forEach(file => {
        fs.unlink(file.path, (err) => {
          if (err) console.error('Error deleting file:', err);
        });
      });
    }

    res.status(500).json({ error: 'Failed to upload images' });
  } finally {
    client.release();
  }
});

// Update gallery image (rename)
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { original_name } = req.body;

    if (!original_name || !original_name.trim()) {
      return res.status(400).json({ error: 'Image name is required' });
    }

    const result = await pool.query(`
      UPDATE gallery_images
      SET original_name = $1
      WHERE id = $2
      RETURNING *
    `, [original_name.trim(), id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Image not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating image:', error);
    res.status(500).json({ error: 'Failed to update image' });
  }
});

// Delete gallery image
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Get image info before deleting
    const imageResult = await pool.query('SELECT * FROM gallery_images WHERE id = $1', [id]);

    if (imageResult.rows.length === 0) {
      return res.status(404).json({ error: 'Image not found' });
    }

    const image = imageResult.rows[0];

    // Delete from database
    await pool.query('DELETE FROM gallery_images WHERE id = $1', [id]);

    // Delete file from filesystem
    const filePath = path.join(__dirname, '../..', image.file_path);
    fs.unlink(filePath, (err) => {
      if (err) console.error('Error deleting file:', err);
    });

    res.json({ message: 'Image deleted successfully' });
  } catch (error) {
    console.error('Error deleting image:', error);
    res.status(500).json({ error: 'Failed to delete image' });
  }
});

// Get images used by a specific artwork
router.get('/artwork/:artworkId', async (req, res) => {
  try {
    const { artworkId } = req.params;
    const result = await pool.query(`
      SELECT gi.*, ai.is_primary, ai.display_order
      FROM gallery_images gi
      JOIN artwork_images ai ON gi.id = ai.image_id
      WHERE ai.artwork_id = $1
      ORDER BY ai.display_order, ai.is_primary DESC
    `, [artworkId]);

    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching artwork images:', error);
    res.status(500).json({ error: 'Failed to fetch artwork images' });
  }
});

// Get images used by a specific digital work
router.get('/digital-work/:digitalWorkId', async (req, res) => {
  try {
    const { digitalWorkId } = req.params;
    const result = await pool.query(`
      SELECT gi.*, dwi.is_primary, dwi.display_order
      FROM gallery_images gi
      JOIN digital_work_images dwi ON gi.id = dwi.image_id
      WHERE dwi.digital_work_id = $1
      ORDER BY dwi.display_order, dwi.is_primary DESC
    `, [digitalWorkId]);

    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching digital work images:', error);
    res.status(500).json({ error: 'Failed to fetch digital work images' });
  }
});

module.exports = router;
