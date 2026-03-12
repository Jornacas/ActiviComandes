@echo off
title ActiviComandes - Local Server
echo ========================================
echo   ActiviComandes - Arrancant servidors
echo ========================================
echo.

:: Backend
echo [1/2] Arrancant Backend (port 3010)...
cd /d "%~dp0backend"
start "ActiviComandes Backend" cmd /k "npm start"

:: Frontend
echo [2/2] Arrancant Frontend (port 3000)...
cd /d "%~dp0frontend"
start "ActiviComandes Frontend" cmd /k "npm run dev"

:: Esperar y abrir navegador
echo.
echo Esperant que els servidors arranquin...
timeout /t 5 /nobreak >nul
start http://localhost:3000

echo.
echo ========================================
echo   Backend:  http://localhost:3010
echo   Frontend: http://localhost:3000
echo ========================================
echo.
echo Tanca les finestres de CMD per aturar.
