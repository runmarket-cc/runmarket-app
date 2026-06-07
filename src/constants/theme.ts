// runmarket-front의 디자인 토큰을 React Native로 포팅

export const Colors = {
  navy: '#232f3e',
  navyDark: '#1a2332',
  amber: '#ff9900',
  priceRed: '#B12704',
  statusGreen: '#067d62',
  statusAmber: '#ff9900',
  statusGray: '#6b7280',

  background: '#ffffff',
  foreground: '#111827',
  muted: '#f3f4f6',
  mutedForeground: '#6b7280',
  border: '#e5e7eb',
  borderDark: '#374151',
  rowDivider: '#1f2937',
  card: '#ffffff',

  white: '#ffffff',
  black: '#000000',

  gray400: '#9ca3af',
  destructive: '#dc2626',
  statusOnline: '#065f46',
  statusOffline: '#7f1d1d',
  modalBackdrop: 'rgba(0,0,0,0.6)',
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
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  5: 20,
  6: 24,
  8: 32,
} as const;

export const Radius = {
  sm: 6,
  md: 8,
  lg: 12,
  xl: 20,
  full: 9999,
} as const;
