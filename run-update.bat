@echo off
cd /d "%~dp0"
set PY=python
where python >nul 2>&1 || set PY=py
echo === 1/2 Checking sources (no changes) ===
%PY% scripts\ingest.py --dry-run > logs\ingest-new.log 2>&1
type logs\ingest-new.log
echo.
echo === 2/2 Building a private preview (live site not touched) ===
call npx --yes vercel@latest deploy --yes > logs\preview.log 2>&1
type logs\preview.log
echo.
echo Done. Tell Claude "done".
pause
