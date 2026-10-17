@echo off
title HealOPS & MediFlow Docker Fleet Launcher
echo ========================================================
echo   HEALOPS & MEDIFLOW HMS — DOCKER FLEET LAUNCHER
echo ========================================================
echo.

REM 1. Verify Docker CLI is accessible
docker --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Docker is not installed or not in PATH!
    echo Please install Docker Desktop: https://www.docker.com/products/docker-desktop
    pause
    exit /b 1
)

REM 2. Check if Docker Daemon is running
echo Checking Docker Desktop daemon...
docker ps >nul 2>&1
if %errorlevel% neq 0 (
    echo [WARNING] Docker Desktop daemon is not running!
    echo Attempting to start Docker Desktop...
    start "" "C:\Program Files\Docker\Docker\Docker Desktop.exe"
    echo Waiting 25 seconds for Docker engine to initialize...
    timeout /t 25 /nobreak >nul
)

REM Verify again
docker ps >nul 2>&1
if %errorlevel% neq 0 (
    echo.
    echo [!] Docker Desktop is still starting up.
    echo Please wait until Docker Desktop shows 'Engine running', then re-run this script.
    pause
    exit /b 1
)

echo.
echo [1/3] Building and starting all 12 containers in the background...
docker compose up -d --build

echo.
echo [2/3] Checking container status...
docker compose ps

echo.
echo [3/3] Launching Web Frontends in your browser...
timeout /t 5 /nobreak >nul
start http://localhost:3001
start http://localhost:8090

echo.
echo ========================================================
echo   ALL 12 CONTAINERS ARE RUNNING QUIETLY IN DOCKER!
echo   - MediFlow Hospital Web: http://localhost:3001
echo   - HealOps SRE Dashboard: http://localhost:8090
echo   - Microservices Fleet:   Ports 4000 to 4008
echo   - API Gateway:           Port 8080
echo.
echo   To stop all containers, run: stop-docker.bat
echo ========================================================
pause
