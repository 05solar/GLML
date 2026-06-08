# GLML — 맛집 찾기 AI Agent

> **좋아하는 것만 먹고싶으니까, GLML 갈래말래 **
> Agentic Design Pattern 기반 맛집 추천 AI Agent

![GLML 화면 — 시작 · 위치 선택 · 동행 · 시간대](docs/preview-1.png)

![GLML 화면 — 음식 · 가격 · 우선순위 · AI 추천 결과](docs/preview-2.png)

사용자의 조건(지역·동행·시간대·음식·가격·우선순위)을 분석한 뒤,
**맛집 검색 도구를 직접 호출**하고 그 결과를 **검토(Reflection)** 하여
조건에 맞는 맛집을 추천하는 **Agentic AI** 시스템입니다.

단순히 LLM에게 "맛집 추천해줘"라고 묻는 것이 아니라,
Agent가 **판단(Thought) → 도구 호출(Action) → 결과 확인(Observation) → 검토 → 최종 추천(Final Answer)**
의 흐름으로 동작합니다. 백엔드 ReAct Agent가 이 과정을 **실제로 실행**하고, 프론트엔드가 그 과정을 화면에 시각화합니다.

관련 문서는 docs 폴더에 상세히 정리되어있습니다. 

---

## 🚀 빠른 시작 (Quick Start)

> GitHub에서 클론한 뒤 아래 순서대로 실행하면 됩니다. **Python 3.10+** 와 **Node.js 18+** 가 필요합니다.

### 1. 저장소 클론

```bash
git clone <이-저장소-주소>
cd GLML
```

### 2. 백엔드 준비 (Python / ReAct Agent)

```bash
cd backend
python -m venv .venv

# 가상환경 활성화
#   Windows (PowerShell):  .\.venv\Scripts\Activate.ps1
#   macOS / Linux:         source .venv/bin/activate

pip install -r requirements.txt

# 환경변수 파일 생성 후 OPENAI_API_KEY 입력
#   Windows:  copy .env.example .env
#   macOS/Linux:  cp .env.example .env
cd ..
```

`backend/.env`를 열어 키를 채웁니다.

```env
OPENAI_API_KEY=sk-본인_키          # 필수 (없으면 오프라인 모드로 동작)
OPENAI_MODEL=gpt-4o-mini           # 선택 (기본값)
GOOGLE_PLACES_API_KEY=             # 선택 (있으면 실시간 평점·리뷰 데이터)
KAKAO_REST_KEY=                    # 선택 (지역 검증용)
```

### 3. 프론트엔드 준비 (React / UI)

```bash
npm install

# (선택) 지도를 실제로 띄우려면 루트 .env 에 Google Maps 키 입력
#   Windows:  copy .env.example .env   /   macOS·Linux:  cp .env.example .env
```

### 4. 실행 — 두 서버 한 번에

```bash
npm run dev
```

- 프론트엔드(**Vite, :5173**)와 백엔드(**Flask, :8000**)가 **동시에** 실행됩니다. (`concurrently`)
- 브라우저에서 **http://localhost:5173** 접속 → 조건을 고르면 실제 ReAct Agent가 추천을 생성합니다.
- 종료: 터미널에서 **`Ctrl+C`** (둘 다 종료). 안 꺼지면 **`npm run stop`**.
- Windows는 `start.bat`(실행) / `stop.bat`(종료) 더블클릭으로도 됩니다.

> **참고**: 통합 실행 명령 `npm run dev`의 백엔드 경로(`backend\.venv\Scripts\python`)는 Windows 기준입니다.
> macOS/Linux에서는 백엔드(`python server.py`)와 프론트(`npm run dev:web`)를 터미널 두 개로 따로 실행하세요.

---

## ✨ 주요 기능

- **대화형 조건 수집** — 위치 · 동행 · 시간대 · 음식 종류 · 가격대 · 우선순위를 단계별로 선택
- **AI Agent 추천** — 선택한 조건을 분석해 맛집을 검색·필터·정렬하고, 추천 이유와 함께 제시
- **실시간 맛집 데이터** — Google Places 기반 평점·리뷰·가격·거리 (키가 없으면 샘플 데이터로 동작)
- **추천 과정 시각화** — Agent가 판단하고 도구를 호출하는 과정을 화면에서 단계별로 확인
- **지도 위치 선택** — Google 지도에서 위치를 직접 지정

## 🧠 동작 방식

```
사용자 조건 → 요청 분석(조건 추출) → [검색 → 필터 → 정렬] 도구 호출 → 결과 검토·보완 → 추천 결과
```

- 백엔드 Agent(`backend/agent.py`)가 OpenAI function calling으로 맛집 도구를 직접 호출하며 추천을 생성합니다.
- 맛집 검색·필터·정렬 도구는 `backend/tools.py`에 구현되어 있습니다.
- 프론트엔드(`src/`)는 조건 수집 UI와 추천 과정·결과 화면을 담당합니다.

## 🛠 기술 스택

| 영역 | 사용 기술 |
| --- | --- |
| 프론트엔드 | React 18 · TypeScript · Vite 5 |
| 백엔드 | Python · Flask · OpenAI (gpt-4o-mini) |
| 외부 연동 | Google Places API · Google Maps JavaScript API · Kakao Local |

## 📁 프로젝트 구조

```
GLML/
├── backend/                  # AI Agent (Python)
│   ├── main.py               # CLI 실행 진입점
│   ├── server.py             # API 서버 (POST /api/recommend)
│   ├── agent.py              # Agent 실행 로직 (검색 → 필터 → 정렬 → 검토)
│   ├── tools.py              # 맛집 검색/필터/정렬 도구
│   └── data/restaurants.json # 샘플 맛집 데이터
├── src/                      # 프론트엔드 (React)
│   ├── App.tsx               # 단계별 조건 수집 흐름
│   ├── pages/                # 시작 · 위치 선택 · 추천 과정 · 결과 화면
│   ├── components/           # 공용 UI 컴포넌트
│   └── data/                 # 옵션 · 맛집 · 트레이스 데이터
├── docs/                     # 상세 문서
├── package.json              # 프론트 스크립트 / 의존성
└── vite.config.ts            # 개발 서버 + /api 프록시
```

## 📜 사용 가능한 명령어

| 명령 | 설명 |
| --- | --- |
| `npm run dev` | 프론트 + 백엔드 동시 실행 |
| `npm run dev:web` | 프론트(Vite)만 실행 |
| `npm run stop` | 5173 / 8000 포트 서버 종료 |
| `npm run build` | 프로덕션 빌드 |
| `npm run preview` | 빌드 결과 미리보기 |



