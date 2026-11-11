import pino from 'pino';
import { env } from '../config/env';

/**
 * Cloud-Native Structured JSON Logger (Pino)
 * Outputs standard JSON format to stdout, adhering to 12-factor app principles
 * Loki and Promtail can immediately parse tags like 'level', 'service', 'podName'.
 */
export const logger = pino({
  level: env.LOG_LEVEL,
  base: {
    service: 'chat-backend',
    podName: env.POD_NAME,
    env: env.NODE_ENV,
  },
  timestamp: pino.stdTimeFunctions.isoTime,
  formatters: {
    level: (label) => ({ level: label }),
  },
  // In development, pretty printing can be enabled if stdout is a TTY
  transport: env.NODE_ENV === 'development' && process.stdout.isTTY
    ? {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'SYS:standard',
          ignore: 'pid,hostname',
        },
      }
    : undefined,
});
