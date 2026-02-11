# Art Catalog Technical Stack Documentation
## Complete System Architecture & Integration Guide

---

## Table of Contents
1. [System Overview](#system-overview)
2. [Current Technology Stack](#current-technology-stack)
3. [Architecture Diagram](#architecture-diagram)
4. [Component Details](#component-details)
5. [API Integration](#api-integration)
6. [Database Schema](#database-schema)
7. [Deployment Infrastructure](#deployment-infrastructure)
8. [Development Environment](#development-environment)
9. [New Dependencies & Integration](#new-dependencies--integration)
10. [Performance Considerations](#performance-considerations)
11. [Security](#security)
12. [Monitoring & Logging](#monitoring--logging)

---

## System Overview

### Application Type
Full-stack web application for art catalog management with professional documentation capabilities.

### Server Information
- **Production URL**: http://grnchserver:3333/
- **Architecture**: Monolithic with separate frontend/backend containers
- **Deployment**: Docker Compose orchestration
- **Reverse Proxy**: nginx

### Key Capabilities
- Physical and digital artwork cataloging
- Exhibition management
- Sales tracking and analytics
- Public gallery/portfolio
- Image management with multiple photos per work
- CSV import/export
- Database backup/restore
- QR code generation
- NFT metadata tracking
- Immich integration for photo management

---

## Current Technology Stack

### Frontend Stack

#### Core Framework
```json
{
  "framework": "React 19.2.0",
  "buildTool": "Vite 7.2.4",
  "language": "JavaScript (ES6+)",
  "modules": "ES Modules"
}
```

#### Dependencies
```json
{
  "react": "^19.2.0",                    // UI framework
  "react-dom": "^19.2.0",                // React DOM renderer
  "react-router-dom": "^7.10.1",         // Client-side routing
  "recharts": "^3.6.0",                  // Charts and analytics
  "qrcode": "^1.5.4",                    // QR code generation
  "dexie": "^4.2.1"                      // IndexedDB wrapper (local storage)
}
```

#### Development Tools
```json
{
  "@vitejs/plugin-react": "^5.1.1",     // Vite React plugin
  "eslint": "^9.39.1",                   // Code linting
  "eslint-plugin-react-hooks": "^7.0.1", // React hooks linting
  "eslint-plugin-react-refresh": "^0.4.24" // Fast refresh linting
}
```

#### Build Configuration
- **Development Server**: Vite dev server on port 3000 (local)
- **Production Build**: Static files served by nginx
- **HMR**: Hot Module Replacement enabled
- **Code Splitting**: Automatic via Vite
- **CSS**: Standard CSS files, no preprocessor

---

### Backend Stack

#### Core Framework
```json
{
  "runtime": "Node.js 20.x",
  "framework": "Express 4.18.2",
  "language": "JavaScript (CommonJS)",
  "apiStyle": "RESTful"
}
```

#### Dependencies
```json
{
  "express": "^4.18.2",      // Web framework
  "pg": "^8.11.3",           // PostgreSQL client
  "cors": "^2.8.5",          // Cross-origin resource sharing
  "multer": "^2.0.0-rc.4",   // File upload handling
  "dotenv": "^16.3.1"        // Environment variable management
}
```

#### Development Tools
```json
{
  "nodemon": "^3.0.1"        // Auto-restart on file changes
}
```

#### API Structure
- **Port**: 3001 (internal), proxied through nginx to 3333
- **Base Path**: `/api`
- **Response Format**: JSON
- **Error Handling**: Centralized error middleware
- **File Uploads**: Multer with local filesystem storage

---

### Database Stack

#### Database System
```json
{
  "database": "PostgreSQL 15.x",
  "client": "node-postgres (pg)",
  "connectionPooling": true,
  "schema": "public"
}
```

#### Current Tables
```sql
-- Core tables
- artworks                    -- Physical artwork catalog
- digital_works               -- Digital artwork catalog
- exhibitions                 -- Exhibition records
- gallery_images              -- Global image repository
- artwork_images              -- Artwork-image relationships
- digital_work_images         -- Digital work-image relationships
- artwork_exhibitions         -- Artwork-exhibition relationships
- digital_work_exhibitions    -- Digital work-exhibition relationships
- location_history            -- Physical location tracking
- tags                        -- Tag taxonomy
- artwork_tags                -- Artwork-tag relationships
- digital_work_tags           -- Digital work-tag relationships
- series                      -- Series/collection grouping
- sales                       -- Sales transactions
```

#### Database Features
- **Constraints**: Foreign keys with CASCADE delete
- **Indexes**: On commonly queried fields (inventory, title, filename)
- **Triggers**: Auto-update timestamps on UPDATE
- **Generated Columns**: Computed fields where needed
- **Migrations**: SQL files in `backend/src/migrations/`

---

### Infrastructure Stack

#### Containerization
```yaml
# Docker Compose Services
services:
  frontend:
    image: node:20-alpine
    ports: "3000:3000"
    volume: ./:/app
    
  backend:
    image: node:20-alpine
    ports: "3001:3001"
    volume: ./backend:/app
    depends_on: db
    
  db:
    image: postgres:15-alpine
    ports: "5432:5432"
    volume: postgres-data
    environment:
      POSTGRES_DB: art_catalog
      POSTGRES_USER: artadmin
      POSTGRES_PASSWORD: [secure]
      
  nginx:
    image: nginx:alpine
    ports: "3333:80"
    volume: ./nginx.conf
    depends_on: frontend, backend
```

#### Reverse Proxy (nginx)
```nginx
# Configuration structure
upstream frontend {
    server frontend:3000;
}

upstream backend {
    server backend:3001;
}

server {
    listen 80;
    server_name grnchserver;
    
    location / {
        proxy_pass http://frontend;
    }
    
    location /api/ {
        proxy_pass http://backend;
    }
    
    location /uploads/ {
        proxy_pass http://backend;
    }
}
```

#### File Storage
- **Upload Directory**: `backend/uploads/`
- **Volume Mount**: Persistent Docker volume
- **Access**: Static file serving via Express
- **URL Pattern**: `http://grnchserver:3333/uploads/{filename}`

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                         User Browser                         │
│                  http://grnchserver:3333                     │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
                  ┌────────────────┐
                  │  nginx:80      │  Reverse Proxy
                  │  (Port 3333)   │
                  └────────┬───────┘
                           │
                ┏━━━━━━━━━━┻━━━━━━━━━━┓
                ▼                      ▼
       ┌─────────────────┐    ┌──────────────────┐
       │  React Frontend │    │  Express Backend │
       │  Vite Dev/Build │    │    Node.js       │
       │   Port 3000     │    │   Port 3001      │
       └─────────────────┘    └────────┬─────────┘
                                       │
                              ┌────────┴────────┐
                              ▼                 ▼
                     ┌──────────────┐  ┌──────────────┐
                     │ PostgreSQL   │  │ File Storage │
                     │   Port 5432  │  │  /uploads/   │
                     └──────────────┘  └──────────────┘
```

---

## Component Details

### Frontend Components

#### Pages
```
src/pages/
├── ArtworkList.jsx          -- Browse physical artworks
├── ArtworkDetail.jsx        -- Single artwork view
├── ArtworkForm.jsx          -- Create/edit artwork
├── DigitalWorkList.jsx      -- Browse digital works
├── DigitalWorkDetail.jsx    -- Single digital work view
├── DigitalWorkForm.jsx      -- Create/edit digital work
├── ExhibitionList.jsx       -- Browse exhibitions
├── ExhibitionDetail.jsx     -- Single exhibition view
├── ExhibitionForm.jsx       -- Create/edit exhibition
├── SeriesList.jsx           -- Browse series/collections
├── SeriesDetail.jsx         -- Single series view
├── SeriesForm.jsx           -- Create/edit series
├── Gallery.jsx              -- Image gallery management
├── PublicGallery.jsx        -- Public portfolio view
├── PublicWorkDetail.jsx     -- Public artwork detail
├── Dashboard.jsx            -- Analytics dashboard
├── Reports.jsx              -- Reporting interface
├── SalesList.jsx            -- Sales tracking
└── BackupRestore.jsx        -- Database backup UI
```

#### Shared Components
```
src/components/
├── AdvancedSearch.jsx       -- Multi-criteria search
├── ImageLightbox.jsx        -- Full-screen image viewer
├── ImmichBrowser.jsx        -- Immich photo integration
├── MigrationPanel.jsx       -- Database migration UI
├── QRCodeGenerator.jsx      -- QR code creation
└── TagSelector.jsx          -- Tag selection component
```

#### Utilities
```
src/utils/
├── api.js                   -- API client functions
├── exportUtils.js           -- CSV export logic
├── importUtils.js           -- CSV import logic
├── digitalExportUtils.js    -- Digital work exports
├── digitalImportUtils.js    -- Digital work imports
├── videoImportUtils.js      -- Video URL imports
├── immichUtils.js           -- Immich integration
├── nftUtils.js              -- NFT metadata handling
└── migration.js             -- Database migration logic
```

### Backend Routes

```
backend/src/routes/
├── artworks.js              -- Physical artwork CRUD
├── digitalWorks.js          -- Digital work CRUD
├── exhibitions.js           -- Exhibition CRUD
├── gallery.js               -- Image management
├── tags.js                  -- Tag CRUD
├── series.js                -- Series CRUD
├── sales.js                 -- Sales tracking
├── analytics.js             -- Dashboard data
├── public.js                -- Public gallery API
├── immich.js                -- Immich integration
└── backup.js                -- Database backup/restore
```

### API Endpoints Reference

#### Artworks
```
GET    /api/artworks              -- List all artworks
GET    /api/artworks/:id          -- Get single artwork
POST   /api/artworks              -- Create artwork
PUT    /api/artworks/:id          -- Update artwork
DELETE /api/artworks/:id          -- Delete artwork
GET    /api/artworks/:id/history  -- Location history
POST   /api/artworks/import       -- CSV import
GET    /api/artworks/export       -- CSV export
```

#### Digital Works
```
GET    /api/digital-works         -- List all digital works
GET    /api/digital-works/:id     -- Get single work
POST   /api/digital-works         -- Create work
PUT    /api/digital-works/:id     -- Update work
DELETE /api/digital-works/:id     -- Delete work
POST   /api/digital-works/import  -- CSV import
GET    /api/digital-works/export  -- CSV export
```

#### Exhibitions
```
GET    /api/exhibitions           -- List exhibitions
GET    /api/exhibitions/:id       -- Get single exhibition
POST   /api/exhibitions           -- Create exhibition
PUT    /api/exhibitions/:id       -- Update exhibition
DELETE /api/exhibitions/:id       -- Delete exhibition
```

#### Gallery
```
GET    /api/gallery               -- List all images
POST   /api/gallery/upload        -- Upload image(s)
DELETE /api/gallery/:id           -- Delete image
GET    /api/gallery/:id           -- Get image metadata
```

#### Tags
```
GET    /api/tags                  -- List all tags
POST   /api/tags                  -- Create tag
PUT    /api/tags/:id              -- Update tag
DELETE /api/tags/:id              -- Delete tag
```

#### Series
```
GET    /api/series                -- List all series
GET    /api/series/:id            -- Get single series
POST   /api/series                -- Create series
PUT    /api/series/:id            -- Update series
DELETE /api/series/:id            -- Delete series
```

#### Sales
```
GET    /api/sales                 -- List all sales
POST   /api/sales                 -- Record sale
PUT    /api/sales/:id             -- Update sale
DELETE /api/sales/:id             -- Delete sale
GET    /api/sales/stats           -- Sales statistics
```

#### Analytics
```
GET    /api/analytics/overview    -- Dashboard overview
GET    /api/analytics/by-medium   -- Works by medium
GET    /api/analytics/by-year     -- Works by creation year
GET    /api/analytics/sales       -- Sales analytics
```

#### Public Gallery
```
GET    /api/public/artworks       -- Public artworks (is_public=true)
GET    /api/public/artworks/:id   -- Public artwork detail
GET    /api/public/digital-works  -- Public digital works
```

#### Backup
```
POST   /api/backup/create         -- Create database backup
POST   /api/backup/restore        -- Restore from backup
GET    /api/backup/list           -- List available backups
```

---

## Database Schema

### Core Entity Relationships

```
artworks ─┬──< artwork_images >──┬─ gallery_images
          ├──< artwork_tags >────┬─ tags
          ├──< artwork_exhibitions >──┬─ exhibitions
          ├──< location_history
          ├──< sales (artwork_id)
          └──< series_id ────────────── series

digital_works ─┬──< digital_work_images >──┬─ gallery_images
               ├──< digital_work_tags >────┬─ tags
               ├──< digital_work_exhibitions >──┬─ exhibitions
               ├──< sales (digital_work_id)
               └──< series_id ───────────────── series
```

### Detailed Schema

#### Artworks Table
```sql
CREATE TABLE artworks (
  id SERIAL PRIMARY KEY,
  inventory_number VARCHAR(255) UNIQUE,
  title VARCHAR(500) NOT NULL,
  creation_date VARCHAR(100),
  medium TEXT,
  dimensions VARCHAR(255),
  series_name VARCHAR(255),
  sale_status VARCHAR(50) DEFAULT 'available',
  price VARCHAR(100),
  location VARCHAR(255),
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### Digital Works Table
```sql
CREATE TABLE digital_works (
  id SERIAL PRIMARY KEY,
  inventory_number VARCHAR(255) UNIQUE,
  title VARCHAR(500) NOT NULL,
  creation_date VARCHAR(100),
  file_format VARCHAR(100),
  file_size VARCHAR(100),
  dimensions VARCHAR(255),
  sale_status VARCHAR(50) DEFAULT 'available',
  price VARCHAR(100),
  license_type VARCHAR(255),
  video_url TEXT,
  embed_url TEXT,
  platform VARCHAR(100),
  nft_token_id VARCHAR(255),
  nft_contract_address VARCHAR(255),
  nft_blockchain VARCHAR(100),
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### Gallery Images (Shared)
```sql
CREATE TABLE gallery_images (
  id SERIAL PRIMARY KEY,
  filename VARCHAR(500) NOT NULL,
  original_name VARCHAR(500),
  mime_type VARCHAR(100),
  file_size INTEGER,
  file_path TEXT NOT NULL,
  uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### Location History
```sql
CREATE TABLE location_history (
  id SERIAL PRIMARY KEY,
  artwork_id INTEGER REFERENCES artworks(id) ON DELETE CASCADE,
  location VARCHAR(255) NOT NULL,
  moved_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  notes TEXT
);
```

---

## New Dependencies & Integration

### Phase 1: Document Generation
```bash
# Backend
npm install pdfkit --save
npm install pdfkit-table --save  # Optional: table support
```

**Integration Points:**
- Create `backend/src/utils/pdfGenerator.js`
- Add route `backend/src/routes/certificates.js`
- Stream PDFs directly to response: `res.setHeader('Content-Type', 'application/pdf')`

### Phase 2: Image Processing
```bash
# Backend
npm install sharp --save
```

**Integration Points:**
- Create `backend/src/utils/imageProcessor.js`
- Add route `backend/src/routes/watermark.js`
- Process images before serving or on-demand
- Cache processed images

### Phase 3: Rich Text Editing
```bash
# Frontend
npm install draft-js --save
npm install react-draft-wysiwyg --save
```

**Integration Points:**
- Create `src/components/RichTextEditor.jsx`
- Store as JSON in database
- Convert to HTML/plain text for display

### Phase 4: PDF Viewing
```bash
# Frontend
npm install react-pdf --save
npm install pdfjs-dist --save  # Peer dependency
```

**Integration Points:**
- Create `src/components/PDFPreview.jsx`
- Preview certificates before download
- Show portfolio PDFs inline

### Phase 5: Excel Export (Optional)
```bash
# Backend
npm install exceljs --save
```

**Integration Points:**
- Add to export utilities
- Generate `.xlsx` files for complex reports
- Better formatting than CSV

### Phase 6: Background Jobs (Optional)
```bash
# Backend
npm install bull --save
npm install redis --save  # Required for Bull
```

**Integration Points:**
- Create `backend/src/jobs/` directory
- Queue heavy operations (PDF generation, watermarking)
- Add Redis service to docker-compose.yml

---

## Development Environment

### Local Setup

#### Prerequisites
```bash
# Required
- Node.js 20.x
- Docker & Docker Compose
- Git

# Optional
- PostgreSQL client (psql) for DB debugging
- Postman or curl for API testing
```

#### Environment Variables

**Backend (.env)**
```env
# Database
DB_HOST=db
DB_PORT=5432
DB_NAME=art_catalog
DB_USER=artadmin
DB_PASSWORD=your_secure_password

# Server
PORT=3001
NODE_ENV=development

# File Upload
UPLOAD_DIR=./uploads
MAX_FILE_SIZE=52428800  # 50MB in bytes

# Optional: External integrations
IMMICH_API_URL=http://your-immich-server:2283
IMMICH_API_KEY=your_api_key
```

**Frontend (.env)**
```env
VITE_API_URL=http://grnchserver:3333/api
VITE_PUBLIC_URL=http://grnchserver:3333
```

#### Local Development Commands

**Start all services:**
```bash
docker compose up -d
```

**View logs:**
```bash
docker compose logs -f backend
docker compose logs -f frontend
docker compose logs -f db
```

**Run migrations:**
```bash
docker compose exec backend node src/migrations/run.js
# Or manually
docker compose exec db psql -U artadmin -d art_catalog -f /migrations/003_add_provenance.sql
```

**Backup database:**
```bash
docker compose exec db pg_dump -U artadmin art_catalog > backup_$(date +%Y%m%d).sql
```

**Restore database:**
```bash
docker compose exec -T db psql -U artadmin art_catalog < backup_20260210.sql
```

---

## Performance Considerations

### Frontend Optimization
- **Code Splitting**: Vite automatically splits routes
- **Lazy Loading**: Use `React.lazy()` for heavy components
- **Image Optimization**: Serve appropriately sized images
- **Caching**: Use `dexie` for client-side caching
- **Pagination**: Implement virtual scrolling for large lists

### Backend Optimization
- **Database Indexing**: Already indexed on common queries
- **Connection Pooling**: pg uses pooling by default
- **Response Caching**: Consider Redis for frequently accessed data
- **File Serving**: nginx static file serving for uploads
- **Compression**: Enable gzip in nginx

### Database Optimization
```sql
-- Analyze query performance
EXPLAIN ANALYZE SELECT * FROM artworks WHERE title ILIKE '%search%';

-- Add indexes as needed
CREATE INDEX idx_artworks_creation_date ON artworks(creation_date);
CREATE INDEX idx_sales_date ON sales(sale_date);

-- Vacuum regularly (Docker can automate this)
VACUUM ANALYZE artworks;
```

### Image Handling Best Practices
- **Thumbnails**: Generate thumbnails on upload (use Sharp)
- **Progressive JPEG**: Use for web display
- **Lazy Loading**: Load images as user scrolls
- **CDN**: Consider CDN for production (Cloudflare, etc.)

---

## Security

### Current Security Measures
- **CORS**: Configured in Express
- **SQL Injection**: Parameterized queries via `pg`
- **File Upload**: Multer with file type validation
- **Environment Variables**: Secrets in .env files (not committed)

### Recommended Enhancements

#### Authentication & Authorization
```bash
npm install jsonwebtoken --save
npm install bcrypt --save
npm install express-rate-limit --save
```

**Implementation:**
- Add user authentication system
- JWT tokens for session management
- Role-based access control (admin, viewer, public)
- Rate limiting on API endpoints

#### Input Validation
```bash
npm install joi --save
# or
npm install express-validator --save
```

**Implementation:**
- Validate all input data
- Sanitize user input
- Prevent XSS attacks

#### HTTPS
- Configure SSL certificates
- Use Let's Encrypt for free certificates
- Force HTTPS redirect in nginx

#### Database Security
- Use read-only database user for reports
- Implement row-level security for multi-user
- Regular automated backups
- Encrypt sensitive data (buyer info, etc.)

---

## Monitoring & Logging

### Application Logging

**Backend:**
```bash
npm install winston --save
npm install morgan --save  # HTTP request logging
```

**Example Configuration:**
```javascript
// backend/src/utils/logger.js
const winston = require('winston');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' }),
  ],
});

if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.simple(),
  }));
}
```

### Error Tracking

**Options:**
- Sentry (cloud-based error tracking)
- Self-hosted solutions (Bugsnag, Rollbar)

```bash
npm install @sentry/node --save  # Backend
npm install @sentry/react --save  # Frontend
```

### Performance Monitoring

**Docker Stats:**
```bash
docker stats
docker compose top
```

**Database Monitoring:**
```sql
-- Active queries
SELECT * FROM pg_stat_activity;

-- Slow queries
SELECT query, mean_exec_time, calls 
FROM pg_stat_statements 
ORDER BY mean_exec_time DESC 
LIMIT 10;
```

### Health Checks

**Already Implemented:**
```
GET /api/health
Response: { status: 'ok', message: 'Art Catalog API is running' }
```

**Enhanced Health Check:**
```javascript
app.get('/api/health', async (req, res) => {
  try {
    // Check database
    await pool.query('SELECT 1');
    
    // Check file system
    const uploadsOk = fs.existsSync('./uploads');
    
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      database: 'connected',
      filesystem: uploadsOk ? 'ok' : 'error',
      uptime: process.uptime()
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
});
```

---

## Integration Checklist for New Features

When adding a new feature, follow this checklist:

### Database Layer
- [ ] Create migration SQL file
- [ ] Test migration on local database
- [ ] Add indexes for new query patterns
- [ ] Update database documentation

### Backend Layer
- [ ] Create/update route file
- [ ] Add validation middleware
- [ ] Implement error handling
- [ ] Add API tests
- [ ] Update API documentation

### Frontend Layer
- [ ] Create/update components
- [ ] Add API client functions
- [ ] Implement error handling
- [ ] Add loading states
- [ ] Test responsive design

### Integration
- [ ] Test full flow end-to-end
- [ ] Check performance impact
- [ ] Verify security measures
- [ ] Update user documentation

### Deployment
- [ ] Build and test in Docker
- [ ] Deploy to server
- [ ] Run migrations on production
- [ ] Smoke test production
- [ ] Monitor for errors

---

## Useful Commands Reference

### Docker
```bash
# Start services
docker compose up -d

# Rebuild after code changes
docker compose up -d --build

# Stop services
docker compose down

# View logs
docker compose logs -f [service_name]

# Execute command in container
docker compose exec backend npm install package-name
docker compose exec db psql -U artadmin art_catalog

# Remove volumes (CAUTION: deletes data)
docker compose down -v
```

### Git Workflow
```bash
# Create feature branch
git checkout -b feature/certificate-generation

# Commit changes
git add -A
git commit -m "Add certificate generation feature"

# Push to remote
git push origin feature/certificate-generation

# Merge to main
git checkout main
git merge feature/certificate-generation
git push origin main
```

### SSH Deployment
```bash
# Connect to server
ssh grnchserver

# Navigate to project
cd /opt/art/art-catalog

# Pull latest changes
sudo git pull origin main

# Rebuild and restart
sudo docker compose down
sudo docker compose build
sudo docker compose up -d

# View logs
sudo docker compose logs -f

# Check running containers
sudo docker compose ps
```

### Database Operations
```bash
# Connect to database
docker compose exec db psql -U artadmin art_catalog

# Backup database
docker compose exec db pg_dump -U artadmin art_catalog > backup.sql

# Restore database
docker compose exec -T db psql -U artadmin art_catalog < backup.sql

# Run specific migration
docker compose exec db psql -U artadmin art_catalog -f /path/to/migration.sql
```

---

## Troubleshooting Guide

### Common Issues

**Port Conflicts:**
```bash
# Check what's using port 3333
lsof -i :3333
# or on Windows
netstat -ano | findstr :3333

# Stop conflicting service or change port in docker-compose.yml
```

**Database Connection Errors:**
```bash
# Check if PostgreSQL is running
docker compose ps

# Check database logs
docker compose logs db

# Verify connection from backend
docker compose exec backend node -e "const pool = require('./src/db'); pool.query('SELECT 1').then(() => console.log('Connected')).catch(console.error);"
```

**File Upload Issues:**
```bash
# Check upload directory permissions
docker compose exec backend ls -la ./uploads

# Recreate uploads directory
docker compose exec backend mkdir -p ./uploads
docker compose exec backend chmod 755 ./uploads
```

**Build Failures:**
```bash
# Clear Docker cache
docker compose down
docker compose build --no-cache
docker compose up -d

# Check for syntax errors
docker compose exec backend npm run lint
docker compose exec frontend npm run lint
```

---

## Support & Documentation

### Internal Documentation
- `README.md` - Project overview
- `SETUP.md` - Setup instructions
- `claude.md` - Feature planning
- `IMPLEMENTATION-PLAN.md` - Feature roadmap (this document's companion)
- `TECHNICAL-STACK.md` - This document

### External Resources
- React: https://react.dev/
- Vite: https://vite.dev/
- Express: https://expressjs.com/
- PostgreSQL: https://www.postgresql.org/docs/
- Docker: https://docs.docker.com/

### Getting Help
1. Check logs first: `docker compose logs -f`
2. Review error messages carefully
3. Search GitHub issues for similar problems
4. Test in isolation (remove complexity)
5. Ask for help with specific error messages

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2026-02-10 | Initial technical stack documentation |

---

**Document Maintainer**: Primary Developer  
**Last Updated**: February 10, 2026  
**Next Review**: March 10, 2026
