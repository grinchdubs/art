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
const tagsRoutes = require('./routes/tags');
const seriesRoutes = require('./routes/series');

// Use routes
app.use('/api/artworks', artworksRoutes);
app.use('/api/digital-works', digitalWorksRoutes);
app.use('/api/exhibitions', exhibitionsRoutes);
app.use('/api/gallery', galleryRoutes);
app.use('/api/tags', tagsRoutes);
app.use('/api/series', seriesRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Art Catalog API is running' });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Art Catalog API server running on http://localhost:${PORT}`);
  console.log(`📁 Image uploads directory: ${path.join(__dirname, '../uploads')}`);
});

module.exports = app;
