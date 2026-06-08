/**
 * 데스크톱에서 .device(폰 목업)를 뷰포트에 맞춰 scale 축소한다.
 * 화면 폭이 좁으면(모바일) 변환을 제거해 전체 화면으로 표시한다.
 */
export function initDeviceFit(): void {
  const fit = () => {
    const dev = document.querySelector<HTMLElement>('.device');
    if (!dev) return;
    if (window.innerWidth <= 520) {
      dev.style.transform = '';
      return;
    }
    const margin = 24;
    const s = Math.min(
      1,
      (window.innerHeight - margin) / (852 + 24),
      (window.innerWidth - margin) / (393 + 24),
    );
    dev.style.transform = `scale(${s})`;
    dev.style.transformOrigin = 'center center';
  };

  window.addEventListener('resize', fit);
  window.addEventListener('DOMContentLoaded', fit);
  fit();
}
