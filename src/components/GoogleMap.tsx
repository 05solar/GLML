import { useEffect, useRef, useState } from 'react';
import FauxMap from './FauxMap';
import { loadGoogleMaps } from '../util/googleMaps';
import './GoogleMap.css';

interface GoogleMapProps {
  lat: number;
  lng: number;
  /** 검색 반경(m) */
  radius?: number;
  /** 지도 클릭/마커 드래그 시 선택된 좌표 콜백 */
  onPick?: (lat: number, lng: number) => void;
}

/* ===== 실제 Google 지도 (VITE_GOOGLE_MAPS_API_KEY 필요) =====
   - 클릭/드래그하면 onPick(lat,lng) 호출
   - lat/lng props가 바뀌면 핀·반경을 그 위치로 이동
   - 키 없음/로드/인증 실패 시 장식용 지도(FauxMap)로 폴백 */
export default function GoogleMap({ lat, lng, radius = 600, onPick }: GoogleMapProps) {
  const ref = useRef<HTMLDivElement>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const markerRef = useRef<google.maps.Marker | null>(null);
  const circleRef = useRef<google.maps.Circle | null>(null);
  const pickRef = useRef(onPick);
  pickRef.current = onPick;

  const [failed, setFailed] = useState(false);
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined;

  // 최초 1회: 지도 생성 + 클릭/드래그 리스너
  useEffect(() => {
    if (!apiKey) {
      setFailed(true);
      return;
    }
    let cancelled = false;
    window.gm_authFailure = () => {
      if (!cancelled) setFailed(true);
    };

    loadGoogleMaps(apiKey)
      .then(() => {
        if (cancelled || !ref.current || !window.google) return;
        const g = window.google;
        const center = { lat, lng };
        const map = new g.maps.Map(ref.current, {
          center,
          zoom: 16,
          disableDefaultUI: true,
          clickableIcons: false,
          gestureHandling: 'greedy',
        });
        const circle = new g.maps.Circle({
          map,
          center,
          radius,
          strokeColor: '#F2C200',
          strokeOpacity: 0.9,
          strokeWeight: 2,
          fillColor: '#FFD21E',
          fillOpacity: 0.18,
        });
        const marker = new g.maps.Marker({
          map,
          position: center,
          draggable: true,
          icon: {
            path: g.maps.SymbolPath.CIRCLE,
            scale: 8,
            fillColor: '#FFD21E',
            fillOpacity: 1,
            strokeColor: '#2A2400',
            strokeWeight: 2,
          },
        });
        mapRef.current = map;
        circleRef.current = circle;
        markerRef.current = marker;

        map.addListener('click', (e: google.maps.MapMouseEvent) => {
          if (e.latLng) pickRef.current?.(e.latLng.lat(), e.latLng.lng());
        });
        marker.addListener('dragend', (e: google.maps.MapMouseEvent) => {
          if (e.latLng) pickRef.current?.(e.latLng.lat(), e.latLng.lng());
        });
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiKey]);

  // lat/lng/radius 변경 → 핀·반경 이동 + 지도 이동
  useEffect(() => {
    if (!window.google || !mapRef.current) return;
    const c = { lat, lng };
    markerRef.current?.setPosition(c);
    circleRef.current?.setCenter(c);
    circleRef.current?.setRadius(radius);
    mapRef.current.panTo(c);
  }, [lat, lng, radius]);

  if (failed) return <FauxMap />;
  return <div className="gmap" ref={ref} />;
}
