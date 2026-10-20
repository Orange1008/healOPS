@echo off
title MediFlow and HealOps
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0start-silent.ps1"
if errorlevel 1 pause
