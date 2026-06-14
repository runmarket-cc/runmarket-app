import React, { useRef } from 'react';
import { View, Text, StyleSheet, Pressable, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useRunMenu } from '../store/runMenuStore';
import { Colors, Spacing, Radius } from '../constants/theme';

// 탭바 가운데 FAB 위로 떠오르는 달리기 모드 선택 메뉴.
// Modal을 쓰지 않고 루트 레이아웃에 전역으로 얹어 탭바 클리핑/모달 이슈를 피한다.
export function RunMenuOverlay() {
  const open = useRunMenu((s) => s.open);
  const setOpen = useRunMenu((s) => s.setOpen);
  const insets = useSafeAreaInsets();
  const navigating = useRef(false);

  if (!open) return null;

  const go = (path: string) => {
    if (navigating.current) return;
    navigating.current = true;
    setOpen(false);
    router.push(path as any);
    setTimeout(() => {
      navigating.current = false;
    }, 1000);
  };

  // FAB이 떠 있는 높이(탭바 높이 + 하단 인셋) 바로 위에 메뉴를 배치한다.
  const bottom = 64 + insets.bottom + 30;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      <Pressable style={styles.backdrop} onPress={() => setOpen(false)} />
      <View style={[styles.menuRow, { bottom }]} pointerEvents="box-none">
        <TouchableOpacity
          style={styles.item}
          activeOpacity={0.9}
          onPress={() => go('/run/runner')}
        >
          <Text style={styles.itemEmoji}>🏃</Text>
          <Text style={styles.itemLabel}>러너로 달리기</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.item}
          activeOpacity={0.9}
          onPress={() => go('/run/spectator')}
        >
          <Text style={styles.itemEmoji}>👀</Text>
          <Text style={styles.itemLabel}>관전하기</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  menuRow: {
    position: 'absolute',
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'flex-end',
    gap: Spacing[6],
  },
  item: {
    width: 96,
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.navy,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.borderDark,
    paddingVertical: 14,
    paddingHorizontal: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
  },
  itemEmoji: { fontSize: 26 },
  itemLabel: {
    color: Colors.white,
    fontSize: 12.5,
    fontWeight: '700',
    textAlign: 'center',
    lineHeight: 16,
  },
});
