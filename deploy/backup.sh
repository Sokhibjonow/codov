#!/bin/sh
# Backup of the database and uploaded files into data/backups.
#   sh /backup.sh        — one backup now
#   sh /backup.sh loop   — every night at ~03:00 (used by the "backup" service)
set -eu

backup() {
  stamp=$(date +%Y-%m-%d_%H%M)
  pg_dump -Fc -f "/backups/db_$stamp.dump"
  tar czf "/backups/uploads_$stamp.tar.gz" -C /data uploads
  find /backups -type f -mtime +"${KEEP_DAYS:-14}" -delete
  echo "backup $stamp done"
}

if [ "${1:-}" != "loop" ]; then
  backup
  exit 0
fi

while true; do
  now=$(date +%s)
  next=$(date -d "$(date +%Y-%m-%d) 03:00" +%s 2>/dev/null || echo $((now + 86400)))
  [ "$next" -le "$now" ] && next=$((next + 86400))
  sleep $((next - now))
  backup || echo "backup failed"
done
