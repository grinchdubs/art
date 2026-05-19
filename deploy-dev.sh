#!/bin/bash
# Development Deployment Script for Art Catalog
# This script deploys a development version without affecting production

echo "===================================="
echo "Art Catalog - DEV Deployment"
echo "===================================="

# Navigate to project directory
cd /opt/art/art-catalog || exit 1

# Pull latest changes
echo "Pulling latest changes from git..."
sudo git pull origin main

# Stop dev containers if running
echo "Stopping dev containers..."
sudo docker compose -f docker-compose.dev.yml down

# Build dev containers
echo "Building dev containers..."
sudo docker compose -f docker-compose.dev.yml build --no-cache

# Start dev containers
echo "Starting dev containers..."
sudo docker compose -f docker-compose.dev.yml up -d

# Wait for database to be ready
echo "Waiting for dev database to be ready..."
sleep 10

# Run database migrations
echo "Running database migrations..."
for migration in \
  /app/src/migrations/001_add_sales.sql \
  /app/src/migrations/002_add_tags.sql \
  /app/src/migrations/003_add_provenance_tracking.sql \
  /app/src/migrations/004_add_publications.sql \
  /app/src/migrations/add-series-table.sql \
  /app/src/migrations/add-is-public-column.sql \
  /app/src/migrations/005_add_artist_statements.sql \
  /app/src/migrations/006_add_print_editions.sql \
  /app/src/migrations/007_drop_sales_edition_number.sql; do
  echo "  Applying $migration..."
  sudo docker compose -f docker-compose.dev.yml exec -T backend-dev cat "$migration" | sudo docker compose -f docker-compose.dev.yml exec -T db-dev psql -U artcatalog -d artcatalog_dev || echo "  (may already be applied, continuing)"
done

# Show container status
echo ""
echo "Dev containers status:"
sudo docker compose -f docker-compose.dev.yml ps

# Show logs
echo ""
echo "Recent logs:"
sudo docker compose -f docker-compose.dev.yml logs --tail=20

echo ""
echo "===================================="
echo "Dev Deployment Complete!"
echo "===================================="
echo "Dev Frontend: http://grnchserver:3334"
echo "Dev Backend API: http://grnchserver:3003"
echo "Dev Database: localhost:5433"
echo ""
echo "Production is still running on:"
echo "Production Frontend: http://grnchserver:3333"
echo ""
echo "To view dev logs:"
echo "  sudo docker compose -f docker-compose.dev.yml logs -f"
echo ""
echo "To stop dev environment:"
echo "  sudo docker compose -f docker-compose.dev.yml down"
echo "===================================="
