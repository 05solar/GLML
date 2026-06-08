# 맛집 찾기 AI Agent — 백엔드 (ReAct Agent)

OpenAI function calling 기반 **ReAct Agent**입니다.
사용자 요청을 분석(Plan-and-Solve)하고, 선호를 기억(Memory)하며,
맛집 검색·필터·정렬 도구를 직접 호출(Tool Use)한 뒤,
결과를 스스로 검토(Reflection)해 최종 추천을 생성합니다.

> 전체 프로젝트(프론트엔드 포함)·빠른 시작은 [상위 README](../README.md) 참고.

## 1. 폴더 구성

```
backend/
├── main.py              # CLI 진입점
├── server.py            # Flask API 서버 (프론트 연동: POST /api/recommend)
├── agent.py             # ReAct Agent (Plan→ReAct→Reflection) + 오프라인 시뮬레이션
├── tools.py             # 도구 3종 + OpenAI function 스키마 + Google/Kakao 연동/폴백
├── data/
│   └── restaurants.json # 전주 객사 샘플 맛집 데이터셋
├── logs/
│   └── trace_log.txt    # 실행 시 자동 생성되는 도구 호출 Trace
├── requirements.txt
└── .env.example         # 환경변수 템플릿 (복사해서 .env 작성)
```

## 2. 설치 & 실행

```bash
cd backend
python -m venv .venv

# 가상환경 활성화
#   Windows (PowerShell):  .\.venv\Scripts\Activate.ps1
#   macOS/Linux:           source .venv/bin/activate

pip install -r requirements.txt
```

### API 키 설정 (.env)

`.env.example`를 복사해 `.env`를 만들고 **본인 키**를 채웁니다.

```bash
# Windows:  copy .env.example .env
# bash:     cp .env.example .env
```

```env
OPENAI_API_KEY=sk-본인_키
OPENAI_MODEL=gpt-4o-mini        # (선택) 기본값
GOOGLE_PLACES_API_KEY=          # (선택) 있으면 실시간 평점·리뷰·가격
KAKAO_REST_KEY=                 # (선택) 있으면 지역 실재 검증
```

> ⚠️ `.env`는 `.gitignore`에 포함되어 있어 제출물에서 제외됩니다.

### 실행

```bash
python main.py                          # 기본 테스트 프롬프트 실행
python main.py "전주 객사 근처 ..."       # 직접 입력
python main.py --offline                # API 키 없이 오프라인 시뮬레이션
python main.py --no-log                 # trace_log.txt 미저장
```

실행하면 콘솔에 단계별 Trace가 출력되고, `logs/trace_log.txt`에도 저장됩니다.

> **API 키가 없어도** `--offline`(또는 키 미설정 시 자동)으로 동일한 도구 파이프라인을 실행해
> Trace를 생성할 수 있습니다. (휴리스틱으로 조건을 추출하며, 도구 호출 로직은 LLM 모드와 동일)

### 프론트엔드 연동용 API 서버

```bash
python server.py        # http://localhost:8000
```

| 엔드포인트 | 설명 |
| --- | --- |
| `GET /api/health` | 헬스 체크 |
| `POST /api/recommend` | 프론트 조건(JSON) → 자연어 프롬프트 조립 → Agent 실행 → `{ trace, results, final, mode }` 반환 |
| `GET /api/photo` | Google Places 사진 프록시 (API 키를 서버에만 보관) |

프론트엔드(`npm run dev`)는 Vite 프록시로 `/api/*` 요청을 이 서버(8000)로 전달합니다.

## 3. 도구 (Tool Use)

| 도구 | 역할 | 주요 입력 |
| --- | --- | --- |
| `search_restaurants` | 지역·음식·가격으로 후보 검색 | `location`, `category`, `price_level`, `min_review_score`, `limit` |
| `filter_restaurants` | 평점/리뷰/가격/거리 필터 | `min_rating`, `min_review_count`, `max_price_level`, `max_distance_m` |
| `rank_restaurants` | 우선순위 정렬 후 top_k 선정 | `sort_by`, `top_k` |

- 도구는 **stateful** 합니다. `search` 결과를 내부(`last_search`)에 보관하고 `filter`/`rank`가 이를 이어받아,
  LLM이 거대한 후보 리스트를 인자로 주고받지 않아도 자연스럽게 연결됩니다.
- 각 도구는 `{ status, count, results, message }` 형태로 반환하며, `status`로 정상/예외를 구분합니다
  (`ok` / `empty` / `no_region` / `no_base`).
- 가격대 순서: `저렴 < 중간 이하 < 중간 < 비쌈`. "너무 비싸지 않게" = `max_price_level='중간'`(비쌈 제외).
- OpenAI function calling 스키마는 `tools.py`의 `TOOL_SCHEMAS`에 정의되어 있습니다.

## 4. 적용한 Agentic Design Pattern (5개)

수업에서 배운 패턴 중 **5개**를 적용했습니다. (ReAct 필수 포함)

### 4.1 ReAct Pattern *(필수)* — `agent.py` `_run_llm`

`Thought → Action → Observation` 루프를 LLM이 직접 돌립니다.
- 매 턴 LLM은 **왜 그 도구를 부르는지 한국어 Thought**를 먼저 적고(`message.content`), function call로 도구를 호출합니다.
- 도구 실행 결과를 `role:"tool"` 메시지(Observation)로 다시 LLM에 전달하고, 최대 6턴까지 반복합니다.
- 더 호출할 도구가 없으면 LLM이 `Final Answer`를 생성합니다.
- 오프라인 모드(`_run_offline_body`)도 동일한 search→filter→rank 흐름을 스크립트로 재현해 같은 Trace 구조를 만듭니다.

### 4.2 Plan-and-Solve Pattern — `_plan_and_extract`

도구 루프에 들어가기 전에, 요청을 먼저 **구조화된 조건(JSON) + 처리 단계 목록**으로 분해합니다.
- 조건: `region / companion / time / category / max_price_level / review_preference / count`
- 처리 단계: 요청 분석 → 지역 추출 → 조건 파악 → 검색 → 필터링 → 정렬 → 검토·최종 (LLM이 단계를 비워 반환하면 기본 7단계로 보완)

### 4.3 Memory Pattern — `self.memory`

`_plan_and_extract`가 추출한 사용자 선호를 `self.memory`에 저장하고,
이후 ReAct 루프에 시스템 컨텍스트로 주입하고 Reflection 점검의 기준으로 재사용합니다.

### 4.4 Tool Use Pattern — `tools.py`

검색/필터/정렬 도구 3종을 OpenAI function 스키마로 노출하고, Agent가 직접 선택·호출합니다. (3장 참조)
LLM은 맛집을 임의로 지어내지 않고 **도구 결과(Observation)만 근거**로 추천합니다(시스템 프롬프트 규칙 1).

### 4.5 Reflection Pattern — `_reflect_and_recover` + `_reflect_llm`

최종 답변 전에 결과를 **스스로 검토하고 부족하면 보완**합니다.
- `_reflect_and_recover`: 추천 후보가 요청 개수보다 적으면 **기준을 완화(평점 3.5·리뷰 50·거리 2km)** 해 재필터·재정렬.
- `_reflect_llm`: 5개 기준(`region / price / review / fit / count`)을 각각 true/false로 점검하고 최종 추천문을 생성.

## 5. 예외 처리

| 상황 | 처리 |
| --- | --- |
| 존재하지 않는 지역 | `search`가 `status=no_region` 반환 → Agent가 지역 재확인 안내 |
| 검색 결과 없음 | `search`/`filter`가 `status=empty` → Agent가 조건을 완화해 재검색, 그래도 부족하면 Reflection이 추가 완화 |
| 음식 종류 모호 | `category='상관없음'` → 식사류 전체 검색 |
| API 호출 실패 | Google/Kakao 호출 실패를 try/except로 잡아 **샘플 데이터로 폴백**, Observation에 명시 |
| 조건 부족 | 기본값 적용 (필터 평점 4.0·리뷰 100, 정렬 [rating, review_count, distance], 개수 3) |

오류를 그대로 출력하지 않고, **Agent가 Observation으로 에러를 받아 대안을 제시**합니다.
(아래 7장 Trace의 첫 검색 `empty` → 가격 완화 재검색이 그 예시입니다.)

## 6. 외부 API 사용 방법

`search_restaurants`의 데이터 소스 우선순위: **Google Places → Kakao(지역검증)+샘플 → 샘플**.
키가 없으면 자동으로 다음 단계로 폴백하므로, 아무 키가 없어도 샘플로 동작합니다.

### (권장) Google Places API (New) — 평점·리뷰·가격 실데이터

1. [Google Cloud Console](https://console.cloud.google.com) → 프로젝트 생성
2. **"Places API (New)"** 사용 설정 + **결제수단(빌링) 등록** (필수)
3. **API 키** 발급 → `.env`의 `GOOGLE_PLACES_API_KEY=`에 입력
4. `search_restaurants` 동작:
   - 지역명을 Text Search로 지오코딩(겸 실재 검증) → 없으면 `status=no_region`
   - `POST https://places.googleapis.com/v1/places:searchText`
     (헤더 `X-Goog-Api-Key`, `X-Goog-FieldMask`; 바디 `{"textQuery":"전주 객사 맛집","languageCode":"ko","regionCode":"KR"}`)
   - 응답의 `rating` / `userRatingCount` / `priceLevel` 을 사용, 거리(`distance_m`)는 좌표로 계산
   - 사진은 `GET /api/photo`가 서버 키로 받아 스트리밍(키 비노출)
   - 호출 실패(키 오류·빌링 미설정·할당량) 시 **샘플로 자동 폴백**(Observation에 명시)

> Google의 `priceLevel`(INEXPENSIVE/MODERATE/EXPENSIVE…)은 저렴/중간/비쌈으로 매핑합니다.

### (대안) Kakao Local API — 지역/장소 검증

- `KAKAO_REST_KEY=`만 있으면 키워드 검색으로 지역 실재 여부를 검증하고, 평점·리뷰·가격은 샘플로 보강합니다.
- Kakao Local은 평점/리뷰/가격을 제공하지 않으므로 실데이터가 필요하면 Google Places를 쓰세요.

## 7. 테스트 시나리오 & ReAct 도구 호출 Trace

**입력 프롬프트**
```
전주 객사 근처에서 친구랑 저녁 먹기 좋은 맛집을 찾아줘.
너무 비싸지 않고, 리뷰가 좋은 곳 위주로 3곳 추천해줘.
```

**실제 실행 Trace** (Google Places 실시간 데이터 · 전체 로그: [`logs/trace_log.txt`](logs/trace_log.txt))

```
────────────────────────────────────────────────────────────
[User Input]
전주 객사 근처에서 친구랑 저녁 먹기 좋은 맛집을 찾아줘. 너무 비싸지 않고, 리뷰가 좋은 곳 위주로 3곳 추천해줘.
────────────────────────────────────────────────────────────
[Plan-and-Solve] 추출한 조건
   · region: 전주 객사
   · companion: 친구와 저녁
   · time: 저녁
   · category: 상관없음
   · max_price_level: 중간 이하
   · review_preference: 리뷰가 좋은 곳 위주
   · count: 3
[Plan] 처리 단계
   1. 사용자 요청 분석
   2. 지역 정보 추출
   3. 음식 목적 및 조건 파악
   4. 맛집 후보 검색(search_restaurants)
   5. 평점·리뷰·가격 기준 필터링(filter_restaurants)
   6. 추천 우선순위 정렬(rank_restaurants)
   7. 결과 검토(Reflection) 후 최종 답변 생성
────────────────────────────────────────────────────────────
🧠 Thought   전주 객사 근처에서 친구와 저녁을 먹기 좋은 맛집을 찾기 위해 먼저 맛집 검색을 진행하겠습니다.
             음식 종류는 '상관없음'으로 설정하고, 가격대는 '중간 이하'로 설정하겠습니다.
🛠  Action    search_restaurants
   Action Input: {"location": "전주 객사", "category": "상관없음", "price_level": "중간 이하", "min_review_score": 4.0, "limit": 10}
👁  Observation [search_restaurants] status=empty · 조건에 맞는 후보가 없습니다. 음식 종류나 가격대를 완화해 다시 검색하세요.
                                                          ↑ 예외(검색 0건)를 Observation으로 인지
🧠 Thought   조건에 맞는 맛집이 없다는 결과가 나왔습니다. 가격대를 완화하여 다시 검색해보겠습니다.
                                                          ↑ Agent가 에러를 받고 스스로 대안 제시
🛠  Action    search_restaurants
   Action Input: {"location": "전주 객사", "category": "상관없음", "price_level": "상관없음", "min_review_score": 4.0, "limit": 10}
👁  Observation [search_restaurants] status=ok · Google Places API에서 실시간 데이터를 가져왔습니다.
      - 화녕 객리단길본점 (음식점) ★4.9 · 리뷰 70 · 중간 · 574m
      - 오일내 객사점 (한식당) ★4.8 · 리뷰 85 · 중간 · 82m
      - 초로초로 (일본 음식점) ★5.0 · 리뷰 68 · 중간 · 470m
      - 몽유도 (숯불구이/바베큐전문점) ★4.7 · 리뷰 105 · 중간 · 451m
      … (후보 10곳)
🛠  Action    filter_restaurants
   Action Input: {"min_rating": 4.0, "min_review_count": 100, "max_price_level": "중간", "max_distance_m": 1000}
👁  Observation [filter_restaurants] status=ok · 조건에 맞는 후보 1개를 선별했습니다.
      - 몽유도 (숯불구이/바베큐전문점) ★4.7 · 리뷰 105 · 중간 · 451m
🛠  Action    rank_restaurants
   Action Input: {"sort_by": ["rating", "review_count", "distance"], "top_k": 3}
👁  Observation [rank_restaurants] status=ok · 상위 1곳을 우선순위에 따라 정렬했습니다.
🔁 보완   추천 후보가 1곳뿐 → 기준을 완화해 다시 필터링합니다.        ← Reflection 보완(완화 재검색)
👁  Observation [filter_restaurants] status=ok · 조건에 맞는 후보 5개를 선별했습니다.
👁  Observation [rank_restaurants] status=ok · 상위 3곳을 우선순위에 따라 정렬했습니다.
      - 초로초로 (일본 음식점) ★5.0 · 리뷰 68 · 중간 · 470m
      - 화녕 객리단길본점 (음식점) ★4.9 · 리뷰 70 · 중간 · 574m
      - 오일내 객사점 (한식당) ★4.8 · 리뷰 85 · 중간 · 82m
────────────────────────────────────────────────────────────
🔍 Reflection  만족여부: 예   (region ✓ · price ✓ · review ✓ · fit ✓ · count ✓)
────────────────────────────────────────────────────────────
[Final Answer]
1. 초로초로 (일본 음식점) - 평점 5.0, 리뷰 68, ₩₩, 470m. 높은 평점과 많은 리뷰로 신뢰할 수 있는 맛집입니다.
2. 화녕 객리단길본점 (음식점) - 평점 4.9, 리뷰 70, ₩₩, 574m. 친구와 저녁에 적합한 분위기와 맛을 제공합니다.
3. 오일내 객사점 (한식당) - 평점 4.8, 리뷰 85, ₩₩, 82m. 가까운 거리와 좋은 리뷰로 추천할 만한 곳입니다.
────────────────────────────────────────────────────────────
```

이 로그에서 확인할 수 있는 것:
- **Agent의 판단 과정** — 각 단계의 🧠 Thought
- **호출한 도구 이름 / 입력값 / 실행 결과** — 🛠 Action / Action Input / 👁 Observation
- **예외 처리** — 첫 검색 `empty` → 가격 완화 재검색 → Reflection 추가 완화
- **최종 추천 결과** — Final Answer (이름·종류·평점·리뷰·가격·거리·추천 이유)

> Trace는 비결정적(LLM·실시간 데이터)이라 실행 시점에 따라 후보·문구가 달라질 수 있습니다.
> 위 로그는 `logs/trace_log.txt`에 저장된 실제 실행 결과입니다.
