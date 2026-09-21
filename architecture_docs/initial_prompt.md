meu-projeto/
├── .cursor/
│   ├── rules/
│   │   ├── 00-project-context.mdc
│   │   ├── 10-workflow.mdc
│   │   ├── 20-logging.mdc
│   │   └── 90-commits.mdc
│   ├── skills/
│   │   └── (vazio no início — adicionar conforme surgir necessidade)
│   └── BUGBOT.md
├── architecture-docs/
│   ├── idea.md
│   ├── stack.md
│   ├── mvp.md
│   └── logs.md
├── .gitignore
├── README.md
└── (pastas de código conforme a stack: src/, backend/, frontend/, etc.)

.cursor/rules/00-project-context.mdc — always apply. É a "identidade" do projeto: o que é, para quem é, em 2-3 frases. Deve apontar (não copiar) para idea.md, stack.md e mvp.md, para o agente saber onde ler mais quando precisar, sem inflar o contexto de toda mensagem. Também é o lugar certo para convenções transversais fixas: idioma do código vs. da UI, princípios de design (ex.: "não hardcode cores, use o sistema de tema"), e restrições de negócio (ex.: "sem chaves de API pagas").

.cursor/rules/10-workflow.mdc — always apply. Define a metodologia de desenvolvimento obrigatória do projeto (ex.: TDD red-green-refactor, ou outra que faça sentido). Deve ser específica e executável: quais comandos rodar antes de considerar uma tarefa concluída, onde ficam os testes, o que fazer quando não há framework de teste configurado ainda (sinalizar em vez de pular).

.cursor/rules/20-logging.mdc — always apply. Garante continuidade entre sessões de IA (que não têm memória persistente): toda edição de código deve gerar uma entrada em architecture-docs/logs.md com data e descrição técnica direta, e atualizar os checkboxes de mvp.md quando aplicável. Sem essa regra, cada sessão nova "esquece" o que foi feito nas anteriores.

.cursor/rules/90-commits.mdc — agent-requestable (não always apply, só é lido quando o agente vai de fato commitar). Convenção de mensagens de commit (idioma, formato tipo Conventional Commits, o que nunca commitar).

.cursor/skills/ — comece vazio. Skills são workflows completos e reutilizáveis (não só texto: podem ter scripts, referências, templates numa pasta própria) para tarefas que se repetem dentro deste projeto específico (ex.: "como adicionar um novo tipo de nó/endpoint/entidade do início ao fim"). Crie a primeira skill só depois de sentir a dor real de repetir um processo manualmente 2-3 vezes — criar skills antecipadamente demais tende a ficar desatualizado.

.cursor/BUGBOT.md — arquivo de contexto específico para o revisor automático de PRs do GitHub (Bugbot), lido apenas por ele (as rules normais em .cursor/rules/ não valem para o Bugbot). Coloque aqui convenções que você quer que sejam cobradas automaticamente em todo PR: exigência de testes para código novo, proibição de segredos/chaves hardcoded, padrões de nomenclatura, etc.

architecture-docs/idea.md — visão do produto: problema que resolve, público-alvo, requisitos funcionais/não-funcionais, contexto de origem (por que esse projeto existe). É o documento de "porquê", escrito em prosa, atualizado raramente.

architecture-docs/stack.md — a fonte da verdade sobre a stack real (vs. aspiracional). Fundamental para evitar que a IA (ou você) confie em decisões antigas que já mudaram: sempre que a stack evoluir, este arquivo deve ser atualizado antes de qualquer outro doc. Recomendo uma seção explícita "Real vs. Aspiracional" quando houver planos ainda não implementados.

architecture-docs/mvp.md — roteiro de fases/features com checkboxes ([ ] pendente, [x] feito, [~] parcial). É o que orienta prioridade: qual feature implementar a seguir, o que já está pronto. Atualizado a cada tarefa concluída (junto com a rule de logging).

architecture-docs/visual.md — documento para a definição do visual, inicialmente crie um "formulário" para o usuário preencher para definições de coisas relacionadas ao visual (logo, cores, fontes, etc.) indique algumas opções e, na segunda iteração, crie imagens com um escoço de como deve ser o sistema (adicione na primeira versão do documento, uma indicação explicita de não usar elementos classicamente de IA, para o sistema não parecer muito genérico / vibecodado)

architecture-docs/questions.md — um documento de exploração, a ser criado e prenchido pela IA e respondido pelo usuário humano, a ideia é aprofundar os conceitos visuais de arquitetura ou qualquer decisão relevante para a realização do projeto

architecture-docs/tests.md — a ser preenchido depois da definição dos outros documentos (segunda iteração), como todo o sistema deve seguir as boas práticas de TDDs

architecture-docs/logs.md — changelog técnico, append-only, em ordem cronológica, de toda mudança de código feita por IA (ou por você) em cada sessão. Curto e direto, não precisa ser "bonito" — é lido principalmente por IAs em sessões futuras para saber o que já foi feito.

.gitignore — adapte por stack, e decida desde já se architecture-docs/ deve ser versionado (compartilhado com o time) ou ignorado (bloco de notas pessoal de planejamento, como fizemos no FotoFácil).

README.md — documentação voltada a humanos/desenvolvedores (como instalar, rodar, contribuir). Público diferente de architecture-docs/, que é voltado a dar contexto para sessões de IA.