import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
} from 'react-native';
import { Colors, FontSize, Spacing, Radius } from '../constants/theme';

const RUNNER_COLORS = [
  '#ff9900', '#3b82f6', '#10b981', '#f43f5e',
  '#8b5cf6', '#f59e0b', '#06b6d4', '#84cc16',
];

/** runnerId 문자열을 해시해서 항상 동일한 색상 반환 */
export function getRunnerColor(runnerId: string): string {
  let hash = 0;
  for (let i = 0; i < runnerId.length; i++) {
    hash = (hash * 31 + runnerId.charCodeAt(i)) >>> 0;
  }
  return RUNNER_COLORS[hash % RUNNER_COLORS.length];
}

export interface RunnerInfo {
  runnerId: string;
  lat: number;
  lng: number;
  pace: string;
  distance: number;
  time: number;
  color?: string;
}

interface Props {
  runners: RunnerInfo[];
  onPressRunner: (runner: RunnerInfo) => void;
  title?: string;
  description?: string;
}

/** 러너 목록 패널 — 토글 가능, 클릭 시 onPressRunner 호출 */
export function RunnerListPanel({ runners, onPressRunner, title, description }: Props) {
  const [show, setShow] = useState(true);

  return (
    <>
      <TouchableOpacity style={styles.toggle} onPress={() => setShow((v) => !v)}>
        <View style={styles.toggleInner}>
          {title && <Text style={styles.toggleTitle}>{title}</Text>}
          <Text style={styles.toggleText}>
            {show ? '▼ 접기' : `▲ 펼치기 (${runners.length}명)`}
          </Text>
        </View>
        {description && show && (
          <Text style={styles.toggleDesc}>{description}</Text>
        )}
      </TouchableOpacity>

      {show && (
        runners.length === 0 ? (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyText}>함께 달리는 러너가 없습니다.</Text>
            <Text style={styles.emptySubText}>러너가 참여하면 자동으로 표시됩니다.</Text>
          </View>
        ) : (
          <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
            {runners.map((runner) => (
              <TouchableOpacity
                key={runner.runnerId}
                activeOpacity={0.7}
                onPress={() => onPressRunner(runner)}
              >
                <RunnerRow runner={runner} color={runner.color ?? getRunnerColor(runner.runnerId)} />
              </TouchableOpacity>
            ))}
          </ScrollView>
        )
      )}
    </>
  );
}

function RunnerRow({ runner, color }: { runner: RunnerInfo; color: string }) {
  return (
    <View style={styles.row}>
      <View style={[styles.dot, { backgroundColor: color }]} />
      <Text style={styles.name} numberOfLines={1}>{runner.runnerId}</Text>
      <View style={styles.stats}>
        <StatChip label="거리" value={`${(runner.distance ?? 0).toFixed(2)}km`} />
        <StatChip label="페이스" value={runner.pace === '--:--' ? '-' : `${runner.pace}/km`} />
        <StatChip label="시간" value={formatTime(runner.time ?? 0)} />
      </View>
    </View>
  );
}

function StatChip({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.chip}>
      <Text style={styles.chipLabel}>{label}</Text>
      <Text style={styles.chipValue}>{value}</Text>
    </View>
  );
}

function formatTime(sec: number): string {
  const m = Math.floor(sec / 60).toString().padStart(2, '0');
  const s = (sec % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

const styles = StyleSheet.create({
  toggle: {
    paddingVertical: Spacing[2],
    paddingHorizontal: Spacing[4],
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderDark,
    gap: Spacing[1],
  },
  toggleInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  toggleTitle: {
    fontSize: FontSize.sm,
    fontWeight: '700',
    color: Colors.white,
  },
  toggleText: {
    fontSize: FontSize.xs,
    color: Colors.gray400,
    fontWeight: '600',
  },
  toggleDesc: {
    fontSize: FontSize.xs,
    color: Colors.mutedForeground,
    marginTop: Spacing[1],
  },
  list: { maxHeight: 180 },
  emptyBox: {
    alignItems: 'center',
    paddingVertical: Spacing[4],
    gap: Spacing[1],
  },
  emptyText: { color: Colors.white, fontSize: FontSize.sm },
  emptySubText: { color: Colors.mutedForeground, fontSize: FontSize.xs },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing[4],
    paddingVertical: Spacing[3],
    borderBottomWidth: 1,
    borderBottomColor: Colors.rowDivider,
    gap: Spacing[3],
  },
  dot: { width: 10, height: 10, borderRadius: 5 },
  name: {
    fontSize: FontSize.sm,
    fontWeight: '700',
    color: Colors.white,
    flex: 1,
  },
  stats: { flexDirection: 'row', gap: Spacing[2] },
  chip: { alignItems: 'center', minWidth: 52 },
  chipLabel: { fontSize: FontSize.xs, color: Colors.mutedForeground, fontWeight: '500' },
  chipValue: { fontSize: FontSize.xs, color: Colors.amber, fontWeight: '700' },
});
