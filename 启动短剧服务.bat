@echo off
chcp 65001 >nul
setlocal
cd /d "%~dp0integrations\LocalMiniDrama\backend-node"
set "PORT=5680"
set "NODE_EXE=%~dp0integrations\runtime\node_modules\node\bin\node.exe"
if not exist "%NODE_EXE%" (
  echo [ERROR] Project-local Node.js runtime not found:
  echo %NODE_EXE%
  pause
  exit /b 1
)
echo Starting LocalMiniDrama at http://127.0.0.1:5680/
"%NODE_EXE%" src\server.js

