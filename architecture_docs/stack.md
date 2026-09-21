# Stack — Fortuna

Este documento é a fonte da verdade sobre a stack. Sempre que a stack evoluir (nova lib, troca de
ferramenta, decisão revertida), **atualize este arquivo antes de qualquer outro documento**.

## Real (o que existe implementado hoje)

- **Frontend** (`frontend/`): Next.js 16 (App Router) + TypeScript + React 19, Material UI
  **v9** (versão confirmada — mais recente que o v6/v7 documentado quando este projeto começou;
  mantida conscientemente, sem downgrade). Tema customizado em `theme/` com a paleta e tipografia
  de `visual.md`. Testes com Vitest + React Testing Library.
- **Backend** (`backend/`): Django 6.1 + Django Rest Framework + Django Channels + Daphne. Apps
  `rooms` (sala/jogadores) e `games` (subpacotes `chess/`, `coup/`, `battleship/`, ainda vazios).
  Testes com pytest + pytest-django + pytest-asyncio. Lint/format com ruff. Documentação da API
  via **drf-spectacular** (OpenAPI/Swagger) — schema em `/api/schema/`, UI em `/api/docs/`, ambos
  abertos por padrão (sem login). Views são `APIView` simples, então cada uma precisa de
  `@extend_schema` explícito (`request`/`responses`) em vez de inferência automática.
- **Banco de dados**: Postgres via `docker-compose.yml` (opcional em dev sem Docker — fallback
  automático para SQLite quando o `.env` não define `POSTGRES_DB`).
- **Ambiente de dev**: Docker Compose é o jeito recomendado de rodar o projeto — `docker-compose.yml`
  na raiz sobe `postgres` + `backend` + `frontend` com hot reload (bind mount do código).
  `backend/Dockerfile` e `frontend/Dockerfile` são imagens de dev, não otimizadas para produção.
  Rodar sem Docker (venv local / `npm run dev`) continua funcionando como alternativa — ver
  `backend/README.md` e `frontend/README.md`.
- **Variáveis de ambiente**: um único `.env` na raiz do repositório (a partir de `.env.example`),
  compartilhado por backend, frontend e docker-compose — não um `.env` por serviço. O backend lê
  esse arquivo via `python-dotenv` apontando para a raiz (`config/settings.py`); o frontend via
  `@next/env` carregado explicitamente em `next.config.ts` (o carregamento automático do Next.js
  só olha a própria pasta do serviço, por isso o carregamento manual é necessário). Ao rodar via
  Docker, as variáveis já chegam prontas no ambiente do container via `env_file` do compose.
- **VS Code**: `.vscode/tasks.json` (subir/derrubar o ambiente, rodar testes/lint/migrations) e
  `.vscode/launch.json` (attach de debugger no backend via debugpy e no frontend via inspector do
  Node, ambos dentro dos containers) são versionados de propósito — não são configuração pessoal.

## Aspiracional (decidido, ainda não implementado)

### Frontend

- **Next.js** (App Router) + **React** + **TypeScript**.
- **Material UI (MUI)** como biblioteca de componentes, com tema customizado (cores, tipografia)
  em vez dos defaults do MUI — ver `visual.md`.
- Testes: **Vitest** (ou Jest) + **React Testing Library**.
- Comunicação em tempo real com o backend: WebSockets (via Django Channels no backend — ver
  abaixo) para estado de jogo/sala; REST (via DRF) para operações que não precisam de tempo real
  (ex.: criar sala, buscar configuração inicial).

### Backend

- **Django** + **Django Rest Framework (DRF)** para a API REST.
- **Django Channels** para WebSockets — confirmado como a opção de tempo real do projeto (é a
  opção nativa da stack; ninguém no time tem experiência prévia, então a Fase 0 do `mvp.md` inclui
  aprender/validar isso com uma prova de conceito simples antes de depender dele para os jogos).
  Channel layer em desenvolvimento: memória local (`InMemoryChannelLayer`) é suficiente para um
  processo só; Redis só entra se/quando o projeto precisar de múltiplos processos/workers (a
  confirmar quando chegar a hora — ver `questions.md`).
- Motores de jogo (regras de Xadrez, Coup, Batalha Naval) como módulos Python isolados da camada
  HTTP/WebSocket, testáveis sem precisar de request/response (ver `.cursor/rules/10-workflow.mdc`).
- Testes: **pytest** + **pytest-django**.

### Banco de dados

- **PostgreSQL**.
- Uso principal: persistência de salas, jogadores (nome de usuário válido só naquela sala) e
  instâncias de jogo. **Estratégia de persistência de partida confirmada: híbrida.** O estado de
  uma partida em andamento vive em cache/memória durante o jogo (rápido, baixa carga no banco a
  cada jogada) e é gravado no Postgres em snapshots periódicos (ex.: a cada N jogadas ou a cada
  X segundos — detalhe de implementação a definir na Fase 1/2), o suficiente para recuperar a
  partida se o servidor reiniciar sem persistir cada jogada individualmente. O frontend deve
  mostrar um indicador discreto de "progresso salvo" nos jogos (ver `visual.md`) refletindo o
  último snapshot bem-sucedido — não é uma feature decorativa, é sinal real de estado salvo.
- Sala ou instância de jogo sem nenhum jogador ativo expira e é limpa depois de **1 hora**
  (job periódico a definir — Celery beat, cron simples, ou management command agendado).

### Infra / deploy

- A definir. Candidatos a avaliar quando chegar a hora: Vercel (frontend Next.js) + um provedor
  com suporte a WebSockets persistentes para o backend (Railway, Render, Fly.io) + Postgres
  gerenciado. Nenhuma decisão tomada ainda — não assumir nenhuma dessas opções como certa até
  este documento ser atualizado.

### Ferramentas de qualidade

- Lint/format backend: **ruff**.
- Lint/format frontend: **ESLint** + **Prettier** (config padrão do Next.js como ponto de partida).
- Variáveis de ambiente via `.env` (nunca commitado — ver `.gitignore` e `90-commits.mdc`).

### Tokens de design

Cores, tipografia e demais tokens visuais confirmados estão documentados em `visual.md` (fonte da
verdade para decisão visual). Na implementação, eles vivem em um único lugar no código —
`frontend/theme/` (paleta, tipografia e tema MUI customizado via `createTheme`) — nunca hardcoded
em componentes. Ver `.cursor/rules/00-project-context.mdc`.

## Convenções de nomenclatura por módulo (aspiracional)

```
frontend/
  app/                # rotas Next.js (App Router)
  components/         # componentes React reutilizáveis
  games/<jogo>/        # lógica/UI específica de cada jogo (client-side)
  theme/               # tema MUI customizado
backend/
  rooms/               # app Django: salas, convites, jogadores
  games/
    chess/
      engine.py        # regras puras do jogo, sem Django
      views.py / consumers.py
      tests/
    coup/
    battleship/
```

Esta estrutura é uma proposta inicial, não uma regra rígida — ajuste conforme o projeto crescer,
mas mantenha a separação entre "motor de regras puro" e "camada de transporte" (REST/WebSocket),
porque isso é o que permite testar regra de jogo sem subir servidor (ver `10-workflow.mdc`).

## Coisas explicitamente descartadas (para não serem propostas de novo sem motivo)

- Nenhuma ainda — esta seção existe para registrar decisões revertidas conforme o projeto avance.
