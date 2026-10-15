@echo off
echo ========================================================
echo   HEALOPS: AUTONOMOUS SELF-HEALING PLATFORM LAUNCHER
echo ========================================================
echo.

echo [1/2] Starting Hospital Microservices (Patient Service on port 4000)...
start "Patient-Service (:4000)" cmd /k "cd /d e:\major-project1\patient-service && mvn spring-boot:run"

timeout /t 5 /nobreak >nul

echo [2/2] Starting HealOps Core Platform & Dashboard (port 8090)...
start "HealOps-Core (:8090)" cmd /k "cd /d e:\major-project1\healops-core && mvn spring-boot:run"

timeout /t 10 /nobreak >nul

echo Opening HealOps Dashboard in your browser...
start http://localhost:8090

echo.
echo ========================================================
echo   HealOps Autonomous Platform is LIVE!
echo   Dashboard URL: http://localhost:8090
echo ========================================================
pause
