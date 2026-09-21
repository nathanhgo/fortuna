# Fortuna — visão do produto

## O problema

Grupos de amigos que jogam jogos de tabuleiro/cartas presencialmente (Xadrez, Coup, Batalha
Naval, etc.) não têm uma forma simples de continuar jogando quando estão remotos. As alternativas
atuais têm fricção:

- Sites especializados em um único jogo (ex.: chess.com, lichess.org) resolvem bem o Xadrez, mas
  exigem conta e não têm os outros jogos que o grupo quer jogar.
- Apps de jogo de tabuleiro em geral (ex.: Board Game Arena) têm catálogos enormes, mas cobram
  assinatura para acesso ilimitado, exigem conta, e têm uma UI voltada a "colecionador de jogos",
  não a "um grupo de amigos quer jogar rápido".
- Ferramentas genéricas de chamada de vídeo + "mostra o tabuleiro físico na câmera" são a
  alternativa mais comum na prática, e são claramente piores que jogar em uma interface digital.

Existem sites que já validam esse formato específico — salas sem login, link de convite, múltiplos
jogos na mesma "casa" — como `gamenight.zone` e `playboard.gg`, que inclusive já oferecem Xadrez,
Batalha Naval e/ou Coup dessa forma. Isso confirma que o formato funciona e é procurado, mas também
significa que Fortuna precisa de uma identidade visual e uma experiência que não pareçam apenas
"mais um clone" — daí a ênfase em tema visual próprio (mitologia greco-romana) e em fidelidade às
regras completas de cada jogo (incluindo variantes menos comuns, como o modo "realista" do Xadrez
ou a expansão Reformation do Coup).

## A proposta

Fortuna é um "banco de jogos": um site onde qualquer pessoa cria uma **sala** com um clique, recebe
um link para convidar amigos, e dentro da sala o grupo se divide entre os jogos disponíveis — sem
cadastro, sem senha, sem instalar nada. Cada jogo dentro da sala é uma instância independente com
sua própria configuração, jogadores e estado.

A médio prazo, a sala em si deixa de ser só uma tela de "escolha o jogo" e passa a ser um ambiente
visual navegável (estilo pixel art), onde os jogadores literalmente "andam" até a mesa do jogo que
querem jogar — mas isso é uma evolução da experiência, não um requisito do MVP.

## Público-alvo

- Grupos de amigos ou família (tipicamente 2 a 8 pessoas) que já jogam esses jogos presencialmente
  e querem uma opção remota fiel às regras que conhecem.
- Jogadores que quer uma versão *fiel ao jogo físico* (sem assistências de UI) e jogadores que
  preferem uma versão *facilitada* (com dicas, avisos, timers) — por isso o Xadrez e outros jogos
  competitivos oferecem os dois modos, configuráveis por quem cria o jogo.
- Não é o público de "quero descobrir jogos novos" (isso é Board Game Arena/Tabletop Simulator) —
  é o público que já sabe o que quer jogar e só precisa de um lugar para jogar com quem conhece.

## Requisitos funcionais (visão geral — detalhe de execução vai para `mvp.md`)

- Criar sala sem autenticação; sala gera um link/código único de convite. Ao entrar (ou criar),
  a pessoa escolhe um nome de usuário válido só naquela sala, enquanto ela existir.
- Dentro da sala, listar os jogos disponíveis e permitir que jogadores se agrupem em instâncias
  de um jogo. Uma sala pode ter várias instâncias do mesmo jogo rodando ao mesmo tempo (ex.: duas
  mesas de Xadrez em paralelo); instâncias em andamento aparecem em uma lista visível para quem
  quiser entrar como jogador (se houver vaga) ou como espectador.
- O primeiro jogador a entrar em uma instância de jogo (ou o único jogador restante nela) define
  as configurações daquele jogo antes de começar.
- Sala sem nenhum jogador ativo expira em 1 hora. Jogador que desconecta no meio de uma partida
  tem 1 minuto para reconectar antes de o jogo declarar W.O. (em jogos de 2) ou seguir sem ele
  (em jogos com mais jogadores).
- Xadrez: 2 jogadores, com modo "realista" (sem indicação de movimentos possíveis, sem aviso de
  xeque) e modo "assistido" (dicas de movimento, aviso de xeque/xeque-mate, tempo configurável por
  jogador, escolha de cor).
- Coup: 2 a 6 jogadores (com variantes oficiais permitindo até 10), configuração de quantidade de
  cada carta, quais personagens estão ativos, ativação do sistema de alianças/religião
  (expansão Reformation), número máximo de jogadores.
- Batalha Naval: 2 jogadores, tabuleiro quadrado, navios de 1 a 5 espaços, seguindo as regras
  padrão dos sistemas online mais populares (posicionamento livre, sem sobreposição, sem
  diagonais, feedback de acerto/erro/afundado).
- Arquitetura pensada para permitir adicionar novos jogos sem reescrever a camada de salas.

## Requisitos não funcionais

- Sem exigir cadastro/login para as funcionalidades essenciais (criar sala, entrar em sala, jogar).
- Baixa fricção: da homepage até estar jogando deve levar poucos cliques.
- Estado de jogo em tempo real e consistente entre todos os jogadores da sala (backend como fonte
  de verdade — ver `.cursor/rules/00-project-context.mdc` e `BUGBOT.md`).
- Acessível em desktop e mobile (grupos de amigos jogam de celular com frequência).
- SEO pensado para buscas em português ("jogar xadrez online com amigos sem cadastro",
  "coup online", "batalha naval online multiplayer") — ver `visual.md` e futura documentação de SEO.
- Identidade visual própria e deliberada (mitologia greco-romana, branco/preto/dourado), evitando
  ativamente os padrões visuais associados a produtos "vibe coded" (detalhado em `visual.md`).

## Por que "Fortuna"

Fortuna é a deusa romana da sorte e do destino — tanto os jogos de estratégia pura (Xadrez) quanto
os de sorte/blefe (Coup, Batalha Naval) cabem sob esse guarda-chuva temático, e o nome antecipa a
estética greco-romana do visual (reforçada pelo logo, com cornucópia, coroa de louros e estrela).

## Jogos futuros — candidatos

Fora dos três jogos do MVP (Batalha Naval, Xadrez, Coup), já existem candidatos cotados para depois
da validação inicial, sem compromisso de ordem: Truco, um jogo de blefe/dedução social no estilo
Werewolf/Lobisomem, Damas, Dominó e Ludo. A decisão de qual entra primeiro fica para depois que os
três jogos do MVP estiverem validados com uso real.

## Fora de escopo (por ora)

- Contas de usuário, perfis, histórico de partidas entre sessões, ranking.
- Monetização (assinatura, anúncios, doações) — pode ser revisitado depois do MVP validado.
- Chat de voz/vídeo — chat de texto simples pode entrar depois do MVP; voz/vídeo não é objetivo
  do produto (o usuário já teria Discord/WhatsApp para isso).
- App nativo (iOS/Android) — o site precisa apenas ser responsivo o suficiente para mobile web.
