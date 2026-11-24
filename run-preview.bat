@echo off
cd /d "%~dp0"
echo === Building a private preview of Earth OS (live site not touched) ===
call npx --yes vercel@latest deploy --yes > logs\preview.log 2>&1
type logs\preview.log
echo.
echo Done. Tell Claude "done".
pause
