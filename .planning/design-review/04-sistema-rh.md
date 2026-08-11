# Auditoria visual — SISTEMA, RH e IMPORTAÇÃO

Régua: `design-system/IDENTIDADE-VISUAL.md` (2026-08-11).

Telas: `configuracoes`, `gestao-rh` (+ `gestao-rh-tabs`, `reset-senha-dialog`), `perfil` (+
`perfil-senha-form`), `importacao` (+ `clientes`, `fornecedores`), navegação lateral (`layout.tsx`,
`sidebar-nav.tsx`).

---

## Achados

### ALTA

**1. `font-black` sem papel — contador "Total no Banco" da Importação**
`src/app/(app)/importacao/page.tsx:32`
```tsx
<div className="text-xl font-black text-primary leading-tight">{count}</div>
```
Alvo: `font-bold` (identidade §3, "Pesos": `font-black` não tem papel definido, reduzir a `bold`).
Esse número é justamente o "valor de indicador" que a identidade já nomeia como `text-2xl
font-bold tabular-nums" — está em `text-xl` (fora da escala nomeada) e sem `tabular-nums`, então
o dígito também "pula" de largura ao trocar o valor.
Esforço: baixo, busca-e-substituição segura (`font-black` → `font-bold`; considerar
`text-2xl` + `tabular-nums` para alinhar ao papel "valor de indicador").

### MÉDIA

**2. Três selos/rótulos em `text-[10px]` na navegação lateral — compartilhada por 20 telas**
`src/components/sidebar-nav.tsx:130` (selo "Novo"), `:141` (badge numérico), `:187` (rótulo de
grupo maiúsculo).
```tsx
text-[10px] font-semibold uppercase tracking-wider text-[var(--sidebar-primary)]   // :130
"flex h-5 min-w-5 ... text-[10px] font-bold"                                        // :141
<span className="text-[10px] font-semibold uppercase tracking-wider ...">           // :187
```
Alvo: `text-xs` (identidade §3, divergência medida — `text-[10px]` é a maior categoria do
sistema, 52 usos). Como a sidebar é renderizada em toda tela logada, esses três usos multiplicam
por 20 telas — é o ponto de maior alavancagem para corrigir primeiro no grupo.
Risco de trocar direto: os três elementos foram desenhados no tamanho atual (selo, badge
circular `h-5 min-w-5`, rótulo de grupo) — subir para `text-xs` (12px) pode quebrar o encaixe
vertical do badge `h-5` e o comprimento do rótulo "Vendas & Operações" numa coluna de `w-72`.
Não é troca cega de classe; exige olhar o resultado.
Esforço: baixo por ocorrência, mas cada uma pede revisão visual (ver comentário no próprio
`raw-color-baseline`/identidade: "nenhum deles troca de tamanho junto com a escala").

**3. `rounded-2xl` no painel da sidebar e no `<main>` — divergência aberta #3 da identidade**
`src/app/(app)/layout.tsx:66` (painel da sidebar) e `:70` (`<main>`).
```tsx
<div className="sticky top-5 ... rounded-2xl border border-border bg-[var(--sidebar)] ...">
<main className="flex-1 min-w-0 rounded-2xl border border-border bg-card ...">
```
A identidade reserva `xl` só para "superfícies grandes (o chip da marca na navegação)" e diz
para **eliminar** o `2xl` (§4, tabela de divergências #3). O chip da marca em
`layout.tsx:124` (`rounded-xl` no símbolo 36×36) já está conforme à exceção documentada — não é
achado. Mas os dois painéis-mãe (sidebar inteira e `<main>` inteiro) usam `2xl`, que a própria
identidade lista como para eliminar. Como são as duas maiores superfícies do sistema, reduzir
para `xl` (não `lg`, que é para cards internos) é a leitura mais alinhada ao texto — mas a
identidade não define explicitamente o raio-alvo desses dois painéis-mãe fora do chip, então o
valor exato de substituição é hipótese, não regra escrita.
Esforço: médio — mexe no invólucro visível em toda tela do sistema; testar visualmente antes de
aplicar.

**4. Card de edição em `gestao-rh` foge do raio padrão de card**
`src/app/(app)/gestao-rh/page.tsx:208`
```tsx
className="grid gap-3 rounded-xl border border-muted bg-muted/20 p-4 md:grid-cols-6"
```
Este bloco por-usuário na aba "Detalhes" é um card de facto (borda + fundo tintado + padding),
mas usa `rounded-xl` em vez de `rounded-lg` — a norma medida para "card, diálogo, bloco" (§4,
112 usos). Nenhuma nota na identidade abre exceção para este tipo de superfície.
Alvo: `rounded-md`/`rounded-lg`? A identidade não lista "card dentro de outro card" como caso à
parte — o mais seguro é `rounded-lg` (padrão de card), mas é julgamento visual porque o bloco
está aninhado dentro do `<CardContent>` já arredondado do card-pai.
Esforço: baixo, mas exige checar visualmente o aninhamento (card dentro de card).

**5. `shadow-xl` no painel da sidebar, fora da escala de três degraus**
`src/app/(app)/layout.tsx:66`
```tsx
<div className="sticky top-5 ... shadow-xl ...">
```
A identidade define só três níveis: `shadow-sm` (repouso), `shadow-md` (elevado),
`shadow-lg` (flutuante — diálogo/menu) — §4 "Sombra". O painel da sidebar (nem diálogo nem menu,
é uma superfície fixa em repouso) usa `shadow-xl`, fora dos três degraus nomeados, e sem o
`dark:shadow-[var(--shadow-*)]` que o resto do sistema já aplica para o tema escuro (a própria
identidade nota que "sombra sozinha não separa planos" no escuro). O `<main>` ao lado
(`layout.tsx:70`) já segue o padrão certo (`shadow-lg` + `dark:shadow-[var(--shadow-md)]`) — a
sidebar é a exceção não documentada dos dois painéis irmãos.
Esforço: baixo — mas decidir entre `shadow-sm` (painel em repouso) e `shadow-lg` (para
manter paridade visual com o `<main>` vizinho) é julgamento, não substituição mecânica.

### BAIXA

**6. `reset-senha-dialog.tsx` e `perfil-senha-form.tsx` nasceram conformes**
Os dois componentes criados nesta sessão (depois da identidade escrita) não introduzem nenhuma
divergência: `space-y-1` rótulo↔campo, `space-y-3` entre campos do mesmo formulário, `<Label
htmlFor>` em todo campo, sem tamanho arbitrário, sem `font-black`, `rounded-lg`/padrão de botão
herdado do `Button`/`Input` do design system. `autoComplete` correto nos dois: `perfil-senha-
form.tsx:55` (`current-password`), `:66` e `:77` (`new-password`); `reset-senha-dialog.tsx:114`
usa `autoComplete="off"` no campo de senha *gerada* (não digitada pelo usuário) — decisão correta
porque não é uma credencial que o navegador deveria oferecer para autopreencher depois. Nenhum
achado acionável aqui; é o ponto positivo do grupo.

**7. Formulários de `configuracoes` e `gestao-rh`: rótulo↔campo consistente**
Todos os pares `<Label htmlFor>` + campo auditados em `configuracoes/page.tsx` (26 campos) e
`gestao-rh/page.tsx` (14 campos, incluindo os dinâmicos por usuário com `id={`rh-nome-${u.id}`}`)
usam `space-y-1` entre rótulo e campo, batendo com a distância de 4px documentada (§5). Não há
`<Label>` órfão sem `htmlFor` correspondente nas telas auditadas.

**8. Botão "Excluir" tem hierarquia visual correta, mas não posição isolada**
`src/app/(app)/gestao-rh/page.tsx:243-253` — `DeleteUserButton` (variant `destructive`) e
`ResetSenhaDialog` (variant `outline`) ficam agrupados à esquerda, "Salvar Alterações"
(`bg-primary`) à direita, dentro do mesmo `flex items-center justify-between`. A variante
`destructive` já dá cor de aviso ao botão de exclusão — a identidade não exige distância física
extra, só que a cor carregue a informação (§2, "regra que decide se a cor fica"), o que
`variant="destructive"` cumpre. Não é achado; citado porque estava no roteiro de verificação.

**9. Acessibilidade de botão só-ícone**
Não há botão *somente* ícone (sem texto visível) nas 7 telas/componentes auditados —
`DeleteUserButton`, `ResetSenhaDialog`, `PerfilSenhaForm` sempre combinam `leftIcon` com texto.
Nenhum achado.

---

## Hipóteses não verificadas

- O achado #3 (raio dos dois painéis-mãe do layout) e o achado #5 (sombra da sidebar) dependem
  de como ficam *visualmente*, e este é um audit de código — não rodei o app nem tirei
  screenshot. Os dois estão marcados como julgamento, não busca-e-substituição.
- Não confirmei em runtime se subir `sidebar-nav.tsx:141` (badge circular `h-5 min-w-5`) para
  `text-xs` estoura o círculo com números de 2+ dígitos — é inferência de leitura do JSX, não
  medição.

---

## Contagem por categoria

| Categoria | Ocorrências |
|---|---|
| Tipografia fora da escala (`text-[10px]`) | 3 (sidebar-nav.tsx) |
| Peso sem papel (`font-black`) | 1 (importacao/page.tsx) |
| Raio fora do padrão (`rounded-xl`/`2xl`) | 3 (layout.tsx ×2, gestao-rh/page.tsx ×1) |
| Sombra fora da escala de 3 degraus | 1 (layout.tsx, sidebar) |
| Formulário (Label/espaçamento/autoComplete) | 0 — grupo conforme |
| Componentes novos (reset-senha-dialog, perfil-senha-form) | 0 — nasceram conformes |
| Acessibilidade (botão só-ícone) | 0 |

**Total de achados acionáveis: 5** (1 ALTA, 4 MÉDIA).

### Correções seguras por busca-e-substituição
- Achado #1 (`font-black` → `font-bold`, importacao/page.tsx:32).
- Achado #2, parcialmente: os três `text-[10px]` → `text-xs` são troca mecânica de classe, mas o
  *resultado* (encaixe do badge `h-5`, largura do rótulo de grupo) exige olhar depois — não é
  "aplicar e esquecer".

### Exigem julgamento visual
- Achado #2 (efeito colateral do aumento de fonte nos três elementos da sidebar).
- Achado #3 (raio-alvo dos dois painéis-mãe do layout — a identidade não nomeia um substituto
  explícito para essa superfície, só diz para eliminar `2xl`).
- Achado #4 (raio do card aninhado em `gestao-rh`, dentro de outro card já arredondado).
- Achado #5 (sombra da sidebar — decidir entre alinhar ao `<main>` vizinho ou reduzir a `sm` por
  ser superfície em repouso).
