#!/usr/bin/env bash
# First installation of CubickEdu on a clean Ubuntu 22.04/24.04 server.
# Run from the project folder:  sudo bash deploy/install.sh
set -euo pipefail
cd "$(dirname "$0")/.."

if [ "$(id -u)" -ne 0 ]; then
  echo "Запустите через sudo: sudo bash deploy/install.sh"
  exit 1
fi

echo "== 1/5 Docker"
if ! command -v docker >/dev/null 2>&1; then
  apt-get update
  apt-get install -y docker.io docker-compose-v2
  systemctl enable --now docker
fi

echo "== 2/5 Firewall (SSH, HTTP, HTTPS)"
if iptables -S INPUT 2>/dev/null | grep -q -- "-j REJECT"; then
  # Oracle Cloud Ubuntu images block everything except SSH with iptables (ufw must stay off there)
  for port in 80 443; do
    iptables -C INPUT -p tcp --dport "$port" -j ACCEPT 2>/dev/null || iptables -I INPUT 1 -p tcp --dport "$port" -j ACCEPT
  done
  iptables -C INPUT -p udp --dport 443 -j ACCEPT 2>/dev/null || iptables -I INPUT 1 -p udp --dport 443 -j ACCEPT
  command -v netfilter-persistent >/dev/null 2>&1 && netfilter-persistent save >/dev/null
elif command -v ufw >/dev/null 2>&1; then
  ufw allow OpenSSH >/dev/null
  ufw allow 80/tcp >/dev/null
  ufw allow 443 >/dev/null
  ufw --force enable >/dev/null
fi

echo "== 3/5 Settings (.env)"
if [ ! -f .env ]; then
  read -rp "Домен сайта (например edu.cubick.uz): " domain
  read -rsp "Ключ Google Gemini (можно оставить пустым): " gemini
  echo
  cat > .env <<ENV
DOMAIN=${domain}
POSTGRES_PASSWORD=$(openssl rand -hex 24)
SESSION_SECRET=$(openssl rand -hex 32)
GEMINI_API_KEY=${gemini}
GEMINI_MODEL=
BACKUP_KEEP_DAYS=14
ENV
  chmod 600 .env
  echo ".env создан"
else
  echo ".env уже есть — оставляю как есть"
fi

echo "== 4/5 Build and start (first time takes 5–10 minutes)"
mkdir -p data/uploads data/backups
docker compose up -d --build

echo "== 5/5 Waiting for the site"
for _ in $(seq 1 60); do
  if docker compose exec -T app node -e "fetch('http://localhost:3000/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))" 2>/dev/null; then
    echo "Сайт запущен: https://$(grep '^DOMAIN=' .env | cut -d= -f2)"
    echo
    echo "Если переносите данные с компьютера:  sudo bash deploy/restore.sh <файл .dump> <файл uploads.tar.gz>"
    echo "Если начинаете с нуля, создайте аккаунт преподавателя:  sudo docker compose exec app npm run create-admin"
    exit 0
  fi
  sleep 5
done
echo "Сайт не ответил за 5 минут. Журнал:  sudo docker compose logs app --tail 100"
exit 1
