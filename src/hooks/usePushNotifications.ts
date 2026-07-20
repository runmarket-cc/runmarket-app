import { useEffect } from 'react';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { useAuthStore } from '../store/authStore';
import { registerDevice } from '../api/devices';
import { registerForPushNotificationsAsync } from '../services/pushNotifications';

/**
 * 로그인 상태일 때 푸시 토큰을 등록하고, 이후 OS가 토큰을 재발급하면(드물지만 발생) 재등록한다.
 */
export function usePushNotifications() {
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn);

  useEffect(() => {
    if (!isLoggedIn) return;

    registerForPushNotificationsAsync();

    const subscription = Notifications.addPushTokenListener(({ data: expoPushToken }) => {
      registerDevice({
        expoPushToken,
        platform: Platform.OS === 'ios' ? 'ios' : 'android',
      }).catch(() => {});
    });

    return () => subscription.remove();
  }, [isLoggedIn]);
}
