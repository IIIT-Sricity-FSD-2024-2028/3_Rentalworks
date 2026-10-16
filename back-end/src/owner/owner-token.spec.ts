import { issueOwnerToken, verifyOwnerToken } from './owner-token';

describe('owner session token', () => {
  const previousSecret = process.env.OWNER_TOKEN_SECRET;

  beforeAll(() => {
    process.env.OWNER_TOKEN_SECRET = 'a-test-secret-with-at-least-thirty-two-characters';
  });

  afterAll(() => {
    if (previousSecret === undefined) delete process.env.OWNER_TOKEN_SECRET;
    else process.env.OWNER_TOKEN_SECRET = previousSecret;
  });

  it('accepts an unexpired signed owner ID', () => {
    expect(verifyOwnerToken(`Bearer ${issueOwnerToken(42)}`)).toBe(42);
  });

  it('rejects a modified token and a missing token', () => {
    const token = issueOwnerToken(42);
    expect(() => verifyOwnerToken(`Bearer ${token}x`)).toThrow();
    expect(() => verifyOwnerToken()).toThrow();
  });
});
