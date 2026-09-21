# Contexto para revisão automática de PRs — Fortuna

Fortuna é uma plataforma de jogos de mesa multiplayer (Xadrez, Coup, Batalha Naval, e outros
no futuro) organizados em salas sem login, com Next.js + React + Material UI no frontend e
Django + Django Rest Framework + Postgres no backend. Detalhes de produto e stack estão em
`architecture_docs/idea.md` e `architecture_docs/stack.md`, mas não são necessários para a
maioria das revisões — o que importa para revisão de PR está listado abaixo.

## Exigir em todo PR

- **Testes para código novo.** Qualquer mudança em regra de jogo, endpoint, reducer/hook de
  estado ou componente com lógica precisa vir com teste correspondente (ver
  `.cursor/rules/10-workflow.mdc`). PR que adiciona lógica sem teste deve ser sinalizado.
- **Nenhum segredo ou chave hardcoded.** Chaves de API, senhas de banco, `SECRET_KEY` do Django,
  tokens — tudo deve vir de variável de ambiente (`.env`, nunca commitado). Sinalize qualquer
  string que pareça uma credencial real.
- **Autoridade de configuração de jogo respeitada.** Regras de negócio como "quem entra primeiro
  em um jogo configura as regras daquele jogo" precisam ser aplicadas no backend (fonte de
  verdade), nunca só validadas no frontend.
- **Sem lógica de jogo confiando apenas no cliente.** Validação de jogada (Xadrez, Coup, Batalha
  Naval) deve ser feita/validada no backend. Frontend pode replicar a lógica para responsividade
  da UI, mas nunca pode ser a única barreira contra jogadas inválidas ou trapaça.

## Padrões de nomenclatura

- Código (variáveis, funções, classes, nomes de arquivo) em inglês.
- Texto voltado ao usuário final (UI, mensagens de erro visíveis, metadados de SEO) em
  português do Brasil.
- Componentes React em `PascalCase`, hooks em `camelCase` prefixados com `use`, apps/módulos
  Django em `snake_case`.

## Sinais de baixa qualidade a apontar

- Cores, espaçamentos ou fontes hardcoded em vez de usar o tema do Material UI.
- Uso de emoji ou ícone genérico no lugar de conteúdo/imagem real (ver `architecture_docs/visual.md`).
- Commits ou PRs que misturam mudanças não relacionadas.
