@echo off
setlocal EnableExtensions

cd /d "%~dp0"
title SiyothSoft ERP - Stop

if not exist ".env" (
    echo .env was not found. Nothing to stop from this project configuration.
    pause
    exit /b 0
)

docker compose --env-file ".env" stop
if errorlevel 1 (
    echo Could not stop the Compose services. Check Docker Desktop and the logs.
    pause
    exit /b 1
)

echo ERP services stopped. Your database volume was preserved.
pause
exit /b 0
