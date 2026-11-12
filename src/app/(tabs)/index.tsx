import { Link } from 'expo-router';
import { useCallback } from 'react';
import { Text, View } from 'react-native';
import { formatUnits } from 'viem';

import { TxRow } from '@/components/TxRow';
import { AddressChip, Badge, Card, EmptyState, ErrorState, Screen, Skeleton } from '@/components/ui';
import { CHAIN } from '@/config';
import { useAsync } from '@/hooks/useAsync';
import { formatTokenAmount, shortenAddress, tierFor } from '@/lib/format';
import { useSession } from '@/state/session';
import { colors, radius, space, type } from '@/theme';

const DAY = 86_400;

export default function DashboardScreen() {
  const { user, wallet, source } = useSession();
  const address = wallet!.address;

  const summary = useAsync(
    useCallback(
      async () => {
        if (!source) throw new Error('No wallet connected');
        const [token, balance] = await Promise.all([source.getTokenInfo(), source.getBalance(address)]);
        return { token, balance };
      },
      [source, address],
    ),
  );
  const activity = useAsync(
    useCallback(
      async () => {
        if (!source) throw new Error('No wallet connected');
        const txs = await source.getTransactions(address);
        // Totals for the last 30 days, worked out when the data arrives.
        const since = Date.now() / 1000 - 30 * DAY;
        const recent = txs.filter((t) => (t.timestamp ?? 0) >= since);
        const total = (dir: 'earned' | 'redeemed') =>
          recent.filter((t) => t.direction === dir).reduce((sum, t) => sum + t.value, 0n);
        return { txs, earned30: total('earned'), redeemed30: total('redeemed') };
      },
      [source, address],
    ),
  );

  const token = summary.data?.token;
  const points = summary.data ? Number(formatUnits(summary.data.balance, summary.data.token.decimals)) : 0;
  const tier = tierFor(points);
  const txs = activity.data?.txs;

  return (
    <Screen
      tabbed
      refreshing={summary.refreshing || activity.refreshing}
      onRefresh={() => {
        summary.reload();
        activity.reload();
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <View style={{ gap: 6, flex: 1 }}>
          <Text style={type.title}>Hi, {user?.displayName.split(' ')[0]}</Text>
          <View style={{ flexDirection: 'row', gap: space.sm, alignItems: 'center' }}>
            <AddressChip address={address} />
            <Badge tone={wallet!.mode} label={wallet!.mode === 'live' ? CHAIN.name : 'Demo data'} />
          </View>
        </View>
      </View>

      {/* Balance + tier */}
      {summary.error ? (
        <ErrorState message={summary.error} onRetry={summary.reload} />
      ) : (
        <View style={{ backgroundColor: colors.primary, borderRadius: radius.lg, padding: space.xl, gap: space.lg }}>
          <View style={{ gap: 4 }}>
            <Text style={{ color: '#C9C4F5', fontWeight: '600' }}>Reward balance</Text>
            {summary.loading || !token ? (
              <Skeleton height={44} width="70%" style={{ backgroundColor: 'rgba(255,255,255,0.18)' }} />
            ) : (
              <Text
                style={{ color: colors.white, fontSize: 40, fontWeight: '800', letterSpacing: -1, fontVariant: ['tabular-nums'] }}
                accessibilityLabel={`${formatTokenAmount(summary.data!.balance, token.decimals)} ${token.symbol}`}
              >
                {formatTokenAmount(summary.data!.balance, token.decimals)}{' '}
                <Text style={{ fontSize: 20, color: colors.gold }}>{token.symbol}</Text>
              </Text>
            )}
          </View>
          <View style={{ gap: 8 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={{ color: colors.white, fontWeight: '700' }}>{tier.name} member</Text>
              <Text style={{ color: '#C9C4F5' }}>
                {tier.next ? `${Math.max(0, Math.ceil(tier.next.at - points)).toLocaleString()} to ${tier.next.name}` : 'Top tier'}
              </Text>
            </View>
            <View style={{ height: 8, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.18)', overflow: 'hidden' }}>
              <View style={{ height: 8, width: `${Math.round(tier.progress * 100)}%`, backgroundColor: colors.gold, borderRadius: 4 }} />
            </View>
          </View>
        </View>
      )}

      {/* Last 30 days */}
      <View style={{ flexDirection: 'row', gap: space.md }}>
        <Stat label="Earned · 30 days" tone="earned" value={activity.error ? '—' : activity.data && token ? `+${formatTokenAmount(activity.data.earned30, token.decimals)}` : null} />
        <Stat label="Redeemed · 30 days" tone="redeemed" value={activity.error ? '—' : activity.data && token ? `−${formatTokenAmount(activity.data.redeemed30, token.decimals)}` : null} />
      </View>

      {/* Recent activity */}
      <Card style={{ paddingVertical: space.sm }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: space.sm }}>
          <Text style={type.h2}>Recent activity</Text>
          <Link href="/history" style={{ color: colors.primary, fontWeight: '700' }}>
            See all
          </Link>
        </View>
        {activity.error ? (
          <Text style={{ color: colors.danger, paddingVertical: space.md }} onPress={activity.reload}>
            {activity.error} Tap to retry.
          </Text>
        ) : activity.loading || !token || !txs ? (
          [0, 1, 2].map((i) => <Skeleton key={i} height={40} style={{ marginVertical: space.sm }} />)
        ) : txs.length === 0 ? (
          <Text style={[type.body, { color: colors.muted, paddingVertical: space.md }]}>No reward activity yet.</Text>
        ) : (
          txs.slice(0, 3).map((tx) => (
            <TxRow key={`${tx.hash}:${tx.logIndex}`} tx={tx} decimals={token.decimals} symbol={token.symbol} linkable={wallet!.mode === 'live'} />
          ))
        )}
      </Card>

      {/* Contract details, read through the ABI */}
      {token ? (
        <Card style={{ gap: space.sm }}>
          <Text style={type.h2}>Rewards token</Text>
          <Row label="Name" value={token.name} />
          <Row label="Symbol" value={token.symbol} />
          <Row label="Contract" value={shortenAddress(token.address, 6)} />
          <Row label="Total supply" value={`${formatTokenAmount(token.totalSupply, token.decimals, 0)} ${token.symbol}`} />
        </Card>
      ) : summary.loading ? null : (
        <EmptyState icon="cube-outline" title="Token unavailable" message="Pull down to refresh." />
      )}
    </Screen>
  );
}

function Stat({ label, value, tone }: { label: string; value: string | null; tone: 'earned' | 'redeemed' }) {
  return (
    <Card style={{ flex: 1, gap: 6 }}>
      <Text style={type.label}>{label}</Text>
      {value === null ? (
        <Skeleton height={24} width="60%" />
      ) : (
        <Text style={{ fontSize: 22, fontWeight: '800', color: tone === 'earned' ? colors.earned : colors.redeemed, fontVariant: ['tabular-nums'] }}>
          {value}
        </Text>
      )}
    </Card>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: space.md }}>
      <Text style={[type.body, { color: colors.muted }]}>{label}</Text>
      <Text style={[type.body, { fontWeight: '600', flexShrink: 1, textAlign: 'right' }]} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}
