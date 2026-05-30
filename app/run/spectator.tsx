import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  KeyboardAvoidingView, Platform, Alert,
} from 'react-native';
import { router } from 'expo-router';
import { Colors, FontSize, Spacing, Radius } from '../../src/constants/theme';
import { Input } from '../../src/components/Input';
import { Button } from '../../src/components/Button';
import { issueSocketToken } from '../../src/api/auth';

export default function SpectatorSetupScreen() {
  const [groupId, setGroupId] = useState('');
  const [loading, setLoading] = useState(false);

  const handleWatch = async () => {
    const gid = groupId.trim().toUpperCase();
    if (!gid) {
      Alert.alert('입력 오류', '그룹 코드를 입력해주세요.');
      return;
    }
    setLoading(true);
    try {
      const res = await issueSocketToken({ role: 'SPECTATOR', groupId: gid });
      router.push({
        pathname: '/run/spectator-active',
        params: { groupId: gid, socketToken: res.accessToken },
      });
    } catch (e: any) {
      Alert.alert('오류', e.message ?? '소켓 토큰 발급에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
      >
        {/* 안내 카드 */}
        <View style={styles.infoCard}>
          <Text style={styles.infoEmoji}>👀</Text>
          <Text style={styles.infoTitle}>관전 모드</Text>
          <Text style={styles.infoDesc}>
            그룹 코드를 입력하면 달리고 있는 러너들의 위치를 실시간 지도에서 확인할 수 있습니다.
          </Text>
        </View>

        <View style={styles.form}>
          <Input
            label="그룹 코드"
            placeholder="예: AAAA"
            value={groupId}
            onChangeText={(t) => setGroupId(t.toUpperCase())}
            autoCapitalize="characters"
            maxLength={20}
            autoFocus
          />
          <Text style={styles.hint}>
            러너에게 그룹 코드를 받아 입력하세요.
          </Text>
        </View>

        <Button
          title="관전 시작"
          onPress={handleWatch}
          loading={loading}
          fullWidth
          style={styles.watchBtn}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: Spacing[4],
    gap: Spacing[4],
    backgroundColor: Colors.background,
  },
  infoCard: {
    backgroundColor: '#1a2332',
    borderRadius: Radius.lg,
    padding: Spacing[5],
    alignItems: 'center',
    gap: Spacing[2],
    marginBottom: Spacing[2],
  },
  infoEmoji: { fontSize: 40 },
  infoTitle: {
    fontSize: FontSize.xl,
    fontWeight: '800',
    color: Colors.amber,
  },
  infoDesc: {
    fontSize: FontSize.sm,
    color: '#9ca3af',
    textAlign: 'center',
    lineHeight: 20,
  },
  form: { gap: Spacing[1] },
  hint: {
    fontSize: FontSize.xs,
    color: Colors.mutedForeground,
    marginBottom: Spacing[3],
    lineHeight: 16,
  },
  watchBtn: { marginTop: Spacing[2] },
});
