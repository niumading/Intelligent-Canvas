@echo off
chcp 65001 >nul
setlocal
cd /d "%~dp0"

echo [1/5] Checking Python...
set "SYSTEM_PY=%~dp0python\python.exe"
if not exist "%SYSTEM_PY%" set "SYSTEM_PY=python"
"%SYSTEM_PY%" --version >nul 2>&1
if errorlevel 1 (
  echo [ERROR] Python 3.10+ not found. Install it from https://www.python.org/downloads/
  pause
  exit /b 1
)
if not exist ".venv\Scripts\python.exe" (
  "%SYSTEM_PY%" -m venv .venv
  if errorlevel 1 goto :failed
)
set "PYEXE=%~dp0.venv\Scripts\python.exe"
"%PYEXE%" -m pip install --upgrade pip
if errorlevel 1 goto :failed
"%PYEXE%" -m pip install -r requirements.txt
if errorlevel 1 goto :failed

echo [2/5] Checking Node.js...
where node >nul 2>&1
if errorlevel 1 (
  echo [ERROR] Node.js 18+ not found. Install it from https://nodejs.org/
  pause
  exit /b 1
)
where npm >nul 2>&1
if errorlevel 1 (
  echo [ERROR] npm not found. Reinstall Node.js with npm enabled.
  pause
  exit /b 1
)
pushd "integrations\runtime"
call npm ci
if errorlevel 1 (popd & goto :failed)
popd
set "LOCAL_NODE_DIR=%~dp0integrations\runtime\node_modules\node\bin"
if not exist "%LOCAL_NODE_DIR%\node.exe" (
  echo [ERROR] Failed to install the project-local Node.js 22 runtime.
  goto :failed
)
set "PATH=%LOCAL_NODE_DIR%;%PATH%"
node --version

echo [3/5] Installing LocalMiniDrama backend and frontend...
if not exist "integrations\LocalMiniDrama\backend-node\configs\config.yaml" (
  copy /Y "integrations\LocalMiniDrama\backend-node\configs\config.example.yaml" "integrations\LocalMiniDrama\backend-node\configs\config.yaml" >nul
)
pushd "integrations\LocalMiniDrama\backend-node"
call npm ci
if errorlevel 1 (popd & goto :failed)
popd
pushd "integrations\LocalMiniDrama\frontweb"
call npm ci
if errorlevel 1 (popd & goto :failed)
call npm run build
if errorlevel 1 (popd & goto :failed)
popd

echo [4/5] Building White Model...
pushd "third_party\shot-composer"
call npm ci
if errorlevel 1 (popd & goto :failed)
call npm run build
if errorlevel 1 (popd & goto :failed)
popd
powershell -NoProfile -ExecutionPolicy Bypass -Command "Copy-Item -LiteralPath '%~dp0third_party\shot-composer\dist\index.html' -Destination '%~dp0static\white-model\index.html' -Force; Copy-Item -LiteralPath '%~dp0third_party\shot-composer\dist\library.html' -Destination '%~dp0static\white-model\library.html' -Force; Copy-Item -LiteralPath '%~dp0third_party\shot-composer\dist\help.html' -Destination '%~dp0static\white-model\help.html' -Force; Copy-Item -Path '%~dp0third_party\shot-composer\dist\assets' -Destination '%~dp0static\white-model' -Recurse -Force"
if errorlevel 1 goto :failed

echo [5/5] Environment ready.
echo Run 启动服务.bat for Intelligent Canvas.
echo Run 启动短剧服务.bat for LocalMiniDrama.
pause
exit /b 0

:failed
echo [ERROR] Initialization failed. Review the output above.
pause
exit /b 1
