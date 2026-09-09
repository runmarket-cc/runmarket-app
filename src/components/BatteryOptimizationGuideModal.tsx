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
 * shadcn/ui Dialog 및 Card 패턴 기반.
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
        <View style={styles.dialogContent}>
          {/* Dialog Header */}
          <View style={styles.dialogHeader}>
            <View style={styles.iconBadge}>
              <Text style={styles.iconText}>⚡</Text>
            </View>
            <Text style={styles.dialogTitle}>장시간 러닝 배터리 설정 안내</Text>
            <Text style={styles.dialogDescription}>
              화면이 꺼져도 10km 이상 위치 기록이 끊기지 않는 방법
            </Text>
          </View>

          <ScrollView
            style={styles.dialogBody}
            contentContainerStyle={styles.bodyContent}
            showsVerticalScrollIndicator={false}
          >
            {/* shadcn Alert 형태의 사유 고지 박스 */}
            <View style={styles.alertBox}>
              <View style={styles.alertTitleRow}>
                <View style={styles.alertDot} />
                <Text style={styles.alertTitle}>왜 설정이 필요한가요?</Text>
              </View>
              <Text style={styles.alertText}>
                Android OS는 화면이 꺼진 채로 <Text style={styles.highlightText}>장시간(10km 이상, 50분 이상)</Text> 달릴 때 배터리 절전을 위해 런마켓의 백그라운드 GPS 추적을 강제로 중단시킬 수 있습니다.
              </Text>
            </View>

            {/* 설정 단계 (3 Step 안내 카드) */}
            <View style={styles.stepCard}>
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
                    화면을 내려 <Text style={styles.boldAmber}>'배터리'</Text> (또는 '앱 배터리 사용량') 메뉴를 선택합니다.
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
                    기본값 대신 <Text style={styles.boldAmber}>'제한 없음'</Text>(또는 최적화 안 함)을 선택하면 완료됩니다.
                  </Text>
                </View>
              </View>
            </View>

            {/* 기종별 경로 팁 카드 */}
            <View style={styles.tipCard}>
              <Text style={styles.tipTitle}>📱 기기별 메뉴 경로</Text>
              <Text style={styles.tipItem}>
                • <Text style={styles.boldText}>삼성 갤럭시:</Text> 앱 정보 ➔ <Text style={styles.boldAmber}>배터리</Text> ➔ <Text style={styles.boldAmber}>'제한 없음'</Text>
              </Text>
              <Text style={styles.tipItem}>
                • <Text style={styles.boldText}>구글 픽셀/기타:</Text> 앱 정보 ➔ <Text style={styles.boldAmber}>앱 배터리 사용량</Text> ➔ <Text style={styles.boldAmber}>'제한 없음'</Text>
              </Text>
            </View>
          </ScrollView>

          {/* Dialog Footer (shadcn Buttons) */}
          <View style={styles.dialogFooter}>
            <TouchableOpacity
              style={[styles.button, styles.outlineButton]}
              onPress={onClose}
              activeOpacity={0.7}
            >
              <Text style={styles.outlineButtonText}>닫기</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, styles.primaryButton]}
              onPress={handleOpenSettings}
              activeOpacity={0.8}
            >
              <Text style={styles.primaryButtonText}>설정 열기</Text>
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
  // shadcn Dialog Container
  dialogContent: {
    width: '100%',
    maxWidth: 380,
    maxHeight: '88%',
    backgroundColor: Colors.navyDark, // #1a2332
    borderRadius: Radius.lg, // 12
    borderWidth: 1,
    borderColor: Colors.borderDark, // #374151
    paddingHorizontal: Spacing[5],
    paddingTop: Spacing[5],
    paddingBottom: Spacing[4],
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 12,
  },
  dialogHeader: {
    alignItems: 'center',
    marginBottom: Spacing[3],
  },
  iconBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 153, 0, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255, 153, 0, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing[2],
  },
  iconText: {
    fontSize: 22,
  },
  dialogTitle: {
    fontSize: FontSize.lg,
    fontWeight: '700',
    color: Colors.white,
    textAlign: 'center',
    letterSpacing: -0.3,
  },
  dialogDescription: {
    fontSize: FontSize.xs,
    color: Colors.gray400,
    textAlign: 'center',
    marginTop: Spacing[1],
  },
  dialogBody: {
    maxHeight: 330,
  },
  bodyContent: {
    gap: Spacing[3],
    paddingVertical: Spacing[1],
  },

  // shadcn Alert Card
  alertBox: {
    backgroundColor: 'rgba(255, 153, 0, 0.08)',
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 153, 0, 0.28)',
    padding: Spacing[3],
  },
  alertTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[2],
    marginBottom: Spacing[1],
  },
  alertDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.amber,
  },
  alertTitle: {
    fontSize: FontSize.xs,
    fontWeight: '700',
    color: Colors.amber,
    letterSpacing: -0.2,
  },
  alertText: {
    fontSize: FontSize.xs + 0.5,
    color: '#E2E8F0',
    lineHeight: 18,
  },
  highlightText: {
    fontWeight: '700',
    color: Colors.amber,
  },

  // Step Section Card
  stepCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    padding: Spacing[3],
    gap: Spacing[3],
  },
  sectionLabel: {
    fontSize: FontSize.xs,
    fontWeight: '700',
    color: Colors.gray400,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  stepItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing[2.5],
  },
  stepBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: Colors.amber,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  stepBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: Colors.navyDark,
  },
  stepContent: {
    flex: 1,
  },
  stepTitle: {
    fontSize: FontSize.xs + 0.5,
    fontWeight: '700',
    color: Colors.white,
    marginBottom: 2,
  },
  stepDesc: {
    fontSize: FontSize.xs,
    color: '#94A3B8',
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

  // Tip Card
  tipCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
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
    color: '#94A3B8',
    lineHeight: 18,
  },

  // Dialog Footer
  dialogFooter: {
    flexDirection: 'row',
    gap: Spacing[2],
    marginTop: Spacing[4],
  },
  button: {
    flex: 1,
    height: 42,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  outlineButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: Colors.borderDark,
  },
  outlineButtonText: {
    fontSize: FontSize.sm,
    fontWeight: '600',
    color: Colors.gray400,
  },
  primaryButton: {
    backgroundColor: Colors.amber,
  },
  primaryButtonText: {
    fontSize: FontSize.sm,
    fontWeight: '700',
    color: Colors.navyDark,
  },
});
