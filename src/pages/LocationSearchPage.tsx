import { useRef, useState } from 'react';
import type { AgentData, Place } from '../types';
import type { PlaceSuggestion } from '../util/googleMaps';
import { Ic } from '../components/Icons';
import TopBar from '../components/TopBar';
import Head from '../components/Head';
import GoogleMap from '../components/GoogleMap';
import { reverseGeocode, geocodeAddress, placeAutocomplete, resolveSuggestion } from '../util/googleMaps';
import './LocationSearchPage.css';

interface LocationSearchPageProps {
  data: AgentData;
  onBack: () => void;
  onNext: () => void;
  setPlace: (p: Place) => void;
}

const DEFAULT_PLACE: Place = {
  name: '전주 객사',
  address: '전북특별자치도 전주시 완산구 충경로',
  lat: 35.8186,
  lng: 127.1469,
};

/* ===== 위치 검색 화면 (실제 Google 지도 · 자동완성 · 클릭/드래그/현재위치) ===== */
export default function LocationSearchPage({ data, onBack, onNext, setPlace }: LocationSearchPageProps) {
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined;
  const initial = data.place ?? DEFAULT_PLACE;

  const [place, setLocalPlace] = useState<Place>(initial);
  const [query, setQuery] = useState<string>(initial.name);
  const [busy, setBusy] = useState(false);
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([]);
  const [open, setOpen] = useState(false);
  const debounceRef = useRef<number | null>(null);

  const commit = (p: Place) => {
    setLocalPlace(p);
    setPlace(p);
  };

  const closeAc = () => {
    setOpen(false);
    setSuggestions([]);
  };

  // 입력 → 디바운스 후 실시간 연관 검색어 조회
  const onQueryChange = (v: string) => {
    setQuery(v);
    if (!apiKey) return;
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    if (v.trim().length < 1) {
      closeAc();
      return;
    }
    debounceRef.current = window.setTimeout(() => {
      placeAutocomplete(apiKey, v, { lat: place.lat, lng: place.lng }).then((s) => {
        setSuggestions(s);
        setOpen(s.length > 0);
      });
    }, 220);
  };

  // 연관 검색어 선택 → 좌표/주소 반영 + 지도 이동
  const pickSuggestion = (s: PlaceSuggestion) => {
    closeAc();
    setQuery(s.primary);
    resolveSuggestion(s).then((r) => {
      if (r) {
        commit(r);
        setQuery(r.name);
      }
    });
  };

  // 지도 클릭/드래그/현재위치 → 좌표 즉시 반영 + 역지오코딩으로 주소 갱신
  const applyPos = (lat: number, lng: number) => {
    closeAc();
    setLocalPlace((prev) => ({ ...prev, lat, lng, name: '위치 확인 중…' }));
    if (!apiKey) {
      commit({ name: '선택한 위치', address: `${lat.toFixed(5)}, ${lng.toFixed(5)}`, lat, lng });
      return;
    }
    reverseGeocode(apiKey, lat, lng).then((r) => {
      commit(r);
      setQuery(r.name);
    });
  };

  // 현재 위치 (브라우저 Geolocation)
  const useMyLocation = () => {
    if (!navigator.geolocation) {
      alert('이 브라우저는 위치 기능을 지원하지 않아요.');
      return;
    }
    setBusy(true);
    navigator.geolocation.getCurrentPosition(
      (p) => {
        setBusy(false);
        applyPos(p.coords.latitude, p.coords.longitude);
      },
      () => {
        setBusy(false);
        alert('현재 위치를 가져오지 못했어요. 위치 권한을 허용했는지 확인해 주세요.');
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 },
    );
  };

  // 검색어 → 좌표 (정지오코딩, 자동완성 결과가 없을 때)
  const runSearch = () => {
    const q = query.trim();
    if (!q || !apiKey) return;
    geocodeAddress(apiKey, q).then((r) => {
      if (r) commit(r);
    });
  };

  return (
    <div className="view view-enter">
      <TopBar onBack={onBack} step={1} total={6} />
      <Head
        title={
          <span>
            어디쯤에서 <span className="hl">만날까요?</span>
          </span>
        }
        sub="검색하거나 지도를 눌러 위치를 정해보세요"
      />
      <div className="map-wrap">
        <div className="map-search">
          <div className="map-searchbar">
            <Ic.search />
            <input
              value={query}
              placeholder="장소·주소 검색 (예: 전주 객사)"
              onChange={(e) => onQueryChange(e.target.value)}
              onFocus={() => {
                if (suggestions.length) setOpen(true);
              }}
              onBlur={() => window.setTimeout(() => setOpen(false), 150)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  if (suggestions.length) pickSuggestion(suggestions[0]);
                  else runSearch();
                  (e.target as HTMLInputElement).blur();
                } else if (e.key === 'Escape') {
                  setOpen(false);
                }
              }}
            />
          </div>
          {open && suggestions.length > 0 && (
            <ul className="ac-list">
              {suggestions.map((s) => (
                <li
                  key={s.placeId}
                  className="ac-item"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    pickSuggestion(s);
                  }}
                >
                  <span className="ac-pin">
                    <Ic.pin />
                  </span>
                  <span className="ac-txt">
                    <span className="ac-primary">{s.primary}</span>
                    {s.secondary && <span className="ac-secondary">{s.secondary}</span>}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="map-layerbtn">
          <Ic.layers />
        </div>
        <GoogleMap lat={place.lat} lng={place.lng} onPick={applyPos} />
        <button
          type="button"
          className={'map-locate' + (busy ? ' busy' : '')}
          onClick={useMyLocation}
          aria-label="현재 위치로 이동"
        >
          <Ic.locate />
        </button>
        <div className="map-scale">
          <div className="bar" />
          600m
        </div>
      </div>
      <div style={{ padding: '12px 0 2px' }}>
        <div className="place-pill">
          <span className="dot">
            <Ic.pin />
          </span>
          <div>
            <div className="nm">{place.name}</div>
            <div className="ad">{place.address}</div>
          </div>
        </div>
      </div>
      <div className="footer">
        <button
          className="btn-primary"
          onClick={() => {
            setPlace(place);
            onNext();
          }}
        >
          다음
        </button>
      </div>
    </div>
  );
}
