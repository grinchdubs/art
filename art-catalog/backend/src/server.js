require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const pool = require('./db');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Serve uploaded images
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Import routes
const artworksRoutes = require('./routes/artworks');
const digitalWorksRoutes = require('./routes/digitalWorks');
const exhibitionsRoutes = require('./routes/exhibitions');
const galleryRoutes = require('./routes/gallery');

// Use routes
app.use('/api/artworks', artworksRoutes);
app.use('/api/digital-works', digitalWorksRoutes);
app.use('/api/exhibitions', exhibitionsRoutes);
app.use('/api/gallery', galleryRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Art Catalog API is running' });
});

// Initialize database
async function initializeDatabase() {
  try {
    const initSQL = fs.readFileSync(path.join(__dirname, 'init-db.sql'), 'utf8');
    await pool.query(initSQL);
    console.log('✅ Database initialized successfully');
  } catch (error) {
    console.error('❌ Error initializing database:', error);
    throw error;
  }
}

// Start server
async function startServer() {
  try {
    // Initialize database first
    await initializeDatabase();

    app.listen(PORT, () => {
      console.log(`🚀 Art Catalog API server running on http://localhost:${PORT}`);
      console.log(`📁 Image uploads directory: ${path.join(__dirname, '../uploads')}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();

module.exports = app;
