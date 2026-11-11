# ==============================================================================
# MULTI-STAGE DOCKERFILE FOR REACT 18 + VITE FRONTEND (NON-ROOT NGINX)
# Stage 1: Build & Bundle SPA
# Stage 2: Serve using unprivileged Nginx on port 8080
# ==============================================================================

# STAGE 1: Builder
FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci

# Copy source files
COPY index.html ./
COPY tsconfig*.json ./
COPY vite.config.ts ./
COPY tailwind.config.js ./
COPY postcss.config.js ./
COPY src/ ./src/

# Build static production bundle into dist/
RUN npm run build

# ==============================================================================
# STAGE 2: Non-Root Nginx Runner (DevSecOps Hardened)
# ==============================================================================
FROM nginxinc/nginx-unprivileged:alpine AS runner

# Copy customized non-root Nginx configuration
COPY --chown=nginx:nginx nginx/nginx.conf /etc/nginx/nginx.conf

# Copy bundled web application from builder stage
COPY --chown=nginx:nginx --from=builder /app/dist /usr/share/nginx/html

# Expose non-privileged port
EXPOSE 8080

# Healthcheck
HEALTHCHECK --interval=10s --timeout=5s --start-period=5s --retries=3 \
  CMD wget -qO- http://127.0.0.1:8080/ || exit 1

# Start Nginx in foreground
CMD ["nginx", "-g", "daemon off;"]
