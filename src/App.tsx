import { useState } from 'react';
import type { AgentData, AgentState, MultiKey, Place } from './types';
import StartPage from './pages/StartPage';
import LocationSearchPage from './pages/LocationSearchPage';
import SelectScreen from './components/SelectScreen';
import AgentTracePage from './pages/AgentTracePage';
import ResultPage from './pages/ResultPage';
import { recommend, toPayload } from './api';
import {
  PURPOSE_OPTS,
  TIME_OPTS,
  CATEGORY_OPTS,
  PRICE_OPTS,
  PRIORITY_OPTS,
} from './data/options';

/* ===== 앱 단계 머신 =====
   step: 0 시작 · 1 위치 · 2 동행 · 3 시간 · 4 음식 · 5 가격 · 6 우선순위 · 7 트레이스 · 8 결과
   (?step=N 쿼리로 특정 단계부터 시작 가능 — 2 이상이면 조건을 미리 채워 둠) */
export default function App() {
  const initStep = parseInt(new URLSearchParams(location.search).get('step') || '0', 10) || 0;
  const [step, setStep] = useState<number>(initStep);

  const seed: AgentData =
    initStep >= 2
      ? {
          place: {
            name: '전주 객사',
            address: '전북특별자치도 전주시 완산구 충경로',
            lat: 35.8186,
            lng: 127.1469,
          },
          purpose: ['friend'],
          time: ['lunch'],
          category: ['korean'],
          price: ['normal'],
          priority: ['rating'],
        }
      : { place: null, purpose: [], time: [], category: [], price: [], priority: [] };

  const [data, setData] = useState<AgentData>(seed);
  const setPlace = (p: Place) => setData((d) => ({ ...d, place: p }));

  // 옵션 다중 선택 토글. 'any'(상관없음)는 다른 선택과 배타적으로 처리.
  const toggle = (k: MultiKey, id: string) =>
    setData((d) => {
      const arr = d[k];
      let nextArr: string[];
      if (id === 'any') {
        nextArr = arr.includes('any') ? [] : ['any'];
      } else {
        const base = arr.filter((x) => x !== 'any');
        nextArr = base.includes(id) ? base.filter((x) => x !== id) : [...base, id];
      }
      return { ...d, [k]: nextArr };
    });

  const next = () => setStep((s) => s + 1);
  const back = () => setStep((s) => Math.max(0, s - 1));
  const go = (s: number) => setStep(s);

  // 백엔드 ReAct Agent 실행 상태
  const [agent, setAgent] = useState<AgentState>({ loading: false });
  const startAgent = (d: AgentData) => {
    setAgent({ loading: true });
    recommend(toPayload(d))
      .then((res) => setAgent({ loading: false, data: res }))
      .catch((e) => setAgent({ loading: false, error: e?.message ?? String(e) }));
  };

  switch (step) {
    case 0:
      return <StartPage onStart={next} />;
    case 1:
      return (
        <LocationSearchPage data={data} onBack={back} onNext={next} setPlace={setPlace} />
      );
    case 2:
      return (
        <SelectScreen
          animKey="purpose"
          step={2}
          total={6}
          onBack={back}
          title={
            <span>
              <span className="hl">누구와</span> 방문하나요?
            </span>
          }
          sub="함께하는 사람에 맞춰 추천해드려요 (여러 개 선택 가능)"
          options={PURPOSE_OPTS}
          values={data.purpose}
          onToggle={(v) => toggle('purpose', v)}
          onNext={next}
        />
      );
    case 3:
      return (
        <SelectScreen
          animKey="time"
          step={3}
          total={6}
          onBack={back}
          title={
            <span>
              언제 <span className="hl">방문하나요?</span>
            </span>
          }
          sub="시간대에 어울리는 곳을 골라드릴게요 (여러 개 선택 가능)"
          options={TIME_OPTS}
          values={data.time}
          onToggle={(v) => toggle('time', v)}
          onNext={next}
        />
      );
    case 4:
      return (
        <SelectScreen
          animKey="cat"
          step={4}
          total={6}
          onBack={back}
          title={
            <span>
              어떤 <span className="hl">음식</span>을 원하나요?
            </span>
          }
          sub="끌리는 메뉴를 골라주세요 (여러 개 선택 가능)"
          options={CATEGORY_OPTS}
          values={data.category}
          onToggle={(v) => toggle('category', v)}
          onNext={next}
        />
      );
    case 5:
      return (
        <SelectScreen
          animKey="price"
          step={5}
          total={6}
          onBack={back}
          title={
            <span>
              <span className="hl">가격대</span>는 어떠세요?
            </span>
          }
          sub="부담 없는 선에서 찾아드릴게요 (여러 개 선택 가능)"
          options={PRICE_OPTS}
          values={data.price}
          onToggle={(v) => toggle('price', v)}
          onNext={next}
          cols={1}
        />
      );
    case 6:
      return (
        <SelectScreen
          animKey="pri"
          step={6}
          total={6}
          onBack={back}
          title={
            <span>
              무엇을 <span className="hl">가장 중요</span>하게 볼까요?
            </span>
          }
          sub="이 기준으로 순위를 정렬해요 (여러 개 선택 가능)"
          options={PRIORITY_OPTS}
          values={data.priority}
          onToggle={(v) => toggle('priority', v)}
          onNext={() => {
            startAgent(data);
            next();
          }}
          cta="완료"
        />
      );
    case 7:
      return <AgentTracePage state={agent} onDone={() => go(8)} />;
    case 8:
      return (
        <ResultPage
          data={data}
          agent={agent}
          onRestart={() => {
            setData({
              place: data.place,
              purpose: [],
              time: [],
              category: [],
              price: [],
              priority: [],
            });
            setAgent({ loading: false });
            go(2);
          }}
          onEdit={() => {
            setAgent({ loading: false });
            go(2);
          }}
        />
      );
    default:
      return <StartPage onStart={() => go(1)} />;
  }
}
