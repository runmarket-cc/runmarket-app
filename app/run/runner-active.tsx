import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, Alert, TouchableOpacity, Platform, Linking, AppState, Vibration, Modal, Pressable, ScrollView, useWindowDimensions, type AppStateStatus,
} from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import * as Clipboard from 'expo-clipboard';
import * as Location from 'expo-location';
import * as SecureStore from 'expo-secure-store';
import { useLocalSearchParams, router, useNavigation } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, FontSize, Spacing, Radius } from '../../src/constants/theme';
import { useRunnerSocket } from '../../src/hooks/useRunnerSocket';
import { useRunnerLockScreen } from '../../src/hooks/useLockScreenActivity';
import { RunnerListPanel, getRunnerColor } from '../../src/components/RunnerListPanel';
import { RUN_LOCATION_TASK, setLocationHandler } from '../../src/services/backgroundLocation';
import { createRun, appendPoint, finishRun, deleteRun } from '../../src/services/runRecordStore';
import { syncPendingRuns } from '../../src/services/runSync';
import { HeaderBackButton } from './_layout';
import { LocationDisclosureModal } from '../../src/components/LocationDisclosureModal';
import { BatteryOptimizationGuideModal } from '../../src/components/BatteryOptimizationGuideModal';
import { RunTouchLock } from '../../src/components/RunTouchLock';
import { getCourseByGroupId } from '../../src/constants/courses';

const LOCATION_INTERVAL_MS = 3000; // 3초마다 위치 전송

// GPS 잡음/정지 필터 (runRecordStore의 권위 계산과 동일한 기준).
// 멈춰 있을 때 GPS가 흔들려 생기는 가짜 이동을 거리·페이스·궤적에서 제외한다.
const MAX_ACCURACY_M = 30; // 정확도가 이보다 나쁜 점은 무시
const MAX_SPEED_MPS = 8;   // ≈2:05/km 초과 이동은 GPS 튐으로 간주
const MIN_MOVE_M = 3;      // 직전 채택 지점 대비 이동량이 이보다 작으면 멈춤으로 간주

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
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { height: windowHeight, fontScale } = useWindowDimensions();
  const [runnersVisible, setRunnersVisible] = useState(false);

  const course = getCourseByGroupId(groupId);

  const mapRef = useRef<MapView>(null);
  const centeredRef = useRef(false);
  const startTimeRef = useRef<number>(0);
  const lastCoordRef = useRef<Coord | null>(null);
  // 직전 "채택 지점"의 수신 시각(ms). 정지 판정(구간 속도 계산)에 쓴다.
  const lastPointTsRef = useRef<number>(0);
  const lastSendTimeRef = useRef<number>(0);
  const distanceRef = useRef<number>(0);
  // 가장 최근에 산정한 페이스(초/km). 정지 구간에는 갱신하지 않아 화면·소켓이 일관된다.
  const paceSecPerKmRef = useRef<number>(0);
  // ── 1km 구간(Lap) 페이스 산정용 ref ──
  const lastLapDistRef = useRef<number>(0);
  const lastLapTimeSecRef = useRef<number>(0);
  const lastKmFloorRef = useRef<number>(0);
  const lapPaceSecPerKmRef = useRef<number>(0);
  // 로컬 기록(SQLite) row id. 시작 시 생성되며, 종료 시 finalize 대상.
  const runRecordIdRef = useRef<number | null>(null);

  // ── 러닝 상태 머신: idle(시작 전) → running ⇄ paused → (종료) ──
  // ref는 위치 콜백 클로저에서 최신 상태를 읽기 위함, state는 UI 갱신용.
  const runStateRef = useRef<'idle' | 'running' | 'paused'>('idle');
  const [runState, setRunState] = useState<'idle' | 'running' | 'paused'>('idle');
  // Touch protection is independent of the running/paused recording state.
  const [touchLocked, setTouchLocked] = useState(false);
  // 앱 포그라운드/백그라운드 상태 추적 (백그라운드 시 UI 리렌더링 차단용)
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);
  // 전체 누적 궤적(백그라운드에서 UI 리렌더링 없이 O(1)로 점을 축적하는 버퍼)
  const fullPathRef = useRef<Coord[]>([]);
  // 경과 시간 누적(ms). 일시정지 구간은 제외된다.
  const accumulatedMsRef = useRef<number>(0);
  // 현재 running 구간이 시작된 시각(ms). running일 때만 유효.
  const segmentStartRef = useRef<number>(0);
  // 위치 구독/백그라운드 추적 핸들 (정리 시 해제).
  const mountedRef = useRef(true);
  const startingRef = useRef(false);
  const [starting, setStarting] = useState(false);
  const backgroundStartedRef = useRef(false);

  // 일시정지를 제외한 현재까지의 경과 시간(ms).
  const currentElapsedMs = () =>
    accumulatedMsRef.current
    + (runStateRef.current === 'running' ? Date.now() - segmentStartRef.current : 0);

  const [connected, setConnected] = useState(false);
  const [path, setPath] = useState<Coord[]>([]);
  const [currentCoord, setCurrentCoord] = useState<Coord | null>(null);
  const [distance, setDistance] = useState(0); // km
  const [elapsed, setElapsed] = useState(0);   // 초
  const [paceSecPerKm, setPaceSecPerKm] = useState(0);
  const [lapPaceSecPerKm, setLapPaceSecPerKm] = useState(0); // 현재 1km 구간 페이스
  // 1km 돌파 HUD 알림 배너 상태
  const [milestoneNotice, setMilestoneNotice] = useState<{ km: number; paceSec: number } | null>(null);
  const milestoneTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
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
    if (milestoneTimerRef.current) clearTimeout(milestoneTimerRef.current);
  }, []);

  // ── 구글 플레이 명시적 고지 모달 상태 관리 ──
  const [showDisclosure, setShowDisclosure] = useState(false);
  const disclosureResolverRef = useRef<((agreed: boolean) => void) | null>(null);

  // ── Android 배터리 최적화 상세 가이드 모달 상태 관리 ──
  const [showBatteryGuide, setShowBatteryGuide] = useState(false);

  const requestDisclosure = useCallback(() => {
    return new Promise<boolean>((resolve) => {
      disclosureResolverRef.current = resolve;
      setShowDisclosure(true);
    });
  }, []);

  const handleDisclosureAccept = useCallback(() => {
    setShowDisclosure(false);
    disclosureResolverRef.current?.(true);
    disclosureResolverRef.current = null;
  }, []);

  const handleDisclosureDecline = useCallback(() => {
    setShowDisclosure(false);
    disclosureResolverRef.current?.(false);
    disclosureResolverRef.current = null;
  }, []);

  // ── 잠금 화면 위젯 (러닝 시작 후에만 활성화) ──
  useRunnerLockScreen(
    runState !== 'idle' && groupId && runnerId ? { runnerId, groupId } : null,
  );

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

  // ── 백그라운드 ↔ 포그라운드 전환 시 UI 동기화 ──
  // 백그라운드에서는 React 리렌더링(setPath, setDistance 등)을 건너뛰어 메모리 누수와
  // Android Low Memory Killer(LMK) 사살을 방지하고, 포그라운드로 복귀할 때 한 번에 반영한다.
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (
        appStateRef.current.match(/inactive|background/) &&
        nextAppState === 'active'
      ) {
        if (fullPathRef.current.length > 0) {
          setPath([...fullPathRef.current]);
        }
        if (lastCoordRef.current) {
          setCurrentCoord(lastCoordRef.current);
        }
        setDistance(distanceRef.current);
        setPaceSecPerKm(paceSecPerKmRef.current);
        setElapsed(Math.floor(currentElapsedMs() / 1000));
      }
      appStateRef.current = nextAppState;
    });
    return () => subscription.remove();
  }, []);

  // ── 경과 시간 타이머 (running 중에만 진행, 활성 상태에서만 UI 갱신) ──
  useEffect(() => {
    const id = setInterval(() => {
      if (runStateRef.current === 'running' && appStateRef.current === 'active') {
        setElapsed(Math.floor(currentElapsedMs() / 1000));
      }
    }, 1000);
    return () => clearInterval(id);
  }, []);

  // ── GPS 위치 콜백 ──
  // running 상태에서만 거리/페이스를 누적하고 기록·소켓 전송을 수행한다.
  // paused 상태에서 들어오는 점은 무시한다(일시정지 구간이 거리/시간에 포함되지 않도록).
  const handleLocation = useCallback((loc: Location.LocationObject) => {
    if (runStateRef.current !== 'running') return;

    const coord: Coord = {
      latitude: loc.coords.latitude,
      longitude: loc.coords.longitude,
    };

    const now = Date.now();
    const isAppActive = appStateRef.current === 'active';
    if (isAppActive) {
      setCurrentCoord(coord);
    }

    // ── 거리·페이스 누적 (GPS 잡음/정지 구간은 제외) ──
    // 직전 채택 지점과의 이동량·속도로 정상 이동인지 판정한다.
    // - 정확도가 나쁘거나, 이동량이 잡음 수준이거나, 속도가 비현실적이면 "멈춤"으로 보고 무시
    // - 무시할 때는 기준점을 갱신하지 않아, 천천히 걸어도 누적이 끊기지 않는다
    let moved = true;
    if (lastCoordRef.current) {
      const delta = haversine(lastCoordRef.current, coord); // km
      const movedM = delta * 1000;
      const dtSec = lastPointTsRef.current ? (now - lastPointTsRef.current) / 1000 : 0;
      const speedMps = dtSec > 0 ? movedM / dtSec : 0;
      const noiseM = Math.max(MIN_MOVE_M, loc.coords.accuracy ?? 0);

      if ((loc.coords.accuracy ?? 0) > MAX_ACCURACY_M
        || movedM < noiseM
        || speedMps > MAX_SPEED_MPS) {
        moved = false; // 비정상 페이스 = 멈춤(또는 GPS 튐) → 거리·페이스에 반영하지 않음
      } else {
        const newDist = distanceRef.current + delta;
        distanceRef.current = newDist;
        const timeSec = currentElapsedMs() / 1000;
        const pace = newDist > 0 ? timeSec / newDist : 0;
        paceSecPerKmRef.current = pace;

        // ── 1km 마일스톤 돌파 감지 (1.0km, 2.0km 등) ──
        const currentKmFloor = Math.floor(newDist);
        if (currentKmFloor > lastKmFloorRef.current && currentKmFloor >= 1) {
          const completedDist = newDist - lastLapDistRef.current;
          const completedTime = timeSec - lastLapTimeSecRef.current;
          const splitPace = completedDist > 0 ? completedTime / completedDist : pace;

          try {
            Vibration.vibrate([0, 200, 100, 200]);
          } catch {}

          if (isAppActive) {
            setMilestoneNotice({ km: currentKmFloor, paceSec: splitPace });
            if (milestoneTimerRef.current) clearTimeout(milestoneTimerRef.current);
            milestoneTimerRef.current = setTimeout(() => {
              setMilestoneNotice(null);
            }, 4000);
          }

          lastKmFloorRef.current = currentKmFloor;
          lastLapDistRef.current = newDist;
          lastLapTimeSecRef.current = timeSec;
        }

        // ── 현재 달리고 있는 1km 구간 페이스 산정 ──
        const curLapDist = newDist - lastLapDistRef.current;
        const curLapTime = timeSec - lastLapTimeSecRef.current;
        // 최소 15m 이상 이동했을 때 구간 페이스 산정 (초반 노이즈/0 나누기 방지)
        const curLapPace = curLapDist >= 0.015 ? curLapTime / curLapDist : pace;
        lapPaceSecPerKmRef.current = curLapPace;

        if (isAppActive) {
          setDistance(newDist);
          setPaceSecPerKm(pace);
          setLapPaceSecPerKm(curLapPace);
        }
      }
    }
    // 채택한 점에서만 기준점·궤적을 갱신 (정지 중 지그재그 방지)
    if (moved) {
      lastCoordRef.current = coord;
      lastPointTsRef.current = now;
      fullPathRef.current.push(coord);
      if (isAppActive) {
        setPath((prev) => [...prev, coord]);
      }
    }

    // 첫 GPS 수신 시에만 내 위치로 이동 (이후 자동 추적 없음)
    if (!centeredRef.current) {
      centeredRef.current = true;
      if (isAppActive) {
        mapRef.current?.animateCamera({ center: coord, zoom: 14 }, { duration: 500 });
      }
    }

    // 3초마다 소켓 전송 & 잠금 화면 업데이트 & 로컬 기록 적재
    if (now - lastSendTimeRef.current >= LOCATION_INTERVAL_MS) {
      lastSendTimeRef.current = now;
      const timeSec = Math.floor(currentElapsedMs() / 1000);
      const currentDist = distanceRef.current;
      const currentPace = formatPace(paceSecPerKmRef.current);
      const currentLapPace = formatPace(lapPaceSecPerKmRef.current);
      sendLocation({
        lat: coord.latitude,
        lng: coord.longitude,
        pace: currentPace,
        lapPace: currentLapPace,
        distance: Math.round(currentDist * 100) / 100,
        time: timeSec,
        color,
      });

      // 실시간 전송과 별개로 궤적을 로컬에 적재(기록의 source of truth).
      // 소켓/네트워크가 끊겨도 여기 쌓인 점들로 기록이 보존된다.
      const recordId = runRecordIdRef.current;
      if (recordId != null) {
        appendPoint(recordId, {
          lat: coord.latitude,
          lng: coord.longitude,
          accuracy: loc.coords.accuracy ?? null,
          ts: now,
        }).catch(() => {});
      }
    }
  }, [sendLocation, color]);

  // 위치 추적 중지 + 백그라운드 작업 해제 (정지/언마운트 공용)
  const stopLocationTracking = useCallback(() => {
    setLocationHandler(null);
    if (backgroundStartedRef.current) {
      backgroundStartedRef.current = false;
      Location.hasStartedLocationUpdatesAsync(RUN_LOCATION_TASK)
        .then((started) => {
          if (started) return Location.stopLocationUpdatesAsync(RUN_LOCATION_TASK);
        })
        .catch(() => {});
    }
  }, []);

  // 언마운트 시 추적 정리
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      disclosureResolverRef.current?.(false);
      disclosureResolverRef.current = null;
      stopLocationTracking();
    };
  }, [stopLocationTracking]);

  // 사용자가 화면에서 시작한 러닝은 사용 중 권한으로 잠금/앱 전환 후에도 추적한다.
  const startTracking = useCallback(async () => {
    if (runStateRef.current !== 'idle' || startingRef.current) return;
    startingRef.current = true;
    setStarting(true);
    let trackingAttempted = false;
    let pendingRecordId: number | null = null;

    try {
      let fg = await Location.getForegroundPermissionsAsync();
      if (!mountedRef.current) return;
      if (fg.status !== 'granted') {
        const userAgreed = await requestDisclosure();
        if (!userAgreed || !mountedRef.current) return;
      }

      // 사용 중 권한만 요청한다.
      if (fg.status !== 'granted') {
        fg = await Location.requestForegroundPermissionsAsync();
        if (!mountedRef.current) return;
        if (fg.status !== 'granted') {
          // canAskAgain=false면 이미 영구 거부되어 시스템 다이얼로그가 더는 안 뜬다.
          // 이 경우 앱 설정으로 직접 보내야 사용자가 권한을 복구할 수 있다.
          Alert.alert(
            '위치 권한 필요',
            fg.canAskAgain
              ? '위치 권한을 허용해야 달리기를 시작할 수 있습니다.'
              : '위치 권한이 거부되어 있습니다. 설정 > 런마켓에서 위치 접근을 "앱 사용 중"으로 허용해주세요.',
            fg.canAskAgain
              ? [{ text: '확인' }]
              : [
                  { text: '취소', style: 'cancel' },
                  { text: '설정 열기', onPress: () => Linking.openSettings() },
                ],
          );
          return;
        }
      }

      // Android의 위치 포그라운드 서비스는 앱이 보이는 상태에서 시작해야 한다.
      if (!mountedRef.current) return;
      if (AppState.currentState !== 'active') {
        Alert.alert('러닝 시작 대기', '앱 화면으로 돌아온 뒤 시작을 다시 눌러주세요.');
        return;
      }
      trackingAttempted = true;
      await Location.startLocationUpdatesAsync(RUN_LOCATION_TASK, {
        accuracy: Location.Accuracy.BestForNavigation,
        timeInterval: 3000,
        distanceInterval: 3,
        // iOS: 화면이 꺼지거나 앱이 백그라운드로 가도 업데이트 유지
        activityType: Location.ActivityType.Fitness,
        pausesUpdatesAutomatically: false,
        showsBackgroundLocationIndicator: true,
        // Android: 포그라운드 서비스로 프로세스를 살려둬야 소켓 전송이 계속됨
        foregroundService: {
          notificationTitle: '런마켓 러닝 중',
          notificationBody: '실시간으로 위치를 공유하고 있습니다.',
          notificationColor: '#FF8A00',
          killServiceOnDestroy: false,
        },
      });

      if (!mountedRef.current) return;

      // 서비스 시작 실패 시 빈 기록을 남기지 않도록 시작 성공 후 생성한다.
      startTimeRef.current = Date.now();
      if (groupId && runnerId) {
        pendingRecordId = await createRun({
          groupId, runnerId, color, startedAt: startTimeRef.current,
        });
      }
      if (!mountedRef.current) return;
      runRecordIdRef.current = pendingRecordId;
      backgroundStartedRef.current = true;
      setLocationHandler((locations) => locations.forEach(handleLocation));
      accumulatedMsRef.current = 0;
      segmentStartRef.current = startTimeRef.current;
      lastCoordRef.current = null;
      lastPointTsRef.current = 0;
      paceSecPerKmRef.current = 0;
      lastLapDistRef.current = 0;
      lastLapTimeSecRef.current = 0;
      lastKmFloorRef.current = 0;
      lapPaceSecPerKmRef.current = 0;
      lastSendTimeRef.current = 0;
      distanceRef.current = 0;
      fullPathRef.current = [];
      runStateRef.current = 'running';
      setRunState('running');
      setElapsed(0);
      setDistance(0);
      setPaceSecPerKm(0);
      setLapPaceSecPerKm(0);
      setMilestoneNotice(null);
      if (milestoneTimerRef.current) clearTimeout(milestoneTimerRef.current);
      setPath([]);
    } catch (error) {
      console.warn('[RunnerActive] 러닝 시작 실패:', error);
      if (mountedRef.current) {
        Alert.alert('러닝 시작 실패', '위치 서비스와 권한을 확인하고 앱 화면에서 다시 시작해주세요.');
      }
    } finally {
      // 시작 요청 중 화면을 나갔거나 실패했다면 늦게 생성된 서비스/기록도 정리한다.
      if (runStateRef.current === 'idle') {
        if (trackingAttempted) {
          try {
            if (await Location.hasStartedLocationUpdatesAsync(RUN_LOCATION_TASK)) {
              await Location.stopLocationUpdatesAsync(RUN_LOCATION_TASK);
            }
          } catch (error) {
            console.warn('[RunnerActive] 시작 취소 후 위치 추적 정리 실패:', error);
          }
        }
        if (pendingRecordId != null) {
          await deleteRun(pendingRecordId).catch((error) => {
            console.warn('[RunnerActive] 시작 취소 후 기록 정리 실패:', error);
          });
        }
      }
      startingRef.current = false;
      if (mountedRef.current) setStarting(false);
    }

    // 러닝이 시작된 뒤에만 배터리 안내를 표시한다.
    if (mountedRef.current && runStateRef.current === 'running' && Platform.OS === 'android') {
      SecureStore.getItemAsync('runmarket_battery_opt_guided')
        .then((guided) => {
          if (!guided && mountedRef.current && runStateRef.current === 'running') {
            setShowBatteryGuide(true);
            SecureStore.setItemAsync('runmarket_battery_opt_guided', '1').catch(() => {});
          }
        })
        .catch(() => {});
    }
  }, [groupId, runnerId, color, handleLocation, requestDisclosure]);

  // ── 일시정지: 시간 누적을 멈추고 들어오는 위치를 무시 ──
  const pauseTracking = useCallback(() => {
    if (runStateRef.current !== 'running') return;
    accumulatedMsRef.current += Date.now() - segmentStartRef.current;
    // 재개 시 일시정지 동안의 이동이 한 번에 거리로 잡히지 않도록 기준점 리셋
    lastCoordRef.current = null;
    lastPointTsRef.current = 0;
    runStateRef.current = 'paused';
    setRunState('paused');
    setElapsed(Math.floor(accumulatedMsRef.current / 1000));
  }, []);

  // ── 계속: running 재개 ──
  const resumeTracking = useCallback(() => {
    if (runStateRef.current !== 'paused') return;
    segmentStartRef.current = Date.now();
    lastCoordRef.current = null;
    lastPointTsRef.current = 0;
    lastSendTimeRef.current = 0;
    runStateRef.current = 'running';
    setRunState('running');
  }, []);

  // ── 내 위치로 재중심: 내비의 "재중심" 버튼처럼 카메라를 현재 위치로 이동 ──
  // 동료 위치를 보려고 지도를 패닝한 뒤, 한 번 탭으로 내 위치로 돌아오기 위함.
  const recenter = useCallback(async () => {
    let target = currentCoord;
    if (!target) {
      // 아직 콜백으로 받은 위치가 없으면 즉석에서 1회 조회.
      try {
        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
        target = { latitude: loc.coords.latitude, longitude: loc.coords.longitude };
        setCurrentCoord(target);
      } catch {
        return;
      }
    }
    mapRef.current?.animateCamera({ center: target, zoom: 16 }, { duration: 500 });
  }, [currentCoord]);

  const handleStop = useCallback(() => {
    if (runStateRef.current === 'idle') return;
    Alert.alert('달리기 종료', '런을 종료하시겠습니까?', [
      { text: '계속 달리기', style: 'cancel' },
      {
        text: '종료',
        style: 'destructive',
        onPress: async () => {
          // 종료 시점의 시간 누적을 확정하고 추적을 멈춘다.
          if (runStateRef.current === 'running') {
            accumulatedMsRef.current += Date.now() - segmentStartRef.current;
          }
          runStateRef.current = 'idle';
          stopLocationTracking();

          const recordId = runRecordIdRef.current;
          if (recordId != null) {
            // 저장된 궤적으로 요약을 확정(finished)한 뒤 업로드를 시도한다.
            // 업로드 실패는 무시 — finished 상태로 남아 다음 동기화 때 재시도된다.
            try {
              await finishRun(recordId, Date.now());
            } catch (e) {
              console.warn('[RunnerActive] 기록 종료 실패:', e);
            }
            syncPendingRuns().catch(() => {});
            // 종료 직후 기록 확인 화면으로 전환(요약은 확정된 로컬 기록에서 다시 읽는다).
            router.replace({ pathname: '/run/runner-result', params: { recordId: String(recordId) } });
          } else {
            // 기록 생성에 실패한 경우 보여줄 요약이 없으므로 홈으로 복귀.
            router.replace('/(tabs)');
          }
        },
      },
    ]);
  }, [stopLocationTracking]);

  const handleHeaderBack = useCallback(() => {
    if (runStateRef.current === 'idle') {
      if (router.canGoBack()) {
        router.back();
      } else {
        router.replace('/(tabs)');
      }
    } else {
      handleStop();
    }
  }, [handleStop]);

  useEffect(() => {
    navigation.setOptions({
      headerBackVisible: false,
      headerLeft: () => <HeaderBackButton onPress={handleHeaderBack} />,
    });
  }, [navigation, handleHeaderBack]);

  return (
    <View style={styles.container}>
      {/* 지도 */}
      <View style={styles.mapWrap}>
        <MapView
          ref={mapRef}
          style={styles.map}
          provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
          showsUserLocation={runState !== 'idle'}
          followsUserLocation={false}
          initialRegion={
            currentCoord
              ? { ...currentCoord, latitudeDelta: 0.05, longitudeDelta: 0.05 }
              : course?.startPoint
                ? { ...course.startPoint, latitudeDelta: 0.05, longitudeDelta: 0.05 }
                : { latitude: 37.5665, longitude: 126.978, latitudeDelta: 0.05, longitudeDelta: 0.05 }
          }
        >
          {/* 안양천 코스 가이드 라인 (바닥에 배치) */}
          {course && (
            <>
              <Polyline
                coordinates={course.path}
                strokeColor="rgba(99, 102, 241, 0.25)"
                strokeWidth={8}
              />
              <Polyline
                coordinates={course.path}
                strokeColor="#4F46E5"
                strokeWidth={3}
                lineDashPattern={[6, 4]}
              />
              {course.startPoint && (
                <Marker coordinate={course.startPoint} title="출발/도착지" description={course.name}>
                  <View style={styles.startMarker}>
                    <Text style={styles.startMarkerText}>🚩</Text>
                  </View>
                </Marker>
              )}
            </>
          )}

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

        {/* 내 위치로 재중심 버튼 (내비의 재중심 버튼과 동일) */}
        {currentCoord && (
          <TouchableOpacity
            style={styles.recenterBtn}
            onPress={recenter}
            activeOpacity={0.8}
            accessibilityLabel="내 위치로 이동"
          >
            <Text style={styles.recenterIcon}>◎</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* 상태 배지 */}
      <View
        style={[
          styles.statusBadge,
          runState === 'idle' ? styles.statusDisconnected
            : runState === 'paused' ? styles.statusPaused
              : connected ? styles.statusConnected : styles.statusDisconnected,
          { top: Spacing[3] },
        ]}
      >
        <Text style={styles.statusText}>
          {runState === 'idle' ? '● 시작 대기 중'
            : runState === 'paused' ? '❚❚ 일시정지됨'
              : connected ? '● 라이브 중' : '● 연결 중...'}
        </Text>
      </View>

      {/* 1km 마일스톤 돌파 HUD 배너 */}
      {milestoneNotice && (
        <View style={[styles.milestoneBanner, { top: Spacing[3] + 36 }]}>
          <Text style={styles.milestoneIcon}>🏁</Text>
          <View style={styles.milestoneContent}>
            <Text style={styles.milestoneTitle}>{milestoneNotice.km}km 완료!</Text>
            <Text style={styles.milestoneSubtitle}>
              구간 페이스 <Text style={styles.milestonePace}>{formatPace(milestoneNotice.paceSec)} /km</Text>
            </Text>
          </View>
        </View>
      )}

      {/* 안양천 코스 정보 배지 */}
      {course && !milestoneNotice && (
        <View style={[styles.courseBadge, { top: Spacing[3] + 36 }]}>
          <Text style={styles.courseBadgeText}>
            🏁 {course.name} ({course.totalDistanceKm}km)
          </Text>
        </View>
      )}

      {/* 지도는 주 콘텐츠, 운동 정보는 작은 하단 컨트롤로 유지한다. */}
      <View style={[styles.statsPanel, { paddingBottom: Math.max(insets.bottom, 8) }]}>
        <ScrollView style={styles.summaryScroll} contentContainerStyle={styles.summaryContent}>
          <View style={[styles.statsRow, fontScale > 1.3 && styles.statsRowLargeText]}>
            <StatBox label="운동 시간" value={formatTime(elapsed)} largeText={fontScale > 1.3} />
            <StatBox label="달린 거리" value={distance.toFixed(2)} unit="km" largeText={fontScale > 1.3} />
            <StatBox label={`현재 ${Math.floor(distance) + 1}km`} value={formatPace(lapPaceSecPerKm)} unit="/km" highlight largeText={fontScale > 1.3} />
            <StatBox label="평균 페이스" value={formatPace(paceSecPerKm)} unit="/km" largeText={fontScale > 1.3} />
          </View>
          <View style={styles.toolsRow}>
            <TouchableOpacity
              style={styles.runnersChip}
              onPress={() => setRunnersVisible(true)}
              accessibilityRole="button"
              accessibilityLabel={`함께 달리는 러너 ${otherRunnerList.length}명 보기`}
              accessibilityState={{ expanded: runnersVisible }}
            >
              <Text style={styles.runnersChipText}>함께 달리는 러너 · {otherRunnerList.length}  ⌃</Text>
            </TouchableOpacity>
            {Platform.OS === 'android' && runState === 'idle' && (
              <TouchableOpacity style={styles.guideChip} onPress={() => setShowBatteryGuide(true)} accessibilityRole="button">
                <Text style={styles.guideChipText}>배터리 안내</Text>
              </TouchableOpacity>
            )}
          </View>
        </ScrollView>

        {runState === 'idle' ? (
          <TouchableOpacity
            style={styles.startBtn}
            onPress={startTracking}
            disabled={starting}
            accessibilityState={{ disabled: starting, busy: starting }}
            activeOpacity={0.8}
          >
            <Text style={styles.startBtnText}>{starting ? '시작 중…' : '시작'}</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.controlRow}>
            {Platform.OS === 'android' && (
              <TouchableOpacity
                style={styles.touchLockBtn}
                onPress={() => setTouchLocked(true)}
                accessibilityRole="button"
                accessibilityLabel="터치 잠금"
                accessibilityHint="지도와 운동 버튼을 잠급니다. 해제하려면 2초간 길게 누르세요."
              >
                <Text style={styles.controlBtnText}>잠금</Text>
              </TouchableOpacity>
            )}
            {runState === 'running' ? (
              <TouchableOpacity style={[styles.controlBtn, styles.pauseBtn]} onPress={pauseTracking} activeOpacity={0.8}>
                <Text style={styles.controlBtnText}>일시정지</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity style={[styles.controlBtn, styles.resumeBtn]} onPress={resumeTracking} activeOpacity={0.8}>
                <Text style={styles.amberBtnText}>계속</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity style={[styles.controlBtn, styles.stopBtn]} onPress={handleStop} activeOpacity={0.8}>
              <Text style={styles.controlBtnText}>정지</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      <Modal
        visible={runnersVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setRunnersVisible(false)}
      >
        <View style={styles.sheetBackdrop}>
          <Pressable style={styles.sheetDismiss} onPress={() => setRunnersVisible(false)} accessibilityRole="button" accessibilityLabel="러너 목록 닫기" />
          <View style={[styles.runnerSheet, { height: windowHeight * 0.5, paddingBottom: Math.max(insets.bottom, 8) }]} accessibilityViewIsModal>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>함께 달리는 러너 · {otherRunnerList.length}</Text>
              <TouchableOpacity style={styles.sheetClose} onPress={() => setRunnersVisible(false)} accessibilityRole="button" accessibilityLabel="러너 목록 닫기">
                <Text style={styles.sheetCloseText}>✕</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity style={styles.metaRow} onPress={handleCopyGroupId} accessibilityRole="button" accessibilityLabel="그룹 코드 복사">
              <Text style={styles.metaText} numberOfLines={1}>
                {groupCopied ? '그룹 코드가 복사되었습니다 ✓' : `그룹 ${groupId} · ${runnerId}  ⧉`}
              </Text>
            </TouchableOpacity>
            <Text style={styles.sheetHint}>러너를 선택하면 지도로 돌아가 위치를 보여드려요.</Text>
            <RunnerListPanel
              runners={otherRunnerList}
              collapsible={false}
              onPressRunner={(runner) => {
                setRunnersVisible(false);
                mapRef.current?.animateCamera(
                  { center: { latitude: runner.lat, longitude: runner.lng }, zoom: 16 },
                  { duration: 600 },
                );
              }}
            />
          </View>
        </View>
      </Modal>

      {Platform.OS === 'android' && touchLocked && (
        <RunTouchLock onUnlock={() => setTouchLocked(false)} />
      )}

      {/* 위치 권한 명시적 공개 모달 (Google Play Prominent Disclosure 요건 충족) */}
      <LocationDisclosureModal
        visible={showDisclosure}
        onAccept={handleDisclosureAccept}
        onDecline={handleDisclosureDecline}
      />

      {/* Android 전용 배터리 최적화 제한 없음 상세 설정 안내 모달 */}
      {Platform.OS === 'android' && (
        <BatteryOptimizationGuideModal
          visible={showBatteryGuide}
          onClose={() => setShowBatteryGuide(false)}
        />
      )}
    </View>
  );
}

function StatBox({ label, value, unit, highlight = false, largeText = false }: {
  label: string;
  value: string;
  unit?: string;
  highlight?: boolean;
  largeText?: boolean;
}) {
  return (
    <View style={[styles.statBox, largeText && styles.statBoxLargeText]} accessible accessibilityLabel={`${label} ${value} ${unit ?? ''}`}>
      <Text style={[styles.statLabel, highlight && styles.statLabelHighlight]} numberOfLines={1}>{label}</Text>
      <Text style={[styles.statValue, highlight && styles.statValueHighlight]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75}>
        {value}
      </Text>
      <Text style={styles.statUnit}>{unit ?? '분:초'}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  mapWrap: { flex: 1 },
  map: { flex: 1 },

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
    zIndex: 100,
  },
  milestoneIcon: {
    fontSize: 24,
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

  recenterBtn: {
    position: 'absolute',
    right: Spacing[4],
    bottom: Spacing[4],
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    // 지도 위에서 떠 보이도록 그림자
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 4,
  },
  recenterIcon: { fontSize: 24, color: Colors.navy, lineHeight: 28 },

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
  statusPaused: { backgroundColor: Colors.statusGray },
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
  myMarkerText: { fontSize: 18 },

  statsPanel: {
    maxHeight: '45%',
    flexShrink: 0,
    backgroundColor: Colors.navyDark,
    borderTopWidth: 1,
    borderTopColor: Colors.borderDark,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 8,
    paddingHorizontal: 12,
    gap: 6,
  },
  summaryScroll: { flexShrink: 1 },
  summaryContent: { gap: 4 },
  statsRow: { flexDirection: 'row', paddingVertical: 4 },
  statsRowLargeText: { flexWrap: 'wrap' },
  statBox: { flex: 1, minWidth: 0, alignItems: 'center', gap: 2 },
  statBoxLargeText: { flexBasis: '50%', flexGrow: 0, flexShrink: 0, paddingVertical: 4 },
  statLabel: { fontSize: 11, color: Colors.gray400, fontWeight: '500' },
  statLabelHighlight: { color: Colors.amber },
  statValue: { fontSize: 19, fontWeight: '700', color: Colors.white, fontVariant: ['tabular-nums'] },
  statValueHighlight: { color: Colors.amber },
  statUnit: { fontSize: 10, color: Colors.gray400 },
  toolsRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 },
  runnersChip: { minHeight: 44, paddingHorizontal: 12, justifyContent: 'center', borderRadius: 22, backgroundColor: Colors.navy },
  runnersChipText: { fontSize: 12, fontWeight: '600', color: Colors.white },
  guideChip: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 8 },
  guideChipText: { fontSize: 12, color: Colors.amber },
  sheetBackdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0, 0, 0, 0.28)' },
  sheetDismiss: { flex: 1 },
  runnerSheet: { backgroundColor: Colors.navyDark, borderTopLeftRadius: 24, borderTopRightRadius: 24, overflow: 'hidden' },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingLeft: 16, paddingRight: 8, paddingTop: 8 },
  sheetTitle: { flex: 1, fontSize: 16, fontWeight: '700', color: Colors.white },
  sheetClose: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
  sheetCloseText: { fontSize: 20, color: Colors.white },
  sheetHint: { fontSize: 12, color: Colors.gray400, paddingHorizontal: 16, paddingBottom: 12 },
  metaRow: { minHeight: 44, paddingHorizontal: 16, justifyContent: 'center' },
  metaText: { fontSize: 12, color: Colors.gray400 },

  startBtn: {
    backgroundColor: Colors.amber,
    borderRadius: Radius.lg,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  startBtnText: {
    color: Colors.navyDark,
    fontSize: FontSize.lg,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  amberBtnText: {
    color: Colors.navyDark,
    fontSize: FontSize.base,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  controlRow: { flexDirection: 'row', gap: 8 },
  touchLockBtn: {
    flex: 1,
    minHeight: 48,
    padding: Spacing[2],
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.borderDark,
    backgroundColor: Colors.navy,
  },
  controlBtn: {
    flex: 1,
    borderRadius: Radius.lg,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 2,
  },
  pauseBtn: {
    backgroundColor: Colors.navy,
    borderWidth: 1,
    borderColor: Colors.borderDark,
  },
  resumeBtn: {
    backgroundColor: Colors.amber,
  },
  stopBtn: {
    backgroundColor: Colors.destructive,
  },
  controlBtnText: { color: Colors.white, fontSize: 14, fontWeight: '700' },
  startMarker: {
    backgroundColor: Colors.navy,
    borderRadius: 16,
    padding: 4,
    borderWidth: 2,
    borderColor: Colors.white,
  },
  startMarkerText: { fontSize: 16 },

  courseBadge: {
    position: 'absolute',
    alignSelf: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.88)',
    paddingHorizontal: Spacing[3],
    paddingVertical: 5,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: '#6366F1',
    zIndex: 10,
  },
  courseBadgeText: { color: Colors.white, fontSize: FontSize.xs, fontWeight: '700' },
});
