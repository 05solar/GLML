/** 만날 위치 정보 */
export interface Place {
  name: string;
  address: string;
  lat: number;
  lng: number;
}

/** 다중 선택을 지원하는 조건 키 */
export type MultiKey = 'purpose' | 'time' | 'category' | 'price' | 'priority';

/** 사용자가 단계별로 입력한 추천 조건 (옵션은 다중 선택 → 배열) */
export interface AgentData {
  place: Place | null;
  purpose: string[];
  time: string[];
  category: string[];
  price: string[];
  priority: string[];
}

/** 선택 화면의 옵션 카드 한 개 */
export interface Option {
  id: string;
  emoji?: string;
  /** OptionIcons.tsx의 SVG 아이콘 이름 */
  icon?: string;
  label: string;
  sub?: string;
}

/** 추천 결과 맛집 한 곳 */
export interface Restaurant {
  nm: string;
  cat: string;
  rating: number;
  reviews: number;
  price: string;
  dist: string;
  reason: string;
  /** 실제 식당 사진 URL (백엔드 /api/photo 프록시). 없으면 아이콘 대체 */
  photo?: string | null;
  /** 무한 스크롤에서 중복 키 방지를 위한 내부 키 */
  _k?: number;
}

/** ReAct 트레이스 단계의 종류 */
export type TraceKind = 'thought' | 'action' | 'obs';

/** Agent 실행 트레이스 한 단계 */
export interface TraceStep {
  kind: TraceKind;
  title: string;
  mono: string | null;
}

/* ===== 백엔드 API 연동 타입 ===== */

/** 백엔드가 반환하는 추천 맛집 한 곳 */
export interface ApiRestaurant {
  name: string;
  category: string;
  menu: string;
  rating: number;
  review_count: number;
  price_level: string;
  price_range: string;
  distance_m: number;
  address: string;
  reason: string;
  /** 실제 사진 URL (백엔드 프록시). 없으면 null */
  photo?: string | null;
}

/** 백엔드 trace 이벤트(구조화) */
export interface TraceEvent {
  type: 'user' | 'plan' | 'thought' | 'action' | 'observation' | 'reflection' | 'final';
  text?: string;
  conditions?: Record<string, unknown>;
  steps?: string[];
  name?: string;
  args?: Record<string, unknown>;
  status?: string;
  message?: string;
  results?: Array<Record<string, unknown>>;
  satisfied?: boolean;
  checks?: Record<string, boolean>;
  comment?: string;
}

/** POST /api/recommend 응답 */
export interface ApiResult {
  prompt: string;
  conditions: Record<string, unknown>;
  trace: TraceEvent[];
  results: ApiRestaurant[];
  final: string;
  mode: 'offline' | 'llm';
  status: string;
}

/** App에서 관리하는 Agent 실행 상태 */
export interface AgentState {
  loading: boolean;
  data?: ApiResult;
  error?: string;
}
