import React from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { Colors, FontSize, Spacing, Radius } from '../constants/theme';

export type DisclosureType = 'foreground' | 'background' | 'all';

interface LocationDisclosureModalProps {
  visible: boolean;
  type?: DisclosureType;
  onAccept: () => void;
  onDecline: () => void;
}

/**
 * Google Play [사용자 데이터 - 명시적 공개 및 동의 요건(Prominent Disclosure)] 준수 모달.
 * shadcn/ui 다이얼로그 패턴 및 www.runmarket.cc 디자인 토큰(Dark Navy / Amber) 기반.
 * 
 * 구글 필수 요건:
 * 1. '위치 데이터' 명시
 * 2. '앱이 닫혀 있거나 사용 중이 아닐 때도(화면이 꺼져 있을 때도)' 수집 사실 명시
 * 3. 구체적인 사용 목적(러닝 경로 기록, 페이스 측정, 그룹원 실시간 위치 공유) 명시
 * 4. 사용자의 명확한 긍정적 동의(동의 및 계속) 및 거부(취소) 액션 제공
 */
export function LocationDisclosureModal({
  visible,
  onAccept,
  onDecline,
}: LocationDisclosureModalProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onDecline}
    >
      <View style={styles.overlay}>
        <View style={styles.dialogContent}>
          {/* Dialog Header */}
          <View style={styles.dialogHeader}>
            <View style={styles.iconBadge}>
              <Text style={styles.iconText}>📍</Text>
            </View>
            <Text style={styles.dialogTitle}>위치 정보 수집 및 이용 안내</Text>
            <Text style={styles.dialogDescription}>
              실시간 러닝 측정과 그룹 위치 공유를 위한 안내입니다
            </Text>
          </View>

          <ScrollView
            style={styles.dialogBody}
            contentContainerStyle={styles.bodyContent}
            showsVerticalScrollIndicator={false}
            bounces={false}
          >
            {/* shadcn Alert 형태의 구글 플레이 정책 핵심 고지 박스 */}
            <View style={styles.alertBox}>
              <View style={styles.alertTitleRow}>
                <View style={styles.alertDot} />
                <Text style={styles.alertTitle}>백그라운드 위치 데이터 수집 안내</Text>
              </View>
              <Text style={styles.alertText}>
                런마켓은 <Text style={styles.highlightText}>앱이 닫혀 있거나 사용 중이 아닐 때도(화면이 꺼져 있거나 다른 앱을 사용할 때도)</Text> 실시간 러닝 경로 기록, 이동 거리 및 페이스 측정, 그룹 참가자 간의 실시간 위치 공유 기능을 제공하기 위해 <Text style={styles.highlightText}>위치 데이터</Text>를 수집합니다.
              </Text>
            </View>

            {/* 주요 사용 목적 카드 */}
            <View style={styles.purposeCard}>
              <Text style={styles.purposeTitle}>주요 사용 목적</Text>
              <View style={styles.purposeList}>
                <Text style={styles.purposeItem}>
                  <Text style={styles.bullet}>•</Text> 화면이 꺼진 상태에서도 끊김 없는 실시간 GPS 러닝 경로 기록
                </Text>
                <Text style={styles.purposeItem}>
                  <Text style={styles.bullet}>•</Text> 달리기 페이스(Pace) 및 누적 이동 거리 실시간 계산
                </Text>
                <Text style={styles.purposeItem}>
                  <Text style={styles.bullet}>•</Text> 참가 중인 러닝 그룹원들과 실시간 위치 공유
                </Text>
              </View>

              <Text style={styles.privacyNote}>
                ※ 수집된 위치 데이터는 광고 목적으로 사용되지 않으며, 상기 러닝 기능 제공 이외의 목적으로는 외부에 제공되지 않습니다.
              </Text>
            </View>
          </ScrollView>

          {/* Dialog Footer (shadcn Buttons) */}
          <View style={styles.dialogFooter}>
            <TouchableOpacity
              style={[styles.button, styles.outlineButton]}
              onPress={onDecline}
              activeOpacity={0.7}
            >
              <Text style={styles.outlineButtonText}>취소</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, styles.primaryButton]}
              onPress={onAccept}
              activeOpacity={0.8}
            >
              <Text style={styles.primaryButtonText}>동의 및 계속</Text>
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
    maxHeight: 320,
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
    lineHeight: 19,
  },
  highlightText: {
    fontWeight: '700',
    color: Colors.amber,
  },
  // Feature Purpose Card
  purposeCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    padding: Spacing[3],
    gap: Spacing[2],
  },
  purposeTitle: {
    fontSize: FontSize.xs,
    fontWeight: '700',
    color: Colors.gray400,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  purposeList: {
    gap: 4,
  },
  purposeItem: {
    fontSize: FontSize.xs,
    color: '#CBD5E1',
    lineHeight: 18,
  },
  bullet: {
    color: Colors.amber,
    fontWeight: '700',
  },
  privacyNote: {
    fontSize: 11,
    color: '#94A3B8',
    lineHeight: 16,
    marginTop: 2,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.06)',
    paddingTop: Spacing[2],
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
    borderRadius: Radius.md, // 8
    alignItems: 'center',
    justifyContent: 'center',
  },
  // shadcn Outline Button
  outlineButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: Colors.borderDark, // #374151
  },
  outlineButtonText: {
    fontSize: FontSize.sm,
    fontWeight: '600',
    color: Colors.gray400,
  },
  // shadcn Default RunMarket Button
  primaryButton: {
    backgroundColor: Colors.amber, // #ff9900
  },
  primaryButtonText: {
    fontSize: FontSize.sm,
    fontWeight: '700',
    color: Colors.navyDark, // #1a2332
  },
});
