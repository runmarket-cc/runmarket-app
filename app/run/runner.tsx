import React, { useRef, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  KeyboardAvoidingView, Platform, Alert,
  TouchableOpacity, Modal,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import ColorPicker from 'react-native-wheel-color-picker';
import { Colors, FontSize, Spacing, Radius } from '../../src/constants/theme';
import { Input } from '../../src/components/Input';
import { Button } from '../../src/components/Button';
import { issueSocketToken } from '../../src/api/auth';
import { getRunnerColor } from '../../src/components/RunnerListPanel';
import { getRunnerSetupContent, RUNNER_SETUP_FALLBACK } from '../../src/api/content';
import { useScreenContent } from '../../src/hooks/useScreenContent';

export default function RunnerSetupScreen() {
  const [groupId, setGroupId] = useState('');
  const [runnerId, setRunnerId] = useState('');
  const [selectedColor, setSelectedColor] = useState<string | null>(null);
  const [pickerVisible, setPickerVisible] = useState(false);
  const [tempColor, setTempColor] = useState('#ff9900');
  const [loading, setLoading] = useState(false);

  const content = useScreenContent(getRunnerSetupContent, RUNNER_SETUP_FALLBACK);

  const insets = useSafeAreaInsets();
  const previewColor = selectedColor ?? getRunnerColor(runnerId.trim() || 'default');

  const handleStart = async () => {
    const gid = groupId.trim().toUpperCase();
    const rid = runnerId.trim();
    if (!gid || !rid) {
      Alert.alert(content.emptyFieldsAlert.title, content.emptyFieldsAlert.message);
      return;
    }

    setLoading(true);
    try {
      const res = await issueSocketToken({ role: 'RUNNER', groupId: gid, runnerId: rid });
      const color = selectedColor ?? getRunnerColor(rid);
      router.push({
        pathname: '/run/runner-active',
        params: { groupId: gid, runnerId: rid, socketToken: res.accessToken, color },
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

        {/* 입력 폼 */}
        <View style={styles.form}>
          <Input
            label={content.groupCode.label}
            placeholder={content.groupCode.placeholder}
            value={groupId}
            onChangeText={(t) => setGroupId(t.toUpperCase())}
            autoCapitalize="characters"
            maxLength={20}
          />
          <Text style={styles.hint}>{content.groupCode.hint}</Text>

          <Input
            label={content.runnerId.label}
            placeholder={content.runnerId.placeholder}
            value={runnerId}
            onChangeText={setRunnerId}
            autoCapitalize="none"
            maxLength={30}
          />
          <Text style={styles.hint}>{content.runnerId.hint}</Text>

          {/* 색상 선택 */}
          <Text style={styles.colorLabel}>{content.colorLabel}</Text>
          <TouchableOpacity
            style={styles.colorPickerBtn}
            onPress={() => { setTempColor(previewColor); setPickerVisible(true); }}
            activeOpacity={0.8}
          >
            <View style={[styles.colorDot, { backgroundColor: previewColor }]} />
            <Text style={styles.colorPickerBtnText}>
              {selectedColor ? selectedColor.toUpperCase() : content.colorAutoText}
            </Text>
          </TouchableOpacity>
          <Text style={styles.hint}>{content.colorHint}</Text>
        </View>

        <Button
          title={content.startButton}
          onPress={handleStart}
          loading={loading}
          fullWidth
          style={styles.startBtn}
        />
      </ScrollView>

      {/* 컬러 휠 모달 */}
      <Modal visible={pickerVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>{content.colorModalTitle}</Text>
            <Text style={styles.modalDesc}>{content.colorModalDesc}</Text>

            {/* 선택 색상 미리보기 */}
            <View style={styles.previewRow}>
              <View style={[styles.previewMarker, { backgroundColor: tempColor }]}>
                <Text style={styles.previewEmoji}>🏃</Text>
              </View>
              <Text style={styles.previewHex}>{tempColor.toUpperCase()}</Text>
            </View>

            <View style={styles.pickerWrap}>
              <ColorPicker
                color={tempColor}
                onColorChange={(c) => setTempColor(c)}
                thumbSize={28}
                sliderSize={28}
                noSnap
                row={false}
              />
            </View>

            <View style={[styles.modalBtns, { paddingBottom: insets.bottom }]}>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalBtnCancel]}
                onPress={() => setPickerVisible(false)}
              >
                <Text style={styles.modalBtnText}>{content.cancelButton}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: tempColor }]}
                onPress={() => { setSelectedColor(tempColor); setPickerVisible(false); }}
              >
                <Text style={styles.modalBtnText}>{content.confirmButton}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  startBtn: { marginTop: Spacing[2] },

  colorLabel: {
    fontSize: FontSize.sm,
    fontWeight: '600',
    color: Colors.white,
    marginTop: Spacing[3],
    marginBottom: Spacing[2],
  },
  colorPickerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[3],
    backgroundColor: Colors.navy,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing[4],
    paddingVertical: Spacing[3],
  },
  colorDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: Colors.white,
  },
  colorPickerBtnText: {
    fontSize: FontSize.sm,
    color: Colors.white,
    fontWeight: '600',
  },

  // 모달
  modalOverlay: {
    flex: 1,
    backgroundColor: Colors.modalBackdrop,
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: Colors.navy,
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    padding: Spacing[5],
    gap: Spacing[4],
  },
  modalTitle: {
    fontSize: FontSize.lg,
    fontWeight: '800',
    color: Colors.white,
    textAlign: 'center',
  },
  modalDesc: {
    fontSize: FontSize.sm,
    color: Colors.gray400,
    textAlign: 'center',
    lineHeight: 20,
  },
  previewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing[3],
  },
  previewMarker: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewEmoji: { fontSize: 20 },
  previewHex: {
    fontSize: FontSize.base,
    fontWeight: '700',
    color: Colors.white,
    letterSpacing: 1,
  },
  pickerWrap: { height: 280 },
  modalBtns: {
    flexDirection: 'row',
    gap: Spacing[3],
  },
  modalBtn: {
    flex: 1,
    paddingVertical: Spacing[3],
    borderRadius: Radius.md,
    alignItems: 'center',
  },
  modalBtnCancel: { backgroundColor: Colors.borderDark },
  modalBtnText: { color: Colors.white, fontWeight: '700', fontSize: FontSize.sm },
});
