import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { Header } from '../../src/components/Header';
import { Colors, FontSize, Spacing, Radius } from '../../src/constants/theme';

export default function RunScreen() {
  return (
    <View style={styles.container}>
      <Header title="런" />
      <View style={styles.content}>
        <Text style={styles.subtitle}>오늘 어떻게 달릴까요?</Text>

        <TouchableOpacity
          style={styles.roleCard}
          onPress={() => router.push('/run/runner' as any)}
          activeOpacity={0.85}
        >
          <Text style={styles.roleEmoji}>🏃</Text>
          <View style={styles.roleInfo}>
            <Text style={styles.roleTitle}>러너로 달리기</Text>
            <Text style={styles.roleDesc}>내 위치를 실시간으로 공유하며 달립니다</Text>
          </View>
          <Text style={styles.arrow}>›</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.roleCard, styles.spectatorCard]}
          onPress={() => router.push('/run/spectator' as any)}
          activeOpacity={0.85}
        >
          <Text style={styles.roleEmoji}>👀</Text>
          <View style={styles.roleInfo}>
            <Text style={styles.roleTitle}>관전하기</Text>
            <Text style={styles.roleDesc}>러너의 실시간 위치를 지도에서 확인합니다</Text>
          </View>
          <Text style={styles.arrow}>›</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: {
    flex: 1,
    padding: Spacing[4],
    gap: Spacing[4],
  },
  subtitle: {
    fontSize: FontSize.lg,
    fontWeight: '700',
    color: Colors.foreground,
    marginTop: Spacing[4],
    marginBottom: Spacing[2],
  },
  roleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[4],
    backgroundColor: Colors.navy,
    borderRadius: Radius.lg,
    padding: Spacing[5],
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
  },
  spectatorCard: {
    backgroundColor: '#1a2332',
  },
  roleEmoji: { fontSize: 36 },
  roleInfo: { flex: 1 },
  roleTitle: {
    fontSize: FontSize.lg,
    fontWeight: '700',
    color: Colors.amber,
    marginBottom: 4,
  },
  roleDesc: {
    fontSize: FontSize.sm,
    color: '#9ca3af',
    lineHeight: 18,
  },
  arrow: {
    fontSize: 24,
    color: Colors.amber,
    fontWeight: '300',
  },
});
