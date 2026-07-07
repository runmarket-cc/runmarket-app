/**
 * HealthKit 연동의 비(非)iOS 스텁.
 *
 * 실제 구현은 iOS 전용 `healthKit.ios.ts` 에 있고, Metro 가 플랫폼 확장자를
 * 우선 해석하므로 iOS 에서는 이 파일이 로드되지 않는다. Android/웹에서는
 * `@kingstinct/react-native-healthkit` 가 존재하지 않으며(iOS 전용 패키지),
 * 해당 모듈은 import 시점에 네이티브 HybridObject 를 생성하다 크래시하므로
 * 여기서는 그 모듈을 절대 import 하지 않는다.
 */

export interface SaveRunResult {
  /** 운동이 저장됐는지 */
  saved: boolean;
  /** 경로(WorkoutRoute)까지 저장됐는지 */
  routeSaved: boolean;
}

/** iOS 가 아니면 HealthKit 을 쓸 수 없다. */
export function isHealthKitAvailable(): boolean {
  return false;
}

/** iOS 전용 기능. 다른 플랫폼에서는 호출되지 않지만, 방어적으로 에러를 던진다. */
export async function saveRunToHealthKit(_runId: number): Promise<SaveRunResult> {
  throw new Error('이 기기에서는 건강 앱 연동을 사용할 수 없습니다.');
}
