import Ionicons from '@expo/vector-icons/Ionicons';
import * as Clipboard from 'expo-clipboard';
import { useEffect, useState, type ComponentProps, type ComponentRef, type ReactNode, type Ref } from 'react';
import {
  ActivityIndicator,
  Animated,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { shortenAddress } from '@/lib/format';
import { colors, radius, space, type } from '@/theme';

type IconName = ComponentProps<typeof Ionicons>['name'];

export function Screen({
  title,
  subtitle,
  children,
  refreshing,
  onRefresh,
  tabbed = false,
}: {
  title?: string;
  subtitle?: string;
  children: ReactNode;
  refreshing?: boolean;
  onRefresh?: () => void;
  /** Inside the tab bar, which already handles the bottom inset. */
  tabbed?: boolean;
}) {
  const insets = useSafeAreaInsets();
  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.bg }}
      contentContainerStyle={{
        paddingTop: insets.top + space.lg,
        paddingBottom: (tabbed ? 0 : insets.bottom) + space.xxl,
        paddingHorizontal: space.lg,
        gap: space.lg,
        maxWidth: 640,
        width: '100%',
        alignSelf: 'center',
      }}
      keyboardShouldPersistTaps="handled"
      refreshControl={
        onRefresh ? <RefreshControl refreshing={!!refreshing} onRefresh={onRefresh} tintColor={colors.primary} /> : undefined
      }
    >
      {title ? (
        <View style={{ gap: 2 }}>
          <Text style={type.title} accessibilityRole="header">
            {title}
          </Text>
          {subtitle ? <Text style={[type.body, { color: colors.muted }]}>{subtitle}</Text> : null}
        </View>
      ) : null}
      {children}
    </ScrollView>
  );
}

export function Card({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function Button({
  label,
  onPress,
  variant = 'primary',
  loading,
  disabled,
  icon,
}: {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  loading?: boolean;
  disabled?: boolean;
  icon?: IconName;
}) {
  const v = buttonVariants[variant];
  const off = disabled || loading;
  return (
    <Pressable
      onPress={onPress}
      disabled={off}
      accessibilityRole="button"
      accessibilityState={{ disabled: !!off, busy: !!loading }}
      style={({ pressed }) => [styles.button, v.box, pressed && { opacity: 0.85 }, off && { opacity: 0.55 }]}
    >
      {loading ? (
        <ActivityIndicator color={v.text.color} />
      ) : (
        <>
          {icon ? <Ionicons name={icon} size={18} color={v.text.color} /> : null}
          <Text style={[styles.buttonText, v.text]}>{label}</Text>
        </>
      )}
    </Pressable>
  );
}

const buttonVariants = {
  primary: { box: { backgroundColor: colors.primary }, text: { color: colors.white } },
  secondary: { box: { backgroundColor: colors.primarySoft }, text: { color: colors.primary } },
  ghost: { box: { backgroundColor: 'transparent' }, text: { color: colors.primary } },
  danger: { box: { backgroundColor: colors.dangerSoft }, text: { color: colors.danger } },
};

export function TextField({
  label,
  error,
  ref,
  ...props
}: TextInputProps & { label: string; error?: string; ref?: Ref<ComponentRef<typeof TextInput>> }) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={{ gap: 6 }}>
      <Text style={type.label}>{label}</Text>
      <TextInput
        ref={ref}
        placeholderTextColor="#98A2B3"
        {...props}
        onFocus={(e) => {
          setFocused(true);
          props.onFocus?.(e);
        }}
        onBlur={(e) => {
          setFocused(false);
          props.onBlur?.(e);
        }}
        accessibilityLabel={label}
        style={[
          styles.input,
          focused && { borderColor: colors.primary },
          !!error && { borderColor: colors.danger, backgroundColor: '#FFFAFA' },
        ]}
      />
      {error ? (
        <Text style={styles.fieldError} accessibilityLiveRegion="polite">
          {error}
        </Text>
      ) : null}
    </View>
  );
}

/** Pulsing placeholder block shown while data loads. */
export function Skeleton({ height = 16, width = '100%', style }: { height?: number; width?: number | `${number}%`; style?: StyleProp<ViewStyle> }) {
  const [pulse] = useState(() => new Animated.Value(0.5));
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0.5, duration: 700, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);
  return <Animated.View style={[{ height, width, borderRadius: radius.sm, backgroundColor: '#E6E8F0', opacity: pulse }, style]} />;
}

export function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <Card style={{ alignItems: 'center', gap: space.md, paddingVertical: space.xl }}>
      <View style={[styles.iconBubble, { backgroundColor: colors.dangerSoft }]}>
        <Ionicons name="cloud-offline-outline" size={26} color={colors.danger} />
      </View>
      <Text style={[type.body, { textAlign: 'center' }]}>{message}</Text>
      <Button label="Try again" icon="refresh" variant="secondary" onPress={onRetry} />
    </Card>
  );
}

export function EmptyState({ icon, title, message }: { icon: IconName; title: string; message: string }) {
  return (
    <Card style={{ alignItems: 'center', gap: space.sm, paddingVertical: space.xl }}>
      <View style={[styles.iconBubble, { backgroundColor: colors.primarySoft }]}>
        <Ionicons name={icon} size={26} color={colors.primary} />
      </View>
      <Text style={type.h2}>{title}</Text>
      <Text style={[type.body, { color: colors.muted, textAlign: 'center' }]}>{message}</Text>
    </Card>
  );
}

/** Shortened wallet address that copies the full address when tapped. */
export function AddressChip({ address, light = false }: { address: string; light?: boolean }) {
  const [copied, setCopied] = useState(false);
  const fg = light ? colors.white : colors.primary;
  return (
    <Pressable
      onPress={async () => {
        await Clipboard.setStringAsync(address);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
      accessibilityRole="button"
      accessibilityLabel={`Wallet address ${address}. Tap to copy.`}
      style={[styles.chip, { backgroundColor: light ? 'rgba(255,255,255,0.16)' : colors.primarySoft }]}
    >
      <Ionicons name={copied ? 'checkmark' : 'wallet-outline'} size={14} color={fg} />
      <Text style={{ color: fg, fontWeight: '600', fontSize: 13, fontVariant: ['tabular-nums'] }}>
        {copied ? 'Copied' : shortenAddress(address)}
      </Text>
    </Pressable>
  );
}

export function Badge({ label, tone }: { label: string; tone: 'live' | 'demo' }) {
  const live = tone === 'live';
  return (
    <View style={[styles.badge, { backgroundColor: live ? colors.earnedSoft : colors.goldSoft }]}>
      <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: live ? colors.earned : colors.gold }} />
      <Text style={{ fontSize: 11, fontWeight: '700', color: live ? colors.earned : '#9A6510' }}>{label}</Text>
    </View>
  );
}

export const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: space.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  button: {
    minHeight: 50,
    borderRadius: radius.md,
    paddingHorizontal: space.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.sm,
  },
  buttonText: { fontSize: 16, fontWeight: '700' },
  input: {
    minHeight: 50,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: space.md,
    fontSize: 16,
    color: colors.text,
    backgroundColor: colors.white,
  },
  fieldError: { color: colors.danger, fontSize: 13 },
  iconBubble: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.pill,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.pill,
  },
});
