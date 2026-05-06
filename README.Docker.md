# Art Catalog - Docker Deployment Guide

This guide explains how to build and deploy the Art Catalog application using Docker.

## Prerequisites

- Docker installed on your local machine and server
- Docker Compose (optional, but recommended)

## Building the Docker Image

### Option 1: Using Docker Compose (Recommended)

```bash
# Build and start the container
docker-compose up -d

# View logs
docker-compose logs -f

# Stop the container
docker-compose down
```

The application will be available at `http://localhost:3333`

### Option 2: Using Docker directly

```bash
# Build the image
docker build -t art-catalog:latest .

# Run the container
docker run -d -p 3333:80 --name art-catalog art-catalog:latest

# View logs
docker logs -f art-catalog

# Stop the container
docker stop art-catalog
docker rm art-catalog
```

## Transferring to Your Server

### Method 1: Save and Load Docker Image

```bash
# On your local machine - save the image to a file
docker save art-catalog:latest | gzip > art-catalog.tar.gz

# Transfer to your server (using scp, rsync, or any file transfer method)
scp art-catalog.tar.gz user@your-server:/path/to/destination/

# On your server - load the image
gunzip -c art-catalog.tar.gz | docker load

# Run the container on your server
docker run -d -p 80:80 --name art-catalog --restart unless-stopped art-catalog:latest
```

### Method 2: Use Docker Registry (if you have one)

```bash
# Tag the image
docker tag art-catalog:latest your-registry.com/art-catalog:latest

# Push to registry
docker push your-registry.com/art-catalog:latest

# On your server - pull and run
docker pull your-registry.com/art-catalog:latest
docker run -d -p 80:80 --name art-catalog --restart unless-stopped your-registry.com/art-catalog:latest
```

### Method 3: Build Directly on Server

```bash
# Transfer the entire project directory to your server
scp -r art-catalog user@your-server:/path/to/destination/

# SSH into your server
ssh user@your-server

# Navigate to the project directory
cd /path/to/destination/art-catalog

# Build and run using Docker Compose
docker-compose up -d
```

## Port Configuration

By default, the container exposes port 80. You can change the external port mapping:

```bash
# Run on port 8080 instead of 3333
docker run -d -p 8080:80 --name art-catalog art-catalog:latest
```

Or modify the `docker-compose.yml` file:

```yaml
ports:
  - "8080:80"  # Change 8080 to your desired port
```

## Data Persistence

**Important Note:** This application uses IndexedDB for local browser storage. The data is stored in your browser, not on the server. This means:

- Each user/browser will have their own separate catalog
- Clearing browser data will delete the catalog
- The data is not shared between different devices or browsers

If you need persistent, shared data across devices, you would need to implement a backend database server (this is a future enhancement).

## SSL/HTTPS Configuration

To use HTTPS, you can:

1. Use a reverse proxy like Nginx or Caddy in front of the container
2. Use a service like Cloudflare
3. Modify the nginx.conf to include SSL certificates

Example with reverse proxy (Caddy):

```
your-domain.com {
    reverse_proxy localhost:3333
}
```

## Updating the Application

```bash
# Rebuild the image
docker-compose build

# Restart with the new image
docker-compose up -d

# Or if using docker directly
docker build -t art-catalog:latest .
docker stop art-catalog
docker rm art-catalog
docker run -d -p 3333:80 --name art-catalog art-catalog:latest
```

## Troubleshooting

### Container won't start
```bash
# Check logs
docker logs art-catalog

# Check if port is already in use
netstat -tulpn | grep :3333
```

### Application not accessible
```bash
# Check if container is running
docker ps

# Check container health
docker inspect art-catalog
```

### Need to access container shell
```bash
docker exec -it art-catalog sh
```

## Environment Variables

Currently, the application doesn't require any environment variables. All configuration is client-side.

## Resource Limits

To set resource limits:

```yaml
services:
  art-catalog:
    # ... other config
    deploy:
      resources:
        limits:
          cpus: '0.5'
          memory: 512M
        reservations:
          memory: 256M
```

## Security Considerations

1. The application runs on port 80 by default - consider using HTTPS in production
2. All data is stored client-side in the browser
3. No authentication is built-in - consider adding a reverse proxy with auth if needed
4. Keep Docker and the base images updated regularly
