#!/usr/bin/env bash
# Loads a database dump and uploaded files into the server (replaces what is there now).
#   sudo bash deploy/restore.sh cubickedu.dump uploads.tar.gz
set -euo pipefail
cd "$(dirname "$0")/.."

dump=${1:?Укажите файл .dump}
uploads=${2:-}

read -rp "Все текущие данные на сервере будут заменены. Продолжить? (yes/no) " answer
[ "$answer" = "yes" ] || exit 1

# Safety copy of what is there now
docker compose run --rm --entrypoint sh backup /backup.sh || true

docker compose stop app
docker compose exec -T db pg_restore -U cubick -d cubickedu --clean --if-exists --no-owner --no-privileges < "$dump"

if [ -n "$uploads" ]; then
  find data/uploads -mindepth 1 -delete 2>/dev/null || true
  mkdir -p data/uploads
  tar xzf "$uploads" -C data
fi

docker compose start app
echo "Готово. Сайт перезапускается, через минуту можно входить со старыми логинами."
