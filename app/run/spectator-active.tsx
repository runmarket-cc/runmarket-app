import React, { useRef, useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Platform, Alert,
} from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import * as Clipboard from 'expo-clipboard';
import { useLocalSearchParams, router, useNavigation } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, FontSize, Spacing, Radius } from '../../src/constants/theme';
import { useSpectatorSocket } from '../../src/hooks/useSpectatorSocket';
import { useSpectatorLockScreen } from '../../src/hooks/useLockScreenActivity';
import { RunnerListPanel, getRunnerColor, type RunnerInfo } from '../../src/components/RunnerListPanel';
import { HeaderBackButton } from './_layout';

export default function SpectatorActiveScreen() {
  const { groupId, socketToken } = useLocalSearchParams<{
    groupId: string; socketToken: string;
  }>();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const mapRef = useRef<MapView>(null);
  const centeredRef = useRef(false);

  const [connected, setConnected] = useState(false);
  const [groupCopied, setGroupCopied] = useState(false);
  const [selectedRunnerId, setSelectedRunnerId] = useState<string | null>(null);
  const [milestoneNotice, setMilestoneNotice] = useState<{ runnerId: string; km: number; pace: string } | null>(null);
  const copiedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const milestoneTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleCopyGroupId = useCallback(async () => {
    if (!groupId) return;
    await Clipboard.setStringAsync(groupId);
    setGroupCopied(true);
    if (copiedTimerRef.current) clearTimeout(copiedTimerRef.current);
    copiedTimerRef.current = setTimeout(() => setGroupCopied(false), 1500);
  }, [groupId]);

  useEffect(() => () => {
    if (copiedTimerRef.current) clearTimeout(copiedTimerRef.current);
    if (milestoneTimerRef.current) clearTimeout(milestoneTimerRef.current);
  }, []);

  const handleMilestone = useCallback((milestone: { runnerId: string; km: number; pace: string }) => {
    setMilestoneNotice(milestone);
    if (milestoneTimerRef.current) clearTimeout(milestoneTimerRef.current);
    milestoneTimerRef.current = setTimeout(() => {
      setMilestoneNotice(null);
    }, 4000);
  }, []);

  const { runners } = useSpectatorSocket({
    groupId,
    token: socketToken,
    onOpen: () => setConnected(true),
    onClose: () => setConnected(false),
    onError: () => setConnected(false),
    onMilestone: handleMilestone,
  });

  const runnerList = Array.from(runners.values());

  // 러너가 1명이면 자동으로 포커스 러너로 지정
  useEffect(() => {
    if (runnerList.length === 1 && !selectedRunnerId) {
      setSelectedRunnerId(runnerList[0].runnerId);
    }
  }, [runnerList, selectedRunnerId]);

  const focusedRunner = runnerList.find((r) => r.runnerId === selectedRunnerId) ?? (runnerList.length === 1 ? runnerList[0] : null);

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

  const handleStop = useCallback(() => {
    Alert.alert('관전 종료', '관전을 종료하시겠습니까?', [
      { text: '계속 보기', style: 'cancel' },
      { text: '종료', style: 'destructive', onPress: () => router.replace('/(tabs)') },
    ]);
  }, []);

  useEffect(() => {
    navigation.setOptions({
      headerBackVisible: false,
      headerLeft: () => <HeaderBackButton onPress={handleStop} />,
    });
  }, [navigation, handleStop]);

  const handleSelectRunner = useCallback((runner: RunnerInfo) => {
    setSelectedRunnerId(runner.runnerId);
    mapRef.current?.animateCamera(
      { center: { latitude: runner.lat, longitude: runner.lng }, zoom: 16 },
      { duration: 600 },
    );
  }, []);

  return (
    <View style={styles.container}>
      {/* 지도 영역 */}
      <View style={styles.mapWrap}>
        <MapView
          ref={mapRef}
          style={styles.map}
          provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
          initialRegion={{
            latitude: 37.5665,
            longitude: 126.978,
            latitudeDelta: 0.05,
            longitudeDelta: 0.05,
          }}
        >
          {runnerList.map((runner) => {
            const currentKm = Math.floor(runner.distance ?? 0) + 1;
            const lapPace = runner.lapPace && runner.lapPace !== '--:--' ? runner.lapPace : runner.pace;
            return (
              <Marker
                key={runner.runnerId}
                coordinate={{ latitude: runner.lat, longitude: runner.lng }}
                title={runner.runnerId}
                description={`${runner.distance.toFixed(2)}km · 현재 ${currentKm}km 페이스: ${lapPace}/km (평균 ${runner.pace}/km)`}
                onPress={() => handleSelectRunner(runner)}
              >
                <View style={[styles.runnerMarker, { backgroundColor: runner.color ?? getRunnerColor(runner.runnerId) }]}>
                  <Text style={styles.runnerMarkerText}>🏃</Text>
                </View>
              </Marker>
            );
          })}
        </MapView>

        {/* 연결 상태 배지 */}
        <View style={[styles.statusBadge, connected ? styles.statusConnected : styles.statusDisconnected, { top: insets.top + Spacing[3] }]}>
          <Text style={styles.statusText}>
            {connected ? `● 라이브 · ${runnerList.length}명` : '● 연결 중...'}
          </Text>
        </View>

        {/* 1km 마일스톤 돌파 HUD 배너 */}
        {milestoneNotice && (
          <View style={[styles.milestoneBanner, { top: insets.top + Spacing[3] + 36 }]}>
            <Text style={styles.milestoneIcon}>🏁</Text>
            <View style={styles.milestoneContent}>
              <Text style={styles.milestoneTitle}>{milestoneNotice.runnerId} · {milestoneNotice.km}km 완료!</Text>
              <Text style={styles.milestoneSubtitle}>
                1km 구간 페이스 <Text style={styles.milestonePace}>{milestoneNotice.pace} /km</Text>
              </Text>
            </View>
          </View>
        )}

        {/* 선택된 러너 실시간 상세 현황 HUD 카드 */}
        {focusedRunner && (
          <View style={styles.focusCard}>
            <View style={styles.focusHeader}>
              <View style={styles.focusHeaderLeft}>
                <View style={[styles.focusDot, { backgroundColor: focusedRunner.color ?? getRunnerColor(focusedRunner.runnerId) }]} />
                <Text style={styles.focusName} numberOfLines={1}>{focusedRunner.runnerId}</Text>
                <View style={styles.focusLiveTag}>
                  <Text style={styles.focusLiveText}>실시간</Text>
                </View>
              </View>
              {runnerList.length > 1 && (
                <TouchableOpacity
                  style={styles.focusCloseBtn}
                  onPress={() => setSelectedRunnerId(null)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Text style={styles.focusCloseText}>✕</Text>
                </TouchableOpacity>
              )}
            </View>

            <View style={styles.statsGrid}>
              <View style={styles.statsRow}>
                <View style={styles.statBox}>
                  <Text style={styles.statLabel}>운동 시간</Text>
                  <Text style={styles.statValue}>{formatTime(focusedRunner.time ?? 0)}</Text>
                </View>
                <View style={styles.statBox}>
                  <Text style={styles.statLabel}>달린 거리</Text>
                  <Text style={styles.statValue}>{(focusedRunner.distance ?? 0).toFixed(2)} km</Text>
                </View>
              </View>
              <View style={styles.statsRow}>
                <View style={styles.statBox}>
                  <Text style={[styles.statLabel, styles.statLabelHighlight]}>
                    현재 {Math.floor(focusedRunner.distance ?? 0) + 1}km 페이스
                  </Text>
                  <Text style={[styles.statValue, styles.statValueHighlight]}>
                    {focusedRunner.lapPace && focusedRunner.lapPace !== '--:--'
                      ? `${focusedRunner.lapPace} /km`
                      : focusedRunner.pace === '--:--' ? '-' : `${focusedRunner.pace} /km`}
                  </Text>
                </View>
                <View style={styles.statBox}>
                  <Text style={styles.statLabel}>전체 평균 페이스</Text>
                  <Text style={styles.statValue}>
                    {focusedRunner.pace === '--:--' ? '-' : `${focusedRunner.pace} /km`}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        )}
      </View>

      {/* 하단 패널 */}
      <View style={[styles.panel, { paddingBottom: Math.max(insets.bottom, Platform.OS === 'ios' ? 32 : Spacing[4]) }]}>
        <RunnerListPanel
          title="러너 목록"
          description="러너를 탭하면 현재 1km 페이스 상세 정보와 위치를 확인합니다."
          runners={runnerList}
          onPressRunner={handleSelectRunner}
        />

        <View style={styles.footer}>
          <TouchableOpacity onPress={handleCopyGroupId} activeOpacity={0.6}>
            <Text style={styles.footerMeta}>
              {groupCopied ? '그룹 코드가 복사되었습니다 ✓' : `그룹 코드: ${groupId}`}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.stopBtn} onPress={handleStop} activeOpacity={0.8}>
            <Text style={styles.stopBtnText}>종료</Text>
          </TouchableOpacity>
        </View>
      </View>
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
  mapWrap: { flex: 1, position: 'relative' },
  map: { flex: 1 },

  statusBadge: {
    position: 'absolute',
    top: Spacing[3],
    alignSelf: 'center',
    paddingHorizontal: Spacing[3],
    paddingVertical: 5,
    borderRadius: Radius.full,
    zIndex: 10,
  },
  statusConnected: { backgroundColor: Colors.statusOnline },
  statusDisconnected: { backgroundColor: Colors.statusOffline },
  statusText: { color: Colors.white, fontSize: FontSize.xs, fontWeight: '700' },

  milestoneBanner: {
    position: 'absolute',
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.95)',
    borderWidth: 1.5,
    borderColor: Colors.amber,
    borderRadius: Radius.lg,
    paddingVertical: Spacing[2],
    paddingHorizontal: Spacing[4],
    gap: Spacing[3],
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    zIndex: 20,
  },
  milestoneIcon: {
    fontSize: 22,
  },
  milestoneContent: {
    alignItems: 'flex-start',
  },
  milestoneTitle: {
    color: Colors.white,
    fontSize: FontSize.sm,
    fontWeight: '800',
  },
  milestoneSubtitle: {
    color: Colors.gray400,
    fontSize: FontSize.xs,
    fontWeight: '500',
  },
  milestonePace: {
    color: Colors.amber,
    fontWeight: '700',
  },

  focusCard: {
    position: 'absolute',
    bottom: Spacing[2],
    left: Spacing[3],
    right: Spacing[3],
    backgroundColor: 'rgba(15, 23, 42, 0.92)',
    borderRadius: Radius.lg,
    padding: Spacing[3],
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.14)',
    gap: Spacing[2],
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
    zIndex: 10,
  },
  focusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  focusHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[2],
    flex: 1,
  },
  focusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  focusName: {
    color: Colors.white,
    fontSize: FontSize.sm,
    fontWeight: '800',
    flexShrink: 1,
  },
  focusLiveTag: {
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.4)',
  },
  focusLiveText: {
    color: '#34d399',
    fontSize: 10,
    fontWeight: '700',
  },
  focusCloseBtn: {
    paddingHorizontal: Spacing[2],
    paddingVertical: Spacing[1],
  },
  focusCloseText: {
    color: Colors.gray400,
    fontSize: FontSize.sm,
    fontWeight: '700',
  },
  statsGrid: {
    gap: Spacing[2],
  },
  statsRow: {
    flexDirection: 'row',
    gap: Spacing[2],
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    paddingVertical: Spacing[2],
    paddingHorizontal: Spacing[1],
    borderRadius: Radius.md,
    gap: 2,
  },
  statLabel: {
    fontSize: 10,
    color: Colors.gray400,
    fontWeight: '600',
  },
  statLabelHighlight: {
    color: Colors.amber,
  },
  statValue: {
    fontSize: FontSize.sm,
    fontWeight: '800',
    color: Colors.white,
  },
  statValueHighlight: {
    color: Colors.amber,
  },

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
  footerMeta: { fontSize: FontSize.xs, color: Colors.mutedForeground },
  stopBtn: {
    backgroundColor: Colors.destructive,
    paddingHorizontal: Spacing[4],
    paddingVertical: Spacing[3],
    borderRadius: Radius.md,
  },
  stopBtnText: { color: Colors.white, fontSize: FontSize.sm, fontWeight: '700' },
});
