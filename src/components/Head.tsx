import type { ReactNode } from 'react';
import './Head.css';

interface HeadProps {
  title: ReactNode;
  sub?: ReactNode;
}

/* ===== 화면 헤드라인 ===== */
export default function Head({ title, sub }: HeadProps) {
  return (
    <div className="head">
      <h1>{title}</h1>
      {sub && <p>{sub}</p>}
    </div>
  );
}
