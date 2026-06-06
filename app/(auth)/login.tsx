import React, { useRef } from 'react';
import { View, StyleSheet, ActivityIndicator, Platform } from 'react-native';
import { WebView, WebViewMessageEvent } from 'react-native-webview';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuthStore } from '../../src/store/authStore';
import { Colors } from '../../src/constants/theme';

// 로그인 성공 후 localStorage에서 토큰/이메일을 추출해 앱으로 전송
const INJECT_JS = `
  (function() {
    function tryExtract() {
      const token = localStorage.getItem('runmarket_user_token');
      const email = localStorage.getItem('runmarket_user_email');
      if (token && email) {
        window.ReactNativeWebView.postMessage(JSON.stringify({ token, email }));
      }
    }

    // 페이지 로드 시 즉시 확인 (이미 로그인된 경우)
    tryExtract();

    // URL 변화 감지 (로그인 후 리다이렉트 시 추출)
    let lastHref = location.href;
    const observer = new MutationObserver(() => {
      if (location.href !== lastHref) {
        lastHref = location.href;
        tryExtract();
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });
  })();
  true;
`;

export default function LoginScreen() {
  const { setAuth, isLoggedIn } = useAuthStore();
  const webviewRef = useRef<WebView>(null);
  const insets = useSafeAreaInsets();

  const handleMessage = async (event: WebViewMessageEvent) => {
    try {
      const { token, email } = JSON.parse(event.nativeEvent.data);
      if (token && email) {
        await setAuth(token, email);
        router.replace('/(tabs)');
      }
    } catch {}
  };

  return (
    <View style={[styles.container, Platform.OS === 'ios' && { paddingTop: insets.top }]}>
      <WebView
        ref={webviewRef}
        source={{ uri: 'https://www.runmarket.cc/login' }}
        onMessage={handleMessage}
        injectedJavaScript={INJECT_JS}
        javaScriptEnabled
        domStorageEnabled
        startInLoadingState
        renderLoading={() => (
          <View style={styles.loading}>
            <ActivityIndicator color={Colors.amber} size="large" />
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.navy },
  loading: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.background,
  },
});
