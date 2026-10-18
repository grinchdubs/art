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
if ! sudo docker compose exec -T backend node src/migrate.js; then
  echo "❌ Database migration failed. Aborting deployment."
  exit 1
fi

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
echo "Production Frontend: http://grnchai:3333"
echo ""
echo "To view logs:"
echo "  sudo docker compose logs -f"
echo ""
echo "To stop production:"
echo "  sudo docker compose down"
echo "===================================="
