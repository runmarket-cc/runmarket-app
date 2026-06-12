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
    // JWT exp를 검사해 만료 여부를 판단 (파싱 실패 시엔 만료로 보지 않음)
    function isExpired(token) {
      try {
        var payload = JSON.parse(atob(token.split('.')[1]));
        return payload.exp && payload.exp * 1000 < Date.now();
      } catch (e) {
        return false;
      }
    }

    function tryExtract() {
      var token = localStorage.getItem('runmarket_user_token');
      var email = localStorage.getItem('runmarket_user_email');
      // 만료된 토큰은 앱으로 보내지 않고 정리 → 만료 토큰으로 자동 재로그인되는
      // 루프(401 → 로그인 → 즉시 홈 → 401)를 끊는다.
      if (token && isExpired(token)) {
        localStorage.removeItem('runmarket_user_token');
        localStorage.removeItem('runmarket_user_email');
        return;
      }
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
        // Cloudflare Turnstile: cf_clearance 쿠키가 유지돼야 챌린지가 반복되지 않음
        sharedCookiesEnabled
        thirdPartyCookiesEnabled
        // Turnstile 챌린지 iframe(about:srcdoc)을 외부로 위임하지 않고 WebView 내부에서 처리
        originWhitelist={['https://*', 'about:*']}
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
