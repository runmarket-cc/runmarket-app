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

export default function RunnerSetupScreen() {
  const [groupId, setGroupId] = useState('');
  const [runnerId, setRunnerId] = useState('');
  const [loading, setLoading] = useState(false);

  const handleStart = async () => {
    const gid = groupId.trim().toUpperCase();
    const rid = runnerId.trim();
    if (!gid || !rid) {
      Alert.alert('입력 오류', '그룹 코드와 러너 ID를 모두 입력해주세요.');
      return;
    }

    setLoading(true);
    try {
      const res = await issueSocketToken({ role: 'RUNNER', groupId: gid, runnerId: rid });
      // 소켓 토큰을 파라미터로 넘겨 active 화면으로 이동
      router.push({
        pathname: '/run/runner-active',
        params: { groupId: gid, runnerId: rid, socketToken: res.accessToken },
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
          <Text style={styles.infoEmoji}>🏃</Text>
          <Text style={styles.infoTitle}>러너 모드</Text>
          <Text style={styles.infoDesc}>
            달리는 동안 내 위치가 실시간으로 관전자에게 공유됩니다.
          </Text>
        </View>

        {/* 입력 폼 */}
        <View style={styles.form}>
          <Input
            label="그룹 코드"
            placeholder="예: AAAA"
            value={groupId}
            onChangeText={(t) => setGroupId(t.toUpperCase())}
            autoCapitalize="characters"
            maxLength={20}
          />
          <Text style={styles.hint}>
            관전자가 이 코드로 입장합니다. 함께 달릴 그룹의 고유 코드를 정하세요.
          </Text>

          <Input
            label="러너 ID"
            placeholder="예: runner-1"
            value={runnerId}
            onChangeText={setRunnerId}
            autoCapitalize="none"
            maxLength={30}
          />
          <Text style={styles.hint}>
            같은 그룹 안에서 나를 구별하는 이름입니다.
          </Text>
        </View>

        <Button
          title="달리기 시작"
          onPress={handleStart}
          loading={loading}
          fullWidth
          style={styles.startBtn}
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
    backgroundColor: Colors.navy,
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
  startBtn: { marginTop: Spacing[2] },
});
