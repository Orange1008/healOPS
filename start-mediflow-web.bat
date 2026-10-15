@echo off
title MediFlow HMS Web Frontend Launcher (:3001)
echo ========================================================
echo   MEDIFLOW HMS: HOSPITAL WEB PORTAL LAUNCHER
echo   Running on: http://localhost:3001
echo   Proxying to backend microservices (:4000 - :4008)
echo ========================================================
echo.

cd /d e:\major-project1\mediflow-web
npm run dev
pause
