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
