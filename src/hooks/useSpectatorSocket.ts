import { useEffect, useRef, useState, useCallback } from 'react';
import type { SpectatorMessage, RunnerPayload } from '../types';

const WS_BASE = 'wss://pulse.runmarket.cc';
const RECONNECT_DELAY_MS = 3000;
const MAX_RECONNECT_ATTEMPTS = 5;

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

  const connect = useCallback(() => {
    if (unmountedRef.current) return;

    const url = `${WS_BASE}/ws/group/${groupId}?token=${token}`;
    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => {
      attemptsRef.current = 0;
      onOpen?.();
    };

    ws.onclose = () => {
      onClose?.();
      if (unmountedRef.current) return;
      if (attemptsRef.current < MAX_RECONNECT_ATTEMPTS) {
        attemptsRef.current += 1;
        console.log(`[SpectatorSocket] 재연결 시도 ${attemptsRef.current}/${MAX_RECONNECT_ATTEMPTS}`);
        timerRef.current = setTimeout(connect, RECONNECT_DELAY_MS);
      }
    };

    ws.onerror = () => onError?.();

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
  }, [groupId, token, onOpen, onClose, onError]);

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

  return { runners };
}
