import type { Restaurant } from '../types';

/* ===== 맛집 목업 데이터 풀 ===== */
export const RESTO_POOL: Restaurant[] = [
  {
    nm: '송천 손칼국수',
    cat: '한식 · 칼국수',
    rating: 4.7,
    reviews: 1243,
    price: '₩ 8,000~',
    dist: '180m',
    reason:
      '<b>평점 4.7</b>로 주변 최상위. 점심에 든든한 한식을 찾는 혼밥족에게 가장 많이 추천돼요.',
  },
  {
    nm: '마하라자 인디안',
    cat: '양식 · 커리',
    rating: 4.6,
    reviews: 872,
    price: '₩ 13,000~',
    dist: '260m',
    reason: '리뷰 <b>872개</b>가 쌓인 검증된 곳. 친구·연인과 분위기 있게 즐기기 좋아요.',
  },
  {
    nm: '오비추라멘 본점',
    cat: '일식 · 라멘',
    rating: 4.8,
    reviews: 2104,
    price: '₩ 10,000~',
    dist: '340m',
    reason:
      '이 동네에서 <b>리뷰가 가장 많은</b> 라멘집. 저녁 웨이팅이 길지만 만족도 최고예요.',
  },
  {
    nm: '동백상회',
    cat: '카페 · 디저트',
    rating: 4.5,
    reviews: 651,
    price: '₩ 6,500~',
    dist: '120m',
    reason: '<b>가장 가까운</b> 디저트 카페. 식후 가볍게 들르기 좋은 거리예요.',
  },
  {
    nm: '청춘식당',
    cat: '한식 · 백반',
    rating: 4.4,
    reviews: 529,
    price: '₩ 9,000~',
    dist: '420m',
    reason: '가성비 좋은 백반집. <b>가격 부담 없이</b> 푸짐하게 먹고 싶을 때 추천해요.',
  },
  {
    nm: '리틀 사이공',
    cat: '양식 · 쌀국수',
    rating: 4.6,
    reviews: 744,
    price: '₩ 11,000~',
    dist: '510m',
    reason: '가볍게 먹기 좋은 쌀국수. 회식보다는 <b>둘이서 조용히</b> 가기 좋아요.',
  },
  {
    nm: '강가 화로구이',
    cat: '한식 · 고기',
    rating: 4.5,
    reviews: 1380,
    price: '₩ 16,000~',
    dist: '600m',
    reason: '단체석이 넉넉해 <b>회식 장소</b>로 인기. 평점·리뷰 모두 안정적이에요.',
  },
  {
    nm: '보름달 베이커리',
    cat: '카페 · 베이커리',
    rating: 4.7,
    reviews: 990,
    price: '₩ 5,000~',
    dist: '230m',
    reason: '평점 높은 동네 빵집. <b>커피 한 잔</b> 곁들이기 좋은 분위기예요.',
  },
  {
    nm: '황금성 중화요리',
    cat: '중식 · 짜장면',
    rating: 4.3,
    reviews: 611,
    price: '₩ 7,500~',
    dist: '380m',
    reason: '빠르고 든든한 한 끼. <b>혼밥</b>으로도 부담 없는 중식당이에요.',
  },
  {
    nm: '테이블 포 투',
    cat: '양식 · 파스타',
    rating: 4.6,
    reviews: 823,
    price: '₩ 15,000~',
    dist: '450m',
    reason: '<b>연인과 데이트</b>하기 좋은 분위기. 저녁 예약을 추천해요.',
  },
];

/** 풀에서 n개를 offset부터 순환 추출해 무한 스크롤 목록을 만든다. */
export function makeList(n: number, offset: number): Restaurant[] {
  const out: Restaurant[] = [];
  for (let i = 0; i < n; i++) {
    const base = RESTO_POOL[(offset + i) % RESTO_POOL.length];
    out.push({ ...base, _k: offset + i });
  }
  return out;
}
