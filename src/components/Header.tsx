import React from 'react';
import { View, Text, StyleSheet, StatusBar, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, FontSize, Spacing } from '../constants/theme';

interface HeaderProps {
  title?: string;
  right?: React.ReactNode;
}

export function Header({ title = '런마켓', right }: HeaderProps) {
  const insets = useSafeAreaInsets();
  return (
    <>
      <StatusBar barStyle="light-content" backgroundColor={Colors.navy} />
      <View style={[styles.container, Platform.OS === 'ios' && { paddingTop: insets.top }]}>
        <Text style={styles.logo}>{title}</Text>
        {right && <View style={styles.right}>{right}</View>}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.navy,
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing[4],
    justifyContent: 'space-between',
  },
  logo: {
    color: Colors.amber,
    fontSize: FontSize.xl,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  right: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[2],
  },
});
