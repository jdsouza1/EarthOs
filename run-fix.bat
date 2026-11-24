@echo off
cd /d "%~dp0"
set PY=python
where python >nul 2>&1 || set PY=py
echo === 1/2 Re-downloading the 3 sources that failed ===
%PY% scripts\ingest.py --only poverty internet hdi > logs\ingest-fix.log 2>&1
type logs\ingest-fix.log
echo.
echo === 2/2 Publishing to Vercel ===
echo If a browser opens asking you to log in to Vercel, approve it.
call npx --yes vercel@latest link --yes --project earth-os
call npx --yes vercel@latest deploy --prod --yes > logs\deploy.log 2>&1
type logs\deploy.log
echo.
echo Done. You can close this window.
pause
