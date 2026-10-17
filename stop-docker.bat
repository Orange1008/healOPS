@echo off
title Stop HealOPS & MediFlow Docker Fleet
echo ========================================================
echo   STOPPING ALL HEALOPS & MEDIFLOW DOCKER CONTAINERS
echo ========================================================
echo.

docker compose down

echo.
echo [✓] All containers stopped and cleaned up.
pause
