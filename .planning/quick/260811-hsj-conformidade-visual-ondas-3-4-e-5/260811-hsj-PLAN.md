---
phase: quick-260811-hsj
plan: 01
type: execute
wave: 1
depends_on: []
autonomous: true
requirements: [D-01, D-02, D-03, D-04, D-05, D-06, D-07]
files_modified:
  - src/app/globals.css
  - src/app/(app)/venda-rapida/page.tsx
  - src/app/(app)/relatorios/page.tsx
  - src/components/venda-rapida-form-v2.tsx
  - src/components/bfx-intelligence-panel.tsx
  - src/components/antecipacao-client.tsx
  - src/components/produto-form-client.tsx
  - src/components/produto-item-form.tsx
  - src/app/(app)/crm/page.tsx
  - src/app/(app)/financeiro/page.tsx
  - src/app/(app)/historico/page.tsx
  - src/components/cadastrar-produto-rapido-dialog.tsx
  - src/components/catalogo-publico-client.tsx
  - src/components/intelligence-chat-composer.tsx
  - src/components/intelligence-chat-client.tsx
  - src/components/produtos-tab-client.tsx
  - src/components/receipt-preview.tsx
  - src/components/enviar-email-empresa-button.tsx
  - src/components/link-assinatura-button.tsx
  - src/components/notification-bell.tsx
  - src/components/ui/badge.tsx
  - src/components/ui/calendar.tsx
  - src/components/ui/ (dialog, alert-dialog, sheet, popover, dropdown-menu, select, input, textarea, date-input, toggle, switch, tabs, card, button-variants)
  - src/lib/design-tokens.ts
  - design-system/escala-baseline.json

estimate:
  tokens: 220000
  raw_tokens: 110000
  tasks: 3
  confidence: low

must_haves:
  truths:
    - "A varredura `escala:check` reporta `Tamanho fora da escala: 0, cor em CSS puro: 0` — nenhum tamanho de fonte arbitrário e nenhuma cor literal em CSS puro restam em `src/`. (D-01, D-02, D-04)"
    - "Nenhuma classe `shadow-` da escala sobrevive em `src/` sem um par `shadow-[var(--shadow-*)]` na mesma string de classe — ou foi removida por ser decorativa, com a justificativa escrita no código. (D-03)"
    - "O gradiente de fundo da página deriva de token nos dois temas; trocar o valor do token em `:root`/`.dark` muda o brilho sem tocar em nenhuma regra CSS. (D-04)"
    - "Os botões de Exportação Rápida em `/relatorios` usam a mesma hierarquia do bloco principal da mesma página — nenhuma cor destrutiva decorando ação não destrutiva. (D-05)"
    - "As três catracas passam em cada commit: cor crua, escala, contraste de token. (D-07)"
    - "`design-system/escala-baseline.json` acompanha cada melhora — a catraca não permite voltar ao número antigo. (D-01, D-04)"
  artifacts:
    - "src/app/globals.css — tokens de brilho de fundo declarados em `:root`, `.dark` e `@theme inline` (D-04)"
    - "design-system/escala-baseline.json — regravado após cada commit, terminando em totalTamanho 0 e totalCorCss 0"
    - ".planning/quick/260811-hsj-conformidade-visual-ondas-3-4-e-5/260811-hsj-SUMMARY.md — registra cada caso onde a escala apertou o layout e o que foi feito (D-02), e cada sombra removida por decorativa (D-03)"
  key_links:
    - "token novo ↔ os TRÊS pontos que têm de concordar (`:root`, `.dark`, `@theme inline`) — faltando um, a classe não existe e não há erro (D-04)"
    - "correção ↔ `escala:baseline` — sem regravar, a catraca continua permitindo o número antigo (D-01)"
    - "`shadow-*` claro ↔ `shadow-[var(--shadow-*)]` escuro — sem o par, o degrau de elevação some no tema escuro (D-03)"
    - "`escala-scan` ↔ comentário de código: o scanner conta texto em comentário; a última ocorrência de tamanho arbitrário do repositório vive dentro de um comentário JSX, não em classe"
---

<objective>
Fechar as ondas 3 (sombra por token), 4 (tipografia restante) e o resto da onda 5 (botão PDF de
`/relatorios`), mais a cor literal em CSS puro do `globals.css`, do plano de conformidade visual
do BFX.

Purpose: as ondas 1, 2, 6 e parte da 5 já fecharam. O que resta é volume medido: 62 tamanhos de
fonte fora da escala, 4 cores literais em CSS puro, ~55 usos de sombra sem par de tema escuro e 1
achado pontual. Nada disso quebra funcionalidade; tudo custa consistência, e o tema escuro perde
o degrau de elevação enquanto a sombra não vier de token.

Output: código conforme à `design-system/IDENTIDADE-VISUAL.md` nesses quatro eixos, com
`escala-baseline.json` regravado a cada passo e as três catracas verdes em cada commit.

**Aviso de contexto — leia antes de começar.** Este plano tem mais trabalho do que cabe numa
janela de contexto só. Ele foi desenhado para ser retomável: cada arquivo é um commit, e o estado
de progresso é medível a qualquer momento pelos comandos de verificação (não depende de memória).
Se o contexto apertar, **pare num commit limpo**, escreva o SUMMARY com os números atuais e
reporte o que falta. Não acelere agrupando arquivos — D-01 proíbe.

**Economia de contexto (obrigatório).** Nunca leia um arquivo inteiro para trocar uma classe.
O laço por ocorrência é: `grep -n` para achar a linha exata → `Read` com `offset`/`limit` numa
janela de ~16 linhas em volta → `Edit` cirúrgico. `venda-rapida-form-v2.tsx` tem 1188 linhas e
14 ocorrências; lê-lo inteiro consome sozinho boa parte do orçamento.
</objective>

<context>
@/Users/andrebrumcortezferreira/Documents/BFX/sitema-bfx/design-system/IDENTIDADE-VISUAL.md
@/Users/andrebrumcortezferreira/Documents/BFX/sitema-bfx/CLAUDE.md
@/Users/andrebrumcortezferreira/Documents/BFX/sitema-bfx/scripts/design-tokens/escala-scan.mjs
</context>

<armadilhas>
Erros já cometidos neste repositório hoje. Repetir qualquer um destes é retrabalho garantido.

1. **Comentário JSX dentro de expressão.** `{cond && (` seguido de `{/* ... */}` é erro de
   sintaxe e só aparece no lint do CI, depois do push. Comentário vai ANTES da expressão.
2. **`node_modules` está vazio.** `vitest`, `tsc` e `eslint` não carregam neste ambiente — não
   tente. Os scripts de `scripts/design-tokens/*.mjs` rodam (Node puro) e são a única verificação
   disponível localmente.
3. **Falso positivo de auditoria.** Antes de "corrigir" algo que um relatório aponta, confirme no
   código. Dois achados já se provaram errados quando medidos: o `rounded-sm` do sheet (era o
   botão de fechar, não a superfície) e os `dark:text-warning` (medidos em 18,20:1 e 6,93:1 —
   passam, e a exceção está registrada na identidade visual, seção 2). **Não toque nos
   `dark:text-warning`.**
4. **Hook do projeto bloqueia o padrão imperativo de execução de regex com estado.** Se precisar
   de extração por regex em script, use `.split()` com regex global.
5. **O scanner de escala conta texto dentro de comentário.** Uma das 62 ocorrências é literalmente
   um comentário que documenta a correção da onda 1 — ver Tarefa 2.
</armadilhas>

<escopo_travado>
**Fazer:** só os arquivos e os quatro eixos listados nas tarefas abaixo.

**NÃO fazer** (D-06): lógica de negócio, Server Action, query Prisma, os indicadores coloridos por
métrica do Dashboard (decisão do dono, testada e mantida em 2026-08-11), o raio do `Card` (já
decidido em 18px na onda 2), os `dark:text-warning` (exceção medida e aprovada), nem redesenhar o
bloco de Exportação Rápida de `/relatorios` (só cor e variante dos botões).
</escopo_travado>

<tasks>

<!-- planner-discipline-allow: shadow-sm -->
<!-- planner-discipline-allow: shadow-md -->
<!-- planner-discipline-allow: shadow-lg -->
<!-- planner-discipline-allow: shadow-xl -->

<task type="tracer">
  <name>Tarefa 1: Fatia fina ponta a ponta — token de fundo, botão PDF e o primeiro par de arquivos</name>
  <files>
    src/app/globals.css,
    src/app/(app)/venda-rapida/page.tsx,
    src/app/(app)/relatorios/page.tsx,
    design-system/escala-baseline.json
  </files>
  <read_first>
    - `design-system/IDENTIDADE-VISUAL.md` seções 3 (escala), 4 (sombra) e 6 (o que o CI garante — em
      especial os três pontos de um token)
    - `src/app/globals.css` linhas 405-450 (bloco `body`, bloco `.dark body`, início do `.dark` de
      sombras/glow) — leia só essa janela
    - `src/components/report-buttons-client.tsx` linhas 130-155 — é o bloco principal da página
      `/relatorios`, a hierarquia que D-05 manda replicar: CSV é `Button` default (primário), PDF é
      `variant="outline"` (secundário)
  </read_first>
  <action>
    Esta tarefa atravessa TODAS as camadas que o trabalho inteiro toca — token em CSS puro, classe
    de tamanho de fonte, classe de sombra, cor semântica em botão, catraca e rebaseline — em três
    arquivos pequenos. Ela existe para provar o laço antes de repeti-lo 50 vezes. São **três
    commits**, nesta ordem.

    **Commit 1 — token de brilho de fundo (D-04).** Hoje `globals.css` escreve cor literal em
    quatro pontos: linhas 412 e 413 (`background-image` do `body`, tema claro) e 428 e 429 (a
    regra `.dark body`, tema escuro). São dois `radial-gradient` por tema; a diferença entre os
    temas está inteiramente nesses valores.

    Crie dois tokens — sugestão `--brilho-topo-a` e `--brilho-topo-b`, nome a seu critério — e
    declare-os nos TRÊS pontos que têm de concordar (a identidade visual, seção 6, é explícita:
    faltando um, a classe simplesmente não existe e não há erro):
    - no `:root` principal (bloco que começa na linha 101) com os valores do tema claro,
      incluindo o alfa: `oklch(0.98 0.06 90 / 60%)` e `oklch(0.9 0.04 250 / 55%)`;
    - no `.dark` principal (bloco que começa na linha 275) com os valores do tema escuro:
      `oklch(0.25 0.08 260 / 25%)` e `oklch(0.20 0.06 210 / 20%)`;
    - no `@theme inline` (bloco que começa na linha 27), como `--color-<nome>: var(--<nome>);`,
      seguindo a forma que os outros tokens de cor já usam ali.

    Depois troque as duas cores literais do `body` por `var(--<nome>)`. Como o token agora carrega
    a diferença entre os temas, a regra `.dark body` (linhas 425-430) vira duplicata que aponta
    para os mesmos valores: **apague-a**. O resultado visual é idêntico nos dois temas — os
    valores não mudam, só a origem deles.

    Cuidado com o parser da catraca: linha que declara custom property (começa com dois traços e
    tem dois-pontos) é ignorada de propósito — é lá que a cor literal DEVE viver. E
    `oklch(from var(--token) ...)` também é ignorado, porque deriva de token. Não confunda os dois
    casos.

    Verifique que os quatro achados sumiram, regrave o baseline, rode as três catracas e commite:
    `style(tokens): brilho de fundo da pagina vem de token nos dois temas`.

    **Commit 2 — `/relatorios`, botão PDF e rótulo (D-05, D-02).** No arquivo
    `src/app/(app)/relatorios/page.tsx`:
    - linha 70: o link de PDF por empresa do bloco "Exportação Rápida" usa
      `buttonVariants({ variant: "outline", size: "sm" })` acrescido de classes que pintam o botão
      com a cor destrutiva (borda, texto e hover). Baixar um PDF não é ação destrutiva e não tem
      falha nem risco associado — a cor ali é decoração, e a identidade visual (seção 2) manda cor
      decorativa sair. Remova as três classes de cor destrutiva do `cn(...)`, deixando o botão
      `outline` puro. Isso o alinha ao papel que o PDF já tem no bloco principal da mesma página
      (`report-buttons-client.tsx`), onde CSV é primário e PDF é `outline` — que é exatamente a
      hierarquia que D-05 manda replicar. NÃO mexa no layout, no texto, no `href` nem na estrutura
      do bloco.
    - linha 59: o rótulo "Exportação Rápida (PDF)" usa tamanho arbitrário. Troque pelo degrau
      `text-xs` da escala — a identidade visual, seção 3, já define esse papel exato
      ("Rótulo maiúsculo: `text-xs font-semibold uppercase tracking-wider`").

    Regrave o baseline, rode as três catracas e commite:
    `style(relatorios): PDF perde a cor destrutiva e o rotulo entra na escala`.

    **Commit 3 — `venda-rapida/page.tsx`, o primeiro arquivo do laço (D-02, D-03).** Arquivo de
    123 linhas, com três ocorrências de tamanho arbitrário (linhas 67, 75 e 94, todas rótulos
    maiúsculos) e uma sombra sem par de tema escuro (linha 58, o card-chip "Última Venda").
    - Os três rótulos vão para `text-xs`.
    - A sombra da linha 58: o elemento tem borda própria (`border border-border`) e fica sobre o
      fundo da página, não sobre uma superfície do mesmo nível — então **não** cai na exceção de
      D-03. Adicione o par de tema escuro correspondente ao degrau, seguindo o idioma que a casa
      já usa em `src/components/ui/card.tsx:12` (classe clara e classe escura `dark:` derivada de
      `var(--shadow-*)` na mesma string, mapeando degrau para degrau).

    Regrave o baseline, rode as três catracas e commite:
    `style(venda-rapida): escala tipografica e sombra por token na pagina`.

    Ao fim dos três commits você terá exercitado exatamente o laço que as Tarefas 2 e 3 repetem.
    Se algo no laço não funcionou como descrito aqui, **pare e reporte antes de escalar** — é para
    isso que esta tarefa é a primeira.
  </action>
  <verify>
    <automated>node scripts/design-tokens/escala-scan.mjs src --check | grep -q "Tamanho fora da escala: 58, cor em CSS puro: 0" &amp;&amp; node scripts/design-tokens/raw-color-scan.mjs src --check &amp;&amp; node scripts/design-tokens/token-contrast.mjs</automated>
    <automated>test "$(grep -c 'radial-gradient' src/app/globals.css)" = "2" &amp;&amp; grep -q 'var(--brilho' src/app/globals.css</automated>
    <automated>test "$(grep -c 'destructive' 'src/app/(app)/relatorios/page.tsx')" = "0"</automated>
  </verify>
  <done>
    Três commits no histórico. O gradiente de fundo vem de token declarado nos três pontos, a regra
    duplicada de tema escuro sumiu e a conta de cor literal em CSS puro está em 0. O botão de PDF
    de `/relatorios` é `outline` puro. `venda-rapida/page.tsx` está na escala e com sombra por
    token. O baseline foi regravado e as três catracas passam.
  </done>
</task>

<task type="auto">
  <name>Tarefa 2: Tipografia restante — 58 ocorrências em 19 arquivos, um arquivo por commit</name>
  <files>
    src/components/venda-rapida-form-v2.tsx, src/components/bfx-intelligence-panel.tsx,
    src/components/antecipacao-client.tsx, src/components/produto-form-client.tsx,
    src/components/produto-item-form.tsx, src/app/(app)/crm/page.tsx,
    src/app/(app)/financeiro/page.tsx, src/app/(app)/historico/page.tsx,
    src/components/cadastrar-produto-rapido-dialog.tsx, src/components/catalogo-publico-client.tsx,
    src/components/intelligence-chat-composer.tsx, src/components/produtos-tab-client.tsx,
    src/components/receipt-preview.tsx, src/components/enviar-email-empresa-button.tsx,
    src/components/intelligence-chat-client.tsx, src/components/link-assinatura-button.tsx,
    src/components/notification-bell.tsx, src/components/ui/badge.tsx,
    src/components/ui/calendar.tsx, design-system/escala-baseline.json
  </files>
  <read_first>
    - `design-system/IDENTIDADE-VISUAL.md` seção 3 (escala e papéis) — já lida na Tarefa 1, não releia
    - Para cada arquivo: `grep -n` do padrão de tamanho arbitrário, depois `Read` com
      `offset`/`limit` numa janela curta em volta de cada linha. **Nunca o arquivo inteiro.**
  </read_first>
  <action>
    Regra de substituição (D-02): tamanho arbitrário de 10px e de 11px viram `text-xs`. É a única
    substituição possível — a escala não tem degrau entre 12px e 10px.

    **Quando `text-xs` estourar o layout** (rótulo dentro de chip estreito, célula de tabela
    densa), a saída NÃO é voltar ao arbitrário. É uma destas três, nesta ordem de preferência:
    reduzir o conteúdo, aumentar o container, ou aceitar a quebra de linha. **Registre o caso no
    SUMMARY** — arquivo, linha, o que apertou e qual das três saídas você usou. Inventar um valor
    arbitrário novo é regressão e a catraca vai pegá-la.

    **Ordem — do maior ofensor para o menor (D-01), um arquivo por commit.** Nada de substituição
    em massa: esses arquivos tiveram a densidade ajustada a olho, trocar tudo de uma vez estoura
    layout em algum ponto e ninguém revisa um diff assim.

    | # | Arquivo | Ocorrências | Linhas |
    |---|---|---|---|
    | 1 | `src/components/venda-rapida-form-v2.tsx` | 14 | 797, 807, 875, 879, 883, 1016, 1123, 1127, 1131, 1135, 1148, 1152, 1156, 1160 |
    | 2 | `src/components/bfx-intelligence-panel.tsx` | 11 | 223, 228, 235, 246, 296, 305, 348, 369, 389, 410, 426 |
    | 3 | `src/components/antecipacao-client.tsx` | 5 | 424, 457, 464, 471, 527 |
    | 4 | `src/components/produto-form-client.tsx` | 3 | 297, 320, 372 |
    | 5 | `src/components/produto-item-form.tsx` | 3 | 280, 290, 294 |
    | 6 | `src/app/(app)/crm/page.tsx` | 2 | 320, 326 |
    | 7 | `src/app/(app)/financeiro/page.tsx` | 2 | 263, 284 |
    | 8 | `src/app/(app)/historico/page.tsx` | 2 | 536, 542 |
    | 9 | `src/components/cadastrar-produto-rapido-dialog.tsx` | 2 | 195, 268 |
    | 10 | `src/components/catalogo-publico-client.tsx` | 2 | 98, 105 |
    | 11 | `src/components/intelligence-chat-composer.tsx` | 2 | 194, 247 |
    | 12 | `src/components/produtos-tab-client.tsx` | 2 | 304, 315 |
    | 13 | `src/components/receipt-preview.tsx` | 2 | 81, 85 |
    | 14 | `src/components/enviar-email-empresa-button.tsx` | 1 | 44 |
    | 15 | `src/components/intelligence-chat-client.tsx` | 1 | 202 |
    | 16 | `src/components/link-assinatura-button.tsx` | 1 | 68 |
    | 17 | `src/components/notification-bell.tsx` | 1 | 115 — **caso especial, ver abaixo** |
    | 18 | `src/components/ui/badge.tsx` | 1 | 47 — **componente base, ver abaixo** |
    | 19 | `src/components/ui/calendar.tsx` | 1 | 33 — **valor em rem, ver abaixo** |

    Os números de linha foram medidos agora e valem para o estado atual do repositório. Depois de
    editar um arquivo eles não mudam (a troca é dentro da linha), mas confirme com `grep -n` antes
    de cada arquivo — é barato e evita editar a linha errada.

    **Três casos que não são troca mecânica:**

    - **`notification-bell.tsx:115` é um falso positivo do scanner.** Não há classe de tamanho
      arbitrário nesse componente: o que existe é um comentário JSX que documenta a correção da
      onda 1 e cita o valor antigo entre crases. O scanner varre texto, não JSX, então conta o
      comentário. Não altere o código — **reescreva o comentário sem o literal**, preservando o
      sentido (ele explica por que o círculo do contador cresceu). Deixar assim trava a conta em 1
      para sempre; trocar código aqui é corrigir algo que já está certo.
    - **`ui/badge.tsx:47` é componente base.** A troca vale por todas as telas que usam `Badge`;
      confira que a variante em questão continua legível com o degrau maior antes de commitar, e
      registre no SUMMARY se apertou.
    - **`ui/calendar.tsx:33`** usa um valor em `rem` (12,8px), não em px — é o default herdado do
      shadcn. O degrau mais próximo é `text-xs` (12px). Troque por ele; se o cabeçalho de dia da
      semana do calendário ficar apertado, a saída é a mesma da regra geral, nunca um valor
      arbitrário novo.

    **Laço por arquivo, sem exceção:**
    1. `grep -n` do padrão no arquivo, para ter as linhas exatas;
    2. `Read` com `offset`/`limit` em volta de cada ocorrência;
    3. `Edit` cirúrgico — troque só o token de tamanho, preserve todas as outras classes da string
       (peso, `uppercase`, `tracking-*`, cor). Se a string já tiver `text-xs` por outro motivo,
       não duplique;
    4. `node scripts/design-tokens/escala-scan.mjs src --baseline` (o baseline é parte do
       trabalho, não um extra — sem ele a catraca continua permitindo o número antigo);
    5. as três catracas de D-07;
    6. commit `style(<area>): escala tipografica em <arquivo>`.
  </action>
  <verify>
    <automated>node scripts/design-tokens/escala-scan.mjs src --check | grep -q "Tamanho fora da escala: 0, cor em CSS puro: 0"</automated>
    <automated>node scripts/design-tokens/raw-color-scan.mjs src --check &amp;&amp; node scripts/design-tokens/token-contrast.mjs</automated>
    <automated>test "$(node -e 'const b=require("./design-system/escala-baseline.json");process.stdout.write(String(b.totalTamanho)+"/"+String(b.totalCorCss))')" = "0/0"</automated>
    <human-check>Abrir Venda Rápida, Antecipação e o painel da BFX Intelligence e confirmar que nenhum rótulo estourou o container nem quebrou em linha indesejada. Não é possível verificar isto neste ambiente — `node_modules` está vazio e não há dev server.</human-check>
  </verify>
  <done>
    Um commit por arquivo, 19 commits, na ordem da tabela. `escala-scan` reporta 0 tamanhos fora da
    escala e o baseline registra 0. Nenhum valor arbitrário novo foi introduzido. Cada aperto de
    layout está registrado no SUMMARY com a saída escolhida.
  </done>
</task>

<task type="auto">
  <name>Tarefa 3: Sombra por token — ~55 usos, componentes base primeiro</name>
  <files>
    src/components/ui/dialog.tsx, src/components/ui/alert-dialog.tsx, src/components/ui/sheet.tsx,
    src/components/ui/popover.tsx, src/components/ui/dropdown-menu.tsx, src/components/ui/select.tsx,
    src/components/ui/input.tsx, src/components/ui/textarea.tsx, src/components/ui/date-input.tsx,
    src/components/ui/toggle.tsx, src/components/ui/switch.tsx, src/components/ui/badge.tsx,
    src/components/ui/tabs.tsx, src/components/ui/card.tsx, src/components/ui/button-variants.ts,
    src/lib/design-tokens.ts, src/components/antecipacao-client.tsx,
    src/components/bfx-intelligence-panel.tsx, e os demais call sites listados pela varredura
  </files>
  <read_first>
    - `design-system/IDENTIDADE-VISUAL.md` seção 4, subseção Sombra — já lida na Tarefa 1
    - `src/components/ui/card.tsx` linhas 10-16 e `src/components/ui/button-variants.ts` linhas
      28-55 — **o idioma da casa**: classe clara e classe escura `dark:` derivada de
      `var(--shadow-*)` convivendo na mesma string de classe, inclusive para o estado de hover.
      Copie essa forma; não invente outra.
    - `src/app/globals.css` linhas 439-444 — os tokens de sombra do tema escuro já existem
      (`sm`, `md`, `lg`, `xl`). Você não precisa criar nenhum token nesta tarefa.
  </read_first>
  <action>
    **Descubra o worklist em vez de confiar numa lista congelada** — o número muda conforme você
    avança:

    ```
    grep -rn "shadow-\(sm\|md\|lg\|xl\|2xl\)\b" src --include="*.tsx" --include="*.ts" \
      | grep -v "src/app/api/relatorios/catalogo/route.ts" \
      | grep -v "shadow-\[var(--"
    ```

    Medido agora: 55 linhas em 33 arquivos (o arquivo de rota excluído é a exceção já declarada
    nos scanners — HTML autônomo com Tailwind por CDN, fora do pipeline de tokens).

    **A regra (D-03), aplicada caso a caso:**

    Toda sombra **de superfície** precisa do par de tema escuro correspondente, mapeando degrau
    para degrau: o degrau `sm` recebe `var(--shadow-sm)`, `md` recebe `var(--shadow-md)`, e tanto
    `lg` quanto `xl` recebem `var(--shadow-lg)`. Estados de hover levam o próprio par, como
    `card.tsx:12` já faz.

    **Exceção — a sombra pode simplesmente sair**, sem par, quando o elemento já tem borda própria
    E fica sobre superfície do mesmo nível. Aí a sombra não separa plano nenhum: é decoração.
    **Decida por caso e escreva a justificativa num comentário curto no código**, na linha acima
    da classe. Sem a justificativa escrita, a próxima pessoa desfaz.

    **Ordem — o que vale por muitas telas primeiro.** Componente base corrigido vale por todos os
    call sites; call site corrigido vale por uma tela.

    **Grupo A — superfícies flutuantes de `ui/` (par obrigatório, nunca remoção).** São exatamente
    o caso que a identidade visual descreve: no tema escuro, sombra sozinha não separa planos.
    - `dialog.tsx:41`, `alert-dialog.tsx:37`, `sheet.tsx:34` — degrau `lg`
    - `dropdown-menu.tsx:50` e `:68`, `select.tsx:84` — degrau `lg`
    - `popover.tsx:25` — degrau `md`

    **Grupo B — controles de formulário de `ui/` (candidatos fortes à exceção).** Todos têm borda
    própria (`border`/`border-2` com `border-input`) e ficam encaixados dentro de um card ou de um
    formulário, no mesmo plano do conteúdo — não são um plano acima. Avalie cada um e, na maioria,
    a resposta correta é remover a sombra com justificativa:
    - `input.tsx:10`, `textarea.tsx:39`, `select.tsx:22`, `date-input.tsx:73`, `toggle.tsx:16`
    - `switch.tsx:14` (o trilho) e `switch.tsx:22` (o polegar — este **se move sobre o trilho**,
      então é plano acima de verdade: par, não remoção)
    - `badge.tsx` linhas 12, 16, 35, 37, 39, 41 — selo preenchido, com borda transparente, dentro
      de tabela ou card. Decorativa: remover. Atenção à linha 12, que tem também um `hover:shadow`
      sem degrau nenhum — sai junto.
    - `tabs.tsx:33` — o gatilho ativo do `TabsList`; decida se o estado ativo é um plano acima
      (par) ou só um realce de fundo (remoção).

    **Grupo C — o resto de `ui/` e as fontes de classe em `lib/`.**
    - `card.tsx:14` (`outline`) e `card.tsx:15` (`ghost`) — as duas variantes que ficaram sem par
      quando as outras duas ganharam o seu. Siga o que as linhas 12 e 13 do mesmo arquivo fazem.
    - `button-variants.ts:52` (`secondary`) e `:53` (`ghost`) — mesmas linhas, mesmo arquivo onde
      as outras variantes já têm par.
    - `src/lib/design-tokens.ts:199` e `:202` — não são JSX, são strings de classe (`cardShadow`,
      `elevatedShadow`) consumidas pelos presets de card das linhas 280-286. Corrija a string na
      origem; confirme com `grep -rn` quem consome esses presets antes de mexer, e se ninguém
      consumir, registre isso no SUMMARY em vez de editar às cegas.
    - `src/lib/animations.ts:36` **já tem par** (aponta para o token de glow, não para o de sombra)
      — a varredura o exclui corretamente. Não toque.

    **Grupo D — call sites.** O que sobrar da varredura depois dos grupos A-C: `antecipacao-client`
    (4), `bfx-intelligence-panel` (4), `notification-bell`, `form-select`, `catalogo-publico-client`,
    `dashboard-charts`, `intelligence-chat-composer`, `importacao-client`, `historico-busca-fuzzy`,
    `fornecedores-tab-client`, `empresas-tab-client`, `copiar-link-assinatura`, `clientes-tab-client`,
    `produtos-tab-client`, `vendor-multiselect`, `venda-rapida-form-v2`, `toaster-responsive`,
    `sidebar-nav`, `receipt-preview`, `produto-item-form`, `finance-charts`, `global-error`,
    `assinatura/[token]/page`, `financeiro/page`, `layout`.

    Um caso do Grupo D merece atenção: `antecipacao-client` mistura sombra crua com sombra colorida
    por opacidade no CTA principal, e usa o degrau `lg` em dois cards da mesma página — dois níveis
    "flutuante" numa tela sem diálogo nem menu, quando a identidade visual reserva esse degrau para
    o que flutua. Ao corrigir, colapse para um degrau só de repouso mais um de destaque; a escala é
    **um degrau por nível, nunca dois na mesma superfície**.

    **Commits:** agrupe por grupo, não por arquivo — a regra aqui é uma só e o diff é legível.
    Sugestão: um commit por grupo (A, B, C) e depois dois ou três para o Grupo D por área. Rode as
    três catracas de D-07 em cada commit. Esta tarefa não mexe em tamanho de fonte nem em cor, então
    os números da escala e do baseline não devem mudar — se mudarem, você editou algo fora do
    escopo.
  </action>
  <verify>
    <automated>test "$(grep -rn 'shadow-\(sm\|md\|lg\|xl\|2xl\)\b' src --include='*.tsx' --include='*.ts' | grep -v 'src/app/api/relatorios/catalogo/route.ts' | grep -v 'shadow-\[var(--' | wc -l | tr -d ' ')" = "0"</automated>
    <automated>node scripts/design-tokens/escala-scan.mjs src --check | grep -q "Tamanho fora da escala: 0, cor em CSS puro: 0"</automated>
    <automated>node scripts/design-tokens/raw-color-scan.mjs src --check &amp;&amp; node scripts/design-tokens/token-contrast.mjs</automated>
    <human-check>Alternar tema claro/escuro e confirmar que diálogo, menu suspenso, popover e sheet continuam se destacando do fundo no escuro, e que campo de formulário e selo não ficaram chapados demais no claro.</human-check>
  </verify>
  <done>
    A varredura de sombra volta 0: toda classe de sombra da escala que sobrou em `src/` tem par de
    tema escuro derivado de `var(--shadow-*)` na mesma string. Cada sombra removida por decorativa
    tem justificativa escrita no código, na linha acima. Os números da escala tipográfica e do
    baseline continuam em 0 — nada fora do escopo foi tocado.
  </done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| nenhuma nova | O trabalho é exclusivamente de classe CSS, token de cor e variante de botão. Nenhum limite de confiança novo é criado ou atravessado: não há entrada de usuário, Server Action, query ou rota tocada (D-06 proíbe explicitamente). |

## STRIDE Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation Plan |
|-----------|----------|-----------|----------|-------------|-----------------|
| T-hsj-01 | Tampering | `src/app/(app)/relatorios/page.tsx` | low | mitigate | A mudança de D-05 remove só classes de cor do `cn(...)`. O `href` do link de exportação, incluindo `encodeURIComponent(empresa)` e os parâmetros de data, não pode ser tocado — o `<done>` da Tarefa 1 exige que a estrutura do bloco fique intacta. |
| T-hsj-02 | Denial of Service | `src/app/globals.css` | low | mitigate | Token declarado em menos de três pontos faz a classe deixar de existir **sem erro** — a página perde o fundo silenciosamente. Mitigado pela exigência explícita dos três pontos em D-04 e pela verificação automatizada que exige `var(--brilho` presente e exatamente dois `radial-gradient` restantes. |
| T-hsj-03 | Information Disclosure | tema escuro | low | accept | Sombra ausente no escuro reduz separação de planos — é perda de legibilidade, não de dado. Aceito enquanto a Tarefa 3 não fecha; fechada, deixa de existir. |
| T-hsj-SC | Tampering | npm/pip/cargo installs | high | mitigate | **Nenhuma instalação de pacote neste plano.** `node_modules` está vazio e o CLAUDE.md proíbe instalar; todos os verificadores são Node puro, já versionados em `scripts/design-tokens/`. Se alguma tarefa parecer precisar de um pacote, isso é sinal de escopo errado — pare e reporte. |
</threat_model>

<verification>
Rodar ao final, com o repositório limpo:

1. `node scripts/design-tokens/raw-color-scan.mjs src --check` — cor crua segue em 0
2. `node scripts/design-tokens/escala-scan.mjs src --check` — imprime
   `Tamanho fora da escala: 0, cor em CSS puro: 0`
3. `node scripts/design-tokens/token-contrast.mjs` — os pares de token seguem passando
4. Varredura de sombra sem par volta 0 (comando no `<verify>` da Tarefa 3)
5. `git status` limpo e `git log --oneline` mostrando um commit por arquivo na tipografia (D-01)

As três primeiras são as mesmas que o CI roda (`.github/workflows/ci.yml`, passos `cores:check`,
`contraste:check` e `escala:check`) — se passam aqui, passam lá.

Não há como rodar `vitest`, `tsc` ou `eslint` neste ambiente (`node_modules` vazio). O lint só
verifica depois do push: por isso a armadilha do comentário JSX dentro de expressão é a mais cara
deste plano.
</verification>

<success_criteria>
- [ ] `escala:check` imprime `Tamanho fora da escala: 0, cor em CSS puro: 0`
- [ ] `design-system/escala-baseline.json` registra `totalTamanho: 0` e `totalCorCss: 0`
- [ ] Varredura de sombra sem par de tema escuro volta 0; cada remoção tem justificativa no código
- [ ] Gradiente de fundo da página vem de token declarado em `:root`, `.dark` e `@theme inline`;
      a regra duplicada de tema escuro foi removida
- [ ] Botões de Exportação Rápida de `/relatorios` são `outline` puro, sem cor destrutiva
- [ ] Um commit por arquivo na tipografia, do maior ofensor para o menor (D-01)
- [ ] Nada fora do escopo travado foi tocado (D-06): sem lógica de negócio, Server Action, query
      Prisma, indicadores do Dashboard, raio do `Card` ou `dark:text-warning`
- [ ] SUMMARY registra cada aperto de layout e a saída escolhida, e cada sombra removida
- [ ] `git pull --rebase` antes do push; branch `nextjs-migration`
</success_criteria>

<output>
Criar `.planning/quick/260811-hsj-conformidade-visual-ondas-3-4-e-5/260811-hsj-SUMMARY.md` ao
terminar, contendo obrigatoriamente:
- números antes/depois de cada catraca
- a lista de casos onde a escala apertou o layout, com a saída escolhida para cada (D-02)
- a lista de sombras removidas por serem decorativas, com a justificativa (D-03)
- o nome dos tokens de brilho criados e as três linhas onde foram declarados (D-04)
- se o contexto acabou antes do fim: o que falta, com os números atuais das varreduras
</output>
