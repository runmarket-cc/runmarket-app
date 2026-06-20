import * as SQLite from 'expo-sqlite';

/**
 * 로컬 마라톤 기록 저장소 (source of truth).
 *
 * 실시간 WebSocket 스트림과 별개로, GPS 궤적을 기기 SQLite에 적재한다.
 * - 네트워크 단절/앱 강제 종료에도 기록이 남도록 한다(crash resilience).
 * - 러닝 종료 시 요약을 계산하고 서버 업로드 대상으로 표시한다.
 *
 * 상태 머신: recording → finished → synced
 *   recording : 진행 중(또는 앱이 죽어 미종료된 고아 런)
 *   finished  : 종료·요약 계산 완료, 업로드 대기
 *   synced    : 서버 업로드 완료
 */

export type RunStatus = 'recording' | 'finished' | 'synced';

export interface RunRow {
  id: number;
  client_run_id: string;
  server_run_id: string | null;
  group_id: string;
  runner_id: string;
  color: string | null;
  status: RunStatus;
  started_at: number;        // epoch ms
  ended_at: number | null;   // epoch ms
  duration_sec: number | null;
  distance_km: number | null;
  avg_pace_sec_per_km: number | null;
}

export interface PointRow {
  id: number;
  run_id: number;
  lat: number;
  lng: number;
  accuracy: number | null;
  ts: number; // epoch ms
}

export interface NewRunInput {
  groupId: string;
  runnerId: string;
  color?: string | null;
  startedAt: number; // epoch ms
}

export interface NewPointInput {
  lat: number;
  lng: number;
  accuracy: number | null;
  ts: number; // epoch ms
}

// GPS 노이즈 필터 임계값 (거리 누적에서 제외하는 기준)
const MAX_ACCURACY_M = 30;   // 정확도가 이보다 나쁜 점은 거리 계산에서 제외
const MAX_SPEED_MPS = 8;     // 8 m/s(≈2:05/km) 초과 이동은 GPS 점프로 간주

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

async function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (!dbPromise) {
    dbPromise = (async () => {
      const db = await SQLite.openDatabaseAsync('runmarket-runs.db');
      await migrate(db);
      return db;
    })();
  }
  return dbPromise;
}

async function migrate(db: SQLite.SQLiteDatabase): Promise<void> {
  // WAL: 쓰기 중에도 디스크에 안전하게 남아 강제 종료 시 마지막 insert까지 보존된다.
  // foreign_keys: run 삭제 시 run_points가 ON DELETE CASCADE로 함께 제거되도록 활성화.
  await db.execAsync('PRAGMA journal_mode = WAL;\nPRAGMA foreign_keys = ON;');
  const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  const version = row?.user_version ?? 0;

  if (version < 1) {
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS runs (
        id                   INTEGER PRIMARY KEY AUTOINCREMENT,
        client_run_id        TEXT NOT NULL UNIQUE,
        server_run_id        TEXT,
        group_id             TEXT NOT NULL,
        runner_id            TEXT NOT NULL,
        color                TEXT,
        status               TEXT NOT NULL DEFAULT 'recording',
        started_at           INTEGER NOT NULL,
        ended_at             INTEGER,
        duration_sec         INTEGER,
        distance_km          REAL,
        avg_pace_sec_per_km  REAL
      );
      CREATE TABLE IF NOT EXISTS run_points (
        id        INTEGER PRIMARY KEY AUTOINCREMENT,
        run_id    INTEGER NOT NULL REFERENCES runs(id) ON DELETE CASCADE,
        lat       REAL NOT NULL,
        lng       REAL NOT NULL,
        accuracy  REAL,
        ts        INTEGER NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_run_points_run_id ON run_points(run_id, id);
      CREATE INDEX IF NOT EXISTS idx_runs_status ON runs(status);
      PRAGMA user_version = 1;
    `);
  }
}

/** 두 좌표 간 거리 (Haversine, m) */
function haversineMeters(
  aLat: number, aLng: number, bLat: number, bLng: number,
): number {
  const R = 6371000;
  const dLat = ((bLat - aLat) * Math.PI) / 180;
  const dLng = ((bLng - aLng) * Math.PI) / 180;
  const s = Math.sin(dLat / 2) ** 2
    + Math.cos((aLat * Math.PI) / 180) * Math.cos((bLat * Math.PI) / 180)
    * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.asin(Math.sqrt(s));
}

/** 새 러닝 기록 생성 → 로컬 id 반환 */
export async function createRun(input: NewRunInput): Promise<number> {
  const db = await getDb();
  const clientRunId = `${input.runnerId}-${input.startedAt}`;
  const res = await db.runAsync(
    `INSERT INTO runs (client_run_id, group_id, runner_id, color, status, started_at)
     VALUES (?, ?, ?, ?, 'recording', ?)`,
    clientRunId, input.groupId, input.runnerId, input.color ?? null, input.startedAt,
  );
  return res.lastInsertRowId;
}

/** 궤적 한 점 적재 (append-only, 강제 종료에 대비해 즉시 디스크 기록) */
export async function appendPoint(runId: number, p: NewPointInput): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    'INSERT INTO run_points (run_id, lat, lng, accuracy, ts) VALUES (?, ?, ?, ?, ?)',
    runId, p.lat, p.lng, p.accuracy, p.ts,
  );
}

/** 저장된 궤적으로부터 필터링된 누적 거리(km)를 계산 */
function computeDistanceKm(points: PointRow[]): number {
  let meters = 0;
  for (let i = 1; i < points.length; i += 1) {
    const prev = points[i - 1];
    const cur = points[i];
    // 정확도가 나쁜 점은 거리에서 제외
    if ((prev.accuracy ?? 0) > MAX_ACCURACY_M || (cur.accuracy ?? 0) > MAX_ACCURACY_M) {
      continue;
    }
    const d = haversineMeters(prev.lat, prev.lng, cur.lat, cur.lng);
    const dtSec = (cur.ts - prev.ts) / 1000;
    if (dtSec <= 0) continue;
    // 비현실적 속도 점프(GPS 튐)는 제외
    if (d / dtSec > MAX_SPEED_MPS) continue;
    meters += d;
  }
  return meters / 1000;
}

/**
 * 러닝 종료 처리: 저장된 궤적으로 요약을 계산하고 status='finished'로 전환.
 * 화면이 들고 있던 값이 아니라 저장된 점들로부터 재계산하므로 기록이 권위(authoritative).
 */
export async function finishRun(runId: number, endedAt: number): Promise<void> {
  const db = await getDb();
  const run = await db.getFirstAsync<RunRow>('SELECT * FROM runs WHERE id = ?', runId);
  if (!run) return;

  const points = await getPoints(runId);
  const distanceKm = computeDistanceKm(points);
  const durationSec = Math.max(0, Math.round((endedAt - run.started_at) / 1000));
  const avgPace = distanceKm > 0 ? durationSec / distanceKm : 0;

  await db.runAsync(
    `UPDATE runs
     SET status = 'finished', ended_at = ?, duration_sec = ?, distance_km = ?, avg_pace_sec_per_km = ?
     WHERE id = ?`,
    endedAt, durationSec, Math.round(distanceKm * 1000) / 1000, Math.round(avgPace), runId,
  );
}

/** 업로드 성공 후 synced로 전환 */
export async function markSynced(runId: number, serverRunId: string): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    "UPDATE runs SET status = 'synced', server_run_id = ? WHERE id = ?",
    serverRunId, runId,
  );
}

/** 업로드 대기(finished) 런 목록 */
export async function getSyncableRuns(): Promise<RunRow[]> {
  const db = await getDb();
  return db.getAllAsync<RunRow>(
    "SELECT * FROM runs WHERE status = 'finished' ORDER BY started_at ASC",
  );
}

/** 앱이 죽어 미종료된 고아(recording) 런 목록 */
export async function getOrphanRuns(): Promise<RunRow[]> {
  const db = await getDb();
  return db.getAllAsync<RunRow>(
    "SELECT * FROM runs WHERE status = 'recording' ORDER BY started_at ASC",
  );
}

/** 마지막으로 기록된 점의 시각 (고아 런 종료 시각 추정용) */
export async function getLastPointTs(runId: number): Promise<number | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ ts: number }>(
    'SELECT ts FROM run_points WHERE run_id = ? ORDER BY id DESC LIMIT 1',
    runId,
  );
  return row?.ts ?? null;
}

/** 특정 런 단건 조회 (종료 후 기록 확인 화면용) */
export async function getRun(runId: number): Promise<RunRow | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<RunRow>('SELECT * FROM runs WHERE id = ?', runId);
  return row ?? null;
}

/** 특정 런의 궤적 (시간/적재 순) */
export async function getPoints(runId: number): Promise<PointRow[]> {
  const db = await getDb();
  return db.getAllAsync<PointRow>(
    'SELECT * FROM run_points WHERE run_id = ? ORDER BY id ASC',
    runId,
  );
}

/** 런 삭제 (궤적은 ON DELETE CASCADE로 함께 제거) */
export async function deleteRun(runId: number): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM runs WHERE id = ?', runId);
}
