import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  KeyboardAvoidingView, Platform, Alert, TouchableOpacity,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, FontSize, Spacing, Radius } from '../../src/constants/theme';
import { Input } from '../../src/components/Input';
import { Button } from '../../src/components/Button';
import { issueSocketToken } from '../../src/api/auth';
import { getSpectatorSetupContent, SPECTATOR_SETUP_FALLBACK } from '../../src/api/content';
import { useScreenContent } from '../../src/hooks/useScreenContent';

import { AVAILABLE_COURSES } from '../../src/constants/courses';

export default function SpectatorSetupScreen() {
  const [groupId, setGroupId] = useState('');
  const [loading, setLoading] = useState(false);
  const insets = useSafeAreaInsets();

  const content = useScreenContent(getSpectatorSetupContent, SPECTATOR_SETUP_FALLBACK);

  const handleWatch = async () => {
    const gid = groupId.trim().toUpperCase();
    if (!gid) {
      Alert.alert(content.emptyFieldsAlert.title, content.emptyFieldsAlert.message);
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
      Alert.alert(content.tokenFailAlert.title, e.message ?? content.tokenFailAlert.message);
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
        contentContainerStyle={[styles.container, { paddingBottom: insets.bottom + Spacing[4] }]}
        keyboardShouldPersistTaps="handled"
      >
        {/* 안내 카드 */}
        <View style={styles.infoCard}>
          <Text style={styles.infoEmoji}>{content.info.emoji}</Text>
          <Text style={styles.infoTitle}>{content.info.title}</Text>
          <Text style={styles.infoDesc}>{content.info.desc}</Text>
        </View>

        <View style={styles.form}>
          <Input
            label={content.groupCode.label}
            placeholder={content.groupCode.placeholder}
            value={groupId}
            onChangeText={(t) => setGroupId(t.toUpperCase())}
            autoCapitalize="characters"
            maxLength={20}
            autoFocus
          />
          <Text style={styles.hint}>{content.groupCode.hint}</Text>

          {/* 추천 코스 퀵 선택 */}
          <View style={styles.quickCourseSection}>
            <Text style={styles.quickCourseLabel}>추천 코스 바로가기</Text>
            {AVAILABLE_COURSES.map((course) => {
              const active = groupId.trim().toLowerCase() === course.groupId.toLowerCase();
              return (
                <TouchableOpacity
                  key={course.id}
                  style={[styles.quickCourseChip, active && styles.quickCourseChipActive]}
                  onPress={() => setGroupId(course.groupId)}
                  activeOpacity={0.7}
                  accessibilityRole="button"
                  accessibilityLabel={`추천 코스 ${course.name} 선택`}
                  accessibilityState={{ selected: active }}
                >
                  <Text style={[styles.quickCourseChipText, active && styles.quickCourseChipTextActive]}>
                    {course.emoji} {course.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <Button
          title={content.watchButton}
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
    backgroundColor: Colors.navyDark,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.borderDark,
    padding: Spacing[5],
    alignItems: 'center',
    gap: Spacing[2],
    marginBottom: Spacing[2],
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  infoEmoji: { fontSize: 40 },
  infoTitle: {
    fontSize: FontSize.xl,
    fontWeight: '800',
    color: Colors.amber,
    letterSpacing: -0.3,
  },
  infoDesc: {
    fontSize: FontSize.sm,
    color: Colors.gray400,
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
  quickCourseSection: {
    marginTop: -Spacing[1],
    marginBottom: Spacing[3],
    gap: Spacing[1],
  },
  quickCourseLabel: {
    fontSize: FontSize.xs,
    fontWeight: '600',
    color: Colors.gray400,
  },
  quickCourseChip: {
    backgroundColor: Colors.navyDark,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: '#4F46E5',
    paddingVertical: 10,
    paddingHorizontal: Spacing[3],
    alignItems: 'center',
  },
  quickCourseChipActive: {
    backgroundColor: 'rgba(79, 70, 229, 0.25)',
    borderColor: '#6366F1',
  },
  quickCourseChipText: {
    color: '#818CF8',
    fontSize: FontSize.sm,
    fontWeight: '700',
  },
  quickCourseChipTextActive: {
    color: Colors.white,
  },
  watchBtn: { marginTop: Spacing[2] },
});
