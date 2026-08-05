# SPEC — Ícone em botão: 6 defeitos + gate de runtime

Data: 2026-08-05 · Branch: `nextjs-migration` · Build medido em produção: `82dcc8b`

## Por que isso existiu

Quatro fases de revisão passaram por esses arquivos sem ver nenhum deles. A razão é
estrutural, não de atenção: **as catracas do projeto auditam token e código-fonte, nunca pixel
renderizado**. `<Trash2 className="h-3 w-3" />` se lê como 12px em qualquer revisão de diff e
renderiza 16px no navegador, porque `[&_svg]:size-4` na base do `buttonVariants` tem especificidade
maior. Só `getBoundingClientRect()` revela a diferença.

Portanto esta tarefa tem duas metades, e a segunda é a que importa: corrigir os defeitos, e criar o
verificador que os teria pego.

**Correção de escopo, vinda do dono do sistema durante a execução:** o defeito que ele enxerga é
*"quebra de linha dentro de um botão com texto"* — ícone numa linha, texto em outra. Isso é um
sintoma **diferente** do que o investigador mediu. Ele testou `scrollWidth > clientWidth`, que é
largura; quebra de linha aumenta a **altura**. É o D6 abaixo, e é a prioridade. A lição vale para o
gate: a regra (e) nasceu dessa correção, e sem ela o verificador teria continuado cego para o
defeito que o usuário vê na tela.

## Comportamento atual vs. esperado

### D1 — Badge do sino cobre o ícone e vaza do botão

`src/components/notification-bell.tsx:107`

- **Atual**: `absolute -top-1 -right-1 flex h-4 w-4` num botão `h-9 w-9` com borda de 1px.
  Medido em produção nas 21 rotas, dois temas, 1440px e 390px: `clientWidth` 34 vs `scrollWidth` 38
  (4px de estouro); o badge ultrapassa 3px à direita e 3px acima do botão.
- **Esperado**: `button.scrollWidth <= button.clientWidth`. O badge fica inteiramente dentro da
  caixa do botão.
- **Escopo**: a *sobreposição parcial* do canto superior-direito do sino é convenção de badge de
  notificação (GitHub, Linear, Slack fazem igual) e é inevitável num botão de 36px com ícone de 16px
  e contador de 2 caracteres. **Fica de fora**: eliminar 100% da interseção. O que entra é reduzir a
  massa do badge e separá-lo do glifo com um anel na cor da superfície (`ring-2 ring-sidebar`), que
  é o que resolve a legibilidade.

### D2 — `[&_svg]:size-4` sobrescreve toda classe de tamanho de ícone

`src/components/ui/button-variants.ts:4`

- **Atual**: o seletor de variante arbitrária gera `.btn svg { size: 1rem }`, especificidade (0,1,1).
  `h-3.5 w-3.5` no próprio `<svg>` tem (0,1,0) e perde. O `tailwind-merge` não enxerga o conflito
  porque as classes estão em elementos diferentes. Medido: chevrons declarados `h-3.5 w-3.5`
  renderizam 16.0×16.0; sol/lua do `ThemeToggle` declarados `h-[1.2rem]` renderizam 16.0×16.0.
- **Esperado**: uma classe de tamanho no próprio `<svg>` vence o padrão da base.
- **Correção**: `[&_svg:not([class*='size-']):not([class*='h-'])]:size-4`. É o padrão do shadcn/ui
  atual (`:not([class*='size-'])`) com uma guarda extra para `h-*`, porque o BFX declara ícone com
  `h-N w-N` e não com `size-N` (0 ocorrências de `size-N` em ícone no repo, medido).
  - **Risco avaliado**: `[class*='h-']` casa substring em qualquer lugar do atributo. Varri todos os
    `className` do repo atrás de valor que contenha `h-` sem ser classe de altura: os únicos casos
    são `max-h-[...]`/`min-h-[...]`/`h-full` em `DialogContent`/`SheetContent` — nenhum é `<svg>`.
    Guarda considerada segura neste repo. Não incluí `w-` na guarda: nenhum `<svg>` do repo declara
    `w-` sem `h-`, e cada guarda a mais é um ícone a menos herdando o padrão.
- **Consequência tratada junto**: os 15 botões de ação de `/cadastros` (`h-8 px-2` sobre a `size`
  default, que traz `py-2`) ficam com content-box de exatamente 16×16 para um ícone de 16×16 — folga
  zero nos quatro lados. Em vez de remendar `py-1.5` em cada call site, entra uma `size` de verdade:
  `iconSm: "h-8 w-8"` (sem padding, como a `icon` já é), e os call sites passam a usá-la. Resultado:
  32×32 quadrado, ícone de 16 centrado, 8px de folga por lado.

### D3 — Ícone "Ver boleto" achatado

`src/app/(app)/boletos/page.tsx:82`

- **Atual**: `<a className="… inline-flex items-center gap-1">` com `<ExternalLink className="h-3 w-3" />`.
  O `<a>` não usa `buttonVariants`, logo não recebe `[&_svg]:shrink-0`. Em 390px o flex comprime o
  ícone: declarado 12×12, renderiza **8.42 × 12.00**.
- **Esperado**: 12.00 × 12.00. Correção: `shrink-0` no ícone.

### D4 — Gap duplo em todo botão com `leftIcon`/`rightIcon`

`src/components/ui/button.tsx:61,64,70`

- **Atual**: o ícone é embrulhado em `<span className="mr-2">` (ou `ml-2`) enquanto a base do
  `buttonVariants` já aplica `gap-2`. Medido: **16.00px** entre ícone e texto onde deveriam ser 8.
  Afeta `/dashboard` "Filtrar", `/historico` "Filtros", `/venda-rapida` "Adicionar Produto", e mais
  12 call sites de `leftIcon`/`rightIcon`.
- **Esperado**: 8.00px. Correção: remover `mr-2`/`ml-2` dos wrappers e do `<Loader2>`.
- **Junto**: o `<span>` que embrulha `children` é renderizado sempre, mesmo com `children` vazio —
  e um item flex vazio ainda consome um `gap-2`. Passa a só ser renderizado quando há conteúdo.

### D5 — Abas saem da tela em 390px sem pista visual

`src/components/query-tabs.tsx:39`, `src/components/gestao-rh-tabs.tsx:33`

- **Atual**: o `TabsList` rola (`overflow-x-auto`, correção da fase 16), mas em macOS a barra é
  sobreposta e some — não há chevron nem fade. Medido: `/financeiro` "Estoque" 110px fora;
  `/boletos` "Gerar (10)" 111px fora; `/configuracoes` "Uber" 70px fora; `/cadastros` "Empresas"
  42px fora; `/gestao-rh` "Contratar" cortada.
- **Esperado**: pista visual nas bordas quando há conteúdo rolável para aquele lado, sem alterar o
  comportamento de rolagem já corrigido na fase 16.
- **Correção**: componente novo `ScrollableTabsList` em `src/components/ui/tabs.tsx` — embrulha o
  `TabsList` num `relative` e sobrepõe dois gradientes `pointer-events-none` (`from-background`),
  cada um com um chevron, com opacidade dirigida pela posição de rolagem (`scroll` + `ResizeObserver`).
  As duas telas de abas passam a usá-lo. `overflow-x-auto`/`max-w-full`/`h-auto min-h-10` continuam
  exatamente como estão.

### D6 — Ícone e texto quebrando em duas linhas dentro do mesmo controle

- **Atual**: elementos com ícone + texto que usam `inline-flex items-center gap-*` **sem**
  `buttonVariants` não herdam nem o `whitespace-nowrap` nem o `[&_svg]:shrink-0` da base. Numa
  largura apertada o rótulo quebra em duas linhas e o ícone fica solto ao lado do bloco — e o
  próprio `<svg>` é comprimido pelo flex (é o mesmo mecanismo do D3, medido em 8.42px).
- **Esperado**: uma linha só; ícone e texto com o mesmo centro vertical.
- **Correção**: `whitespace-nowrap` no container e `shrink-0` no ícone.
- **Alcance** (candidatos levantados e conferidos um a um):

| Arquivo | O que é | Ação |
|---|---|---|
| `src/components/sortable-header.tsx:23` | cabeçalho ordenável, usado em **5 tabelas** | corrigido — o de maior alcance |
| `src/components/ui/table.tsx:147` | `TableHead sortable`, o mesmo padrão dentro do próprio componente | corrigido |
| `src/app/not-found.tsx:17,24` | dois links de ação do 404 | corrigido |
| `src/app/(app)/boletos/page.tsx:79` | link "Ver boleto" — é o mesmo elemento do D3 | corrigido (junto com o `shrink-0`) |
| `src/components/venda-rapida-form-v2.tsx:750` | botão cru "Cadastrar cliente" em 390px | corrigido |
| `src/app/(app)/financeiro/page.tsx:186` | pílula do ponto de equilíbrio | corrigido — o "ícone" aqui é um `<span>` de 6px, não um `<svg>`; a regra (e) **não** vê este caso |
| `src/app/(app)/crm/page.tsx:314` | `<form inline-flex>` com select + "ok" | **sem ação** — `inline-flex` já é `nowrap`, e o pai `flex-wrap` move o form inteiro como unidade |
| `src/components/intelligence-chat-client.tsx:221` | pílula de link do chat | **sem ação** — não tem ícone; é texto puro, e texto puro pode quebrar |

- **Contrapartida do `whitespace-nowrap` em `sortable-header`** (a que foi pedida para medir): com o
  rótulo em uma linha só, a coluna fica mais larga em 390px. A rolagem que isso gera é do
  `<div className="relative w-full overflow-auto">` que o `<Table>` já embrulha
  (`src/components/ui/table.tsx:29`), **não** da página — ou seja, não vira o defeito de
  `document.scrollWidth > clientWidth` que a regra (d) policia. É a contenção padrão de tabela de
  dados, e é preferível a um cabeçalho de duas linhas com a seta comprimida. Se em algum momento a
  rolagem interna incomodar, o próximo passo é encurtar o rótulo, não soltar o `nowrap`.

- **`whitespace-normal` no projeto**: uma única ocorrência, `notification-bell.tsx:161`. É
  intencional e correta — item de lista `flex-col` de notificação, texto de várias linhas, sem
  `<svg>` dentro. A regra (e) a exclui por dois motivos independentes (direção de coluna e ausência
  de ícone), e o teste trava tanto a unicidade quanto o `flex-col`.

### Bônus — `/importacao` em 390px

`document.scrollWidth` 393 vs `clientWidth` 390. **Fica de fora desta tarefa**: o gate passa a
afirmar isso (regra d) e a rota entra no baseline com anotação, para não travar a correção dos
cinco defeitos numa sexta investigação. O gate garante que não piora.

## O gate de runtime

`scripts/ui-runtime/` — script standalone, **não** plugado no vitest (o vitest do projeto roda em
`environment: "node"`, sem jsdom nem navegador, e o CI não tem Chromium garantido).

Arquitetura em duas camadas, para que a lógica seja testável sem navegador:

1. `rendered-ui-rules.mjs` — **puro**, sem dependência externa. Recebe um *snapshot* serializável e
   devolve achados. É aqui que moram as quatro afirmações. Testado por `vitest` em
   `src/__tests__/gate-ui-runtime.test.ts` com snapshots sintéticos que reproduzem os cinco defeitos.
2. `rendered-ui-audit.mjs` — CLI. Resolve o Playwright, autentica, navega rotas × {1440, 390} ×
   {claro, escuro}, roda um coletor dentro da página (que só **coleta**, não julga) e passa o
   snapshot para a camada 1.

O coletor converte qualquer cor computada para sRGB usando o próprio motor do navegador
(`canvas.fillStyle` + `getImageData`) — é assim que `lab()`, `oklch()` e `color(srgb …)` são
resolvidos sem reimplementar conversão de espaço de cor. A composição de alfa sobre a cadeia de
ancestrais e a razão WCAG ficam na camada pura, em Node.

### O que o gate afirma

| # | Regra | O que pega |
|---|---|---|
| a | contraste WCAG de cada elemento de texto (e de cada `<svg>`) contra o **fundo efetivo**, subindo a cadeia de ancestrais e compondo alfa | pares cruzados entre famílias de token, que auditoria por par declarado nunca vê |
| b | `button.scrollWidth <= button.clientWidth` (e `scrollHeight <= clientHeight`) | D1 — badge vazando |
| c | tamanho renderizado do `<svg>` == tamanho declarado nas classes | D2 e D3 |
| d | `document.scrollWidth <= document.clientWidth` | rolagem horizontal indevida |
| e | ícone e texto do mesmo controle na **mesma linha** — agrupando os retângulos dos nós de texto em linhas e comparando o centro vertical do `<svg>` com o da linha | D6, o defeito que o dono vê. Exclui o que é quebra intencional: `flex-direction: column` e `flex-wrap: wrap` |

### Degradação

Sem Playwright resolvível ou sem executável de Chromium: imprime **`NÃO VERIFICADO`** com o motivo e
os caminhos tentados, e sai com **0**. Nunca reprova o build por ausência de ferramenta, e nunca
passa em silêncio fingindo que verificou. `--require-browser` inverte isso (exit 1) para um job de
CI que tenha navegador.

### Baseline

`scripts/ui-runtime/baseline.json`, no mesmo espírito de `raw-color-scan.mjs`: achado conhecido não
reprova, achado novo reprova. `--update-baseline` regrava.

## Arquivos afetados

**Correções**
- `src/components/sortable-header.tsx`, `src/components/ui/table.tsx`, `src/app/not-found.tsx`,
  `src/components/venda-rapida-form-v2.tsx`, `src/app/(app)/financeiro/page.tsx` — D6
- `src/components/ui/button-variants.ts` — guarda no `[&_svg]`, `size: iconSm`
- `src/components/ui/button.tsx` — gap duplo, span de children condicional
- `src/components/notification-bell.tsx` — badge
- `src/app/(app)/boletos/page.tsx` — `shrink-0`
- `src/components/ui/tabs.tsx` — `ScrollableTabsList`
- `src/components/query-tabs.tsx`, `src/components/gestao-rh-tabs.tsx` — usar o novo componente
- `src/components/{produtos,empresas,clientes,fornecedores}-tab-client.tsx` — `size: "iconSm"`
  (exceção: o botão "Vincular" de `empresas-tab-client.tsx:361` tem **texto**, não ícone — não pode
  virar 32×32; recebeu só `py-0`, que era o `py-2` herdado da `size` default apertando o content-box)

**Gate**
- `scripts/ui-runtime/rendered-ui-rules.mjs`, `scripts/ui-runtime/rendered-ui-audit.mjs`
- `scripts/ui-runtime/README.md`, `scripts/ui-runtime/baseline.json`
- `src/__tests__/gate-ui-runtime.test.ts`, `src/__tests__/icone-em-botao.test.ts`
- `package.json` — `npm run ui:runtime` e `npm run ui:runtime:strict`

## Fora de escopo

- Migrar o repo de `h-N w-N` para `size-N` em ícone (seria o alinhamento total com o shadcn atual;
  são centenas de call sites e nenhum defeito medido depende disso).
- Corrigir os achados de contraste que o gate encontrar em produção além do ícone do tema — entram no
  baseline nesta passada.
- Plugar o gate no CI: exige provisionar Chromium no runner. O `npm run` fica pronto e documentado.
