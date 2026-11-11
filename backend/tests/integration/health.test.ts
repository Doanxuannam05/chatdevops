import request from 'supertest';
import { app } from '../../src/server';

describe('Health and System Routes Integration Tests', () => {
  it('GET / should return service info and podName', async () => {
    const res = await request(app).get('/');
    expect(res.status).toBe(200);
    expect(res.body.service).toBe('realtime-chat-backend');
    expect(res.body.podName).toBeDefined();
    expect(res.body.endpoints).toBeDefined();
  });

  it('GET /health/live should return 200 for K8s liveness probe', async () => {
    const res = await request(app).get('/health/live');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('live');
  });

  it('GET /metrics should expose Prometheus metrics in text format', async () => {
    const res = await request(app).get('/metrics');
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('text/plain');
    expect(res.text).toContain('chat_system_');
  });

  it('GET /api/simulate-error with type 500 should return HTTP 500', async () => {
    const res = await request(app).get('/api/simulate-error?type=500');
    expect(res.status).toBe(500);
    expect(res.body.error).toBeDefined();
  });
});
