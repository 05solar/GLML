"""
맛집 찾기 AI Agent - HTTP API 서버 (프론트엔드 연동용)

- POST /api/recommend : 프론트 조건(다중 선택) → 자연어 프롬프트 → ReAct Agent 실행
                        → { trace, results(사진 포함), final, mode }
- GET  /api/photo     : Google Places 사진 프록시 (API 키를 서버에만 보관)
- GET  /api/health    : 헬스 체크

실행:  python server.py        # http://localhost:8000
"""

from __future__ import annotations

import os
import sys
import urllib.parse
from pathlib import Path
from typing import Any

try:
    sys.stdout.reconfigure(encoding="utf-8")  # type: ignore[attr-defined]
except Exception:
    pass

import requests  # noqa: E402
from dotenv import load_dotenv  # noqa: E402
from flask import Flask, Response, jsonify, request  # noqa: E402
from flask_cors import CORS  # noqa: E402

from agent import RestaurantAgent, _reason  # noqa: E402
from tools import _public  # noqa: E402

load_dotenv(Path(__file__).parent / ".env")

app = Flask(__name__)
CORS(app)  # 개발 환경: 모든 출처 허용

# 프론트엔드 옵션 id → 한국어 매핑
PURPOSE = {"solo": "혼자", "friend": "친구", "couple": "연인", "family": "가족", "work": "회식"}
TIME = {"morning": "아침", "lunch": "점심", "dinner": "저녁", "cafe": "카페/디저트"}
CATEGORY = {
    "any": "",
    "korean": "한식",
    "japanese": "일식",
    "chinese": "중식",
    "western": "양식",
    "cafe": "카페",
    "dessert": "디저트",
}
PRIORITY = {
    "rating": "평점이 좋은",
    "reviews": "리뷰가 많은",
    "near": "가까운",
    "cheap": "가격이 부담 없는",
}


def _as_list(v: Any) -> list[str]:
    if v is None:
        return []
    if isinstance(v, list):
        return [str(x) for x in v]
    return [str(v)]


def _names(ids: Any, m: dict[str, str]) -> list[str]:
    return [m[i] for i in _as_list(ids) if m.get(i)]


def build_prompt(c: dict[str, Any]) -> str:
    """프론트엔드 선택값(다중) → 자연어 요청 문장."""
    place = (c.get("place") or "전주 객사").strip()
    companions = _names(c.get("purpose"), PURPOSE)
    times = _names(c.get("time"), TIME)
    cats = _names(c.get("category"), CATEGORY)  # 'any'는 ''라 제외됨
    pris = _names(c.get("priority"), PRIORITY)
    count = int(c.get("count") or 3)

    # 가격: 여러 개면 가장 너그러운 기준 적용
    price_ids = _as_list(c.get("price"))
    if not price_ids or "any" in price_ids:
        price = ""
    elif "normal" in price_ids:
        price = "너무 비싸지 않은"
    else:
        price = "저렴한"

    head = f"{place} 근처에서"
    if companions:
        head += f" {', '.join(companions)}랑"
    if times:
        head += f" {', '.join(times)}에"
    head += " 먹기 좋은"
    if cats:
        head += f" {'·'.join(cats)}"
    head += " 맛집을 찾아줘."

    tail = ""
    if price:
        tail += f" {price} 곳으로,"
    if pris:
        tail += f" {', '.join(pris)} 곳 위주로"
    tail += f" {count}곳 추천해줘."
    return head + tail


def _photo_url(photo_name: str | None) -> str | None:
    if not photo_name:
        return None
    return "/api/photo?name=" + urllib.parse.quote(photo_name, safe="")


@app.get("/api/health")
def health():
    return jsonify({"ok": True})


@app.post("/api/recommend")
def recommend():
    data = request.get_json(force=True, silent=True) or {}
    prompt = (data.get("prompt") or build_prompt(data)).strip()

    agent = RestaurantAgent()  # 요청마다 새 인스턴스(도구 상태 격리)
    final, trace = agent.run(prompt)

    results = []
    for r in agent.tools.last_ranked:
        results.append({**_public(r), "reason": _reason(r), "photo": _photo_url(r.get("photo_name"))})

    status = "ok" if results else "empty"
    for ev in trace.events:
        if ev.get("type") == "observation" and ev.get("status") == "no_region":
            status = "no_region"
            break

    return jsonify(
        {
            "prompt": prompt,
            "conditions": agent.memory,
            "trace": trace.events,
            "results": results,
            "final": final,
            "mode": "offline" if agent.client is None else "llm",
            "status": status,
        }
    )


@app.get("/api/photo")
def photo():
    """Google Places 사진을 서버 키로 받아 그대로 스트리밍(키 비노출)."""
    name = request.args.get("name", "")
    key = os.getenv("GOOGLE_PLACES_API_KEY", "")
    if not name or not key:
        return ("", 404)
    try:
        r = requests.get(
            f"https://places.googleapis.com/v1/{name}/media",
            params={"maxWidthPx": 640, "key": key},
            timeout=10,
        )
    except Exception:
        return ("", 502)
    if r.status_code != 200:
        return ("", r.status_code)
    return Response(r.content, content_type=r.headers.get("Content-Type", "image/jpeg"))


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8000, debug=False)
