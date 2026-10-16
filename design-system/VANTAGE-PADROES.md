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
