import { env } from '../../src/config/env';

describe('Environment Configuration Unit Tests', () => {
  it('should parse PORT as a number', () => {
    expect(typeof env.PORT).toBe('number');
    expect(env.PORT).toBeGreaterThan(0);
  });

  it('should have a defined POD_NAME', () => {
    expect(typeof env.POD_NAME).toBe('string');
    expect(env.POD_NAME.length).toBeGreaterThan(0);
  });

  it('should have default MongoDB and Redis configurations', () => {
    expect(env.MONGO_URI).toBeDefined();
    expect(env.REDIS_HOST).toBeDefined();
    expect(typeof env.REDIS_PORT).toBe('number');
  });

  it('should contain a valid NODE_ENV value', () => {
    expect(['development', 'production', 'test']).toContain(env.NODE_ENV);
  });
});
