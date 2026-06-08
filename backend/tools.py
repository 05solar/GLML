"""
맛집 검색/필터/정렬 도구 (Tool Use Pattern)

세 가지 도구를 제공한다.
  1) search_restaurants  - 지역/음식/가격 조건으로 후보 검색 (Kakao Local API 또는 샘플 데이터)
  2) filter_restaurants  - 평점/리뷰/가격/거리 기준으로 후보 필터링
  3) rank_restaurants    - 추천 우선순위로 정렬 후 상위 N개 선정

도구는 stateful 하다. search 결과를 내부에 보관하고, filter/rank는 그 결과 위에서 동작한다.
이렇게 하면 LLM이 거대한 후보 리스트를 인자로 주고받지 않아도 도구를 자연스럽게 연결할 수 있다.
"""

from __future__ import annotations

import json
import math
import os
from pathlib import Path
from typing import Any, Callable

try:
    import requests  # Kakao Local API 호출용 (선택)
except Exception:  # pragma: no cover - requests 미설치 환경 방어
    requests = None  # type: ignore

DATA_PATH = Path(__file__).parent / "data" / "restaurants.json"

# 가격대 순서: 저렴 < 중간 이하 < 중간 < 비쌈
PRICE_ORDER = {"저렴": 1, "중간 이하": 2, "중간": 3, "비쌈": 4}
PRICE_SYMBOL = {"저렴": "₩", "중간 이하": "₩₩", "중간": "₩₩", "비쌈": "₩₩₩"}
CUISINES = {"한식", "일식", "양식", "중식"}
CAFE_LIKE = {"카페", "디저트", "베이커리"}
MEAL_TIME_WORDS = {"아침", "점심", "저녁", "저녁 식사", "점심 식사", "식사", "저녁식사"}

# Google Places API (New)
GOOGLE_SEARCH_URL = "https://places.googleapis.com/v1/places:searchText"
GOOGLE_FIELDS = (
    "places.displayName,places.formattedAddress,places.rating,"
    "places.userRatingCount,places.priceLevel,places.location,"
    "places.primaryTypeDisplayName,places.types,places.photos"
)
GOOGLE_PRICE_MAP = {
    "PRICE_LEVEL_FREE": "저렴",
    "PRICE_LEVEL_INEXPENSIVE": "저렴",
    "PRICE_LEVEL_MODERATE": "중간",
    "PRICE_LEVEL_EXPENSIVE": "비쌈",
    "PRICE_LEVEL_VERY_EXPENSIVE": "비쌈",
    "PRICE_LEVEL_UNSPECIFIED": "중간",
}
GOOGLE_TYPE_MAP = {
    "korean_restaurant": "한식",
    "japanese_restaurant": "일식",
    "sushi_restaurant": "일식",
    "ramen_restaurant": "일식",
    "chinese_restaurant": "중식",
    "italian_restaurant": "양식",
    "french_restaurant": "양식",
    "pizza_restaurant": "양식",
    "american_restaurant": "양식",
    "cafe": "카페",
    "coffee_shop": "카페",
    "bakery": "베이커리",
    "dessert_shop": "디저트",
    "ice_cream_shop": "디저트",
}
GOOGLE_CAFE_TYPES = {"cafe", "coffee_shop", "bakery", "dessert_shop", "ice_cream_shop"}


def _haversine_m(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    """두 좌표 사이 거리(m)."""
    r = 6371000.0
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dl = math.radians(lng2 - lng1)
    a = math.sin(dphi / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return 2 * r * math.asin(math.sqrt(a))


def _google_price(price_level: str | None) -> str:
    return GOOGLE_PRICE_MAP.get(price_level or "PRICE_LEVEL_UNSPECIFIED", "중간")


def _google_category(place: dict[str, Any]) -> tuple[str, bool]:
    """(표시 카테고리, 식사류 여부) 반환."""
    types = place.get("types", []) or []
    is_meal = not any(t in GOOGLE_CAFE_TYPES for t in types)
    pt = (place.get("primaryTypeDisplayName") or {}).get("text")
    if pt:
        return pt, is_meal
    for t in types:
        if t in GOOGLE_TYPE_MAP:
            return GOOGLE_TYPE_MAP[t], is_meal
    return "음식점", is_meal


def _google_category_ok(r: dict[str, Any], category: str) -> bool:
    """Google 결과는 textQuery로 이미 1차 필터됨 → 식사류/카페 구분만 보정."""
    c = (category or "").strip()
    if c in ("", "상관없음", "아무거나") or c in MEAL_TIME_WORDS:
        return bool(r.get("is_meal", True))
    if c in CAFE_LIKE:
        return not bool(r.get("is_meal", True))
    return True  # 특정 음식 종류는 Google 검색 쿼리를 신뢰


def _load_sample() -> list[dict[str, Any]]:
    with open(DATA_PATH, encoding="utf-8") as f:
        return json.load(f)


def _public(r: dict[str, Any]) -> dict[str, Any]:
    """LLM/로그에 노출할 식당 필드만 추린다."""
    return {
        "name": r["name"],
        "category": r["category"],
        "menu": r.get("menu", ""),
        "rating": r["rating"],
        "review_count": r["review_count"],
        "price_level": r["price_level"],
        "price_range": r.get("price_range", ""),
        "distance_m": r["distance_m"],
        "address": r.get("address", ""),
    }


class RestaurantTools:
    def __init__(self, kakao_key: str | None = None, google_key: str | None = None) -> None:
        self.kakao_key = kakao_key or os.getenv("KAKAO_REST_KEY") or ""
        self.google_key = google_key or os.getenv("GOOGLE_PLACES_API_KEY") or ""
        self.sample = _load_sample()
        # 도구 간 공유 상태
        self.last_search: list[dict[str, Any]] = []
        self.last_filtered: list[dict[str, Any]] = []
        self.last_ranked: list[dict[str, Any]] = []

    # ------------------------------------------------------------------ #
    # 1) 맛집 검색
    # ------------------------------------------------------------------ #
    def search_restaurants(
        self,
        location: str,
        category: str = "상관없음",
        price_level: str = "상관없음",
        min_review_score: float = 0.0,
        limit: int = 10,
    ) -> dict[str, Any]:
        category = (category or "상관없음").strip()
        location = (location or "").strip()
        note = ""
        source: list[dict[str, Any]] | None = None

        # 0) Google Places API (New) 우선 — 실데이터(평점/리뷰/가격)
        if self.google_key:
            try:
                g = self._google_candidates(location, category, limit)
                if g is None:
                    return {
                        "status": "no_region",
                        "count": 0,
                        "results": [],
                        "message": f"Google 검색에서 '{location}' 지역을 찾지 못했습니다. 지역명을 다시 확인해 주세요.",
                    }
                source = g
                note = "Google Places API에서 실시간 데이터를 가져왔습니다."
            except Exception as e:  # 키 오류/네트워크/할당량 → 샘플 폴백
                note = f"Google Places API 호출 실패({e}). 샘플 데이터셋으로 대체했습니다."
                source = None

        # 1) (Google 미사용/실패 시) Kakao Local 로 지역 검증
        if source is None and self.kakao_key:
            kakao_status = self._kakao_validate(location)
            if kakao_status == "no_region":
                return {
                    "status": "no_region",
                    "count": 0,
                    "results": [],
                    "message": f"Kakao 검색에서 '{location}' 지역의 장소를 찾지 못했습니다. 지역명을 다시 확인해 주세요.",
                }
            if kakao_status == "ok":
                note = note or "Kakao Local API로 지역을 확인했습니다. 상세 평점·리뷰는 샘플 데이터로 보강합니다."
            elif kakao_status == "fail":
                note = note or "Kakao API 호출에 실패하여 샘플 데이터셋으로 대체했습니다."

        # 2) 샘플 데이터셋 (기본/최종 폴백)
        if source is None:
            source = [r for r in self.sample if self._match_region(r, location)]
            if not source:
                return {
                    "status": "no_region",
                    "count": 0,
                    "results": [],
                    "message": (
                        f"샘플 데이터셋에는 '{location}' 지역 정보가 없습니다. "
                        "지역명을 다시 확인하거나 '전주 객사'처럼 대표 장소를 입력해 주세요."
                    ),
                }

        # 공통 후처리: 음식 종류 → 가격 상한 → 최소 평점 → 개수 제한
        cands = []
        for r in source:
            ok_cat = _google_category_ok(r, category) if r.get("_source") == "google" else self._match_category(r, category)
            if ok_cat:
                cands.append(r)

        if price_level and price_level not in ("상관없음", ""):
            cap = PRICE_ORDER.get(price_level, 4)
            cands = [r for r in cands if PRICE_ORDER.get(r["price_level"], 4) <= cap]
        if min_review_score:
            cands = [r for r in cands if r["rating"] >= min_review_score]

        cands = cands[: max(1, limit)]
        self.last_search = cands
        self.last_filtered = []
        self.last_ranked = []

        if not cands:
            return {
                "status": "empty",
                "count": 0,
                "results": [],
                "message": "조건에 맞는 후보가 없습니다. 음식 종류나 가격대를 완화해 다시 검색하세요.",
            }

        return {
            "status": "ok",
            "count": len(cands),
            "results": [_public(r) for r in cands],
            "message": note or f"'{location}' 주변 후보 {len(cands)}개를 검색했습니다.",
        }

    # ------------------------------------------------------------------ #
    # Google Places API (New) 연동
    # ------------------------------------------------------------------ #
    def _google_text_search(self, query: str, field_mask: str, max_results: int = 20) -> list[dict[str, Any]]:
        if requests is None:
            raise RuntimeError("requests 미설치")
        resp = requests.post(
            GOOGLE_SEARCH_URL,
            headers={
                "Content-Type": "application/json",
                "X-Goog-Api-Key": self.google_key,
                "X-Goog-FieldMask": field_mask,
            },
            json={
                "textQuery": query,
                "languageCode": "ko",
                "regionCode": "KR",
                "maxResultCount": max_results,
            },
            timeout=8,
        )
        if resp.status_code != 200:
            raise RuntimeError(f"HTTP {resp.status_code} {resp.text[:120]}")
        return resp.json().get("places", []) or []

    def _google_geocode(self, location: str) -> tuple[float, float] | None:
        """지역명을 좌표로 변환(겸 지역 실재 검증). 없으면 None."""
        places = self._google_text_search(location, "places.location,places.displayName", 1)
        if not places:
            return None
        loc = places[0].get("location") or {}
        if "latitude" not in loc:
            return None
        return (loc["latitude"], loc["longitude"])

    def _google_candidates(self, location: str, category: str, limit: int) -> list[dict[str, Any]] | None:
        center = self._google_geocode(location)
        if center is None:
            return None
        kw = "" if (category in ("상관없음", "", "아무거나") or category in MEAL_TIME_WORDS) else category
        query = " ".join(p for p in [location, kw, "맛집"] if p).strip()
        places = self._google_text_search(query, GOOGLE_FIELDS, max(10, min(20, limit * 2)))
        out: list[dict[str, Any]] = []
        for p in places:
            loc = p.get("location") or {}
            if "latitude" not in loc:
                continue
            cat, is_meal = _google_category(p)
            price_level = _google_price(p.get("priceLevel"))
            photo_name = ((p.get("photos") or [{}])[0] or {}).get("name")
            out.append(
                {
                    "_source": "google",
                    "name": (p.get("displayName") or {}).get("text", "이름미상"),
                    "category": cat,
                    "menu": "",
                    "is_meal": is_meal,
                    "rating": float(p.get("rating") or 0.0),
                    "review_count": int(p.get("userRatingCount") or 0),
                    "price_level": price_level,
                    "price_range": PRICE_SYMBOL.get(price_level, ""),
                    "distance_m": int(round(_haversine_m(center[0], center[1], loc["latitude"], loc["longitude"]))),
                    "address": p.get("formattedAddress", ""),
                    "lat": loc["latitude"],
                    "lng": loc["longitude"],
                    "photo_name": photo_name,
                    "region_keywords": [location, "전주", "객사"],
                }
            )
        return out

    # ------------------------------------------------------------------ #
    # 2) 맛집 필터링
    # ------------------------------------------------------------------ #
    def filter_restaurants(
        self,
        min_rating: float = 0.0,
        min_review_count: int = 0,
        max_price_level: str = "비쌈",
        max_distance_m: int = 100000,
    ) -> dict[str, Any]:
        base = self.last_search
        if not base:
            return {
                "status": "no_base",
                "count": 0,
                "results": [],
                "message": "먼저 search_restaurants 로 후보를 검색하세요.",
            }

        cap = PRICE_ORDER.get(max_price_level, 4)
        filtered = [
            r
            for r in base
            if r["rating"] >= min_rating
            and r["review_count"] >= min_review_count
            and PRICE_ORDER.get(r["price_level"], 4) <= cap
            and r["distance_m"] <= max_distance_m
        ]
        self.last_filtered = filtered

        if not filtered:
            return {
                "status": "empty",
                "count": 0,
                "results": [],
                "message": (
                    "조건을 만족하는 후보가 없습니다. 리뷰 수 기준을 낮추거나 거리 범위를 넓혀 다시 시도하세요."
                ),
            }

        return {
            "status": "ok",
            "count": len(filtered),
            "results": [_public(r) for r in filtered],
            "message": f"조건에 맞는 후보 {len(filtered)}개를 선별했습니다.",
        }

    # ------------------------------------------------------------------ #
    # 3) 맛집 정렬
    # ------------------------------------------------------------------ #
    def rank_restaurants(
        self,
        sort_by: list[str] | None = None,
        top_k: int = 3,
    ) -> dict[str, Any]:
        base = self.last_filtered or self.last_search
        if not base:
            return {
                "status": "no_base",
                "count": 0,
                "results": [],
                "message": "정렬할 후보가 없습니다. 먼저 검색/필터링을 수행하세요.",
            }

        sort_by = sort_by or ["rating", "review_count", "distance"]

        def key(r: dict[str, Any]):
            parts = []
            for k in sort_by:
                if k in ("rating", "평점"):
                    parts.append(-r["rating"])
                elif k in ("review_count", "reviews", "리뷰", "리뷰수"):
                    parts.append(-r["review_count"])
                elif k in ("distance", "거리"):
                    parts.append(r["distance_m"])
                elif k in ("price", "가격"):
                    parts.append(PRICE_ORDER.get(r["price_level"], 4))
            return tuple(parts)

        ranked = sorted(base, key=key)[: max(1, top_k)]
        self.last_ranked = ranked
        return {
            "status": "ok",
            "count": len(ranked),
            "sort_by": sort_by,
            "results": [_public(r) for r in ranked],
            "message": f"상위 {len(ranked)}곳을 우선순위에 따라 정렬했습니다.",
        }

    # ------------------------------------------------------------------ #
    # 내부 헬퍼
    # ------------------------------------------------------------------ #
    @staticmethod
    def _match_region(r: dict[str, Any], location: str) -> bool:
        if not location:
            return True
        loc = location.replace(" ", "")
        for kw in r.get("region_keywords", []):
            if kw.replace(" ", "") in loc or loc in kw.replace(" ", ""):
                return True
        return False

    @staticmethod
    def _match_category(r: dict[str, Any], category: str) -> bool:
        c = (category or "").strip()
        if c in ("", "상관없음", "아무거나", "맛있는 곳", "괜찮은 곳"):
            # 모호 → 식사류 전체 (카페/디저트 제외)
            return bool(r.get("is_meal", True))
        if c in CAFE_LIKE:
            return r["category"] in CAFE_LIKE
        if c in CUISINES:
            return r["category"] == c
        if c in MEAL_TIME_WORDS:
            return bool(r.get("is_meal", True))
        # 그 외 자유 텍스트 → 카테고리/메뉴에 포함되면 매칭
        return c in r["category"] or c in r.get("menu", "")

    def _kakao_validate(self, location: str) -> str:
        """Kakao Local 키워드 검색으로 지역 실재 여부 확인.
        반환: 'ok' | 'no_region' | 'fail' | 'skip'(키 없음)
        """
        if not self.kakao_key or requests is None or not location:
            return "skip"
        try:
            resp = requests.get(
                "https://dapi.kakao.com/v2/local/search/keyword.json",
                headers={"Authorization": f"KakaoAK {self.kakao_key}"},
                params={"query": f"{location} 맛집", "size": 5},
                timeout=5,
            )
            if resp.status_code != 200:
                return "fail"
            docs = resp.json().get("documents", [])
            return "ok" if docs else "no_region"
        except Exception:
            return "fail"


# ---------------------------------------------------------------------- #
# OpenAI function-calling 스키마
# ---------------------------------------------------------------------- #
TOOL_SCHEMAS: list[dict[str, Any]] = [
    {
        "type": "function",
        "function": {
            "name": "search_restaurants",
            "description": "지역·음식 종류·가격대 조건으로 맛집 후보를 검색한다. 가장 먼저 호출한다.",
            "parameters": {
                "type": "object",
                "properties": {
                    "location": {"type": "string", "description": "검색 지역 (예: '전주 객사')"},
                    "category": {
                        "type": "string",
                        "description": "음식 종류. 한식/일식/양식/중식/카페/디저트, 또는 '저녁 식사' 같은 식사류. 모호하면 '상관없음'.",
                    },
                    "price_level": {
                        "type": "string",
                        "description": "가격 상한. 저렴/중간 이하/중간/비쌈/상관없음 중 하나.",
                    },
                    "min_review_score": {"type": "number", "description": "최소 평점(기본 0)"},
                    "limit": {"type": "integer", "description": "최대 후보 수(기본 10)"},
                },
                "required": ["location"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "filter_restaurants",
            "description": "직전 검색 결과를 평점/리뷰 수/가격 상한/거리 기준으로 필터링한다.",
            "parameters": {
                "type": "object",
                "properties": {
                    "min_rating": {"type": "number", "description": "최소 평점 (예: 4.0)"},
                    "min_review_count": {"type": "integer", "description": "최소 리뷰 수 (예: 100)"},
                    "max_price_level": {
                        "type": "string",
                        "description": "허용하는 가격 상한. 저렴/중간 이하/중간/비쌈. '너무 비싸지 않게'면 보통 '중간'.",
                    },
                    "max_distance_m": {"type": "integer", "description": "최대 거리(m). 기본 넉넉히."},
                },
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "rank_restaurants",
            "description": "필터링된 후보를 우선순위로 정렬하고 상위 top_k개를 선정한다. 마지막에 호출한다.",
            "parameters": {
                "type": "object",
                "properties": {
                    "sort_by": {
                        "type": "array",
                        "items": {
                            "type": "string",
                            "enum": ["rating", "review_count", "distance", "price"],
                        },
                        "description": "정렬 우선순위. 앞쪽일수록 우선. 기본 [rating, review_count, distance].",
                    },
                    "top_k": {"type": "integer", "description": "추천 개수 (예: 3)"},
                },
            },
        },
    },
]


def get_tool_dispatch(tools: RestaurantTools) -> dict[str, Callable[..., dict[str, Any]]]:
    return {
        "search_restaurants": tools.search_restaurants,
        "filter_restaurants": tools.filter_restaurants,
        "rank_restaurants": tools.rank_restaurants,
    }
