import { useEffect, useRef, useCallback } from 'react';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';

// iOS Live Activities 모듈 (iOS 전용, 다른 플랫폼에서는 null)
let LiveActivity: any = null;
if (Platform.OS === 'ios') {
  try {
    LiveActivity = require('../../modules/runmarket-live-activity').default;
  } catch {
    // 모듈 없음 (prebuild 전 또는 iOS 16.2 미만)
  }
}

const CHANNEL_ID = 'runmarket-activity';

async function ensureAndroidChannel() {
  await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
    name: '런마켓 활동',
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0],
    enableVibrate: false,
    lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
    showBadge: false,
  });
}

const ANDROID_CONTENT_BASE = {
  channelId: CHANNEL_ID,
  sticky: true,
  autoDismiss: false,
  priority: Notifications.AndroidNotificationPriority.HIGH,
} as const;

// ── Runner 훅 ──────────────────────────────────────────────────────────────

export interface RunnerActivityData {
  runnerId: string;
  groupId: string;
}

export function useRunnerLockScreen(params: RunnerActivityData | null) {
  const notifIdRef = useRef<string | null>(null);
  const startedRef = useRef(false);

  useEffect(() => {
    if (!params || startedRef.current) return;
    startedRef.current = true;

    if (Platform.OS === 'ios') {
      LiveActivity?.startRunnerActivity?.({ runnerId: params.runnerId, groupId: params.groupId }).catch(() => {});
    } else if (Platform.OS === 'android') {
      (async () => {
        await ensureAndroidChannel();
        const { status } = await Notifications.getPermissionsAsync();
        if (status !== 'granted') return;

        const id = await Notifications.scheduleNotificationAsync({
          content: {
            ...ANDROID_CONTENT_BASE,
            title: '🏃 런마켓 러너',
            body: '현재 위치를 전송하고 있습니다.',
            data: { type: 'runner' },
          },
          trigger: null,
        });
        notifIdRef.current = id;
      })();
    }

    return () => {
      if (Platform.OS === 'ios') {
        LiveActivity?.endRunnerActivity?.().catch(() => {});
      } else if (Platform.OS === 'android' && notifIdRef.current) {
        Notifications.dismissNotificationAsync(notifIdRef.current).catch(() => {});
        notifIdRef.current = null;
      }
      startedRef.current = false;
    };
  }, [!!params]);

  return {};
}

// ── Spectator 훅 ────────────────────────────────────────────────────────────

export interface SpectatorActivityData {
  groupId: string;
  runnerCount: number;
  isConnected?: boolean;
}

export function useSpectatorLockScreen(params: SpectatorActivityData | null) {
  const notifIdRef = useRef<string | null>(null);
  const startedRef = useRef(false);

  useEffect(() => {
    if (!params || startedRef.current) return;
    startedRef.current = true;

    if (Platform.OS === 'ios') {
      LiveActivity?.startSpectatorActivity?.({
        groupId: params.groupId,
        runnerCount: params.runnerCount,
      }).catch(() => {});
    } else if (Platform.OS === 'android') {
      (async () => {
        await ensureAndroidChannel();
        const { status } = await Notifications.getPermissionsAsync();
        if (status !== 'granted') return;

        const id = await Notifications.scheduleNotificationAsync({
          content: {
            ...ANDROID_CONTENT_BASE,
            title: '👀 런마켓 관전 중',
            body: `그룹 ${params.groupId}  ·  러너 ${params.runnerCount}명 추적 중`,
            data: { type: 'spectator' },
          },
          trigger: null,
        });
        notifIdRef.current = id;
      })();
    }

    return () => {
      if (Platform.OS === 'ios') {
        LiveActivity?.endSpectatorActivity?.().catch(() => {});
      } else if (Platform.OS === 'android' && notifIdRef.current) {
        Notifications.dismissNotificationAsync(notifIdRef.current).catch(() => {});
        notifIdRef.current = null;
      }
      startedRef.current = false;
    };
  }, [!!params]);

  const update = useCallback(
    (data: Pick<SpectatorActivityData, 'runnerCount'> & { isConnected: boolean }) => {
      if (Platform.OS === 'ios') {
        LiveActivity?.updateSpectatorActivity?.({
          runnerCount: data.runnerCount,
          isConnected: data.isConnected,
        }).catch(() => {});
      } else if (Platform.OS === 'android' && notifIdRef.current) {
        Notifications.scheduleNotificationAsync({
          identifier: notifIdRef.current,
          content: {
            ...ANDROID_CONTENT_BASE,
            title: '👀 런마켓 관전 중',
            body: `그룹 ${params?.groupId ?? ''}  ·  러너 ${data.runnerCount}명 추적 중`,
            data: { type: 'spectator' },
          },
          trigger: null,
        }).catch(() => {});
      }
    },
    [params?.groupId]
  );

  return { update };
}
