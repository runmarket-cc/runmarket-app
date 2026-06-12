import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import { router } from 'expo-router';
import { useAuthStore } from '../store/authStore';

export const BASE_URL = 'https://api.runmarket.cc';

export const apiClient = axios.create({
  baseURL: BASE_URL,
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' },
});

// 요청마다 저장된 accessToken을 자동으로 헤더에 추가
apiClient.interceptors.request.use(async (config) => {
  const token = await SecureStore.getItemAsync('accessToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// 로그인 세션 만료(401) 시 고객에게 보여줄 안내 문구
export const SESSION_EXPIRED_MESSAGE =
  '로그인 세션이 만료되었습니다. 다시 로그인한 후 이용해주세요.';

// 에러 메시지 정규화 + 401 자동 로그아웃
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    // 세션 만료: 러너로 달리기/관전하기 진입 시 소켓 토큰 발급(POST /api/v1/socket-token)이
    // 401로 실패하는 대표적인 경우. 토큰을 비우고 로그인 화면으로 보낸 뒤,
    // "Request failed with status code 401" 대신 안내 문구를 노출한다.
    if (error.response?.status === 401) {
      await useAuthStore.getState().clearAuth();
      router.replace('/(auth)/login');
      return Promise.reject(
        new Error(error.response?.data?.detail || SESSION_EXPIRED_MESSAGE)
      );
    }
    const message =
      error.response?.data?.detail ||
      error.response?.data?.message ||
      error.response?.data?.error ||
      error.message ||
      '알 수 없는 오류가 발생했습니다.';
    return Promise.reject(new Error(message));
  }
);
