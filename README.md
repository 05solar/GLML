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

`backend/.env`를 열어 키를 채웁니다. (자세한 키 발급법은 [12. 외부 API 사용 방법](#12-외부-api-사용-방법))

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
> macOS/Linux에서는 터미널 두 개로 따로 실행하세요 → [11. 실행 방법](#11-실행-방법) 참고.



