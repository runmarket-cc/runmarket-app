// ─── Auth ────────────────────────────────────────────────────────────────────

export interface TokenResponse {
  accessToken: string;
  expiresAt: string;
}

// ─── Socket Token ─────────────────────────────────────────────────────────────

export type WsRole = 'RUNNER' | 'SPECTATOR';

export interface SocketTokenRequest {
  role: WsRole;
  groupId: string;
  runnerId?: string; // RUNNER일 때 필수
}

// ─── WebSocket Messages ───────────────────────────────────────────────────────

/** 러너 → 서버로 보내는 위치 데이터 */
export interface RunnerPayload {
  lat: number;
  lng: number;
  pace: string;     // "5:30" 형식 (mm:ss / km)
  distance: number; // km
  time: number;     // 초
  color?: string;   // 러너가 선택한 색상 (hex)
}

/** 관전자가 서버로부터 수신하는 메시지 */
export interface SpectatorMessage {
  runnerId: string;
  data: RunnerPayload;
}

// ─── Run Record (로컬 기록 → 서버 업로드) ──────────────────────────────────────

/** 업로드 페이로드의 궤적 한 점 */
export interface RunRoutePoint {
  lat: number;
  lng: number;
  t: number;        // epoch ms
  acc?: number | null; // GPS 수평 정확도(m), 없으면 null
}

/**
 * 러닝 1건 업로드 페이로드 (POST /api/v1/runs).
 * clientRunId = `${runnerId}-${startedAt(ms)}` 로 기기/런 단위 고유.
 * 서버는 이 값으로 멱등 처리(중복 업로드 무시)한다.
 */
export interface RunUploadPayload {
  clientRunId: string;
  groupId: string;
  runnerId: string;
  startedAt: string;   // ISO 8601
  endedAt: string;     // ISO 8601
  durationSec: number; // 시작~종료 경과(벽시계) 초
  distanceKm: number;
  avgPaceSecPerKm: number;
  color?: string;
  route: RunRoutePoint[];
}

/** 업로드 성공 응답 */
export interface RunUploadResponse {
  runId: string;
}

// ─── Push Notifications (기기 푸시 토큰 등록) ─────────────────────────────────

export interface DeviceRegisterPayload {
  expoPushToken: string;
  platform: 'ios' | 'android';
}

// ─── Screen Content (백엔드에서 불러오는 화면 문구) ─────────────────────────────

export interface InfoCardContent {
  emoji: string;
  title: string;
  desc: string;
}

export interface InputFieldContent {
  label: string;
  placeholder: string;
  hint: string;
}

export interface AlertContent {
  title: string;
  message: string;
}

/** "러너로 달리기" 설정 화면(runner.tsx) 문구 */
export interface RunnerSetupContent {
  info: InfoCardContent;
  groupCode: InputFieldContent;
  runnerId: InputFieldContent;
  colorLabel: string;
  colorAutoText: string;
  colorHint: string;
  colorModalTitle: string;
  colorModalDesc: string;
  confirmButton: string;
  cancelButton: string;
  startButton: string;
  emptyFieldsAlert: AlertContent;
  tokenFailAlert: AlertContent;
}

/** "관전하기" 설정 화면(spectator.tsx) 문구 */
export interface SpectatorSetupContent {
  info: InfoCardContent;
  groupCode: InputFieldContent;
  watchButton: string;
  emptyFieldsAlert: AlertContent;
  tokenFailAlert: AlertContent;
}
