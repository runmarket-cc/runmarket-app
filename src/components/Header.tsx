import React from 'react';
import { View, Text, StyleSheet, StatusBar } from 'react-native';
import { Colors, FontSize, Spacing } from '../constants/theme';

interface HeaderProps {
  title?: string;
  right?: React.ReactNode;
}

export function Header({ title = '런마켓', right }: HeaderProps) {
  return (
    <>
      <StatusBar barStyle="light-content" backgroundColor={Colors.navy} />
      <View style={styles.container}>
        <Text style={styles.logo}>{title}</Text>
        {right && <View style={styles.right}>{right}</View>}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.navy,
    height: 56,
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
