#!/usr/bin/env bash
# Rebuilds and restarts the site after new project files were copied to the server.
#   sudo bash deploy/update.sh
set -euo pipefail
cd "$(dirname "$0")/.."

docker compose run --rm --entrypoint sh backup /backup.sh
docker compose up -d --build
docker image prune -f >/dev/null
echo "Обновлено."
