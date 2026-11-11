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
