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

export type DisclosureType = 'foreground' | 'background';

interface LocationDisclosureModalProps {
  visible: boolean;
  type: DisclosureType;
  onAccept: () => void;
  onDecline: () => void;
}

/**
 * Google Play [사용자 데이터 - 명시적 공개 및 동의 요건(Prominent Disclosure)] 준수 모달.
 * 위치 데이터 런타임 권한 요청 직전에 노출되어 데이터 수집 사실 및 목적을 명시적으로 고지합니다.
 */
export function LocationDisclosureModal({
  visible,
  type,
  onAccept,
  onDecline,
}: LocationDisclosureModalProps) {
  const isBackground = type === 'background';

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onDecline}
    >
      <View style={styles.overlay}>
        <View style={styles.card}>
          {/* 상단 헤더 아이콘 & 타이틀 */}
          <View style={styles.header}>
            <View style={styles.iconCircle}>
              <Text style={styles.iconText}>{isBackground ? '🏃' : '📍'}</Text>
            </View>
            <Text style={styles.title}>
              {isBackground
                ? '백그라운드 위치 권한 안내'
                : '위치 정보 접근 권한 안내'}
            </Text>
          </View>

          <ScrollView
            style={styles.scrollArea}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* 핵심 정책 고지 박스 (Google Play 필수 명시 문구) */}
            <View style={styles.noticeBox}>
              <Text style={styles.noticeLabel}>[위치 데이터 수집 및 사용 사실 안내]</Text>
              {isBackground ? (
                <Text style={styles.noticeText}>
                  런마켓은 <Text style={styles.highlight}>앱이 닫혀 있거나 사용 중이 아닐 때도(화면이 꺼져 있거나 다른 앱을 사용할 때도)</Text> 실시간 러닝 경로 기록, 이동 거리 및 페이스 측정, 그룹 참가자 간의 실시간 위치 공유 기능을 제공하기 위해 <Text style={styles.highlight}>위치 데이터</Text>를 수집합니다.
                </Text>
              ) : (
                <Text style={styles.noticeText}>
                  런마켓은 러닝 중 <Text style={styles.highlight}>실시간 이동 경로(GPS) 기록, 이동 거리 및 페이스 측정, 참가자 간 실시간 위치 공유</Text> 기능을 제공하기 위해 사용자의 <Text style={styles.highlight}>위치 데이터</Text>를 수집하고 사용합니다.
                </Text>
              )}
            </View>

            {/* 세부 기능 및 데이터 사용 범위 */}
            <View style={styles.detailSection}>
              <Text style={styles.detailTitle}>주요 사용 목적</Text>
              <Text style={styles.detailItem}>• 러닝 경로(GPS) 실시간 지도 표시 및 기록 저장</Text>
              <Text style={styles.detailItem}>• 달리기 페이스(Pace) 및 누적 이동 거리 계산</Text>
              <Text style={styles.detailItem}>• 참가 중인 러닝 그룹원들과 실시간 위치 공유</Text>
              <Text style={styles.privacyNote}>
                ※ 수집된 위치 데이터는 광고 목적으로 사용되지 않으며, 상기 러닝 기능 제공 이외의 목적으로는 사용되거나 외부에 공유되지 않습니다.
              </Text>
              {isBackground && (
                <Text style={styles.detailSubNotice}>
                  ※ 안정적인 러닝 기록 및 실시간 위치 공유 유지를 위해 다음 권한 설정 화면에서 <Text style={styles.boldText}>"항상 허용"</Text>을 선택해주세요.
                </Text>
              )}
            </View>
          </ScrollView>

          {/* 선택 버튼 영역 (명시적 동의 / 거부) */}
          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={[styles.button, styles.declineButton]}
              onPress={onDecline}
              activeOpacity={0.7}
            >
              <Text style={styles.declineButtonText}>
                {isBackground ? '나중에 (포그라운드만)' : '취소'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, styles.acceptButton]}
              onPress={onAccept}
              activeOpacity={0.8}
            >
              <Text style={styles.acceptButtonText}>
                {isBackground ? '동의하고 설정하기' : '동의 및 계속'}
              </Text>
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
    maxWidth: 380,
    maxHeight: '85%',
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
    marginBottom: Spacing[4],
  },
  iconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(255, 153, 0, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing[3],
  },
  iconText: {
    fontSize: 26,
  },
  title: {
    fontSize: FontSize.lg,
    fontWeight: '800',
    color: Colors.white,
    textAlign: 'center',
  },
  scrollArea: {
    maxHeight: 280,
    marginBottom: Spacing[4],
  },
  scrollContent: {
    gap: Spacing[3],
  },
  noticeBox: {
    backgroundColor: 'rgba(255, 153, 0, 0.1)',
    borderRadius: Radius.md,
    padding: Spacing[3],
    borderLeftWidth: 3,
    borderLeftColor: Colors.amber,
  },
  noticeLabel: {
    fontSize: FontSize.xs,
    fontWeight: '700',
    color: Colors.amber,
    marginBottom: Spacing[1],
  },
  noticeText: {
    fontSize: FontSize.sm,
    color: Colors.white,
    lineHeight: 20,
  },
  highlight: {
    fontWeight: '700',
    color: Colors.amber,
  },
  detailSection: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: Radius.md,
    padding: Spacing[3],
    gap: Spacing[1],
  },
  detailTitle: {
    fontSize: FontSize.xs,
    fontWeight: '700',
    color: Colors.gray400,
    marginBottom: Spacing[1],
  },
  detailItem: {
    fontSize: FontSize.xs,
    color: Colors.gray400,
    lineHeight: 18,
  },
  privacyNote: {
    fontSize: FontSize.xs,
    color: '#94A3B8',
    lineHeight: 17,
    marginTop: Spacing[2],
  },
  detailSubNotice: {
    fontSize: FontSize.xs,
    color: Colors.amber,
    lineHeight: 18,
    marginTop: Spacing[1],
  },
  boldText: {
    fontWeight: '700',
    color: Colors.white,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: Spacing[2],
    marginTop: Spacing[1],
  },
  button: {
    flex: 1,
    paddingVertical: Spacing[3],
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  declineButton: {
    backgroundColor: Colors.borderDark,
  },
  declineButtonText: {
    fontSize: FontSize.sm,
    fontWeight: '600',
    color: Colors.gray400,
  },
  acceptButton: {
    backgroundColor: Colors.amber,
  },
  acceptButtonText: {
    fontSize: FontSize.sm,
    fontWeight: '700',
    color: Colors.navyDark,
  },
});
