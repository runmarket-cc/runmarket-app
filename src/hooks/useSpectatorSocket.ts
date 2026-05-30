import { useEffect, useRef, useState, useCallback } from 'react';
import type { SpectatorMessage, RunnerPayload } from '../types';

const WS_BASE = 'wss://pulse.runmarket.cc';

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
 */
export function useSpectatorSocket({ groupId, token, onOpen, onClose, onError }: Options) {
  const wsRef = useRef<WebSocket | null>(null);
  const [runners, setRunners] = useState<Map<string, RunnerState>>(new Map());

  useEffect(() => {
    const url = `${WS_BASE}/ws/group/${groupId}?token=${token}`;
    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => onOpen?.();
    ws.onclose = () => onClose?.();
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

    return () => {
      ws.close();
      wsRef.current = null;
    };
  }, [groupId, token]);

  return { runners };
}
