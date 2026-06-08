import { useEffect, useMemo, useState } from 'react';
import type { AgentState, TraceEvent, TraceStep } from '../types';
import { Ic } from '../components/Icons';
import { KIND_LABEL } from '../data/trace';
import './AgentTracePage.css';

interface AgentTracePageProps {
  state: AgentState;
  onDone: () => void;
}

/** 백엔드 trace 이벤트 → 화면용 단계로 변환 */
function toSteps(events: TraceEvent[]): TraceStep[] {
  const out: TraceStep[] = [];
  for (const e of events) {
    if (e.type === 'plan') {
      out.push({ kind: 'thought', title: '사용자 조건 분석 (Plan-and-Solve)', mono: e.steps ? `${e.steps.length}단계 계획` : null });
    } else if (e.type === 'thought') {
      out.push({ kind: 'thought', title: e.text ?? '', mono: null });
    } else if (e.type === 'action') {
      out.push({ kind: 'action', title: `${e.name} 호출`, mono: e.args ? JSON.stringify(e.args) : null });
    } else if (e.type === 'observation') {
      const n = e.results?.length ?? 0;
      out.push({ kind: 'obs', title: e.message ?? '', mono: `status=${e.status}${n ? ` · ${n}개` : ''}` });
    } else if (e.type === 'reflection') {
      out.push({ kind: 'thought', title: '결과 검토 (Reflection)', mono: e.satisfied ? '조건 충족 ✓' : '일부 완화' });
    }
  }
  return out.filter((s) => s.title);
}

/* ===== ReAct Agent 실행 트레이스 화면 (백엔드 실시간 trace) ===== */
export default function AgentTracePage({ state, onDone }: AgentTracePageProps) {
  const { loading, data, error } = state;
  const steps = useMemo(() => (data ? toSteps(data.trace) : []), [data]);
  const ready = !loading && (!!data || !!error);

  // 노출된 단계 수
  const [visible, setVisible] = useState(0);

  useEffect(() => {
    if (!ready) return; // 아직 백엔드 응답 대기 중
    if (error) {
      const t = setTimeout(onDone, 900);
      return () => clearTimeout(t);
    }
    if (visible >= steps.length) {
      const t = setTimeout(onDone, 850);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => setVisible((v) => v + 1), visible === 0 ? 300 : 480);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, visible, steps.length, error]);

  const finished = ready && !error && visible >= steps.length;

  return (
    <div className="view view-enter">
      <div className="topbar">
        <span />
        <span />
        <span />
      </div>
      <div className="trace-head">
        {finished ? (
          <span
            style={{
              width: 30,
              height: 30,
              borderRadius: '50%',
              background: 'var(--point)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flex: '0 0 auto',
              color: 'var(--point-ink)',
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M5 12.5l4.5 4.5L19 7" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
        ) : (
          <span className="trace-spinner" />
        )}
        <div className="t-txt">
          <div className="t-ttl">{error ? '추천 중 문제가 발생했어요' : finished ? '추천 완료!' : 'Agent 실행 중'}</div>
          <div className="t-sub">
            {error
              ? '백엔드 서버가 실행 중인지 확인해 주세요'
              : finished
                ? '조건에 맞는 맛집을 찾았어요'
                : '조건에 맞는 맛집을 찾고 있어요'}
          </div>
        </div>
      </div>
      <div className="scroll">
        <div className="trace-list">
          {steps.slice(0, visible).map((s, i) => {
            const isLast = i === visible - 1;
            const active = isLast && !finished;
            return (
              <div key={i} className={'tnode' + (active ? ' active' : ' done')}>
                <span className="rail" />
                <span className="bullet">{active ? <span className="mini" /> : <Ic.check />}</span>
                <div className={'tcard ' + s.kind}>
                  <span className="kind">{KIND_LABEL[s.kind]}</span>
                  <div className="body">{s.title}</div>
                  {s.mono && <span className="mono">{s.mono}</span>}
                </div>
              </div>
            );
          })}
          {error && (
            <div className="trace-error">{error}<br />그래도 결과 화면으로 이동합니다.</div>
          )}
        </div>
      </div>
    </div>
  );
}
