#!/bin/sh
set -e

# O docker-compose só inicia este container quando o healthcheck do Postgres já está OK
# (depends_on: condition: service_healthy), então não precisamos de um wait-loop aqui.
python manage.py migrate --noinput

if [ "$DJANGO_DEBUGPY" = "1" ]; then
    echo "Iniciando com debugpy em 0.0.0.0:5678 (ver .vscode/launch.json)"
    # --noreload: o autoreloader do Django cria um subprocesso que o debugger não acompanha.
    exec python -m debugpy --listen 0.0.0.0:5678 manage.py runserver 0.0.0.0:8000 --noreload
fi

exec "$@"
