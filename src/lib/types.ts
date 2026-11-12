import type { Address, Hash } from 'viem';

export interface TokenInfo {
  address: Address;
  name: string;
  symbol: string;
  decimals: number;
  totalSupply: bigint;
}

export type TxDirection = 'earned' | 'redeemed';

export interface RewardTx {
  hash: Hash;
  /** Index of the log inside its transaction, so keys stay unique. */
  logIndex: number;
  blockNumber: bigint;
  /** Unix seconds, or null if the block time could not be loaded. */
  timestamp: number | null;
  from: Address;
  to: Address;
  value: bigint;
  direction: TxDirection;
}

/** Where reward data comes from: the live contract, or built-in demo data. */
export interface RewardsSource {
  readonly kind: 'live' | 'demo';
  getTokenInfo(): Promise<TokenInfo>;
  getBalance(account: Address): Promise<bigint>;
  getTransactions(account: Address): Promise<RewardTx[]>;
}
