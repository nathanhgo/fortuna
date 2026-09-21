# Questions — decisões abertas

Documento de exploração: perguntas escritas pela IA, respondidas por você. Todas as perguntas da
primeira rodada foram respondidas e incorporadas em `idea.md`, `stack.md` e `mvp.md` — o conteúdo
completo permanece abaixo como histórico de decisão (o "porquê" de cada regra), mas a referência
viva para implementação são os outros três documentos, não este.

## Arquitetura / tempo real — resolvido

1. **Django Channels** para WebSockets, confirmado (sem experiência prévia, decisão consciente de
   usar a opção nativa da stack). Ver `stack.md`.
2. **Persistência híbrida**: cache em memória durante a partida + snapshot periódico no Postgres.
   A UI deve mostrar um indicador discreto de "progresso salvo" durante os jogos. Ver `stack.md`
   e `mvp.md` (Fase 1).
3. Sala/instância de jogo sem nenhum jogador ativo expira em **1 hora**. Ver `mvp.md` (Fase 1).

## Produto / regras de jogo — resolvido

1. Xadrez modo assistido inclui: destaque do último lance, notação de partida visível, e setas de
   planejamento com botão direito (estilo chess.com/lichess). Ver `mvp.md` (Fase 3).
2. Coup: personagens/quantidade de cartas ficam configuráveis, mas o **default** é o jogo base
   oficial (5 personagens, 2 cópias de cada). Ver `mvp.md` (Fase 4).
3. Jogador desconectado: o jogo **pausa** esperando reconexão. Em jogos de 2 jogadores, 1 minuto
   de tolerância — depois disso, W.O. (vitória do jogador que ficou). Em jogos com mais de 2
   jogadores, o jogo continua sem o jogador desconectado. Ver `mvp.md` (Fase 1, regra transversal).
4. Uma sala pode ter **múltiplas instâncias do mesmo jogo simultaneamente**. Instâncias em
   andamento aparecem em uma lista, e outros jogadores podem entrar para jogar (se houver vaga) ou
   **assistir** (espectador). Ver `mvp.md` (Fase 1 e Fase 5 — espectador completo).

## Produto / experiência — resolvido

1. Nome de usuário é **obrigatório** ao entrar ou criar uma sala, e vale só naquela sala enquanto
   ela existir (sem conta persistente). Ver `mvp.md` (Fase 1).
2. Limite de jogadores por sala: **ilimitado** por enquanto (limite é só por capacidade de cada
   jogo individual). Ver `mvp.md` (Fase 1).

## Escopo / prioridade — resolvido

1. Próximos jogos depois do MVP (Batalha Naval, Xadrez, Coup): decisão futura, mas candidatos já
   cotados são Truco, um jogo estilo Werewolf/Lobisomem, Damas, Dominó e Ludo. Ver `idea.md`
   (seção "Jogos futuros — candidatos").
2. SEO e páginas institucionais de "como jogar" continuam na Fase 5, sem mudança.

## Próxima rodada de perguntas

Nenhuma pergunta nova pendente neste momento. Novas perguntas serão adicionadas aqui conforme
surgirem durante o desenvolvimento (ex.: decisões técnicas específicas do scaffold, como escolha
entre Redis ou memória local para o channel layer do Django Channels em desenvolvimento).
