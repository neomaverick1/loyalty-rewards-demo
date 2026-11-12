import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { SessionProvider, useSession } from '@/state/session';
import { colors } from '@/theme';

function RootStack() {
  const { ready, user, wallet } = useSession();

  if (!ready) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  // Each screen group is only reachable in the right state: signed out ->
  // login, signed in without a wallet -> connect wallet, otherwise the app.
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }}>
      <Stack.Protected guard={!user}>
        <Stack.Screen name="login" />
      </Stack.Protected>
      <Stack.Protected guard={!!user && !wallet}>
        <Stack.Screen name="connect-wallet" />
      </Stack.Protected>
      <Stack.Protected guard={!!user && !!wallet}>
        <Stack.Screen name="(tabs)" />
      </Stack.Protected>
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <SessionProvider>
        <StatusBar style="dark" />
        <RootStack />
      </SessionProvider>
    </SafeAreaProvider>
  );
}
