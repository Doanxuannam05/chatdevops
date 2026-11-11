import { Router, Request, Response } from 'express';
import { logger } from '../utils/logger';

const router = Router();

/**
 * REST Endpoint for SRE/DevOps demonstration and live defense (Vấn đáp).
 * Simulates real-world anomalies to trigger Prometheus alerts, Grafana spikes, and K8s self-healing.
 */
router.get('/', (req: Request, res: Response) => {
  const type = (req.query.type as string) || '500';

  if (type === '500') {
    logger.error({ route: '/api/simulate-error', type: '500' }, 'Simulated internal server error (HTTP 500)');
    return res.status(500).json({
      error: 'Simulated 500 Internal Server Error for Alertmanager testing',
      ruleTriggered: 'High5xxErrorRate',
      timestamp: new Date().toISOString(),
    });
  }

  if (type === 'delay') {
    const delayMs = parseInt(req.query.ms as string, 10) || 1500;
    logger.warn({ route: '/api/simulate-error', type: 'delay', delayMs }, 'Simulating high latency delay');
    return setTimeout(() => {
      res.status(200).json({
        message: `Response delayed by ${delayMs}ms`,
        ruleTriggered: 'HighLatencyP95',
      });
    }, delayMs);
  }

  if (type === 'cpu') {
    const durationMs = parseInt(req.query.duration as string, 10) || 3000;
    logger.warn({ route: '/api/simulate-error', type: 'cpu', durationMs }, 'Simulating high CPU load for HPA demo');
    const endTime = Date.now() + durationMs;
    // Busy-loop to spike CPU utilization
    while (Date.now() < endTime) {
      Math.sqrt(Math.random() * 1000000);
    }
    return res.status(200).json({
      message: `CPU spike simulated for ${durationMs}ms`,
      ruleTriggered: 'HPA_Autoscale',
    });
  }

  if (type === 'crash') {
    logger.fatal({ route: '/api/simulate-error', type: 'crash' }, 'Intentionally terminating backend process to verify K8s Pod Restart / Self-healing');
    res.status(500).json({ message: 'Crashing backend process now...' });
    setTimeout(() => {
      process.exit(1);
    }, 500);
    return;
  }

  return res.status(400).json({
    error: 'Invalid error simulation type. Allowed: 500, delay, cpu, crash',
  });
});

export default router;
