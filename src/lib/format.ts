import { formatUnits } from 'viem';

/** 1234567.891 tokens -> "1,234,567.89". Exact: works on the raw bigint, never a float. */
export function formatTokenAmount(raw: bigint, decimals: number, maxFractionDigits = 2): string {
  const negative = raw < 0n;
  const [whole, fraction = ''] = formatUnits(negative ? -raw : raw, decimals).split('.');
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  const trimmed = fraction.slice(0, maxFractionDigits).replace(/0+$/, '');
  return `${negative ? '-' : ''}${grouped}${trimmed ? `.${trimmed}` : ''}`;
}

/** 0x7a3B91c4E5d2F08A6b1C9e4D3f2A8b7C6d5E4f31 -> "0x7a3B…4f31" */
export function shortenAddress(address: string, chars = 4): string {
  if (address.length <= 2 + chars * 2) return address;
  return `${address.slice(0, 2 + chars)}…${address.slice(-chars)}`;
}

/** Unix seconds -> "just now", "5 min ago", "3 h ago", "2 d ago", or a date. */
export function timeAgo(unixSeconds: number | null, now: number = Date.now()): string {
  if (unixSeconds === null) return 'Time unavailable';
  const s = Math.max(0, Math.floor(now / 1000) - unixSeconds);
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  if (s < 86_400) return `${Math.floor(s / 3600)} h ago`;
  if (s < 7 * 86_400) return `${Math.floor(s / 86_400)} d ago`;
  return new Date(unixSeconds * 1000).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

export interface Tier {
  name: 'Bronze' | 'Silver' | 'Gold' | 'Platinum';
  /** Points needed to reach the next tier, or null at the top tier. */
  next: { name: Tier['name']; at: number } | null;
  /** 0-1 progress toward the next tier. */
  progress: number;
}

const TIERS: { name: Tier['name']; at: number }[] = [
  { name: 'Bronze', at: 0 },
  { name: 'Silver', at: 500 },
  { name: 'Gold', at: 2_000 },
  { name: 'Platinum', at: 10_000 },
];

/** Loyalty tier for a whole-token balance. */
export function tierFor(points: number): Tier {
  let i = 0;
  while (i + 1 < TIERS.length && points >= TIERS[i + 1].at) i++;
  const cur = TIERS[i];
  const next = TIERS[i + 1] ?? null;
  const progress = next ? Math.min(1, (points - cur.at) / (next.at - cur.at)) : 1;
  return { name: cur.name, next, progress: Math.max(0, progress) };
}

/** Readable message for anything thrown by the network or the RPC. */
export function friendlyError(e: unknown): string {
  const msg = e instanceof Error ? e.message : String(e);
  if (/network|fetch|timed? ?out|HTTP request failed/i.test(msg)) {
    return "Couldn't reach the blockchain network. Check your connection and try again.";
  }
  if (/rate|429|limit/i.test(msg)) return 'The network is busy right now. Please try again in a moment.';
  if (/returned no data|reverted|execution/i.test(msg)) {
    return "The rewards contract didn't respond as expected. Check the contract address and network in settings.";
  }
  return 'Something went wrong while loading your rewards. Please try again.';
}
