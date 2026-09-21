# Logs

Changelog técnico, append-only, mais recente primeiro. Ver `.cursor/rules/20-logging.mdc` para o
formato exigido.

## 2026-09-21 (4)
Fase 2 (Batalha Naval) + o que restava da Fase 1 que dependia de haver jogo. **Backend**:
modelo genérico `GameInstance`/`GameParticipant` (`games/models.py`) com autoridade de
configuração calculada pelo menor `seat` entre jogadores ainda `is_connected`; motor puro em
`games/battleship/engine.py` (config, frota, tiro, afundar, vitória, serialização filtrada por
jogador — navios do oponente só aparecem depois de afundar). Endpoints REST em
`/api/rooms/<code>/games/` (criar/listar/entrar/configurar/frota/tiro/revanche), autenticados
pelo cabeçalho `X-Player-Token` (`rooms/auth.py`). `RoomConsumer` em `ws/rooms/<code>/` +
`broadcast_room_event` avisam a sala a cada mudança; o WS não carrega estado. `daphne` passou
a ser o primeiro `INSTALLED_APPS` para o `runserver` servir ASGI. CORS libera o header
`x-player-token`. **Frontend**: lobby lista instâncias e cria Batalha Naval; página
`/sala/[code]/batalha-naval/[instanceId]` com config, posicionamento (clique+rotação), dois
tabuleiros, tiros e revanche; cliente WS em `lib/roomSocket.ts` rebusca REST ao receber evento.
77 testes backend / 33 frontend passando. Fica pendente a expiração 1h e pausa/W.O. por
desconexão (não ligamos presença ao connect/disconnect do WS ainda).

## 2026-09-21 (3)
Correção de bug de hidratação no lobby, ajustes de DX no VS Code e Swagger na API.
**Hydration fix**: `frontend/components/RoomLobby.tsx` inicializava o estado `player` lendo o
`localStorage` de forma síncrona no `useState` (lazy initializer) — isso faz o servidor (sem
`window`) e a primeira renderização do cliente divergirem quando já existe jogador salvo,
causando o erro de hydration mismatch do React/Next. Corrigido: `player` agora começa `null`
(igual nos dois lados) e só é lido do storage num `useEffect`, depois de montar. Suíte de
testes (19) segue passando sem alteração. **`.vscode/tasks.json`**: logs do `docker compose`
separados por serviço ("Docker: Ver logs (backend|frontend|postgres)", cada um em painel próprio,
em vez de só um log combinado de tudo); nova task "Backend: Criar superusuário (admin)"
(`manage.py createsuperuser` via `docker compose exec`). **Swagger/OpenAPI**: adicionado
`drf-spectacular` (`backend/requirements.txt`); schema em `/api/schema/`, UI em `/api/docs/`,
ambos públicos por padrão (`SPECTACULAR_SETTINGS` em `config/settings.py`, rotas em
`config/urls.py`). Como as views de `rooms/views.py` são `APIView` simples (sem
`serializer_class`), cada uma ganhou `@extend_schema` com `request`/`responses` explícitos; foi
criado `CreatedRoomSerializer` em `rooms/serializers.py` só para documentar o formato combinado
`{room, player}` da resposta de criação de sala (a view continua montando esse dict manualmente).
`config/views.py::health_check` foi convertido de `JsonResponse` puro para `@api_view` do DRF
para aparecer no schema também (contrato da resposta não mudou). Testes novos (TDD, vistos
falhando antes por falta de `drf-spectacular`/rotas) em `config/tests/test_api_docs.py`,
verificando que o schema lista as rotas de `rooms` e que `/api/docs/` responde. Suíte do backend
(19 testes) e `ruff` seguem passando.

## 2026-09-21 (2)
Migração do fluxo de dev local para Docker e consolidação de `.env` num único arquivo na raiz,
a pedido do usuário. **Docker**: `backend/Dockerfile` (python:3.13-slim, entrypoint
`docker-entrypoint.sh` que roda `migrate` e liga `debugpy` em 0.0.0.0:5678 se
`DJANGO_DEBUGPY=1`) e `frontend/Dockerfile` (node:22-alpine, liga o inspector do Node em
0.0.0.0:9229 se `NODE_DEBUGGER=1`). `docker-compose.yml` agora sobe `postgres` + `backend` +
`frontend` com bind mount do código (hot reload) e `depends_on: condition: service_healthy` no
Postgres; o `backend` sobrescreve `POSTGRES_HOST` para `postgres` (nome do serviço), já que o
`.env` usa `localhost` como valor pensado para rodar sem Docker. **`.env` único**: removidos
`backend/.env.example` e `frontend/.env.example`, criado `.env.example` na raiz com todas as
variáveis. `backend/config/settings.py` agora lê `REPO_ROOT / ".env"` em vez de
`BASE_DIR / ".env"`. `frontend/next.config.ts` carrega esse mesmo `.env` raiz via
`@next/env` (`loadEnvConfig` com `forceReload=true` — sem isso, a chamada do próprio Next.js
antes de carregar `next.config.ts` deixa em cache um resultado vazio para `frontend/`, e a nossa
chamada seria ignorada; validado manualmente comparando o bundle gerado por `npm run build` com e
sem essa flag). **VS Code**: `.vscode/tasks.json` (subir/derrubar ambiente, testes, lint,
migrations) e `.vscode/launch.json` (attach ao backend via debugpy e ao frontend via inspector do
Node, ambos nos containers, + debug de cliente via Chrome) — `.gitignore` deixou de ignorar
`.vscode/`, já que esses dois arquivos são de propósito compartilhados pela equipe. `debugpy`
adicionado a `backend/requirements.txt`. READMEs (raiz, `backend/`, `frontend/`) reescritos para
Docker como caminho recomendado, com "Sem Docker" como alternativa. Suítes de teste de backend
(17) e frontend (19) seguem passando; não foi possível validar `docker compose up` de fato nesta
sessão (sandbox sem daemon Docker rodando) — validado apenas `docker compose config` (sintaxe) e
os Dockerfiles foram revisados manualmente.

## 2026-09-21 (1)
Início da Fase 1 (`mvp.md`) — núcleo de salas, seguindo TDD (teste escrito e visto falhar antes de
cada implementação). **Backend**: modelos `Room` (código curto sem caracteres ambíguos,
gerado em `rooms/models.py::generate_room_code`) e `Player` (nome único por sala,
case-insensitive, token UUID como credencial do jogador — sem conta/login). Endpoints REST em
`rooms/views.py` + `rooms/urls.py`, montados em `config/urls.py` sob `/api/`: `POST /api/rooms/`
(cria sala + primeiro jogador), `POST /api/rooms/<code>/players/` (entrar em sala existente),
`GET /api/rooms/<code>/` (lobby — lista de jogadores, sem expor tokens). Admin do Django
registrado para `Room`/`Player`. 16 testes novos em `rooms/tests/` (`test_create_room.py`,
`test_join_room.py`, `test_room_lobby.py`), todos passando; `ruff` limpo. Fluxo validado
manualmente também via `curl` com CORS de `http://localhost:3000`. **Frontend**: cliente de API
tipado em `lib/api.ts` (com `ApiError`) e `lib/playerStorage.ts` (token do jogador no
`localStorage`, por sala), ambos com testes unitários. Componentes `components/CreateRoomForm.tsx`
(na home, substitui o botão "em breve") e `components/RoomLobby.tsx` (nova rota
`app/sala/[code]/page.tsx`) — mostram formulário de nome quando não há token guardado para a
sala, e a lista de jogadores + link de convite copiável quando já há. Testados com Testing
Library, mockando `lib/api`/`lib/playerStorage`/`next/navigation`. Corrigido um lint novo do
`eslint-config-next` (`react-hooks/set-state-in-effect`) usando o padrão de efeito com flag de
cancelamento (`ignore`) recomendado pela documentação do React, em vez de chamar uma função
que atualiza estado diretamente no corpo do efeito. **Pendente da Fase 1** (ver checkboxes em
`mvp.md`): lista de jogos/instâncias no lobby, autoridade de configuração, sincronização em tempo
real via Channels (hoje a sala é só REST) e expiração/pausa por desconexão — todos dependem de
haver ao menos um jogo (Fase 2) ou do consumer de sala real substituir o `EchoConsumer` de prova
de conceito.

## 2026-09-20 (3)
Fase 0 do `mvp.md` concluída. **Frontend** (`frontend/`): Next.js 16 (App Router) + TypeScript,
Material UI v9 com tema customizado em `theme/palette.ts` e `theme/theme.ts` (paleta e tipografia
de `visual.md`, Cormorant via `next/font/google` para títulos e Lora para texto corrido),
Tailwind removido do scaffold padrão do create-next-app, assets de `architecture_docs/assets/`
copiados para `public/images/`, favicon gerado a partir do logo. Testado com Vitest + React
Testing Library (`theme/theme.test.ts`, `app/page.test.tsx`); `npm run build`/`lint`/`test`
passando. **Backend** (`backend/`): Django 6.1 + DRF + Django Channels + Daphne, apps `rooms`
(WebSocket de eco em `rooms/consumers.py` + `rooms/routing.py`, como prova de conceito do
Channels) e `games` (com subpacotes vazios `chess/`, `coup/`, `battleship/`, cada um já com
`tests/`, prontos para a Fase 2 em diante). `config/settings.py` lê tudo de variáveis de ambiente
(`.env`), com fallback para SQLite quando `POSTGRES_DB` não está definido. Testes com
pytest + pytest-django + pytest-asyncio (`rooms/tests/test_consumers.py`,
`config/tests/test_health.py`, escritos antes da implementação). Lint/format com ruff
(`pyproject.toml`). **Infra**: `docker-compose.yml` na raiz para Postgres local opcional;
`.env.example` em `frontend/` e `backend/`; `README.md` raiz atualizado com instruções reais de
setup. Nenhuma regra de jogo ou fluxo de sala foi implementada — isso é Fase 1 em diante.

## 2026-09-20 (2)
Incorporadas as respostas da primeira rodada de `questions.md` em `idea.md`, `stack.md` e
`mvp.md` (Django Channels confirmado, persistência híbrida cache+snapshot, expiração de sala em
1h, regra de reconexão/W.O., múltiplas instâncias por jogo com espectador, username por sala,
sala ilimitada, features do modo assistido do Xadrez, config flexível do Coup, lista de jogos
futuros). `visual.md` reescrito com as decisões visuais confirmadas (paleta com hex definitivo,
tipografia Cormorant/Lora, tom de voz, referência estética). Gerados assets em
`architecture_docs/assets/`: logo vetorizado via traçado automático (potrace) a partir de
`logo.png`, em SVG e PNG com fundo transparente (`assets/logo/`), e três ilustrações de capa de
jogo em estilo vetorial consistente para Xadrez, Coup e Batalha Naval (`assets/game-covers/`,
geradas via modelo de imagem). `questions.md` marcado como resolvido para a primeira rodada.

## 2026-09-20 (1)
Bootstrap da documentação de arquitetura do projeto: criados `.cursor/rules/00-project-context.mdc`,
`10-workflow.mdc`, `20-logging.mdc`, `90-commits.mdc`, `.cursor/BUGBOT.md`, `.cursor/skills/README.md`
e todo o conteúdo de `architecture_docs/` (`idea.md`, `stack.md`, `mvp.md`, `visual.md`,
`questions.md`, `tests.md`, este `logs.md`) e `README.md`. `.gitignore` atualizado para versionar
`architecture_docs/` e `.cursor/` (antes ignorados) e para incluir ignores preventivos de
Next.js/Django/Postgres, já que o código dessas stacks ainda não existe no repositório. Nenhum
código de frontend/backend foi criado nesta sessão — escopo definido como documentação/regras
apenas.
