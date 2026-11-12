import Ionicons from '@expo/vector-icons/Ionicons';
import { useRef, useState, type ComponentRef } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, Text, View, type TextInput } from 'react-native';

import { Button, Card, Screen, TextField } from '@/components/ui';
import { validateLogin, type FieldErrors } from '@/lib/validation';
import { useSession } from '@/state/session';
import { colors, space, type } from '@/theme';

export default function LoginScreen() {
  const { signIn } = useSession();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const passwordRef = useRef<ComponentRef<typeof TextInput>>(null);

  // Errors appear after the first submit, then update live as the user types.
  const errors: FieldErrors<'email' | 'password'> = submitted ? validateLogin(email, password) : {};

  async function onSubmit() {
    setSubmitted(true);
    setFormError(null);
    if (Object.keys(validateLogin(email, password)).length) return;
    setBusy(true);
    try {
      await signIn(email, password);
    } catch {
      setFormError('We couldn’t sign you in. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Screen>
        <View style={{ alignItems: 'center', gap: space.md, marginTop: space.xxl, marginBottom: space.md }}>
          <View
            style={{
              width: 72,
              height: 72,
              borderRadius: 22,
              backgroundColor: colors.primary,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Ionicons name="gift" size={36} color={colors.gold} />
          </View>
          <Text style={type.title}>Welcome back</Text>
          <Text style={[type.body, { color: colors.muted, textAlign: 'center' }]}>
            Sign in to see your points and rewards.
          </Text>
        </View>

        <Card style={{ gap: space.lg }}>
          <TextField
            label="Email"
            value={email}
            onChangeText={setEmail}
            error={errors.email}
            placeholder="you@example.com"
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            textContentType="emailAddress"
            returnKeyType="next"
            onSubmitEditing={() => passwordRef.current?.focus()}
          />
          <View>
            <TextField
              ref={passwordRef}
              label="Password"
              value={password}
              onChangeText={setPassword}
              error={errors.password}
              placeholder="At least 8 characters"
              secureTextEntry={!showPassword}
              autoComplete="password"
              textContentType="password"
              returnKeyType="go"
              onSubmitEditing={onSubmit}
            />
            <Pressable
              onPress={() => setShowPassword((s) => !s)}
              accessibilityRole="button"
              accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
              hitSlop={10}
              style={{ position: 'absolute', right: 14, top: 38 }}
            >
              <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={20} color={colors.muted} />
            </Pressable>
          </View>

          {formError ? <Text style={{ color: colors.danger }}>{formError}</Text> : null}
          <Button label="Sign in" onPress={onSubmit} loading={busy} />
        </Card>

        <Text style={[type.small, { textAlign: 'center' }]}>
          Phase One is frontend only: any valid email and an 8+ character password signs you in.
        </Text>
      </Screen>
    </KeyboardAvoidingView>
  );
}
