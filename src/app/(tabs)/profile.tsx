import Ionicons from '@expo/vector-icons/Ionicons';
import { useState, type ComponentProps } from 'react';
import { Text, View } from 'react-native';

import { AddressChip, Button, Card, Screen, TextField } from '@/components/ui';
import { CHAIN, REWARDS_TOKEN_ADDRESS } from '@/config';
import { shortenAddress } from '@/lib/format';
import { validateDisplayName } from '@/lib/validation';
import { useSession } from '@/state/session';
import { colors, space, type } from '@/theme';

export default function ProfileScreen() {
  const { user, wallet, updateProfile, disconnectWallet, signOut } = useSession();
  const [name, setName] = useState(user?.displayName ?? '');
  const [error, setError] = useState<string>();
  const [saved, setSaved] = useState(false);
  const dirty = name.trim() !== user?.displayName;

  async function save() {
    const e = validateDisplayName(name);
    setError(e);
    if (e) return;
    await updateProfile({ displayName: name.trim() });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  const initials = (user?.displayName ?? '?')
    .split(' ')
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <Screen tabbed title="Profile">
      <Card style={{ alignItems: 'center', gap: space.sm, paddingVertical: space.xl }}>
        <View
          style={{
            width: 76,
            height: 76,
            borderRadius: 38,
            backgroundColor: colors.primary,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text style={{ color: colors.white, fontSize: 28, fontWeight: '800' }}>{initials}</Text>
        </View>
        <Text style={type.h2}>{user?.displayName}</Text>
        <Text style={[type.body, { color: colors.muted }]}>{user?.email}</Text>
      </Card>

      <Card style={{ gap: space.md }}>
        <Text style={type.h2}>Account</Text>
        <TextField
          label="Display name"
          value={name}
          onChangeText={(t) => {
            setName(t);
            if (error) setError(validateDisplayName(t));
          }}
          error={error}
          maxLength={60}
          returnKeyType="done"
          onSubmitEditing={save}
        />
        <Button
          label={saved ? 'Saved' : 'Save changes'}
          icon={saved ? 'checkmark' : undefined}
          variant="secondary"
          onPress={save}
          disabled={!dirty && !saved}
        />
      </Card>

      <Card style={{ gap: space.md }}>
        <Text style={type.h2}>Wallet</Text>
        <AddressChip address={wallet!.address} />
        <Info icon="globe-outline" label="Network" value={wallet!.mode === 'live' ? CHAIN.name : 'Demo (sample data)'} />
        <Info icon="cube-outline" label="Rewards contract" value={wallet!.mode === 'live' ? shortenAddress(REWARDS_TOKEN_ADDRESS, 6) : 'Sample token'} />
        <Info icon="eye-outline" label="Access" value="Read-only" />
        <Button label="Switch wallet" variant="secondary" icon="swap-horizontal" onPress={disconnectWallet} />
      </Card>

      <Button label="Sign out" variant="danger" icon="log-out-outline" onPress={signOut} />
    </Screen>
  );
}

function Info({ icon, label, value }: { icon: ComponentProps<typeof Ionicons>['name']; label: string; value: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
      <Ionicons name={icon} size={18} color={colors.muted} />
      <Text style={[type.body, { color: colors.muted, flex: 1 }]}>{label}</Text>
      <Text style={[type.body, { fontWeight: '600' }]}>{value}</Text>
    </View>
  );
}
