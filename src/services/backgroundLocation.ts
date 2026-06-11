import * as TaskManager from 'expo-task-manager';
import type * as Location from 'expo-location';

/** 백그라운드 위치 추적 태스크 이름 (defineTask / start·stopLocationUpdatesAsync 공용) */
export const RUN_LOCATION_TASK = 'runmarket-run-location';

type LocationHandler = (locations: Location.LocationObject[]) => void;

let currentHandler: LocationHandler | null = null;

/**
 * 활성 러닝 화면이 위치 수신 콜백을 등록/해제한다.
 * 태스크 자체는 모듈 로드 시점에 정의되어야 하므로(top-level scope 요구사항),
 * 화면 생명주기와 분리해 핸들러만 교체하는 구조.
 */
export function setLocationHandler(handler: LocationHandler | null) {
  currentHandler = handler;
}

TaskManager.defineTask(RUN_LOCATION_TASK, async ({ data, error }) => {
  if (error) {
    console.warn('[BackgroundLocation] task error:', error.message);
    return;
  }
  const locations = (data as { locations?: Location.LocationObject[] })?.locations;
  if (locations?.length) {
    currentHandler?.(locations);
  }
});
