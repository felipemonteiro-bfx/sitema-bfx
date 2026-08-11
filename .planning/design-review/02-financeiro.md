# Auditoria visual — Telas Financeiras

Régua: `design-system/IDENTIDADE-VISUAL.md` (2026-08-11).
Escopo: `financeiro`, `boletos`, `prudent` + `antecipacao-client`, `comissoes` +
`commissions-dashboard-client`, `relatorios` + `report-buttons-client`, `relatorios/mensais`.

Todos os achados abaixo foram lidos direto no código-fonte (não há dev server rodando neste
ambiente de auditoria — sem captura de tela, achados são 100% estáticos/grep, não hipóteses).

---

## 1. Tipografia fora da escala (`text-[Npx]` → `text-xs`)

O grupo financeiro concentra uma fatia desproporcional da divergência de 71 usos citada na
identidade visual — sozinho, `antecipacao-client.tsx` tem 7 ocorrências.

| Severidade | Local | Trecho | Alvo | Esforço |
|---|---|---|---|---|
| MÉDIA | `financeiro/page.tsx:258` | `text-[10px] font-medium text-warning-text` (selo "não deduzido do lucro") | `text-xs` | trivial |
| MÉDIA | `financeiro/page.tsx:279` | `text-[10px] text-muted-foreground` (selo "atualizado automaticamente") | `text-xs` | trivial |
| ALTA | `antecipacao-client.tsx:424` | `text-[10px] font-bold uppercase tracking-widest` (rótulo "Total a Antecipar") | `text-xs` | trivial |
| ALTA | `antecipacao-client.tsx:457` | `text-[10px] font-bold uppercase tracking-wider` (rótulo "Prazo médio") | `text-xs` | trivial |
| ALTA | `antecipacao-client.tsx:461` | `text-[9px] text-info-text font-medium` ("D+1") | `text-xs` — é o `text-[9px]` mais grave citado na doc (abaixo do limite de legibilidade) | precisa olhar o layout (card compacto de 3 métricas, colar `text-xs` pode estourar a largura) |
| ALTA | `antecipacao-client.tsx:464` | `text-[10px] font-bold uppercase tracking-wider` (rótulo "Taxa total") | `text-xs` | trivial |
| ALTA | `antecipacao-client.tsx:468` | `text-[9px] text-warning-text font-medium` ("Smart") | `text-xs` | precisa olhar o layout |
| ALTA | `antecipacao-client.tsx:471` | `text-[10px] font-bold uppercase tracking-wider` (rótulo "Líquido") | `text-xs` | trivial |
| ALTA | `antecipacao-client.tsx:475` | `text-[9px] text-success-text font-medium` ("estimado") | `text-xs` | precisa olhar o layout |
| MÉDIA | `antecipacao-client.tsx:527` | `text-[11px] text-muted-foreground` (rodapé informativo) | `text-xs` | trivial |
| ALTA | `antecipacao-client.tsx:528` | `text-[9px] font-bold text-info-text` (badge circular "i") | `text-xs` | precisa olhar o layout (badge de 4x4, pode precisar crescer) |
| MÉDIA | `relatorios/page.tsx:59` | `text-[10px] font-bold ... uppercase` (rótulo "Exportação Rápida (PDF)") | `text-xs` | trivial |

**Total do grupo: 12 ocorrências em 3 arquivos** (`financeiro/page.tsx` 2, `antecipacao-client.tsx`
9, `relatorios/page.tsx` 1). O card de resumo da antecipação (linhas 419–531) é o pior ofensor do
grupo inteiro: 3 dos 4 tamanhos `text-[9px]` da base de 8 citados na doc moram exatamente nesse
componente.

---

## 2. Peso sem papel (`font-black` → `font-bold`)

| Severidade | Local | Trecho | Alvo | Esforço |
|---|---|---|---|---|
| MÉDIA | `antecipacao-client.tsx:425` | `text-3xl sm:text-4xl font-black text-foreground tabular-nums` (valor "Total a Antecipar") | `font-bold` | trivial |
| MÉDIA | `antecipacao-client.tsx:458` | `text-xl font-black text-info-text tabular-nums` ("Prazo médio") | `font-bold` | trivial |
| MÉDIA | `antecipacao-client.tsx:465` | `text-xl font-black text-warning-text tabular-nums` ("Taxa total") | `font-bold` | trivial |
| MÉDIA | `antecipacao-client.tsx:472` | `text-base sm:text-lg font-black text-success-text tabular-nums truncate` ("Líquido") | `font-bold` | trivial |

**4 ocorrências, todas no mesmo card de resumo de `antecipacao-client.tsx`** — 4 dos 17
`font-black` citados na divergência aberta #2 da identidade visual vivem nesta única tela.

---

## 3. Raio sem critério (`rounded-xl` / `rounded-2xl`)

| Severidade | Local | Trecho | Alvo | Esforço |
|---|---|---|---|---|
| MÉDIA | `financeiro/page.tsx:288` | `rounded-2xl border ... p-4 shadow-sm` (moldura do gráfico de fluxo) | `rounded-lg` — é card/bloco, não superfície grande de marca | trivial |
| BAIXA | `financeiro/page.tsx:292` | `rounded-xl border ... bg-muted/30 p-3` (mini-card "Entrada média") | `rounded-lg` | trivial |
| BAIXA | `financeiro/page.tsx:300` | `rounded-xl border ... bg-muted/30 p-3` (mini-card "Saída média") | `rounded-lg` | trivial |
| BAIXA | `financeiro/page.tsx:308` | `rounded-xl border ... bg-muted/30 p-3` (mini-card "Saldo médio") | `rounded-lg` | trivial |

Todos os 4 usos são em `financeiro/page.tsx`, aba Fluxo de Caixa, e nenhum é a "superfície grande"
(chip de marca) que a doc reserva para `xl`. São mini-cards de estatística — mesmo papel que os
`rounded-lg` usados em todo o resto da mesma tela (ex.: os blocos de "Composição dos Custos" logo
acima, linhas 221–246, já usam `rounded-lg` corretamente). Isso quebra a consistência dentro da
própria página: dois blocos de estatística lado a lado com raios diferentes.

---

## 4. Sombra misturando classe e token

Nenhum dos arquivos do grupo usa `dark:shadow-[var(--shadow-*)]`. Toda sombra é classe Tailwind
crua, sem par de tema escuro — o padrão que a identidade visual aponta como já praticado por
outros componentes do sistema (`dark:shadow-[var(--shadow-md)]`) não aparece nenhuma vez aqui.

| Severidade | Local | Trecho | Risco |
|---|---|---|---|
| MÉDIA | `financeiro/page.tsx:288` | `shadow-sm` sem par `dark:shadow-[var(--shadow-sm)]` | tema escuro sem elevação own — a doc é explícita: "sombra sozinha não separa planos" no escuro |
| MÉDIA | `antecipacao-client.tsx:419` | `shadow-lg` no card-resumo (flutuante/destaque) sem par de tema escuro | mesmo risco |
| MÉDIA | `antecipacao-client.tsx:513` | `shadow-md hover:shadow-success/30` no CTA principal | mistura shadow cru com sombra colorida por opacidade — nem token, nem consistente com a escala de 3 degraus |
| MÉDIA | `antecipacao-client.tsx:534` | `shadow-lg` no card "Valores a Vencer no Mês por Empresa" | mesmo risco, é o segundo `shadow-lg` cru na mesma tela — dois níveis "flutuante" numa página sem diálogo/menu nenhum, quando a doc reserva `shadow-lg` para elementos flutuantes |
| BAIXA | `antecipacao-client.tsx:549` | `hover:shadow-md` no card de "vencimentos por empresa" | mesmo padrão, sem par escuro |

**Esforço: precisa olhar o layout** para todos — decidir se cada superfície é "repouso", "elevada"
ou "flutuante" segundo a escala de um degrau por nível, e então adicionar o par
`dark:shadow-[var(--shadow-X)]` correspondente, exige julgamento visual em cada tema.

---

## 5. Hierarquia de botão

- **`relatorios/page.tsx`**: `ReportButtonsClient` (relatório de vendas) usa hierarquia correta —
  CSV é `Button` default (primário), PDF é `variant="outline"` (secundário). Mas os outros dois
  blocos da mesma página ("Inadimplência", "Margem por Produto", linhas 85–118) usam
  `buttonVariants({ variant: "outline", size: "sm" })` para **ambos** CSV e PDF — nenhum primário
  ali. Resultado: na mesma tela, o par CSV/PDF tem hierarquia diferente dependendo do bloco
  (ALTA — inconsistência visível lado a lado).
  - `relatorios/page.tsx:88-99` (Inadimplência) e `:105-116` (Margem por Produto): ambos `outline`.
  - Esforço: precisa olhar o layout — decidir se CSV deveria virar primário aqui ou se os 3 blocos
    deveriam ser todos `outline` e a ênfase (Button default) some do bloco principal por
    consistência.
- **`relatorios/page.tsx:70-73`**: o bloco "Exportação Rápida (PDF)" usa
  `buttonVariants({ variant: "outline" ...})` com `border-destructive/30 text-destructive
  hover:bg-destructive/5` aplicado a um botão de exportação comum, não uma ação destrutiva. Isso
  é reuso de cor de erro fora do papel semântico dela — a doc diz "cor que carrega informação
  fica; cor decorativa sai", e aqui a cor de erro decora um botão de download PDF, sem nenhuma
  falha ou risco associado à ação. (MÉDIA — ver também item 7 abaixo.)
- **`relatorios/mensais/page.tsx:141-158`**: PDF e XLSX ambos `outline`, "Reenviar" é `ghost` —
  hierarquia consistente e correta (nenhuma ação disputando o papel de primária).
- **`boletos/page.tsx:261-268`**: "Buscar" é `outline`, "Limpar" é `ghost` — ok, mas não há ação
  primária na busca (aceitável, é filtro, não CTA de negócio).
- **`antecipacao-client.tsx:486-523`**: hierarquia correta e explícita — "Planilha"/"Relatório
  Visual" são `outline` (secundárias), "Antecipar N itens" é o único CTA com cor de destaque
  (`bg-success`). Bom exemplo do grupo.

---

## 6. Valor monetário — `tabular-nums` + alinhamento à direita

Verificação extensa, item mais crítico deste grupo. Amostra de conformidade:

- `financeiro/page.tsx`: todos os valores de card (`text-2xl font-bold tabular-nums`, linhas 153,
  164, 180, 223, 228, 233, 238, 243, 255) e todas as células de tabela monetárias (linhas 338, 341,
  344, 478, 520, 524, 528, 532, 566–570) usam `tabular-nums` **e** `text-right` quando em célula.
  Conforme.
- `boletos/page.tsx`: coluna Valor (linha 71, 381) — `text-right font-semibold tabular-nums` e
  `text-right tabular-nums font-semibold`. Conforme.
- `antecipacao-client.tsx`: coluna Valor (linha 402) e Parcelas (403) — `text-right tabular-nums`.
  Conforme. Os 3 números do card de métricas (linhas 458, 465, 472 — Prazo médio, Taxa, Líquido)
  também usam `tabular-nums`, mas **não são todos monetários** (prazo em dias e taxa em % também
  levam `tabular-nums`, o que é aceitável/generoso, não um erro).
- `commissions-dashboard-client.tsx`: todas as colunas monetárias da tabela de detalhes
  (linhas 221, 222, 224) usam `text-right tabular-nums`. Os 3 cards de resumo (linhas 123, 131,
  139) **não** usam `tabular-nums` — são valores que mudam com filtro (total de comissões, total
  de vendas, média), mesmo papel dos cards de `financeiro/page.tsx` que levam `tabular-nums`.
  **ALTA** — `commissions-dashboard-client.tsx:123` (`text-2xl font-bold text-success-text`, sem
  `tabular-nums`), `:131` (`text-2xl font-bold text-primary`, é uma contagem de vendas, não
  dinheiro — ok sem `tabular-nums`), `:139` (`text-2xl font-bold`, é `formatBRL`, sem
  `tabular-nums`). Dois dos três cards do topo (Total de Comissões e Média por Vendedor) exibem
  dinheiro sem alinhamento numérico fixo — os dígitos "dançam" quando o filtro troca o valor.
  Esforço: trivial.
- `relatorios/mensais/page.tsx`: total do período (linha 115, `text-sm tabular-nums`) e colunas
  Vendas/Valor da tabela (136, 137) — conforme. Card mobile (177) também usa `tabular-nums`.

**Resumo item 6**: financeiro, boletos, prudent/antecipação e relatórios mensais estão 100%
conformes. O único gap real é `commissions-dashboard-client.tsx`, cards de resumo (2 de 3 valores
monetários sem `tabular-nums`).

---

## 7. Cor semântica (preenchimento vs. `-text`, e cor decorativa)

- **Conforme na maioria**: `financeiro`, `boletos`, `antecipacao-client` usam consistentemente a
  família `-text` (`text-success-text`, `text-warning-text`, `text-error-text`, `text-info-text`)
  para texto, nunca `text-success`/`text-warning`/`text-info` crus como texto. Não encontrei
  nenhuma ocorrência de preenchimento usado como texto neste grupo — item específico do #7 do
  roteiro não teve achado de violação direta.
- **MÉDIA — `relatorios/page.tsx:70-73`**: já citado no item 5, cor de erro (`text-destructive`,
  `border-destructive/30`) aplicada a um botão de exportação PDF sem nenhum estado de erro ou
  risco — é decoração, não informação. Pela regra da doc ("cor que carrega informação fica; cor
  decorativa sai"), este uso deveria sair.
- **BAIXA — `commissions-dashboard-client.tsx`**: `text-primary` aplicado a **todo cabeçalho de
  tabela** (linhas 197–204, 8 ocorrências) e a **todo `CardTitle`** da página (89, 147, 187), além
  do card "Total de Vendas" (131, número em `text-primary`). Isso é uso do accent muito além do
  papel declarado na doc ("`text-primary` aparece em título de página e de card") — aqui vira
  também estilo de cabeçalho de tabela e de KPI, criando >10 elementos coloridos na mesma tela e
  diluindo o accent. Não é o mesmo padrão usado em nenhuma outra tela do grupo (nenhuma outra usa
  `text-primary` em `TableHead`). Esforço: precisa olhar o layout (decidir se cabeçalho de tabela
  deve voltar a `text-muted-foreground`, papel padrão em todas as outras tabelas do grupo).

---

## 8. Acessibilidade — botão só-ícone sem `aria-label`

- `financeiro/page.tsx:483-498`: botões de editar/excluir despesa (ícone lápis e lixeira) **têm**
  `aria-label` (`aria-label="Editar despesa"`, `aria-label="Excluir despesa"`) e `title`. Conforme.
- Nenhum outro botão só-ícone identificado neste grupo (o resto usa `leftIcon` com texto visível,
  ex. `report-buttons-client.tsx` "Baixar CSV (Excel)" com ícone + rótulo).

**Sem achados de severidade neste item — grupo conforme.**

---

## Contagem por categoria

| Categoria | Achados |
|---|---|
| 1. Tipografia fora da escala | 12 |
| 2. Peso sem papel (`font-black`) | 4 |
| 3. Raio sem critério | 4 |
| 4. Sombra classe vs. token | 5 |
| 5. Hierarquia de botão | 2 |
| 6. Valor monetário sem `tabular-nums` | 2 |
| 7. Cor semântica/decorativa | 2 |
| 8. Acessibilidade | 0 |
| **Total** | **31** |

## Correções seguras por busca-e-substituição

- Item 1: os 10 `text-[10px]`/`text-[11px]` (todos exceto os 3 `text-[9px]` da linha 461/468/475,
  que exigem olhar o layout compacto do card de métricas).
- Item 2: os 4 `font-black` → `font-bold` (troca direta, sem risco de layout — `font-bold` já é
  usado em elementos do mesmo tamanho em outras telas).
- Item 3: os 4 `rounded-xl`/`rounded-2xl` → `rounded-lg` (mesmo papel de card em todos os casos).
- Item 6: os 2 `tabular-nums` faltantes em `commissions-dashboard-client.tsx:123` e `:139`.

**16 achados são busca-e-substituição segura.**

## Correções que exigem julgamento visual

- Item 1: os 3 `text-[9px]` do card compacto de métricas em `antecipacao-client.tsx` (461, 468,
  475) — crescer a fonte pode estourar a largura do grid de 3 colunas em mobile.
- Item 4: todos os 5 achados de sombra — decidir o nível de elevação correto por superfície e
  escrever o par `dark:shadow-[var(--shadow-X)]`.
- Item 5: os 2 blocos de `relatorios/page.tsx` (Inadimplência, Margem por Produto) sem hierarquia
  primária — decisão de design, não só de classe.
- Item 5/7: o botão PDF com cor de erro em `relatorios/page.tsx:70-73` — trocar a cor implica
  decidir o novo estilo visual do botão (ainda vermelho por identidade de marca do PDF, ou neutro).
- Item 7: uso de `text-primary` em cabeçalhos de tabela e KPI em `commissions-dashboard-client.tsx`
  — decidir se cabeçalho de tabela volta ao padrão `text-muted-foreground` do resto do sistema.

**15 achados exigem revisão visual antes de aplicar.**

---

## Observação sobre hipóteses não verificadas

- Não há dev server ativo neste ambiente — nenhuma captura de tela foi feita; todos os achados
  acima vêm de leitura direta do código-fonte (JSX/TSX) e são verificáveis por grep/leitura, não
  por inspeção visual real. Recomenda-se confirmar visualmente os itens marcados "precisa olhar o
  layout" antes de aplicar qualquer correção que altere dimensões.
- Não confirmei se `commissions-dashboard-client.tsx` é realmente a única tela renderizada por
  `comissoes/page.tsx` para todos os perfis de usuário (o server component só passa `vendedores`
  como prop) — assumido como certo pela leitura do código, não testado em runtime.
