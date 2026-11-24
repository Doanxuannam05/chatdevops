import { hashPassword, comparePassword, generateToken, verifyToken } from '../../src/utils/auth';

describe('Auth Utility Unit Tests', () => {
  it('should hash and successfully verify a password', async () => {
    const rawPassword = 'mySecurePassword123!';
    const hash = await hashPassword(rawPassword);

    expect(hash).toContain(':');
    const isMatch = await comparePassword(rawPassword, hash);
    expect(isMatch).toBe(true);

    const isWrongMatch = await comparePassword('wrongPassword', hash);
    expect(isWrongMatch).toBe(false);
  });

  it('should generate and verify a valid JWT token', () => {
    const payload = {
      userId: 'user123',
      username: 'alice',
      avatar: '2',
    };

    const token = generateToken(payload, 3600);
    expect(typeof token).toBe('string');
    expect(token.split('.').length).toBe(3);

    const verified = verifyToken<typeof payload & { exp: number }>(token);
    expect(verified).not.toBeNull();
    expect(verified?.userId).toBe('user123');
    expect(verified?.username).toBe('alice');
    expect(verified?.avatar).toBe('2');
  });

  it('should reject tampered or expired tokens', () => {
    const payload = {
      userId: 'user456',
      username: 'bob',
    };

    // Expired token (expires in -10 seconds)
    const expiredToken = generateToken(payload, -10);
    const verifiedExpired = verifyToken(expiredToken);
    expect(verifiedExpired).toBeNull();

    // Tampered token
    const validToken = generateToken(payload, 3600);
    const parts = validToken.split('.');
    const tamperedToken = `${parts[0]}.${parts[1]}.invalidsignature`;
    const verifiedTampered = verifyToken(tamperedToken);
    expect(verifiedTampered).toBeNull();
  });
});
