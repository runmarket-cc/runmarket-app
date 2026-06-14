import React, { useRef, useState, useEffect } from 'react';
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
import { Colors } from '../constants/theme';
import { useAuthStore } from '../store/authStore';

interface WebScreenProps {
  uri: string;
}

/**
 * 런마켓 웹페이지를 감싸는 공용 WebView 화면.
 * 홈(대회 정보)과 마이페이지가 동일한 로딩/복구 동작을 공유한다.
 */
export function WebScreen({ uri }: WebScreenProps) {
  const webviewRef = useRef<WebView>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const insets = useSafeAreaInsets();
  const accessToken = useAuthStore((s) => s.accessToken);
  const email = useAuthStore((s) => s.email);

  // 각 탭은 별도의 WebView 인스턴스라 로그인 WebView의 localStorage(JWT)가 공유되지
  // 않는다. 그대로 두면 인증이 필요한 /mypage 같은 보호 라우트가 홈으로 리다이렉트된다.
  // 앱이 보관 중인 토큰을 콘텐츠 로드 전에 localStorage에 심어 세션을 복원한다.
  // 만료된 토큰은 심지 않는다(만료 토큰 주입 → 401 리다이렉트 회귀 방지, login.tsx와 동일 정책).
  const authInject = accessToken && email
    ? `(function(){try{
         var t=${JSON.stringify(accessToken)};
         var expired=false;
         try{var p=JSON.parse(atob(t.split('.')[1]));expired=!!(p.exp&&p.exp*1000<Date.now());}catch(e){}
         if(expired)return;
         localStorage.setItem('runmarket_user_token',t);
         localStorage.setItem('runmarket_user_email',${JSON.stringify(email)});
       }catch(e){}})();true;`
    : undefined;

  const injectedCSS = Platform.OS === 'android'
    ? `(function(){var s=document.createElement('style');s.textContent='body{padding-top:${insets.top}px!important;padding-bottom:${insets.bottom}px!important}';document.head.appendChild(s);})();true;`
    : undefined;

  // 안전장치: Android에서 SPA 리다이렉트(예: 만료 세션 → 로그인) 시 onLoadEnd가
  // 오지 않아 오버레이가 무한히 남는 경우를 대비해 일정 시간 후 강제로 해제한다.
  useEffect(() => {
    if (!loading) return;
    const timer = setTimeout(() => setLoading(false), 8000);
    return () => clearTimeout(timer);
  }, [loading]);

  // 장시간 러닝(지도+GPS 포그라운드 서비스) 동안 백그라운드에 있던 WebView 렌더러가
  // 시스템 메모리 회수로 죽으면 복구 수단 없이 흰 화면이 된다 → 자동으로 다시 로드.
  const handleProcessGone = () => {
    setError(false);
    setLoading(true);
    webviewRef.current?.reload();
  };

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
          source={{ uri }}
          // 주의: Android는 SPA의 pushState/replaceState에도 onLoadStart를 발생시키지만
          // onLoadEnd는 오지 않음 → onLoadStart로 오버레이를 켜면 무한로딩에 빠짐
          onLoadEnd={() => setLoading(false)}
          onError={() => { setLoading(false); setError(true); }}
          // 렌더러 프로세스가 죽었을 때 흰 화면으로 멈추지 않도록 자동 복구
          onRenderProcessGone={handleProcessGone}
          onContentProcessDidTerminate={handleProcessGone}
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
          // SPA가 인증을 확인하기 전에 JWT를 localStorage에 복원한다.
          injectedJavaScriptBeforeContentLoaded={authInject}
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
    // 흰색이면 오버레이가 남았을 때 그대로 백화로 보이므로 navy 사용
    backgroundColor: Colors.navy,
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
