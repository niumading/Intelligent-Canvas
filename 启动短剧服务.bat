@echo off
chcp 65001 >nul
setlocal
set "ROOT=%~dp0"
set "BACKEND=%ROOT%integrations\LocalMiniDrama\backend-node"
set "FRONTEND=%ROOT%integrations\LocalMiniDrama\frontweb"
cd /d "%BACKEND%"

set "NODE_EXE=%ROOT%integrations\runtime\node_modules\node\bin\node.exe"
if not exist "%NODE_EXE%" set "NODE_EXE=node"
"%NODE_EXE%" --version >nul 2>&1
if errorlevel 1 (
  echo [ERROR] Node.js runtime not found. Run 初始化环境.bat first.
  pause
  exit /b 1
)

if not exist "configs\config.yaml" (
  if not exist "configs\config.example.yaml" (
    echo [ERROR] Missing configs\config.example.yaml
    pause
    exit /b 1
  )
  copy /Y "configs\config.example.yaml" "configs\config.yaml" >nul
)

if not exist "node_modules" (
  echo [ERROR] Backend dependencies are missing. Run 初始化环境.bat first.
  pause
  exit /b 1
)
if not exist "%FRONTEND%\dist\index.html" (
  echo [ERROR] Frontend build is missing. Run 初始化环境.bat first.
  pause
  exit /b 1
)

set "PORT=5680"
echo Starting LocalMiniDrama at http://127.0.0.1:5680/
start "" /b cmd /c "timeout /t 3 /nobreak >nul && start http://127.0.0.1:5680/"
"%NODE_EXE%" src\server.js

echo.
echo Server stopped.
pause

