import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { router } from 'expo-router';
import { Colors, FontSize, Spacing, Radius } from '../../src/constants/theme';
import { Input } from '../../src/components/Input';
import { Button } from '../../src/components/Button';
import { useAuthStore } from '../../src/store/authStore';
import { login } from '../../src/api/auth';

// Cloudflare Turnstile 사이트 키 (runmarket.cc와 동일한 키)
const TURNSTILE_SITE_KEY = '0x4AAAAAABhUBTJKbFERnGWj';

// Turnstile WebView HTML
const turnstileHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <style>
    body { margin: 0; padding: 0; background: transparent; display: flex; justify-content: center; }
    .cf-turnstile { margin-top: 4px; }
  </style>
</head>
<body>
  <div class="cf-turnstile"
    data-sitekey="${TURNSTILE_SITE_KEY}"
    data-callback="onVerified"
    data-expired-callback="onExpired"
    data-error-callback="onError"
    data-theme="light"
  ></div>
  <script src="https://challenges.cloudflare.com/turnstile/v0/api.js" async defer></script>
  <script>
    function onVerified(token) {
      window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'verified', token }));
    }
    function onExpired() {
      window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'expired' }));
    }
    function onError() {
      window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'error' }));
    }
  </script>
</body>
</html>
`;

export default function LoginScreen() {
  const { setAuth } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [turnstileToken, setTurnstileToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleMessage = (event: { nativeEvent: { data: string } }) => {
    try {
      const msg = JSON.parse(event.nativeEvent.data);
      if (msg.type === 'verified') {
        setTurnstileToken(msg.token);
      } else if (msg.type === 'expired' || msg.type === 'error') {
        setTurnstileToken('');
      }
    } catch {}
  };

  const handleLogin = async () => {
    setError('');
    if (!email.trim() || !password.trim()) {
      setError('이메일과 비밀번호를 입력해주세요.');
      return;
    }
    if (!turnstileToken) {
      setError('보안 인증을 완료해주세요.');
      return;
    }
    setLoading(true);
    try {
      const res = await login(email.trim(), password, turnstileToken);
      await setAuth(res.accessToken, email.trim());
      router.replace('/(tabs)');
    } catch (e: any) {
      setError(e.message ?? '로그인에 실패했습니다.');
      setTurnstileToken('');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.keyboardView}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
      >
        {/* Logo */}
        <Text style={styles.logo}>런마켓</Text>

        {/* Card */}
        <View style={styles.card}>
          <Text style={styles.title}>로그인</Text>

          <View style={styles.form}>
            <Input
              label="이메일"
              placeholder="이메일 주소 입력"
              keyboardType="email-address"
              value={email}
              onChangeText={setEmail}
              autoComplete="email"
            />
            <Input
              label="비밀번호"
              placeholder="비밀번호 입력"
              secureTextEntry
              secureToggle
              value={password}
              onChangeText={setPassword}
              autoComplete="password"
            />

            {/* Turnstile WebView */}
            <View>
              <Text style={styles.captchaLabel}>보안 인증</Text>
              <View style={styles.webviewContainer}>
                <WebView
                  source={{ html: turnstileHtml }}
                  onMessage={handleMessage}
                  style={styles.webview}
                  scrollEnabled={false}
                  javaScriptEnabled
                />
                {turnstileToken ? (
                  <View style={styles.verifiedBadge}>
                    <Text style={styles.verifiedText}>✓ 인증 완료</Text>
                  </View>
                ) : null}
              </View>
            </View>

            {error ? (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            <Button
              title="로그인"
              onPress={handleLogin}
              loading={loading}
              disabled={!turnstileToken}
              fullWidth
            />
          </View>

          <Text style={styles.terms}>
            계속함으로써{' '}
            <Text style={styles.termsLink}>이용약관</Text> 및{' '}
            <Text style={styles.termsLink}>개인정보처리방침</Text>에 동의합니다.
          </Text>
        </View>

        {/* Divider */}
        <View style={styles.divider}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>런마켓이 처음이신가요?</Text>
          <View style={styles.dividerLine} />
        </View>

        <Text style={styles.signupHint}>
          웹사이트(runmarket.cc)에서 회원가입 후 이용해주세요.
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  keyboardView: {
    flex: 1,
    backgroundColor: Colors.muted,
  },
  container: {
    flexGrow: 1,
    alignItems: 'center',
    paddingTop: Spacing[8],
    paddingBottom: Spacing[8],
    paddingHorizontal: Spacing[4],
    backgroundColor: Colors.muted,
  },
  logo: {
    fontSize: FontSize['2xl'],
    fontWeight: '800',
    color: Colors.navy,
    marginBottom: Spacing[5],
    letterSpacing: -0.5,
  },
  card: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing[6],
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  title: {
    fontSize: FontSize.xl,
    fontWeight: '700',
    color: Colors.foreground,
    marginBottom: Spacing[5],
  },
  form: {
    gap: Spacing[4],
  },
  captchaLabel: {
    fontSize: FontSize.sm,
    fontWeight: '500',
    color: Colors.foreground,
    marginBottom: Spacing[1],
  },
  webviewContainer: {
    height: 68,
    borderRadius: Radius.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.border,
    position: 'relative',
  },
  webview: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  verifiedBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: '#dcfce7',
    paddingHorizontal: Spacing[2],
    paddingVertical: 2,
    borderBottomLeftRadius: Radius.sm,
  },
  verifiedText: {
    fontSize: FontSize.xs,
    color: Colors.statusGreen,
    fontWeight: '600',
  },
  errorBox: {
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
    borderRadius: Radius.md,
    padding: Spacing[3],
  },
  errorText: {
    color: '#dc2626',
    fontSize: FontSize.sm,
  },
  terms: {
    marginTop: Spacing[4],
    fontSize: FontSize.xs,
    color: Colors.mutedForeground,
    lineHeight: 18,
  },
  termsLink: {
    color: '#2563eb',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    maxWidth: 400,
    marginTop: Spacing[5],
    gap: Spacing[3],
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.border,
  },
  dividerText: {
    fontSize: FontSize.xs,
    color: Colors.mutedForeground,
  },
  signupHint: {
    marginTop: Spacing[4],
    fontSize: FontSize.sm,
    color: Colors.mutedForeground,
    textAlign: 'center',
  },
});
