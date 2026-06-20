import { useEffect, useState } from 'react';
import { Platform } from 'react-native';
import { Stack, router } from 'expo-router';
import * as Notifications from 'expo-notifications';
import * as SplashScreen from 'expo-splash-screen';
import * as Sentry from '@sentry/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useAuthStore } from '../src/store/authStore';
import BrandSplash from '../src/components/BrandSplash';
import { RunMenuOverlay } from '../src/components/RunMenuOverlay';
import { syncPendingRuns } from '../src/services/runSync';

// 크래시/에러 모니터링. DSN은 클라이언트에 노출되도록 설계된 공개 값이라 하드코딩해도 안전하다.
Sentry.init({
  dsn: 'https://5b9bca316547ff5092952c8a5e50dff0@o4511598456406016.ingest.us.sentry.io/4511598494744576',
  // 개발 중 발생하는 에러는 전송하지 않아 운영 데이터의 노이즈를 막는다.
  enabled: !__DEV__,
  // 성능 트레이싱은 무료 쿼터 절약을 위해 낮게(크래시/에러 수집이 주 목적).
  tracesSampleRate: 0.1,
});

// Keep the native launch screen up until the animated brand splash takes over.
// Guarded so a not-yet-rebuilt dev client (missing the native module) won't crash.
try {
  SplashScreen.preventAutoHideAsync().catch(() => {});
} catch {}

function RootLayout() {
  const { loadAuth, isLoggedIn, initialized } = useAuthStore();
  const [splashDone, setSplashDone] = useState(false);

  useEffect(() => {
    loadAuth();
    if (Platform.OS === 'android') {
      Notifications.requestPermissionsAsync();
    }
  }, []);

  useEffect(() => {
    if (!initialized) return;
    if (!isLoggedIn) {
      router.replace('/(auth)/login');
      return;
    }
    // 로그인 상태에서 앱 시작 시: 미종료(고아) 런 복구 + 미업로드 기록 재전송.
    syncPendingRuns().catch(() => {});
  }, [initialized, isLoggedIn]);

  return (
    <SafeAreaProvider>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />
      </Stack>
      <RunMenuOverlay />
      {!splashDone && (
        <BrandSplash ready={initialized} onFinish={() => setSplashDone(true)} />
      )}
    </SafeAreaProvider>
  );
}

// Sentry.wrap으로 감싸 네이티브 크래시·렌더 에러까지 캡처하고 라우팅 컨텍스트를 연결한다.
export default Sentry.wrap(RootLayout);
