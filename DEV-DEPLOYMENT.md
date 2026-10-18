# Art Catalog - Development Environment

## Overview
The development environment runs alongside production without interfering with it.

### Port Mappings

**Production Environment:**
- Frontend: http://grnchai:3333
- Backend: http://grnchai:3002 
- Database: localhost:5432

**Development Environment:**
- Frontend: http://grnchai:3334 (nginx)
- Backend: http://grnchai:3003 (Express API)
- Database: localhost:5433 (PostgreSQL)

## Deployment Instructions

### From Local Machine

1. **Commit and push changes:**
   ```bash
   cd art-catalog
   git add -A
   git commit -m "Your commit message"
   git push origin main
   ```

2. **SSH to server and run deployment:**
   ```bash
   ssh grnchai
   cd /opt/art/art-catalog
   chmod +x deploy-dev.sh
   ./deploy-dev.sh
   ```

### From Server Directly

```bash
ssh grnchai
cd /opt/art/art-catalog
sudo git pull origin main
sudo docker compose -f docker-compose.dev.yml down
sudo docker compose -f docker-compose.dev.yml build
sudo docker compose -f docker-compose.dev.yml up -d
```

## Running Database Migrations

Migrations are idempotent and tracked in a `schema_migrations` table. The runner is
`backend/src/migrate.js`. Deploys run it automatically; run it manually with:

```bash
# Dev
sudo docker compose -f docker-compose.dev.yml exec -T backend-dev node src/migrate.js

# Production
sudo docker compose exec -T backend node src/migrate.js
```

The runner:
- creates `schema_migrations` if missing,
- applies only *pending* migrations (in a transaction, recording each one),
- exits non-zero on failure instead of silently skipping.

### Adding a migration

1. Add a `.sql` file to `backend/src/migrations/`.
2. Append its filename to the `MIGRATIONS` array in `backend/src/migrate.js` (order matters).

### Adopting an existing (already-migrated) database

If a database was migrated before the runner existed, baseline it once — this records the
manifest as applied **without** running the SQL:

```bash
sudo docker compose exec -T backend node src/migrate.js --baseline
```

Only baseline a database you have verified is already up to date.

## Testing the Dev Environment

### Check API Health
```bash
curl http://grnchai:3003/api/health
```

### Test Provenance Endpoints
```bash
# Get ownership history for artwork ID 1
curl http://grnchai:3003/api/provenance/artwork/1/history

# Get all transfers
curl http://grnchai:3003/api/provenance/all
```

### View Logs
```bash
# All services
sudo docker compose -f docker-compose.dev.yml logs -f

# Just backend
sudo docker compose -f docker-compose.dev.yml logs -f backend-dev

# Just database
sudo docker compose -f docker-compose.dev.yml logs -f db-dev
```

## Container Management

### Start/Stop
```bash
# Start dev environment
sudo docker compose -f docker-compose.dev.yml up -d

# Stop dev environment
sudo docker compose -f docker-compose.dev.yml down

# Restart a specific service
sudo docker compose -f docker-compose.dev.yml restart backend-dev
```

### Check Status
```bash
sudo docker compose -f docker-compose.dev.yml ps
```

### Execute Commands
```bash
# Access dev database
sudo docker compose -f docker-compose.dev.yml exec db-dev psql -U artcatalog artcatalog_dev

# Access backend container
sudo docker compose -f docker-compose.dev.yml exec backend-dev sh

# View backend logs
sudo docker compose -f docker-compose.dev.yml logs backend-dev
```

## Database Management

### Backup Dev Database
```bash
sudo docker compose -f docker-compose.dev.yml exec db-dev pg_dump -U artcatalog artcatalog_dev > dev_backup_$(date +%Y%m%d).sql
```

### Copy Production Data to Dev
```bash
# Backup production
sudo docker compose exec db pg_dump -U artcatalog artcatalog > prod_backup.sql

# Restore to dev
sudo docker compose -f docker-compose.dev.yml exec -T db-dev psql -U artcatalog artcatalog_dev < prod_backup.sql
```

### Reset Dev Database
```bash
sudo docker compose -f docker-compose.dev.yml down -v
sudo docker compose -f docker-compose.dev.yml up -d
```

## Troubleshooting

### Port Already in Use
If ports 3334 or 3003 are already in use, edit `docker-compose.dev.yml` and change the port mappings.

### Database Connection Issues
```bash
# Check if database is running
sudo docker compose -f docker-compose.dev.yml ps db-dev

# Check database logs
sudo docker compose -f docker-compose.dev.yml logs db-dev

# Test connection
sudo docker compose -f docker-compose.dev.yml exec db-dev pg_isready -U artcatalog
```

### Backend Not Starting
```bash
# Check backend logs
sudo docker compose -f docker-compose.dev.yml logs backend-dev

# Rebuild backend
sudo docker compose -f docker-compose.dev.yml build --no-cache backend-dev
sudo docker compose -f docker-compose.dev.yml up -d backend-dev
```

## Switching Between Environments

Both environments are completely isolated:
- Separate databases (artcatalog vs artcatalog_dev)
- Separate containers
- Separate ports
- Separate data volumes

You can safely work on dev while production continues running.

## When to Promote Dev to Production

After testing in dev:

1. **Verify everything works**
   - Test all new features
   - Check database migrations
   - Verify API endpoints
   - Test frontend components

2. **Stop dev environment**
   ```bash
   sudo docker compose -f docker-compose.dev.yml down
   ```

3. **Deploy to production**
   ```bash
   sudo docker compose down
   sudo docker compose build
   sudo docker compose up -d

   # Run migrations on production (idempotent)
   sudo docker compose exec -T backend node src/migrate.js
   ```

4. **Verify production**
   - Check http://grnchai:3333
   - Test critical features
   - Monitor logs for errors

## Current Development Status

### Phase 1: Enhanced Provenance Tracking
- ✅ Database migration created
- ✅ Backend routes created
- ✅ Artworks/Digital Works routes updated
- ⏳ Frontend components pending
- ⏳ Testing pending

### Next Steps
1. Deploy to dev environment
2. Test database migration
3. Test API endpoints
4. Create frontend components
5. Full integration testing
6. Deploy to production
