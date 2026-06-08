import type { AgentData } from './types';
import type { ApiResult } from './types';

/** 프론트엔드 조건 → 백엔드 /api/recommend 요청 페이로드 */
export interface RecommendPayload {
  place: string;
  purpose: string[];
  time: string[];
  category: string[];
  price: string[];
  priority: string[];
  count: number;
}

export function toPayload(data: AgentData, count = 3): RecommendPayload {
  return {
    place: data.place?.name ?? '전주 객사',
    purpose: data.purpose,
    time: data.time,
    category: data.category,
    price: data.price,
    priority: data.priority,
    count,
  };
}

/** 백엔드 ReAct Agent 호출. VITE_API_BASE가 없으면 Vite 프록시(/api)를 사용. */
export async function recommend(payload: RecommendPayload): Promise<ApiResult> {
  const base = import.meta.env.VITE_API_BASE ?? '';
  const res = await fetch(`${base}/api/recommend`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    throw new Error(`백엔드 서버 오류 (${res.status})`);
  }
  return (await res.json()) as ApiResult;
}
