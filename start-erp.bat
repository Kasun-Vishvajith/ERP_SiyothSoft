@echo off
setlocal EnableExtensions

cd /d "%~dp0"
title SiyothSoft ERP - Start

echo.
echo ==========================================
echo        SiyothSoft ERP launcher
echo ==========================================
echo.

where docker >nul 2>&1
if errorlevel 1 (
    echo Docker was not found on PATH.
    echo Install Docker Desktop, start it, then run this file again.
    pause
    exit /b 1
)

docker info >nul 2>&1
if errorlevel 1 (
    echo Docker Desktop is not running or its engine is unavailable.
    echo Start Docker Desktop, wait until it says it is running, then retry.
    pause
    exit /b 1
)

if not exist ".env" (
    copy /Y ".env.example" ".env" >nul
    echo Created .env from .env.example.
    echo Edit .env and replace every replace-with-... value before continuing.
    echo.
    notepad ".env"
    pause
    exit /b 1
)

findstr /C:"replace-with-" ".env" >nul 2>&1
if not errorlevel 1 (
    echo .env still contains placeholder values.
    echo Update POSTGRES_PASSWORD, ERP_USERNAME and ERP_PASSWORD, then retry.
    pause
    exit /b 1
)

echo Checking Compose configuration...
docker compose --env-file ".env" config --quiet
if errorlevel 1 (
    echo Compose configuration is invalid. Check the values in .env.
    pause
    exit /b 1
)

docker volume inspect mini-erp-pgdata >nul 2>&1
if errorlevel 1 (
    echo Creating persistent database volume mini-erp-pgdata...
    docker volume create mini-erp-pgdata >nul
    if errorlevel 1 (
        echo Could not create the database volume.
        pause
        exit /b 1
    )
)

echo Building and starting the ERP. The first run may take a few minutes...
docker compose --env-file ".env" up --build -d
if errorlevel 1 (
    echo.
    echo The ERP could not be started. Show logs with:
    echo docker compose --env-file .env logs --tail=100
    pause
    exit /b 1
)

echo Waiting for the web application...
set "ERP_READY=0"
for /L %%I in (1,1,60) do (
    powershell -NoProfile -ExecutionPolicy Bypass -Command "try { Invoke-WebRequest -UseBasicParsing http://127.0.0.1:8188 -TimeoutSec 2 | Out-Null; exit 0 } catch { exit 1 }" >nul 2>&1
    if not errorlevel 1 (
        set "ERP_READY=1"
        goto :ready
    )
    timeout /t 2 /nobreak >nul
)

:ready
if "%ERP_READY%"=="1" (
    echo ERP is ready at http://127.0.0.1:8188
    start "" "http://127.0.0.1:8188"
) else (
    echo The containers started, but the web page did not respond yet.
    echo.
    echo Container status:
    docker compose --env-file ".env" ps
    echo.
    echo Recent container logs:
    docker compose --env-file ".env" logs --tail=50
    echo.
    echo Try opening manually: http://127.0.0.1:8188
    exit /b 1
)

echo.
echo Keep the database volume. Do not run docker compose down -v.
pause
exit /b 0
