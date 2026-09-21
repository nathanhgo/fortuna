# Tests — estratégia de testes

Este documento é a referência completa de como o projeto testa código (nomeação, fixtures,
cobertura mínima, o que testar em cada camada). O processo obrigatório de TDD (red-green-refactor)
já está definido em `.cursor/rules/10-workflow.mdc` — este arquivo detalha a execução prática, e
será preenchido na segunda iteração, depois que `stack.md` (mecanismo de tempo real) e `visual.md`
estiverem fechados, porque a escolha de ferramentas de teste depende dessas decisões.

## Pendente de definição

- [ ] Framework de teste do frontend: Vitest vs. Jest (depende da configuração final do Next.js).
- [ ] Estratégia de teste para WebSocket/tempo real (ex.: Django Channels tem um `ChannelsLiveServerTestCase`
      próprio — confirmar depois que a Fase 0 do `mvp.md` decidir o mecanismo de tempo real).
- [ ] Cobertura mínima esperada por módulo (motores de jogo devem ter cobertura alta; UI pode ser
      mais leve, com foco em comportamento visível ao usuário, não em detalhe de implementação).
- [ ] Convenção de fixtures/factories para estado de sala e de partida em teste (ex.: usar
      `factory_boy` no backend?).
- [ ] Estratégia de teste end-to-end (ex.: Playwright) para o fluxo completo "criar sala → convidar
      → entrar → configurar jogo → jogar" — a decidir se entra no MVP ou só depois.

## O que já é certo (não depende de definição pendente)

- Motores de regra de jogo (Xadrez, Coup, Batalha Naval) são testados isoladamente, sem precisar
  de servidor HTTP/WebSocket rodando — são funções/classes Python puras (ver `stack.md`,
  estrutura de `backend/games/<jogo>/engine.py`).
- Todo teste é escrito antes da implementação correspondente (ver `.cursor/rules/10-workflow.mdc`).
- Testes vivem junto do código que testam (frontend) ou em `tests/` dentro do módulo (backend),
  nunca centralizados em uma pasta `tests/` na raiz do projeto.
