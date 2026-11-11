import { Router, Request, Response } from 'express';
import { register } from '../utils/metrics';

const router = Router();

/**
 * Endpoint for Prometheus scraper to collect application and system metrics
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    res.setHeader('Content-Type', register.contentType);
    const metrics = await register.metrics();
    res.send(metrics);
  } catch (err) {
    res.status(500).send('Error generating metrics');
  }
});

export default router;
