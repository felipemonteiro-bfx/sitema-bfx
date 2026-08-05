# Fase 16 — Spec das correções

Entrada: `16-ACHADOS.md` (14 achados). Escopo: as 6 rotas financeiras
(`/financeiro`, `/boletos`, `/prudent`, `/comissoes`, `/relatorios`,
`/relatorios/mensais`) e os componentes que elas renderizam.

## 1. Tokens de texto dedicados (achados 1, 2, 4)

**Atual:** `--success`, `--warning` e `--info` foram calibrados como cor de
**preenchimento** (`bg-*`), com `--*-foreground` escuro por cima. As telas
financeiras usam os mesmos tokens como cor de **texto** sobre card branco:

| token | claro, sobre `--card` | mínimo |
|---|---|---|
| `--success` | 2.97:1 | 4.5 |
| `--warning` | 2.06:1 | 4.5 |
| `--info` | 4.13:1 (2.91:1 sobre a pílula `bg-info/20`) | 4.5 |

**Esperado:** texto colorido em dinheiro/rótulo com ≥4.5:1 nos dois temas.

**Decisão de escopo — o que NÃO fazer:** não baixar o L de `--success` /
`--warning` / `--info`. Eles são fundo em `bg-success`, `bg-warning`, `bg-info`
(botões, badges sólidos, `CardHeader` do painel de inteligência) com
`--*-foreground` **escuro** por cima; escurecer o preenchimento derruba o
contraste desse par. Trocaríamos um problema por outro.

**O que fazer:** separar os papéis. Três tokens novos, calibrados como texto:

- `--success-text: oklch(0.51 0.18 145)` — 5.18:1 sobre `--card`
- `--warning-text: oklch(0.53 0.15 85)` — 5.23:1 sobre `--card`
- `--info-text:    oklch(0.51 0.18 240)` — 5.22:1 sobre `--card`

Mesma matiz e mesmo croma do token de preenchimento, só o L baixa — é o mesmo
raciocínio já documentado em `globals.css:131` para `--destructive`
(L 0.60 → 0.57). No tema escuro os valores atuais **já aprovam** (7.72 / 10.12 /
6.99 sobre `--card`), então os tokens de texto do `.dark` repetem os valores de
preenchimento; existem para a classe resolver nos dois temas.

Um token novo precisa existir em **quatro pontos**: `:root`, `.dark`,
`@theme inline` e `tailwind.config.ts`. Faltando um, a classe não existe e
falha em silêncio.

> **Achado colateral da revisão: `tailwind.config.ts` está inerte.** O projeto
> usa Tailwind v4 via `@tailwindcss/postcss`, e em v4 o config JS só é
> carregado por uma diretiva `@config` no CSS — que **não existe** em
> `src/app/globals.css` nem em nenhum outro CSS do repo. Quem gera as classes é
> o `@theme inline`. Ou seja, dos "quatro pontos" só três são funcionais; o
> quarto é convenção/documentação. Isso não quebra nada hoje, e a regra dos
> quatro pontos foi seguida à risca, mas cria uma armadilha: quem um dia
> adicionar um token **só** em `tailwind.config.ts` não terá classe nenhuma e
> nenhum erro. Vale decidir depois entre adicionar `@config "../../tailwind.config.ts"`
> ao CSS ou aposentar o arquivo.

**Cuidado com o modificador de opacidade.** `text-info-text/80` vira
`color-mix(…, 80%, transparent)` e composita contra o fundo, derrubando o
contraste: medido sobre o tint opaco, 4.59 → 3.30 (info), 4.69 → 3.27
(warning), 4.75 → 3.40 (success). `TOKEN_PAIRS` compara token com token e não
enxerga isso — o gate está no vitest.

Trocar **só os usos como texto** (`text-success` → `text-success-text` etc.).
`bg-success`, `border-success`, `text-success-foreground` ficam intactos.

**Pílula de parcela do `/prudent` (achado 4):** o fundo é `bg-info/20`, um
composto que escurece o próprio tom. Mesmo com `--info-text` o par dá 4.02:1.
Correção: usar o tint opaco que o projeto já tem (`bg-info-bg`, 4.59:1).

## 2. Demais achados

| # | Correção |
|---|---|
| 3 | `overflow-x-auto max-w-full` no `TabsList` de `QueryTabs` — a rolagem passa a ser do tablist, não da página |
| 5 | `/boletos`: botão "Buscar"/"Limpar" saem de `size:"sm"` (h-9, raio 8, 12px) para o tamanho padrão (h-10, raio 10, 14px), igual ao `Input` ao lado |
| 6 | `tabular-nums` nos KPIs de dinheiro de `/financeiro` |
| 7 | `tabular-nums` nas colunas numéricas de `/relatorios/mensais` (tabela e cards mobile) |
| 8 | `/prudent`: o card "Vendas — Antecipação" perde `variant="elevated"` e volta ao `<Card>` padrão do irmão |
| 9 | `breadcrumbs` no `PageHeader` de `/boletos` e `/prudent` |
| 10 | `/relatorios`: acentos no título, na descrição, no breadcrumb e no rótulo "Inadimplência" |
| 11 | `tabular-nums` na coluna `Comissão (%)` |
| 12 | `--muted-foreground` claro: L 0.556 → 0.545 (4.43 → 4.62 sobre o tablist; 4.54 → 4.74 sobre fundo; 4.66 → 4.87 sobre card) |
| 13 | `/financeiro`: `py-8` nos três estados vazios e texto alinhado à convenção "Nenhum…" das outras rotas |

**Achado 14 (badge "NOVO" da sidebar) — não corrigir.** Ver seção 4.

## 3. Verificação

- `node scripts/design-tokens/token-contrast.mjs` — os três pares novos
  (`*-text`/`card`, nos dois temas) entram em `TOKEN_PAIRS`, senão o token novo
  não é policiado.
- `node scripts/design-tokens/raw-color-scan.mjs --check` — sem regressão (0).
- `src/__tests__/telas-financeiras-contraste.test.ts` — gate no vitest (o CI só
  roda `src/__tests__/**/*.test.ts`) para os quatro pontos de declaração e para
  as classes das telas financeiras.

## 4. Fora de escopo, com justificativa

**Achado 14 — badge "NOVO" da sidebar (4.17:1).** É chrome global, fora das 6
rotas revisadas, e da mesma família do achado 10 da fase 15 (ainda aberto). As
opções medidas:

- copiar o padrão do badge numérico logo abaixo (`bg-[var(--sidebar-primary)]
  text-white`): **3.56:1** no claro — esse padrão também reprova, não serve de
  modelo;
- trocar por `text-sidebar-foreground` (14.15:1): passa, mas apaga o acento
  vermelho que identifica o item novo;
- aplicar a mesma receita do achado 4 — tint **opaco** + token de texto:
  funciona e mantém o acento (`--sidebar-primary-text` em L ≈ 0.78 dá 5.8:1),
  mas exige **dois** tokens novos (o tint opaco e o texto), oito pontos de
  declaração, em chrome que aparece em todas as rotas do app.

> **Correção de argumento (revisão).** A primeira versão desta seção alegava
> que criar um token de texto para a sidebar daria "um par que o verificador
> não consegue medir, por causa do alfa do fundo". O argumento é falso, e a
> própria fase 16 prova: no achado 4 o composto com alfa foi trocado por tint
> opaco justamente para tornar o par mensurável. Policiamento **não** é
> obstáculo aqui.

O que sustenta o adiamento é outra coisa: são dois tokens novos em chrome que
aparece em toda rota do app, fora das 6 telas revisadas, e a decisão certa é
uma só para o acento da sidebar inteira — junto com o achado 10 da fase 15,
que é do mesmo par de cores. Corrigir só o badge "NOVO" agora deixaria o badge
numérico logo abaixo (3.56:1) reprovando ao lado dele.
