@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo.
echo  THE NINE SPORT - Sincronizar fotos a productos
echo  ==============================================
echo.
if not exist "node_modules\" (
  echo Instalando dependencias (solo la primera vez)...
  call npm install
  if errorlevel 1 (
    echo.
    echo ERROR: ¿Tenés Node.js instalado? Descargalo de https://nodejs.org
    pause
    exit /b 1
  )
)
call npm run sync
echo.
pause
