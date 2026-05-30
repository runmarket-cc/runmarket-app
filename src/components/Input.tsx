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

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  secureToggle?: boolean;
}

export function Input({ label, error, secureToggle, secureTextEntry, style, ...props }: InputProps) {
  const [isSecure, setIsSecure] = useState(secureTextEntry ?? false);

  return (
    <View style={styles.wrapper}>
      {label && <Text style={styles.label}>{label}</Text>}
      <View style={[styles.inputRow, error ? styles.inputError : styles.inputNormal]}>
        <TextInput
          style={[styles.input, style]}
          placeholderTextColor={Colors.mutedForeground}
          secureTextEntry={isSecure}
          autoCapitalize="none"
          {...props}
        />
        {secureToggle && (
          <TouchableOpacity onPress={() => setIsSecure((v) => !v)} style={styles.toggleBtn}>
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
    gap: Spacing[1],
  },
  label: {
    fontSize: FontSize.sm,
    fontWeight: '500',
    color: Colors.foreground,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: Radius.md,
    backgroundColor: Colors.white,
    height: 44,
    paddingHorizontal: Spacing[3],
  },
  inputNormal: {
    borderColor: Colors.border,
  },
  inputError: {
    borderColor: '#ef4444',
  },
  input: {
    flex: 1,
    fontSize: FontSize.base,
    color: Colors.foreground,
  },
  toggleBtn: {
    paddingLeft: Spacing[2],
  },
  toggleText: {
    fontSize: FontSize.xs,
    color: Colors.mutedForeground,
  },
  errorText: {
    fontSize: FontSize.xs,
    color: '#ef4444',
  },
});
