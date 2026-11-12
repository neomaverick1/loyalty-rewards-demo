import {
  createPublicClient,
  getAddress,
  http,
  isAddressEqual,
  type Address,
  type PublicClient,
} from 'viem';

import { CHAIN, HISTORY, REWARDS_TOKEN_ADDRESS, RPC_URL } from '@/config';
import { rewardsTokenAbi } from './abi';
import type { RewardTx, RewardsSource, TokenInfo } from './types';

const transferEvent = rewardsTokenAbi.find((x) => x.type === 'event' && x.name === 'Transfer')!;

/** The subset of viem's PublicClient this module uses (lets tests pass a fake). */
export type ReadClient = Pick<PublicClient, 'readContract' | 'getLogs' | 'getBlockNumber' | 'getBlock'>;

export function createReadClient(): ReadClient {
  return createPublicClient({ chain: CHAIN, transport: http(RPC_URL, { retryCount: 2, timeout: 15_000 }) });
}

/** Reads token metadata straight from the deployed contract via its ABI. */
export async function readTokenInfo(client: ReadClient, token: Address): Promise<TokenInfo> {
  const read = <T>(functionName: 'name' | 'symbol' | 'decimals' | 'totalSupply') =>
    client.readContract({ address: token, abi: rewardsTokenAbi, functionName }) as Promise<T>;
  const [name, symbol, decimals, totalSupply] = await Promise.all([
    read<string>('name'),
    read<string>('symbol'),
    read<number>('decimals'),
    read<bigint>('totalSupply'),
  ]);
  return { address: token, name, symbol, decimals: Number(decimals), totalSupply };
}

export async function readBalance(client: ReadClient, token: Address, account: Address): Promise<bigint> {
  return client.readContract({
    address: token,
    abi: rewardsTokenAbi,
    functionName: 'balanceOf',
    args: [account],
  });
}

/**
 * Finds the account's most recent token transfers (in and out) by scanning
 * Transfer events backwards in chunks, since public RPCs limit how many
 * blocks one request may cover. Stops once `limit` transfers are found.
 */
export async function readRecentTransfers(
  client: ReadClient,
  token: Address,
  account: Address,
  opts: { chunkSize: bigint; maxChunks: number; limit: number } = HISTORY,
): Promise<RewardTx[]> {
  const me = getAddress(account);
  const latest = await client.getBlockNumber();
  const found: RewardTx[] = [];

  let toBlock = latest;
  for (let i = 0; i < opts.maxChunks && found.length < opts.limit && toBlock >= 0n; i++) {
    const fromBlock = toBlock >= opts.chunkSize - 1n ? toBlock - opts.chunkSize + 1n : 0n;
    const range = { address: token, event: transferEvent, fromBlock, toBlock } as const;
    // Two filtered queries (received / sent) are far cheaper than one unfiltered scan.
    const [incoming, outgoing] = await Promise.all([
      client.getLogs({ ...range, args: { to: me } }),
      client.getLogs({ ...range, args: { from: me } }),
    ]);

    const seen = new Set(found.map((t) => `${t.hash}:${t.logIndex}`));
    for (const log of [...incoming, ...outgoing]) {
      const { from, to, value } = log.args;
      if (!from || !to || value === undefined || !log.transactionHash || log.blockNumber === null) continue;
      const key = `${log.transactionHash}:${log.logIndex}`;
      if (seen.has(key)) continue; // a transfer to yourself matches both queries
      seen.add(key);
      found.push({
        hash: log.transactionHash,
        logIndex: log.logIndex ?? 0,
        blockNumber: log.blockNumber,
        timestamp: null,
        from,
        to,
        value,
        direction: isAddressEqual(to, me) ? 'earned' : 'redeemed',
      });
    }
    if (fromBlock === 0n) break;
    toBlock = fromBlock - 1n;
  }

  found.sort((a, b) =>
    a.blockNumber === b.blockNumber ? b.logIndex - a.logIndex : a.blockNumber > b.blockNumber ? -1 : 1,
  );
  const recent = found.slice(0, opts.limit);
  await attachTimestamps(client, recent);
  return recent;
}

/** Looks up each distinct block once. A failed lookup leaves the time blank rather than failing the list. */
async function attachTimestamps(client: ReadClient, txs: RewardTx[]): Promise<void> {
  const blocks = [...new Set(txs.map((t) => t.blockNumber))];
  const times = new Map<bigint, number>();
  await Promise.all(
    blocks.map(async (blockNumber) => {
      try {
        const block = await client.getBlock({ blockNumber });
        times.set(blockNumber, Number(block.timestamp));
      } catch {
        /* keep timestamp null */
      }
    }),
  );
  for (const t of txs) t.timestamp = times.get(t.blockNumber) ?? null;
}

/** Live data straight from the chain. */
export function createLiveSource(client: ReadClient = createReadClient(), token: Address = REWARDS_TOKEN_ADDRESS): RewardsSource {
  let info: Promise<TokenInfo> | null = null;
  return {
    kind: 'live',
    getTokenInfo() {
      // Token metadata never changes, so read it once; retry if that read failed.
      info ??= readTokenInfo(client, token).catch((e) => {
        info = null;
        throw e;
      });
      return info;
    },
    getBalance: (account) => readBalance(client, token, account),
    getTransactions: (account) => readRecentTransfers(client, token, account),
  };
}
