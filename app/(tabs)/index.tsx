import React, { useRef, useState } from 'react';
import {
  View,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Text,
  Platform,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '../../src/constants/theme';

export default function HomeScreen() {
  const webviewRef = useRef<WebView>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const insets = useSafeAreaInsets();

  const injectedCSS = Platform.OS === 'android'
    ? `(function(){var s=document.createElement('style');s.textContent='body{padding-top:${insets.top}px!important;padding-bottom:${insets.bottom}px!important}';document.head.appendChild(s);})();true;`
    : undefined;

  return (
    <View style={[styles.container, Platform.OS === 'ios' && { paddingTop: insets.top }]}>
      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator color={Colors.amber} size="large" />
        </View>
      )}
      {error ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>페이지를 불러오지 못했습니다.</Text>
          <TouchableOpacity
            style={styles.retryBtn}
            onPress={() => {
              setError(false);
              setLoading(true);
              webviewRef.current?.reload();
            }}
          >
            <Text style={styles.retryText}>다시 시도</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <WebView
          ref={webviewRef}
          source={{ uri: 'https://www.runmarket.cc' }}
          // 주의: Android는 SPA의 pushState/replaceState에도 onLoadStart를 발생시키지만
          // onLoadEnd는 오지 않음 → onLoadStart로 오버레이를 켜면 무한로딩에 빠짐
          onLoadEnd={() => setLoading(false)}
          onError={() => { setLoading(false); setError(true); }}
          style={styles.webview}
          javaScriptEnabled
          domStorageEnabled
          // Cloudflare Turnstile: cf_clearance 쿠키가 유지돼야 챌린지가 반복되지 않음
          sharedCookiesEnabled
          thirdPartyCookiesEnabled
          // Turnstile 챌린지 iframe(about:srcdoc)을 외부로 위임하지 않고 WebView 내부에서 처리
          originWhitelist={['https://*', 'about:*']}
          startInLoadingState={false}
          injectedJavaScript={injectedCSS}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.navy },
  webview: { flex: 1 },
  loadingOverlay: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.background,
    zIndex: 10,
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  errorText: { color: Colors.mutedForeground, fontSize: 15 },
  retryBtn: {
    backgroundColor: Colors.amber,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryText: { color: Colors.navy, fontWeight: '700', fontSize: 14 },
});
