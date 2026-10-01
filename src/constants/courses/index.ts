import anyangcheon10k from './anyangcheon10k.json';

export interface CoursePoint {
  latitude: number;
  longitude: number;
  elevation?: number;
  distanceMeters: number;
}

export interface CourseData {
  id: string;
  name: string;
  description: string;
  totalDistanceMeters: number;
  totalDistanceKm: number;
  bounds: {
    minLat: number;
    maxLat: number;
    minLng: number;
    maxLng: number;
  };
  startPoint: { latitude: number; longitude: number };
  endPoint: { latitude: number; longitude: number };
  pointsCount: number;
  waypoints: Array<{
    index: number;
    latitude: number;
    longitude: number;
    type: string;
    name: string;
    desc: string;
  }>;
  path: CoursePoint[];
}

export const ANYANGCHEON_10K_COURSE: CourseData = anyangcheon10k as unknown as CourseData;

export interface CourseSummary {
  id: string;
  name: string;
  groupId: string;
  distanceKm: number;
  emoji: string;
}

/** 현재 등록된 추천 코스 목록 (추후 한강코스, 여의도공원코스, 보라매공원코스 등 확장 가능) */
export const AVAILABLE_COURSES: CourseSummary[] = [
  {
    id: 'anyangcheon-10k',
    name: '안양천 10K (목동운동장 출발)',
    groupId: '안양천-10k',
    distanceKm: 10.48,
    emoji: '🌊',
  },
];

const COURSES_REGISTRY: Record<string, CourseData> = {
  '안양천-10k': ANYANGCHEON_10K_COURSE,
  'anyangcheon-10k': ANYANGCHEON_10K_COURSE,
  'anyang-10k': ANYANGCHEON_10K_COURSE,
};

/**
 * 그룹 ID 또는 코스 ID를 바탕으로 일치하는 코스 데이터를 반환 (일치하지 않으면 null)
 */
export function getCourseByGroupId(groupId?: string): CourseData | null {
  if (!groupId) return null;
  const normalized = groupId.trim().toLowerCase();
  return COURSES_REGISTRY[normalized] ?? null;
}
