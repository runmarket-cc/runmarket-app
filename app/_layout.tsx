import { useEffect, useState } from 'react';
import { Platform } from 'react-native';
import { Stack, router } from 'expo-router';
import * as Notifications from 'expo-notifications';
import * as SplashScreen from 'expo-splash-screen';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useAuthStore } from '../src/store/authStore';
import BrandSplash from '../src/components/BrandSplash';
import { RunMenuOverlay } from '../src/components/RunMenuOverlay';
import { syncPendingRuns } from '../src/services/runSync';

// Keep the native launch screen up until the animated brand splash takes over.
// Guarded so a not-yet-rebuilt dev client (missing the native module) won't crash.
try {
  SplashScreen.preventAutoHideAsync().catch(() => {});
} catch {}

export default function RootLayout() {
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
