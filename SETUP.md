# Art Catalog - Setup Guide

## Migration to PostgreSQL Backend

Your art catalog application has been upgraded with a PostgreSQL backend to ensure your data is persistent and not stored in browser cache.

## Prerequisites

- Docker Desktop installed and running
- Node.js 18+ installed (for local development)

## Quick Start with Docker

1. **Start Docker Desktop** (if not already running)

2. **Build and start all services**:
   ```bash
   cd art-catalog
   docker-compose build
   docker-compose up -d
   ```

   This will start:
   - PostgreSQL database (port 5432)
   - Backend API server (port 3001)
   - Frontend application (port 3333)

3. **Access the application**:
   - Open your browser to: http://localhost:3333

4. **Migrate your existing data**:
   - Click the blue "🔄 Migrate to PostgreSQL" button in the bottom-right corner
   - Click "Start Migration"
   - Wait for migration to complete
   - Your data is now safely stored in PostgreSQL!

## What Changed?

### Before
- All data stored in IndexedDB (browser cache)
- Risk of data loss if cache cleared
- Data only accessible on one device/browser

### After
- All data stored in PostgreSQL database
- Persistent storage with Docker volumes
- Accessible from any device
- Proper backup capabilities
- Global image gallery with batch upload

## Detailed Setup

### Option 1: Docker (Recommended)

This is the easiest way to run the application with everything configured.

```bash
# Navigate to project directory
cd art-catalog

# Build the containers (first time only)
docker-compose build

# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop all services
docker-compose down

# Stop and remove all data (CAUTION: This deletes your database!)
docker-compose down -v
```

### Option 2: Local Development

If you want to develop or run services separately:

#### Backend

```bash
# Navigate to backend directory
cd art-catalog/backend

# Install dependencies
npm install

# Create .env file (already exists)
# Make sure PostgreSQL is running locally or via Docker

# Start development server
npm run dev
```

Backend will run on http://localhost:3001

#### Frontend

```bash
# Navigate to project root
cd art-catalog

# Install dependencies
npm install

# Start development server
npm run dev
```

Frontend will run on http://localhost:5173 (Vite default)

## Migration Process

The migration tool will:

1. **Export images** - Convert all browser-stored images to files and upload to server
2. **Migrate artworks** - Transfer all physical artwork records with their associations
3. **Migrate digital works** - Transfer all digital work records including NFT data
4. **Migrate exhibitions** - Transfer all exhibition records and relationships
5. **Preserve relationships** - Maintain all connections between artworks, images, and exhibitions

### Before Migration

1. **Backup your data** (optional but recommended):
   - Click "Export Backup (JSON)" in the migration panel
   - This creates a JSON file of all your current data

2. **Ensure backend is running**:
   ```bash
   docker-compose ps
   ```
   You should see all three services running.

### During Migration

- Do not close the browser window
- Do not refresh the page
- Wait for the "Migration Completed Successfully" message
- Progress is shown for each data type

### After Migration

Your application will now use the PostgreSQL backend automatically. The old IndexedDB data remains in your browser for safety, but is no longer used.

## Data Management

### Backup Database

```bash
# Export database to SQL file
docker exec art-catalog-db pg_dump -U artcatalog artcatalog > backup.sql

# Restore from backup
docker exec -i art-catalog-db psql -U artcatalog artcatalog < backup.sql
```

### View Database

```bash
# Connect to database
docker exec -it art-catalog-db psql -U artcatalog artcatalog

# Common commands:
# \dt - list tables
# \d table_name - describe table
# SELECT * FROM artworks; - query data
# \q - quit
```

### Access Uploaded Images

Images are stored in `backend/uploads/` directory and accessible via:
http://localhost:3001/uploads/filename.jpg

## Troubleshooting

### Docker services won't start

1. Make sure Docker Desktop is running
2. Check if ports are already in use:
   ```bash
   # Windows
   netstat -ano | findstr :3001
   netstat -ano | findstr :3333
   netstat -ano | findstr :5432
   ```

3. Stop conflicting services or change ports in docker-compose.yml

### Migration fails

1. Check backend is running:
   ```bash
   curl http://localhost:3001/api/artworks
   ```

2. Check backend logs:
   ```bash
   docker-compose logs backend
   ```

3. Check database connection:
   ```bash
   docker-compose logs db
   ```

### Can't see uploaded images

1. Check uploads directory exists:
   ```bash
   ls backend/uploads
   ```

2. Check image permissions (Linux/Mac):
   ```bash
   chmod -R 755 backend/uploads
   ```

3. Verify image URLs in browser console

## Environment Variables

### Backend (.env)
```env
DATABASE_URL=postgresql://artcatalog:artcatalog123@db:5432/artcatalog
PORT=3001
NODE_ENV=production
```

### Frontend
Add to frontend if needed:
```env
VITE_API_URL=http://localhost:3001
```

## API Documentation

Once backend is running, the following API endpoints are available:

### Artworks
- `GET /api/artworks` - List all artworks
- `GET /api/artworks/:id` - Get artwork details
- `POST /api/artworks` - Create artwork
- `PUT /api/artworks/:id` - Update artwork
- `DELETE /api/artworks/:id` - Delete artwork

### Digital Works
- `GET /api/digital-works` - List all digital works
- `GET /api/digital-works/:id` - Get digital work details
- `POST /api/digital-works` - Create digital work
- `PUT /api/digital-works/:id` - Update digital work
- `DELETE /api/digital-works/:id` - Delete digital work

### Exhibitions
- `GET /api/exhibitions` - List all exhibitions
- `GET /api/exhibitions/:id` - Get exhibition details
- `POST /api/exhibitions` - Create exhibition
- `PUT /api/exhibitions/:id` - Update exhibition
- `DELETE /api/exhibitions/:id` - Delete exhibition

### Gallery
- `GET /api/gallery` - List all images
- `POST /api/gallery/upload` - Upload single image
- `POST /api/gallery/upload/batch` - Upload multiple images
- `DELETE /api/gallery/:id` - Delete image

## Support

For issues or questions, check the backend logs:
```bash
docker-compose logs -f backend
```

Database logs:
```bash
docker-compose logs -f db
```
