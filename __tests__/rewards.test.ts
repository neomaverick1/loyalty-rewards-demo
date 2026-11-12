import { getAddress, type Address, type Hash } from 'viem';
import { createLiveSource, readBalance, readRecentTransfers, readTokenInfo, type ReadClient } from '@/lib/rewards';

const TOKEN = getAddress('0x1c7d4b196cb0c7b01d743fbc6116a902379c7238');
const ME = getAddress('0xd8da6bf26964af9d7eed9e03e53415d37aa96045');
const SHOP = getAddress('0x4f2a9c1b8e7d6a5c3b2e1d0f9a8b7c6d5e4f3a21');

interface FakeLog {
  from: Address;
  to: Address;
  value: bigint;
  block: bigint;
  hash: string;
  logIndex?: number;
}

/** In-memory stand-in for viem's public client: answers getLogs by block range and topic filter. */
function fakeClient(logs: FakeLog[], latest = 100_000n) {
  const calls = { getLogs: [] as { fromBlock: bigint; toBlock: bigint }[] };
  const client = {
    async getBlockNumber() {
      return latest;
    },
    async getBlock({ blockNumber }: { blockNumber: bigint }) {
      if (blockNumber === 99_999n) throw new Error('block lookup failed');
      return { timestamp: 1_700_000_000n + blockNumber * 12n };
    },
    async readContract({ functionName, args }: { functionName: string; args?: Address[] }) {
      const values: Record<string, unknown> = { name: 'USDC', symbol: 'USDC', decimals: 6, totalSupply: 10n ** 15n };
      if (functionName === 'balanceOf') return args?.[0] === ME ? 42_500_000n : 0n;
      return values[functionName];
    },
    async getLogs({ fromBlock, toBlock, args }: { fromBlock: bigint; toBlock: bigint; args: { from?: Address; to?: Address } }) {
      calls.getLogs.push({ fromBlock, toBlock });
      return logs
        .filter((l) => l.block >= fromBlock && l.block <= toBlock)
        .filter((l) => (args.to ? l.to === args.to : true) && (args.from ? l.from === args.from : true))
        .map((l) => ({
          args: { from: l.from, to: l.to, value: l.value },
          transactionHash: l.hash as Hash,
          logIndex: l.logIndex ?? 0,
          blockNumber: l.block,
        }));
    },
  };
  return { client: client as unknown as ReadClient, calls };
}

const opts = { chunkSize: 1_000n, maxChunks: 10, limit: 25 };

describe('reading the contract via its ABI', () => {
  it('reads token info and balance', async () => {
    const { client } = fakeClient([]);
    await expect(readTokenInfo(client, TOKEN)).resolves.toEqual({
      address: TOKEN, name: 'USDC', symbol: 'USDC', decimals: 6, totalSupply: 10n ** 15n,
    });
    await expect(readBalance(client, TOKEN, ME)).resolves.toBe(42_500_000n);
  });
});

describe('readRecentTransfers', () => {
  it('labels incoming as earned, outgoing as redeemed, newest first', async () => {
    const { client } = fakeClient([
      { from: SHOP, to: ME, value: 5n, block: 99_500n, hash: '0xa' },
      { from: ME, to: SHOP, value: 2n, block: 99_800n, hash: '0xb' },
      { from: SHOP, to: SHOP, value: 9n, block: 99_900n, hash: '0xc' }, // not ours
    ]);
    const txs = await readRecentTransfers(client, TOKEN, ME, opts);
    expect(txs.map((t) => [t.hash, t.direction])).toEqual([
      ['0xb', 'redeemed'],
      ['0xa', 'earned'],
    ]);
    expect(txs[0].timestamp).toBe(1_700_000_000 + 99_800 * 12);
  });

  it('accepts a lowercase account address', async () => {
    const { client } = fakeClient([{ from: SHOP, to: ME, value: 5n, block: 99_500n, hash: '0xa' }]);
    const txs = await readRecentTransfers(client, TOKEN, ME.toLowerCase() as Address, opts);
    expect(txs).toHaveLength(1);
    expect(txs[0].direction).toBe('earned');
  });

  it('counts a transfer to yourself once', async () => {
    const { client } = fakeClient([{ from: ME, to: ME, value: 1n, block: 99_000n, hash: '0xself' }]);
    expect(await readRecentTransfers(client, TOKEN, ME, opts)).toHaveLength(1);
  });

  it('walks back in chunks within the RPC range limit and stops at maxChunks', async () => {
    const { client, calls } = fakeClient([{ from: SHOP, to: ME, value: 1n, block: 10n, hash: '0xold' }]);
    const txs = await readRecentTransfers(client, TOKEN, ME, { ...opts, maxChunks: 3 });
    expect(txs).toHaveLength(0); // too old to reach in 3 chunks
    const ranges = [...new Map(calls.getLogs.map((c) => [`${c.fromBlock}`, c])).values()];
    expect(ranges).toEqual([
      { fromBlock: 99_001n, toBlock: 100_000n },
      { fromBlock: 98_001n, toBlock: 99_000n },
      { fromBlock: 97_001n, toBlock: 98_000n },
    ]);
  });

  it('stops early once it has enough transfers', async () => {
    const logs = Array.from({ length: 30 }, (_, i) => ({ from: SHOP, to: ME, value: 1n, block: 99_990n - BigInt(i), hash: `0x${i}` }));
    const { client, calls } = fakeClient(logs);
    const txs = await readRecentTransfers(client, TOKEN, ME, { ...opts, limit: 25 });
    expect(txs).toHaveLength(25);
    expect(calls.getLogs).toHaveLength(2); // one chunk, two filtered queries
  });

  it('does not scan below block 0 on a young chain', async () => {
    const { client, calls } = fakeClient([{ from: SHOP, to: ME, value: 1n, block: 3n, hash: '0xg' }], 1_500n);
    const txs = await readRecentTransfers(client, TOKEN, ME, opts);
    expect(txs).toHaveLength(1);
    expect(calls.getLogs.at(-1)).toEqual({ fromBlock: 0n, toBlock: 500n });
  });

  it('leaves the time blank if a block lookup fails, instead of failing the list', async () => {
    const { client } = fakeClient([{ from: SHOP, to: ME, value: 1n, block: 99_999n, hash: '0xh' }]);
    const [tx] = await readRecentTransfers(client, TOKEN, ME, opts);
    expect(tx.timestamp).toBeNull();
  });
});

describe('createLiveSource', () => {
  it('caches token info but retries after a failure', async () => {
    const { client } = fakeClient([]);
    let fail = true;
    const flaky = {
      ...client,
      readContract: (args: Parameters<ReadClient['readContract']>[0]) => {
        if (fail) return Promise.reject(new Error('HTTP request failed'));
        return client.readContract(args);
      },
    } as ReadClient;
    const source = createLiveSource(flaky, TOKEN);
    await expect(source.getTokenInfo()).rejects.toThrow();
    fail = false;
    await expect(source.getTokenInfo()).resolves.toMatchObject({ symbol: 'USDC' });
  });
});
