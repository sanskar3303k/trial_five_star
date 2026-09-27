# Production Dockerfile for Smart Resort 360
# Node 22+ with native node:sqlite support
FROM node:22-alpine

WORKDIR /app

# Install system dependencies if required
RUN apk add --no-cache python3 make g++

# Copy package files
COPY package*.json ./

# Install all dependencies including devDependencies for frontend build
RUN npm install

# Copy application source code
COPY . .

# Build production React/Vite assets
RUN npm run build

# Remove development dependencies to keep image lean
RUN npm prune --omit=dev

# Expose default port
EXPOSE 5000

ENV PORT=5000
ENV HOST=0.0.0.0
ENV NODE_ENV=production

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://127.0.0.1:5000/api/hotel-info || exit 1

# Start the full-stack server (serves both React dist and Express APIs)
CMD ["node", "server/index.mjs"]
