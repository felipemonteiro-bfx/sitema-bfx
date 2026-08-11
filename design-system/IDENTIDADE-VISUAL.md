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

| Elemento | Classe |
|---|---|
| Card, diálogo, bloco | `rounded-lg` (padrão — 112 usos, já é a norma de fato) |
| Campo, botão, célula | `rounded-md` |
| Selo, avatar, indicador | `rounded-full` |

**Divergência medida:** `rounded-xl` (36) e `rounded-2xl` (15) aparecem sem critério que os
distinga do `lg`. Reservar o `xl` para superfícies grandes (o chip da marca na navegação) e
eliminar o `2xl`.

### Sombra

Elevação é **um degrau por nível**, nunca dois na mesma superfície:

- superfície em repouso: `shadow-sm`
- superfície elevada (card de destaque, popover): `shadow-md`
- flutuante (diálogo, menu): `shadow-lg`

No tema escuro, sombra sozinha não separa planos — use o token `var(--shadow-*)`, mais opaco,
que é o que os componentes já fazem via `dark:shadow-[var(--shadow-md)]`.

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
