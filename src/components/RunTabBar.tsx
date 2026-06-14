import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRunMenu } from '../store/runMenuStore';
import { Colors } from '../constants/theme';

// expo-router가 커스텀 tabBar에 넘겨주는 props 중 우리가 쓰는 부분만 추린 타입.
type TabRoute = { key: string; name: string };
type RunTabBarProps = {
  state: { index: number; routes: TabRoute[] };
  navigation: {
    emit: (event: {
      type: 'tabPress';
      target: string;
      canPreventDefault: true;
    }) => { defaultPrevented: boolean };
    navigate: (name: string) => void;
  };
};

const BAR_HEIGHT = 64;
const FAB_SIZE = 60;

// 좌/우 사이드 탭 (가운데는 달리기 FAB)
const LEFT_TAB = { name: 'index', label: '대회 정보', emoji: '🏁' };
const RIGHT_TAB = { name: 'mypage', label: '마이페이지', emoji: '👤' };

function SideTab({
  emoji,
  label,
  active,
  onPress,
}: {
  emoji: string;
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity style={styles.sideTab} onPress={onPress} activeOpacity={0.7}>
      <Text style={[styles.tabEmoji, !active && styles.tabEmojiInactive]}>{emoji}</Text>
      <Text style={[styles.tabLabel, { color: active ? Colors.amber : Colors.mutedForeground }]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

export function RunTabBar({ state, navigation }: RunTabBarProps) {
  const insets = useSafeAreaInsets();
  const menuOpen = useRunMenu((s) => s.open);
  const toggleMenu = useRunMenu((s) => s.toggle);

  const currentRoute = state.routes[state.index]?.name;

  const go = (name: string) => {
    const route = state.routes.find((r: TabRoute) => r.name === name);
    if (!route) return;
    const isFocused = currentRoute === name;
    const event = navigation.emit({
      type: 'tabPress',
      target: route.key,
      canPreventDefault: true,
    });
    if (!isFocused && !event.defaultPrevented) {
      navigation.navigate(route.name);
    }
  };

  return (
    <View style={[styles.bar, { height: BAR_HEIGHT + insets.bottom, paddingBottom: insets.bottom }]}>
      <SideTab
        emoji={LEFT_TAB.emoji}
        label={LEFT_TAB.label}
        active={currentRoute === LEFT_TAB.name}
        onPress={() => go(LEFT_TAB.name)}
      />

      {/* 가운데 자리 비움 — FAB는 위로 띄워 절대 위치로 렌더 */}
      <View style={styles.centerSlot} />

      <SideTab
        emoji={RIGHT_TAB.emoji}
        label={RIGHT_TAB.label}
        active={currentRoute === RIGHT_TAB.name}
        onPress={() => go(RIGHT_TAB.name)}
      />

      {/* 중앙 달리기 FAB (바 위로 솟아오름) */}
      <View style={styles.fabWrap} pointerEvents="box-none">
        <TouchableOpacity
          style={[styles.fab, menuOpen && styles.fabActive]}
          onPress={toggleMenu}
          activeOpacity={0.85}
        >
          <Text style={styles.fabEmoji}>🏃</Text>
        </TouchableOpacity>
        <Text style={styles.fabLabel}>달리기</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    backgroundColor: Colors.navy,
    borderTopColor: Colors.borderDark,
    borderTopWidth: 1,
    paddingTop: 6,
  },
  sideTab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  centerSlot: {
    width: FAB_SIZE + 16,
  },
  tabEmoji: {
    fontSize: 20,
  },
  tabEmojiInactive: {
    opacity: 0.5,
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
  fabWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: -22,
    alignItems: 'center',
  },
  fab: {
    width: FAB_SIZE,
    height: FAB_SIZE,
    borderRadius: FAB_SIZE / 2,
    backgroundColor: Colors.amber,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    borderColor: Colors.navy,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 6,
  },
  fabActive: {
    backgroundColor: Colors.priceRed,
  },
  fabEmoji: {
    fontSize: 26,
  },
  fabLabel: {
    marginTop: 3,
    fontSize: 11,
    fontWeight: '700',
    color: Colors.amber,
  },
});
