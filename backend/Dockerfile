# ==============================================================================
# MULTI-STAGE DOCKERFILE FOR NODE.JS WEBSOCKET & REST API BACKEND
# Stage 1: Build & Compile TypeScript
# Stage 2: Minimal Distroless / Alpine Non-Root Production Runner
# ==============================================================================

# STAGE 1: Builder
FROM node:20-alpine AS builder

WORKDIR /usr/src/app

# Install build dependencies
COPY package*.json tsconfig*.json ./
RUN npm ci

# Copy source code and tests
COPY src/ ./src/
COPY tests/ ./tests/
COPY jest.config.js ./

# Compile TypeScript into JavaScript (dist/)
RUN npm run build

# Remove development dependencies
RUN npm prune --production

# ==============================================================================
# STAGE 2: Production Runner (Non-Root User for DevSecOps compliance)
# ==============================================================================
FROM node:20-alpine AS runner

WORKDIR /usr/src/app

# Install dumb-init for proper signal handling (PID 1) and wget for healthchecks
RUN apk add --no-cache dumb-init wget

# Create non-root user and group with UID/GID 10001
RUN addgroup -g 10001 -S nodejs && \
    adduser -u 10001 -S nodejs -G nodejs

# Set environment
ENV NODE_ENV=production \
    PORT=5000

# Copy production dependencies and compiled artifacts from builder
COPY --chown=nodejs:nodejs --from=builder /usr/src/app/package*.json ./
COPY --chown=nodejs:nodejs --from=builder /usr/src/app/node_modules ./node_modules
COPY --chown=nodejs:nodejs --from=builder /usr/src/app/dist ./dist

# Security: Switch to unprivileged non-root user
USER nodejs

# Document listening port
EXPOSE 5000

# Container Healthcheck (Docker & Swarm compatible)
HEALTHCHECK --interval=10s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:5000/health/live || exit 1

# Execute with dumb-init for proper SIGTERM forwarding
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/server.js"]
