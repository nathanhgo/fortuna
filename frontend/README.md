# Fortuna — frontend

Aplicação Next.js (App Router) + TypeScript + Material UI. Ver o [`README.md`](../README.md) na
raiz do repositório para visão geral do projeto, e `../architecture_docs/stack.md` para decisões
de stack.

## Rodando com Docker (recomendado)

Ver o [`README.md`](../README.md) da raiz — `docker compose up --build` sobe Postgres + backend +
frontend juntos. O `.env` é único, na raiz do repositório (`../.env`, a partir de `../.env.example`),
não um `.env` por serviço; o `next.config.ts` já carrega esse `.env` raiz automaticamente.

Comandos do dia a dia com o container já rodando:

```bash
docker compose exec frontend npm test         # suíte de testes (Vitest + React Testing Library)
docker compose exec frontend npm run lint     # ESLint
docker compose exec frontend npm run build    # build de produção (roda type-check)
```

Todos esses também existem como tasks do VS Code em `../.vscode/tasks.json`. Para debugar com
breakpoints no código do servidor (Node) dentro do container, defina `NODE_DEBUGGER=1` no `.env`,
reinicie o serviço (`docker compose up -d --build frontend`) e use a config "Frontend: Attach ao
servidor Next.js (Docker)" em `../.vscode/launch.json`. Para debugar código de cliente (React),
use a config "Frontend: Debug no navegador (Chrome)", que funciona com o app rodando com ou sem
Docker.

## Sem Docker

```bash
npm install
npm run dev                  # servidor de desenvolvimento em http://localhost:3000
npm test                     # suíte de testes (Vitest + React Testing Library)
npm run lint                 # ESLint
npm run build                # build de produção (roda type-check)
```

O `.env` lido é o da raiz do repositório (`../.env`), não um `frontend/.env.local` separado.

## Estrutura

- `app/` — rotas do App Router.
- `theme/` — paleta, tipografia e tema do MUI (`../architecture_docs/visual.md` é a fonte de
  verdade para as decisões visuais; este diretório é a implementação).
- `public/images/` — assets visuais (logo, capas dos jogos), copiados de
  `../architecture_docs/assets/`.

Todo componente com lógica (não só apresentação) deve ter teste escrito antes da implementação —
ver `../.cursor/rules/10-workflow.mdc`.
