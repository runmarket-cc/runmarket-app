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
    ? `(function(){
        var top=${insets.top},bot=${insets.bottom};
        var s=document.createElement('style');
        s.textContent='body{padding-top:'+top+'px!important;padding-bottom:'+bot+'px!important}';
        document.head.appendChild(s);
        var fixing=false;
        function fixFixed(){
          if(fixing)return;fixing=true;
          document.querySelectorAll('*').forEach(function(el){
            var cs=getComputedStyle(el);
            if(cs.position==='fixed'){
              var t=parseFloat(cs.top)||0;
              if(t>=0&&t<top){el.style.top=top+'px';}
            }
          });
          fixing=false;
        }
        fixFixed();
        new MutationObserver(fixFixed).observe(document.documentElement,{childList:true,subtree:true,attributes:true,attributeFilter:['style','class']});
      })();true;`
    : undefined;

  return (
    <View style={styles.container}>
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
          onLoadStart={() => setLoading(true)}
          onLoadEnd={() => setLoading(false)}
          onError={() => { setLoading(false); setError(true); }}
          style={styles.webview}
          javaScriptEnabled
          domStorageEnabled
          startInLoadingState={false}
          injectedJavaScript={injectedCSS}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
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
