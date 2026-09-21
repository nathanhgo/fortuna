# Fortuna — backend

Django + Django Rest Framework + Django Channels. Ver o [`README.md`](../README.md) na raiz do
repositório para visão geral do projeto, e `../architecture_docs/stack.md` para decisões de stack.

## Rodando com Docker (recomendado)

Ver o [`README.md`](../README.md) da raiz — `docker compose up --build` sobe Postgres + backend +
frontend juntos. O `.env` é único, na raiz do repositório (`../.env`, a partir de `../.env.example`),
não um `.env` por serviço.

Comandos do dia a dia com o container já rodando:

```bash
docker compose exec backend python -m pytest    # suíte de testes
docker compose exec backend ruff check .        # lint
docker compose exec backend ruff format .       # formatação
docker compose exec backend python manage.py makemigrations
docker compose exec backend python manage.py shell
```

Todos esses também existem como tasks do VS Code em `../.vscode/tasks.json`. Para debugar com
breakpoints dentro do container, defina `DJANGO_DEBUGPY=1` no `.env`, reinicie o serviço
(`docker compose up -d --build backend`) e use a config "Backend: Attach ao Django (Docker)" em
`../.vscode/launch.json`.

## Sem Docker

Também funciona rodando direto na máquina, com um virtualenv:

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver    # http://localhost:8000

pytest                        # suíte de testes
ruff check .                  # lint
ruff format .                 # formatação
```

O backend lê o `.env` da raiz do repositório (`../.env`) automaticamente (ver
`config/settings.py`); se ele não existir, ou se as variáveis `POSTGRES_*` não estiverem lá, o
projeto cai para SQLite local — não é obrigatório ter Postgres rodando pra desenvolver, mas o
padrão do projeto é Postgres via Docker.

## Endpoints (Fase 1)

- `POST /api/rooms/` — cria uma sala e o primeiro jogador dela (`display_name` obrigatório).
- `POST /api/rooms/<code>/players/` — entra numa sala existente (`display_name` único na sala,
  case-insensitive).
- `GET /api/rooms/<code>/` — dados da sala e lista de jogadores (lobby).
- `GET /api/health/` — smoke test simples.
- `GET|POST /api/rooms/<code>/games/` — lista/cria instâncias de jogo na sala.
- `GET /api/rooms/<code>/games/<id>/` — detalhe (tabuleiro filtrado por jogador).
- `POST /api/rooms/<code>/games/<id>/join/` — entra como jogador ou espectador.
- `PATCH /api/rooms/<code>/games/<id>/config/` — configuração (só a autoridade).
- `POST /api/rooms/<code>/games/<id>/fleet/` — posiciona a frota (Batalha Naval).
- `POST /api/rooms/<code>/games/<id>/shots/` — atira (Batalha Naval).
- `POST /api/rooms/<code>/games/<id>/rematch/` — cria revanche.
- `ws://.../ws/rooms/<code>/` — eventos da sala (`room_updated`, `game_created`, `game_updated`).
- `ws://.../ws/echo/` — prova de conceito do Django Channels (devolve o que recebe).

## Documentação da API (Swagger)

Com o backend rodando, `http://localhost:8000/api/docs/` mostra o Swagger UI com todas as rotas
acima (exceto o WebSocket, que não é HTTP/REST). O schema OpenAPI bruto fica em
`/api/schema/`. Gerado automaticamente via `drf-spectacular` a partir das views e serializers —
toda view nova em `rooms/views.py` (ou futuros apps) deve ter um `@extend_schema` com
`request`/`responses` explícitos, já que são `APIView` simples (sem `serializer_class`), então o
drf-spectacular não infere isso sozinho.

## Estrutura

- `config/` — configuração do projeto Django (settings, urls, asgi/wsgi).
- `rooms/` — sala, jogadores, convite, WebSocket de sala (`consumers.py`, `routing.py`).
- `games/` — um subpacote por jogo (`chess/`, `coup/`, `battleship/`), cada um com seu próprio
  `engine.py` (regras puras, sem Django) e `tests/`. Ver `../architecture_docs/stack.md`.

Todo teste é escrito antes da implementação correspondente — ver
`../.cursor/rules/10-workflow.mdc`. Os dois primeiros testes deste projeto
(`rooms/tests/test_consumers.py`, `config/tests/test_health.py`) servem de prova de conceito de
que o Django Channels e o pipeline de teste estão funcionando antes de qualquer regra de jogo
real ser implementada.
