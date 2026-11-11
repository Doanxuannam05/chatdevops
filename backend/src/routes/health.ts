import { Router, Request, Response } from 'express';
import mongoose from 'mongoose';
import { env } from '../config/env';
import { getRedisClient } from '../socket';

const router = Router();

/**
 * Healthcheck route for Kubernetes Liveness/Readiness probes and Docker HEALTHCHECK
 */
router.get('/', async (req: Request, res: Response) => {
  const mongoStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
  
  let redisStatus = 'disconnected';
  try {
    const redisClient = getRedisClient();
    if (redisClient && redisClient.isOpen) {
      const pingRes = await redisClient.ping();
      if (pingRes === 'PONG') {
        redisStatus = 'connected';
      }
    }
  } catch (err) {
    redisStatus = 'error';
  }

  const isHealthy = mongoStatus === 'connected' && redisStatus === 'connected';
  const statusCode = isHealthy ? 200 : 503;

  const memUsage = process.memoryUsage();

  return res.status(statusCode).json({
    status: isHealthy ? 'healthy' : 'unhealthy',
    podName: env.POD_NAME,
    nodeEnv: env.NODE_ENV,
    uptime: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
    services: {
      mongodb: {
        status: mongoStatus,
      },
      redis: {
        status: redisStatus,
      },
    },
    system: {
      memoryRssMb: Math.round(memUsage.rss / 1024 / 1024),
      memoryHeapUsedMb: Math.round(memUsage.heapUsed / 1024 / 1024),
    },
  });
});

// Lightweight Liveness probe for Kubernetes
router.get('/live', (req: Request, res: Response) => {
  res.status(200).json({ status: 'live', podName: env.POD_NAME });
});

// Readiness probe for Kubernetes
router.get('/ready', async (req: Request, res: Response) => {
  const mongoOk = mongoose.connection.readyState === 1;
  let redisOk = false;
  try {
    const redisClient = getRedisClient();
    redisOk = !!(redisClient && redisClient.isOpen);
  } catch {
    redisOk = false;
  }

  if (mongoOk && redisOk) {
    return res.status(200).json({ status: 'ready', podName: env.POD_NAME });
  }
  return res.status(503).json({ status: 'not_ready', mongo: mongoOk, redis: redisOk, podName: env.POD_NAME });
});

export default router;
