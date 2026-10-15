@echo off
title MediFlow Hospital Management System Fleet Launcher
echo ========================================================
echo   MEDIFLOW HMS: FULL MICROSERVICES FLEET LAUNCHER
echo ========================================================
echo.

echo [1/8] Starting Patient Service (:4000)...
start "Patient-Service (:4000)" cmd /k "cd /d e:\major-project1\patient-service && mvn spring-boot:run"
timeout /t 2 /nobreak >nul

echo [2/8] Starting Billing Service (:4001)...
start "Billing-Service (:4001)" cmd /k "cd /d e:\major-project1\billing-service && mvn spring-boot:run"
timeout /t 2 /nobreak >nul

echo [3/8] Starting Doctor Service (:4002)...
start "Doctor-Service (:4002)" cmd /k "cd /d e:\major-project1\doctor-service && mvn spring-boot:run"
timeout /t 2 /nobreak >nul

echo [4/8] Starting Appointment Service (:4003)...
start "Appointment-Service (:4003)" cmd /k "cd /d e:\major-project1\appointment-service && mvn spring-boot:run"
timeout /t 2 /nobreak >nul

echo [5/8] Starting Inventory Service (:4004)...
start "Inventory-Service (:4004)" cmd /k "cd /d e:\major-project1\inventory-service && mvn spring-boot:run"
timeout /t 2 /nobreak >nul

echo [6/8] Starting Pharmacy Service (:4006)...
start "Pharmacy-Service (:4006)" cmd /k "cd /d e:\major-project1\pharmacy-service && mvn spring-boot:run"
timeout /t 2 /nobreak >nul

echo [7/8] Starting Laboratory Service (:4007)...
start "Laboratory-Service (:4007)" cmd /k "cd /d e:\major-project1\laboratory-service && mvn spring-boot:run"
timeout /t 2 /nobreak >nul

echo [8/8] Starting Notification Service (:4008)...
start "Notification-Service (:4008)" cmd /k "cd /d e:\major-project1\notification-service && mvn spring-boot:run"

echo.
echo ========================================================
echo   All MediFlow Microservices are starting up!
echo   Each service has Spring Actuator + /chaos endpoints.
echo ========================================================
pause
