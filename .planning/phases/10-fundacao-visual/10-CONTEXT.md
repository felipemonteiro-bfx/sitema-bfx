# Phase 10: Fundação visual - Context

**Gathered:** 2026-08-03
**Status:** Ready for planning
**Mode:** Smart discuss (autonomous)

<domain>
## Phase Boundary

A base que impede a inconsistência de voltar: um mapa de-para cor crua → token semântico, uma
regra de lint que barra regressão no CI, e os problemas de acessibilidade de base corrigidos.

</domain>

<decisions>
## Implementation Decisions

- **D-01 — Não é redesign, é migração para os tokens que já existem.** A skill `ui-ux-pro-max`
  sugeriu uma paleta própria (azul `#1E40AF` + âmbar `#D97706`). **Descartada.** O BFX tem
  identidade (slate + verde) e a paleta oficial da marca segue bloqueada em UXP-06. O que se
  aproveita da skill é o checklist de qualidade, não a paleta.

- **D-02 — O de-para segue a semântica, não a aparência.** `bg-green-100` vira `bg-success-bg`
  porque significa "sucesso", não porque é verde. Isso é o que faz o dark mode funcionar: o token
  troca de valor entre temas, a cor crua não. Mapa base:

  | Cor crua | Token | Quando |
  |---|---|---|
  | `green-*` | `success` / `success-bg` / `success-foreground` | confirmação, valor positivo, ativo |
  | `red-*` | `error`/`destructive` + variantes | erro, valor negativo, exclusão |
  | `yellow-*`, `amber-*` | `warning` / `warning-bg` | alerta, pendência |
  | `blue-*`, `indigo-*` | `info` / `info-bg` | informação, destaque neutro |
  | `gray-*`, `slate-*`, `zinc-*` | `muted` / `muted-foreground` / `border` / `card` | estrutura, texto secundário |

- **D-03 — Cor nunca sozinha.** Regra de acessibilidade confirmada na consulta à skill
  ("Don't convey information by color alone", severidade High): onde a cor indica estado
  (positivo/negativo, sucesso/erro), tem que haver ícone ou texto junto. Vale especialmente para
  as telas financeiras (Fase 12), onde verde/vermelho carregam significado.

- **D-04 — A trava de lint é o entregável mais importante da fase.** Sem ela, cada tela migrada
  regride. Implementar como regra ESLint que barra `(bg|text|border)-(red|blue|green|…)-[0-9]{2,3}`
  em `src/`, com exceção declarada para `globals.css` e para qualquer arquivo que precise
  legitimamente (nenhum previsto). O lint do CI hoje tem `continue-on-error: true` — a regra
  precisa **falhar de verdade**, então o passo do CI também muda para essa regra específica, ou
  a regra entra como `error` e o step de lint deixa de ser tolerante.

- **D-05 — Migrar por tela, não tudo de uma vez.** As fases 11-14 fazem a migração; esta fase
  entrega o de-para, os tokens que faltarem e a trava. Assim cada tela migrada é verificável
  isoladamente e o risco fica contido.

- **D-06 — Tokens faltantes entram agora.** Se o de-para revelar um caso sem token correspondente
  (ex.: um tom intermediário usado em badge), o token entra em `globals.css` nos dois temas nesta
  fase — as fases seguintes não devem precisar criar token.

</decisions>

<code_context>
## Existing Code Insights

- `src/app/globals.css` — tokens já definidos: `background`, `foreground`, `card`,
  `card-elevated`, `primary`, `secondary`, `muted`, `accent`, `destructive`, `success`,
  `warning`, `error`, `info`, cada um com `-foreground` e vários com `-bg`. Bloco `.dark`
  separado. Os tokens de fundo do tema claro foram para croma zero na Fase 8.
- `tailwind.config.ts` — mapeia os tokens para classes (`bg-success`, `text-error`, etc.).
  Nenhuma mudança de config prevista.
- `src/components/ui/` — 34 componentes shadcn, já usando tokens. São a referência de estilo
  correto; a inconsistência está nas telas e nos componentes de domínio.
- Concentração das 250 ocorrências: `bfx-intelligence-panel.tsx` (100),
  `antecipacao-client.tsx` (48), `catalogo-publico-client.tsx` (24), `catalogo/page.tsx` (13),
  `assinatura/[token]/page.tsx` (11), `receipt-preview.tsx` (9), `importacao-client.tsx` (9).
- `eslint.config.mjs` — onde a regra nova entra.
- `.github/workflows/ci.yml` — o step `Lint` tem `continue-on-error: true` (ver D-04). Há um erro
  de lint pré-existente em `src/components/historico-antecipacoes.tsx:27`
  (`window.location.href` — "This value cannot be modified") que precisa ser resolvido ou
  explicitamente suprimido antes de tornar o lint bloqueante.

</code_context>

<specifics>
## Specific Ideas

- O de-para deve ser um documento versionado (`design-system/` ou `.planning/`), não conhecimento
  tácito — as fases 11-14 e qualquer pessoa futura consultam ele.
- A verificação natural da fase é um script/one-liner que conta ocorrências de cor crua por
  arquivo. Ele vira o medidor de progresso das fases seguintes: começa em 250 e tem que chegar a 0.
- Para `aria-label`: são 5 botões `size="icon"`, 2 já têm. Corrigir os 3 restantes é barato.
- Cuidado com falso positivo no grep: `bg-background`, `text-foreground` e afins não são cor crua.
  O padrão tem que casar só com escala numérica do Tailwind (`-50` a `-950`).

</specifics>

<deferred>
## Deferred Ideas

- Aplicar a paleta oficial da marca (UXP-06) — bloqueada nos hex do cliente.
- Trocar a tipografia (a skill sugeriu Fira Code/Fira Sans) — fora de escopo, mexe em identidade.
- Animações e motion — o sistema hoje é sóbrio; introduzir movimento não foi pedido.
- Redesign de layout, densidade ou hierarquia das telas.

</deferred>
