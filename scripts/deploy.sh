#!/usr/bin/env bash
set -euo pipefail

SERVER_IP="root@93.183.71.133"
SSH_PASSWORD="0ad3b8d171436d!"
SSH_PORT="${SSH_PORT:-22}"
REMOTE_DIR="/root/diplom"
COMPOSE_FILE="docker-compose.prod.yaml"
COMPOSE_CMD="docker compose -f $COMPOSE_FILE"

BACKEND_PORT=18500
FRONTEND_PORT=18501

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

SSHPASS_BIN=""
for p in /usr/bin/sshpass /opt/homebrew/bin/sshpass /usr/local/bin/sshpass; do
  [[ -x "$p" ]] && SSHPASS_BIN="$p" && break
done
[[ -z "$SSHPASS_BIN" ]] && SSHPASS_BIN="$(command -v sshpass 2>/dev/null || true)"
[[ -z "$SSHPASS_BIN" ]] && { echo "Ошибка: sshpass не найден"; exit 1; }

RSYNC_SSH="$SSHPASS_BIN -p $SSH_PASSWORD ssh -o StrictHostKeyChecking=accept-new -o ConnectTimeout=30 -p $SSH_PORT"
SSH_CMD="$SSHPASS_BIN -p $SSH_PASSWORD ssh -o StrictHostKeyChecking=accept-new -o ConnectTimeout=30 -p $SSH_PORT"

echo "=== Деплой CraftSphere (diplom) ==="
echo "Сервер:    $SERVER_IP"
echo "Remote:    $REMOTE_DIR"
echo "Backend:   :$BACKEND_PORT"
echo "Frontend:  :$FRONTEND_PORT"
echo ""

echo "--- preflight: docker на сервере ---"
if ! $SSH_CMD "$SERVER_IP" "command -v docker >/dev/null 2>&1 && docker compose version >/dev/null 2>&1"; then
  echo "Ошибка: на сервере не найден docker compose"
  exit 1
fi

echo "--- подготовка удалённого каталога ---"
$SSH_CMD "$SERVER_IP" "mkdir -p \"$REMOTE_DIR\""

echo "--- проверка занятости портов (повторный деплой: порты текущего compose не считаются занятыми) ---"
$SSH_CMD "$SERVER_IP" "export REMOTE_DIR=\"$REMOTE_DIR\" COMPOSE_FILE=\"$COMPOSE_FILE\" BACKEND_PORT=\"$BACKEND_PORT\" FRONTEND_PORT=\"$FRONTEND_PORT\"; python3 - <<'PY'
import json
import os
import re
import subprocess
import sys

required = [int(os.environ[\"BACKEND_PORT\"]), int(os.environ[\"FRONTEND_PORT\"])]
remote_dir = os.environ[\"REMOTE_DIR\"]
compose_file = os.environ[\"COMPOSE_FILE\"]

out = subprocess.check_output([\"ss\", \"-tuln\"], text=True)
used = set()
for line in out.splitlines()[1:]:
    parts = line.split()
    if len(parts) < 5:
        continue
    p = parts[4].rsplit(\":\", 1)[-1]
    if p.isdigit():
        used.add(int(p))

owned = set()
try:
    ps = subprocess.check_output(
        [\"docker\", \"compose\", \"-f\", compose_file, \"ps\", \"--format\", \"json\"],
        text=True,
        cwd=remote_dir,
    )
    for line in ps.splitlines():
        line = line.strip()
        if not line:
            continue
        row = json.loads(line)
        for pub in row.get(\"Publishers\") or []:
            p = pub.get(\"PublishedPort\")
            if isinstance(p, int):
                owned.add(p)
        ports_str = row.get(\"Ports\") or \"\"
        for m in re.finditer(r':(\d+)->', ports_str):
            owned.add(int(m.group(1)))
except Exception:
    pass

busy = [p for p in required if p in used and p not in owned]
if busy:
    print(\"Ошибка: порты заняты (не наш stack) -> \" + \", \".join(map(str, busy)))
    sys.exit(2)
print(\"Порты OK (учтён текущий docker compose в \" + remote_dir + \")\")
PY
"

echo "--- rsync проекта ---"
rsync -avz --delete -e "$RSYNC_SSH" \
  --exclude '.git' \
  --exclude '.venv' \
  --exclude 'venv' \
  --exclude '__pycache__' \
  --exclude '*.pyc' \
  --exclude 'node_modules' \
  --exclude 'dist' \
  --exclude '.cursor' \
  --exclude '*.pdf' \
  --exclude 'gen_presentation.js' \
  --exclude 'speech_notes.md' \
  "$PROJECT_ROOT/" \
  "$SERVER_IP:$REMOTE_DIR/"

echo "--- запуск compose ---"
# DIPLOM_NO_CACHE=1 — пересобрать backend без кэша Docker (после смены requirements / если образ «залип»)
if [[ "${DIPLOM_NO_CACHE:-0}" == "1" ]]; then
  $SSH_CMD "$SERVER_IP" "cd \"$REMOTE_DIR\" && $COMPOSE_CMD build --no-cache backend"
fi
$SSH_CMD "$SERVER_IP" "cd \"$REMOTE_DIR\" && $COMPOSE_CMD up -d --build --remove-orphans"

echo "--- ожидание старта (10 сек) ---"
sleep 10

echo "--- проверка здоровья backend ---"
$SSH_CMD "$SERVER_IP" "curl -fsS http://127.0.0.1:$BACKEND_PORT/health"

echo ""
echo "--- проверка доступности frontend ---"
$SSH_CMD "$SERVER_IP" "curl -fsS http://127.0.0.1:$FRONTEND_PORT/ >/dev/null && echo 'Frontend OK'"

echo ""
echo "========================================="
echo "Деплой завершён успешно!"
echo "Frontend: http://93.183.71.133:$FRONTEND_PORT"
echo "Backend:  http://93.183.71.133:$BACKEND_PORT"
echo "API Docs: http://93.183.71.133:$BACKEND_PORT/docs"
echo "========================================="
