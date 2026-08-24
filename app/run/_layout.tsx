import React from 'react';
import { Stack, router } from 'expo-router';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { Colors, FontSize } from '../../src/constants/theme';

export function HeaderBackButton({ onPress }: { onPress?: () => void }) {
  const handlePress = () => {
    if (onPress) {
      onPress();
    } else if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(tabs)');
    }
  };

  return (
    <TouchableOpacity
      onPress={handlePress}
      style={styles.backBtn}
      hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
      activeOpacity={0.7}
      accessibilityLabel="뒤로 가기"
    >
      <Text style={styles.backArrow}>‹</Text>
    </TouchableOpacity>
  );
}

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
      <Stack.Screen
        name="runner"
        options={{
          title: '러너로 달리기',
          headerLeft: () => <HeaderBackButton />,
        }}
      />
      <Stack.Screen
        name="runner-active"
        options={{
          title: '런 진행 중',
          headerBackVisible: false,
        }}
      />
      <Stack.Screen
        name="runner-result"
        options={{
          title: '러닝 기록',
          headerBackVisible: false,
          gestureEnabled: false,
        }}
      />
      <Stack.Screen
        name="spectator"
        options={{
          title: '관전하기',
          headerLeft: () => <HeaderBackButton />,
        }}
      />
      <Stack.Screen
        name="spectator-active"
        options={{
          title: '실시간 관전',
          headerBackVisible: false,
        }}
      />
    </Stack>
  );
}

const styles = StyleSheet.create({
  backBtn: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingRight: 12,
  },
  backArrow: {
    color: Colors.amber,
    fontSize: 32,
    lineHeight: 34,
    fontWeight: '300',
  },
});

