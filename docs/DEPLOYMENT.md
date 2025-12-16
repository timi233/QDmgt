# Deployment Guide - Channel Management System

## System Requirements

### Hardware (Minimum)
- CPU: 2 cores
- RAM: 4GB
- Storage: 20GB SSD
- Network: 10Mbps

### Software
- Docker 20.10+
- Docker Compose 2.0+
- Git

## Quick Start

### 1. Clone and Configure

```bash
# Clone repository
git clone <repository-url>
cd channel-management

# Copy environment template
cp .env.example .env.production

# Edit production environment
vi .env.production
```

### 2. Configure Environment Variables

Edit `.env.production`:

```bash
# Database (MUST change in production)
POSTGRES_USER=channel_admin
POSTGRES_PASSWORD=<strong-password-here>
POSTGRES_DB=channel_db

# Redis (MUST change in production)
REDIS_PASSWORD=<strong-password-here>

# JWT Secrets (MUST change in production)
JWT_SECRET=<random-64-char-string>
JWT_REFRESH_SECRET=<different-random-64-char-string>

# Application
NODE_ENV=production
CORS_ORIGIN=https://your-domain.com
```

Generate secure secrets:
```bash
openssl rand -hex 32  # For JWT_SECRET
openssl rand -hex 32  # For JWT_REFRESH_SECRET
```

### 3. Create Data Directories

```bash
mkdir -p data/postgres data/redis backups
chmod 700 data/postgres data/redis
```

### 4. Build and Deploy

```bash
# Build production images
docker-compose -f docker-compose.prod.yml build

# Start services
docker-compose -f docker-compose.prod.yml up -d

# Check status
docker-compose -f docker-compose.prod.yml ps

# View logs
docker-compose -f docker-compose.prod.yml logs -f
```

### 5. Initialize Database

```bash
# Run database migrations
docker exec channel-backend npx prisma migrate deploy

# (Optional) Seed initial data
docker exec channel-backend npx prisma db seed
```

### 6. Verify Deployment

```bash
# Check all containers are running
docker-compose -f docker-compose.prod.yml ps

# Test API health
curl http://localhost:4000/api/v1/health

# Test frontend
curl http://localhost:80
```

## Maintenance

### Backup

```bash
# Manual backup
./scripts/backup.sh manual

# Set up daily cron job
crontab -e
# Add: 0 2 * * * /path/to/project/scripts/backup.sh daily
```

### Restore

```bash
# List available backups
./scripts/restore.sh

# Restore specific backup
./scripts/restore.sh ./backups/daily/channel_db_20241122_020000.sql.gz
```

### Update Application

```bash
# Pull latest code
git pull origin main

# Rebuild and restart
docker-compose -f docker-compose.prod.yml build
docker-compose -f docker-compose.prod.yml up -d

# Run migrations
docker exec channel-backend npx prisma migrate deploy
```

### View Logs

```bash
# All services
docker-compose -f docker-compose.prod.yml logs -f

# Specific service
docker-compose -f docker-compose.prod.yml logs -f backend

# Last 100 lines
docker-compose -f docker-compose.prod.yml logs --tail=100 backend
```

### Restart Services

```bash
# Restart all
docker-compose -f docker-compose.prod.yml restart

# Restart specific service
docker-compose -f docker-compose.prod.yml restart backend
```

## Monitoring

### Check Service Health

```bash
# Container status
docker-compose -f docker-compose.prod.yml ps

# Resource usage
docker stats

# Disk usage
docker system df
```

### Database Connection

```bash
# Connect to PostgreSQL
docker exec -it channel-postgres psql -U ${POSTGRES_USER} -d ${POSTGRES_DB}

# Connect to Redis
docker exec -it channel-redis redis-cli -a ${REDIS_PASSWORD}
```

## Troubleshooting

### Container Won't Start

```bash
# Check logs
docker-compose -f docker-compose.prod.yml logs <service-name>

# Check container details
docker inspect channel-<service-name>
```

### Database Connection Failed

1. Check PostgreSQL is healthy: `docker-compose -f docker-compose.prod.yml ps postgres`
2. Verify DATABASE_URL in backend environment
3. Check network connectivity: `docker network inspect channel-network-prod`

### Redis Connection Failed

1. Check Redis is healthy: `docker-compose -f docker-compose.prod.yml ps redis`
2. Verify REDIS_PASSWORD matches between services
3. Test connection: `docker exec channel-redis redis-cli -a ${REDIS_PASSWORD} ping`

### Performance Issues

1. Check resource usage: `docker stats`
2. Review slow queries in PostgreSQL logs
3. Check Redis memory usage: `docker exec channel-redis redis-cli -a ${REDIS_PASSWORD} INFO memory`

## Security Checklist

- [ ] Change all default passwords in .env.production
- [ ] Generate new JWT secrets
- [ ] Configure firewall (only expose ports 80/443)
- [ ] Set up SSL/TLS certificates
- [ ] Enable database backups
- [ ] Review CORS_ORIGIN setting
- [ ] Remove development files from production

## Contact

For deployment issues, contact the development team.
