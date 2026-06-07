import { requireNativeModule } from 'expo-modules-core';
import { Platform } from 'react-native';

export interface RunnerActivityParams {
  runnerId: string;
  groupId: string;
}

export interface SpectatorActivityParams {
  groupId: string;
  runnerCount: number;
}

export interface SpectatorUpdateParams {
  runnerCount: number;
  isConnected: boolean;
}

interface RunmarketLiveActivityNativeModule {
  startRunnerActivity(params: RunnerActivityParams): Promise<string | null>;
  endRunnerActivity(): Promise<void>;
  startSpectatorActivity(params: SpectatorActivityParams): Promise<string | null>;
  updateSpectatorActivity(params: SpectatorUpdateParams): Promise<void>;
  endSpectatorActivity(): Promise<void>;
}

const module: RunmarketLiveActivityNativeModule | null =
  Platform.OS === 'ios' ? requireNativeModule('RunmarketLiveActivity') : null;

export default module;
