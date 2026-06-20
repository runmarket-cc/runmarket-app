import { Platform } from 'react-native';
import {
  isHealthDataAvailable,
  requestAuthorization,
  saveWorkoutSample,
  getMostRecentQuantitySample,
  WorkoutActivityType,
  WorkoutTypeIdentifier,
  WorkoutRouteTypeIdentifier,
  type LocationForSaving,
} from '@kingstinct/react-native-healthkit';
import { getRun, getPoints, PointRow } from './runRecordStore';

/**
 * iOS 건강(HealthKit) 연동: 종료된 러닝 기록을 Apple "건강"/"피트니스"의
 * 달리기 운동(HKWorkout)으로 저장한다.
 *
 * - iOS 전용. Android/웹에서는 no-op.
 * - 거리·시간은 로컬 SQLite에 확정된 값(권위값)을 그대로 쓴다.
 * - 칼로리는 별도 센서가 없으므로 거리·체중 기반 추정치를 함께 기록한다.
 * - GPS 궤적은 운동에 연결된 경로(WorkoutRoute)로 저장해 지도에 표시되게 한다.
 *
 * @kingstinct/react-native-healthkit 는 react-native-nitro-modules 기반이라
 * Expo Go 에서는 동작하지 않는다. 네이티브 의존성을 추가했으므로 Dev Client 를
 * 다시 빌드해야 한다.
 */

// 칼로리 추정에 쓰는 기본 체중(kg). HealthKit 체중을 읽을 수 있으면 그 값을 쓴다.
const DEFAULT_BODY_MASS_KG = 65;

export interface SaveRunResult {
  /** 운동이 저장됐는지 */
  saved: boolean;
  /** 경로(WorkoutRoute)까지 저장됐는지 */
  routeSaved: boolean;
}

/** 이 기기에서 HealthKit 사용이 가능한지 (iOS + 단말 지원) */
export function isHealthKitAvailable(): boolean {
  return Platform.OS === 'ios' && isHealthDataAvailable();
}

/**
 * 달리기는 별도 심박/칼로리 측정이 없으므로 거리·체중으로 활동 칼로리를 추정한다.
 * 흔히 쓰는 근사식: kcal ≈ 거리(km) × 체중(kg) × 1.036
 */
function estimateActiveEnergyKcal(distanceKm: number, bodyMassKg: number): number {
  return Math.round(distanceKm * bodyMassKg * 1.036);
}

/** HealthKit에 등록된 최근 체중(kg). 없거나 권한이 없으면 기본값. */
async function readBodyMassKg(): Promise<number> {
  try {
    const sample = await getMostRecentQuantitySample('HKQuantityTypeIdentifierBodyMass', 'kg');
    if (sample && sample.quantity > 0) return sample.quantity;
  } catch {
    // 권한 거부/미설정 — 기본값 사용
  }
  return DEFAULT_BODY_MASS_KG;
}

/** SQLite 궤적을 HealthKit 경로(CLLocation) 형식으로 변환 */
function toRouteLocations(points: PointRow[]): LocationForSaving[] {
  return points.map((p) => ({
    latitude: p.lat,
    longitude: p.lng,
    date: new Date(p.ts),
    altitude: 0,
    // 음수는 CoreLocation에서 "측정 불가" 표시. 고도/방위/속도는 기록하지 않는다.
    course: -1,
    speed: -1,
    verticalAccuracy: -1,
    // 수평 정확도는 기록된 값을 사용(없으면 보수적으로 5m).
    horizontalAccuracy: p.accuracy ?? 5,
  }));
}

/**
 * 종료된 러닝(runId)을 Apple 건강의 달리기 운동으로 저장한다.
 * @throws 권한 거부·저장 실패 시 에러를 던진다(호출부에서 사용자에게 안내).
 */
export async function saveRunToHealthKit(runId: number): Promise<SaveRunResult> {
  if (!isHealthKitAvailable()) {
    throw new Error('이 기기에서는 건강 앱 연동을 사용할 수 없습니다.');
  }

  const [run, points] = await Promise.all([getRun(runId), getPoints(runId)]);
  if (!run) throw new Error('러닝 기록을 찾을 수 없습니다.');
  if (run.ended_at == null) throw new Error('아직 종료되지 않은 러닝입니다.');

  // 권한 요청. 쓰기: 운동/경로/거리/활동칼로리, 읽기: 체중(칼로리 추정용).
  // 권한 요청 전에 데이터를 읽으면 앱이 크래시하므로 반드시 먼저 호출한다.
  await requestAuthorization({
    toShare: [
      WorkoutTypeIdentifier,
      WorkoutRouteTypeIdentifier,
      'HKQuantityTypeIdentifierDistanceWalkingRunning',
      'HKQuantityTypeIdentifierActiveEnergyBurned',
    ],
    toRead: ['HKQuantityTypeIdentifierBodyMass'],
  });

  const startDate = new Date(run.started_at);
  const endDate = new Date(run.ended_at);
  const distanceKm = run.distance_km ?? 0;
  const distanceMeters = Math.round(distanceKm * 1000);
  const bodyMassKg = await readBodyMassKg();
  const energyKcal = estimateActiveEnergyKcal(distanceKm, bodyMassKg);

  // 운동에 연결할 세부 샘플(거리·활동칼로리). 운동 전체 구간을 커버한다.
  const quantities = [
    distanceMeters > 0 && {
      quantityType: 'HKQuantityTypeIdentifierDistanceWalkingRunning' as const,
      unit: 'm',
      quantity: distanceMeters,
      startDate,
      endDate,
    },
    energyKcal > 0 && {
      quantityType: 'HKQuantityTypeIdentifierActiveEnergyBurned' as const,
      unit: 'kcal',
      quantity: energyKcal,
      startDate,
      endDate,
    },
  ].filter(Boolean) as {
    quantityType: 'HKQuantityTypeIdentifierDistanceWalkingRunning' | 'HKQuantityTypeIdentifierActiveEnergyBurned';
    unit: string;
    quantity: number;
    startDate: Date;
    endDate: Date;
  }[];

  const workout = await saveWorkoutSample(
    WorkoutActivityType.running,
    quantities,
    startDate,
    endDate,
    // 운동 요약 합계: 거리(m), 활동칼로리(kcal)
    { distance: distanceMeters, energyBurned: energyKcal },
    { HKExternalUUID: run.client_run_id },
  );

  // GPS 경로 저장(부가 기능). 운동 저장이 끝난 뒤 별도로 실패할 수 있으므로 분리한다.
  let routeSaved = false;
  const locations = toRouteLocations(points);
  if (locations.length > 0) {
    try {
      routeSaved = await workout.saveWorkoutRoute(locations);
    } catch (e) {
      console.warn('[healthKit] 경로 저장 실패:', e);
    }
  }

  return { saved: true, routeSaved };
}
