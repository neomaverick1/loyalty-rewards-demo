import { getAddress, isAddress, type Address } from 'viem';

export type FieldErrors<T extends string> = Partial<Record<T, string>>;

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function validateLogin(email: string, password: string): FieldErrors<'email' | 'password'> {
  const errors: FieldErrors<'email' | 'password'> = {};
  const e = email.trim();
  if (!e) errors.email = 'Enter your email address.';
  else if (!EMAIL.test(e)) errors.email = 'That email address doesn’t look right.';
  if (!password) errors.password = 'Enter your password.';
  else if (password.length < 8) errors.password = 'Password must be at least 8 characters.';
  return errors;
}

export function validateDisplayName(name: string): string | undefined {
  const n = name.trim();
  if (!n) return 'Enter a display name.';
  if (n.length < 2) return 'Use at least 2 characters.';
  if (n.length > 40) return 'Keep it under 40 characters.';
  return undefined;
}

/**
 * Validates a pasted wallet address. Accepts any case, but rejects a
 * mixed-case address whose checksum is wrong (a likely typo).
 * Returns the checksummed address on success.
 */
export function parseWalletAddress(input: string): { address: Address } | { error: string } {
  const value = input.trim();
  if (!value) return { error: 'Paste your wallet address.' };
  if (!/^0x[0-9a-fA-F]{40}$/.test(value)) {
    return { error: 'A wallet address starts with 0x followed by 40 letters and numbers.' };
  }
  if (!isAddress(value, { strict: true })) {
    return { error: 'This address has a typo (its checksum doesn’t match). Copy it again from your wallet.' };
  }
  return { address: getAddress(value) };
}
