import { useCallback, useRef, useState } from 'react';
import type { AgentData, AgentState, ApiRestaurant, Restaurant } from '../types';
import { Ic } from '../components/Icons';
import TopBar from '../components/TopBar';
import { makeList } from '../data/restaurants';
import { PURPOSE_MAP, TIME_MAP, CATEGORY_MAP, PRIORITY_LABEL } from '../data/options';
import './ResultPage.css';

interface ResultPageProps {
  data: AgentData;
  agent?: AgentState;
  onRestart: () => void;
  onEdit: () => void;
}

/** 사진 영역: 실제 사진(있으면) → 로드 실패 시 카테고리 아이콘 대체 */
function PhotoArea({ photo, cat }: { photo?: string | null; cat: string }) {
  const [err, setErr] = useState(false);
  if (photo && !err) {
    return <img className="photo-img" src={photo} alt="" loading="lazy" onError={() => setErr(true)} />;
  }
  return (
    <span className="photo-emoji" aria-hidden="true">
      {catEmoji(cat)}
    </span>
  );
}

/** 카테고리/메뉴 텍스트 → 어울리는 음식 이모지 */
function catEmoji(cat: string): string {
  if (/카페|커피|coffee/i.test(cat)) return '☕';
  if (/디저트|베이커리|제과|빵|케이크/.test(cat)) return '🍰';
  if (/일식|일본|스시|초밥|라멘|돈카츠|우동/.test(cat)) return '🍣';
  if (/중식|중국|짜장|짬뽕|마라/.test(cat)) return '🥢';
  if (/양식|파스타|피자|스테이크|이탈|버거/.test(cat)) return '🍝';
  if (/고기|구이|삼겹|곱창|갈비|화로/.test(cat)) return '🥩';
  if (/칼국수|국수|면|라면|국밥|탕|찌개/.test(cat)) return '🍜';
  if (/한식|백반|비빔밥|한정식|분식/.test(cat)) return '🍚';
  return '🍽️';
}

/** 백엔드 결과 → 화면 카드 모델 */
function toCard(r: ApiRestaurant): Restaurant {
  return {
    nm: r.name,
    cat: r.menu ? `${r.category} · ${r.menu}` : r.category,
    rating: r.rating,
    reviews: r.review_count,
    price: r.price_range || r.price_level,
    dist: `${r.distance_m}m`,
    reason: r.reason,
    photo: r.photo ?? null,
  };
}

/* ===== 추천 결과 화면 ===== */
export default function ResultPage({ data, agent, onRestart, onEdit }: ResultPageProps) {
  const placeName = (data.place && data.place.name) || '내 주변';
  const api = agent?.data;
  const apiItems = api?.results?.length ? api.results.map(toCard) : null;
  const usingApi = apiItems !== null;
  const noApiResults = !!api && (!api.results || api.results.length === 0);

  // API 결과가 있으면 그것을, 없으면(독립 실행/오류) 목업으로 폴백
  const [items, setItems] = useState<Restaurant[]>(() => apiItems ?? makeList(4, 0));
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const loadMore = useCallback(() => {
    setLoading(true);
    setTimeout(() => {
      setItems((prev) => [...prev, ...makeList(3, prev.length)]);
      setLoading(false);
    }, 850);
  }, []);

  const onScroll = (e: React.UIEvent<HTMLDivElement>) => {
    if (usingApi) return; // 실데이터는 top-N 고정 (무한 스크롤 비활성)
    const el = e.currentTarget;
    if (!loading && el.scrollHeight - el.scrollTop - el.clientHeight < 280) {
      loadMore();
    }
  };

  const tags: string[] = [
    ...data.purpose.map((v) => PURPOSE_MAP[v]),
    ...data.time.map((v) => TIME_MAP[v]),
    ...data.category.filter((v) => v !== 'any').map((v) => CATEGORY_MAP[v]),
    ...data.priority.map((v) => PRIORITY_LABEL[v]),
  ].filter(Boolean);

  const eyebrow = api ? (api.mode === 'llm' ? 'AI Agent 추천 완료' : '추천 완료 (샘플 데이터)') : 'GLML 추천 완료';

  return (
    <div className="view view-enter">
      <TopBar onBack={onEdit} step={0} total={0} />
      <div className="result-top">
        <div className="eyebrow">{eyebrow}</div>
        <h1>
          <span className="place">{placeName}</span> 근처 맛집
        </h1>
      </div>
      <div className="result-meta">
        {tags.map((t, i) => (
          <span key={i} className="tag">
            {t}
          </span>
        ))}
      </div>
      <div className="scroll" ref={scrollRef} onScroll={onScroll} style={{ paddingBottom: 4 }}>
        {noApiResults ? (
          <div className="result-empty">{api?.final || '조건에 맞는 맛집을 찾지 못했어요. 조건을 바꿔 다시 시도해 주세요.'}</div>
        ) : (
          items.map((r, i) => (
            <div className="rcard" key={`${r.nm}-${i}`} style={{ animationDelay: Math.min(i, 3) * 0.05 + 's' }}>
              <div className="photo">
                <PhotoArea photo={r.photo} cat={r.cat} />
                <span className="rank">{i + 1}</span>
                <span className="dist-badge">{r.dist}</span>
              </div>
              <div className="info">
                <div className="nm-row">
                  <span className="nm">{r.nm}</span>
                  <span className="cat">{r.cat}</span>
                </div>
                <div className="stats">
                  <span className="star">
                    <Ic.star />
                    {r.rating}
                  </span>
                  <span className="rev">리뷰 {r.reviews.toLocaleString()}</span>
                  <span className="price">{r.price}</span>
                </div>
                <div className="reason">
                  <span className="ai">
                    <Ic.spark />
                  </span>
                  <span className="rtxt" dangerouslySetInnerHTML={{ __html: r.reason }} />
                </div>
              </div>
            </div>
          ))
        )}
        {!usingApi && !noApiResults && (
          <div className="loadmore">
            {loading ? (
              <>
                <span className="sp" /> 더 찾는 중…
              </>
            ) : (
              '스크롤하면 더 많은 맛집을 볼 수 있어요'
            )}
          </div>
        )}
      </div>
      <div className="result-footer">
        <button className="btn-ghost" onClick={onEdit}>
          조건 수정하기
        </button>
        <button className="btn-primary" onClick={onRestart}>
          다시 추천받기
        </button>
      </div>
    </div>
  );
}
