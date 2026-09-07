import React from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Linking,
  Platform,
} from 'react-native';
import { Colors, FontSize, Spacing, Radius } from '../constants/theme';

interface BatteryOptimizationGuideModalProps {
  visible: boolean;
  onClose: () => void;
}

/**
 * Android 10km 이상 장시간 러닝 시 백그라운드 GPS 차단(Doze/LMK) 방지를 위한
 * 배터리 "제한 없음(최적화 제외)" 설정 안내 모달.
 * 사용자가 시스템 설정 내 어디로 들어가야 하는지 구체적인 경로와 단계를 시각적으로 제공합니다.
 */
export function BatteryOptimizationGuideModal({
  visible,
  onClose,
}: BatteryOptimizationGuideModalProps) {
  if (Platform.OS !== 'android') return null;

  const handleOpenSettings = () => {
    Linking.openSettings();
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.card}>
          {/* 헤더 */}
          <View style={styles.header}>
            <View style={styles.iconCircle}>
              <Text style={styles.iconText}>⚡</Text>
            </View>
            <Text style={styles.title}>장시간 러닝 배터리 설정 안내</Text>
            <Text style={styles.subtitle}>
              화면이 꺼져도 10km 이상 위치 기록이 끊기지 않는 방법
            </Text>
          </View>

          <ScrollView
            style={styles.scrollArea}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* 왜 설정해야 하나요? */}
            <View style={styles.reasonBox}>
              <Text style={styles.sectionLabel}>왜 설정이 필요한가요?</Text>
              <Text style={styles.reasonText}>
                Android OS는 화면이 꺼진 채로 <Text style={styles.highlightText}>장시간(10km 이상, 약 50분~1시간 이상)</Text> 달릴 때, 배터리를 아끼기 위해 런마켓의 백그라운드 GPS 위치 기록을 절전 상태로 전환하거나 강제로 중단시킬 수 있습니다.
              </Text>
            </View>

            {/* 설정 단계 (3 Step 안내) */}
            <View style={styles.stepSection}>
              <Text style={styles.sectionLabel}>설정 위치 및 방법 (3단계)</Text>

              {/* Step 1 */}
              <View style={styles.stepItem}>
                <View style={styles.stepBadge}>
                  <Text style={styles.stepBadgeText}>1</Text>
                </View>
                <View style={styles.stepContent}>
                  <Text style={styles.stepTitle}>아래 [설정 열기] 버튼 클릭</Text>
                  <Text style={styles.stepDesc}>
                    런마켓의 스마트폰 <Text style={styles.boldText}>애플리케이션 정보</Text> 화면으로 이동합니다.
                  </Text>
                </View>
              </View>

              {/* Step 2 */}
              <View style={styles.stepItem}>
                <View style={styles.stepBadge}>
                  <Text style={styles.stepBadgeText}>2</Text>
                </View>
                <View style={styles.stepContent}>
                  <Text style={styles.stepTitle}>[배터리] 메뉴 터치</Text>
                  <Text style={styles.stepDesc}>
                    화면을 조금 내려 <Text style={styles.boldAmber}>'배터리'</Text> (또는 '앱 배터리 사용량') 메뉴를 선택합니다.
                  </Text>
                </View>
              </View>

              {/* Step 3 */}
              <View style={styles.stepItem}>
                <View style={styles.stepBadge}>
                  <Text style={styles.stepBadgeText}>3</Text>
                </View>
                <View style={styles.stepContent}>
                  <Text style={styles.stepTitle}>['제한 없음'] 선택</Text>
                  <Text style={styles.stepDesc}>
                    기본값 '최적화됨' 대신 <Text style={styles.boldAmber}>'제한 없음'</Text>(또는 최적화 안 함)을 선택하면 완료됩니다.
                  </Text>
                </View>
              </View>
            </View>

            {/* 기종별 경로 팁 */}
            <View style={styles.tipBox}>
              <Text style={styles.tipTitle}>📱 기기별 메뉴 경로</Text>
              <Text style={styles.tipItem}>
                • <Text style={styles.boldText}>삼성 갤럭시:</Text> 앱 정보 ➔ <Text style={styles.boldAmber}>배터리</Text> ➔ <Text style={styles.boldAmber}>'제한 없음'</Text>
              </Text>
              <Text style={styles.tipItem}>
                • <Text style={styles.boldText}>구글 픽셀/기타:</Text> 앱 정보 ➔ <Text style={styles.boldAmber}>앱 배터리 사용량</Text> ➔ <Text style={styles.boldAmber}>'제한 없음'</Text>
              </Text>
            </View>
          </ScrollView>

          {/* 하단 버튼 영역 */}
          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={[styles.button, styles.closeButton]}
              onPress={onClose}
              activeOpacity={0.7}
            >
              <Text style={styles.closeButtonText}>닫기</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, styles.openSettingsButton]}
              onPress={handleOpenSettings}
              activeOpacity={0.8}
            >
              <Text style={styles.openSettingsButtonText}>설정 열기</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: Colors.modalBackdrop,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing[4],
  },
  card: {
    width: '100%',
    maxWidth: 390,
    maxHeight: '88%',
    backgroundColor: Colors.navy,
    borderRadius: Radius.xl,
    padding: Spacing[5],
    borderWidth: 1,
    borderColor: Colors.borderDark,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 10,
  },
  header: {
    alignItems: 'center',
    marginBottom: Spacing[3],
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 153, 0, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing[2],
  },
  iconText: {
    fontSize: 24,
  },
  title: {
    fontSize: FontSize.lg,
    fontWeight: '800',
    color: Colors.white,
    textAlign: 'center',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: FontSize.xs,
    color: Colors.gray400,
    textAlign: 'center',
  },
  scrollArea: {
    maxHeight: 330,
    marginVertical: Spacing[2],
  },
  scrollContent: {
    gap: Spacing[3],
  },
  sectionLabel: {
    fontSize: FontSize.xs,
    fontWeight: '700',
    color: Colors.gray400,
    marginBottom: Spacing[1],
  },
  reasonBox: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: Radius.md,
    padding: Spacing[3],
  },
  reasonText: {
    fontSize: FontSize.xs,
    color: Colors.white,
    lineHeight: 18,
  },
  highlightText: {
    fontWeight: '700',
    color: Colors.amber,
  },
  stepSection: {
    backgroundColor: 'rgba(255, 153, 0, 0.08)',
    borderRadius: Radius.md,
    padding: Spacing[3],
    borderLeftWidth: 3,
    borderLeftColor: Colors.amber,
    gap: Spacing[3],
  },
  stepItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing[2],
  },
  stepBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: Colors.amber,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  stepBadgeText: {
    fontSize: FontSize.xs,
    fontWeight: '800',
    color: Colors.navyDark,
  },
  stepContent: {
    flex: 1,
  },
  stepTitle: {
    fontSize: FontSize.sm,
    fontWeight: '700',
    color: Colors.white,
    marginBottom: 2,
  },
  stepDesc: {
    fontSize: FontSize.xs,
    color: Colors.gray400,
    lineHeight: 17,
  },
  boldText: {
    fontWeight: '700',
    color: Colors.white,
  },
  boldAmber: {
    fontWeight: '700',
    color: Colors.amber,
  },
  tipBox: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: Radius.md,
    padding: Spacing[3],
    gap: Spacing[1],
  },
  tipTitle: {
    fontSize: FontSize.xs,
    fontWeight: '700',
    color: Colors.gray400,
    marginBottom: 2,
  },
  tipItem: {
    fontSize: FontSize.xs,
    color: Colors.gray400,
    lineHeight: 18,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: Spacing[2],
    marginTop: Spacing[3],
  },
  button: {
    flex: 1,
    paddingVertical: Spacing[3],
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButton: {
    backgroundColor: Colors.borderDark,
  },
  closeButtonText: {
    fontSize: FontSize.sm,
    fontWeight: '600',
    color: Colors.gray400,
  },
  openSettingsButton: {
    backgroundColor: Colors.amber,
  },
  openSettingsButtonText: {
    fontSize: FontSize.sm,
    fontWeight: '700',
    color: Colors.navyDark,
  },
});
