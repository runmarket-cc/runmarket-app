import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { Colors, FontSize, Radius, Spacing } from '../constants/theme';

export type ButtonVariant =
  | 'default'
  | 'primary'
  | 'secondary'
  | 'destructive'
  | 'outline'
  | 'ghost'
  | 'link';

export type ButtonSize = 'default' | 'sm' | 'lg' | 'icon';

export interface ButtonProps {
  onPress?: () => void;
  title: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  fullWidth?: boolean;
  children?: React.ReactNode;
}

const sizeStyles: Record<ButtonSize, ViewStyle> = {
  default: {
    height: 48,
    paddingHorizontal: Spacing[4],
    borderRadius: Radius.md,
  },
  sm: {
    height: 36,
    paddingHorizontal: Spacing[3],
    borderRadius: Radius.sm,
  },
  lg: {
    height: 54,
    paddingHorizontal: Spacing[6],
    borderRadius: Radius.lg,
  },
  icon: {
    height: 44,
    width: 44,
    paddingHorizontal: 0,
    borderRadius: Radius.md,
  },
};

const textSizeStyles: Record<ButtonSize, TextStyle> = {
  default: {
    fontSize: FontSize.base,
    fontWeight: '700',
  },
  sm: {
    fontSize: FontSize.sm,
    fontWeight: '600',
  },
  lg: {
    fontSize: FontSize.lg,
    fontWeight: '800',
  },
  icon: {
    fontSize: FontSize.lg,
  },
};

/**
 * shadcn/ui Button 컴포넌트 (React Native)
 * www.runmarket.cc 디자인 토큰과 동일한 Amber / Dark Navy 기반.
 */
export function Button({
  onPress,
  title,
  variant = 'default',
  size = 'default',
  loading = false,
  disabled = false,
  style,
  textStyle,
  fullWidth = false,
}: ButtonProps) {
  const isDisabled = disabled || loading;
  const effectiveVariant = variant === 'primary' ? 'default' : variant;

  const getSpinnerColor = () => {
    switch (effectiveVariant) {
      case 'default':
        return Colors.navyDark;
      case 'destructive':
        return Colors.white;
      case 'outline':
      case 'ghost':
      case 'secondary':
        return Colors.amber;
      default:
        return Colors.amber;
    }
  };

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={isDisabled}
      style={[
        styles.base,
        sizeStyles[size],
        styles[effectiveVariant],
        fullWidth && styles.fullWidth,
        isDisabled && styles.disabled,
        style,
      ]}
      activeOpacity={0.8}
    >
      {loading ? (
        <ActivityIndicator size="small" color={getSpinnerColor()} />
      ) : (
        <Text
          style={[
            styles.text,
            textSizeStyles[size],
            styles[`${effectiveVariant}Text`],
            textStyle,
          ]}
        >
          {title}
        </Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  fullWidth: {
    width: '100%',
  },
  disabled: {
    opacity: 0.5,
  },

  // ── shadcn/ui Button Variants ──
  // Default (RunMarket Brand Amber)
  default: {
    backgroundColor: Colors.amber,
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
  },
  defaultText: {
    color: Colors.navyDark,
  },

  // Secondary
  secondary: {
    backgroundColor: Colors.navyDark,
    borderWidth: 1,
    borderColor: Colors.borderDark,
  },
  secondaryText: {
    color: Colors.white,
  },

  // Destructive
  destructive: {
    backgroundColor: Colors.destructive,
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
  },
  destructiveText: {
    color: Colors.white,
  },

  // Outline
  outline: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: Colors.borderDark,
  },
  outlineText: {
    color: Colors.foreground,
  },

  // Ghost
  ghost: {
    backgroundColor: 'transparent',
  },
  ghostText: {
    color: Colors.gray400,
  },

  // Link
  link: {
    backgroundColor: 'transparent',
    paddingHorizontal: 0,
    height: 'auto',
  },
  linkText: {
    color: Colors.amber,
    textDecorationLine: 'underline',
  },

  // ── Text Base ──
  text: {
    textAlign: 'center',
    letterSpacing: -0.2,
  },
});
