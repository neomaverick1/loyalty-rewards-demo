import { useCallback, useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { TxRow } from '@/components/TxRow';
import { Card, EmptyState, ErrorState, Screen, Skeleton } from '@/components/ui';
import { CHAIN } from '@/config';
import { useAsync } from '@/hooks/useAsync';
import type { RewardTx } from '@/lib/types';
import { useSession } from '@/state/session';
import { colors, radius, space, type } from '@/theme';

type Filter = 'all' | 'earned' | 'redeemed';
const FILTERS: { key: Filter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'earned', label: 'Earned' },
  { key: 'redeemed', label: 'Redeemed' },
];

export default function HistoryScreen() {
  const { wallet, source } = useSession();
  const address = wallet!.address;
  const [filter, setFilter] = useState<Filter>('all');

  const data = useAsync(
    useCallback(async () => {
      if (!source) throw new Error('No wallet connected');
      const [token, txs] = await Promise.all([source.getTokenInfo(), source.getTransactions(address)]);
      return { token, txs };
    }, [source, address]),
  );

  const txs = (data.data?.txs ?? []).filter((t) => filter === 'all' || t.direction === filter);
  const groups = groupByDay(txs);

  return (
    <Screen
      tabbed
      title="History"
      subtitle={wallet!.mode === 'live' ? `Recent token transfers on ${CHAIN.name}` : 'Sample reward activity'}
      refreshing={data.refreshing}
      onRefresh={data.reload}
    >
      <View style={{ flexDirection: 'row', gap: space.sm }} accessibilityRole="tablist">
        {FILTERS.map((f) => {
          const on = f.key === filter;
          return (
            <Pressable
              key={f.key}
              onPress={() => setFilter(f.key)}
              accessibilityRole="tab"
              accessibilityState={{ selected: on }}
              style={{
                paddingHorizontal: space.lg,
                paddingVertical: space.sm,
                borderRadius: radius.pill,
                backgroundColor: on ? colors.primary : colors.white,
                borderWidth: 1,
                borderColor: on ? colors.primary : colors.border,
              }}
            >
              <Text style={{ color: on ? colors.white : colors.text, fontWeight: '600' }}>{f.label}</Text>
            </Pressable>
          );
        })}
      </View>

      {data.error ? (
        <ErrorState message={data.error} onRetry={data.reload} />
      ) : data.loading || !data.data ? (
        <Card style={{ gap: space.lg }}>
          {[0, 1, 2, 3, 4].map((i) => (
            <Skeleton key={i} height={40} />
          ))}
        </Card>
      ) : txs.length === 0 ? (
        <EmptyState
          icon="receipt-outline"
          title={filter === 'all' ? 'No transactions yet' : `No ${filter} points`}
          message={
            wallet!.mode === 'live'
              ? 'Transfers of the rewards token to or from this wallet in the past week will show up here.'
              : 'Try another filter.'
          }
        />
      ) : (
        groups.map(([day, items]) => (
          <View key={day} style={{ gap: space.sm }}>
            <Text style={type.label}>{day}</Text>
            <Card style={{ paddingVertical: space.xs }}>
              {items.map((tx, i) => (
                <View key={`${tx.hash}:${tx.logIndex}`} style={i > 0 ? { borderTopWidth: 1, borderTopColor: colors.border } : undefined}>
                  <TxRow tx={tx} decimals={data.data!.token.decimals} symbol={data.data!.token.symbol} linkable={wallet!.mode === 'live'} />
                </View>
              ))}
            </Card>
          </View>
        ))
      )}
    </Screen>
  );
}

function groupByDay(txs: RewardTx[]): [string, RewardTx[]][] {
  const today = new Date().toDateString();
  const yesterday = new Date(Date.now() - 86_400_000).toDateString();
  const groups = new Map<string, RewardTx[]>();
  for (const tx of txs) {
    let label = 'Date unavailable';
    if (tx.timestamp !== null) {
      const d = new Date(tx.timestamp * 1000);
      const s = d.toDateString();
      label = s === today ? 'Today' : s === yesterday ? 'Yesterday' : d.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' });
    }
    groups.set(label, [...(groups.get(label) ?? []), tx]);
  }
  return [...groups];
}
