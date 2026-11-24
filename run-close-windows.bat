@echo off
REM Closes every Windows Terminal / Command Prompt window, including this one.
taskkill /IM WindowsTerminal.exe /F >nul 2>&1
