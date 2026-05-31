import { useEffect, useRef, useCallback } from 'react';
import type { RunnerPayload } from '../types';

const WS_BASE = 'wss://pulse.runmarket.cc';
const RECONNECT_DELAY_MS = 3000;
const MAX_RECONNECT_ATTEMPTS = 5;

interface Options {
  runnerId: string;
  token: string;
  onOpen?: () => void;
  onClose?: () => void;
  onError?: () => void;
}

/**
 * RUNNER용 WebSocket 훅
 * - 연결 후 sendLocation()으로 위치 publish
 * - 연결 끊김 시 최대 5회 자동 재연결 (3초 간격)
 */
export function useRunnerSocket({ runnerId, token, onOpen, onClose, onError }: Options) {
  const wsRef = useRef<WebSocket | null>(null);
  const attemptsRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const unmountedRef = useRef(false);

  const connect = useCallback(() => {
    if (unmountedRef.current) return;

    const url = `${WS_BASE}/ws/runner/${runnerId}?token=${token}`;
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
        console.log(`[RunnerSocket] 재연결 시도 ${attemptsRef.current}/${MAX_RECONNECT_ATTEMPTS}`);
        timerRef.current = setTimeout(connect, RECONNECT_DELAY_MS);
      }
    };

    ws.onerror = () => onError?.();
  }, [runnerId, token, onOpen, onClose, onError]);

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

  const sendLocation = useCallback((payload: RunnerPayload) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(payload));
    }
  }, []);

  return { sendLocation };
}
