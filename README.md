# Fortuna

Fortuna é um site que reúne versões digitais de jogos de mesa e cartas jogados tradicionalmente
de forma física — Xadrez, Coup, Batalha Naval, e outros no futuro. Qualquer pessoa pode criar uma
sala, compartilhar um link e jogar com amigos, sem cadastro e sem login.

Para o contexto completo do produto (problema, público, escopo), veja
[`architecture_docs/idea.md`](architecture_docs/idea.md). Para o roteiro de desenvolvimento, veja
[`architecture_docs/mvp.md`](architecture_docs/mvp.md).

## Stack

- **Frontend**: Next.js, React, Material UI (TypeScript).
- **Backend**: Django, Django Rest Framework.
- **Banco de dados**: PostgreSQL.

A stack real (o que já está implementado) vs. a stack planejada está documentada em
[`architecture_docs/stack.md`](architecture_docs/stack.md) — esse arquivo é sempre a fonte da
verdade, mais atual que este README.

## Status do projeto

Fase 0 do roteiro (`architecture_docs/mvp.md`): scaffold de frontend e backend criado, com tema
visual, pipeline de teste e uma prova de conceito de Django Channels funcionando. Nenhuma regra de
jogo ou fluxo de sala foi implementado ainda — isso começa na Fase 1.

### Rodando o projeto

O jeito recomendado é via Docker Compose — ele sobe Postgres, backend e frontend juntos, com
hot reload nos dois serviços (o código é montado por bind mount, então editar no host reflete
direto no container):

```bash
cp .env.example .env      # um único .env na raiz, compartilhado por todos os serviços
docker compose up --build
# backend:  http://localhost:8000
# frontend: http://localhost:3000
```

Se você usa VS Code, há tasks prontas em `.vscode/tasks.json` para isso e outras tarefas do dia a
dia (rodar testes, lint, migrations, etc.) — abra a paleta de comandos e busque por "Run Task".
Configs de debug (attach ao Django e ao Next.js dentro do container) estão em
`.vscode/launch.json`.

Também é possível rodar backend e frontend sem Docker (útil se o Docker não estiver disponível);
ver as seções "Sem Docker" em [`backend/README.md`](backend/README.md) e
[`frontend/README.md`](frontend/README.md). Nesse caso, o mesmo `.env` da raiz é lido por ambos
os serviços — não existe um `.env` por serviço.

### Deploy (produção)

Frontend na Vercel, backend no Render (Daphne/ASGI), Postgres no Neon. Ordem e variáveis
estão em [`architecture_docs/deploy.md`](architecture_docs/deploy.md).

### Verificando que está tudo funcionando

Com `docker compose up --build` rodando (ou os serviços rodando localmente sem Docker):

1. `curl http://localhost:8000/api/health/` deve devolver `{"status": "ok"}`.
2. Abrir `http://localhost:3000` no navegador, criar uma sala com um nome de jogador — deve
   redirecionar para `/sala/<código>` mostrando o link de convite e você como jogador na lista.
3. Abrir esse mesmo link em outra aba/navegador anônimo, entrar com outro nome — os dois devem
   aparecer na lista de jogadores da sala (atualizando a página; sincronização em tempo real via
   WebSocket ainda não foi implementada, ver `architecture_docs/mvp.md`).
4. Rodar a suíte automatizada de cada serviço (ver `backend/README.md` e `frontend/README.md`,
   ou as tasks "Backend: Testes" / "Frontend: Testes" do VS Code) — deve passar tudo.

## Desenvolvimento

O projeto segue TDD (testes antes da implementação) e mantém um changelog técnico contínuo em
[`architecture_docs/logs.md`](architecture_docs/logs.md), lido principalmente por sessões de IA
que trabalham no código. Convenções completas de processo estão em `.cursor/rules/`.

## Contribuindo

Projeto pessoal em desenvolvimento solo por enquanto. Convenção de commits em
[`.cursor/rules/90-commits.mdc`](.cursor/rules/90-commits.mdc).
