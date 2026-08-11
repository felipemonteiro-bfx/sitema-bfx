# Plano de conformidade visual — BFX

Consolida os 5 relatórios de `.planning/design-review/` (26 telas auditadas contra
`design-system/IDENTIDADE-VISUAL.md`) num plano executável.

**Severidades levantadas:** 12 ALTA · 27 MÉDIA · 13 BAIXA.

Regra que organiza as ondas: **risco de perda de dado > alavancagem > volume > estética**.
Correção que se aplica a um componente base vale por 20 telas; correção que exige olhar a tela
renderizada não entra em lote.

---

## Onda 1 — risco e alavancagem ✅ FEITA (`e96dbc6`)

| O quê | Onde | Estado |
|---|---|---|
| Excluir campanha sem confirmação | `crm/campanhas` → `DeleteCampanhaButton` | ✅ |
| `text-[9px]` (8 usos, pior legibilidade) | 3 arquivos — círculos cresceram junto | ✅ zerado |
| `font-black` sem papel (17 usos) | 9 arquivos → `font-bold` | ✅ zerado |
| `text-[10px]` na navegação lateral (3) | `sidebar-nav.tsx` — vale pelas 20 telas | ✅ |

**Aprendizado da onda:** o lint quebrou porque um comentário JSX foi colocado dentro de
`{cond && (`. Varredura própria criada para o padrão; nenhum outro caso nos arquivos tocados.

---

## Onda 2 — decisão do dono, depois execução ⏸ BLOQUEADA

O único item que **não** posso decidir sozinho, porque muda a aparência de todas as telas.

As superfícies base discordam entre si hoje:

| Componente | Raio |
|---|---|
| `card.tsx` | `rounded-2xl` (18px) — 53 call sites |
| `dialog.tsx`, `alert-dialog.tsx` | `rounded-lg` (10px) |
| `popover.tsx`, `dropdown-menu.tsx` | `rounded-md` (8px) |
| `sheet.tsx` | `rounded-sm` (6px) |

- **Opção A — alinhar em 18px:** sobe Dialog/Popover/Sheet até o Card. Nenhuma tela muda em
  repouso; só o que é flutuante fica mais macio. **Risco visual: baixo.**
- **Opção B — alinhar em 10px** (o valor de `--radius`): desce o Card. Mais sóbrio e coerente
  com o token base, mas **muda o canto de todo card do sistema**. **Risco visual: alto** — é a
  mudança mais visível de toda a identidade.

Depois da decisão: alinhar os 4 componentes base e reavaliar os 51 `rounded-xl`/`2xl` avulsos
em call sites, que hoje não têm critério.

---

## Onda 3 — sombra por token (84 usos mistos)

Divergência #4 da identidade. Sombra crua sem par `dark:shadow-[var(--shadow-*)]` praticamente
desaparece no tema escuro — é o degrau de elevação que some, não um detalhe.

Ordem: primeiro os componentes de `ui/` (vale por todas as telas), depois os call sites
listados nos relatórios (`financeiro:288`, `venda-rapida:58`, `antecipacao-client`, composer do
chat). **Exige olhar as duas versões de tema** — não é substituição cega.

---

## Onda 4 — tipografia restante (49 `text-[10px]` + 11 `text-[11px]`)

Concentração: `venda-rapida-form-v2.tsx` (17 achados), `antecipacao-client.tsx` (12),
`intelligence-chat-*` (5), `crm/page.tsx` (2).

**Por que não foi em lote junto com o `[9px]`:** essas telas tiveram a densidade ajustada a olho.
Trocar 60 ocorrências por `text-xs` de uma vez muito provavelmente estoura layout em algum ponto,
e sem conseguir rodar a aplicação neste ambiente não há como ver. Caminho: **um arquivo por
commit**, começando pelo maior ofensor, com captura antes/depois.

---

## Onda 5 — achados pontuais por tela

| Achado | Onde | Severidade |
|---|---|---|
| Tabela do chat da IA sem cabeçalho maiúsculo, sem número à direita, sem `tabular-nums` | `intelligence-chat-client.tsx:20-53` (`MarkdownTable`) | MÉDIA |
| `text-primary` em **todo** cabeçalho de tabela — accent muito além do papel de título | `commissions-dashboard-client.tsx` | MÉDIA |
| Valor monetário sem `tabular-nums` | `commissions-dashboard-client.tsx:123,139` | MÉDIA |
| PDF de exportação usando cor destrutiva (decorativa, não informativa) | `relatorios/page.tsx:70-73` | MÉDIA |
| Tela de assinatura nunca renderiza `<h1>` (nos 4 estados) | `assinatura/[token]/page.tsx` | MÉDIA |
| Botão só-ícone sem `aria-label` | modal de assinatura; botão "limpar" do `Input` (transversal) | MÉDIA |
| 3 variantes de `Card` órfãs (`glass`, `interactive`, `gradient`) + `CardGlass`/`CardInteractive` | `card.tsx` | MÉDIA |
| `TabsList` em `rounded-xl` sem critério | `tabs.tsx:18` | MÉDIA |
| `sr-only` em inglês | `dialog.tsx` | BAIXA |
| Ícone em `rounded-2xl` onde o `EmptyState` usa `rounded-full` | `offline/page.tsx` | BAIXA |
| `dark:text-warning` (token de preenchimento como texto) sem justificativa medida | 3 usos em operação | MÉDIA |

O último merece cuidado: existe um caso idêntico em `clientes-tab-client.tsx:217` que **está**
documentado com números de contraste medidos. Verificar caso a caso antes de "corrigir" — pode
ser exceção legítima que a regra genérica não cobre.

---

## Onda 6 — impedir a dívida de voltar

Sem isto, tudo acima volta em seis meses. As travas atuais não pegam nada disto:

1. **Tamanho de fonte arbitrário.** Estender o scanner para falhar em `text-[Npx]` em `src/`,
   com baseline versionado (mesmo mecanismo do `raw-color-baseline.json`, que hoje segura a cor
   crua em 0).
2. **Cor em CSS puro.** A catraca varre classes Tailwind. O degradê de três cores dos títulos
   vivia em `.page-title-gradient`, em CSS puro, e atravessou intacto a troca da paleta da marca.
   O scanner precisa varrer `globals.css` também.
3. **Variante de componente sem uso.** `gradient` ficou órfã e só esperava para reintroduzir o
   padrão removido. Um teste que falhe quando uma variante do `cva` não tem call site.
4. **Comentário JSX dentro de expressão** — o erro que quebrou o lint nesta sessão. Barato de
   detectar, e o lint só pega depois do push.

---

## Ordem recomendada

1. **Onda 6.1** (scanner de tamanho arbitrário) — antes da Onda 4, senão corrigimos 60 usos e
   nada impede o 61º.
2. **Onda 5** — achados pontuais, independentes entre si, cada um com commit próprio.
3. **Onda 3** — sombra, com verificação nos dois temas.
4. **Onda 4** — tipografia restante, um arquivo por commit.
5. **Onda 2** — só depois da decisão do raio.

**O que não entra neste plano:** os indicadores coloridos por métrica do Dashboard. Foram
testados contra a alternativa neutra em 2026-08-11 e o dono manteve o colorido — num painel visto
todo dia a cor é endereço. Não é dívida.
