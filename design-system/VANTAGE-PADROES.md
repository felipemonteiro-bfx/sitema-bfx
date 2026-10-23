# Padrões do visual Vantage (verde BFX)

Regras para levar qualquer tela ao visual aprovado em 16/10/2026. Fonte da verdade visual: os
artboards do canvas https://claude.ai/artifact/MUt7KZ1ZeBkGfBZWvJTiwU (cópias locais em
`/private/tmp/claude-501/-Users-andrebrumcortezferreira-Documents-BFX-sitema-bfx/c2f0ccbf-afa5-4b6f-b4f6-4358714384ff/scratchpad/artboards/`).
Telas já no padrão, para copiar a linguagem: `/dashboard`, `/historico`, `/login`, `/crm/atendimento`.

## Estrutura

- **Cabeçalho:** sempre `PageHeader` (trilha com "/", título `text-titulo` em `text-foreground`,
  descrição muted, ações à direita, `selo` opcional). Nada de título verde nem ícone colorido ao lado
  do título.
- **Degraus de superfície:** página → casca (o layout já faz) → **painel** (`Card`, `bg-card
  rounded-painel`) → **card interno** (`bg-card-elevated rounded-interno`) ou **poço** (`bg-poco
  rounded-interno`) para gráfico, tabela e lista. Um painel agrupa; dentro dele, cards internos.
  Não empilhe borda sobre borda: painel sem sombra, card interno sem borda.
- **Seções:** título da seção `text-lg font-semibold text-foreground`, subtítulo muted. Ícone de
  seção, se houver, neutro (`text-muted-foreground`) e pequeno — nunca chip colorido.
- **Espaçamento:** `gap-4`/`gap-6` entre painéis; `p-5`/`p-6` no painel; `p-4` no card interno.

## Texto e números

- **Rótulos:** frase normal ("Data da venda"), `text-sm text-muted-foreground font-medium`.
  **Proibido `uppercase`/`tracking-wide`** em rótulo, cabeçalho de tabela ou KPI.
- **Números e dinheiro:** `tabular-nums` (vira Geist Mono) e `valor-sensivel`. Valor de KPI em
  `text-foreground`; **não pinte o valor** de vermelho/verde/amarelo para dizer "custo/lucro" — o
  rótulo já diz. Cor só para estado real: negativo (`text-error-text`), destaque de marca
  (`text-marca-tint-texto`).
- **KPIs:** use `KpiCard` (`@/components/kpi-card`) dentro de um painel com grade
  `auto-fit minmax(min(100%,14rem),1fr)`.

## Cor de estado

- Tint de estado (`*-bg`/`*-text`) **só em Badge/pill de status** e em mensagem de erro/alerta
  real. **Nunca** como fundo ou borda de card inteiro (CMV vermelho, "A antecipar" amarelo,
  "Em andamento" azul → todos viram card interno neutro; o estado vai num Badge ou num ponto).
- **Avisos e notas explicativas:** caixa neutra (`bg-poco rounded-interno p-4 text-sm
  text-muted-foreground`) com ícone `Info` neutro. Azul só se for aviso que exige ação.
- Verde da marca: botão primário, item ativo, pill "marca", barra/ponto de destaque. Com
  parcimônia.

## Formulários

- `Label` acima do campo, frase normal; `Input`/`Select`/`Textarea` da `ui` (44px,
  `rounded-controle`); agrupar em painel com título de seção; ajuda/erro abaixo do campo.
- Seção de formulário não ganha fundo colorido (nada de card azul para "Cliente", verde para
  "Produto", amarelo para "Despesas").

## Tabelas e listas

- `Table` da `ui` dentro de poço/painel; cabeçalho muted sem caixa-alta; número mono à direita;
  status com Badge/ícone; ações por linha em `Button variant="ghost" size="iconSm"`.
- Estado vazio: `EmptyState` da `ui`, ícone neutro.

## Movimento

`.anim-entrada` com `style={{ "--i": n }}` nos painéis de topo. Nada de animação em JS.

## Não fazer

Gradiente, sombra pesada (`shadow-md+`), `rounded-xl/2xl` cru (use `rounded-painel/interno/
controle`), cor Tailwind crua, opacidade em texto (`text-x/70`), ícone em chip colorido, caixa-alta.

## Lint do design system

O `@shadcn/lint` (0.2.0) é a **fonte da verdade** do que uma tela pode e não pode fazer com os
componentes de `src/components/ui/*`. As seis regras estão em `error`; `npx eslint src` tem de sair
com 0 erros (o `npm run lint` roda o mesmo). A política mora em **`design-system/lint-policy.mjs`**,
lida por `eslint.config.mjs`; mudar uma linha ali é decisão de design (revise como um token novo).

| Regra | O que policia |
|---|---|
| `no-restyle` | `className` passado a componente da `ui`. Por padrão só **layout** (margem, largura, posição, grid/flex do item, alinhamento de texto) e os marcadores `valor-sensivel*`, `bloco-sensivel`, `anim-*`. Aparência entra por `variant`/`size`/props. |
| `no-arbitrary-values` | `p-[13px]`, `rounded-[10px]`, `bg-[#333]`. Passa só valor de **layout** sem degrau na escala (`grid-cols-[1fr_auto]`, `h-[90vh]`, `calc()`, `%`, `ch`). Valor com equivalente exato vira escala (`min-h-[44px]` → `min-h-11`). |
| `no-inline-styles` | `style={{ ... }}` e `<style>`. Valor dinâmico passa por custom property: `style={{ "--h": "40%" }}` + `h-(--h)`. |
| `require-static-classes` | `className` montado por concatenação/`join`. Use mapa de classes estáticas, `cn()` ou prop/variante. |
| `no-unknown-classes` | Classe que o Tailwind não gera (typo, `evo-col`). |
| `no-raw-colors` | Cor de paleta, token não declarado, cor crua em atributo SVG. |

`src/components/ui/**` fica fora de `no-restyle`, `no-arbitrary-values` e `require-static-classes`
(os componentes são donos da aparência); `no-raw-colors` e `no-inline-styles` valem ali também.

### Contratos (o que cada componente aceita do chamador)

- **Padrão:** `layout` + marcadores. Isso cobre `Button`, `Label`, `Badge` (mais `gap-*`), `Table*`
  (mais `spacing`, porque a densidade da célula é da tela), `Select*` etc.
- `Card`, `CardHeader/Content/Footer`: + `spacing`. `CardTitle/Description`: + tipografia **sem** `font-*`
  (família e peso vêm de `variant`).
- `Input` (e `CurrencyInput`/`MaskedInput`): só `pl-*`/`pr-*` para reservar espaço de ícone; tamanho,
  estado, caixa-alta e mono por prop.
- `Button`: layout e `gap-*` (composição ícone + rótulo). Tamanho, forma e cor por `size`, `forma`, `variant`.
- Contêineres sobrepostos (`Popover/Sheet/Dialog/AlertDialog*`, `Alert`, `Tabs`, `ScrollArea`…): + `spacing`;
  `PopoverContent` também tipografia.

### Quando a regra reclama

1. Existe `variant`/`size`/prop que resolve? Use (ver `label.tsx`, `button-variants.ts`, `table.tsx`,
   `input.tsx`, `card.tsx`, `badge.tsx`, `select.tsx`, `date-input.tsx`).
2. Padrão que se repete em 3+ telas? Crie a variante no componente **sem quebrar a API existente** e
   adicione um caso em `src/__tests__/lint-design-system.test.ts`.
3. Valor recorrente fora da escala (fundo pontilhado, hachura)? Vira `@utility` ou token nomeado em
   `globals.css` (token de cor: `:root`, `.dark`, `@theme inline` **e** par em `TOKEN_PAIRS`).
4. Nunca silencie com `eslint-disable` nem troque por `<button>`/`<input>` cru só para escapar da regra.

### Exceções documentadas

- **Escopo temporário em `warn`** (`eslint.config.mjs`, bloco "temporário: tarefas N/L em andamento"):
  `src/app/(app)/crm/atendimento/**`, `src/app/(janela)/**`, `loading.tsx` e a lib de whatsapp/atendimento.
  Remover o bloco quando essas tarefas fecharem.
- Allowlist de `no-arbitrary-values`: só `layout` (motivo acima). `no-inline-styles`: sem allowlist; só
  custom properties.
- Marcadores por nome (`valor-sensivel`, `valor-sensivel-fim`, `bloco-sensivel`, `anim-entrada`,
  `anim-barra`, `anim-dica`): o linter não sabe classificar classe própria e elas só ligam comportamento.
- O ícone lucide `Calendar` se confunde com o `Calendar` da `ui`: importe `CalendarDays`.
