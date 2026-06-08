import './StartPage.css';

interface StartPageProps {
  onStart: () => void;
}

/* ===== 시작 화면 ===== */
export default function StartPage({ onStart }: StartPageProps) {
  return (
    <div className="start start-yellow">
      <span
        className="start-blob"
        style={{ top: '-60px', right: '-50px', width: '230px', height: '230px', background: 'rgba(255,255,255,.28)' }}
      />
      <span
        className="start-blob"
        style={{ bottom: '150px', left: '-70px', width: '190px', height: '190px', background: 'rgba(255,255,255,.22)' }}
      />
      <div style={{ position: 'relative', zIndex: 2, display: 'flex', flexDirection: 'column', height: '100%' }}>
        <div>
          <span className="logo-mark">GLML</span>
        </div>
        <div className="copy">
          <div className="small">
            좋아하는 것만
            <br />
            먹고싶으니까,
          </div>
          <div className="rule" />
          <div className="big">
            이제는
            <br />
            <span className="gmg">GLML</span>
          </div>
        </div>
        <button className="btn-start" onClick={onStart}>
          시작하기
        </button>
      </div>
    </div>
  );
}
