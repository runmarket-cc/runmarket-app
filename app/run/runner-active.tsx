import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, Alert, TouchableOpacity, Platform,
} from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import * as Clipboard from 'expo-clipboard';
import * as Location from 'expo-location';
import { useLocalSearchParams, router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, FontSize, Spacing, Radius } from '../../src/constants/theme';
import { useRunnerSocket } from '../../src/hooks/useRunnerSocket';
import { useRunnerLockScreen } from '../../src/hooks/useLockScreenActivity';
import { RunnerListPanel, getRunnerColor } from '../../src/components/RunnerListPanel';
import { RUN_LOCATION_TASK, setLocationHandler } from '../../src/services/backgroundLocation';

const LOCATION_INTERVAL_MS = 3000; // 3초마다 위치 전송

interface Coord { latitude: number; longitude: number }

/** 두 좌표 간 거리 (Haversine, km) */
function haversine(a: Coord, b: Coord): number {
  const R = 6371;
  const dLat = ((b.latitude - a.latitude) * Math.PI) / 180;
  const dLng = ((b.longitude - a.longitude) * Math.PI) / 180;
  const sin2 = Math.sin(dLat / 2) ** 2
    + Math.cos((a.latitude * Math.PI) / 180)
    * Math.cos((b.latitude * Math.PI) / 180)
    * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.asin(Math.sqrt(sin2));
}

/** 초 → "mm:ss" */
function formatTime(sec: number): string {
  const m = Math.floor(sec / 60).toString().padStart(2, '0');
  const s = (sec % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

/** pace(초/km) → "m:ss /km" */
function formatPace(secPerKm: number): string {
  if (!isFinite(secPerKm) || secPerKm <= 0) return '--:--';
  const m = Math.floor(secPerKm / 60);
  const s = Math.round(secPerKm % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

export default function RunnerActiveScreen() {
  const { groupId, runnerId, socketToken, color } = useLocalSearchParams<{
    groupId: string; runnerId: string; socketToken: string; color: string;
  }>();
  const insets = useSafeAreaInsets();

  const mapRef = useRef<MapView>(null);
  const centeredRef = useRef(false);
  const startTimeRef = useRef<number>(Date.now());
  const lastCoordRef = useRef<Coord | null>(null);
  const lastSendTimeRef = useRef<number>(0);
  const distanceRef = useRef<number>(0);

  const [connected, setConnected] = useState(false);
  const [path, setPath] = useState<Coord[]>([]);
  const [currentCoord, setCurrentCoord] = useState<Coord | null>(null);
  const [distance, setDistance] = useState(0); // km
  const [elapsed, setElapsed] = useState(0);   // 초
  const [paceSecPerKm, setPaceSecPerKm] = useState(0);
  const [groupCopied, setGroupCopied] = useState(false);
  const copiedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleCopyGroupId = useCallback(async () => {
    if (!groupId) return;
    await Clipboard.setStringAsync(groupId);
    setGroupCopied(true);
    if (copiedTimerRef.current) clearTimeout(copiedTimerRef.current);
    copiedTimerRef.current = setTimeout(() => setGroupCopied(false), 1500);
  }, [groupId]);

  useEffect(() => () => {
    if (copiedTimerRef.current) clearTimeout(copiedTimerRef.current);
  }, []);

  // ── 잠금 화면 위젯 ──
  useRunnerLockScreen(groupId && runnerId ? { runnerId, groupId } : null);

  // ── 소켓 ──
  const { sendLocation, otherRunners } = useRunnerSocket({
    runnerId,
    token: socketToken,
    onOpen: () => setConnected(true),
    onClose: () => setConnected(false),
    onError: () => setConnected(false),
  });

  const otherRunnerList = Array.from(otherRunners.values()).filter(
    (r) => r.runnerId && typeof r.lat === 'number' && typeof r.lng === 'number',
  );

  // ── 경과 시간 타이머 ──
  useEffect(() => {
    const id = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startTimeRef.current) / 1000));
    }, 1000);
    return () => clearInterval(id);
  }, []);

  // ── GPS 추적 (백그라운드 포함) ──
  useEffect(() => {
    let sub: Location.LocationSubscription | null = null;
    let backgroundStarted = false;

    const handleLocation = (loc: Location.LocationObject) => {
      const coord: Coord = {
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
      };

      setCurrentCoord(coord);
      setPath((prev) => [...prev, coord]);

      // 거리 누적
      if (lastCoordRef.current) {
        const delta = haversine(lastCoordRef.current, coord);
        setDistance((d) => {
          const newDist = d + delta;
          distanceRef.current = newDist;
          const timeSec = (Date.now() - startTimeRef.current) / 1000;
          if (newDist > 0) setPaceSecPerKm(timeSec / newDist);
          return newDist;
        });
      }
      lastCoordRef.current = coord;

      // 첫 GPS 수신 시에만 내 위치로 이동 (이후 자동 추적 없음)
      if (!centeredRef.current) {
        centeredRef.current = true;
        mapRef.current?.animateCamera({ center: coord, zoom: 14 }, { duration: 500 });
      }

      // 3초마다 소켓 전송 & 잠금 화면 업데이트
      const now = Date.now();
      if (now - lastSendTimeRef.current >= LOCATION_INTERVAL_MS) {
        lastSendTimeRef.current = now;
        const timeSec = Math.floor((now - startTimeRef.current) / 1000);
        const currentDist = distanceRef.current;
        const currentPace = formatPace(currentDist > 0 ? timeSec / currentDist : 0);
        sendLocation({
          lat: coord.latitude,
          lng: coord.longitude,
          pace: currentPace,
          distance: Math.round(currentDist * 100) / 100,
          time: timeSec,
          color,
        });
      }
    };

    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('위치 권한 필요', '위치 권한을 허용해야 달리기를 시작할 수 있습니다.');
        router.back();
        return;
      }

      // 백그라운드 권한: 화면이 꺼져도 위치 전송을 계속하기 위해 필요
      // (Android 11+에서는 시스템 설정 화면이 열림)
      let bg = await Location.getBackgroundPermissionsAsync().catch(() => null);
      if (bg?.status !== 'granted') {
        // 권한 요청 전에 "항상 허용"이 왜 필요한지 안내 (확인을 눌러야 진행)
        await new Promise<void>((resolve) => {
          Alert.alert(
            '위치 권한을 "항상 허용"으로 설정해주세요',
            '러닝 중 홀드 버튼을 누르거나 화면이 꺼지면 앱이 백그라운드 상태가 됩니다.\n\n'
            + '위치 권한이 "앱 사용 중에만 허용"이면 이때 위치 전송이 중단되어, 함께 달리는 러너와 관전자가 내 위치를 볼 수 없습니다.\n\n'
            + '화면이 꺼져도 실시간 위치 공유를 유지하려면 다음 화면에서 반드시 "항상 허용"을 선택해주세요.',
            [{ text: '확인', onPress: () => resolve() }],
            { cancelable: false },
          );
        });
        bg = await Location.requestBackgroundPermissionsAsync().catch(() => null);
      }

      if (bg?.status === 'granted') {
        setLocationHandler((locations) => locations.forEach(handleLocation));
        await Location.startLocationUpdatesAsync(RUN_LOCATION_TASK, {
          accuracy: Location.Accuracy.BestForNavigation,
          timeInterval: 1000,
          distanceInterval: 0,
          // iOS: 화면이 꺼지거나 앱이 백그라운드로 가도 업데이트 유지
          activityType: Location.ActivityType.Fitness,
          pausesUpdatesAutomatically: false,
          showsBackgroundLocationIndicator: true,
          // Android: 포그라운드 서비스로 프로세스를 살려둬야 소켓 전송이 계속됨
          foregroundService: {
            notificationTitle: '런마켓 러닝 중',
            notificationBody: '실시간으로 위치를 공유하고 있습니다.',
            notificationColor: '#FF8A00',
            killServiceOnDestroy: true,
          },
        });
        backgroundStarted = true;
      } else {
        // 백그라운드 권한 거부 시 기존 포그라운드 추적으로 폴백
        Alert.alert(
          '백그라운드 위치 권한',
          '위치 권한을 "항상 허용"으로 설정하지 않으면 화면이 꺼졌을 때 위치 전송이 중단될 수 있습니다.',
        );
        sub = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.BestForNavigation,
            timeInterval: 1000,
            distanceInterval: 0,
          },
          handleLocation,
        );
      }
    })();

    return () => {
      sub?.remove();
      setLocationHandler(null);
      if (backgroundStarted) {
        Location.hasStartedLocationUpdatesAsync(RUN_LOCATION_TASK)
          .then((started) => {
            if (started) return Location.stopLocationUpdatesAsync(RUN_LOCATION_TASK);
          })
          .catch(() => {});
      }
    };
  }, [sendLocation]);

  const handleStop = () => {
    Alert.alert('달리기 종료', '런을 종료하시겠습니까?', [
      { text: '계속 달리기', style: 'cancel' },
      { text: '종료', style: 'destructive', onPress: () => router.replace('/(tabs)') },
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
        followsUserLocation={false}
        initialRegion={
          currentCoord
            ? { ...currentCoord, latitudeDelta: 0.05, longitudeDelta: 0.05 }
            : { latitude: 37.5665, longitude: 126.978, latitudeDelta: 0.05, longitudeDelta: 0.05 }
        }
      >
        {path.length > 1 && (
          <Polyline coordinates={path} strokeColor={Colors.amber} strokeWidth={4} />
        )}
        {otherRunnerList.map((runner) => (
          <Marker
            key={runner.runnerId}
            coordinate={{ latitude: runner.lat, longitude: runner.lng }}
            title={runner.runnerId}
            description={`${(runner.distance ?? 0).toFixed(2)}km · ${runner.pace ?? '--:--'}/km`}
          >
            <View style={[styles.otherMarker, { backgroundColor: runner.color ?? getRunnerColor(runner.runnerId) }]}>
              <Text style={styles.myMarkerText}>🏃</Text>
            </View>
          </Marker>
        ))}
        {currentCoord && (
          <Marker coordinate={currentCoord} title="나">
            <View style={[styles.myMarker, { backgroundColor: color ?? Colors.amber }]}>
              <Text style={styles.myMarkerText}>🏃</Text>
            </View>
          </Marker>
        )}
      </MapView>

      {/* 연결 상태 배지 */}
      <View style={[styles.statusBadge, connected ? styles.statusConnected : styles.statusDisconnected, { top: insets.top + Spacing[3] }]}>
        <Text style={styles.statusText}>
          {connected ? '● 라이브 중' : '● 연결 중...'}
        </Text>
      </View>

      {/* 다른 러너 목록 패널 */}
      {otherRunnerList.length > 0 && (
        <View style={styles.runnerPanel}>
          <RunnerListPanel
            title="함께 달리는 러너"
            description="러너를 탭하면 해당 위치로 지도가 이동합니다."
            runners={otherRunnerList}
            onPressRunner={(runner) => mapRef.current?.animateCamera(
              { center: { latitude: runner.lat, longitude: runner.lng }, zoom: 16 },
              { duration: 600 },
            )}
          />
        </View>
      )}

      {/* 통계 패널 */}
      <View style={[styles.statsPanel, { paddingBottom: Math.max(insets.bottom, Platform.OS === 'ios' ? 32 : Spacing[4]) }]}>
        <View style={styles.statsRow}>
          <StatBox label="시간" value={formatTime(elapsed)} />
          <StatBox label="거리" value={`${distance.toFixed(2)} km`} />
          <StatBox label="페이스" value={`${formatPace(paceSecPerKm)} /km`} />
        </View>

        <TouchableOpacity style={styles.metaRow} onPress={handleCopyGroupId} activeOpacity={0.6}>
          <Text style={styles.metaText}>
            {groupCopied ? '그룹 코드가 복사되었습니다 ✓' : `그룹 ${groupId} · ${runnerId}`}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.stopBtn} onPress={handleStop} activeOpacity={0.8}>
          <Text style={styles.stopBtnText}>■  종료</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function StatBox({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.statBox}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
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
  statusConnected: { backgroundColor: Colors.statusOnline },
  statusDisconnected: { backgroundColor: Colors.statusOffline },
  statusText: { color: Colors.white, fontSize: FontSize.xs, fontWeight: '700' },

  myMarker: {
    backgroundColor: Colors.amber,
    borderRadius: 20,
    padding: 4,
    borderWidth: 2,
    borderColor: Colors.white,
  },
  otherMarker: {
    borderRadius: 20,
    padding: 4,
    borderWidth: 2,
    borderColor: Colors.white,
  },
  runnerPanel: {
    backgroundColor: Colors.navy,
    maxHeight: 240,
  },
  myMarkerText: { fontSize: 18 },

  statsPanel: {
    backgroundColor: Colors.navy,
    paddingTop: Spacing[4],
    paddingHorizontal: Spacing[4],
    gap: Spacing[3],
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statBox: { flex: 1, alignItems: 'center', gap: Spacing[1] },
  statLabel: {
    fontSize: FontSize.xs,
    color: Colors.gray400,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statValue: {
    fontSize: FontSize.lg,
    fontWeight: '800',
    color: Colors.white,
  },
  metaRow: { alignItems: 'center' },
  metaText: { fontSize: FontSize.xs, color: Colors.mutedForeground },

  stopBtn: {
    backgroundColor: Colors.destructive,
    borderRadius: Radius.md,
    paddingVertical: Spacing[3],
    alignItems: 'center',
  },
  stopBtnText: { color: Colors.white, fontSize: FontSize.base, fontWeight: '700' },
});
