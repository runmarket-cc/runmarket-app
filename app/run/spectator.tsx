import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  KeyboardAvoidingView, Platform, Alert,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, FontSize, Spacing, Radius } from '../../src/constants/theme';
import { Input } from '../../src/components/Input';
import { Button } from '../../src/components/Button';
import { issueSocketToken } from '../../src/api/auth';
import { getSpectatorSetupContent, SPECTATOR_SETUP_FALLBACK } from '../../src/api/content';
import { useScreenContent } from '../../src/hooks/useScreenContent';

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
  watchBtn: { marginTop: Spacing[2] },
});
