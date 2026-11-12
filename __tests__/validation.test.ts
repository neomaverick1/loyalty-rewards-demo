import { parseWalletAddress, validateDisplayName, validateLogin } from '@/lib/validation';

describe('validateLogin', () => {
  it('requires both fields', () => {
    expect(validateLogin('', '')).toEqual({ email: 'Enter your email address.', password: 'Enter your password.' });
  });
  it('rejects a malformed email and short password', () => {
    const e = validateLogin('randy@', 'short');
    expect(e.email).toBeDefined();
    expect(e.password).toMatch(/8 characters/);
  });
  it('accepts valid input', () => {
    expect(validateLogin('  randy@example.com ', 'longenough')).toEqual({});
  });
});

describe('validateDisplayName', () => {
  it('checks length', () => {
    expect(validateDisplayName(' ')).toBeDefined();
    expect(validateDisplayName('R')).toBeDefined();
    expect(validateDisplayName('Randy')).toBeUndefined();
  });
});

describe('parseWalletAddress', () => {
  const lower = '0xd8da6bf26964af9d7eed9e03e53415d37aa96045';
  const checksummed = '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045';

  it('accepts lowercase and returns the checksummed form', () => {
    expect(parseWalletAddress(`  ${lower}\n`)).toEqual({ address: checksummed });
  });
  it('accepts a correctly checksummed address', () => {
    expect(parseWalletAddress(checksummed)).toEqual({ address: checksummed });
  });
  it('rejects a mixed-case address with a bad checksum (a typo)', () => {
    const typo = checksummed.replace('dA6', 'Da6');
    expect(parseWalletAddress(typo)).toEqual({ error: expect.stringMatching(/typo/) });
  });
  it('rejects empty and wrong-length input', () => {
    expect(parseWalletAddress('')).toEqual({ error: expect.any(String) });
    expect(parseWalletAddress('0x1234')).toEqual({ error: expect.stringMatching(/40/) });
  });
});
