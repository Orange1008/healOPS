@echo off
title Stop MediFlow and HealOps Compose Stack
cd /d "%~dp0"
docker compose stop
if errorlevel 1 (
  echo Could not stop the Compose stack. Check Docker Desktop and the error above.
  pause
)
