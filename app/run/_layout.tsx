import React from 'react';
import { Stack, router } from 'expo-router';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { Colors, FontSize } from '../../src/constants/theme';

export function HeaderBackButton({ onPress, label = '뒤로' }: { onPress?: () => void; label?: string }) {
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
      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      activeOpacity={0.7}
    >
      <Text style={styles.backArrow}>‹</Text>
      <Text style={styles.backText}>{label}</Text>
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
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: 8,
  },
  backArrow: {
    color: Colors.amber,
    fontSize: 26,
    lineHeight: 28,
    fontWeight: '400',
    marginRight: 2,
  },
  backText: {
    color: Colors.amber,
    fontSize: FontSize.base,
    fontWeight: '600',
  },
});

