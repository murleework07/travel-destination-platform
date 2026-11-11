#!/usr/bin/env bash
# Step 18: Docker + CI files. Run from travel-platform: bash setup-step18.sh
set -e
cd "$(dirname "$0")"
mkdir -p .github/workflows

############################ .gitignore ############################
cat > .gitignore <<'EOF'
# Dependencies & build output
node_modules/
dist/
coverage/

# Secrets (never commit real .env files; .env.example and .env.test are safe)
.env
.env.local

# User uploads & logs
server/uploads/
*.log
EOF

############################ SERVER image ############################
cat > server/.dockerignore <<'EOF'
node_modules
.env
.env.local
coverage
uploads
tests
vitest.config.js
*.log
EOF

cat > server/Dockerfile <<'EOF'
# ---------- Stage 1: install production dependencies only ----------
FROM node:22-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev

# ---------- Stage 2: small runtime image ----------
FROM node:22-alpine
ENV NODE_ENV=production
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY package.json ./
COPY src ./src
COPY database ./database

# Run as the unprivileged "node" user, not root
RUN mkdir -p uploads && chown -R node:node /app
USER node

EXPOSE 5000

# Docker marks the container unhealthy if the API stops answering
HEALTHCHECK --interval=15s --timeout=5s --start-period=20s --retries=3 \
  CMD wget -qO- http://127.0.0.1:5000/api/v1/health || exit 1

CMD ["node", "src/server.js"]
EOF

############################ CLIENT image ############################
cat > client/.dockerignore <<'EOF'
node_modules
dist
*.log
EOF

cat > client/nginx.conf <<'EOF'
server {
  listen 80;
  root /usr/share/nginx/html;
  index index.html;

  gzip on;
  gzip_types text/css application/javascript application/json image/svg+xml;

  # API + uploaded images -> Express container (same origin = cookies just work)
  location /api/ {
    proxy_pass http://server:5000;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header X-Request-Id $request_id;
    client_max_body_size 30m;
  }

  location /uploads/ {
    proxy_pass http://server:5000;
  }

  # Vite puts a content hash in asset file names -> safe to cache "forever"
  location /assets/ {
    expires 1y;
    add_header Cache-Control "public, immutable";
    try_files $uri =404;
  }

  # SPA fallback: unknown paths (e.g. /explore) serve index.html; React Router handles them
  location / {
    add_header Cache-Control "no-cache";
    try_files $uri /index.html;
  }
}
EOF

cat > client/Dockerfile <<'EOF'
# ---------- Stage 1: build the React app ----------
FROM node:22-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# ---------- Stage 2: serve static files with Nginx ----------
FROM nginx:1.27-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
HEALTHCHECK --interval=30s --timeout=5s CMD wget -qO- http://127.0.0.1/ || exit 1
EOF

############################ docker-compose ############################
cat > docker-compose.yml <<'EOF'
# Development:  docker compose up -d                       -> MySQL + Redis only
# Full stack:   docker compose --profile full up -d --build -> + API + web on http://localhost:8080

services:
  mysql:
    image: mysql:8.4
    container_name: travel_mysql
    restart: unless-stopped
    environment:
      MYSQL_ROOT_PASSWORD: "1234"
      MYSQL_DATABASE: "travel_db"
      MYSQL_USER: "travel_user"
      MYSQL_PASSWORD: "1234"
    ports:
      - "3307:3306"
    volumes:
      - mysql_data:/var/lib/mysql
      # Runs ONLY when the volume is empty (first start on a new machine)
      - ./server/database/schema.sql:/docker-entrypoint-initdb.d/01-schema.sql:ro
      - ./server/database/seed.sql:/docker-entrypoint-initdb.d/02-seed.sql:ro
    healthcheck:
      test: ["CMD", "mysqladmin", "ping", "-h", "localhost"]
      interval: 10s
      timeout: 5s
      retries: 10

  redis:
    image: redis:7.4-alpine
    container_name: travel_redis
    restart: unless-stopped
    command: ["redis-server", "--appendonly", "yes"]
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5

  server:
    build: ./server
    container_name: travel_server
    profiles: ["full"]
    restart: unless-stopped
    env_file: ./server/.env          # JWT secret etc.
    environment:                     # container-specific overrides
      NODE_ENV: "production"
      DB_HOST: "mysql"
      DB_PORT: "3306"
      REDIS_URL: "redis://redis:6379"
      CLIENT_URL: "http://localhost:8080"
    volumes:
      - uploads_data:/app/uploads
    depends_on:
      mysql:
        condition: service_healthy
      redis:
        condition: service_healthy

  client:
    build: ./client
    container_name: travel_client
    profiles: ["full"]
    restart: unless-stopped
    ports:
      - "8080:80"
    depends_on:
      server:
        condition: service_healthy

volumes:
  mysql_data:
  redis_data:
  uploads_data:
EOF

############################ GitHub Actions ############################
cat > .github/workflows/ci.yml <<'EOF'
name: CI

on:
  push:
    branches: [main]
  pull_request:

jobs:
  backend:
    name: Backend tests (MySQL)
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: server
    services:
      mysql:
        image: mysql:8.4
        env:
          MYSQL_ROOT_PASSWORD: "1234"
          MYSQL_DATABASE: travel_test
          MYSQL_USER: travel_user
          MYSQL_PASSWORD: "1234"
        ports:
          - 3307:3306
        options: >-
          --health-cmd="mysqladmin ping -h 127.0.0.1"
          --health-interval=10s
          --health-timeout=5s
          --health-retries=10
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
          cache-dependency-path: server/package-lock.json
      - run: npm ci
      - run: npm run test:coverage
      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: coverage-report
          path: server/coverage

  frontend:
    name: Frontend build
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: client
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
          cache-dependency-path: client/package-lock.json
      - run: npm ci
      - run: npm run build

  docker:
    name: Docker images
    needs: [backend, frontend]
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: docker build -t travel-server ./server
      - run: docker build -t travel-client ./client
EOF

echo "✅ Step 18 files created: Dockerfiles, nginx.conf, docker-compose (full profile), GitHub Actions CI"