# SPEC — "Cadastrar cliente" fora do padrao e disposicao do item de produto (/venda-rapida)

Relato do Andre (2026-08-11), em https://bfx.softlive.dev/venda-rapida:

> "Cadastrar cliente o botao esta fora de padrao e em PRODUTO #1 / PRODUTO * / CUSTO UNIT. / VALOR
> UNIT. / QTD / SUBTOTAL / LUCRO / MARGEM precisa melhorar a disposicao dos itens"

Sao dois defeitos independentes na mesma tela. Nenhum e de cor: os tokens ja estao certos (a onda
anterior, `eda3a42`, igualou os tints dos tres blocos de resultado). Os dois sao **estruturais** —
o mesmo diagnostico da skill `shadcn-bfx`: "o v1.2 migrou 313 classes de cor para tokens e a
inconsistencia permaneceu, porque o problema e estrutural, nao cromatico".

---

## D-01 — "Cadastrar cliente" e o unico `<button>` cru com estilo a mao do projeto

**Hoje** (`src/components/venda-rapida-form-v2.tsx:752-759`):

```tsx
<button
  type="button"
  onClick={() => setClienteDialogOpen(true)}
  className="inline-flex items-center gap-1 whitespace-nowrap text-xs font-medium text-info-text hover:underline"
>
  <Plus className="h-3.5 w-3.5 shrink-0" />
  Cadastrar cliente
</button>
```

O que ele nao herda por ser HTML cru: padding, raio, peso de fonte, `hover` de superficie, anel de
foco (`focus-visible:ring-2 ring-ring ring-offset-2`) e altura minima. Ele fica visivelmente
diferente do "Adicionar Produto" da secao seguinte, que e `<Button variant="outline" size="sm">`
com `leftIcon` — **a 200px de distancia na mesma tela, duas acoes "adicionar" com duas linguagens.**

E o unico caso do genero: a busca por acao inline de cadastro (`grep -rn -B4 "Cadastrar cliente\|
Novo cliente\|Cadastrar produto"`) devolve so este. A skill `shadcn-bfx` conta 1 `<button>` cru
restante no projeto (`intelligence-chat-composer.tsx`, gatilho `display:none`, excecao legitima) —
este nao aparecia na contagem porque o `grep` de uma linha nao ve o `className` que esta 3 linhas
abaixo da tag, exatamente o erro de medicao que a propria skill alerta.

Defeito secundario na mesma linha: a linha do rotulo (`flex items-center justify-between`) e
seguida direto pelo `<Input>`, **sem o `space-y-2`** que todos os outros campos da tela usam entre
rotulo e campo. O campo de cliente e o unico colado no rotulo.

**Esperado:** `<Button type="button" variant="outline" size="sm" leftIcon={<Plus/>}>`, a mesma
declaracao do "Adicionar Produto", e 8px entre o rotulo e o campo como no resto do formulario.

**Fora de escopo:** o `<button>` "Cadastrar &ldquo;{query}&rdquo;" dentro do dropdown de produtos
(`produto-item-form.tsx:215`). Aquele e uma **linha de listbox**, irmao das `role="option"` acima
dele — trocar por `<Button>` o tiraria do padrao visual da lista, que e o padrao correto ali.

---

## D-02 — o bloco de resultado mora dentro do grid dos campos, e ele nao cabe

**Hoje** (`src/components/produto-item-form.tsx:160-323`) tudo — campos de entrada e blocos de
resultado — sao filhos de **um unico grid** `grid-cols-1 md:grid-cols-2 lg:grid-cols-4`:

| filho | span |
|---|---|
| Produto | `lg:col-span-2` |
| Custo Unit. | 1 |
| Valor Unit. | 1 |
| Qtd | 1 |
| Resumo (Subtotal + Lucro + Margem, `grid-cols-3` interno) | `lg:col-span-3` |

O que isso produz — **medido** em navegador (Playwright) num mockup com as classes exatas dos dois
layouts e a **caixa real da tela**: `(app)/layout.tsx:52` (`max-w-[1600px] gap-6 px-3 py-5 lg:px-6`)
+ `aside w-72` (288px) + `main` com borda e `px-4 lg:px-8` + `Card` + `CardContent p-4`. Valor de
teste "R$ 56.700,00".

> A primeira rodada de medicao usou uma caixa **errada** (sidebar de 256px, sem o `px-3`/`gap-6` do
> wrapper), o que superestimava o card em ~106px. O review pegou; os numeros abaixo sao da caixa
> correta e foram refeitos do zero.

| largura | card | regua do resultado | bloco de resultado |
|---|---|---|---|
| 768px | 710px | alinhada, mas **cobre 49% do card** (332px de 676px) | tiles de 102,7px → Subtotal e Lucro em **40px de altura, duas linhas** |
| 1024px | 598px | **nasce 144px a direita** do campo Produto | uma linha |
| 1440px | 1014px | **nasce 248px a direita**, cobrindo 72% do card | uma linha |

Em 768px o `lg:col-span-3` nao vale, entao o bloco de resultado inteiro cai em **uma** coluna de
332px e os tres tiles ficam com 102,7px — para um valor de ~88px. **Quebra em duas linhas com
metade do card vazia ao lado.**

Em 1024px e 1440px o resultado ocupa 3 das 4 colunas: a regua **nasce no meio do nada**, ao lado do
campo Qtd, em vez de separar entrada de resultado. E o Qtd fica orfao na esquerda, sozinho numa
linha de quatro colunas.

A causa raiz e conceitual: **os tres numeros derivados foram tratados como se fossem um campo de
formulario**, competindo por coluna com o Custo e o Valor. Eles nao sao entrada — sao o resultado
da linha, e resultado de linha se separa da entrada, nao se intercala com ela.

**Esperado** — tres zonas explicitas, nao um grid unico:

1. **Identificacao** — `Produto`, o unico campo de texto livre, precisa da maior largura.
2. **Precificacao** — `Custo`, `Valor`, `Qtd`: mesma natureza (numerico curto), **sempre na mesma
   linha** a partir de 640px; em 390px o par de moeda dividindo a linha e o Qtd embaixo em largura
   cheia (alvo de toque maior para o campo que mais recebe toque).
3. **Resultado** — `Subtotal`, `Lucro`, `Margem` em bloco de **largura cheia do card**, com a regua
   (`border-t`) atravessando o card inteiro, e `grid-cols-1 sm:grid-cols-3`: abaixo de 640px os
   tres blocos **empilham em largura cheia** (~322px cada em 390px, para um valor de ~90px — sem
   como truncar), e de 640px para cima voltam a ser tres tiles centrados lado a lado. E a mesma
   declaracao do "Limite e Margem", 250px acima nesta tela.

   **Decisao revista no review.** A primeira versao virava cada bloco em linha
   rotulo-a-esquerda/valor-a-direita abaixo de `sm` (`sm:flex-col`). O review derrubou por dois
   motivos, os dois verificados: (a) **nenhum** bloco de metrica do BFX troca de eixo por
   breakpoint — "Limite e Margem" (`venda-rapida-form-v2.tsx:883`), os dois grids do "Resumo
   Financeiro" (`:1131`, `:1156`), o DRE (`financeiro/page.tsx:226`), os totais do historico
   (`historico/page.tsx:534`) e o `CardStats` (`ui/card.tsx:224`) empilham centrado —, entao o flip
   criaria a **terceira** lingua para numero derivado na mesma tela, que e o defeito que esta
   correcao existe para tirar; (b) o flip era **redundante**: o truncamento vinha do `grid-cols-3`
   valendo em toda largura, e a coluna unica abaixo de `sm` ja resolve. Medido depois da revisao,
   em 390px: bloco de 322px, valor em uma linha.

A partir de **`xl`** (1280px) as zonas 1 e 2 voltam para a **mesma linha** (Produto `basis-2/5`,
trio `basis-3/5`), entao a densidade em desktop nao piora — melhora: o item deixa de ocupar duas
linhas de campos.

**`xl` e nao `lg`, e isto e medida, nao gosto.** Com a fusao valendo em `lg`, o card de 1024px tem
598px e a coluna de moeda caia para **102,4px** — 46,4px de area de texto depois do `border-2`, do
`pl-10` do prefixo "R$" e do `px-3`. "12.500,00" mede **67,2px**: o campo truncava o proprio valor,
sem sinal visual nenhum, **num ponto em que o layout antigo ainda cabia** (76px de texto). Era uma
regressao introduzida pela correcao, apontada no review e confirmada por medicao. Com a fusao em
`xl`, 1024px da 124px de texto (melhor que os 76px do layout antigo) e 1280px da 97,6px.

**Medido no layout novo, na caixa correta:**

| largura | card | regua | campos | area de texto no campo de moeda |
|---|---|---|---|---|
| 390px | 332px | **100%** (298px) | Produto cheio / Custo 143 / Valor 143 / Qtd cheio | 87px — cabe "123.456,78" (75,6px) |
| 768px | 710px | **100%** (676px) | Produto cheio / trio de 217,3 na mesma linha | 161,3px |
| 1024px | 598px | **100%**, alinhada ao Produto | Produto cheio / trio de 180 | **124px** (era 76px) |
| 1280px | 854px | **100%** (820px) | os **quatro** campos na mesma linha | 97,6px |
| 1440px | 1014px | **100%** (980px) | Produto 387,2 / trio de 185,6, mesma linha | 129,6px |

Nenhum valor quebra em duas linhas em nenhuma dessas larguras, e nao ha mais o penhasco em 1024px
(onde a sidebar aparece).

**Tambem em escopo (mesmo componente, mesmo defeito de origem):** `Custo Unit.`, `Valor Unit.` e
`Qtd` tem `<Label>` **sem `htmlFor`** — rotulo que nao aponta para campo nao move o foco no clique
e nao nomeia o campo para leitor de tela (o Qtd tem `aria-label`, os dois de moeda nao tem nada).
O campo `Produto`, ao lado, ja faz certo com `htmlFor={\`produto-nome-${index}\`}`. Corrigir os
tres.

**Fora de escopo:** a logica de calculo de `lucro`/`margem`, as faixas de cor da margem (decididas
em `eda3a42`), o autocomplete, o teto de quantidade e o dialog de cadastro rapido de produto.

---

## D-03 — `tabular-nums` (achado do review, mesma tela)

`tabular-nums` e o padrao do projeto para dinheiro — **20 arquivos** o usam (financeiro, dashboard,
historico, boletos) — mas `venda-rapida-form-v2.tsx` tinha **zero**. Como o item de produto passou a
usar, "Subtotal" apareceria duas vezes na mesma tela com larguras de digito diferentes. Aplicado nos
11 valores monetarios e percentuais da tela (`:886`, `:890`, `:896`, `:1134`, `:1138`, `:1142`,
`:1146`, `:1159`, `:1163`, `:1167`, `:1171`).

Tambem do review: o `leftIcon` do botao novo estava com `h-3.5 w-3.5` — heranca do `<button>` cru.
Entre os 11 `leftIcon` do projeto, 10 usam `h-4 w-4`; corrigido para acompanhar.

**Deixado de fora, de proposito:** `min-h-[44px]` no botao. Ha precedente de 44px em 11 lugares,
mas **nunca** num `<Button size="sm">` componente, e o irmao "Adicionar Produto" e `h-9` sem
`min-h`. Aplicar so no "Cadastrar cliente" trocaria uma inconsistencia por outra visivel (44px ao
lado de 36px na mesma tela) e nao ha catraca de CI exigindo. Se o alvo de toque importar, os dois
botoes mudam juntos — decisao do Andre.

Tambem fora: os tiles do "Resumo Financeiro" ainda usam o tint composto `bg-muted/30` enquanto o
bloco do item usa o opaco `bg-muted` (decisao de `eda3a42`). E o mesmo defeito de origem, mas e cor,
nao disposicao — vale uma passada propria.

## D-04 — o campo mais importante da tela nao tinha nome acessivel (achado do review)

`Buscar Cliente` (`venda-rapida-form-v2.tsx:747`) tinha `<Label>` **sem `htmlFor`** e `<Input>` sem
`id` nem `aria-label`. Corrigir os tres campos do item de produto e deixar de fora o campo de
cliente — na linha que esta correcao ja estava editando — seria arbitrario. Agora `htmlFor` /
`id="cliente-query"`.

## Arquivos afetados

| arquivo | mudanca |
|---|---|
| `src/components/venda-rapida-form-v2.tsx` | D-01: `<button>` cru → `<Button variant="outline" size="sm">`; `mb-2` entre rotulo e campo; D-03: `tabular-nums` em 11 valores, icone `h-4 w-4`; D-04: rotulo associado ao campo de cliente |
| `src/components/produto-item-form.tsx` | D-02: tres zonas, resumo em largura cheia, fusao em `xl`, rotulos associados |
| `src/__tests__/venda-rapida-item-produto-layout.test.ts` | novo teste-gate de fonte (12 afirmacoes) |

## Como isso e verificado

Teste-gate de fonte (`readFileSync` + `.includes()`/`.split()`, sem `RegExp` com estado, como
`edit-venda-form-ux.test.ts` e `icone-em-botao.test.ts`), afirmando a **regra** e nao a classe
nominal — o criterio de `d170ba9`:

1. a acao de cadastrar cliente passa pelo `<Button>` do design system, nao por estilo a mao, com a
   mesma variante/tamanho/tamanho-de-icone do "Adicionar Produto";
2. o campo de cliente tem rotulo associado, e ha respiro entre rotulo e campo;
3. nenhum bloco de resultado dentro do grid dos campos (nenhum `col-span` no bloco que carrega a
   regua);
4. a **zona de entrada** (escopada: tudo antes da regua) nao e grid de 4 colunas e tem o
   `sm:grid-cols-3` do trio;
5. o bloco de resultado empilha em largura cheia abaixo de `sm` (a regra e o empilhamento, nao o
   formato) e nenhum bloco de metrica troca de eixo por breakpoint;
6. todo `<Label>` do item aponta para um campo (`htmlFor`), e o id existe no arquivo;
7. nenhuma cor crua (`bg-[`, `text-[`, `border-[`).

`npm run test` nao roda nesta maquina — **nao existe `node_modules`** (`npm install` falha por
permissao, CLAUDE.md). O gate e o CI. Localmente, o teste foi executado de verdade num harness
`node` (v26 retira tipos nativamente) com um shim de `vitest`, e:

- **12/12 passam** no codigo novo;
- **10/12 falham** no codigo de `HEAD` — o teste discrimina, nao passa em qualquer coisa (as duas
  que passam no antigo sao guardas de nao-regressao: cor crua e troca de eixo, defeitos que o
  codigo antigo tambem nao tinha);
- **teste de mutacao** nas quatro afirmacoes centrais: apagar o `sm:grid-cols-3` so do trio, devolver
  `col-span` a regua, devolver `grid-cols-3` sem prefixo ao resultado, e tirar um `htmlFor` — cada
  mutacao e pega pela afirmacao certa. (A primeira e o falso PASS que o review encontrou: o
  `sm:grid-cols-3` do bloco de resultado satisfazia sozinho a afirmacao do trio.)

Os gates de design que **rodam** aqui (`npm run escala:check`, `npm run cores:check`,
`npm run jsx:check`) passam sem regressao, e `esbuild` confere a sintaxe dos tres arquivos.

## O que o review mudou

Dois subagentes revisaram o diff (regressao funcional e consistencia de design system). Sete
achados aplicados: a regressao de truncamento em 1024px (`lg` → `xl`), o flip de eixo inedito
(removido), `tabular-nums` na tela inteira, icone `h-4 w-4`, o falso PASS do trio, os dois furos do
leitor de fonte sem comentario (`/*` sem fechamento e ordem de remocao), e o rotulo do campo de
cliente. Confirmado como **sem defeito**: a ancoragem e o `z-index` do dropdown de produtos (os dois
ancestrais novos nao criam contexto de empilhamento nem clipping), o `xl:items-end` com rotulo de
duas linhas, e o repasse de `id`/`aria-label` pelo `CurrencyInput` (o `name` continua indo so para o
`<input type="hidden">`, sem colisao).
