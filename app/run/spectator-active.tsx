import React, { useRef, useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Platform, Alert,
} from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { useLocalSearchParams, router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, FontSize, Spacing, Radius } from '../../src/constants/theme';
import { useSpectatorSocket } from '../../src/hooks/useSpectatorSocket';
import { useSpectatorLockScreen } from '../../src/hooks/useLockScreenActivity';
import { RunnerListPanel, getRunnerColor } from '../../src/components/RunnerListPanel';

export default function SpectatorActiveScreen() {
  const { groupId, socketToken } = useLocalSearchParams<{
    groupId: string; socketToken: string;
  }>();
  const insets = useSafeAreaInsets();
  const mapRef = useRef<MapView>(null);
  const centeredRef = useRef(false);

  const [connected, setConnected] = useState(false);

  const { runners } = useSpectatorSocket({
    groupId,
    token: socketToken,
    onOpen: () => setConnected(true),
    onClose: () => setConnected(false),
    onError: () => setConnected(false),
  });

  const runnerList = Array.from(runners.values());

  // ── 잠금 화면 위젯 ──
  const { update: updateLockScreen } = useSpectatorLockScreen(
    groupId ? { groupId, runnerCount: runnerList.length } : null
  );

  useEffect(() => {
    if (centeredRef.current || runnerList.length === 0) return;
    const first = runnerList[0];
    mapRef.current?.animateCamera(
      { center: { latitude: first.lat, longitude: first.lng }, zoom: 15 },
      { duration: 800 },
    );
    centeredRef.current = true;
  }, [runnerList]);

  // 러너 수 / 연결 상태 변경 시 잠금 화면 업데이트
  useEffect(() => {
    updateLockScreen({ runnerCount: runnerList.length, isConnected: connected });
  }, [runnerList.length, connected]);

  const handleStop = () => {
    Alert.alert('관전 종료', '관전을 종료하시겠습니까?', [
      { text: '계속 보기', style: 'cancel' },
      { text: '종료', style: 'destructive', onPress: () => router.replace('/(tabs)/run') },
    ]);
  };

  return (
    <View style={styles.container}>
      {/* 지도 */}
      <MapView
        ref={mapRef}
        style={styles.map}
        provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
        showsUserLocation
        initialRegion={{
          latitude: 37.5665,
          longitude: 126.978,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        }}
      >
        {runnerList.map((runner) => (
          <Marker
            key={runner.runnerId}
            coordinate={{ latitude: runner.lat, longitude: runner.lng }}
            title={runner.runnerId}
            description={`${runner.distance.toFixed(2)}km · ${runner.pace === '--:--' ? '-' : `${runner.pace}/km`}`}
          >
            <View style={[styles.runnerMarker, { backgroundColor: runner.color ?? getRunnerColor(runner.runnerId) }]}>
              <Text style={styles.runnerMarkerText}>🏃</Text>
            </View>
          </Marker>
        ))}
      </MapView>

      {/* 연결 상태 배지 */}
      <View style={[styles.statusBadge, connected ? styles.statusConnected : styles.statusDisconnected]}>
        <Text style={styles.statusText}>
          {connected ? `● 라이브 · ${runnerList.length}명` : '● 연결 중...'}
        </Text>
      </View>

      {/* 하단 패널 */}
      <View style={[styles.panel, { paddingBottom: Math.max(insets.bottom, Platform.OS === 'ios' ? 32 : Spacing[4]) }]}>
        <RunnerListPanel
          runners={runnerList}
          onPressRunner={(runner) => mapRef.current?.animateCamera(
            { center: { latitude: runner.lat, longitude: runner.lng }, zoom: 16 },
            { duration: 600 },
          )}
        />

        <View style={styles.footer}>
          <Text style={styles.footerMeta}>그룹 코드: {groupId}</Text>
          <TouchableOpacity style={styles.stopBtn} onPress={handleStop} activeOpacity={0.8}>
            <Text style={styles.stopBtnText}>종료</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}


const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  map: { flex: 1 },

  statusBadge: {
    position: 'absolute',
    top: Spacing[3],
    alignSelf: 'center',
    paddingHorizontal: Spacing[3],
    paddingVertical: 5,
    borderRadius: Radius.full,
  },
  statusConnected: { backgroundColor: '#065f46' },
  statusDisconnected: { backgroundColor: '#7f1d1d' },
  statusText: { color: Colors.white, fontSize: FontSize.xs, fontWeight: '700' },

  runnerMarker: {
    borderRadius: 20,
    padding: 4,
    borderWidth: 2,
    borderColor: Colors.white,
  },
  runnerMarkerText: { fontSize: 18 },

  panel: {
    backgroundColor: Colors.navy,
    maxHeight: 280,
  },

  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing[4],
    paddingTop: Spacing[3],
  },
  footerMeta: { fontSize: FontSize.xs, color: '#6b7280' },
  stopBtn: {
    backgroundColor: '#dc2626',
    paddingHorizontal: Spacing[4],
    paddingVertical: Spacing[2],
    borderRadius: Radius.md,
  },
  stopBtnText: { color: Colors.white, fontSize: FontSize.sm, fontWeight: '700' },
});
