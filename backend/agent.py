"""
맛집 찾기 ReAct Agent

적용한 Agentic Design Pattern
  - Plan-and-Solve : 요청을 조건 추출 + 단계 계획으로 분해 (plan_and_extract)
  - Memory         : 추출한 사용자 선호(지역/동행/가격/리뷰/개수)를 보관해 도구·검토에 재사용
  - ReAct          : Thought → Action → Observation 루프 (run 내부 tool-call 루프)
  - Tool Use       : search/filter/rank 도구를 LLM이 직접 호출
  - Reflection     : 결과가 조건을 만족하는지 자체 검토 후 부족하면 보완(완화 재검색)

OpenAI function calling 으로 도구를 호출한다. OPENAI_API_KEY 가 없으면
오프라인 시뮬레이션(run_offline)으로 동일한 도구 파이프라인을 실행해 Trace를 생성한다.
"""

from __future__ import annotations

import json
import os
import re
from dataclasses import dataclass, field
from typing import Any

from tools import RestaurantTools, TOOL_SCHEMAS, get_tool_dispatch

try:
    from openai import OpenAI
except Exception:  # pragma: no cover
    OpenAI = None  # type: ignore


# ====================================================================== #
# Trace : 단계별 로그 수집기
# ====================================================================== #
@dataclass
class Trace:
    lines: list[str] = field(default_factory=list)
    events: list[dict[str, Any]] = field(default_factory=list)  # 프론트엔드용 구조화 이벤트

    def _add(self, text: str) -> None:
        self.lines.append(text)
        print(text)

    def rule(self) -> None:
        self._add("─" * 60)

    def user(self, text: str) -> None:
        self.rule()
        self._add(f"[User Input]\n{text}")
        self.rule()
        self.events.append({"type": "user", "text": text})

    def plan(self, conditions: dict[str, Any], steps: list[str]) -> None:
        self._add("[Plan-and-Solve] 추출한 조건")
        for k, v in conditions.items():
            self._add(f"   · {k}: {v}")
        self._add("[Plan] 처리 단계")
        for i, s in enumerate(steps, 1):
            self._add(f"   {i}. {s}")
        self.rule()
        self.events.append({"type": "plan", "conditions": conditions, "steps": steps})

    def thought(self, text: str) -> None:
        if text and text.strip():
            self._add(f"🧠 Thought   {text.strip()}")
            self.events.append({"type": "thought", "text": text.strip()})

    def action(self, name: str, args: dict[str, Any]) -> None:
        self._add(f"🛠  Action    {name}")
        self._add(f"   Action Input: {json.dumps(args, ensure_ascii=False)}")
        self.events.append({"type": "action", "name": name, "args": args})

    def observation(self, name: str, result: dict[str, Any]) -> None:
        status = result.get("status", "")
        msg = result.get("message", "")
        self._add(f"👁  Observation [{name}] status={status} · {msg}")
        for r in result.get("results", [])[:10]:
            self._add(
                f"      - {r['name']} ({r['category']}) "
                f"★{r['rating']} · 리뷰 {r['review_count']} · {r['price_level']} · {r['distance_m']}m"
            )
        self.events.append(
            {
                "type": "observation",
                "name": name,
                "status": status,
                "message": msg,
                "results": result.get("results", []),
            }
        )

    def reflection(self, ref: dict[str, Any]) -> None:
        self.rule()
        self._add(f"🔍 Reflection  만족여부: {'예' if ref.get('satisfied') else '아니오'}")
        for k, v in ref.get("checks", {}).items():
            self._add(f"   {'✓' if v else '✗'} {k}")
        if ref.get("comment"):
            self._add(f"   비고: {ref['comment']}")
        self.events.append(
            {
                "type": "reflection",
                "satisfied": bool(ref.get("satisfied")),
                "checks": ref.get("checks", {}),
                "comment": ref.get("comment", ""),
            }
        )

    def final(self, text: str) -> None:
        self.rule()
        self._add(f"[Final Answer]\n{text}")
        self.rule()
        self.events.append({"type": "final", "text": text})

    def as_text(self) -> str:
        return "\n".join(self.lines)


# ====================================================================== #
# 프롬프트
# ====================================================================== #
SYSTEM_PROMPT = """당신은 '맛집 찾기 AI Agent'입니다. ReAct 방식으로 동작합니다.

규칙:
1. 절대 맛집을 임의로 지어내지 마세요. 반드시 제공된 도구의 실행 결과(Observation)만 근거로 사용합니다.
2. 도구를 호출하기 직전에는, 왜 그 도구를 호출하는지 1~2문장의 한국어 'Thought'를 message content에 먼저 적습니다.
3. 추천 흐름은 다음 순서를 따릅니다: search_restaurants → filter_restaurants → rank_restaurants.
4. 가격대 순서는 저렴 < 중간 이하 < 중간 < 비쌈 입니다. '너무 비싸지 않게'는 보통 max_price_level='중간'(비쌈만 제외)을 의미합니다.
5. 정보가 부족하면 합리적 기본값을 사용합니다(필터 min_rating=4.0, min_review_count=100 / 정렬 [rating, review_count, distance]).
6. 음식 종류가 모호하면 category='상관없음'으로 검색합니다.
7. Observation의 status가 'no_region'이면 지역을 다시 확인하도록 안내하고, 'empty'이면 기준을 완화해 다시 검색하며, 'api_fallback'/안내문이 있으면 샘플 데이터 사용 사실을 밝힙니다.
8. 도구 호출이 끝나면, 요청한 개수만큼 각 맛집의 [이름 · 종류 · 평점 · 리뷰 수 · 가격대 · 거리]와 '추천 이유'를 한국어로 정리해 최종 답변을 작성합니다."""

PLAN_PROMPT = """다음 사용자 요청을 분석해 JSON으로만 응답하세요. 코드블록 없이 순수 JSON만 출력합니다.
{
  "conditions": {
    "region": "지역 (없으면 '미지정')",
    "companion": "동행자/목적 (예: 친구와 저녁)",
    "time": "시간대 (아침/점심/저녁/카페 등, 없으면 '미지정')",
    "category": "음식 종류 (한식/일식/양식/중식/카페/디저트/상관없음)",
    "max_price_level": "저렴|중간 이하|중간|비쌈|상관없음",
    "review_preference": "리뷰/평점 선호 설명",
    "count": 추천개수(정수, 미지정 시 3)
  },
  "plan": ["단계1", "단계2", "..."]
}
요청: """

REFLECT_PROMPT = """아래는 맛집 추천 Agent의 결과입니다. 사용자 조건을 모두 만족하는지 점검하고 JSON으로만 응답하세요.
점검 항목(checks)은 각각 true/false 로 표기합니다: region(지역 일치), price(과하게 비싸지 않음), review(평점/리뷰 충분), fit(목적/동행에 적합), count(요청 개수 충족).
{
  "satisfied": true/false,
  "checks": {"region": bool, "price": bool, "review": bool, "fit": bool, "count": bool},
  "comment": "부족한 점이나 보완 의견(없으면 빈 문자열)",
  "final_answer": "사용자에게 보여줄 한국어 최종 추천문 (각 맛집의 이름/종류/평점/리뷰수/가격대/거리 + 추천 이유 포함)"
}
"""


# ====================================================================== #
# Agent
# ====================================================================== #
class RestaurantAgent:
    def __init__(self, model: str | None = None, kakao_key: str | None = None) -> None:
        self.model = model or os.getenv("OPENAI_MODEL", "gpt-4o-mini")
        self.tools = RestaurantTools(kakao_key=kakao_key)
        self.dispatch = get_tool_dispatch(self.tools)
        self.memory: dict[str, Any] = {}
        api_key = os.getenv("OPENAI_API_KEY")
        self.client = OpenAI(api_key=api_key) if (api_key and OpenAI is not None) else None

    # ---- 외부 진입점 ------------------------------------------------- #
    def run(self, user_input: str) -> tuple[str, Trace]:
        if self.client is None:
            return self.run_offline(user_input)
        try:
            return self._run_llm(user_input)
        except Exception as e:  # API 오류 → 오프라인으로 폴백
            trace = Trace()
            trace.user(user_input)
            trace._add(f"⚠️  OpenAI 호출 실패({e}). 오프라인 시뮬레이션으로 전환합니다.")
            return self._run_offline_body(user_input, trace)

    # ---- LLM(ReAct) 실행 -------------------------------------------- #
    def _run_llm(self, user_input: str) -> tuple[str, Trace]:
        trace = Trace()
        trace.user(user_input)

        # 1) Plan-and-Solve + Memory : 조건 추출
        plan = self._plan_and_extract(user_input)
        self.memory = plan.get("conditions", {})
        trace.plan(self.memory, plan.get("plan", []))

        # 2) ReAct 루프 (Tool Use)
        messages: list[dict[str, Any]] = [
            {"role": "system", "content": SYSTEM_PROMPT},
            {
                "role": "user",
                "content": f"사용자 요청: {user_input}\n\n추출된 조건(JSON): {json.dumps(self.memory, ensure_ascii=False)}",
            },
        ]
        draft = ""
        for _ in range(6):
            resp = self.client.chat.completions.create(  # type: ignore[union-attr]
                model=self.model,
                messages=messages,
                tools=TOOL_SCHEMAS,
                tool_choice="auto",
                temperature=0.2,
            )
            msg = resp.choices[0].message
            trace.thought(msg.content or "")
            messages.append(msg.model_dump(exclude_none=True))

            if not msg.tool_calls:
                draft = msg.content or ""
                break

            for tc in msg.tool_calls:
                name = tc.function.name
                try:
                    args = json.loads(tc.function.arguments or "{}")
                except json.JSONDecodeError:
                    args = {}
                trace.action(name, args)
                result = self.dispatch[name](**args) if name in self.dispatch else {
                    "status": "unknown_tool",
                    "message": f"알 수 없는 도구: {name}",
                }
                trace.observation(name, result)
                messages.append(
                    {
                        "role": "tool",
                        "tool_call_id": tc.id,
                        "name": name,
                        "content": json.dumps(result, ensure_ascii=False),
                    }
                )

        # 3) Reflection : 결과 자체 검토 + 부족 시 보완
        self._reflect_and_recover(trace)
        ref = self._reflect_llm(user_input)
        trace.reflection(ref)
        final = ref.get("final_answer") or draft or self._format_results()
        trace.final(final)
        return final, trace

    def _plan_and_extract(self, user_input: str) -> dict[str, Any]:
        try:
            resp = self.client.chat.completions.create(  # type: ignore[union-attr]
                model=self.model,
                messages=[{"role": "user", "content": PLAN_PROMPT + user_input}],
                response_format={"type": "json_object"},
                temperature=0,
            )
            plan = json.loads(resp.choices[0].message.content or "{}")
        except Exception:
            return {"conditions": _heuristic_conditions(user_input), "plan": _DEFAULT_PLAN}
        # LLM이 단계 목록을 비워서 반환하면 기본 처리 단계로 보완
        if not plan.get("plan"):
            plan["plan"] = _DEFAULT_PLAN
        return plan

    def _reflect_llm(self, user_input: str) -> dict[str, Any]:
        payload = {
            "user_request": user_input,
            "conditions": self.memory,
            "ranked_results": self.tools.last_ranked,
        }
        try:
            resp = self.client.chat.completions.create(  # type: ignore[union-attr]
                model=self.model,
                messages=[
                    {"role": "user", "content": REFLECT_PROMPT + json.dumps(payload, ensure_ascii=False)}
                ],
                response_format={"type": "json_object"},
                temperature=0,
            )
            return json.loads(resp.choices[0].message.content or "{}")
        except Exception:
            return _heuristic_reflection(self.memory, self.tools.last_ranked, self._format_results())

    # ---- Reflection 기반 보완(완화 재검색) --------------------------- #
    def _reflect_and_recover(self, trace: Trace) -> None:
        want = int(self.memory.get("count", 3) or 3)
        if len(self.tools.last_ranked) >= want:
            return
        if not self.tools.last_search:
            return
        trace._add(f"🔁 보완   추천 후보가 {len(self.tools.last_ranked)}곳뿐 → 기준을 완화해 다시 필터링합니다.")
        loosened = self.tools.filter_restaurants(
            min_rating=3.5, min_review_count=50, max_price_level="중간", max_distance_m=2000
        )
        trace.observation("filter_restaurants", loosened)
        ranked = self.tools.rank_restaurants(top_k=want)
        trace.observation("rank_restaurants", ranked)

    # ================================================================== #
    # 오프라인 시뮬레이션 (API 키가 없을 때)
    # ================================================================== #
    def run_offline(self, user_input: str) -> tuple[str, Trace]:
        trace = Trace()
        trace.user(user_input)
        trace._add("ℹ️  OPENAI_API_KEY 가 없어 오프라인 시뮬레이션으로 실행합니다. (도구 파이프라인은 동일)")
        return self._run_offline_body(user_input, trace)

    def _run_offline_body(self, user_input: str, trace: Trace) -> tuple[str, Trace]:
        cond = _heuristic_conditions(user_input)
        self.memory = cond
        trace.plan(cond, _DEFAULT_PLAN)

        # search
        trace.thought(
            f"'{cond['region']}' 주변에서 {cond['companion']} 목적에 맞는 후보를 검색해야 한다."
        )
        category = cond["category"] if cond["category"] != "상관없음" else (cond["time"] or "상관없음")
        args = {
            "location": cond["region"],
            "category": category,
            "price_level": cond["max_price_level"],
            "limit": 10,
        }
        trace.action("search_restaurants", args)
        res = self.tools.search_restaurants(**args)
        trace.observation("search_restaurants", res)

        if res["status"] == "no_region":
            final = res["message"]
            trace.final(final)
            return final, trace

        # filter
        trace.thought("가격이 비싸거나 평점·리뷰가 부족한 곳은 제외한다.")
        f_args = {
            "min_rating": 4.0,
            "min_review_count": 100,
            "max_price_level": cond["max_price_level"] if cond["max_price_level"] != "상관없음" else "중간",
            "max_distance_m": 800,
        }
        trace.action("filter_restaurants", f_args)
        fres = self.tools.filter_restaurants(**f_args)
        trace.observation("filter_restaurants", fres)

        # rank
        trace.thought("평점·리뷰 수·거리 기준으로 상위 후보를 정렬한다.")
        sort_by = _sort_by_from_pref(cond.get("review_preference", ""))
        r_args = {"sort_by": sort_by, "top_k": int(cond.get("count", 3))}
        trace.action("rank_restaurants", r_args)
        rres = self.tools.rank_restaurants(**r_args)
        trace.observation("rank_restaurants", rres)

        # reflection + 보완
        self._reflect_and_recover(trace)
        ref = _heuristic_reflection(cond, self.tools.last_ranked, self._format_results())
        trace.reflection(ref)
        final = ref["final_answer"]
        trace.final(final)
        return final, trace

    # ---- 결과 포맷 --------------------------------------------------- #
    def _format_results(self) -> str:
        items = self.tools.last_ranked
        region = self.memory.get("region", "")
        if not items:
            return "조건에 맞는 맛집을 찾지 못했습니다. 조건을 완화해 다시 시도해 주세요."
        lines = [f"{region} 근처에서 조건에 맞는 맛집 {len(items)}곳을 추천합니다.\n"]
        for i, r in enumerate(items, 1):
            lines.append(
                f"{i}. {r['name']} ({r['category']})\n"
                f"   평점 {r['rating']} · 리뷰 {r['review_count']}개 · {r['price_level']} · 객사 기준 약 {r['distance_m']}m\n"
                f"   추천 이유: {_reason(r)}"
            )
        return "\n".join(lines)


# ====================================================================== #
# 휴리스틱 (오프라인/폴백용)
# ====================================================================== #
_DEFAULT_PLAN = [
    "사용자 요청 분석",
    "지역 정보 추출",
    "음식 목적 및 조건 파악",
    "맛집 후보 검색(search_restaurants)",
    "평점·리뷰·가격 기준 필터링(filter_restaurants)",
    "추천 우선순위 정렬(rank_restaurants)",
    "결과 검토(Reflection) 후 최종 답변 생성",
]

_COMPANIONS = {"친구": "친구와", "혼자": "혼자", "연인": "연인과", "가족": "가족과", "회식": "회식"}
_TIMES = ["아침", "점심", "저녁", "카페", "디저트"]
_CUISINE_WORDS = ["한식", "일식", "양식", "중식", "파스타", "스시", "초밥", "카페", "디저트", "고기", "면"]


def _heuristic_conditions(text: str) -> dict[str, Any]:
    region = "전주 객사"
    m = re.search(r"([가-힣A-Za-z0-9]+(?:\s[가-힣A-Za-z0-9]+)?)\s*(?:근처|에서|역|동)", text)
    if m:
        region = m.group(1).strip()

    companion = next((v for k, v in _COMPANIONS.items() if k in text), "미지정")
    time = next((t for t in _TIMES if t in text), "미지정")

    category = "상관없음"
    for w in _CUISINE_WORDS:
        if w in text:
            category = {"파스타": "양식", "스시": "일식", "초밥": "일식", "고기": "한식", "면": "한식"}.get(w, w)
            break

    if any(w in text for w in ["비싸지 않", "저렴", "가성비", "부담 없", "부담없"]):
        max_price = "중간"
    elif "상관없" in text or "비싸도" in text:
        max_price = "상관없음"
    else:
        max_price = "중간"

    cm = re.search(r"(\d+)\s*(?:곳|개)", text)
    count = int(cm.group(1)) if cm else 3

    review_pref = "리뷰/평점 좋은 곳" if any(w in text for w in ["리뷰", "평점", "별점"]) else "평점 높은 순"

    return {
        "region": region,
        "companion": companion,
        "time": time,
        "category": category,
        "max_price_level": max_price,
        "review_preference": review_pref,
        "count": count,
    }


def _sort_by_from_pref(pref: str) -> list[str]:
    if "리뷰" in pref:
        return ["review_count", "rating", "distance"]
    if "가까" in pref or "거리" in pref:
        return ["distance", "rating", "review_count"]
    if "저렴" in pref or "가격" in pref:
        return ["price", "rating", "review_count"]
    return ["rating", "review_count", "distance"]


def _reason(r: dict[str, Any]) -> str:
    bits = []
    if r["rating"] >= 4.6:
        bits.append(f"평점 {r['rating']}로 주변 최상위")
    if r["review_count"] >= 500:
        bits.append(f"리뷰 {r['review_count']}개로 검증된 곳")
    if r["price_level"] in ("저렴", "중간 이하"):
        bits.append("가격 부담이 적음")
    if r["distance_m"] <= 350:
        bits.append("거리가 가까움")
    if not bits:
        bits.append("평점·리뷰가 안정적이라 무난한 선택지")
    return ", ".join(bits) + "."


def _heuristic_reflection(cond: dict[str, Any], ranked: list[dict[str, Any]], final_text: str) -> dict[str, Any]:
    want = int(cond.get("count", 3) or 3)
    cap = {"저렴": 1, "중간 이하": 2, "중간": 3, "비쌈": 4}.get(cond.get("max_price_level", "중간"), 3)
    checks = {
        "region": bool(ranked),
        "price": all({"저렴": 1, "중간 이하": 2, "중간": 3, "비쌈": 4}.get(r["price_level"], 4) <= cap for r in ranked),
        "review": all(r["rating"] >= 4.0 and r["review_count"] >= 100 for r in ranked),
        "fit": bool(ranked),
        "count": len(ranked) >= want,
    }
    return {
        "satisfied": all(checks.values()),
        "checks": checks,
        "comment": "" if all(checks.values()) else "일부 조건이 완화 적용되었습니다.",
        "final_answer": final_text,
    }
