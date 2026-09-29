import React, { useEffect, useRef, useState } from 'react';
import { AppState, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, FontSize, Radius, Spacing } from '../constants/theme';

/** Mounted only while locked. The native modal also covers the navigation header. */
export function RunTouchLock({ onUnlock }: { onUnlock: () => void }) {
  const insets = useSafeAreaInsets();
  const holding = useRef(false);
  const [isHolding, setIsHolding] = useState(false);
  const [gestureKey, setGestureKey] = useState(0);

  useEffect(() => {
    const cancelHold = () => {
      holding.current = false;
      setIsHolding(false);
      // Cancel Pressable's pending long-press timer on interruption as well.
      setGestureKey((key) => key + 1);
    };
    const change = AppState.addEventListener('change', (state) => {
      if (state !== 'active') cancelHold();
    });
    const blur = AppState.addEventListener('blur', cancelHold);
    return () => {
      change.remove();
      blur.remove();
    };
  }, []);

  return (
    <Modal
      transparent
      visible
      animationType="none"
      statusBarTranslucent
      onRequestClose={() => { /* Android back must not dismiss the touch lock. */ }}
    >
      <View style={[styles.overlay, { paddingTop: insets.top + 72 }]}>
        <View style={styles.card}>
          <Text style={styles.title}>🔒 터치 잠금 중</Text>
          <Text style={styles.description}>운동 상태는 그대로 유지됩니다.</Text>
          <Pressable
            key={gestureKey}
            accessibilityRole="button"
            accessibilityLabel="터치 잠금 해제"
            accessibilityHint="2초간 길게 누르면 잠금이 해제됩니다."
            delayLongPress={2000}
            onPressIn={() => {
              holding.current = true;
              setIsHolding(true);
            }}
            onLongPress={() => {
              if (!holding.current || AppState.currentState !== 'active') return;
              holding.current = false;
              onUnlock();
            }}
            onPressOut={() => {
              holding.current = false;
              setIsHolding(false);
            }}
            style={({ pressed }) => [styles.button, pressed && styles.pressed]}
          >
            <Text style={styles.buttonText} accessibilityLiveRegion="polite">
              {isHolding ? '계속 누르고 계세요…' : '2초간 길게 눌러 해제'}
            </Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, paddingHorizontal: Spacing[4], backgroundColor: 'rgba(0, 0, 0, 0.12)' },
  card: {
    backgroundColor: Colors.navyDark,
    borderColor: Colors.amber,
    borderWidth: 1,
    borderRadius: Radius.lg,
    padding: Spacing[4],
    gap: Spacing[3],
    alignItems: 'center',
  },
  title: { color: Colors.white, fontSize: FontSize.lg, fontWeight: '700' },
  description: { color: Colors.gray400, fontSize: FontSize.sm },
  button: {
    alignSelf: 'stretch',
    minHeight: 52,
    padding: Spacing[3],
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.amber,
    borderRadius: Radius.md,
  },
  pressed: { opacity: 0.75 },
  buttonText: { color: Colors.navyDark, fontSize: FontSize.base, fontWeight: '700' },
});
