import { Ic } from './Icons';
import './TopBar.css';

interface TopBarProps {
  onBack?: () => void;
  step: number;
  total: number;
}

/* ===== 뒤로가기 + 단계 진행 표시 상단바 ===== */
export default function TopBar({ onBack, step, total }: TopBarProps) {
  const segs = [];
  for (let i = 0; i < total; i++) {
    segs.push(<span key={i} className={'seg' + (i < step ? ' on' : '')} />);
  }
  return (
    <div className="topbar">
      <button className="iconbtn" onClick={onBack} aria-label="뒤로가기">
        <Ic.back />
      </button>
      {total ? <div className="progress-pill">{segs}</div> : <span />}
      <span />
    </div>
  );
}
