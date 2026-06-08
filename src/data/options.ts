import type { Option } from '../types';

/* ===== 단계별 선택 옵션 ===== */

export const PURPOSE_OPTS: Option[] = [
  { id: 'solo', emoji: '🙂', icon: 'person', label: '혼자' },
  { id: 'friend', emoji: '🧑‍🤝‍🧑', icon: 'friends', label: '친구' },
  { id: 'couple', emoji: '💛', icon: 'heart', label: '연인' },
  { id: 'family', emoji: '👨‍👩‍👧', icon: 'family', label: '가족' },
  { id: 'work', emoji: '🍻', icon: 'cheers', label: '회식' },
];

export const TIME_OPTS: Option[] = [
  { id: 'morning', emoji: '🌅', icon: 'sunrise', label: '아침', sub: '간단한 한 끼' },
  { id: 'lunch', emoji: '🍱', icon: 'bento', label: '점심', sub: '든든하게' },
  { id: 'dinner', emoji: '🌙', icon: 'moon', label: '저녁', sub: '제대로 한 상' },
  { id: 'cafe', emoji: '☕', icon: 'coffee', label: '카페 / 디저트', sub: '가볍게' },
];

export const CATEGORY_OPTS: Option[] = [
  { id: 'any', emoji: '✨', icon: 'sparkles', label: '상관없음' },
  { id: 'korean', emoji: '🍚', icon: 'rice', label: '한식' },
  { id: 'japanese', emoji: '🍣', icon: 'sushi', label: '일식' },
  { id: 'chinese', emoji: '🥢', icon: 'noodle', label: '중식' },
  { id: 'western', emoji: '🍝', icon: 'pasta', label: '양식' },
  { id: 'cafe', emoji: '☕', icon: 'coffee', label: '카페' },
  { id: 'dessert', emoji: '🍰', icon: 'cake', label: '디저트' },
];

export const PRICE_OPTS: Option[] = [
  { id: 'cheap', emoji: '💸', icon: 'coin', label: '저렴한 곳', sub: '가성비 위주로' },
  { id: 'normal', emoji: '💳', icon: 'card', label: '보통', sub: '적당한 가격대' },
  { id: 'any', emoji: '✨', icon: 'sparkles', label: '상관없음', sub: '가격은 신경 안 써요' },
];

export const PRIORITY_OPTS: Option[] = [
  { id: 'rating', emoji: '⭐', icon: 'star', label: '평점 높은 곳' },
  { id: 'reviews', emoji: '💬', icon: 'chat', label: '리뷰 많은 곳' },
  { id: 'near', emoji: '📍', icon: 'pin', label: '가까운 곳' },
  { id: 'cheap', emoji: '💰', icon: 'won', label: '가격 부담 없는 곳' },
];

/* ===== 결과 화면 태그용 라벨 매핑 ===== */

export const PURPOSE_MAP: Record<string, string> = {
  solo: '혼자',
  friend: '친구',
  couple: '연인',
  family: '가족',
  work: '회식',
};

export const TIME_MAP: Record<string, string> = {
  morning: '아침',
  lunch: '점심',
  dinner: '저녁',
  cafe: '카페/디저트',
};

export const CATEGORY_MAP: Record<string, string> = {
  any: '상관없음',
  korean: '한식',
  japanese: '일식',
  chinese: '중식',
  western: '양식',
  cafe: '카페',
  dessert: '디저트',
};

export const PRIORITY_LABEL: Record<string, string> = {
  rating: '평점 높은 곳',
  reviews: '리뷰 많은 곳',
  near: '가까운 곳',
  cheap: '가격 부담 없는 곳',
};
