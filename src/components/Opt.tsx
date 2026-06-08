import type { Option } from '../types';
import { Ic } from './Icons';
import { OptIcon } from './OptionIcons';
import './Opt.css';

interface OptProps {
  data: Option;
  selected: boolean;
  onClick: () => void;
}

/* ===== 옵션 선택 카드 ===== */
export default function Opt({ data, selected, onClick }: OptProps) {
  return (
    <button className={'opt' + (selected ? ' sel' : '')} onClick={onClick} type="button">
      <span className="check">
        <Ic.check />
      </span>
      <span className="thumb" aria-hidden="true">
        <OptIcon name={data.icon} />
      </span>
      <span className="txt">
        <span className="lbl">{data.label}</span>
        {data.sub && <span className="sub">{data.sub}</span>}
      </span>
    </button>
  );
}
