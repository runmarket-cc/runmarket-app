import { apiClient } from './client';
import type { RunUploadPayload, RunUploadResponse } from '../types';

/**
 * 러닝 기록 업로드 (POST /api/v1/runs).
 *
 * 백엔드(runmarket-pacer web 모듈)는 payload.clientRunId 로 멱등 처리해야 한다.
 * 같은 clientRunId 재업로드 시 새 레코드를 만들지 말고 기존 runId를 반환할 것.
 */
export const uploadRun = async (
  payload: RunUploadPayload,
): Promise<RunUploadResponse> => {
  const { data } = await apiClient.post<RunUploadResponse>('/api/v1/runs', payload);
  return data;
};
