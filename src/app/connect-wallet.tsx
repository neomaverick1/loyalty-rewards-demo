import Ionicons from '@expo/vector-icons/Ionicons';
import * as Clipboard from 'expo-clipboard';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, Text, View } from 'react-native';

import { Button, Card, Screen, TextField } from '@/components/ui';
import { CHAIN } from '@/config';
import { DEMO_WALLET } from '@/lib/demo';
import { parseWalletAddress } from '@/lib/validation';
import { useSession } from '@/state/session';
import { colors, space, type } from '@/theme';

export default function ConnectWalletScreen() {
  const { connectWallet, signOut, user } = useSession();
  const [input, setInput] = useState('');
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState<'live' | 'demo' | null>(null);

  async function connect() {
    const result = parseWalletAddress(input);
    if ('error' in result) {
      setError(result.error);
      return;
    }
    setBusy('live');
    await connectWallet({ address: result.address, mode: 'live' });
  }

  async function paste() {
    const text = await Clipboard.getStringAsync();
    if (text) {
      setInput(text.trim());
      setError(undefined);
    }
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Screen title="Connect your wallet" subtitle={`Hi ${user?.displayName ?? 'there'}! Your reward tokens live in your wallet.`}>
        <Card style={{ gap: space.lg }}>
          <Step n={1} text={`Open your wallet app and copy your ${CHAIN.name} address.`} />
          <Step n={2} text="Paste it below. We only read your balance and history, and can never move your tokens." />
          <View>
            <TextField
              label="Wallet address"
              value={input}
              onChangeText={(t) => {
                setInput(t);
                if (error) setError(undefined);
              }}
              error={error}
              placeholder="0x…"
              autoCapitalize="none"
              autoCorrect={false}
              spellCheck={false}
              returnKeyType="done"
              onSubmitEditing={connect}
            />
            <Pressable
              onPress={paste}
              accessibilityRole="button"
              accessibilityLabel="Paste address from clipboard"
              hitSlop={8}
              style={{ position: 'absolute', right: 12, top: 38 }}
            >
              <Text style={{ color: colors.primary, fontWeight: '700' }}>Paste</Text>
            </Pressable>
          </View>
          <Button label="Connect wallet" icon="link" onPress={connect} loading={busy === 'live'} disabled={!!busy} />
        </Card>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
          <View style={{ flex: 1, height: 1, backgroundColor: colors.border }} />
          <Text style={type.small}>or</Text>
          <View style={{ flex: 1, height: 1, backgroundColor: colors.border }} />
        </View>

        <Card style={{ gap: space.md }}>
          <View style={{ flexDirection: 'row', gap: space.md, alignItems: 'center' }}>
            <Ionicons name="sparkles" size={22} color={colors.gold} />
            <Text style={[type.h2, { flex: 1 }]}>Just looking around?</Text>
          </View>
          <Text style={[type.body, { color: colors.muted }]}>
            Explore the app with a sample wallet full of rewards activity.
          </Text>
          <Button
            label="Use demo wallet"
            variant="secondary"
            loading={busy === 'demo'}
            disabled={!!busy}
            onPress={async () => {
              setBusy('demo');
              await connectWallet({ address: DEMO_WALLET, mode: 'demo' });
            }}
          />
        </Card>

        <Button label="Sign out" variant="ghost" onPress={signOut} />
      </Screen>
    </KeyboardAvoidingView>
  );
}

function Step({ n, text }: { n: number; text: string }) {
  return (
    <View style={{ flexDirection: 'row', gap: space.md }}>
      <View
        style={{
          width: 26,
          height: 26,
          borderRadius: 13,
          backgroundColor: colors.primarySoft,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Text style={{ color: colors.primary, fontWeight: '800' }}>{n}</Text>
      </View>
      <Text style={[type.body, { flex: 1 }]}>{text}</Text>
    </View>
  );
}
