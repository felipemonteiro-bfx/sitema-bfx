# Identidade visual do BFX

Definida em 2026-08-11 a partir da **medição do código existente**, não de um ideal abstrato.
Onde o sistema já era coerente, esta página registra a regra que ele seguia sem estar escrita.
Onde divergia, aponta o número medido e o alvo.

Complementa, sem substituir: `DE-PARA-CORES.md` (mapa de cor crua → token) e
`raw-color-baseline.json` (a catraca).

---

## 1. A marca

O verde vem do "X" da logo BFX: **`#048A05`**, que em OKLCH é `oklch(0.549 0.185 142.6)`.

Esse valor **não** é usado cru. Como `text-primary` aparece em título de página e de card por
todo o sistema, o verde da logo puro entrega 4.41:1 sobre o fundo claro — abaixo do mínimo de
4.5. A matiz (142.6) e a saturação da marca são preservadas; só a luminosidade se ajusta por
tema:

| Token | Tema claro | Tema escuro | Por quê |
|---|---|---|---|
| `--primary` | `oklch(0.52 0.177 142.6)` | `oklch(0.76 0.16 142.6)` | 4.86:1 como texto no claro; no escuro o verde da logo daria 3.6:1 e reprovaria |
| `--primary-hover` | `oklch(0.46 0.156 142.6)` | `oklch(0.82 0.15 142.6)` | escurece no claro, clareia no escuro |
| `--sidebar-primary` | `oklch(0.50 0.17 142.6)` | `oklch(0.76 0.16 142.6)` | accent da navegação |

**Croma tem teto.** Em cada luminosidade existe um croma máximo dentro do gamut sRGB; acima
dele o navegador corta e exibe uma cor diferente da declarada, silenciosamente. Os tetos
medidos nesta matiz: `L=0.44 → 0.150`, `L=0.46 → 0.156`, `L=0.50 → 0.170`, `L=0.52 → 0.177`,
`L=0.58 → 0.197`. Ao criar um tom novo do verde, verifique o teto antes de escolher o croma.

---

## 2. Cor semântica — quando ela é informação

Quatro famílias além da marca: `success`, `warning`, `error`, `info`, cada uma com
preenchimento (`--success`), texto (`--success-text`) e tint opaco (`--success-bg`).

**A regra que decide se a cor fica ou sai:** cor que carrega informação fica; cor decorativa sai.

- **Fica** — a seta de tendência (diz a direção), o valor da inadimplência (vermelho *é* o
  aviso), o status na tabela, o tint do ícone de cada indicador.
- **Fica também** — a cor fixa por métrica nos cards do Dashboard. Num painel visto todos os
  dias ela funciona como **endereço**: encontra-se o faturamento pelo azul antes de ler o
  rótulo. Isto foi testado contra a alternativa neutra em 2026-08-11 e o André manteve o
  colorido; não neutralize de novo sem novo pedido.
- **Sai** — degradê de três cores em texto de título, que não codificava nada.

Preenchimento e texto **não** são intercambiáveis: `--success`, `--warning` e `--info` são
calibrados para fundo e reprovam como texto no tema claro (2.97:1, 2.06:1, 2.91:1). Para texto,
use sempre a família `-text`.

**Exceção medida e aprovada — aviso sobre tint de aviso.** O par
`text-warning-foreground dark:text-warning` sobre `bg-warning/10` (claro) e `bg-warning/20`
(escuro) **passa** e é o idioma correto para caixa de aviso: medido em 2026-08-11, dá
**18,20:1** no tema claro e **6,93:1** no escuro. Aparece em `clientes-tab-client.tsx:217` e em
três pontos de `venda-rapida-form-v2.tsx`. A auditoria levantou os três últimos como divergência
por aplicar a regra genérica ("texto usa `-text`"); a medição mostrou que não é. Fica registrado
aqui para não voltar como falso positivo: **cor de preenchimento como texto sobre o próprio tint
é aceitável quando medida** — o que não vale é usá-la sobre o fundo da página.

---

## 3. Tipografia

Duas famílias, já configuradas em `src/app/layout.tsx`:

- **Space Grotesk** — títulos (`--font-space-grotesk`)
- **Manrope** — corpo e interface (`--font-manrope`)

### Escala

O sistema é **denso e operacional**: `text-xs` (300 usos) e `text-sm` (227) dominam, o que é
correto para telas que passam o dia abertas com tabela e formulário.

| Papel | Classe | Uso |
|---|---|---|
| Título de página | `text-2xl font-bold` + `.page-title` | um por tela, no `PageHeader` |
| Título de card | `text-lg`/`text-base font-semibold` | seção dentro da tela |
| Valor de indicador | `text-2xl font-bold tabular-nums` | número que se lê de longe |
| Corpo e formulário | `text-sm` | padrão da interface |
| Apoio, rótulo, célula densa | `text-xs` | tabela, legenda, metadado |
| Rótulo maiúsculo | `text-xs font-semibold uppercase tracking-wider` | rótulo de indicador e de seção |

**Divergência medida:** 71 usos de tamanho arbitrário fora da escala — `text-[10px]` (52),
`text-[11px]` (11) e `text-[9px]` (8), espalhados por **21 arquivos**. O `text-[9px]` é o mais
grave: abaixo do limite prático de legibilidade em tela, e nenhum deles troca de tamanho junto
com a escala. Alvo: `text-[10px]` e `text-[11px]` → `text-xs`; `text-[9px]` → `text-xs` com
revisão do layout que motivou o encolhimento.

### Pesos

Cinco em uso: `medium` (144), `semibold` (130), `bold` (121), `black` (17), `normal` (16).
**Três bastam** — `normal` para corpo, `semibold` para ênfase e rótulo, `bold` para título e
número. O `font-black` não tem papel definido e deve ser reduzido a `bold`.

---

## 4. Forma

### Raio

`--radius: 0.625rem` (10px) é a base; os degraus derivam dela por `calc()`.

> **Correção de 2026-08-11.** A primeira versão desta página afirmava que `rounded-lg` era "a
> norma de fato, 112 usos". Isso estava **errado**, e a auditoria pegou: aqueles 113 usos são
> majoritariamente de *elementos internos* (ícone, chip, bloco dentro do card), não da superfície.
> Medindo o que cada componente base define, as superfícies **discordam entre si**:

| Componente base | Raio hoje | |
|---|---|---|
| `card.tsx` | `rounded-2xl` (18px) | a superfície mais usada do sistema (53 call sites) |
| `dialog.tsx`, `alert-dialog.tsx` | `rounded-lg` (10px) | |
| `popover.tsx`, `dropdown-menu.tsx` | `rounded-md` (8px) | |
| `sheet.tsx` | `rounded-sm` (6px) | |

Card e Dialog são as duas superfícies conceitualmente mais próximas — um bloco de conteúdo e um
bloco de conteúdo flutuante — e usam raios que diferem em 8px. **Isto é a divergência, não o
`rounded-xl` dos call sites.**

**Decisão pendente** (altera a aparência de todas as telas, então é do dono do produto):

- **Alinhar tudo em 18px** (`rounded-2xl`): o Card, que é o que mais se vê, fica como está; sobem
  Dialog, Popover e Sheet. Visual mais macio; nada muda nas 20 telas em repouso.
- **Alinhar tudo em 10px** (`rounded-lg`, o valor de `--radius`): mais sóbrio e coerente com o
  token base, mas **muda o canto de todo card do sistema** — é a mudança visualmente mais visível
  de toda a identidade.

Enquanto não houver decisão, o que vale é: **elemento interno** (ícone, chip, bloco) segue
`rounded-lg`; **campo e botão** seguem `rounded-md`; **selo e avatar**, `rounded-full`. Os
`rounded-xl`/`2xl` avulsos em call sites (51 usos) continuam sendo divergência a eliminar.

### Sombra

> **Correção de 2026-08-11.** Esta página afirmava que repouso era `shadow-sm`. O `Card` variante
> `default` nasce em **`shadow-md`** e sobe para `shadow-lg` no hover; a variante `elevated` nasce
> em `shadow-lg`. Ou seja, o degrau de repouso real do sistema é `md`, e a distância entre
> `default` e `elevated` é de um degrau só.

Elevação é **um degrau por nível**, nunca dois na mesma superfície:

- superfície em repouso: `shadow-md` (o que o `Card` default faz hoje)
- superfície elevada (card de destaque): `shadow-lg`
- flutuante (diálogo, menu): `shadow-lg` + fundo escurecido

No tema escuro, sombra sozinha não separa planos — use o token `var(--shadow-*)`, mais opaco,
que é o que os componentes já fazem via `dark:shadow-[var(--shadow-md)]`. **Sombra crua sem par
`dark:` é divergência**: no escuro ela praticamente desaparece.

---

## 5. Espaçamento

Escala de 4px. Medido: `space-y-1` (146), `space-y-2` (71), `space-y-6` (51), `space-y-3` (44),
`space-y-4` (39).

| Distância | Classe | Entre |
|---|---|---|
| 4px | `space-y-1` | rótulo e seu campo |
| 8px | `space-y-2` | campos de um mesmo grupo |
| 16px | `space-y-4` | grupos dentro de um card |
| 24px | `space-y-6` | seções da página |

O `space-y-3` (12px) fica como exceção da densidade das tabelas; não introduza degraus novos.

---

## 6. O que o CI garante — e o que não garante

**Garante:**
- cor crua (`bg-green-500` e afins) falha o build — `npm run cores:check` contra
  `raw-color-baseline.json`, hoje em 0
- contraste dos 77 pares de token — `scripts/design-tokens/token-contrast.mjs`

**Não garante, e por isso está escrito aqui:**
- **cor em CSS puro.** A catraca varre classes Tailwind. O degradê de três cores dos títulos
  viveu em `.page-title-gradient` como CSS puro e atravessou intacto a troca da paleta da marca,
  invisível para as duas travas.
- **token novo sem par novo em `TOKEN_PAIRS`** não é medido por ninguém.
- **os três pontos de um token.** `:root`, `.dark` e `@theme inline` têm de concordar; faltando
  um, a classe simplesmente não existe, sem erro. `tailwind.config.ts` é inerte neste projeto
  (Tailwind v4 via `@tailwindcss/postcss`, sem `@config`).

---

## 6.1 Redesign Vantage (2026-10-16)

A paleta de neutros mudou de slate azulado (matiz 250/260) para **neutros esverdeados de croma
baixíssimo** no escuro e **croma 0** no claro; o verde da marca (`--primary`) não mudou. Há agora
degraus de superfície nomeados (página → casca → painel → card interno/poço), raios por degrau
(24/20/14/12 px), números em Geist Mono (`.tabular-nums`), título de página em `--foreground` e
um vocabulário de movimento por tokens. O contrato completo, com valores e contrastes, está em
`DE-PARA-CORES.md` seção 4.2; a fonte da verdade visual são os artboards aprovados e a spec
`docs/superpowers/specs/2026-10-16-redesign-vantage-design.md`. Substitui o que as seções 1–4
dizem sobre fundo azulado, título verde e gradiente no `body`.

## 7. Divergências abertas

Medidas em 2026-08-11, **não corrigidas** — cada uma é uma varredura de risco próprio:

| # | O quê | Tamanho | Risco de corrigir |
|---|---|---|---|
| 1 | Tamanho de fonte fora da escala | 71 usos, 21 arquivos | Baixo, mas mexe em layout denso já ajustado a olho |
| 2 | `font-black` sem papel | 17 usos | Baixo |
| 3 | `rounded-xl`/`2xl` sem critério | 51 usos | Baixo |
| 4 | Sombra por classe vs. por token | 84 usos misturados | Médio — o tema escuro depende do token |

Nenhuma delas quebra funcionalidade; todas custam consistência. Corrigir uma por vez, com a
catraca de cor e o verificador de contraste rodando, é o caminho.
