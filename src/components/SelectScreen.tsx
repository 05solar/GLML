import type { ReactNode } from 'react';
import type { Option } from '../types';
import TopBar from './TopBar';
import Head from './Head';
import Opt from './Opt';
import './SelectScreen.css';

interface SelectScreenProps {
  step: number;
  total: number;
  onBack: () => void;
  title: ReactNode;
  sub?: ReactNode;
  options: Option[];
  /** 선택된 id 목록 (다중 선택) */
  values: string[];
  onToggle: (id: string) => void;
  onNext: () => void;
  cols?: 1 | 2;
  cta?: string;
  animKey?: string;
}

/* ===== 다중 선택 화면 (목적/시간/카테고리/가격/우선순위 공용) ===== */
export default function SelectScreen({
  step,
  total,
  onBack,
  title,
  sub,
  options,
  values,
  onToggle,
  onNext,
  cols = 2,
  cta = '다음',
  animKey,
}: SelectScreenProps) {
  return (
    <div className="view view-enter" key={animKey}>
      <TopBar onBack={onBack} step={step} total={total} />
      <div className="scroll">
        <Head title={title} sub={sub} />
        <div className={'opts ' + (cols === 1 ? 'g1' : 'g2')}>
          {options.map((o) => (
            <Opt key={o.id} data={o} selected={values.includes(o.id)} onClick={() => onToggle(o.id)} />
          ))}
        </div>
      </div>
      <div className="footer">
        <button className="btn-primary" disabled={values.length === 0} onClick={onNext}>
          {cta}
        </button>
      </div>
    </div>
  );
}
