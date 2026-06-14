import { apiClient } from './client';
import type { RunnerSetupContent, SpectatorSetupContent } from '../types';

/**
 * 백엔드가 응답하지 않거나 네트워크 오류일 때 화면이 비지 않도록 사용하는 기본 문구.
 * 백엔드(ScreenContentController)의 정적 상수와 동일하게 유지한다.
 */
export const RUNNER_SETUP_FALLBACK: RunnerSetupContent = {
  info: {
    emoji: '🏃',
    title: '러너 모드',
    desc: '달리는 동안 내 위치가 실시간으로 관전자에게 공유됩니다.',
  },
  groupCode: {
    label: '그룹 코드',
    placeholder: '예: AAAA',
    hint: '관전자가 이 코드로 입장합니다. 함께 달릴 그룹의 고유 코드를 정하세요.',
  },
  runnerId: {
    label: '러너 ID',
    placeholder: '예: runner-1',
    hint: '같은 그룹 안에서 나를 구별하는 이름입니다.',
  },
  colorLabel: '내 색상',
  colorAutoText: '자동 배정 (탭하여 변경)',
  colorHint:
    '지도와 러너 목록에서 나를 표시할 색상입니다. 선택하지 않으면 러너 ID 기반으로 자동 배정됩니다.',
  colorModalTitle: '내 마커 색상 선택',
  colorModalDesc: '지도와 러너 목록에서 나를 나타낼 색상을 골라주세요.',
  confirmButton: '확인',
  cancelButton: '취소',
  startButton: '달리기 시작',
  emptyFieldsAlert: {
    title: '입력 오류',
    message: '그룹 코드와 러너 ID를 모두 입력해주세요.',
  },
  tokenFailAlert: { title: '오류', message: '소켓 토큰 발급에 실패했습니다.' },
};

export const SPECTATOR_SETUP_FALLBACK: SpectatorSetupContent = {
  info: {
    emoji: '👀',
    title: '관전 모드',
    desc: '그룹 코드를 입력하면 달리고 있는 러너들의 위치를 실시간 지도에서 확인할 수 있습니다.',
  },
  groupCode: {
    label: '그룹 코드',
    placeholder: '예: AAAA',
    hint: '러너에게 그룹 코드를 받아 입력하세요.',
  },
  watchButton: '관전 시작',
  emptyFieldsAlert: { title: '입력 오류', message: '그룹 코드를 입력해주세요.' },
  tokenFailAlert: { title: '오류', message: '소켓 토큰 발급에 실패했습니다.' },
};

/** "러너로 달리기" 설정 화면 문구 (permitAll) */
export const getRunnerSetupContent = async (): Promise<RunnerSetupContent> => {
  const { data } = await apiClient.get<RunnerSetupContent>(
    '/api/v1/contents/runner-setup'
  );
  return data;
};

/** "관전하기" 설정 화면 문구 (permitAll) */
export const getSpectatorSetupContent = async (): Promise<SpectatorSetupContent> => {
  const { data } = await apiClient.get<SpectatorSetupContent>(
    '/api/v1/contents/spectator-setup'
  );
  return data;
};
