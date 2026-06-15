import type { RunRoutePoint, RunUploadPayload } from '../types';
import { uploadRun } from '../api/runs';
import {
  deleteRun,
  finishRun,
  getLastPointTs,
  getOrphanRuns,
  getPoints,
  getSyncableRuns,
  markSynced,
  type PointRow,
  type RunRow,
} from './runRecordStore';

let syncing = false;

function buildPayload(run: RunRow, points: PointRow[]): RunUploadPayload {
  const route: RunRoutePoint[] = points.map((p) => ({
    lat: p.lat,
    lng: p.lng,
    t: p.ts,
    acc: p.accuracy,
  }));
  return {
    clientRunId: run.client_run_id,
    groupId: run.group_id,
    runnerId: run.runner_id,
    startedAt: new Date(run.started_at).toISOString(),
    endedAt: new Date(run.ended_at ?? run.started_at).toISOString(),
    durationSec: run.duration_sec ?? 0,
    distanceKm: run.distance_km ?? 0,
    avgPaceSecPerKm: run.avg_pace_sec_per_km ?? 0,
    color: run.color ?? undefined,
    route,
  };
}

/**
 * 미동기화 런을 서버에 업로드한다(큐/재시도).
 *
 * 1) 고아(recording) 런 복구: 앱이 죽어 종료되지 못한 런을 마지막 점 시각으로 finalize
 * 2) finished 런을 순차 업로드 → 성공 시 synced 전환
 *
 * 실패한 런은 그대로 남겨 다음 호출(앱 시작/다음 종료) 때 재시도된다.
 * 앱 시작 시와 러닝 종료 시 fire-and-forget으로 호출하면 된다.
 */
export async function syncPendingRuns(): Promise<void> {
  if (syncing) return; // 중복 실행 방지
  syncing = true;
  try {
    // 1) 고아 런 복구
    const orphans = await getOrphanRuns();
    for (const orphan of orphans) {
      const lastTs = await getLastPointTs(orphan.id);
      // 점이 하나도 없으면 시작 시각으로라도 종료 처리(거리 0짜리 빈 런)
      await finishRun(orphan.id, lastTs ?? orphan.started_at);
    }

    // 2) 업로드 대기 런 업로드
    const runs = await getSyncableRuns();
    for (const run of runs) {
      try {
        const points = await getPoints(run.id);
        // 점이 없는 빈 런(권한만 허용하고 바로 이탈 등)은 업로드하지 않고 삭제.
        if (points.length === 0) {
          await deleteRun(run.id);
          continue;
        }
        const res = await uploadRun(buildPayload(run, points));
        if (res?.runId) {
          await markSynced(run.id, res.runId);
        }
      } catch {
        // 네트워크/서버 오류: 다음 동기화 때 재시도하도록 남겨둔다.
      }
    }
  } finally {
    syncing = false;
  }
}
