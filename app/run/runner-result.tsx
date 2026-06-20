import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Platform, ActivityIndicator,
} from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import { useLocalSearchParams, router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, FontSize, Spacing, Radius } from '../../src/constants/theme';
import { getRun, getPoints, RunRow } from '../../src/services/runRecordStore';

interface Coord { latitude: number; longitude: number }

/** 초 → "h:mm:ss" 또는 "mm:ss" */
function formatDuration(sec: number): string {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  const mm = m.toString().padStart(2, '0');
  const ss = s.toString().padStart(2, '0');
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

/** pace(초/km) → "m:ss" */
function formatPace(secPerKm: number): string {
  if (!isFinite(secPerKm) || secPerKm <= 0) return '--:--';
  const m = Math.floor(secPerKm / 60);
  const s = Math.round(secPerKm % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

export default function RunnerResultScreen() {
  const { recordId } = useLocalSearchParams<{ recordId: string }>();
  const insets = useSafeAreaInsets();
  const mapRef = useRef<MapView>(null);

  const [loading, setLoading] = useState(true);
  const [run, setRun] = useState<RunRow | null>(null);
  const [path, setPath] = useState<Coord[]>([]);

  // 종료 직후 확정된 기록을 로컬 SQLite에서 다시 읽어온다(요약은 저장된 궤적 기준 권위값).
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const id = Number(recordId);
      if (!recordId || Number.isNaN(id)) {
        setLoading(false);
        return;
      }
      try {
        const [runRow, points] = await Promise.all([getRun(id), getPoints(id)]);
        if (cancelled) return;
        setRun(runRow);
        setPath(points.map((p) => ({ latitude: p.lat, longitude: p.lng })));
      } catch (e) {
        console.warn('[RunnerResult] 기록 조회 실패:', e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [recordId]);

  // 궤적이 모두 보이도록 지도 영역을 맞춘다.
  useEffect(() => {
    if (path.length < 2) return;
    const id = setTimeout(() => {
      mapRef.current?.fitToCoordinates(path, {
        edgePadding: { top: 60, right: 60, bottom: 60, left: 60 },
        animated: false,
      });
    }, 300);
    return () => clearTimeout(id);
  }, [path]);

  const goHome = () => router.replace('/(tabs)');

  if (loading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator color={Colors.amber} size="large" />
      </View>
    );
  }

  const distanceKm = run?.distance_km ?? 0;
  const durationSec = run?.duration_sec ?? 0;
  const paceSec = run?.avg_pace_sec_per_km ?? 0;
  const start = path[0];
  const end = path[path.length - 1];

  return (
    <View style={styles.container}>
      {/* 경로 지도 */}
      <MapView
        ref={mapRef}
        style={styles.map}
        provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
        initialRegion={
          start
            ? { ...start, latitudeDelta: 0.02, longitudeDelta: 0.02 }
            : { latitude: 37.5665, longitude: 126.978, latitudeDelta: 0.05, longitudeDelta: 0.05 }
        }
      >
        {path.length > 1 && (
          <Polyline coordinates={path} strokeColor={Colors.amber} strokeWidth={5} />
        )}
        {start && (
          <Marker coordinate={start} title="출발">
            <View style={[styles.endpoint, styles.startPoint]} />
          </Marker>
        )}
        {end && path.length > 1 && (
          <Marker coordinate={end} title="도착">
            <View style={[styles.endpoint, styles.finishPoint]} />
          </Marker>
        )}
      </MapView>

      {/* 요약 패널 */}
      <View style={[styles.panel, { paddingBottom: Math.max(insets.bottom, Platform.OS === 'ios' ? 32 : Spacing[4]) }]}>
        <Text style={styles.title}>러닝 완료 🎉</Text>

        <View style={styles.distanceWrap}>
          <Text style={styles.distanceValue}>{distanceKm.toFixed(2)}</Text>
          <Text style={styles.distanceUnit}>km</Text>
        </View>

        <View style={styles.statsRow}>
          <StatBox label="시간" value={formatDuration(durationSec)} />
          <StatBox label="평균 페이스" value={`${formatPace(paceSec)} /km`} />
        </View>

        <TouchableOpacity style={styles.homeBtn} onPress={goHome} activeOpacity={0.8}>
          <Text style={styles.homeBtnText}>홈으로</Text>
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
  center: { alignItems: 'center', justifyContent: 'center' },
  map: { flex: 1 },

  endpoint: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 3,
    borderColor: Colors.white,
  },
  startPoint: { backgroundColor: Colors.statusGreen },
  finishPoint: { backgroundColor: Colors.destructive },

  panel: {
    backgroundColor: Colors.navy,
    paddingTop: Spacing[5],
    paddingHorizontal: Spacing[4],
    gap: Spacing[4],
  },
  title: {
    fontSize: FontSize.lg,
    fontWeight: '800',
    color: Colors.white,
    textAlign: 'center',
  },
  distanceWrap: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    gap: Spacing[2],
  },
  distanceValue: {
    fontSize: 56,
    fontWeight: '900',
    color: Colors.white,
    lineHeight: 60,
  },
  distanceUnit: {
    fontSize: FontSize.xl,
    fontWeight: '700',
    color: Colors.amber,
    paddingBottom: 8,
  },
  statsRow: { flexDirection: 'row', justifyContent: 'space-between' },
  statBox: { flex: 1, alignItems: 'center', gap: Spacing[1] },
  statLabel: {
    fontSize: FontSize.xs,
    color: Colors.gray400,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statValue: {
    fontSize: FontSize.xl,
    fontWeight: '800',
    color: Colors.white,
  },
  homeBtn: {
    backgroundColor: Colors.amber,
    borderRadius: Radius.md,
    paddingVertical: Spacing[3],
    alignItems: 'center',
  },
  homeBtnText: { color: Colors.white, fontSize: FontSize.base, fontWeight: '700' },
});
