# Auditoria — Telas públicas + componentes transversais (`ui/`)

Régua: `design-system/IDENTIDADE-VISUAL.md` (2026-08-11). Escopo: telas públicas (login,
catálogo, assinatura, offline, not-found) e os componentes de `src/components/ui/` +
`page-header.tsx` listados no pedido. Nenhum arquivo foi editado.

---

## Achados

### 1. `Card` (default) diverge da própria regra de sombra que o documento descreve — ALTA

`src/components/ui/card.tsx:12`
```
default: "border border-border bg-card shadow-md hover:shadow-lg dark:shadow-[var(--shadow-md)] dark:hover:shadow-[var(--shadow-lg)]",
```
A seção 4 do documento define elevação em um degrau por nível: repouso = `shadow-sm`,
elevado = `shadow-md`, flutuante = `shadow-lg`. O `Card` variant `default` — o mais usado do
sistema, é o que aparece em toda tela pública auditada (login, assinatura) e em ~toda tela do
app — já nasce em `shadow-md` **em repouso**, um degrau acima do que a própria régua chama de
repouso. Isso não é uma opinião de gosto: com `default` ocupando o degrau "elevado", não sobra
diferença de sombra perceptível para a variante `elevated` (`shadow-lg`/`hover:xl`) representar
uma elevação real — os dois viram uma progressão de três degraus (md→lg→xl) em vez de dois
níveis distintos (sm↔md↔lg conforme documentado).
**Alvo:** `default` → `shadow-sm hover:shadow-md` (repouso→hover elevado), preservando o par de
tokens `dark:shadow-[var(--shadow-sm)] dark:hover:shadow-[var(--shadow-md)]`. Como o `Card` é a
fonte da verdade herdada por praticamente toda superfície do app (login e o corpo de sucesso/erro
de assinatura inclusive), corrigir aqui atualiza todas as telas de uma vez.
**Esforço:** baixo na troca da classe; médio para revisar visualmente as ~50+ telas que usam
`<Card>` default, porque a sombra fica visivelmente mais sutil.

### 2. `Card` usa `rounded-2xl`, não `rounded-lg` — a norma que o próprio documento declara — ALTA

`src/components/ui/card.tsx:8`
```
const cardVariants = cva(
  "rounded-2xl text-card-foreground transition-all duration-200",
```
e `CardGlass` (não usado, ver achado 4) em `card.tsx:292` repete `rounded-2xl`.

A seção 4 do documento (Forma → Raio) afirma: "Card, diálogo, bloco → `rounded-lg` (padrão — 112
usos, já é a norma de fato)" e trata `rounded-xl`/`rounded-2xl` como divergência a ser eliminada
(item 3 das "Divergências abertas", 51 usos). Só que o próprio componente `Card` — a fonte da
verdade — nunca usou `rounded-lg`; ele sempre foi `rounded-2xl` (18px, via `--radius-2xl` =
`--radius` + 8px). Ou os "112 usos de `rounded-lg`" medidos não incluem o `Card` em si (prováveis
overrides pontuais por `className`) e a frase da seção 4 está descrevendo uma norma que o
componente central não segue, ou a contagem incluiu classes que nunca chegam a renderizar por
`cn()` reordenar. De todo modo, hoje **todo card do sistema é 18px de raio, não 10px**, incluindo
os dois usos em telas públicas (`Card` no login e nos três estados da página de assinatura) — e o
`Dialog` ao lado (`dialog.tsx:41`, `sm:rounded-lg`) usa 10px. Card e Dialog — as duas superfícies
mais próximas semanticamente do sistema — hoje têm raios diferentes lado a lado.
**Alvo:** decidir de propósito entre (a) mudar `Card` para `rounded-lg` para bater com `Dialog` e
com o texto do documento, ou (b) se `rounded-2xl` for a intenção real medida, corrigir o texto da
seção 4 do documento — ele está descrevendo um estado que o código não tem. Não reporto qual dos
dois é "certo": é julgamento de produto, mas o estado atual (documento e componente discordando)
não pode ficar como está.
**Esforço:** troca de classe é trivial; a decisão de qual lado corrigir exige o André.

### 3. `TabsList` e `ScrollableTabsList` em `rounded-xl` — mesma divergência do item 3 do documento — MÉDIA

`src/components/ui/tabs.tsx:18` (`rounded-xl`) e as pistas de rolagem em `tabs.tsx:134,144`
(`rounded-l-xl`/`rounded-r-xl`). O documento já lista `rounded-xl` como divergência de 51 usos
sem critério (seção 7, item 3), reservando `xl` só para "superfícies grandes (chip da marca na
navegação)". `TabsList` é um controle de navegação secundária, não uma superfície grande — mais
perto de "campo/botão" (`rounded-md`, segundo a tabela da seção 4) do que de card. Como o `Card`
já usa `2xl` (achado 2), esse é mais um ponto do mesmo raio "extra" se espalhando sem critério
documentado.
**Alvo:** `rounded-lg` (o `TabsTrigger` interno já usa `rounded-lg`, então hoje o trigger ativo
tem raio menor que o próprio container — outra pequena incoerência interna).
**Esforço:** baixo, busca-e-substituição, mas exige revisão visual (é um controle visível em
praticamente toda tela de listagem).

### 4. Três variantes de `Card` sem nenhum uso real no código — MÉDIA

`glass`, `interactive` e `gradient` em `cardVariants` (`card.tsx:16-18`), mais os componentes
`CardGlass` (`card.tsx:279-306`) e `CardInteractive` (`card.tsx:313-334`) exportados no arquivo
inteiro não têm nenhum call site:
```
grep -rn 'variant="glass"\|variant="interactive"\|variant="gradient"\|<CardGlass\|CardInteractive' src --include="*.tsx"
```
retorna zero ocorrências fora da própria definição. `gradient` já era sabidamente órfã (citado no
pedido); `glass`, `interactive` e os dois componentes wrapper (`CardGlass`, `CardInteractive`)
também estão órfãos e não apareceram na varredura. Cada um é superfície livre para divergir sem
ninguém notar (a `interactive`, por exemplo, usa `hover:scale-[1.02]` e `dark:hover:shadow-[var(--glow-primary)]`,
padrões que não aparecem em nenhum outro lugar do sistema e nunca foram visualmente validados em
produção).
`outline` tem exatamente **um** call site real (`historico-vendas-cards.tsx:104`) — não é órfã,
mas está a um refactor de virar uma.
**Alvo:** remover `glass`, `interactive`, `gradient`, `CardGlass`, `CardInteractive`, ou decidir
formalmente mantê-las e documentar onde devem ser usadas. Não é decisão de arquitetura desta
auditoria, só o registro do risco.
**Esforço:** baixo (deleção), mas exige confirmar que nada os importa via barrel/re-export antes.

### 5. Página de assinatura nunca renderiza um `<h1>` — MÉDIA (acessibilidade estrutural)

`src/app/assinatura/[token]/page.tsx` tem quatro estados de retorno (loading, sucesso, erro,
formulário principal) e nenhum deles usa `<h1>`. Os dois estados de card usam `<h2>`
(`assinatura/[token]/page.tsx:93` "Parabéns pela compra!", `:109` "Não foi possível carregar"), e
o modal de assinatura usa outro `<h2>` (`:209` "Assine com o dedo"). Como não há `PageHeader`
nesta rota (correto — é pública e fora do app), a tela fica sem nenhum título de nível 1 em
nenhum dos quatro estados possíveis, incluindo o estado principal com o iframe do PDF, que não
tem heading algum.
**Alvo:** promover o `<h2>` dos estados de sucesso/erro para `<h1>` (mesmo padrão já aplicado ao
login, comentário em `login/page.tsx:57-63`, fase 18 achado 9); no estado principal (iframe),
considerar um `<h1>` visualmente oculto (`sr-only`) descrevendo a tela, já que o título visível
"pertence" ao PDF dentro do iframe.
**Esforço:** baixo.

### 6. Botões só-ícone sem `aria-label` na tela de assinatura — MÉDIA

`src/app/assinatura/[token]/page.tsx:210-216` — botão de fechar o modal de assinatura (ícone `X`)
não tem `aria-label` nem texto visível, só o ícone:
```tsx
<button type="button" onClick={handleModalCancel} className="p-2 -mr-1 rounded-full ...">
  <X className="h-5 w-5" />
</button>
```
Mesmo padrão no botão de "limpar" do `Input` (`src/components/ui/input.tsx:93-102`, ícone `X`,
sem `aria-label`) — este é um componente transversal, então o defeito se propaga a todo `Input`
com `clearable`. O `Dialog` do shadcn (`dialog.tsx:47-50`) faz certo — tem `<span className="sr-only">Close</span>`.
**Alvo:** `aria-label="Fechar"` no botão do modal de assinatura; `aria-label="Limpar"` (ou texto
`sr-only`) no botão de limpar do `Input`.
**Esforço:** baixo.

### 7. `DialogPrimitive.Close` com texto `sr-only` em inglês — BAIXA

`src/components/ui/dialog.tsx:49` — `<span className="sr-only">Close</span>`. Todo o resto do
sistema audita em português (`aria-label="Buscar produtos"` no catálogo, `aria-label="Limpar
busca"` em várias tabs). Este é o texto lido por leitor de tela em todo diálogo do sistema.
**Alvo:** `Fechar`.
**Esforço:** trivial.

### 8. `font-black` fora de papel definido, na única tela pública que usa peso variável de marca — BAIXA

`src/app/catalogo/page.tsx:56` — fallback de logo em texto ("BFX") usa `font-black`. O documento
(seção 3, "Pesos") já reduz `font-black` a divergência sem papel definido (17 usos) e recomenda
`bold`. Este é o único uso de `font-black` nas telas públicas auditadas.
**Alvo:** `font-bold`.
**Esforço:** trivial.

### 9. `Badge` `size="sm"` usa `text-[10px]`, fora da escala — BAIXA

`src/components/ui/badge.tsx:47` — `sm: "px-2 py-0.5 text-[10px]"`. Está listado no documento
(seção 3, 71 usos totais fora da escala) mas vale registrar que é um componente transversal:
qualquer `<Badge size="sm">` em qualquer tela do sistema herda o tamanho fora de escala.
**Alvo:** `text-xs` (a escala já tem `text-xs` = 12px; 10px não tem degrau próprio na tabela do
documento).
**Esforço:** trivial, requer checar se o badge pequeno cabe visualmente em `text-xs` nos lugares
mais apertados (célula de tabela densa).

### 10. Cor hardcoded (hex) na tela de assinatura, fora das duas travas — BAIXA / informativo

`src/app/assinatura/[token]/page.tsx:150,164,165,171,213`. Já é uma exceção **documentada** no
próprio código (comentário `:142-146`, "Fase 14, D-06": a tinta da assinatura é sempre preta, e o
fundo da barra não pode escurecer no tema escuro ou o traço fica ilegível). Não é uma cor de
Tailwind crua (então nenhuma das duas catracas do documento a pega, seção 6) nem se enquadra na
exceção já conhecida do `route.ts` do catálogo. Não recomendo alterar — é uma decisão de produto
já justificada — só registro que ela existe fora do radar de qualquer trava automática, caso a
paleta de marca mude de novo e ninguém lembre de revisitar esses cinco hexadecimais.
**Alvo:** nenhum (ação = nenhuma; achado informativo).
**Esforço:** n/a.

### 11. Ícone de estado do `offline/page.tsx` em `rounded-2xl`, diferente do padrão de "selo/indicador" do documento — BAIXA

`src/app/offline/page.tsx:9` — wrapper do ícone `WifiOff` usa `rounded-2xl`. A tabela da seção 4
classifica "selo, avatar, indicador" como `rounded-full`, que é exatamente o padrão que
`empty-state.tsx:158` usa para o wrapper equivalente (`rounded-full` + `ring-1 ring-border/50`).
O `offline` é a única tela pública com um ícone-em-círculo fora desse padrão.
**Alvo:** `rounded-full`, para bater com `EmptyState`.
**Esforço:** trivial.

---

## O que passou

- **Login e catálogo ficam neutros, como a identidade pede.** Nenhum dos dois usa `.page-title`
  (verde) — `login/page.tsx:64` é `text-2xl font-semibold` sem cor própria (herda
  `text-card-foreground`/`foreground`), `catalogo/page.tsx:61` é `text-foreground` puro. Correto:
  são telas fora do contexto do app.
- **Nenhuma referência residual a `.page-title-gradient`** em todo o repositório — só existe
  `.page-title` (verde sólido, `globals.css:788`), como o pedido pediu para confirmar.
- **`page-header.tsx` está limpo**: um `<h1>` por chamada, breadcrumb condicional, sem cor
  hardcoded — usa a classe `.page-title` corretamente.
- **`label.tsx`, `table.tsx`, `empty-state.tsx`, `skeleton.tsx`, `badge.tsx` (fora do item 9),
  `input.tsx` (fora dos itens 6) e `button-variants.ts`** não têm tamanho arbitrário nem
  `font-black`, e usam `rounded-md`/`rounded-lg` de forma consistente com o papel de cada
  elemento (campo/botão em `md`, bloco maior em `lg`).
- **`not-found.tsx`**: um `<h1>`, `rounded-lg` nos dois links de ação (campo/botão — correto por
  papel), sem cor hardcoded.
- **Sombra por token no escuro**: todos os componentes auditados que usam sombra (`Card`,
  `Dialog` via `shadow-lg` fixo — ver observação abaixo, `Input`, `Button`, `Badge`) declaram o
  par `dark:shadow-[var(--shadow-*)]` onde fazem sentido; exceção notada: `Dialog` (`dialog.tsx:41`)
  não tem par `dark:shadow-[var(--shadow-lg)]` — fica só em `shadow-lg` cru nos dois temas. É
  uma superfície flutuante (a categoria que o documento diz precisar do token no escuro), então é
  uma divergência menor a somar ao item já catalogado na seção 7 do documento (84 usos de sombra
  misturados classe/token) — não abro item numerado próprio porque já está coberto por essa
  divergência aberta.

---

## Contagem por categoria

| Severidade | Qtde |
|---|---|
| ALTA | 2 |
| MÉDIA | 4 |
| BAIXA | 5 |

Total de achados acionáveis: **11** (10 com ação recomendada + 1 informativo sem ação).

## Correção segura por busca-e-substituição

- #3 `rounded-xl` → `rounded-lg` em `tabs.tsx` (3 ocorrências)
- #5 `<h2>` → `<h1>` nos dois estados de card de `assinatura/[token]/page.tsx`
- #6 adicionar `aria-label` (2 pontos)
- #7 `Close` → `Fechar`
- #8 `font-black` → `font-bold`
- #9 `text-[10px]` → `text-xs` em `badge.tsx`
- #11 `rounded-2xl` → `rounded-full` em `offline/page.tsx`

## Exige julgamento visual (não é troca mecânica seca)

- #1 mudança de `shadow-md` para `shadow-sm` no `Card` default — precisa revisão visual em massa
  (é a superfície mais usada do sistema; a sombra fica objetivamente mais sutil)
- #2 decisão entre alinhar `Card` a `rounded-lg` (mudando 100+ superfícies) ou corrigir o texto
  do documento — decisão de produto, não de código
- #4 decidir manter ou remover as três variantes órfãs de `Card` — requer confirmar zero
  importação indireta antes de apagar

## Achados que beneficiam TODAS as telas de uma vez

Os itens #1, #2 e #4 vivem em `card.tsx` — o componente mais reusado do sistema (login, os três
estados da tela de assinatura, e praticamente toda tela autenticada usam `<Card>`). Corrigir a
sombra de repouso (#1) e resolver a divergência de raio entre `Card` e `Dialog` (#2) atualiza a
aparência de toda superfície-card do sistema em uma única mudança, sem tocar em nenhuma tela
individualmente. O item #3 (`TabsList`) tem o mesmo efeito de alavancagem para qualquer tela com
abas.

## Hipóteses não verificadas

- Não confirmei visualmente (sem servidor de dev rodando nesta sessão — auditoria só de código)
  o efeito real da divergência de sombra do achado #1; a leitura é inferida da comparação entre
  as classes declaradas e a regra escrita no documento, não de captura de tela.
- O "112 usos de `rounded-lg`" citado pelo documento como norma de fato do card não foi
  re-medido nesta auditoria; achado #2 assume que esse número não inclui o componente `Card`
  em si, mas não fiz a contagem completa para confirmar.

---

## Arquivos auditados

- `src/app/(auth)/login/page.tsx`
- `src/app/catalogo/page.tsx`
- `src/app/assinatura/[token]/page.tsx`
- `src/app/offline/page.tsx`
- `src/app/not-found.tsx`
- `src/components/ui/button-variants.ts`
- `src/components/ui/card.tsx`
- `src/components/ui/badge.tsx`
- `src/components/ui/input.tsx`
- `src/components/ui/label.tsx`
- `src/components/ui/table.tsx`
- `src/components/ui/dialog.tsx`
- `src/components/ui/empty-state.tsx`
- `src/components/ui/skeleton.tsx`
- `src/components/ui/tabs.tsx`
- `src/components/page-header.tsx`
- `design-system/IDENTIDADE-VISUAL.md` (régua)
- `src/app/globals.css` (trecho `.page-title`, verificação de `.page-title-gradient`)
