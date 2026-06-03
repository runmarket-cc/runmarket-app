import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, Alert, TouchableOpacity, Platform,
} from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import * as Location from 'expo-location';
import { useLocalSearchParams, router } from 'expo-router';
import { Colors, FontSize, Spacing, Radius } from '../../src/constants/theme';
import { useRunnerSocket } from '../../src/hooks/useRunnerSocket';

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
  const { groupId, runnerId, socketToken } = useLocalSearchParams<{
    groupId: string; runnerId: string; socketToken: string;
  }>();

  const mapRef = useRef<MapView>(null);
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

  // ── 소켓 ──
  const { sendLocation } = useRunnerSocket({
    runnerId,
    token: socketToken,
    onOpen: () => setConnected(true),
    onClose: () => setConnected(false),
    onError: () => setConnected(false),
  });

  // ── 경과 시간 타이머 ──
  useEffect(() => {
    const id = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startTimeRef.current) / 1000));
    }, 1000);
    return () => clearInterval(id);
  }, []);

  // ── GPS 추적 ──
  useEffect(() => {
    let sub: Location.LocationSubscription | null = null;

    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('위치 권한 필요', '위치 권한을 허용해야 달리기를 시작할 수 있습니다.');
        router.back();
        return;
      }

      sub = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.BestForNavigation,
          timeInterval: 1000,
          distanceInterval: 0,
        },
        (loc) => {
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

          // 지도 카메라 따라가기
          mapRef.current?.animateCamera({ center: coord, zoom: 16 }, { duration: 500 });

          // 3초마다 소켓 전송 — distanceRef로 최신 거리를 읽어 사이드 이펙트를 updater 밖으로 분리
          const now = Date.now();
          if (now - lastSendTimeRef.current >= LOCATION_INTERVAL_MS) {
            lastSendTimeRef.current = now;
            const timeSec = Math.floor((now - startTimeRef.current) / 1000);
            const currentDist = distanceRef.current;
            sendLocation({
              lat: coord.latitude,
              lng: coord.longitude,
              pace: formatPace(currentDist > 0 ? timeSec / currentDist : 0),
              distance: Math.round(currentDist * 100) / 100,
              time: timeSec,
            });
          }
        }
      );
    })();

    return () => { sub?.remove(); };
  }, [sendLocation]);

  const handleStop = () => {
    Alert.alert('달리기 종료', '런을 종료하시겠습니까?', [
      { text: '계속 달리기', style: 'cancel' },
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
        followsUserLocation={false}
        initialRegion={
          currentCoord
            ? { ...currentCoord, latitudeDelta: 0.005, longitudeDelta: 0.005 }
            : { latitude: 37.5665, longitude: 126.978, latitudeDelta: 0.05, longitudeDelta: 0.05 }
        }
      >
        {path.length > 1 && (
          <Polyline coordinates={path} strokeColor={Colors.amber} strokeWidth={4} />
        )}
        {currentCoord && (
          <Marker coordinate={currentCoord} title="나">
            <View style={styles.myMarker}>
              <Text style={styles.myMarkerText}>🏃</Text>
            </View>
          </Marker>
        )}
      </MapView>

      {/* 연결 상태 배지 */}
      <View style={[styles.statusBadge, connected ? styles.statusConnected : styles.statusDisconnected]}>
        <Text style={styles.statusText}>
          {connected ? '● 라이브 중' : '● 연결 중...'}
        </Text>
      </View>

      {/* 통계 패널 */}
      <View style={styles.statsPanel}>
        <View style={styles.statsRow}>
          <StatBox label="시간" value={formatTime(elapsed)} />
          <StatBox label="거리" value={`${distance.toFixed(2)} km`} />
          <StatBox label="페이스" value={`${formatPace(paceSecPerKm)} /km`} />
        </View>

        <View style={styles.metaRow}>
          <Text style={styles.metaText}>그룹 {groupId} · {runnerId}</Text>
        </View>

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
  statusConnected: { backgroundColor: '#065f46' },
  statusDisconnected: { backgroundColor: '#7f1d1d' },
  statusText: { color: Colors.white, fontSize: FontSize.xs, fontWeight: '700' },

  myMarker: {
    backgroundColor: Colors.amber,
    borderRadius: 20,
    padding: 4,
    borderWidth: 2,
    borderColor: Colors.white,
  },
  myMarkerText: { fontSize: 18 },

  statsPanel: {
    backgroundColor: Colors.navy,
    paddingTop: Spacing[4],
    paddingBottom: Platform.OS === 'ios' ? 32 : Spacing[4],
    paddingHorizontal: Spacing[4],
    gap: Spacing[3],
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statBox: { flex: 1, alignItems: 'center', gap: 4 },
  statLabel: {
    fontSize: FontSize.xs,
    color: '#9ca3af',
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
  metaText: { fontSize: FontSize.xs, color: '#6b7280' },

  stopBtn: {
    backgroundColor: '#dc2626',
    borderRadius: Radius.md,
    paddingVertical: Spacing[3],
    alignItems: 'center',
  },
  stopBtnText: { color: Colors.white, fontSize: FontSize.base, fontWeight: '700' },
});
