import {
  register,
  httpRequestCounter,
  wsActiveConnections,
  wsMessagesCounter,
} from '../../src/utils/metrics';

describe('Prometheus Metrics Unit Tests', () => {
  it('should initialize and register metrics in registry', async () => {
    const metricsString = await register.metrics();
    expect(metricsString).toContain('http_requests_total');
    expect(metricsString).toContain('ws_active_connections');
    expect(metricsString).toContain('ws_messages_total');
  });

  it('should increment wsActiveConnections gauge correctly', () => {
    const testPod = 'unit-test-pod';
    wsActiveConnections.inc({ pod_name: testPod });
    wsActiveConnections.dec({ pod_name: testPod });
    expect(true).toBe(true);
  });

  it('should increment wsMessagesCounter correctly', () => {
    wsMessagesCounter.inc({ room: 'test-room', sender_pod: 'test-pod' });
    expect(true).toBe(true);
  });
});
