#!/bin/bash
set -e
cd "$(dirname "$0")"

if ! command -v python3 >/dev/null 2>&1; then
  echo "错误：找不到 Python 3.10+"
  exit 1
fi
if ! command -v npm >/dev/null 2>&1; then
  echo "错误：找不到 Node.js 18+ / npm"
  exit 1
fi

if [ ! -x .venv/bin/python3 ]; then
  python3 -m venv .venv
fi
.venv/bin/python3 -m pip install --upgrade pip
.venv/bin/python3 -m pip install -r requirements.txt

(cd integrations/runtime && npm ci)
export PATH="$PWD/integrations/runtime/node_modules/node/bin:$PATH"
node --version

if [ ! -f integrations/LocalMiniDrama/backend-node/configs/config.yaml ]; then
  cp integrations/LocalMiniDrama/backend-node/configs/config.example.yaml \
    integrations/LocalMiniDrama/backend-node/configs/config.yaml
fi

(cd integrations/LocalMiniDrama/backend-node && npm ci)
(cd integrations/LocalMiniDrama/frontweb && npm ci && npm run build)
(cd third_party/shot-composer && npm ci && npm run build)

cp third_party/shot-composer/dist/index.html static/white-model/index.html
cp third_party/shot-composer/dist/library.html static/white-model/library.html
cp third_party/shot-composer/dist/help.html static/white-model/help.html
cp -R third_party/shot-composer/dist/assets static/white-model/

echo "环境初始化完成。现在可以运行 mac-启动服务.command。"
