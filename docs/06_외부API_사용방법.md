# 6. 외부 API 사용 방법

이 프로젝트는 아래 외부 API를 사용합니다. **키는 모두 `.env`에 보관**하며 git/제출물에서 제외됩니다.
맛집 데이터는 우선순위에 따라 폴백하므로, **키가 없어도 샘플 데이터로 동작**합니다.

> **맛집 데이터 우선순위**: Google Places (New) → Kakao Local(지역 검증)+샘플 → 샘플 데이터셋

| API | 용도 | 키 위치 | 필수 여부 |
| --- | --- | --- | --- |
| OpenAI | LLM (ReAct 추론 + 도구 호출) | `backend/.env` `OPENAI_API_KEY` | 사실상 필수 (없으면 오프라인) |
| Google Places API (New) | 실시간 평점·리뷰·가격 | `backend/.env` `GOOGLE_PLACES_API_KEY` | 선택 (권장) |
| Kakao Local | 지역/장소 실재 검증 | `backend/.env` `KAKAO_REST_KEY` | 선택 |
| Google Maps JavaScript | 위치 화면 실제 지도(프론트) | 루트 `.env` `VITE_GOOGLE_MAPS_API_KEY` | 선택 |

---

## 6.1 OpenAI — LLM (필수)

1. [OpenAI Platform](https://platform.openai.com/api-keys)에서 **API 키** 발급
2. `backend/.env`에 입력
   ```env
   OPENAI_API_KEY=sk-본인_키
   OPENAI_MODEL=gpt-4o-mini        # (선택) 기본값
   ```
3. `agent.py`가 이 키로 ReAct 추론 + function calling(도구 호출)을 수행합니다.
4. 키가 없으면 자동으로 **오프라인 시뮬레이션**(휴리스틱)으로 동일 파이프라인을 실행합니다.

## 6.2 Google Places API (New) — 맛집 실데이터 (권장)

평점·리뷰 수·가격대를 **실제로** 제공하는 공식 API입니다. ([05_ReAct_도구호출_Trace.md](05_ReAct_도구호출_Trace.md)가 이 데이터로 동작)

1. [Google Cloud Console](https://console.cloud.google.com) → 프로젝트 생성
2. **"Places API (New)"** 사용 설정 + **결제수단(빌링) 등록** (필수)
3. **API 키** 발급 → `backend/.env`에 입력
   ```env
   GOOGLE_PLACES_API_KEY=발급받은_API_키
   ```
4. 동작 방식 (`tools.py`):
   - 지역명을 Text Search로 **지오코딩(겸 실재 검증)** → 없으면 `status=no_region`
   - `POST https://places.googleapis.com/v1/places:searchText`
     - 헤더: `X-Goog-Api-Key`, `X-Goog-FieldMask`
     - 바디: `{"textQuery":"전주 객사 맛집","languageCode":"ko","regionCode":"KR","maxResultCount":20}`
   - 응답의 `rating` / `userRatingCount` / `priceLevel` 사용, 거리(`distance_m`)는 좌표로 계산
   - 사진은 `GET /api/photo`가 서버 키로 받아 스트리밍(키 비노출)
   - 호출 실패(키·빌링·할당량) 시 **샘플 데이터셋으로 자동 폴백**(Observation에 명시)

> `priceLevel`(INEXPENSIVE/MODERATE/EXPENSIVE…) → 저렴/중간/비쌈으로 매핑.

## 6.3 Kakao Local — 지역 검증 (대안)

1. [Kakao Developers](https://developers.kakao.com)에서 앱 생성 후 **REST API 키** 발급
2. `backend/.env`에 입력
   ```env
   KAKAO_REST_KEY=발급받은_REST_키
   ```
3. 동작: `GET https://dapi.kakao.com/v2/local/search/keyword.json` (헤더 `Authorization: KakaoAK {키}`)로
   지역 실재 여부를 검증합니다.
4. 단, Kakao Local은 **평점·리뷰·가격을 제공하지 않아** 상세 속성은 샘플로 보강됩니다.
   (실데이터가 필요하면 Google Places 사용)

## 6.4 Google Maps JavaScript API — 지도 (프론트, 선택)

위치 선택 화면에 실제 Google 지도를 띄웁니다.

1. [Google Cloud Console](https://console.cloud.google.com)에서 **"Maps JavaScript API"** 사용 설정
   (맛집 데이터용 "Places API (New)"와는 **별개**로 켜야 함)
2. **루트 `.env`** 에 입력 후 `npm run dev` **재시작**
   ```env
   VITE_GOOGLE_MAPS_API_KEY=발급받은_키
   ```
3. 키가 없거나 인증 실패 시 → 장식용 지도(placeholder)로 자동 폴백.

> ⚠️ **보안**: 이 키는 브라우저에 노출됩니다. 가급적 **'Maps JavaScript API'만 허용 + HTTP 리퍼러 제한**을 건 별도 키를 사용하세요.

---

## 키가 전혀 없을 때

- 백엔드: `python main.py --offline` → 휴리스틱으로 조건 추출 + **샘플 데이터셋**으로 동일한 도구 파이프라인 실행
- 즉, **외부 API 키 없이도** ReAct Trace와 추천 결과를 생성할 수 있습니다. (샘플: [`../backend/data/restaurants.json`](../backend/data/restaurants.json))
