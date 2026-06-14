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

const PILL_HEIGHT = 58;
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

  // 홈 인디케이터 위로 띄운다. 제스처 영역이 없는 기기(인셋 0)에서도 최소 여백 확보.
  const lift = Math.max(insets.bottom, 12);

  return (
    <View style={[styles.container, { paddingBottom: lift }]} pointerEvents="box-none">
      {/* 떠 있는 알약형 바 (인스타그램 스타일) — 화면 하단에 붙이지 않고 띄움 */}
      <View style={styles.bar}>
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
      </View>

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
  container: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    // FAB이 바 위로 솟을 공간(상단 절반)을 확보 → 클리핑 방지
    paddingTop: FAB_SIZE / 2,
  },
  bar: {
    flexDirection: 'row',
    height: PILL_HEIGHT,
    marginHorizontal: 14,
    backgroundColor: Colors.navy,
    borderRadius: PILL_HEIGHT / 2,
    borderWidth: 1,
    borderColor: Colors.borderDark,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 12,
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
    top: 0,
    // 가운데(빈 centerSlot) 위에만 올린다. 좌우 사이드 탭을 덮으면 elevation 때문에
    // 안드로이드에서 탭 클릭이 막히므로, 폭을 센터 슬롯만큼으로 제한해 가운데에 둔다.
    left: '50%',
    marginLeft: -(FAB_SIZE + 16) / 2,
    width: FAB_SIZE + 16,
    alignItems: 'center',
    // 안드로이드는 elevation으로 그리기 순서가 결정된다. 알약 바(elevation 12)보다
    // 높게 줘야 FAB이 바에 가려지지 않고 위로 솟는다.
    zIndex: 20,
    elevation: 20,
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
