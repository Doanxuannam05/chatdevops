import dotenv from 'dotenv';
import { z } from 'zod';
import os from 'os';

// Load local .env if present
dotenv.config();

const envSchema = z.object({
  PORT: z.string().default('5000').transform((val) => parseInt(val, 10)),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  // Pod name for demonstrating multi-pod distributed setup
  // In K8s, Downward API injects spec.nodeName or metadata.name into POD_NAME
  POD_NAME: z.string().default(() => process.env.POD_NAME || os.hostname() || 'backend-instance'),
  
  // Database configuration
  MONGO_URI: z.string().default('mongodb://127.0.0.1:27017/chat_devops'),

  // Redis configuration for Socket.io Pub/Sub adapter
  REDIS_HOST: z.string().default('127.0.0.1'),
  REDIS_PORT: z.string().default('6379').transform((val) => parseInt(val, 10)),
  REDIS_PASSWORD: z.string().optional().default(''),

  // CORS and Security
  CORS_ORIGIN: z.string().default('*'),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Invalid environment variables configuration:', parsed.error.format());
  process.exit(1);
}

export const env = parsed.data;
export type Config = typeof env;
