#!/bin/bash
# Production Deployment Script for Art Catalog

echo "===================================="
echo "Art Catalog - PRODUCTION Deployment"
echo "===================================="

cd /opt/art/art-catalog || exit 1

echo "Pulling latest changes from git..."
sudo git pull origin main

echo "Stopping production containers..."
sudo docker compose down

echo "Building production containers..."
sudo docker compose build --no-cache

echo "Starting production containers..."
sudo docker compose up -d

echo "Waiting for database to be ready..."
sleep 10

echo "Running database migrations..."
for migration in \
  /app/src/migrations/002_add_tags.sql \
  /app/src/migrations/003_add_provenance_tracking.sql \
  /app/src/migrations/004_add_publications.sql \
  /app/src/migrations/add-series-table.sql \
  /app/src/migrations/add-is-public-column.sql \
  /app/src/migrations/005_add_artist_statements.sql; do
  echo "  Applying $migration..."
  sudo docker compose exec -T backend cat "$migration" | sudo docker compose exec -T db psql -U artcatalog -d artcatalog || echo "  (may already be applied, continuing)"
done

echo ""
echo "Production containers status:"
sudo docker compose ps

echo ""
echo "Recent logs:"
sudo docker compose logs --tail=20

echo ""
echo "===================================="
echo "Production Deployment Complete!"
echo "===================================="
echo "Production Frontend: http://grnchserver:3333"
echo ""
echo "To view logs:"
echo "  sudo docker compose logs -f"
echo ""
echo "To stop production:"
echo "  sudo docker compose down"
echo "===================================="
