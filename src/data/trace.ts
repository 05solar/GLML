import type { TraceKind, TraceStep } from '../types';

/* ===== ReAct Agent 실행 트레이스 단계 ===== */
export const TRACE_STEPS: TraceStep[] = [
  { kind: 'thought', title: '사용자 조건 분석', mono: null },
  { kind: 'action', title: 'Kakao 장소 검색', mono: 'kakao.local.search(place)' },
  { kind: 'obs', title: '선택한 위치 좌표 확인', mono: 'lat 35.85 · lng 127.13' },
  { kind: 'action', title: '맛집 검색 도구 호출', mono: 'places.nearby(radius=600m)' },
  { kind: 'obs', title: '주변 맛집 후보 검색 완료', mono: '24개 후보 수집' },
  { kind: 'action', title: '필터링 및 정렬', mono: 'filter(category,price) → rank(priority)' },
  { kind: 'obs', title: '추천 후보 선정 완료', mono: 'top 3 selected' },
];

export const KIND_LABEL: Record<TraceKind, string> = {
  thought: 'Thought',
  action: 'Action',
  obs: 'Observation',
};
