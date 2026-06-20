import { Stack } from 'expo-router';
import { Colors } from '../../src/constants/theme';

export default function RunLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: Colors.navy },
        headerTintColor: Colors.amber,
        headerTitleStyle: { fontWeight: '700', color: Colors.white },
        headerBackTitle: '',
      }}
    >
      <Stack.Screen name="runner" options={{ title: '러너로 달리기' }} />
      <Stack.Screen name="runner-active" options={{ title: '런 진행 중', headerBackVisible: false }} />
      <Stack.Screen name="runner-result" options={{ title: '러닝 기록', headerBackVisible: false, gestureEnabled: false }} />
      <Stack.Screen name="spectator" options={{ title: '관전하기' }} />
      <Stack.Screen name="spectator-active" options={{ title: '실시간 관전', headerBackVisible: false }} />
    </Stack>
  );
}
