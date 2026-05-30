import { apiClient } from './client';
import type { TokenResponse, SocketTokenRequest } from '../types';

/** 웹 로그인 → accessToken 발급 */
export const login = async (
  email: string,
  password: string,
  turnstileToken: string
): Promise<TokenResponse> => {
  const { data } = await apiClient.post<TokenResponse>('/api/v1/auth/login', {
    email,
    password,
    turnstileToken,
  });
  return data;
};

/** 소켓 토큰 발급 (로그인된 상태에서 호출) */
export const issueSocketToken = async (
  req: SocketTokenRequest
): Promise<TokenResponse> => {
  const { data } = await apiClient.post<TokenResponse>('/api/v1/socket-token', req);
  return data;
};
