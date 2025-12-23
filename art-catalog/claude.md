# Art Catalog Enhancement Plan

## TODO List

### Phase 1 - Quick Wins
- [ ] Sort options (date, price, title, recent)
- [ ] Image zoom/lightbox modal
- [ ] Tags/Categories system
- [ ] Keyboard shortcuts (ESC, arrow keys)

### Phase 2 - Core Features
- [ ] Bulk operations (batch edit status, prices)
- [ ] Series/Collections grouping
- [ ] Public gallery view (read-only portfolio)
- [ ] Advanced search filters (date ranges, price ranges)

### Phase 3 - Advanced Features
- [ ] Dashboard charts and analytics
- [ ] Sales tracking system
- [ ] QR code generation for exhibitions
- [ ] Database backup/restore functionality
- [ ] Print edition tracking
- [ ] Provenance/history tracking
- [ ] Mobile responsive optimization
- [ ] Dark mode toggle
- [ ] Loading skeleton states

## Technical Stack

### Frontend (Already in Use)
- **React 19.2.0** - UI framework
- **React Router** - Navigation
- **Vite 7.2.4** - Build tool
- **CSS3** - Styling (App.css)

### Backend (Already in Use)
- **Node.js 20** - Runtime
- **Express 4.18.2** - API framework
- **PostgreSQL 15** - Database
- **pg 8.11.3** - PostgreSQL client
- **multer 2.0.0-rc.4** - File uploads

### Infrastructure (Already in Use)
- **Docker & Docker Compose** - Containerization
- **nginx** - Reverse proxy
- **Git/GitHub** - Version control

### New Dependencies Needed

#### For Image Lightbox
- `react-image-lightbox` or custom modal with CSS

#### For Charts/Analytics (Phase 3)
- `recharts` or `chart.js` + `react-chartjs-2`

#### For QR Codes (Phase 3)
- `qrcode` (backend) or `qrcode.react` (frontend)

#### For Backup/Restore (Phase 3)
- `pg_dump` and `pg_restore` (already available in postgres container)
- `archiver` (for zip creation)

## Implementation Plan

### Phase 1: Quick Wins

#### 1. Sort Options
**Files to modify:**
- `src/pages/ArtworkList.jsx`
- `src/pages/DigitalWorkList.jsx`

**Steps:**
1. Add sort state: `const [sortBy, setSortBy] = useState('date-desc')`
2. Add dropdown UI above the grid
3. Update `filteredWorks` useMemo to sort based on selection
4. Sort options: date (newest/oldest), price (high/low), title (A-Z/Z-A)

**Backend:** No changes needed, sorting done client-side

---

#### 2. Image Zoom/Lightbox
**Files to modify:**
- `src/pages/ArtworkDetail.jsx`
- `src/pages/DigitalWorkDetail.jsx`
- `src/pages/Gallery.jsx`
- `src/App.css`

**Steps:**
1. Create `src/components/ImageLightbox.jsx` component
2. Add state for lightbox: `const [lightboxOpen, setLightboxOpen] = useState(false)`
3. Add click handlers to images
4. Create modal with:
   - Dark overlay
   - Full-screen image
   - Next/Previous buttons for multiple images
   - ESC to close
   - Click outside to close

**Backend:** No changes needed

---

#### 3. Tags/Categories System
**Database changes:**
```sql
-- Create tags table
CREATE TABLE tags (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) UNIQUE NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create artwork_tags junction table
CREATE TABLE artwork_tags (
  artwork_id INTEGER REFERENCES artworks(id) ON DELETE CASCADE,
  tag_id INTEGER REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (artwork_id, tag_id)
);

-- Create digital_work_tags junction table
CREATE TABLE digital_work_tags (
  digital_work_id INTEGER REFERENCES digital_works(id) ON DELETE CASCADE,
  tag_id INTEGER REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (digital_work_id, tag_id)
);
```

**Backend files to create/modify:**
- `backend/src/routes/tags.js` - CRUD for tags
- `backend/src/routes/artworks.js` - Include tags in GET queries
- `backend/src/routes/digitalWorks.js` - Include tags in GET queries

**Frontend files to modify:**
- `src/utils/api.js` - Add tagAPI
- `src/pages/ArtworkForm.jsx` - Add tag selector
- `src/pages/DigitalWorkForm.jsx` - Add tag selector
- `src/pages/ArtworkList.jsx` - Add tag filter
- `src/pages/DigitalWorkList.jsx` - Add tag filter

**Steps:**
1. Run database migrations
2. Create backend tag routes
3. Create tag selector component (autocomplete/dropdown)
4. Add tag display in list and detail views
5. Add tag filtering

---

#### 4. Keyboard Shortcuts
**Files to modify:**
- `src/pages/ArtworkDetail.jsx`
- `src/pages/DigitalWorkDetail.jsx`
- Any component with modals

**Steps:**
1. Add `useEffect` with event listener for keydown
2. Implement shortcuts:
   - ESC: Close modals, go back
   - Left/Right arrows: Navigate between works in detail view
   - Ctrl/Cmd + K: Focus search
3. Add shortcuts help tooltip/modal (press `?` to show)

**Backend:** No changes needed

---

### Phase 2: Core Features

#### 5. Bulk Operations
**Files to modify:**
- `src/pages/ArtworkList.jsx`
- `src/pages/DigitalWorkList.jsx`
- `backend/src/routes/artworks.js`
- `backend/src/routes/digitalWorks.js`

**Steps:**
1. Checkboxes already exist - add bulk action bar
2. Add bulk edit modal with fields: sale_status, price adjustment
3. Create backend PATCH `/api/artworks/bulk` endpoint
4. Handle array of IDs and update fields
5. Add confirmation before bulk operations

---

#### 6. Series/Collections
**Database changes:**
```sql
CREATE TABLE series (
  id SERIAL PRIMARY KEY,
  name VARCHAR(200) NOT NULL,
  description TEXT,
  start_date DATE,
  end_date DATE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE artworks ADD COLUMN series_id INTEGER REFERENCES series(id);
ALTER TABLE digital_works ADD COLUMN series_id INTEGER REFERENCES series(id);
```

**Backend files to create/modify:**
- `backend/src/routes/series.js`
- Update artwork and digital work routes to include series

**Frontend files to create/modify:**
- `src/pages/SeriesList.jsx`
- `src/pages/SeriesForm.jsx`
- `src/pages/SeriesDetail.jsx`
- Update form pages to include series selector
- Add series filter to list pages

---

#### 7. Public Gallery View
**Files to create:**
- `src/pages/PublicGallery.jsx`
- `src/pages/PublicArtworkDetail.jsx`
- `backend/src/routes/public.js`

**Steps:**
1. Create read-only public routes (no authentication)
2. Create clean, minimal gallery UI
3. Add share button to admin panel
4. Optional: Add public/private toggle to artworks
5. Create separate public CSS theme

---

#### 8. Advanced Search Filters
**Files to modify:**
- `src/pages/ArtworkList.jsx`
- `src/pages/DigitalWorkList.jsx`

**Steps:**
1. Add filter panel with:
   - Date range picker
   - Price range slider
   - Multiple status selection
   - Tag selection (from Phase 1)
2. Combine filters with AND logic
3. Add "Clear filters" button
4. Show active filter count

---

### Phase 3: Advanced Features

#### 9. Dashboard Charts
**Install:** `npm install recharts`

**Files to modify:**
- `src/pages/Dashboard.jsx`

**Charts to add:**
1. Works created over time (line chart)
2. Works by medium (pie chart)
3. Sales by month (bar chart)
4. Status distribution (donut chart)
5. Price ranges (histogram)

---

#### 10. Sales Tracking
**Database changes:**
```sql
CREATE TABLE sales (
  id SERIAL PRIMARY KEY,
  artwork_id INTEGER REFERENCES artworks(id),
  digital_work_id INTEGER REFERENCES digital_works(id),
  sale_date DATE NOT NULL,
  sale_price DECIMAL(10,2),
  buyer_name VARCHAR(255),
  buyer_email VARCHAR(255),
  platform VARCHAR(100),
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**Files to create:**
- `backend/src/routes/sales.js`
- `src/pages/SalesList.jsx`
- `src/components/SaleForm.jsx`

**Features:**
- Record sale from artwork detail page
- View sales history
- Export sales report
- Calculate total revenue

---

#### 11. QR Code Generation
**Install:** `npm install qrcode`

**Backend files to modify:**
- `backend/src/routes/artworks.js` - Add `/api/artworks/:id/qrcode` endpoint
- `backend/src/routes/digitalWorks.js` - Add `/api/digital-works/:id/qrcode` endpoint

**Steps:**
1. Generate QR code linking to detail page
2. Return as PNG or SVG
3. Add download button in detail view
4. Optional: Bulk generate for exhibitions

---

#### 12. Backup/Restore
**Backend files to create:**
- `backend/src/routes/backup.js`

**Steps:**
1. Use `pg_dump` to create SQL backup
2. Compress with `archiver`
3. Stream download to user
4. Create restore endpoint (upload SQL file)
5. Add safety checks and confirmations

---

## Development Workflow

### For each feature:

1. **Create feature branch**
   ```bash
   git checkout -b feature/sort-options
   ```

2. **Database changes (if needed)**
   - Create migration SQL file
   - Test locally first
   - Run on server via docker exec

3. **Backend development**
   - Create/modify routes
   - Test with curl or Postman
   - Update API documentation

4. **Frontend development**
   - Create/modify components
   - Test locally
   - Check responsive design

5. **Commit and deploy**
   ```bash
   git add -A
   git commit -m "Add sort options to artwork list"
   git push origin feature/sort-options
   git checkout main
   git merge feature/sort-options
   git push origin main
   
   # Deploy to server
   wsl ssh -t grnchserver "cd /opt/art && sudo git pull origin main && cd art-catalog && sudo docker compose down && sudo docker compose build && sudo docker compose up -d"
   ```

6. **Test on production**
   - Verify functionality
   - Check for errors in docker logs

---

## Notes

- Always test database migrations on local first
- Keep feature branches small and focused
- Test on mobile/tablet for each feature
- Consider performance impact (especially for charts/analytics)
- Document any new environment variables or configuration
- Update README.md as features are added

---

## Current Stack Status

✅ **Working:**
- PostgreSQL database with artworks, digital_works, exhibitions
- Gallery image management
- CSV import/export
- Video URL imports (Vimeo/YouTube)
- NFT metadata matching
- Docker deployment
- Nginx reverse proxy

🔧 **Next to implement:** Phase 1 features starting with sort options
