import { Alert, Platform } from 'react-native';
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
 * 원격 푸시 수신 준비: 사전 고지 → 권한 요청 → Expo Push Token 발급 → 백엔드 등록.
 * 로그인 상태에서 호출해야 토큰이 계정과 연결된다.
 * 실패해도 앱 사용에는 지장 없으므로(마켓/공지 알림 미수신 정도) 에러를 던지지 않는다.
 */
export async function registerForPushNotificationsAsync(): Promise<void> {
  try {
    if (Platform.OS === 'android') {
      await ensureAndroidChannel();
    }

    const { status: existingStatus, canAskAgain } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted' && (canAskAgain ?? true)) {
      // 명시적 사전 안내 (Google Play Prominent Disclosure 요건)
      const userAgreed = await new Promise<boolean>((resolve) => {
        Alert.alert(
          '알림 권한 안내',
          '런마켓은 러닝 그룹 초대, 응원 메시지 및 주요 마켓 소식 알림을 전달하기 위해 알림 권한을 요청합니다.',
          [
            { text: '나중에', style: 'cancel', onPress: () => resolve(false) },
            { text: '허용', onPress: () => resolve(true) },
          ],
          { cancelable: false },
        );
      });

      if (userAgreed) {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
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
