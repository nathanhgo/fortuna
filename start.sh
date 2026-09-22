#!/usr/bin/env bash
set -euo pipefail

# Funciona com Root Directory na raiz do repo ou em backend/.
ROOT="$(cd "$(dirname "$0")" && pwd)"
if [ -f "$ROOT/backend/manage.py" ]; then
  cd "$ROOT/backend"
elif [ -f "$ROOT/manage.py" ]; then
  cd "$ROOT"
else
  echo "Não achei manage.py (esperado em backend/ ou no diretório atual)." >&2
  exit 1
fi

python manage.py migrate --noinput
python manage.py collectstatic --noinput
exec daphne -b 0.0.0.0 -p "${PORT:-8000}" config.asgi:application
