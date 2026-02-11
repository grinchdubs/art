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
echo "Running database migration..."
sudo docker compose -f docker-compose.dev.yml exec -T db-dev psql -U artcatalog -d artcatalog_dev -f /docker-entrypoint-initdb.d/../../../backend/src/migrations/003_add_provenance_tracking.sql || echo "Migration may have already been applied"

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
