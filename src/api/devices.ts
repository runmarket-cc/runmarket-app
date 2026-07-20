import { apiClient } from './client';
import type { DeviceRegisterPayload } from '../types';

/**
 * 푸시 토큰 등록 (POST /api/v1/devices).
 *
 * 백엔드(runmarket-pacer web 모듈)는 expoPushToken 기준으로 upsert 처리해야 한다.
 * 같은 토큰이 다른 계정으로 재등록되면(기기 재사용/로그인 전환) 이전 계정 연결을 덮어써야 한다.
 */
export const registerDevice = async (payload: DeviceRegisterPayload): Promise<void> => {
  await apiClient.post('/api/v1/devices', payload);
};
