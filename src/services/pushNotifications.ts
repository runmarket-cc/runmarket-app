import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { registerDevice } from '../api/devices';

const DEFAULT_CHANNEL_ID = 'default';

// 포그라운드 수신 시 표시 방식 (마켓/공지 알림은 배너 + 목록에만 노출, 뱃지는 사용 안 함)
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

async function ensureAndroidChannel() {
  await Notifications.setNotificationChannelAsync(DEFAULT_CHANNEL_ID, {
    name: '마켓 · 공지 알림',
    importance: Notifications.AndroidImportance.DEFAULT,
  });
}

/**
 * 원격 푸시 수신 준비: 권한 요청 → Expo Push Token 발급 → 백엔드 등록.
 * 로그인 상태에서 호출해야 토큰이 계정과 연결된다.
 * 실패해도 앱 사용에는 지장 없으므로(마켓/공지 알림 미수신 정도) 에러를 던지지 않는다.
 */
export async function registerForPushNotificationsAsync(): Promise<void> {
  try {
    if (Platform.OS === 'android') {
      await ensureAndroidChannel();
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== 'granted') return;

    const projectId = Constants.expoConfig?.extra?.eas?.projectId;
    if (!projectId) return;

    const { data: expoPushToken } = await Notifications.getExpoPushTokenAsync({ projectId });

    await registerDevice({
      expoPushToken,
      platform: Platform.OS === 'ios' ? 'ios' : 'android',
    });
  } catch {
    // 권한 거부/네트워크 실패 등 — 무시
  }
}
