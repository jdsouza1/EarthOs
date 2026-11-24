@echo off
cd /d "%~dp0"
echo === Earth OS setup: installing packages, then downloading data ===
if not exist logs mkdir logs
call npm install > logs\npm-install.log 2>&1
echo npm install finished (exit %errorlevel%)
set PY=python
where python >nul 2>&1 || set PY=py
%PY% scripts\ingest.py --dry-run > logs\ingest-dry-run.log 2>&1
echo Dry run finished (exit %errorlevel%)
%PY% scripts\ingest.py > logs\ingest.log 2>&1
echo Data download finished (exit %errorlevel%)
echo.
echo Done. You can close this window - Claude will read the logs.
pause
