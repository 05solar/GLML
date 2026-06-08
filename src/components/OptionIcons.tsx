import type { JSX } from 'react';

/* ===== 옵션용 직접 그린 SVG 아이콘 =====
   모두 24x24 viewBox, currentColor 기반. 옵션 데이터의 icon 이름으로 매칭. */
const ICONS: Record<string, () => JSX.Element> = {
  // 동행
  person: () => (
    <svg viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="8" r="3.4" stroke="currentColor" strokeWidth="1.7" />
      <path d="M5.5 20c0-3.6 3-6 6.5-6s6.5 2.4 6.5 6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  ),
  friends: () => (
    <svg viewBox="0 0 24 24" fill="none">
      <circle cx="8.5" cy="9" r="2.7" stroke="currentColor" strokeWidth="1.6" />
      <circle cx="16" cy="9.5" r="2.3" stroke="currentColor" strokeWidth="1.6" />
      <path d="M3.5 19c0-2.8 2.2-4.6 5-4.6 1.4 0 2.7.5 3.6 1.4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M13.6 18.4c.4-2.1 2-3.5 4.1-3.5 1.9 0 3.3 1.1 3.8 2.8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  ),
  heart: () => (
    <svg viewBox="0 0 24 24" fill="none">
      <path d="M12 20.5S4 15.6 4 9.9A4 4 0 0112 7a4 4 0 018 2.9c0 5.7-8 10.6-8 10.6z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
    </svg>
  ),
  family: () => (
    <svg viewBox="0 0 24 24" fill="none">
      <circle cx="7.5" cy="7.5" r="2.3" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="16.5" cy="7.5" r="2.3" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="12" cy="12.6" r="1.8" stroke="currentColor" strokeWidth="1.5" />
      <path d="M4 18.5c0-2.1 1.6-3.6 3.5-3.6M20 18.5c0-2.1-1.6-3.6-3.5-3.6M9.2 20.5c0-1.7 1.2-2.8 2.8-2.8s2.8 1.1 2.8 2.8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  ),
  cheers: () => (
    <svg viewBox="0 0 24 24" fill="none">
      <path d="M5 5l5 1.1L8.2 11M8.2 11l-.6 7M5.8 18h4.6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M19 5l-5 1.1L15.8 11M15.8 11l.6 7M18.2 18h-4.6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),

  // 시간대
  sunrise: () => (
    <svg viewBox="0 0 24 24" fill="none">
      <path d="M3 18h18M7 18a5 5 0 0110 0" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M12 4v2.4M5.2 8.6l1.6 1.6M18.8 8.6l-1.6 1.6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  ),
  bento: () => (
    <svg viewBox="0 0 24 24" fill="none">
      <rect x="3.5" y="6.5" width="17" height="11" rx="2.5" stroke="currentColor" strokeWidth="1.6" />
      <path d="M12 6.5v11M3.5 12h8.5" stroke="currentColor" strokeWidth="1.4" />
      <circle cx="16.2" cy="10" r="1" fill="currentColor" />
    </svg>
  ),
  moon: () => (
    <svg viewBox="0 0 24 24" fill="none">
      <path d="M20 14.2A8 8 0 119.5 3.8 6.3 6.3 0 0020 14.2z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
    </svg>
  ),
  coffee: () => (
    <svg viewBox="0 0 24 24" fill="none">
      <path d="M5 9h11v4.5a4 4 0 01-4 4H9a4 4 0 01-4-4z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M16 10.5h2a2.2 2.2 0 010 4.4h-2" stroke="currentColor" strokeWidth="1.6" />
      <path d="M8 3.6c-.6.8-.6 1.7 0 2.5M11.4 3.6c-.6.8-.6 1.7 0 2.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  ),

  // 음식 종류
  sparkles: () => (
    <svg viewBox="0 0 24 24" fill="none">
      <path d="M11 3l1.7 4.8 4.8 1.7-4.8 1.7L11 16l-1.7-4.8L4.5 9.5l4.8-1.7z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M17.5 14.5l.7 2 2 .7-2 .7-.7 2-.7-2-2-.7 2-.7z" fill="currentColor" />
    </svg>
  ),
  rice: () => (
    <svg viewBox="0 0 24 24" fill="none">
      <path d="M3.5 12.5h17a8.5 8.5 0 01-17 0z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M2.5 12.5h19" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M9 6c-.7.9-.7 1.8 0 2.7M13 5.5c-.7.9-.7 1.8 0 2.7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  ),
  sushi: () => (
    <svg viewBox="0 0 24 24" fill="none">
      <rect x="3.5" y="11.5" width="17" height="5.5" rx="2.7" stroke="currentColor" strokeWidth="1.6" />
      <path d="M4.5 11.5c2.4-3.4 12.6-3.4 15 0" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M12 11.5v5.5" stroke="currentColor" strokeWidth="1.3" />
    </svg>
  ),
  noodle: () => (
    <svg viewBox="0 0 24 24" fill="none">
      <path d="M4 12h13a6.5 6.5 0 01-13 0z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M3 12h15" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M15 3.5l4.5 7M18 3l-1.4 7.2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  ),
  pasta: () => (
    <svg viewBox="0 0 24 24" fill="none">
      <path d="M8 8.6V21" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M6 3v3.4a2 2 0 004 0V3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M16 13.5V21" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M16 13.5c2.2 0 2.2-4.4 0-10.5" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
    </svg>
  ),
  cake: () => (
    <svg viewBox="0 0 24 24" fill="none">
      <path d="M4 12h16v7a1 1 0 01-1 1H5a1 1 0 01-1-1z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M4 12c0-1.7 3.6-3 8-3s8 1.3 8 3" stroke="currentColor" strokeWidth="1.6" />
      <path d="M4 15.6c1.8 1.2 3.4-1 5 0s3.4-1 5 0 3.4-1 5 0" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      <path d="M12 9V5.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      <circle cx="12" cy="4.6" r="1" fill="currentColor" />
    </svg>
  ),

  // 가격
  coin: () => (
    <svg viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="1.6" />
      <path d="M9 9.2l3 4.2 3-4.2M9 12.8h6M9.5 14.8h5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  card: () => (
    <svg viewBox="0 0 24 24" fill="none">
      <rect x="3" y="6" width="18" height="12" rx="2.5" stroke="currentColor" strokeWidth="1.6" />
      <path d="M3 10h18" stroke="currentColor" strokeWidth="1.6" />
      <path d="M6.5 14.5h3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  ),

  // 우선순위
  star: () => (
    <svg viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 3.2l2.5 5.3 5.8.7-4.3 4 1.1 5.7L12 16.1 6.9 18.9l1.1-5.7-4.3-4 5.8-.7z" />
    </svg>
  ),
  chat: () => (
    <svg viewBox="0 0 24 24" fill="none">
      <path d="M20 13.6A1.6 1.6 0 0118.4 15H9.2L5 18.5V6.6A1.6 1.6 0 016.6 5h11.8A1.6 1.6 0 0120 6.6z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      <circle cx="9" cy="10" r="1" fill="currentColor" />
      <circle cx="12.5" cy="10" r="1" fill="currentColor" />
      <circle cx="16" cy="10" r="1" fill="currentColor" />
    </svg>
  ),
  pin: () => (
    <svg viewBox="0 0 24 24" fill="none">
      <path d="M12 21s6.5-6 6.5-10.5A6.5 6.5 0 105.5 10.5C5.5 15 12 21 12 21z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
      <circle cx="12" cy="10.2" r="2.3" fill="currentColor" />
    </svg>
  ),
  won: () => (
    <svg viewBox="0 0 24 24" fill="none">
      <path d="M4 6l3 9 3-7 2.5 7 3.5-9" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M3.5 11h17M3.5 14h17" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  ),
};

export function OptIcon({ name }: { name?: string }) {
  const Render = (name && ICONS[name]) || ICONS.sparkles;
  return <Render />;
}
