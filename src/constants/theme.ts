// runmarket-front 및 shadcn/ui 디자인 토큰을 React Native로 포팅

export const Colors = {
  // Brand Dark Theme Colors
  navy: '#232f3e',
  navyDark: '#1a2332',
  navyDeeper: '#0f172a',
  amber: '#ff9900',
  priceRed: '#B12704',
  statusGreen: '#067d62',
  statusAmber: '#ff9900',
  statusGray: '#6b7280',

  // shadcn/ui Core Semantic Tokens
  background: '#ffffff',
  foreground: '#0f172a',

  // Card & Popover
  card: '#1a2332',
  cardForeground: '#f8fafc',
  popover: '#1a2332',
  popoverForeground: '#f8fafc',

  // Primary (RunMarket Signature Amber)
  primary: '#ff9900',
  primaryForeground: '#1a2332',

  // Secondary
  secondary: '#232f3e',
  secondaryForeground: '#f8fafc',

  // Muted
  muted: '#f1f5f9',
  mutedDark: 'rgba(255, 255, 255, 0.05)',
  mutedForeground: '#64748b',

  // Accent
  accent: 'rgba(255, 153, 0, 0.12)',
  accentForeground: '#ff9900',

  // Destructive
  destructive: '#dc2626',
  destructiveForeground: '#ffffff',

  // Borders & Inputs
  border: '#e2e8f0',
  borderDark: '#374151',
  input: '#374151',
  ring: '#ff9900',

  rowDivider: '#1f2937',

  // Neutrals
  white: '#ffffff',
  black: '#000000',
  gray100: '#f1f5f9',
  gray200: '#e2e8f0',
  gray400: '#94a3b8',
  gray600: '#475569',
  gray800: '#1e293b',

  // Status indicators
  statusOnline: '#065f46',
  statusOffline: '#7f1d1d',
  modalBackdrop: 'rgba(0, 0, 0, 0.65)',
} as const;

export const FontSize = {
  xs: 11,
  sm: 13,
  base: 15,
  lg: 17,
  xl: 20,
  '2xl': 24,
  '3xl': 30,
} as const;

export const Spacing = {
  0.5: 2,
  1: 4,
  1.5: 6,
  2: 8,
  2.5: 10,
  3: 12,
  4: 16,
  5: 20,
  6: 24,
  8: 32,
  10: 40,
} as const;

export const Radius = {
  sm: 6,
  md: 8,
  lg: 12,
  xl: 16,
  '2xl': 20,
  full: 9999,
} as const;
