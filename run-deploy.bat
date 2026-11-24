@echo off
cd /d "%~dp0"
echo === Publishing Earth OS to Vercel ===
echo If it asks a question, press Enter to accept the default.
call npx --yes vercel@latest link --yes --project earth-os > logs\link.log 2>&1
type logs\link.log
call npx --yes vercel@latest deploy --prod --yes > logs\deploy.log 2>&1
type logs\deploy.log
echo.
echo Done. Leave this window open and tell Claude "done".
pause
