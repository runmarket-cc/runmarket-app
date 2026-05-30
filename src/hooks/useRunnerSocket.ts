import { useEffect, useRef, useCallback } from 'react';
import type { RunnerPayload } from '../types';

const WS_BASE = 'wss://pulse.runmarket.cc';

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
 */
export function useRunnerSocket({ runnerId, token, onOpen, onClose, onError }: Options) {
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    const url = `${WS_BASE}/ws/runner/${runnerId}?token=${token}`;
    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => onOpen?.();
    ws.onclose = () => onClose?.();
    ws.onerror = () => onError?.();

    return () => {
      ws.close();
      wsRef.current = null;
    };
  }, [runnerId, token]);

  const sendLocation = useCallback((payload: RunnerPayload) => {
    const ws = wsRef.current;
    if (ws?.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(payload));
    }
  }, []);

  return { sendLocation };
}
