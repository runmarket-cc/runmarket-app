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
}

/** 관전자가 서버로부터 수신하는 메시지 */
export interface SpectatorMessage {
  runnerId: string;
  data: RunnerPayload;
}
