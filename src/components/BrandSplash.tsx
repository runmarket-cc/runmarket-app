import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Easing,
  Image,
  ImageBackground,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';

// Brand entry screen — ports the Claude Design "Splash" (mobile.jsx):
// Route Pin mark -> runmarket wordmark -> tagline, over a navy contour field.
const NAVY = '#131A22';
const ORANGE = '#FF8A00';
const MUTED = '#8A9099';

const BAR_WIDTH = 120;

type Props = {
  /** Auth/bootstrapping finished — splash may dismiss once the intro has played. */
  ready: boolean;
  onFinish: () => void;
};

export default function BrandSplash({ ready, onFinish }: Props) {
  const mark = useRef(new Animated.Value(0)).current; // pin pop-in (0 -> 1)
  const text = useRef(new Animated.Value(0)).current; // wordmark + tagline
  const bar = useRef(new Animated.Value(0)).current; // loading progress
  const fade = useRef(new Animated.Value(1)).current; // overlay opacity

  const readyRef = useRef(ready);
  const minElapsed = useRef(false);
  const finished = useRef(false);

  const maybeFinish = () => {
    if (finished.current || !readyRef.current || !minElapsed.current) return;
    finished.current = true;
    Animated.timing(fade, {
      toValue: 0,
      duration: 320,
      easing: Easing.in(Easing.quad),
      useNativeDriver: true,
    }).start(() => onFinish());
  };

  useEffect(() => {
    // Hand the native launch screen off to this animated one.
    try {
      SplashScreen.hideAsync().catch(() => {});
    } catch {}

    Animated.sequence([
      Animated.delay(120),
      Animated.timing(mark, {
        toValue: 1,
        duration: 700,
        easing: Easing.bezier(0.2, 0.9, 0.3, 1.2),
        useNativeDriver: true,
      }),
    ]).start();

    Animated.timing(bar, {
      toValue: 1,
      duration: 1400,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();

    const textTimer = setTimeout(() => {
      Animated.timing(text, {
        toValue: 1,
        duration: 600,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }).start();
    }, 900);

    const minTimer = setTimeout(() => {
      minElapsed.current = true;
      maybeFinish();
    }, 1900);

    return () => {
      clearTimeout(textTimer);
      clearTimeout(minTimer);
    };
  }, []);

  useEffect(() => {
    readyRef.current = ready;
    maybeFinish();
  }, [ready]);

  return (
    <Animated.View style={[styles.fill, { opacity: fade }]} pointerEvents="none">
      <StatusBar style="light" />
      <ImageBackground
        source={require('../../assets/splash-background.png')}
        style={styles.fill}
        resizeMode="cover"
      >
        <View style={styles.center}>
          <Animated.View
            style={{
              opacity: mark,
              transform: [
                {
                  scale: mark.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.82, 1],
                  }),
                },
              ],
            }}
          >
            <Image
              source={require('../../assets/splash-icon.png')}
              style={styles.mark}
              resizeMode="contain"
            />
          </Animated.View>

          <Animated.View
            style={{
              alignItems: 'center',
              marginTop: 24,
              opacity: text,
              transform: [
                {
                  translateY: text.interpolate({
                    inputRange: [0, 1],
                    outputRange: [12, 0],
                  }),
                },
              ],
            }}
          >
            <Text style={styles.wordmark}>
              <Text style={{ color: ORANGE }}>run</Text>
              <Text style={{ color: '#fff' }}>market</Text>
            </Text>
            <Text style={styles.tagline}>Find your race. Track every mile.</Text>
          </Animated.View>
        </View>

        <View style={styles.barTrack}>
          <Animated.View
            style={[
              styles.barFill,
              {
                width: bar.interpolate({
                  inputRange: [0, 1],
                  outputRange: [BAR_WIDTH * 0.18, BAR_WIDTH],
                }),
              },
            ]}
          />
        </View>
      </ImageBackground>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  fill: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: NAVY },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  mark: { width: 132, height: 132 },
  wordmark: {
    fontSize: 42,
    fontWeight: '800',
    letterSpacing: -0.8,
    lineHeight: 46,
  },
  tagline: {
    marginTop: 12,
    color: MUTED,
    fontSize: 15.5,
    fontWeight: '500',
  },
  barTrack: {
    position: 'absolute',
    bottom: 92,
    alignSelf: 'center',
    width: BAR_WIDTH,
    height: 4,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.12)',
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 4,
    backgroundColor: ORANGE,
  },
});
