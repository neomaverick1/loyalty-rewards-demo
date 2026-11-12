import { formatTokenAmount, friendlyError, shortenAddress, tierFor, timeAgo } from '@/lib/format';

const e18 = 10n ** 18n;

describe('formatTokenAmount', () => {
  it('groups thousands and trims trailing zeros', () => {
    expect(formatTokenAmount(1_234_567n * e18 + 890_000_000_000_000_000n, 18)).toBe('1,234,567.89');
    expect(formatTokenAmount(500n * e18, 18)).toBe('500');
    expect(formatTokenAmount(0n, 18)).toBe('0');
  });
  it('is exact for huge values that would overflow a float', () => {
    expect(formatTokenAmount(123_456_789_012_345_678_901n * e18, 18)).toBe('123,456,789,012,345,678,901');
  });
  it('handles 6-decimal tokens like USDC and negatives', () => {
    expect(formatTokenAmount(1_500_000n, 6)).toBe('1.5');
    expect(formatTokenAmount(-2_250_000n, 6)).toBe('-2.25');
  });
  it('truncates instead of rounding up', () => {
    expect(formatTokenAmount(1_999_999n, 6)).toBe('1.99');
  });
});

describe('shortenAddress', () => {
  it('keeps the start and end', () => {
    expect(shortenAddress('0x7a3B91c4E5d2F08A6b1C9e4D3f2A8b7C6d5E4f31')).toBe('0x7a3B…4f31');
  });
});

describe('timeAgo', () => {
  const now = 1_700_000_000_000;
  const s = now / 1000;
  it('describes recent times', () => {
    expect(timeAgo(s - 10, now)).toBe('just now');
    expect(timeAgo(s - 5 * 60, now)).toBe('5 min ago');
    expect(timeAgo(s - 3 * 3600, now)).toBe('3 h ago');
    expect(timeAgo(s - 2 * 86_400, now)).toBe('2 d ago');
  });
  it('handles a missing timestamp', () => {
    expect(timeAgo(null, now)).toBe('Time unavailable');
  });
});

describe('tierFor', () => {
  it('finds the tier and progress to the next', () => {
    expect(tierFor(0)).toMatchObject({ name: 'Bronze', progress: 0 });
    expect(tierFor(250)).toMatchObject({ name: 'Bronze', progress: 0.5, next: { name: 'Silver', at: 500 } });
    expect(tierFor(2_000)).toMatchObject({ name: 'Gold', progress: 0 });
    expect(tierFor(50_000)).toMatchObject({ name: 'Platinum', next: null, progress: 1 });
  });
});

describe('friendlyError', () => {
  it('maps network failures to a readable message', () => {
    expect(friendlyError(new Error('HTTP request failed. Status: 503'))).toMatch(/Couldn't reach/);
    expect(friendlyError(new Error('The contract function "balanceOf" returned no data ("0x")'))).toMatch(/contract/);
  });
});
