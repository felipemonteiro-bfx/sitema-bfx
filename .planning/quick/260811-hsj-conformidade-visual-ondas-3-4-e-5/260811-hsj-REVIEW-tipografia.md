---
review: tipografia (risco de quebra de layout)
range: 919e310..644dbc7
commits_revisados: 19
metodo: leitura de codigo (git show, commit a commit) — sem renderização,
  sem vitest/tsc/eslint (node_modules vazio)
status: issues_found
---

# Review: risco de quebra de layout nas trocas `text-[10px]`/`text-[11px]` → `text-xs`

**Escopo:** os 19 commits `style(...)... escala tipografica...` entre `919e310` e `644dbc7`,
revisados do maior para o menor por linhas alteradas. Todos, exceto `0fd44e8` (calendar
weekday), seguem o padrão 10px/11px → 12px (`text-xs`), um ganho de até ~20%.

**Nota de método:** todas as conclusões abaixo são análise estática de classes Tailwind e da
estrutura JSX ao redor de cada troca — não houve renderização real. Onde o resultado depende do
conteúdo de dado real (nome de categoria, valor de comissão, etc.), isso está marcado
explicitamente como hipótese.

`0fd44e8` (calendar weekday) fica fora da lista abaixo por não se encaixar no padrão da
pergunta: troca `text-[0.8rem]` (12,8px) → `text-xs` (12px) — é uma redução, não um aumento.

## Achados — o que olhar na tela

### 1. `src/components/venda-rapida-form-v2.tsx:1160` — rótulo "Comissao (X%)" no grid de resumo financeiro
**Classificação: MÉDIA/ALTA** (depende do breakpoint real na tela)

```tsx
<div className="rounded-lg bg-warning-bg px-3 py-2.5 text-center">
  <div className="text-xs uppercase tracking-wider text-muted-foreground">Comissao ({comissaoPct}%)</div>
```

Container: `grid grid-cols-2 sm:grid-cols-4 gap-3` (linhas 1121 e 1146) dentro de um `<form
className="space-y-6">` de coluna única (sem sidebar dividindo largura). Em telas na faixa do
breakpoint `sm` (~640–1024px, antes de qualquer breakpoint maior específico desta tela), a
grade já está em 4 colunas fixas, e cada card (`px-3 py-2.5`, `gap-3`) sobra ~100–110px de
largura útil para o texto. `"COMISSAO (30%)"` em `uppercase tracking-wider` a 12px chega bem
perto dessa margem — é o rótulo mais longo dos oito desse par de grids (`Subtotal`, `Frete`,
`Total Venda`, `Valor Parcela`, `Custo Total`, `Lucro Bruto`, `Margem`, `Comissao (X%)`), e o
único com um número dinâmico embutido (`comissaoPct` não tem teto conhecido no componente — se
for de dois dígitos, o rótulo fica ainda mais longo). Como as células do grid não têm altura
fixa, quebrar para 2 linhas não estoura a caixa, mas desalinha o valor abaixo do rótulo em
relação às outras 3 colunas da mesma linha (a grade `align-items: stretch` do CSS Grid estica
todas as células da linha para a mesma altura, mas o conteúdo interno de cada `<div>` empilha
label+valor, então a célula com o rótulo de 2 linhas empurra seu próprio valor para baixo,
enquanto as vizinhas mantêm o valor mais alto — assimetria visual).

### 2. `src/components/antecipacao-client.tsx:459-478` — rótulos "Prazo médio" / "Taxa total" / "Líquido"
**Classificação: MÉDIA**

```tsx
<div className="grid grid-cols-3 gap-2 sm:gap-3 flex-1">
  <div className="rounded-lg bg-info-bg border border-info px-3 py-2.5">
    <div className="text-xs font-bold uppercase tracking-wider text-info-text">Prazo médio</div>
```

Esse grid de 3 métricas divide a largura com o bloco `min-w-[140px]` de "Total a Antecipar" na
mesma linha flex (`sm:flex-row sm:items-center sm:gap-6`), a partir do breakpoint `sm` (640px).
Nessa largura, o espaço restante para as 3 colunas fica apertado (compare com o caso 1: mesmo
padrão `px-3 py-2.5` + `uppercase tracking-wider font-bold`, agora ainda mais estreito porque
divide a linha com outro bloco). Risco concreto de "Prazo médio" ou "Taxa total" quebrarem para
2 linhas nesse intervalo de largura específico (tablet estreito), com o mesmo efeito de
desalinhamento do item 1.

### 3. `src/components/produtos-tab-client.tsx:304-305` — placeholder "Sem foto" em caixa fixa 40×40
**Classificação: MÉDIA**

```tsx
<div className="w-10 h-10 bg-muted rounded flex items-center justify-center text-xs text-muted-foreground">
  Sem foto
</div>
```

Container de largura E altura fixas (`w-10 h-10` = 40×40px), sem `overflow-hidden` nem
`whitespace-nowrap`. A 10px o texto "Sem foto" já quebrava em 2 linhas (`Sem` / `foto`) com
folga generosa (line-height ~11-12px/linha × 2 ≈ 22-24px de 40px disponíveis). Em `text-xs`
(12px, line-height Tailwind padrão de 16px), as mesmas 2 linhas passam a ocupar ~32px dos 40px
disponíveis — ainda cabe, mas a margem vertical cai de ~16px para ~8px. Cada palavra
individualmente ainda deve caber na largura de 40px, então o risco maior aqui é de aperto
vertical, não de estouro horizontal. Vale checar visualmente numa tabela de produtos sem foto.

### 4. `src/components/produto-form-client.tsx:294-299` — badge "Já existe!" sobreposto ao input de nome
**Classificação: ALTA**

```tsx
<div className="relative">
  <Input value={nome} ... className={cn("uppercase", isDuplicate ? "border-warning" : "")} />
  {isDuplicate && (
    <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 text-warning-text">
      <AlertCircle className="h-4 w-4" />
      <span className="text-xs font-bold">Já existe!</span>
    </div>
  )}
</div>
```

Este é exatamente o padrão "sobreposto/absoluto" da pergunta: `absolute right-3 top-1/2
-translate-y-1/2` ancorado à direita, sem `right` dinâmico e sem que o `<Input>` reserve
`padding-right` para esse selo (não há `pr-*` na classe do Input). O selo já fica por cima do
texto digitado quando o nome é longo o bastante para chegar perto da borda direita — isso é
pré-existente, não introduzido por este commit. Só que o selo cresce ~20% de largura
("Já existe!" em negrito, 10px→12px), então cobre uma faixa horizontal maior do campo do que
antes, piorando a sobreposição sempre que ela já ocorria. Verticalmente é seguro
(`top-1/2 -translate-y-1/2` centraliza, sem `h-*` fixo no selo). Depende do comprimento real do
nome do produto digitado — em nomes curtos não há sobreposição nenhuma; em nomes que já
encostavam no selo, agora encostam mais.

### 5. `src/components/catalogo-publico-client.tsx:97-100` — badge de categoria sobre a imagem do card
**Classificação: MÉDIA**

```tsx
<div className="relative aspect-square bg-muted dark:bg-background">
  <ProdutoImagem src={imgPath} alt={p.nome} />
  {p.categoria && (
    <span className="absolute left-3 top-3 rounded-lg bg-primary/90 px-2 py-1 text-xs font-bold uppercase tracking-wider text-primary-foreground dark:bg-primary/80">
      {p.categoria}
    </span>
  )}
</div>
```

Selo `absolute left-3 top-3` sem `right` nem `max-w` — cresce livremente para a direita conforme
o nome da categoria. O `<article>` pai (linha 93) tem `overflow-hidden`, então o pior caso não é
vazamento sobre o card vizinho no grid, e sim o próprio selo sendo cortado abruptamente na borda
direita da imagem quando `p.categoria` for um nome longo (ex.: "Eletrodomésticos", "Beleza e
Cuidados Pessoais" — nomes de categoria são texto livre vindo do cadastro de produto, sem limite
de tamanho visível no componente). `uppercase tracking-wider` já é o combo mais largo por
caractere da lista de trocas desta rodada, e o ganho de 10px→12px empurra ainanda mais perto do
corte para qualquer categoria de nome médio/longo.

## Trocas verificadas e descartadas (contexto, não listadas em detalhe)

Revisadas e julgadas seguras por não se encaixarem em nenhum dos 5 sinais da pergunta
(container fixo, `nowrap` competindo por espaço, célula de tabela densa, sobreposição sem
container fixo, ou rótulo maiúsculo com folga real de largura): `receipt-preview.tsx` (rodapé
full-width), `produto-item-form.tsx` (grid-cols-3 sem `font-bold`, labels curtos, folga ampla),
`financeiro/page.tsx` (pílulas `rounded-full` sem largura fixa), `historico/page.tsx` (grid de
2 col. com labels curtos "Valor"/"Custo"), `crm/page.tsx` (select com `line-clamp-1` já
truncando o texto — troca de fonte não muda o comportamento de corte), `link-assinatura-button.tsx`,
`intelligence-chat-client.tsx`, `intelligence-chat-composer.tsx`, `enviar-email-empresa-button.tsx`,
`cadastrar-produto-rapido-dialog.tsx`, badge `size="sm"` (`badge.tsx`, sem override de altura
fixa nos usos encontrados em `grep`), `bfx-intelligence-panel.tsx` (grid-cols-3 sem breakpoint
apertado, botão `h-6`+`text-xs` com folga de line-height), `calendar.tsx` (fora do padrão, é
redução de tamanho).

---
_Revisado: 2026-08-11_
_Reviewer: Claude (revisão adversarial, código estático — sem renderização)_
