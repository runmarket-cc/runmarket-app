import React, { useState } from 'react';
import {
  View,
  TextInput,
  Text,
  StyleSheet,
  TextInputProps,
  TouchableOpacity,
} from 'react-native';
import { Colors, FontSize, Radius, Spacing } from '../constants/theme';

export interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  secureToggle?: boolean;
}

/**
 * shadcn/ui Input 컴포넌트 (React Native)
 * 깔끔한 포커스 링, 일관된 폰트와 플레이스홀더, 에러 피드백 스타일 제공.
 */
export function Input({
  label,
  error,
  secureToggle,
  secureTextEntry,
  style,
  onFocus,
  onBlur,
  ...props
}: InputProps) {
  const [isSecure, setIsSecure] = useState(secureTextEntry ?? false);
  const [isFocused, setIsFocused] = useState(false);

  return (
    <View style={styles.wrapper}>
      {label && <Text style={styles.label}>{label}</Text>}
      <View
        style={[
          styles.inputRow,
          isFocused && styles.inputFocused,
          error ? styles.inputError : styles.inputNormal,
        ]}
      >
        <TextInput
          style={[styles.input, style]}
          placeholderTextColor={Colors.gray400}
          secureTextEntry={isSecure}
          autoCapitalize="none"
          onFocus={(e) => {
            setIsFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setIsFocused(false);
            onBlur?.(e);
          }}
          {...props}
        />
        {secureToggle && (
          <TouchableOpacity
            onPress={() => setIsSecure((v) => !v)}
            style={styles.toggleBtn}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={styles.toggleText}>{isSecure ? '표시' : '숨기기'}</Text>
          </TouchableOpacity>
        )}
      </View>
      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: Spacing[1.5],
  },
  label: {
    fontSize: FontSize.sm,
    fontWeight: '600',
    color: Colors.foreground,
    letterSpacing: -0.2,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: Radius.md,
    backgroundColor: Colors.white,
    height: 46,
    paddingHorizontal: Spacing[3],
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  inputNormal: {
    borderColor: Colors.border,
  },
  inputFocused: {
    borderColor: Colors.amber,
    borderWidth: 1.5,
  },
  inputError: {
    borderColor: Colors.destructive,
    borderWidth: 1.5,
  },
  input: {
    flex: 1,
    fontSize: FontSize.base,
    color: Colors.foreground,
    height: '100%',
  },
  toggleBtn: {
    paddingLeft: Spacing[2],
    justifyContent: 'center',
  },
  toggleText: {
    fontSize: FontSize.xs,
    fontWeight: '600',
    color: Colors.mutedForeground,
  },
  errorText: {
    fontSize: FontSize.xs,
    fontWeight: '500',
    color: Colors.destructive,
    marginTop: 2,
  },
});
