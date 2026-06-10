import { useEffect, useState } from 'react';
import { Platform } from 'react-native';
import { Stack, router } from 'expo-router';
import * as Notifications from 'expo-notifications';
import * as SplashScreen from 'expo-splash-screen';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useAuthStore } from '../src/store/authStore';
import BrandSplash from '../src/components/BrandSplash';

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
    }
  }, [initialized, isLoggedIn]);

  return (
    <SafeAreaProvider>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />
      </Stack>
      {!splashDone && (
        <BrandSplash ready={initialized} onFinish={() => setSplashDone(true)} />
      )}
    </SafeAreaProvider>
  );
}
