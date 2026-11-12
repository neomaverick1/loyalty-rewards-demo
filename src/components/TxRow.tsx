import Ionicons from '@expo/vector-icons/Ionicons';
import * as Linking from 'expo-linking';
import { Pressable, Text, View } from 'react-native';

import { EXPLORER_URL } from '@/config';
import { formatTokenAmount, shortenAddress, timeAgo } from '@/lib/format';
import type { RewardTx } from '@/lib/types';
import { colors, space, type } from '@/theme';

export function TxRow({ tx, decimals, symbol, linkable }: { tx: RewardTx; decimals: number; symbol: string; linkable: boolean }) {
  const earned = tx.direction === 'earned';
  const amount = formatTokenAmount(tx.value, decimals);
  const counterparty = earned ? tx.from : tx.to;
  const label = `${earned ? 'Earned' : 'Redeemed'} ${amount} ${symbol}, ${timeAgo(tx.timestamp)}`;

  return (
    <Pressable
      disabled={!linkable}
      onPress={() => Linking.openURL(`${EXPLORER_URL}/tx/${tx.hash}`)}
      accessibilityRole={linkable ? 'link' : undefined}
      accessibilityLabel={label}
      style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: space.md, opacity: pressed ? 0.6 : 1 })}
    >
      <View
        style={{
          width: 40,
          height: 40,
          borderRadius: 20,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: earned ? colors.earnedSoft : colors.redeemedSoft,
        }}
      >
        <Ionicons name={earned ? 'arrow-down' : 'arrow-up'} size={18} color={earned ? colors.earned : colors.redeemed} />
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={[type.body, { fontWeight: '600' }]}>{earned ? 'Points earned' : 'Points redeemed'}</Text>
        <Text style={type.small} numberOfLines={1}>
          {timeAgo(tx.timestamp)} · {earned ? 'from' : 'to'} {shortenAddress(counterparty)}
        </Text>
      </View>
      <Text style={{ fontSize: 16, fontWeight: '700', color: earned ? colors.earned : colors.redeemed, fontVariant: ['tabular-nums'] }}>
        {earned ? '+' : '−'}
        {amount}
      </Text>
    </Pressable>
  );
}
