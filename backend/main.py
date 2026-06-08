"""
맛집 찾기 AI Agent - 실행 진입점

사용법:
  python main.py                       # 기본 테스트 프롬프트 실행
  python main.py "전주 객사 근처 ..."   # 직접 입력
  python main.py --offline             # API 키 없이 오프라인 시뮬레이션 강제
  python main.py --no-log              # logs/trace_log.txt 미저장

OPENAI_API_KEY 는 backend/.env 파일에 넣어 주세요. (.env.example 참고)
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

# 한글 출력이 깨지지 않도록 (Windows 콘솔 대비)
try:
    sys.stdout.reconfigure(encoding="utf-8")  # type: ignore[attr-defined]
except Exception:
    pass

from dotenv import load_dotenv  # noqa: E402

from agent import RestaurantAgent  # noqa: E402

DEFAULT_PROMPT = (
    "전주 객사 근처에서 친구랑 저녁 먹기 좋은 맛집을 찾아줘. "
    "너무 비싸지 않고, 리뷰가 좋은 곳 위주로 3곳 추천해줘."
)
LOG_PATH = Path(__file__).parent / "logs" / "trace_log.txt"


def main() -> None:
    parser = argparse.ArgumentParser(description="맛집 찾기 AI Agent")
    parser.add_argument("prompt", nargs="?", default=DEFAULT_PROMPT, help="사용자 요청 문장")
    parser.add_argument("--offline", action="store_true", help="API 키 없이 오프라인 시뮬레이션 실행")
    parser.add_argument("--no-log", action="store_true", help="trace_log.txt 저장 안 함")
    args = parser.parse_args()

    # backend/.env 로드
    load_dotenv(Path(__file__).parent / ".env")

    agent = RestaurantAgent()
    if args.offline:
        agent.client = None  # 오프라인 강제

    final, trace = agent.run(args.prompt)

    if not args.no_log:
        LOG_PATH.parent.mkdir(parents=True, exist_ok=True)
        LOG_PATH.write_text(trace.as_text(), encoding="utf-8")
        print(f"\n📝 트레이스를 저장했습니다: {LOG_PATH}")


if __name__ == "__main__":
    main()
