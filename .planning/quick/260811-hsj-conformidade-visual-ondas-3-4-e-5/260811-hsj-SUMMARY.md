---
phase: quick-260811-hsj
plan: 01
subsystem: design-system
tags: [tipografia, sombra, tokens, css, tailwind, conformidade-visual]
dependency-graph:
  requires: [design-system/IDENTIDADE-VISUAL.md, scripts/design-tokens/escala-scan.mjs]
  provides: [escala-tipografica-100pct, sombra-por-token-100pct, brilho-fundo-tokenizado]
  affects: [src/app/globals.css, "src/components/ui/*", 19 componentes/paginas de app]
tech-stack:
  added: []
  patterns:
    - "shadow-<degrau> dark:shadow-[var(--shadow-<degrau>)] na mesma string de classe"
    - "comentario de justificativa na linha acima de toda sombra removida por decorativa"
key-files:
  created: []
  modified:
    - src/app/globals.css
    - "src/app/(app)/relatorios/page.tsx"
    - "src/app/(app)/venda-rapida/page.tsx"
    - "src/app/(app)/crm/page.tsx"
    - "src/app/(app)/financeiro/page.tsx"
    - "src/app/(app)/historico/page.tsx"
    - "src/app/(app)/layout.tsx"
    - "src/app/assinatura/[token]/page.tsx"
    - src/app/global-error.tsx
    - src/components/venda-rapida-form-v2.tsx
    - src/components/bfx-intelligence-panel.tsx
    - src/components/antecipacao-client.tsx
    - src/components/produto-form-client.tsx
    - src/components/produto-item-form.tsx
    - src/components/cadastrar-produto-rapido-dialog.tsx
    - src/components/catalogo-publico-client.tsx
    - src/components/intelligence-chat-composer.tsx
    - src/components/intelligence-chat-client.tsx
    - src/components/produtos-tab-client.tsx
    - src/components/receipt-preview.tsx
    - src/components/enviar-email-empresa-button.tsx
    - src/components/link-assinatura-button.tsx
    - src/components/dashboard-charts.tsx
    - src/components/finance-charts.tsx
    - src/components/form-select.tsx
    - src/components/toaster-responsive.tsx
    - src/components/sidebar-nav.tsx
    - src/components/ui/badge.tsx
    - src/components/ui/calendar.tsx
    - src/components/ui/dialog.tsx
    - src/components/ui/alert-dialog.tsx
    - src/components/ui/sheet.tsx
    - src/components/ui/dropdown-menu.tsx
    - src/components/ui/select.tsx
    - src/components/ui/popover.tsx
    - src/components/ui/input.tsx
    - src/components/ui/textarea.tsx
    - src/components/ui/date-input.tsx
    - src/components/ui/toggle.tsx
    - src/components/ui/switch.tsx
    - src/components/ui/tabs.tsx
    - src/components/ui/card.tsx
    - src/components/ui/button-variants.ts
    - src/lib/design-tokens.ts
    - design-system/escala-baseline.json
decisions:
  - "Card de vencimentos em /antecipacao desce de shadow-lg para shadow-md (repouso) para nao ter dois flutuantes na mesma tela sem dialogo/menu — a card de CTA principal fica no degrau de destaque (lg)"
  - "dropdown-menu.tsx submenu e select.tsx listbox pareados no degrau real do codigo (md), nao no degrau lg citado no plano — D-03 manda mapear degrau para degrau"
  - "badge.tsx size=sm sobe de text-[10px] para text-xs, igualando ao size=default (a diferenca fica so no padding)"
  - "design-tokens.ts (cardShadow/elevatedShadow) ganhou o par mesmo sem consumidor — grep confirma que cardPresets nao e importado em lugar nenhum do codigo"
metrics:
  duration: "~2h40"
  completed: 2026-08-11
actuals:
  tokens: 210000
  tasks: 3
  commits: 26
status: complete
---

# Phase quick-260811-hsj Plan 01: Conformidade visual — ondas 3, 4 e 5 Summary

Fechou as tres divergencias medidas em `IDENTIDADE-VISUAL.md`: tipografia fora da escala (60 -> 0),
sombra sem par de tema escuro (54 -> 0) e cor literal em CSS puro no `globals.css` (4 -> 0), alem
do botao PDF de `/relatorios` que ainda carregava cor destrutiva decorativa. 26 commits, um arquivo
por commit na tipografia (D-01), baseline regravado a cada passo, tres catracas verdes em todos.

## Numeros antes/depois de cada catraca

| Catraca | Antes da sessao | Depois |
|---|---|---|
| `escala-scan` — tamanho fora da escala | 60 | **0** |
| `escala-scan` — cor em CSS puro | 4 | **0** |
| `raw-color-scan` — cor crua Tailwind | 0 | 0 (sem regressao) |
| `token-contrast` — pares de token | 77 PASS / 0 FAIL | 77 PASS / 0 FAIL (sem regressao) |
| sombra sem par de tema escuro | 55 (54 apos o par ja fechado na Tarefa 1) | **0** |

Nota sobre o numero inicial: o plano foi escrito com 62/71, mas o scanner de escala foi corrigido
(`919e310`, antes desta execucao) para ignorar comentario de codigo — a correcao tirou
`notification-bell.tsx:115` da lista (era um comentario que citava o valor antigo, nao codigo) e
baixou o total real de 62 para 60. Esta execucao partiu de 60, conforme instruido, e confirmou o
numero com o scanner antes de comecar.

## Tarefa 1 — Fatia fina (tracer), 3 commits

1. **`style(tokens)`** — `--brilho-topo-a` e `--brilho-topo-b` criados nos tres pontos
   (`:root` linha ~271-274, `.dark` linha ~388-392, `@theme inline` linha ~99-100 de
   `src/app/globals.css`); os dois `radial-gradient` do `body` passam a usar `var(--brilho-topo-*)`
   e a regra duplicada `.dark body` foi removida.
2. **`style(relatorios)`** — link de PDF por empresa vira `outline` puro (tirou `border-destructive/30
   text-destructive hover:bg-destructive/5`); rotulo "Exportacao Rapida (PDF)" entra na escala.
3. **`style(venda-rapida)`** — 3 rotulos maiusculos para `text-xs`; card-chip "Ultima Venda" ganha
   `dark:shadow-[var(--shadow-sm)]`.

## Tarefa 2 — Tipografia restante, 18 commits (maior ofensor -> menor)

O plano listava 19 arquivos, mas `notification-bell.tsx` saiu da lista (ver
`<mudanca_desde_o_plano>` no PLAN.md — o achado ali era um comentario, nao codigo, corrigido na
raiz do scanner antes desta sessao). Trabalho real: 18 arquivos.

| # | Arquivo | Trocas |
|---|---|---|
| 1 | `venda-rapida-form-v2.tsx` | 14 |
| 2 | `bfx-intelligence-panel.tsx` | 11 |
| 3 | `antecipacao-client.tsx` | 5 |
| 4 | `produto-form-client.tsx` | 3 |
| 5 | `produto-item-form.tsx` | 3 |
| 6-13 | crm, financeiro, historico, cadastrar-produto-rapido-dialog, catalogo-publico-client, intelligence-chat-composer, produtos-tab-client, receipt-preview | 2 cada |
| 14-18 | enviar-email-empresa-button, intelligence-chat-client, link-assinatura-button, badge.tsx (size=sm), calendar.tsx (weekday) | 1 cada |

Regra aplicada em todos: `text-[10px]`/`text-[11px]`/`text-[0.8rem]` -> `text-xs`. Nenhum valor
arbitrario novo foi introduzido.

### Casos onde a escala apertou o layout (D-02)

Nenhum aperto **confirmado** visualmente (nao ha dev server neste ambiente — `node_modules` vazio).
Dois pontos ficam registrados para revisao visual no proximo QA de tema, por mudarem o tamanho de um
componente BASE (afeta multiplas telas):

- **`ui/badge.tsx` (`size="sm"`)**: subiu de 10px para 12px, igualando ao `size="default"` (a
  diferenca fica so no padding, `px-2` vs `px-2.5`). Call sites: badges de perfil na sidebar
  (`layout.tsx`), tag do cliente no CRM, valores de destaque no Dashboard. Nenhum desses lugares
  tem largura fixa apertada — nao deveria quebrar, mas nao foi confirmado visualmente.
- **`ui/calendar.tsx` (cabecalho de dia da semana)**: `0.8rem` (12,8px) desceu ligeiramente para
  `text-xs` (12px) — reducao, nao aumento, sem risco de aperto. A celula (`w-9`, 36px) tem folga.

### Bug de falso-negativo do scanner (achado, fora do escopo deste plano)

Durante a Tarefa 2 (arquivo `produto-form-client.tsx`), o `escala-scan` so contava 2 das 3
ocorrencias reais do arquivo. Causa: `removerComentariosDeCodigo` (a mesma funcao que corrigiu o
`notification-bell.tsx` antes desta sessao) trata a substring `/*` de `accept="image/*"` (linha 275,
um atributo de `<input>`, nao um comentario) como abertura de bloco de comentario, e engole todo o
codigo real ate o proximo `*/` do arquivo — que so aparece nas linhas 302-303, escondendo a
ocorrencia real da linha 297 nesse meio-tempo.

Mitigacao aplicada nesta sessao: apos a Tarefa 2, rodei um grep bruto (`text-\[...\]`) em todo `src/`
e comparei manualmente contra o output do scanner — confirmei que as unicas ocorrencias restantes
sao as duas exceções ja conhecidas (`src/app/api/relatorios/catalogo/route.ts`, HTML autonomo, e o
comentario documentado de `notification-bell.tsx:115`). Nao ha ocorrencia real escondida no estado
final. **O bug do scanner em si nao foi corrigido** — esta fora do escopo deste plano (arquivo nao
listado em `files_modified`, mexer nele e uma mudanca de ferramenta, nao de UI) e merece um item
proprio. Reproduzir: qualquer string de atributo com `/*` sem `*/` na mesma linha (mime types tipo
`"image/*"`, glob patterns) engana o parser de comentario ate o proximo `*/` real do arquivo.

## Tarefa 3 — Sombra por token, 5 commits (por grupo)

Descoberta a partir de `grep -rn "shadow-\(sm\|md\|lg\|xl\|2xl\)\b" src | grep -v shadow-\[var(--`:
55 ocorrencias medidas no inicio da tarefa (54 depois que a Tarefa 1 ja fechou 1 em `venda-rapida`).

### Sombras com par adicionado (D-03 — plano acima de verdade)

**Grupo A — superficies flutuantes de `ui/`:** `dialog.tsx`, `alert-dialog.tsx`, `sheet.tsx`
(degrau lg), `dropdown-menu.tsx` menu principal (lg) e submenu (md — degrau real do codigo, nao lg
como o plano sugeria), `select.tsx` listbox (md — mesmo motivo), `popover.tsx` (md).

**Grupo B:** `switch.tsx` polegar (lg — se move por cima do trilho, plano acima de verdade),
`tabs.tsx` aba ativa (sm — sem borda propria, so a troca de fundo + a sombra a separam da trilha).

**Grupo C:** `card.tsx` outline (hover:md) e ghost (hover:sm); `button-variants.ts` secondary
(sm/hover:md) e ghost (hover:sm) — seguindo o idioma das variantes irmas no mesmo arquivo.

**Grupo D (call sites):** `global-error.tsx` (card centralizado da pagina de erro, sm);
`layout.tsx` painel da sidebar (xl -> par lg); `financeiro/page.tsx` barra inferior de assinatura
(2xl -> par lg, unico degrau disponivel); `receipt-preview.tsx` (md — fundo branco fixo por D-06, o
par so reforca a elevacao sem risco de contraste); `dashboard-charts.tsx` e `finance-charts.tsx`
tooltips de grafico (xl/lg -> par lg); `venda-rapida-form-v2.tsx` e `produto-item-form.tsx` listbox
de autocomplete (xl -> par lg); `intelligence-chat-composer.tsx` barra do composer (sm) e tooltip do
guia rapido (md); `toaster-responsive.tsx` toast (lg, via `dark:group-[.toaster]:shadow-[...]`);
`sidebar-nav.tsx` item ativo do menu (md — sem borda propria); `catalogo-publico-client.tsx` card de
produto do grid publico (sm/hover:lg); `antecipacao-client.tsx` CTA "Antecipar" (md);
`assinatura/[token]/page.tsx` barra inferior fixa (2xl -> par lg); `design-tokens.ts`
`cardShadow`/`elevatedShadow` (sm/lg — sem consumidor, ver secao propria abaixo).

### Sombras removidas por decorativas (D-03 — mesmo plano do conteudo)

Todas com justificativa em comentario na linha acima, no codigo:

| Arquivo | O que tinha | Por que decorativa |
|---|---|---|
| `input.tsx` | `shadow-sm` | border-2 propria, dentro de card/formulario |
| `textarea.tsx` | `shadow-sm` | border propria, dentro de card/formulario |
| `select.tsx` (trigger) | `shadow-sm` | border propria, dentro de card/formulario |
| `date-input.tsx` | `shadow-sm` | border-2 propria, dentro de card/formulario |
| `toggle.tsx` (outline) | `shadow-sm` | border propria, mesma toolbar |
| `switch.tsx` (trilho) | `shadow-sm` | encaixado na linha do formulario |
| `badge.tsx` (6 variantes) | `shadow-sm` + `hover:shadow` solto | selo preenchido dentro de tabela/card |
| `form-select.tsx` (trigger) | `shadow-sm` | border-2 propria, mesmo plano |
| `form-select.tsx` (PopoverContent) | `shadow-md` | ja coberto pelo par do `popover.tsx` base |
| `bfx-intelligence-panel.tsx` (4x) | `shadow-sm`/`hover:shadow-md`/`hover:shadow-sm` | blocos/itens com borda colorida, dentro do Card |
| `catalogo-publico-client.tsx` (Input) | `shadow-sm` | ja coberto pelo par removido do `input.tsx` base |
| `antecipacao-client.tsx` (chip empresa) | `hover:shadow-md` | borda propria, dentro da Card |
| `layout.tsx` (chip do logo) | `shadow-md` | decorativo, sem borda, mesmo plano do cabecalho da sidebar |
| `financeiro/page.tsx` (wrapper FluxoCharts) | `shadow-sm` | ja dentro de um Card com sombra propria |

### Caso especial — dois "flutuantes" na mesma tela (`antecipacao-client.tsx`)

A tela `/antecipacao` tinha duas `Card` em `shadow-lg` lado a lado, sem dialogo nem menu — a
identidade visual reserva esse degrau para o que flutua de verdade. Colapsado para um degrau por
nivel (D-03): a Card principal (total selecionado + CTA "Antecipar") fica no degrau de **destaque**
(`lg`, ganhou o par); a Card secundaria (vencimentos por empresa) desce para o degrau de
**repouso** (`md`, ganhou o par `md`).

### `design-tokens.ts` — presets sem consumidor

`cardShadow: 'shadow-sm'` e `elevatedShadow: 'shadow-lg'` (linhas 199 e 202) sao usados apenas
dentro do proprio arquivo, nos presets `cardPresets` (linhas 280-286). `grep -rn "cardPresets"` em
todo `src/` (incluindo os testes) nao retorna nenhum import — **nenhuma tela do sistema usa esses
presets hoje**. Adicionei o par mesmo assim (`dark:shadow-[var(--shadow-sm)]` /
`dark:shadow-[var(--shadow-lg)]`), seguindo o principio de "corrigir na origem" do plano, mas isto
e codigo morto e pode ser candidato a remocao em uma limpeza futura — fora do escopo deste plano.

## Nomes dos tokens de brilho (D-04)

- `--brilho-topo-a` e `--brilho-topo-b`, declarados em:
  - `:root` (tema claro) — `src/app/globals.css`, dentro do bloco principal iniciado na linha 101
  - `.dark` (tema escuro) — mesmo arquivo, dentro do bloco principal iniciado na linha 275
  - `@theme inline` — mesmo arquivo, linhas 99-100, como `--color-brilho-topo-a`/`-b`
- Consumidos em `body { background-image: ... }` (linhas ~422-424) via `var(--brilho-topo-a)` e
  `var(--brilho-topo-b)`.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - CLAUDE.md/hook] Nenhum uso do padrao proibido de `RegExp.exec`** — todas as
substituicoes em massa usaram `String.prototype.replace()` com string literal (nao regex com
estado), consistente com a regra do projeto.

**2. [Desvio documentado, nao Rule 4] `dropdown-menu.tsx` submenu e `select.tsx` listbox pareados
no degrau real do codigo (`md`), nao `lg` como uma das listas do plano sugeria** — o plano descreve
D-03 como mapeamento degrau-para-degrau; segui o degrau que o codigo de fato tinha, nao a lista
textual do plano, para nao inflar a elevacao de dois componentes sem necessidade.

**3. [Rule 1 - bug do scanner, documentado, nao corrigido]** ver secao "Bug de falso-negativo do
scanner" acima. Nao alterei `scripts/design-tokens/escala-scan.mjs` — fora do escopo deste plano
(nao esta em `files_modified`) e e uma mudanca de ferramenta, nao de UI. Registrado aqui para virar
um item de trabalho futuro.

Nenhuma outra divergencia do plano.

### Auth gates

Nenhum.

## Known Stubs

Nenhum.

## Threat Flags

Nenhum. Trabalho exclusivo de classe CSS, token de cor e variante de botao — nenhum limite de
confianca novo, nenhuma entrada de usuario, Server Action, query ou rota tocada, conforme D-06 e o
registro STRIDE do plano.

## Self-Check: PASSED

Verificado nesta sessao:
- `node scripts/design-tokens/escala-scan.mjs src --check` -> `Tamanho fora da escala: 0, cor em CSS puro: 0`
- `node scripts/design-tokens/raw-color-scan.mjs src --check` -> `OK — sem regressoes`
- `node scripts/design-tokens/token-contrast.mjs` -> `77 passaram, 0 reprovaram`
- `grep -rn "shadow-\(sm\|md\|lg\|xl\|2xl\)\b" src | grep -v shadow-\[var(--` (excluindo a rota
  HTML) -> `0`
- `git log --oneline cd641b4~1..HEAD` confirma os 26 commits desta sessao, um arquivo por commit na tipografia
- `git status --short` limpo (so `.planning/` nao rastreado, esperado)
- `design-system/escala-baseline.json` -> `totalTamanho: 0, totalCorCss: 0` (confirmado por leitura
  do arquivo apos o ultimo `--baseline`)
