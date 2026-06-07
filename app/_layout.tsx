import { useEffect } from 'react';
import { Platform } from 'react-native';
import { Stack, router } from 'expo-router';
import * as Notifications from 'expo-notifications';
import { useAuthStore } from '../src/store/authStore';

export default function RootLayout() {
  const { loadAuth, isLoggedIn, initialized } = useAuthStore();

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
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(tabs)" />
    </Stack>
  );
}
