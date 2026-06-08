# 4. 사용한 Agentic Design Pattern 설명

수업에서 배운 패턴 중 **5개**를 적용했습니다. (ReAct 필수 포함)
구현은 모두 [`../backend/agent.py`](../backend/agent.py)와 [`../backend/tools.py`](../backend/tools.py)에 있습니다.

| 패턴 | 한 줄 요약 | 구현 위치 |
| --- | --- | --- |
| **ReAct** *(필수)* | Thought→Action→Observation 루프로 도구를 호출 | `agent.py` `_run_llm` |
| **Plan-and-Solve** | 요청을 조건(JSON)+처리 단계로 분해 | `agent.py` `_plan_and_extract` |
| **Memory** | 추출한 사용자 선호를 저장·재사용 | `agent.py` `self.memory` |
| **Tool Use** | 검색/필터/정렬 도구를 직접 호출 | `tools.py` 3종 + `TOOL_SCHEMAS` |
| **Reflection** | 결과를 자체 검토하고 부족하면 보완 | `agent.py` `_reflect_and_recover`, `_reflect_llm` |

---

## 4.1 ReAct Pattern *(필수)*

`Thought → Action → Observation` 루프를 LLM이 직접 돌립니다.

- 매 턴 LLM은 **왜 그 도구를 부르는지 한국어 Thought**를 먼저 적고(`message.content`), function call로 도구를 호출합니다.
- 도구 실행 결과를 `role:"tool"` 메시지(Observation)로 다시 LLM에 전달하고, 최대 6턴까지 반복합니다.
- 더 호출할 도구가 없으면 LLM이 `Final Answer`를 생성합니다.

```
Thought → Action(도구 호출) → Observation(결과) → … 반복 … → Final Answer
```

> 시스템 프롬프트 규칙: "절대 맛집을 임의로 지어내지 말고, 반드시 도구 실행 결과(Observation)만 근거로 사용한다."

## 4.2 Plan-and-Solve Pattern

도구 루프에 들어가기 전, 요청을 먼저 **구조화된 조건 + 처리 단계**로 분해합니다. (`_plan_and_extract`)

- **조건(JSON)**: `region / companion / time / category / max_price_level / review_preference / count`
- **처리 단계**: 요청 분석 → 지역 추출 → 조건 파악 → 검색 → 필터링 → 정렬 → 검토·최종

> 예) "전주 객사 근처 친구랑 저녁..." → `region=전주 객사`, `companion=친구와 저녁`, `max_price_level=중간 이하`, `count=3`

## 4.3 Memory Pattern

`_plan_and_extract`가 추출한 사용자 선호를 `self.memory`에 저장하고,
이후 ReAct 루프에 컨텍스트로 주입하고 Reflection 점검 기준으로 재사용합니다.
(지역·동행·가격대·리뷰 선호·추천 개수를 "기억"하여 도구 입력값과 최종 검토에 일관되게 반영)

## 4.4 Tool Use Pattern

Agent가 직접 호출하는 도구 3종을 OpenAI function 스키마로 노출합니다.

| 도구 | 역할 | 주요 입력 |
| --- | --- | --- |
| `search_restaurants` | 지역·음식·가격으로 후보 검색 | `location`, `category`, `price_level`, `min_review_score`, `limit` |
| `filter_restaurants` | 평점/리뷰/가격/거리 필터 | `min_rating`, `min_review_count`, `max_price_level`, `max_distance_m` |
| `rank_restaurants` | 우선순위 정렬 후 top_k 선정 | `sort_by`, `top_k` |

- 도구는 **stateful** 합니다. `search` 결과를 내부(`last_search`)에 보관하고 `filter`/`rank`가 이어받아,
  LLM이 거대한 후보 리스트를 인자로 주고받지 않아도 자연스럽게 연결됩니다.
- 각 도구는 `{ status, count, results, message }` 형태로 반환하며 `status`로 정상/예외를 구분합니다.

## 4.5 Reflection Pattern

최종 답변 전, 결과를 **스스로 검토하고 부족하면 보완**합니다.

- **`_reflect_and_recover`**: 추천 후보가 요청 개수보다 적으면 **기준을 완화(평점 3.5·리뷰 50·거리 2km)** 해 재필터·재정렬.
- **`_reflect_llm`**: 5개 기준을 각각 true/false로 점검하고 최종 추천문을 생성.
  - 점검 항목: ① region(지역 일치) ② price(과하게 비싸지 않음) ③ review(평점·리뷰 충분) ④ fit(목적/동행 적합) ⑤ count(개수 충족)

> 실제 실행에서 후보가 1곳뿐이자 Reflection이 기준을 완화해 3곳을 확보한 사례 →
> [05_ReAct_도구호출_Trace.md](05_ReAct_도구호출_Trace.md)

---

> 프론트엔드도 같은 흐름을 구현합니다: `src/App.tsx`의 단계 머신이 Plan-and-Solve/Memory를,
> `src/pages/AgentTracePage.tsx`가 ReAct Trace 시각화를 담당합니다.
