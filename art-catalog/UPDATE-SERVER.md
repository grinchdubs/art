# Update Server Deployment

Follow these steps to update the art catalog on your server:

## Option 1: Quick Update (if Docker is already running)

```bash
# SSH into your server
cd /path/to/art-catalog

# Pull latest changes from GitHub
git pull origin main

# Rebuild and restart Docker container
docker-compose down
docker-compose build --no-cache
docker-compose up -d

# Check if it's running
docker-compose ps
docker-compose logs -f art-catalog
```

## Option 2: Step-by-Step Update

```bash
# 1. SSH into your server
ssh user@your-server

# 2. Navigate to project directory
cd /path/to/art-catalog

# 3. Pull latest changes
git pull origin main

# 4. Stop current container
docker-compose down

# 5. Rebuild the Docker image (--no-cache ensures fresh build)
docker-compose build --no-cache

# 6. Start the container
docker-compose up -d

# 7. Verify it's running
docker-compose ps

# 8. Check logs (optional)
docker-compose logs -f art-catalog
# Press Ctrl+C to exit logs
```

## Troubleshooting

If the container won't start:

```bash
# Check detailed logs
docker-compose logs art-catalog

# Check if port 3333 is in use
netstat -tulpn | grep 3333

# Remove old containers and images
docker-compose down --rmi all
docker-compose build --no-cache
docker-compose up -d
```

## Quick Reference

- **Stop container**: `docker-compose down`
- **Start container**: `docker-compose up -d`
- **View logs**: `docker-compose logs -f art-catalog`
- **Check status**: `docker-compose ps`
- **Rebuild**: `docker-compose build --no-cache`

## Access

After updating, the app will be available at:
- http://your-server-ip:3333
- Or whatever domain/port you configured
