import './FauxMap.css';

interface RoadSpec {
  top?: string;
  left?: string;
  w: string;
  h: string;
  thick?: boolean;
  r?: number;
}
interface BlockSpec {
  top: string;
  left: string;
  w: string;
  h: string;
}

/* ===== 카카오맵 느낌의 장식용 지도 ===== */
export default function FauxMap() {
  const roads: RoadSpec[] = [
    { top: '18%', left: '-10%', w: '120%', h: '7px', thick: true, r: -4 },
    { top: '52%', left: '-10%', w: '120%', h: '9px', thick: true, r: 2 },
    { top: '78%', left: '-10%', w: '120%', h: '6px', thick: false, r: -2 },
    { left: '24%', top: '-10%', w: '6px', h: '120%', thick: false, r: 3 },
    { left: '58%', top: '-10%', w: '8px', h: '120%', thick: true, r: -3 },
    { left: '82%', top: '-10%', w: '5px', h: '120%', thick: false, r: 1 },
  ];
  const blocks: BlockSpec[] = [
    { top: '24%', left: '6%', w: '13%', h: '20%' },
    { top: '24%', left: '30%', w: '22%', h: '22%' },
    { top: '26%', left: '64%', w: '14%', h: '18%' },
    { top: '58%', left: '8%', w: '12%', h: '14%' },
    { top: '58%', left: '30%', w: '24%', h: '15%' },
    { top: '60%', left: '66%', w: '12%', h: '13%' },
    { top: '84%', left: '34%', w: '20%', h: '10%' },
  ];
  return (
    <div className="map">
      <div className="map-grid">
        {roads.map((r, i) => (
          <span
            key={i}
            className={'road' + (r.thick ? ' thick' : '')}
            style={{
              top: r.top,
              left: r.left,
              width: r.w,
              height: r.h,
              transform: `rotate(${r.r || 0}deg)`,
            }}
          />
        ))}
        {blocks.map((b, i) => (
          <span key={i} className="block" style={{ top: b.top, left: b.left, width: b.w, height: b.h }} />
        ))}
        <span
          className="water"
          style={{ bottom: '-6%', right: '-6%', width: '34%', height: '26%', borderRadius: '40% 60% 50% 50%' }}
        />
      </div>
      <div className="radius" />
      <div className="map-hint">이 위치 반경 600m로 검색해요</div>
      <div className="pin">
        <svg viewBox="0 0 40 48" fill="none">
          <path
            d="M20 47s16-14.4 16-27A16 16 0 104 20c0 12.6 16 27 16 27z"
            fill="#FFD21E"
            stroke="#2A2400"
            strokeWidth="2.2"
          />
          <circle cx="20" cy="20" r="5.4" fill="#2A2400" />
        </svg>
        <span className="pin-shadow" />
      </div>
    </div>
  );
}
