# MVP — roteiro de fases

Convenção de checkbox: `[ ]` pendente, `[~]` parcial, `[x]` feito. Atualize a cada tarefa concluída
(ver `.cursor/rules/20-logging.mdc`). A ordem das fases é a ordem de prioridade sugerida, mas
Batalha Naval vem antes de Xadrez/Coup de propósito: é o jogo mais simples e serve para validar
toda a arquitetura de sala + jogo (criação, convite, WebSocket, configuração pelo primeiro jogador)
com o menor risco possível antes de encarar a complexidade de Xadrez e, principalmente, Coup.

## Regras transversais (valem para todas as fases com jogo ativo)

- Sala ou instância de jogo sem nenhum jogador ativo expira em **1 hora**.
- Jogador desconectado no meio de uma partida: o jogo **pausa** por até **1 minuto** esperando
  reconexão. Em jogos de 2 jogadores, passado esse tempo é **W.O.** (vitória de quem ficou). Em
  jogos com mais de 2 jogadores, a partida **continua sem** o jogador desconectado.
- Estado de partida em andamento: cache/memória durante o jogo + snapshot periódico no Postgres
  (persistência híbrida — ver `stack.md`). A UI mostra um indicador discreto de "salvo".

## Fase 0 — Fundação

- [x] Documentação de arquitetura inicial (`idea.md`, `stack.md`, `mvp.md`, `visual.md`,
      `questions.md`, `tests.md`, `logs.md`) e regras do Cursor (`.cursor/rules/`, `BUGBOT.md`).
- [x] Definição visual concluída (`visual.md` preenchido pelo usuário, paleta/tipografia/tom de
      voz confirmados, imagens iniciais geradas).
- [x] Scaffold do frontend (Next.js + TypeScript + MUI, tema customizado com paleta e tipografia
      confirmadas em `visual.md`, assets do logo/capas dos jogos copiados para `public/images/`).
- [x] Scaffold do backend (Django + DRF + Channels, apps `rooms` e `games` — com subpacotes
      `games/chess`, `games/coup`, `games/battleship` prontos para receber os engines —,
      Postgres configurável via `.env` com fallback automático para SQLite em dev).
- [x] Pipeline de teste funcionando (`pytest` no backend, Vitest + React Testing Library no
      frontend) — pré-requisito para seguir com TDD nas fases seguintes.
- [x] Prova de conceito mínima de Django Channels (`EchoConsumer` em `rooms/consumers.py`,
      testado via `WebsocketCommunicator`) — mecanismo validado antes de depender dele para
      sincronizar jogos de verdade.

## Fase 1 — Núcleo de salas

- [x] Criar sala (endpoint + UI): `POST /api/rooms/` gera um código curto (sem caracteres
      ambíguos) e já registra quem criou como o primeiro jogador; a home tem um formulário
      (nome de usuário) que cria a sala e redireciona para `/sala/<code>`.
- [x] Entrar em sala via link/código: `POST /api/rooms/<code>/players/`, nome de usuário
      **obrigatório** e único na sala (case-insensitive), válido apenas enquanto a sala existir
      (token do jogador guardado no `localStorage` do navegador, não é login/conta).
- [x] Lobby da sala: `GET /api/rooms/<code>/` + página `/sala/<code>` listam os jogadores
      presentes, o link de convite, as instâncias de jogo da sala e um botão para abrir
      uma mesa de Batalha Naval (Xadrez/Coup entram nas Fases 3-4).
- [x] Sem limite de jogadores por sala (nada no modelo/endpoint impõe limite; a capacidade fica a
      cargo de cada jogo individual quando existir).
- [x] Jogador escolhe entrar em uma instância existente (como jogador, se houver vaga, ou como
      espectador) ou criar uma nova instância de um jogo implementado.
- [x] Regra de autoridade de configuração: primeiro jogador de uma instância de jogo (ou jogador
      que fica sozinho nela) define as configurações antes do início.
- [x] Sincronização em tempo real do estado da sala (entradas/saídas de jogadores, jogos
      criados/atualizados) via Django Channels (`RoomConsumer` em `ws/rooms/<code>/`). O
      WebSocket só avisa que algo mudou; o cliente rebusca o recurso REST correspondente.
- [ ] Expiração automática de sala/instância sem jogador ativo (1h) e pausa/W.O. por desconexão
      (regras transversais acima) — presença/desconexão ainda não atualizam `Player.is_connected`
      a partir do WebSocket.

## Fase 2 — Batalha Naval

- [x] Motor de regras: tabuleiro quadrado configurável, navios de 1 a 5 espaços, posicionamento
      sem sobreposição e sem diagonais, validação de tiro, detecção de navio afundado e de vitória
      (`games/battleship/engine.py`).
- [x] Configuração pelo primeiro jogador: tamanho do tabuleiro, conjunto de navios.
- [x] UI: posicionamento de navios (clique + rotação), tabuleiro próprio e tabuleiro do
      oponente (oculto), feedback visual de acerto/erro/afundado.
- [x] Sincronização em tempo real dos tiros entre os dois jogadores (evento `game_updated` no
      WebSocket da sala + re-fetch REST do estado filtrado por jogador).
- [x] Tela de vitória/derrota e opção de revanche dentro da mesma sala.

## Fase 3 — Xadrez

- [ ] Motor de regras completo: movimentos de todas as peças, roque, en passant, promoção,
      xeque, xeque-mate, afogamento (stalemate), empate por repetição/50 lances (pelo menos o
      básico; regras mais raras podem ficar para depois do MVP).
- [ ] Modo "realista": sem indicação de movimentos possíveis, sem aviso de xeque na tela — fiel ao
      jogo físico.
- [ ] Modo "assistido": indicação de casas para onde a peça selecionada pode mover, aviso de
      xeque/xeque-mate, cronômetro configurável por jogador (ex.: 5+0, 10+5, sem limite),
      escolha de cor (aleatória, escolher, ou anfitrião escolhe), destaque do último lance jogado,
      notação de partida visível (PGN/algébrica), e setas de planejamento com botão direito
      (estilo chess.com/lichess) para marcar jogadas futuras sem executá-las.
- [ ] Configuração pelo primeiro jogador: modo (realista/assistido) e, se assistido, tempo e cor.
- [ ] Sincronização em tempo real de jogadas, incluindo reconexão sem perder estado da partida.

## Fase 4 — Coup

- [ ] Motor de regras base: 5 personagens (Duque, Assassino, Capitão, Embaixador, Condessa),
      ações (renda, ajuda externa, taxar, assassinar, roubar, trocar, dar golpe/coup) e contestação
      (challenge) e bloqueio (block), perda de carta de influência, eliminação, vitória.
- [ ] Configuração pelo primeiro jogador a entrar no jogo, com o jogo base oficial como
      **default** (5 personagens ativos, 2 cópias de cada): quantidade de cada carta no baralho,
      quais personagens estão ativos/desativados, número máximo de jogadores (2 a 6, com suporte
      a mais via variante oficial de 7-10 se fizer sentido incluir).
- [ ] Sistema de alianças/religião (expansão *Reformation*): alocação de facção (Lealista/
      Reformista) alternada no início, restrição de ações contra a própria facção, conversão paga,
      opcional e configurável pelo primeiro jogador (desativado por default).
- [ ] Variante Inquisitor (substitui Embaixador) como opção configurável, se a expansão de
      alianças estiver ativa.
- [ ] UI de blefe: cartas próprias visíveis só para o jogador, cartas dos outros ocultas, histórico
      de ações/contestações visível para todos, feedback claro de perda de influência.
- [ ] Sincronização em tempo real de ações, janelas de contestação/bloqueio com timeout.

## Fase 5 — Polimento e crescimento (pós-MVP)

- [ ] SEO: metadados, Open Graph, conteúdo estático em português explicando cada jogo (páginas
      indexáveis, não só a SPA da sala).
- [ ] Evolução do lobby da sala para ambiente navegável em pixel art (ver `idea.md`).
- [ ] Chat de texto dentro da sala.
- [ ] Experiência de espectador completa (indicadores de quem assiste, talvez chat próprio) —
      a capacidade básica de assistir já existe desde a Fase 1, isto é sobre polir a experiência.
- [ ] Avaliar próximo jogo a adicionar entre os candidatos listados em `idea.md` (Truco, jogo
      estilo Werewolf/Lobisomem, Damas, Dominó, Ludo).
- [ ] Avaliar contas de usuário opcionais (estatísticas, histórico) — fora de escopo até aqui.
