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

export default function RunnerSetupScreen() {
  const [groupId, setGroupId] = useState('');
  const [runnerId, setRunnerId] = useState('');
  const [selectedColor, setSelectedColor] = useState<string | null>(null);
  const [pickerVisible, setPickerVisible] = useState(false);
  const [tempColor, setTempColor] = useState('#ff9900');
  const [loading, setLoading] = useState(false);

  const insets = useSafeAreaInsets();
  const previewColor = selectedColor ?? getRunnerColor(runnerId.trim() || 'default');

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
      const color = selectedColor ?? getRunnerColor(rid);
      router.push({
        pathname: '/run/runner-active',
        params: { groupId: gid, runnerId: rid, socketToken: res.accessToken, color },
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

          {/* 색상 선택 */}
          <Text style={styles.colorLabel}>내 색상</Text>
          <TouchableOpacity
            style={styles.colorPickerBtn}
            onPress={() => { setTempColor(previewColor); setPickerVisible(true); }}
            activeOpacity={0.8}
          >
            <View style={[styles.colorDot, { backgroundColor: previewColor }]} />
            <Text style={styles.colorPickerBtnText}>
              {selectedColor ? selectedColor.toUpperCase() : '자동 배정 (탭하여 변경)'}
            </Text>
          </TouchableOpacity>
          <Text style={styles.hint}>
            지도와 러너 목록에서 나를 표시할 색상입니다. 선택하지 않으면 러너 ID 기반으로 자동 배정됩니다.
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

      {/* 컬러 휠 모달 */}
      <Modal visible={pickerVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>내 마커 색상 선택</Text>
            <Text style={styles.modalDesc}>
              지도와 러너 목록에서 나를 나타낼 색상을 골라주세요.
            </Text>

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
                <Text style={styles.modalBtnText}>취소</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: tempColor }]}
                onPress={() => { setSelectedColor(tempColor); setPickerVisible(false); }}
              >
                <Text style={styles.modalBtnText}>확인</Text>
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
