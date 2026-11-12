import { getAddress, type Address, type Hash } from 'viem';
import type { RewardTx, RewardsSource, TokenInfo } from './types';

/** A sample wallet for exploring the app without a real one. */
export const DEMO_WALLET: Address = getAddress('0x7a3b91c4e5d2f08a6b1c9e4d3f2a8b7c6d5e4f31');

const STORE: Address = getAddress('0x4f2a9c1b8e7d6a5c3b2e1d0f9a8b7c6d5e4f3a21');
const DECIMALS = 18;
const unit = 10n ** BigInt(DECIMALS);

const TOKEN: TokenInfo = {
  address: getAddress('0x9d1c2b3a4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a90'),
  name: 'Loyalty Rewards Token',
  symbol: 'RWD',
  decimals: DECIMALS,
  totalSupply: 25_000_000n * unit,
};

// [points, earned?, hours ago]
const HISTORY: [number, boolean, number][] = [
  [120, true, 2], [45, true, 20], [500, false, 30], [80, true, 52], [210, true, 75],
  [35, true, 98], [250, false, 120], [150, true, 150], [60, true, 190], [95, true, 240],
  [300, true, 300], [40, true, 360],
];

const fakeHash = (i: number) => (`0x${(0xa1b2c3d4e5n * BigInt(i + 7)).toString(16).padStart(64, '0')}`) as Hash;

function demoTransactions(account: Address): RewardTx[] {
  const now = Math.floor(Date.now() / 1000);
  return HISTORY.map(([points, earned, hoursAgo], i) => ({
    hash: fakeHash(i),
    logIndex: 0,
    blockNumber: 7_400_000n - BigInt(hoursAgo * 300),
    timestamp: now - hoursAgo * 3600,
    from: earned ? STORE : account,
    to: earned ? account : STORE,
    value: BigInt(points) * unit,
    direction: earned ? 'earned' : 'redeemed',
  }));
}

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Built-in sample data with a short, realistic delay so loading states are visible. */
export function createDemoSource(): RewardsSource {
  return {
    kind: 'demo',
    async getTokenInfo() {
      await wait(300);
      return TOKEN;
    },
    async getBalance(account) {
      await wait(500);
      return demoTransactions(account).reduce((sum, t) => (t.direction === 'earned' ? sum + t.value : sum - t.value), 0n);
    },
    async getTransactions(account) {
      await wait(700);
      return demoTransactions(account);
    },
  };
}
