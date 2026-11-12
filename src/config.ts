import { sepolia } from 'viem/chains';
import type { Address, Chain } from 'viem';

/**
 * All blockchain settings live here, so pointing the app at the real
 * rewards contract is a one-file change.
 *
 * The defaults read Circle's test USDC on the Sepolia test network, a real
 * deployed ERC-20 contract, standing in for the rewards token.
 */
export const CHAIN: Chain = sepolia;

/** Public JSON-RPC endpoint. Swap for your own provider (Alchemy, Infura...) in production. */
export const RPC_URL: string =
  process.env.EXPO_PUBLIC_RPC_URL ?? 'https://ethereum-sepolia-rpc.publicnode.com';

/** The deployed rewards token contract. */
export const REWARDS_TOKEN_ADDRESS: Address =
  (process.env.EXPO_PUBLIC_REWARDS_TOKEN as Address | undefined) ??
  '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238';

/** Block explorer used for "view on explorer" links. */
export const EXPLORER_URL = 'https://sepolia.etherscan.io';

/** How far back the history screen searches for token transfers. */
export const HISTORY = {
  /** Blocks per eth_getLogs request (public RPCs cap the range). */
  chunkSize: 5_000n,
  /** Stop after this many chunks (~ 50,000 blocks, about a week on Sepolia). */
  maxChunks: 10,
  /** Show at most this many transactions. */
  limit: 25,
} as const;
