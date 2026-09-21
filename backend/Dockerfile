# Imagem de desenvolvimento — roda `manage.py runserver` com o código montado via bind mount
# (docker-compose.yml), então mudanças no host refletem sem rebuild. Não é otimizada para
# produção (isso ainda não é uma preocupação nesta fase do projeto).
FROM python:3.13-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app

# libpq-dev é necessário para compilar/rodar o driver do Postgres (psycopg).
RUN apt-get update \
    && apt-get install -y --no-install-recommends libpq-dev \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

RUN chmod +x docker-entrypoint.sh

EXPOSE 8000 5678

ENTRYPOINT ["./docker-entrypoint.sh"]
CMD ["python", "manage.py", "runserver", "0.0.0.0:8000"]
