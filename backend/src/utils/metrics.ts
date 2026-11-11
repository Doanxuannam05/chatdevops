import client from 'prom-client';
import { Request, Response, NextFunction } from 'express';
import { env } from '../config/env';

// Create a dedicated Prometheus Registry
export const register = new client.Registry();

// Add default system metrics (CPU, Memory, Event Loop Lag, GC, File Descriptors)
client.collectDefaultMetrics({
  register,
  prefix: 'chat_system_',
  labels: { pod_name: env.POD_NAME, service: 'chat-backend' },
});

// Custom HTTP Metrics
export const httpRequestCounter = new client.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests processed by this pod',
  labelNames: ['method', 'route', 'status_code', 'pod_name'],
  registers: [register],
});

export const httpRequestDuration = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Histogram of HTTP request latency in seconds',
  labelNames: ['method', 'route', 'status_code', 'pod_name'],
  buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5],
  registers: [register],
});

// Custom WebSocket Metrics
export const wsActiveConnections = new client.Gauge({
  name: 'ws_active_connections',
  help: 'Number of active WebSocket connections currently hosted on this pod',
  labelNames: ['pod_name'],
  registers: [register],
});

export const wsMessagesCounter = new client.Counter({
  name: 'ws_messages_total',
  help: 'Total number of chat messages processed via WebSocket',
  labelNames: ['room', 'sender_pod'],
  registers: [register],
});

export const wsErrorsCounter = new client.Counter({
  name: 'ws_errors_total',
  help: 'Total count of WebSocket errors occurred on this pod',
  labelNames: ['pod_name', 'error_type'],
  registers: [register],
});

// Express Middleware for automatic HTTP request metric tracking
export const metricsMiddleware = (req: Request, res: Response, next: NextFunction) => {
  // Skip recording metric scrape itself to avoid pollution
  if (req.path === '/metrics') {
    return next();
  }

  const start = process.hrtime();

  res.on('finish', () => {
    const [seconds, nanoseconds] = process.hrtime(start);
    const duration = seconds + nanoseconds / 1e9;
    const route = req.route ? req.baseUrl + req.route.path : req.path;
    const statusCode = res.statusCode.toString();

    httpRequestCounter.inc({
      method: req.method,
      route,
      status_code: statusCode,
      pod_name: env.POD_NAME,
    });

    httpRequestDuration.observe(
      {
        method: req.method,
        route,
        status_code: statusCode,
        pod_name: env.POD_NAME,
      },
      duration
    );
  });

  next();
};
