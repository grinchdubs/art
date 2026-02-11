# Art Catalog - Development Environment

## Overview
The development environment runs alongside production without interfering with it.

### Port Mappings

**Production Environment:**
- Frontend: http://grnchserver:3333
- Backend: http://grnchserver:3002 
- Database: localhost:5432

**Development Environment:**
- Frontend: http://grnchserver:3334 (nginx)
- Backend: http://grnchserver:3003 (Express API)
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
   ssh grnchserver
   cd /opt/art/art-catalog
   chmod +x deploy-dev.sh
   ./deploy-dev.sh
   ```

### From Server Directly

```bash
ssh grnchserver
cd /opt/art/art-catalog
sudo git pull origin main
sudo docker compose -f docker-compose.dev.yml down
sudo docker compose -f docker-compose.dev.yml build
sudo docker compose -f docker-compose.dev.yml up -d
```

## Running Database Migrations

### Manual Migration
```bash
# SSH to server
ssh grnchserver

# Run migration
sudo docker compose -f docker-compose.dev.yml exec db-dev psql -U artcatalog -d artcatalog_dev -f /app/backend/src/migrations/003_add_provenance_tracking.sql
```

### Or execute SQL directly
```bash
sudo docker compose -f docker-compose.dev.yml exec db-dev psql -U artcatalog -d artcatalog_dev

# Inside psql, paste the migration SQL
```

## Testing the Dev Environment

### Check API Health
```bash
curl http://grnchserver:3003/api/health
```

### Test Provenance Endpoints
```bash
# Get ownership history for artwork ID 1
curl http://grnchserver:3003/api/provenance/artwork/1/history

# Get all transfers
curl http://grnchserver:3003/api/provenance/all
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
   
   # Run migrations on production
   sudo docker compose exec db psql -U artcatalog artcatalog -f /app/backend/src/migrations/003_add_provenance_tracking.sql
   ```

4. **Verify production**
   - Check http://grnchserver:3333
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
