# Auditoria de identidade visual — Operação Diária

**Critério:** `design-system/IDENTIDADE-VISUAL.md`
**Escopo:** Dashboard, Venda Rápida, Histórico, Cadastros (e componentes que essas telas usam)
**Método:** leitura de código (`Read`/`grep`) — sem execução, sem screenshot.

Arquivos auditados (13):
- `src/app/(app)/dashboard/page.tsx`
- `src/app/(app)/venda-rapida/page.tsx`, `src/components/venda-rapida-form-v2.tsx`
- `src/app/(app)/historico/page.tsx`, `src/components/historico-vendas-cards.tsx`,
  `src/components/edit-venda-historico-form.tsx`, `src/components/edit-parcelas-section.tsx`,
  `src/components/edit-venda-com-parcelas.tsx`
- `src/app/(app)/cadastros/page.tsx`, `src/components/clientes-tab-client.tsx`,
  `src/components/produtos-tab-client.tsx`, `src/components/fornecedores-tab-client.tsx`,
  `src/components/empresas-tab-client.tsx`

---

## Achados

### 1. Tipografia fora da escala (`text-[Npx]`)

Todas as ocorrências deste grupo são `text-[10px]` ou `text-[11px]` — **nenhum `text-[9px]`** foi
encontrado nas telas deste grupo (o pior caso do relatório-mãe está em outro grupo de telas).

**ALTA** — concentração em `venda-rapida-form-v2.tsx`, 13 ocorrências no mesmo arquivo:
- `src/components/venda-rapida-form-v2.tsx:797` — `text-[10px]` em badge de desconto
- `src/components/venda-rapida-form-v2.tsx:807` — `text-[10px]` texto de apoio
- `src/components/venda-rapida-form-v2.tsx:875` — `text-[10px] font-bold uppercase` "Limite"
- `src/components/venda-rapida-form-v2.tsx:879` — idem "Comprometido"
- `src/components/venda-rapida-form-v2.tsx:883` — idem "Disponível"
- `src/components/venda-rapida-form-v2.tsx:1016` — `text-[11px]` mensagem de sucesso
- `src/components/venda-rapida-form-v2.tsx:1123` — `text-[10px] uppercase tracking-wider` "Subtotal"
- `src/components/venda-rapida-form-v2.tsx:1127` — idem "Frete"
- `src/components/venda-rapida-form-v2.tsx:1131` — idem "Total Venda"
- `src/components/venda-rapida-form-v2.tsx:1135` — idem "Valor Parcela"
- `src/components/venda-rapida-form-v2.tsx:1148` — idem "Custo Total"
- `src/components/venda-rapida-form-v2.tsx:1152` — idem "Lucro Bruto"
- `src/components/venda-rapida-form-v2.tsx:1156` — idem "Margem"
- `src/components/venda-rapida-form-v2.tsx:1160` — idem "Comissao (...)"

Alvo (todos): `text-xs` — a identidade já define este exato papel como
"Rótulo maiúsculo: `text-xs font-semibold uppercase tracking-wider`" (seção 3). Estes rótulos de
resumo de venda (Subtotal/Frete/Total/Margem/Comissão) são o caso de uso descrito na régua, só
não estão usando a classe certa. Esforço: **trivial** (busca-e-substituição `text-[10px]` →
`text-xs` neste bloco; `text-[11px]` idem).

**MÉDIA** — mesma classe fora da tela de venda rápida:
- `src/components/produtos-tab-client.tsx:304` — `text-[10px]` em placeholder de imagem 40×40
- `src/components/produtos-tab-client.tsx:315` — `text-[10px]` texto de apoio na linha da tabela
- `src/app/(app)/historico/page.tsx:536` — `text-[10px] uppercase` "Valor" (card mobile)
- `src/app/(app)/historico/page.tsx:542` — `text-[10px] uppercase` "Custo" (card mobile)
- `src/app/(app)/venda-rapida/page.tsx:67` — `text-[10px] font-bold uppercase` "Última Venda"
- `src/app/(app)/venda-rapida/page.tsx:75` — `text-[10px] font-bold uppercase tracking-wider` no link "Recibo/Autorização"
- `src/app/(app)/venda-rapida/page.tsx:94` — mesma classe no botão WhatsApp

Alvo: `text-xs`. Esforço: **trivial** para todos os 7.

**Total do grupo: 21 ocorrências de `text-[Npx]` em 5 arquivos, todas trocáveis por `text-xs` sem
reavaliar layout** (não há `text-[9px]` neste grupo de telas).

---

### 2. `font-black` sem papel

**MÉDIA** — 2 ocorrências, ambas no fluxo de Venda Rápida:
- `src/components/venda-rapida-form-v2.tsx:1132` — `text-lg font-black text-primary` no valor de "Total Venda"
- `src/app/(app)/venda-rapida/page.tsx:68` — `text-sm font-black text-foreground` no valor da "Última Venda"

Alvo: `font-bold` (a identidade já define "Valor de indicador: `text-2xl font-bold tabular-nums`"
como o papel correto para número em destaque). Esforço: **trivial**, busca-e-substituição
`font-black` → `font-bold` nos 2 pontos — mas revisar visualmente depois, pois `font-bold` pesa
menos e pode reduzir o destaque que motivou o `black` originalmente.

---

### 3. `rounded-xl` / `rounded-2xl` sem critério

**MÉDIA** — 4 ocorrências neste grupo de telas:

- `src/app/(app)/venda-rapida/page.tsx:58` — `rounded-2xl` no card-chip "Última Venda" (`bg-card p-2 rounded-2xl shadow-sm border border-border pr-4`). Justificável como "superfície grande" no sentido da regra (é um bloco de resumo, não um card padrão) — mas a regra reserva explicitamente o `xl` ao "chip da marca na navegação", não a este componente. Requer julgamento visual antes de reduzir para `rounded-lg`.
- `src/app/(app)/venda-rapida/page.tsx:63` — `rounded-xl` no ícone de 40×40 (`h-10 w-10 rounded-xl bg-success-bg`). **Inconsistência direta e verificável**: o mesmo padrão de ícone circular-quadrado de 40×40 em `src/app/(app)/dashboard/page.tsx:400`, `:415`, `:437`, `:449`, `:461` usa `rounded-lg`. Este é o único fora do padrão. Alvo: `rounded-lg`. Esforço: **trivial**.
- `src/components/historico-vendas-cards.tsx:70` — `rounded-xl` no bloco de estado vazio (`border-dashed ... py-12 text-center`). É um bloco/card conforme a tabela da seção 4 ("Card, diálogo, bloco → `rounded-lg`"). Alvo: `rounded-lg`. Esforço: **trivial**.
- `src/app/(app)/historico/page.tsx:529` — `rounded-xl` no card-resumo mobile (`md:hidden rounded-xl border bg-muted/30 px-4 py-3`). Mesmo caso: é um bloco de conteúdo, não superfície grande. Alvo: `rounded-lg`. Esforço: **trivial**.

Nenhum `rounded-2xl` puro além do já citado (que tecnicamente é `2xl`, o mais grave da categoria
segundo a régua, que pede eliminação total do `2xl`).

---

### 4. Sombra por classe vs. token

**BAIXA** — 1 ocorrência isolada neste grupo:
- `src/app/(app)/venda-rapida/page.tsx:58` — `shadow-sm` cru no mesmo card-chip acima, sem par `dark:shadow-[var(--shadow-*)]`. Como o card fica sobre fundo com borda própria (`border border-border`), o risco descrito na régua (sombra fraca não separa planos no escuro) é menor aqui do que em um popover/diálogo flutuante — mas ainda diverge do padrão que o resto do sistema segue (`dark:shadow-[var(--shadow-md)]` nos outros cards elevados). Esforço: **trivial** para adicionar o par dark, mas exige checar visualmente o resultado.

Não há outras ocorrências de `shadow-lg`/`shadow-md`/`shadow-sm` sem par de token neste grupo de
telas — os `Card` com `animated`/`variant="elevated"` usados em Dashboard, Histórico e Cadastros
delegam a sombra ao componente `ui/card.tsx` (não auditado aqui por não estar na lista de telas,
mas presumidamente já usa o token — **hipótese não verificada**, fora do escopo desta leitura).

---

### 5. Hierarquia de botão

**BAIXA — sem achado de peso.** Verificação por arquivo:
- Nenhuma tela deste grupo tem duas ações primárias (`variant="default"`/verde cheio) competindo
  na mesma view. `dashboard/page.tsx` e `fornecedores-tab-client.tsx` têm 1 ocorrência cada de
  `variant="default"`/`"success"`, isoladas.
- Botões destrutivos (`variant="destructive"`) em `clientes-tab-client.tsx:324`,
  `produtos-tab-client.tsx:219`, `fornecedores-tab-client.tsx:194`, `empresas-tab-client.tsx:256`
  são todos ações de **bulk delete** atrás de `AlertDialog` de confirmação, sem um botão "Salvar"
  primário do lado — separação visual adequada.
- Exclusão de linha individual (`produtos-tab-client.tsx:329-337`) usa `variant="ghost"` com
  `hover:text-destructive` + confirmação — não compete com ação primária.

Sem achados acionáveis nesta categoria para as telas auditadas.

---

### 6. Densidade / espaçamento

**BAIXA** — 1 ocorrência fora da escala documentada (a escala para em `space-y-6`/24px):
- `src/app/(app)/venda-rapida/page.tsx:49` — `space-y-8` (32px) no contêiner raiz da página
  (`<div className="space-y-8 max-w-[1400px] mx-auto">`). É o único `space-y-8` no grupo auditado;
  todo o resto do sistema medido na identidade visual pára em `space-y-6` para "seções da página".
  Esforço: **precisa olhar o layout** — trocar para `space-y-6` pode aproximar demais o header dos
  blocos seguintes num terminal de vendas com bastante conteúdo vertical.

`space-y-1.5` em `dashboard/page.tsx:213/217/221` (6px, fora do grid de 4px) não está listado como
exceção tolerada na identidade (que só abre exceção para `space-y-3`). É um padrão pequeno e
repetido, mas não afeta legibilidade — **BAIXA**, marcado como observação, não como prioridade.

---

### 7. Tabela — alinhamento numérico

**Sem achado.** Todas as colunas monetárias/numéricas verificadas usam `text-right tabular-nums`
consistentemente:
- `produtos-tab-client.tsx:325`, `clientes-tab-client.tsx:396`, `dashboard/page.tsx:369-371`
- `historico/page.tsx:412-424` (Valor Total/Custo/Margem) e rodapé `:513-518`

A coluna "Qtd" (`historico/page.tsx:411`) usa `text-center`, mas o cabeçalho correspondente
(`:367`) também é `text-center` — consistente com "Nota"/"Assinado", que são colunas de contagem
pequena/status, não valores financeiros. Não é uma divergência da regra (que fala de coluna
numérica financeira sem `text-right`).

---

### 8. Cor semântica de preenchimento usada como texto

**MÉDIA** — 3 ocorrências sem justificativa documentada no código, todas no mesmo arquivo:
- `src/components/venda-rapida-form-v2.tsx:866` — `className="bg-warning/20 text-warning-foreground dark:text-warning"` em `Badge` "Excede disponível"
- `src/components/venda-rapida-form-v2.tsx:903` — `text-warning-foreground dark:text-warning` no aviso de "Parcela excede o valor disponível"
- `src/components/venda-rapida-form-v2.tsx:1061` — `text-warning-foreground dark:text-warning` no aviso de cliente sem CPF/CNPJ

Em tema escuro estas três linhas usam `text-warning` — o token de **preenchimento**
(`--warning`), não a família `-text`, exatamente o padrão que a identidade pede para evitar
(seção 2: "Para texto, use sempre a família `-text`"). Alvo: `dark:text-warning-text` no lugar de
`dark:text-warning`. Esforço: **trivial** na troca da classe, mas como envolve contraste,
**verificar visualmente** o resultado no tema escuro antes de finalizar (hipótese não verificada:
não há contraste medido nesta auditoria; o `token-contrast.mjs` do repo cobriria isso).

**BAIXA / não-achado com nota** — o mesmo padrão em
`src/components/clientes-tab-client.tsx:217` (`text-warning-foreground dark:text-warning` no
aviso de "nomes similares") **está documentado em comentário** nas linhas seguintes com os
números de contraste medidos (18.16:1 claro, 8.67:1 escuro), justificando a escolha. Não é
recomendado alterar sem o mesmo cuidado dado ali — citado aqui só para registrar que o padrão
"errado" em `venda-rapida-form-v2.tsx` não tem o mesmo respaldo.

---

### Acessibilidade (botão só-ícone)

**Sem achado.** Todos os `Button` com `size="icon"`/`"iconSm"` no grupo auditado têm `aria-label`
correspondente (`empresas-tab-client.tsx:237`, `produtos-tab-client.tsx:196-198`,
`fornecedores-tab-client.tsx:175`, `clientes-tab-client.tsx:305`, e os botões de editar/excluir
por linha em todos os `*-tab-client.tsx`).

---

## Contagem por categoria

| Categoria | Ocorrências | Arquivos |
|---|---|---|
| 1. `text-[Npx]` fora da escala | 21 (`text-[10px]`: 20, `text-[11px]`: 1) | 5 |
| 2. `font-black` | 2 | 2 |
| 3. `rounded-xl`/`2xl` sem critério | 4 | 3 |
| 4. Sombra classe crua sem par de token | 1 | 1 |
| 5. Hierarquia de botão | 0 | — |
| 6. Densidade fora da escala | 1 (`space-y-8`) + 3 observações (`space-y-1.5`) | 2 |
| 7. Tabela sem alinhamento numérico | 0 | — |
| 8. Cor de preenchimento usada como texto | 3 (sem justificativa) + 1 (justificada, não-achado) | 1 |
| Acessibilidade botão-ícone | 0 | — |

**Total de achados acionáveis: 32**, concentrados majoritariamente em
`src/components/venda-rapida-form-v2.tsx` (17 dos 32) e `src/app/(app)/venda-rapida/page.tsx`
(6 dos 32) — a tela de Venda Rápida é, de longe, a mais divergente da identidade neste grupo.

---

## Correções seguras por busca-e-substituição

Baixo risco de efeito colateral visual — trocar a classe basta:

1. `text-[10px]` → `text-xs` em `venda-rapida-form-v2.tsx` (13 ocorrências: linhas 797, 807, 875,
   879, 883, 1123, 1127, 1131, 1135, 1148, 1152, 1156, 1160)
2. `text-[11px]` → `text-xs` em `venda-rapida-form-v2.tsx:1016`
3. `text-[10px]` → `text-xs` em `produtos-tab-client.tsx:304,315`
4. `text-[10px]` → `text-xs` em `historico/page.tsx:536,542`
5. `text-[10px]` → `text-xs` em `venda-rapida/page.tsx:67,75,94`
6. `rounded-xl` → `rounded-lg` em `venda-rapida/page.tsx:63` (ícone 40×40, já é o padrão do
   Dashboard para o mesmo elemento)
7. `rounded-xl` → `rounded-lg` em `historico-vendas-cards.tsx:70` e `historico/page.tsx:529`
   (blocos de conteúdo, não superfície grande)

## Correções que exigem julgamento visual

1. `font-black` → `font-bold` em `venda-rapida-form-v2.tsx:1132` e `venda-rapida/page.tsx:68` —
   conferir se o destaque do valor continua legível com peso menor.
2. `rounded-2xl` → `rounded-lg` (ou manter como exceção documentada de "chip") em
   `venda-rapida/page.tsx:58` — decidir se o card-resumo "Última Venda" conta como a "superfície
   grande" que a regra permite, ou se deve virar `rounded-lg` como todo card comum.
3. `shadow-sm` sem par `dark:shadow-[var(--shadow-*)]` em `venda-rapida/page.tsx:58` — adicionar o
   par e conferir separação de plano no tema escuro.
4. `space-y-8` → `space-y-6` em `venda-rapida/page.tsx:49` — conferir respiro vertical na tela
   mais densa do sistema (PDV) antes de aplicar.
5. `dark:text-warning` → `dark:text-warning-text` nas 3 ocorrências de
   `venda-rapida-form-v2.tsx:866,903,1061` — checar contraste resultante no tema escuro (o mesmo
   padrão em `clientes-tab-client.tsx:217` só foi aprovado depois de medir 8.67:1; replicar a
   mesma verificação aqui antes de trocar).
