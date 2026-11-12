import { createPublicClient, http, parseAbiItem } from 'viem';
import { sepolia } from 'viem/chains';
import { createLiveSource } from '@/lib/rewards';
import { RPC_URL, REWARDS_TOKEN_ADDRESS } from '@/config';

jest.setTimeout(120_000);

it('reads the real Sepolia contract end to end', async () => {
  // Find a wallet that received the token recently, then read it through the app's own code.
  const c = createPublicClient({ chain: sepolia, transport: http(RPC_URL) });
  const latest = await c.getBlockNumber();
  const logs = await c.getLogs({
    address: REWARDS_TOKEN_ADDRESS,
    event: parseAbiItem('event Transfer(address indexed from, address indexed to, uint256 value)'),
    fromBlock: latest - 2_000n,
    toBlock: latest,
  });
  expect(logs.length).toBeGreaterThan(0);
  const holder = logs.at(-1)!.args.to!;

  const src = createLiveSource();
  const info = await src.getTokenInfo();
  const bal = await src.getBalance(holder);
  const txs = await src.getTransactions(holder);
  console.log(JSON.stringify({ latest: latest.toString(), holder, info: { ...info, totalSupply: info.totalSupply.toString() }, bal: bal.toString(), n: txs.length, first: txs[0] && { ...txs[0], value: txs[0].value.toString(), blockNumber: txs[0].blockNumber.toString() } }, null, 1));
  expect(info.decimals).toBe(6);
  expect(txs.length).toBeGreaterThan(0);
  expect(txs.some((t) => t.direction === 'earned')).toBe(true);
});
