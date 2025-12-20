# Art Catalog Backend

Node.js/Express backend with PostgreSQL database for the Art Catalog application.

## Features

- RESTful API for artworks, digital works, and exhibitions
- Global image gallery with batch upload support
- PostgreSQL database with proper relationships
- File upload handling with Multer
- Docker support for easy deployment

## Setup

### Local Development

1. Install dependencies:
```bash
npm install
```

2. Create a `.env` file (or copy from `.env.example`):
```env
DATABASE_URL=postgresql://artcatalog:artcatalog123@localhost:5432/artcatalog
PORT=3001
NODE_ENV=development
```

3. Make sure PostgreSQL is running and create the database:
```bash
createdb artcatalog
```

4. Initialize the database schema:
```bash
psql -d artcatalog -f src/init-db.sql
```

5. Start the server:
```bash
npm run dev
```

The server will run on http://localhost:3001

### Docker Deployment

From the project root directory:

```bash
docker-compose up -d
```

This will start:
- PostgreSQL database on port 5432
- Backend API on port 3001
- Frontend on port 3333

## API Endpoints

### Artworks
- `GET /api/artworks` - Get all artworks
- `GET /api/artworks/:id` - Get single artwork
- `POST /api/artworks` - Create artwork
- `PUT /api/artworks/:id` - Update artwork
- `DELETE /api/artworks/:id` - Delete artwork
- `GET /api/artworks/:id/location-history` - Get location history
- `POST /api/artworks/:id/location-history` - Add location history

### Digital Works
- `GET /api/digital-works` - Get all digital works
- `GET /api/digital-works/:id` - Get single digital work
- `POST /api/digital-works` - Create digital work
- `PUT /api/digital-works/:id` - Update digital work
- `DELETE /api/digital-works/:id` - Delete digital work

### Exhibitions
- `GET /api/exhibitions` - Get all exhibitions
- `GET /api/exhibitions/:id` - Get single exhibition
- `POST /api/exhibitions` - Create exhibition
- `PUT /api/exhibitions/:id` - Update exhibition
- `DELETE /api/exhibitions/:id` - Delete exhibition

### Gallery
- `GET /api/gallery` - Get all gallery images
- `GET /api/gallery/:id` - Get single image
- `POST /api/gallery/upload` - Upload single image
- `POST /api/gallery/upload/batch` - Upload multiple images
- `DELETE /api/gallery/:id` - Delete image
- `GET /api/gallery/artwork/:artworkId` - Get images for artwork
- `GET /api/gallery/digital-work/:digitalWorkId` - Get images for digital work

## Database Schema

### Main Tables
- `artworks` - Physical artwork records
- `digital_works` - Digital artwork records
- `exhibitions` - Exhibition records
- `gallery_images` - Global image gallery

### Junction Tables
- `artwork_images` - Links artworks to images
- `digital_work_images` - Links digital works to images
- `artwork_exhibitions` - Links artworks to exhibitions
- `digital_work_exhibitions` - Links digital works to exhibitions
- `location_history` - Tracks artwork location changes

## File Storage

Uploaded images are stored in the `uploads/` directory and served via the `/uploads` route.

In Docker, this directory is mounted as a volume for persistence.

## Migration from IndexedDB

The frontend includes a migration tool to transfer data from browser storage (IndexedDB) to PostgreSQL:

1. Make sure the backend is running
2. Click the "🔄 Migrate to PostgreSQL" button in the frontend
3. Follow the prompts to migrate your data

The migration will:
- Transfer all artworks, digital works, and exhibitions
- Upload all images to the server
- Maintain all relationships between entities

## Environment Variables

- `DATABASE_URL` - PostgreSQL connection string
- `PORT` - Server port (default: 3001)
- `NODE_ENV` - Environment (development/production)
