import React, { useRef, useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, Platform, Alert,
} from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { useLocalSearchParams, router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, FontSize, Spacing, Radius } from '../../src/constants/theme';
import { useSpectatorSocket, RunnerState } from '../../src/hooks/useSpectatorSocket';
import { useSpectatorLockScreen } from '../../src/hooks/useLockScreenActivity';

// 러너마다 다른 색상 (최대 8명)
const RUNNER_COLORS = [
  '#ff9900', '#3b82f6', '#10b981', '#f43f5e',
  '#8b5cf6', '#f59e0b', '#06b6d4', '#84cc16',
];

function getColor(index: number) {
  return RUNNER_COLORS[index % RUNNER_COLORS.length];
}

function formatPace(pace: string) {
  return pace === '--:--' ? '-' : `${pace}/km`;
}

export default function SpectatorActiveScreen() {
  const { groupId, socketToken } = useLocalSearchParams<{
    groupId: string; socketToken: string;
  }>();
  const insets = useSafeAreaInsets();
  const mapRef = useRef<MapView>(null);
  const centeredRef = useRef(false);

  const [connected, setConnected] = useState(false);
  const [showList, setShowList] = useState(true);

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
        {runnerList.map((runner, i) => (
          <Marker
            key={runner.runnerId}
            coordinate={{ latitude: runner.lat, longitude: runner.lng }}
            title={runner.runnerId}
            description={`${runner.distance.toFixed(2)}km · ${formatPace(runner.pace)}`}
          >
            <View style={[styles.runnerMarker, { backgroundColor: getColor(i) }]}>
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
        {/* 패널 토글 */}
        <TouchableOpacity style={styles.panelToggle} onPress={() => setShowList((v) => !v)}>
          <Text style={styles.panelToggleText}>
            {showList ? '▼ 러너 목록 접기' : '▲ 러너 목록 보기'}
          </Text>
        </TouchableOpacity>

        {showList && (
          runnerList.length === 0 ? (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyText}>아직 달리고 있는 러너가 없습니다.</Text>
              <Text style={styles.emptySubText}>러너가 시작하면 자동으로 표시됩니다.</Text>
            </View>
          ) : (
            <ScrollView style={styles.runnerList} showsVerticalScrollIndicator={false}>
              {runnerList.map((runner, i) => (
                <TouchableOpacity
                  key={runner.runnerId}
                  activeOpacity={0.7}
                  onPress={() => mapRef.current?.animateCamera(
                    { center: { latitude: runner.lat, longitude: runner.lng }, zoom: 16 },
                    { duration: 600 },
                  )}
                >
                  <RunnerRow runner={runner} color={getColor(i)} />
                </TouchableOpacity>
              ))}
            </ScrollView>
          )
        )}

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

function RunnerRow({ runner, color }: { runner: RunnerState; color: string }) {
  return (
    <View style={styles.runnerRow}>
      <View style={[styles.runnerDot, { backgroundColor: color }]} />
      <Text style={styles.runnerName}>{runner.runnerId}</Text>
      <View style={styles.runnerStats}>
        <StatChip label="거리" value={`${runner.distance.toFixed(2)}km`} />
        <StatChip label="페이스" value={formatPace(runner.pace)} />
        <StatChip label="시간" value={formatTime(runner.time)} />
      </View>
    </View>
  );
}

function StatChip({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.chip}>
      <Text style={styles.chipLabel}>{label}</Text>
      <Text style={styles.chipValue}>{value}</Text>
    </View>
  );
}

function formatTime(sec: number): string {
  const m = Math.floor(sec / 60).toString().padStart(2, '0');
  const s = (sec % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
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
  panelToggle: {
    paddingVertical: Spacing[2],
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#374151',
  },
  panelToggleText: {
    fontSize: FontSize.xs,
    color: '#9ca3af',
    fontWeight: '600',
  },
  runnerList: { maxHeight: 180 },
  emptyBox: {
    alignItems: 'center',
    paddingVertical: Spacing[4],
    gap: 4,
  },
  emptyText: { color: Colors.white, fontSize: FontSize.sm },
  emptySubText: { color: '#6b7280', fontSize: FontSize.xs },

  runnerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing[4],
    paddingVertical: Spacing[3],
    borderBottomWidth: 1,
    borderBottomColor: '#1f2937',
    gap: Spacing[3],
  },
  runnerDot: { width: 10, height: 10, borderRadius: 5 },
  runnerName: {
    fontSize: FontSize.sm,
    fontWeight: '700',
    color: Colors.white,
    flex: 1,
  },
  runnerStats: {
    flexDirection: 'row',
    gap: Spacing[2],
  },
  chip: { alignItems: 'center', minWidth: 52 },
  chipLabel: { fontSize: 10, color: '#6b7280', fontWeight: '500' },
  chipValue: { fontSize: FontSize.xs, color: Colors.amber, fontWeight: '700' },

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
