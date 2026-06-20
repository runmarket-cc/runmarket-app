import { useEffect, useRef, useState, useCallback } from 'react';
import type { SpectatorMessage, RunnerPayload } from '../types';

const WS_BASE = 'wss://pulse.runmarket.cc';
const RECONNECT_DELAY_MS = 1000;
const MAX_RECONNECT_ATTEMPTS = 5;
// 러너는 3초마다 위치를 보낸다. 이 시간 동안 한 점도 안 오면(종료·이탈·장시간 끊김)
// 지도에 마지막 위치 마커가 영구히 남는 "유령 러너"가 되므로 목록에서 제거한다.
// 긴 터널·지하 구간에서는 GPS/네트워크가 1분 넘게 끊길 수 있으므로, 멀쩡히 달리는
// 러너가 잠깐 사라지지 않도록 90초로 넉넉히 둔다(실제 종료 시 그만큼 늦게 사라짐).
const STALE_TTL_MS = 90000;
const PRUNE_INTERVAL_MS = 5000;

export type RunnerState = RunnerPayload & { runnerId: string; updatedAt: number };

interface Options {
  groupId: string;
  token: string;
  onOpen?: () => void;
  onClose?: () => void;
  onError?: () => void;
}

/**
 * SPECTATOR용 WebSocket 훅
 * - /ws/group/{groupId} 구독
 * - runners: 그룹 내 러너들의 최신 상태 Map
 * - 연결 끊김 시 최대 5회 자동 재연결 (3초 간격)
 */
export function useSpectatorSocket({ groupId, token, onOpen, onClose, onError }: Options) {
  const wsRef = useRef<WebSocket | null>(null);
  const attemptsRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const unmountedRef = useRef(false);
  const [runners, setRunners] = useState<Map<string, RunnerState>>(new Map());

  // 콜백을 ref로 보관해서 connect 의존성에서 제외
  const onOpenRef = useRef(onOpen);
  const onCloseRef = useRef(onClose);
  const onErrorRef = useRef(onError);
  useEffect(() => { onOpenRef.current = onOpen; }, [onOpen]);
  useEffect(() => { onCloseRef.current = onClose; }, [onClose]);
  useEffect(() => { onErrorRef.current = onError; }, [onError]);

  const connect = useCallback(() => {
    if (unmountedRef.current) return;

    const url = `${WS_BASE}/ws/group/${groupId}?token=${token}`;
    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => {
      attemptsRef.current = 0;
      onOpenRef.current?.();
    };

    ws.onclose = (event) => {
      onCloseRef.current?.();
      if (unmountedRef.current) return;
      // 인증 실패(1008) 또는 정책 위반은 재연결해도 의미 없음
      if (event.code === 1008 || event.code === 1011) return;
      if (attemptsRef.current < MAX_RECONNECT_ATTEMPTS) {
        attemptsRef.current += 1;
        console.log(`[SpectatorSocket] 재연결 시도 ${attemptsRef.current}/${MAX_RECONNECT_ATTEMPTS}`);
        timerRef.current = setTimeout(connect, RECONNECT_DELAY_MS);
      }
    };

    ws.onerror = () => onErrorRef.current?.();

    ws.onmessage = (event) => {
      try {
        const msg: SpectatorMessage = JSON.parse(event.data);
        setRunners((prev) => {
          const next = new Map(prev);
          next.set(msg.runnerId, {
            ...msg.data,
            runnerId: msg.runnerId,
            updatedAt: Date.now(),
          });
          return next;
        });
      } catch {}
    };
  // groupId, token이 바뀔 때만 재연결
  }, [groupId, token]);

  useEffect(() => {
    unmountedRef.current = false;
    attemptsRef.current = 0;
    connect();

    return () => {
      unmountedRef.current = true;
      if (timerRef.current) clearTimeout(timerRef.current);
      wsRef.current?.close();
      wsRef.current = null;
    };
  }, [connect]);

  // 오래된(유령) 러너 주기적 제거. 변화가 없으면 같은 Map을 반환해 리렌더를 막는다.
  useEffect(() => {
    const id = setInterval(() => {
      const now = Date.now();
      setRunners((prev) => {
        let changed = false;
        const next = new Map(prev);
        for (const [runnerId, state] of next) {
          if (now - state.updatedAt > STALE_TTL_MS) {
            next.delete(runnerId);
            changed = true;
          }
        }
        return changed ? next : prev;
      });
    }, PRUNE_INTERVAL_MS);
    return () => clearInterval(id);
  }, []);

  return { runners };
}
