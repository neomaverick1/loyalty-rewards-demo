export const colors = {
  bg: '#F5F6FA',
  card: '#FFFFFF',
  text: '#121826',
  muted: '#667085',
  border: '#E4E7EC',
  primary: '#3B2DB8',
  primaryDark: '#251B85',
  primarySoft: '#ECEAFD',
  gold: '#E9A93A',
  goldSoft: '#FDF3E1',
  earned: '#12805C',
  earnedSoft: '#E3F5EE',
  redeemed: '#C2410C',
  redeemedSoft: '#FDECE3',
  danger: '#C8102E',
  dangerSoft: '#FDE8EB',
  white: '#FFFFFF',
} as const;

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;
export const radius = { sm: 8, md: 12, lg: 18, pill: 999 } as const;

export const type = {
  title: { fontSize: 28, fontWeight: '800' as const, color: colors.text, letterSpacing: -0.5 },
  h2: { fontSize: 18, fontWeight: '700' as const, color: colors.text },
  body: { fontSize: 15, color: colors.text },
  label: { fontSize: 13, fontWeight: '600' as const, color: colors.muted },
  small: { fontSize: 12, color: colors.muted },
};
