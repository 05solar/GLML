@echo off
REM 프론트(Vite 5173) + 백엔드(Flask 8000) 동시 실행. 창에서 Ctrl+C 로 둘 다 종료.
cd /d "%~dp0"
call npm run dev
