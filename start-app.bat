@echo off
setlocal

cd /d "%~dp0"

if not exist "package.json" (
  echo package.json not found. Run this launcher from the project root.
  pause
  exit /b 1
)

where node >nul 2>nul
if errorlevel 1 (
  echo Node.js was not found. Install Node.js 20+ first.
  pause
  exit /b 1
)

where npm >nul 2>nul
if errorlevel 1 (
  echo npm was not found. Reinstall Node.js and make sure npm is available.
  pause
  exit /b 1
)

if not exist "node_modules" (
  echo node_modules not found. Run npm install first.
  pause
  exit /b 1
)

node "%~dp0scripts\start-app.cjs" --foreground
if errorlevel 1 (
  pause
  exit /b 1
)

endlocal
exit /b 0
