@echo off
chcp 65001 >nul 2>&1
cd /d "%~dp0"
powershell -NoExit -ExecutionPolicy Bypass -File ".\start.ps1"
pause
