import http from 'http';
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import pinoHttp from 'pino-http';
import mongoose from 'mongoose';
import { env } from './config/env';
import { logger } from './utils/logger';
import { metricsMiddleware } from './utils/metrics';
import healthRouter from './routes/health';
import metricsRouter from './routes/metrics';
import roomsRouter from './routes/rooms';
import simulateErrorRouter from './routes/simulate-error';
import { initializeSocket, getRedisClient } from './socket';
import { seedDefaultRooms } from './models/Room';

export const app = express();

// Security headers with WebSocket allowances
app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
  })
);

// Cross-Origin Resource Sharing
app.use(
  cors({
    origin: env.CORS_ORIGIN === '*' ? true : env.CORS_ORIGIN.split(','),
    credentials: true,
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Automatic Request Logging via Pino (Skip /metrics to keep logs clean)
app.use(
  pinoHttp({
    logger,
    autoLogging: {
      ignore: (req) => req.url === '/metrics' || req.url === '/health/live',
    },
  })
);

// Prometheus metrics collection middleware
app.use(metricsMiddleware);

// API Routing
app.use('/health', healthRouter);
app.use('/metrics', metricsRouter);
app.use('/api/rooms', roomsRouter);
app.use('/api/simulate-error', simulateErrorRouter);

// Service Root Info
app.get('/', (req: Request, res: Response) => {
  res.json({
    service: 'realtime-chat-backend',
    status: 'online',
    podName: env.POD_NAME,
    environment: env.NODE_ENV,
    endpoints: {
      health: '/health',
      metrics: '/metrics',
      rooms: '/api/rooms',
      simulateError: '/api/simulate-error',
    },
  });
});

// Centralized Error Handling Middleware
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  logger.error({ err, url: req.url }, 'Unhandled application error');
  res.status(500).json({ error: 'Internal Server Error' });
});

export const server = http.createServer(app);

/**
 * Bootstrap Application and Connect to Infrastructure
 */
export async function startServer() {
  try {
    // 1. Connect to MongoDB
    logger.info({ uri: env.MONGO_URI }, 'Connecting to MongoDB...');
    await mongoose.connect(env.MONGO_URI, {
      serverSelectionTimeoutMS: 5000,
    });
    logger.info('MongoDB connected successfully');

    // 2. Seed baseline rooms if needed
    await seedDefaultRooms();

    // 3. Initialize Socket.io with Redis Pub/Sub adapter
    await initializeSocket(server);

    // 4. Start HTTP Server
    server.listen(env.PORT, () => {
      logger.info(
        { port: env.PORT, podName: env.POD_NAME, env: env.NODE_ENV },
        `🚀 Server is listening and ready on port ${env.PORT}`
      );
    });
  } catch (err: any) {
    logger.fatal({ err: err.message }, 'Fatal error during server bootstrap');
    // If not in test environment, exit
    if (env.NODE_ENV !== 'test') {
      process.exit(1);
    }
  }
}

// Graceful Shutdown handler (Crucial for Kubernetes Rolling Updates)
async function handleGracefulShutdown(signal: string) {
  logger.info({ signal, podName: env.POD_NAME }, 'Graceful shutdown initiated. Draining connections...');

  server.close(async () => {
    logger.info('HTTP server closed');

    try {
      const redisClient = getRedisClient();
      if (redisClient && redisClient.isOpen) {
        await redisClient.quit();
        logger.info('Redis client disconnected cleanly');
      }

      await mongoose.connection.close();
      logger.info('MongoDB connection closed');

      logger.info('Graceful shutdown completed successfully. Exiting.');
      process.exit(0);
    } catch (err: any) {
      logger.error({ err: err.message }, 'Error during graceful shutdown sequence');
      process.exit(1);
    }
  });

  // Force shutdown after timeout if hanging
  setTimeout(() => {
    logger.error('Graceful shutdown timed out (10s). Forcing process exit.');
    process.exit(1);
  }, 10000);
}

// Register signals
process.on('SIGTERM', () => handleGracefulShutdown('SIGTERM'));
process.on('SIGINT', () => handleGracefulShutdown('SIGINT'));

// Auto-start server unless required as a module in tests
if (process.env.NODE_ENV !== 'test') {
  startServer();
}
