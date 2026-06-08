/**
 * Google Maps JavaScript API 스크립트를 한 번만 로드하는 로더.
 * 콜백이 호출되면(=google.maps 준비됨) resolve 한다.
 */

declare global {
  interface Window {
    google?: typeof google;
    __gmapsInit?: () => void;
    /** Google가 인증 실패(키 오류/미사용 설정/빌링) 시 호출 */
    gm_authFailure?: () => void;
  }
}

let loadPromise: Promise<void> | null = null;

export function loadGoogleMaps(apiKey: string): Promise<void> {
  if (loadPromise) return loadPromise;

  loadPromise = new Promise<void>((resolve, reject) => {
    if (window.google?.maps) {
      resolve();
      return;
    }
    window.__gmapsInit = () => resolve();
    const s = document.createElement('script');
    s.src =
      `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}` +
      `&callback=__gmapsInit&language=ko&region=KR&loading=async`;
    s.async = true;
    s.onerror = () => reject(new Error('Google Maps 스크립트 로드 실패'));
    document.head.appendChild(s);
  });

  return loadPromise;
}

export interface GeoResult {
  name: string;
  address: string;
  lat: number;
  lng: number;
}

/** 주소 컴포넌트에서 짧고 의미있는 지명을 고른다. */
function pickShortName(r: google.maps.GeocoderResult): string {
  const comps = r.address_components ?? [];
  const order = [
    'sublocality_level_2',
    'sublocality_level_1',
    'sublocality',
    'neighborhood',
    'premise',
    'route',
  ];
  for (const t of order) {
    const c = comps.find((x) => x.types.includes(t));
    if (c) return c.long_name;
  }
  return r.formatted_address.replace(/^대한민국\s*/, '');
}

/** 좌표 → 주소 (역지오코딩). 실패 시 좌표 문자열로 대체. */
export async function reverseGeocode(apiKey: string, lat: number, lng: number): Promise<GeoResult> {
  const fallback: GeoResult = { name: '선택한 위치', address: `${lat.toFixed(5)}, ${lng.toFixed(5)}`, lat, lng };
  try {
    await loadGoogleMaps(apiKey);
    if (!window.google) return fallback;
    const geocoder = new window.google.maps.Geocoder();
    const { results } = await geocoder.geocode({ location: { lat, lng }, language: 'ko' });
    const best = results?.[0];
    if (!best) return fallback;
    return { name: pickShortName(best), address: best.formatted_address, lat, lng };
  } catch {
    return fallback;
  }
}

/* ===== 장소 자동완성 (Places Autocomplete) ===== */

export interface PlaceSuggestion {
  placeId: string;
  primary: string;
  secondary: string;
  prediction: google.maps.places.PlacePrediction;
}

let placesLib: google.maps.PlacesLibrary | null = null;
let sessionToken: google.maps.places.AutocompleteSessionToken | null = null;

async function getPlacesLib(apiKey: string): Promise<google.maps.PlacesLibrary | null> {
  await loadGoogleMaps(apiKey);
  if (!window.google) return null;
  if (!placesLib) {
    placesLib = (await window.google.maps.importLibrary('places')) as google.maps.PlacesLibrary;
  }
  return placesLib;
}

/** 입력어 → 실시간 연관 검색어(장소 예측) 목록 */
export async function placeAutocomplete(
  apiKey: string,
  input: string,
  bias?: { lat: number; lng: number },
): Promise<PlaceSuggestion[]> {
  const q = input.trim();
  if (!q) return [];
  try {
    const lib = await getPlacesLib(apiKey);
    if (!lib) return [];
    if (!sessionToken) sessionToken = new lib.AutocompleteSessionToken();
    const request: google.maps.places.AutocompleteRequest = {
      input: q,
      language: 'ko',
      region: 'kr',
      sessionToken,
    };
    if (bias) request.locationBias = { center: bias, radius: 30000 };

    const { suggestions } = await lib.AutocompleteSuggestion.fetchAutocompleteSuggestions(request);
    const out: PlaceSuggestion[] = [];
    for (const s of suggestions) {
      const p = s.placePrediction;
      if (!p) continue;
      out.push({
        placeId: p.placeId,
        primary: p.mainText?.text ?? p.text.text,
        secondary: p.secondaryText?.text ?? '',
        prediction: p,
      });
    }
    return out;
  } catch {
    return [];
  }
}

/** 선택한 연관 검색어 → 좌표/주소 해석 */
export async function resolveSuggestion(s: PlaceSuggestion): Promise<GeoResult | null> {
  try {
    const place = s.prediction.toPlace();
    await place.fetchFields({ fields: ['location', 'formattedAddress', 'displayName'] });
    const loc = place.location;
    if (!loc) return null;
    sessionToken = null; // 선택 완료 → 세션 종료
    return {
      name: place.displayName ?? s.primary,
      address: place.formattedAddress ?? s.secondary,
      lat: loc.lat(),
      lng: loc.lng(),
    };
  } catch {
    return null;
  }
}

/** 검색어(주소/장소) → 좌표 (정지오코딩). 실패 시 null. */
export async function geocodeAddress(apiKey: string, query: string): Promise<GeoResult | null> {
  try {
    await loadGoogleMaps(apiKey);
    if (!window.google) return null;
    const geocoder = new window.google.maps.Geocoder();
    const { results } = await geocoder.geocode({ address: query, language: 'ko', region: 'KR' });
    const best = results?.[0];
    if (!best) return null;
    const loc = best.geometry.location;
    return { name: query, address: best.formatted_address, lat: loc.lat(), lng: loc.lng() };
  } catch {
    return null;
  }
}
