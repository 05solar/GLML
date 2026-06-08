@echo off
REM 5173 / 8000 포트의 서버를 강제 종료 (Ctrl+C 로 안 꺼질 때 사용)
cd /d "%~dp0"
call npm run stop
pause
