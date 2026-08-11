---
scope: commits cd641b4, 5d86ac8, 4559d8d, 62267b0, c95fdbe, f714471, ff2d722
reviewed: 2026-08-11
depth: standard (leitura commit a commit + varredura de scripts reais)
files_reviewed: 24
files_reviewed_list:
  - src/app/globals.css
  - design-system/escala-baseline.json
  - src/app/(app)/relatorios/page.tsx
  - src/components/ui/alert-dialog.tsx
  - src/components/ui/dialog.tsx
  - src/components/ui/dropdown-menu.tsx
  - src/components/ui/popover.tsx
  - src/components/ui/select.tsx
  - src/components/ui/sheet.tsx
  - src/components/ui/badge.tsx
  - src/components/ui/date-input.tsx
  - src/components/ui/input.tsx
  - src/components/ui/switch.tsx
  - src/components/ui/tabs.tsx
  - src/components/ui/textarea.tsx
  - src/components/ui/toggle.tsx
  - src/components/ui/card.tsx
  - src/components/ui/button-variants.ts
  - src/lib/design-tokens.ts
  - src/app/(app)/financeiro/page.tsx
  - src/app/(app)/layout.tsx
  - src/app/assinatura/[token]/page.tsx
  - src/app/global-error.tsx
  - src/components/dashboard-charts.tsx
  - src/components/finance-charts.tsx
  - src/components/intelligence-chat-composer.tsx
  - src/components/produto-item-form.tsx
  - src/components/receipt-preview.tsx
  - src/components/venda-rapida-form-v2.tsx
  - src/components/antecipacao-client.tsx
  - src/components/bfx-intelligence-panel.tsx
  - src/components/catalogo-publico-client.tsx
  - src/components/form-select.tsx
  - src/components/sidebar-nav.tsx
  - src/components/toaster-responsive.tsx
findings:
  critical: 2
  warning: 0
  info: 2
  total: 4
status: issues_found
---

# Review: sombra por token, tokens `--brilho-topo-*` e botão PDF de /relatorios

**Reviewed:** 2026-08-11
**Depth:** standard — cada commit lido isoladamente (`git show <sha>`), sem diff acumulado
**Files Reviewed:** 24 arquivos de origem tocados pelos 7 commits em escopo
**Status:** issues_found

## Summary

Revisei os 7 commits um a um: `cd641b4` (tokens `--brilho-topo-a/b`), `5d86ac8` (botão PDF de
`/relatorios`) e os 5 commits de "sombra por token" (Grupos A–D: `4559d8d`, `62267b0`, `c95fdbe`,
`f714471`, `ff2d722`).

**Os tokens `--brilho-topo-a/b` e o botão PDF estão corretos** — verifiquei os três pontos de
concordância (`:root`, `.dark`, `@theme inline`), a equivalência de valores com o gradiente antigo
em ambos os temas, e a hierarquia do botão PDF de exportação rápida contra o par CSV/PDF do bloco
"Outros Relatórios" da mesma página.

**O emparelhamento sombra→token está correto em todos os 5 grupos** — degrau por degrau (sm→sm,
md→md, lg/xl→lg), inclusive nas formas com prefixo (`dark:hover:`, `dark:group-[.toaster]:`,
`dark:data-[state=active]:`). Rodei os três scripts de verificação real do projeto
(`token-contrast.mjs`, `escala-scan.mjs --check`, `raw-color-scan.mjs --check`) e todos passam sem
regressão (77 pares de contraste OK, 0 reprovações; escala e cor CSS pura zeradas).

**Porém encontrei 2 ocorrências do bug de sintaxe descrito no foco** (comentário JSX dentro de
`{cond && (`) nos commits `f714471`/`ff2d722`, que nenhum dos três scripts acima detecta (eles
fazem varredura textual, não parse de JS/JSX) — isso só aparece no build/lint do CI, exatamente
como a instrução alertou. São bugs reais introduzidos pelos commits em escopo, não hipótese: linha
por linha abaixo.

## Critical Issues

### CR-01: Comentário JSX dentro de `{cond && (` quebra o parser em `bfx-intelligence-panel.tsx`

**File:** `src/components/bfx-intelligence-panel.tsx:195-198` (introduzido em `ff2d722`)
**Issue:** O bloco ficou:
```tsx
{perfil.ultimaVenda && (
  {/* Sem sombra (D-03): bloco tem borda propria e vive dentro do
      Card (que tem a sua) — mesmo plano. */}
  <div className="bg-white dark:bg-card rounded-xl p-4 border border-info">
```
Dentro de `(...)` só pode haver **uma** expressão. `{/* comentário */}` nesse ponto não é um
comentário JSX válido (comentário JSX só existe como filho de JSX, não como o próprio conteúdo de
uma expressão entre parênteses vinda de `&&`) — é interpretado como um objeto literal vazio
seguido de `<div>...</div>` sem operador entre os dois. Isso é `SyntaxError` de verdade: dois
tokens de expressão adjacentes sem vírgula/operador. Confirmado por leitura do arquivo atual (não
é hipótese) — é exatamente o padrão que "já derrubou o CI nesta sessão" citado no briefing.
Nenhum dos scripts de design-tokens pega isso porque são scans textuais, não parse — só apareceria
no build/lint do CI.
**Fix:** Mover o comentário para fora do parêntese de curto-circuito (antes do `{perfil.ultimaVenda && (`) ou usar `//` dentro do próprio elemento como comentário de linha do JSX children (depois da tag de abertura), nunca como o primeiro token dentro de `( ... )`:
```tsx
{/* Sem sombra (D-03): bloco tem borda propria e vive dentro do
    Card (que tem a sua) — mesmo plano. */}
{perfil.ultimaVenda && (
  <div className="bg-white dark:bg-card rounded-xl p-4 border border-info">
```

### CR-02: Mesmo bug de sintaxe em `antecipacao-client.tsx`

**File:** `src/components/antecipacao-client.tsx:537-542` (introduzido em `ff2d722`)
**Issue:** Idêntico ao CR-01:
```tsx
{Object.keys(vencimentosPorEmpresa).length > 0 && (
  {/* Degrau de repouso (D-03), colapsado de lg para md: card
      secundaria (vencimentos por empresa) ... */}
  <Card className="mt-6 border-2 border-warning/20 bg-gradient-to-br from-card to-card-elevated p-6 shadow-md dark:shadow-[var(--shadow-md)]">
```
Mesma quebra de sintaxe: `{/* comentário */}` como primeiro token dentro de `(...)` de um
`&&`, seguido de `<Card>` sem operador entre os dois. Confirmei por varredura estrutural
(regex sobre `&& (\s*$` seguido de `{/*` na próxima linha não-vazia) em todos os arquivos tocados
pelos 7 commits: essas são as únicas 2 ocorrências do padrão no escopo revisado. Note que a
**primeira** `<Card>` da mesma tela (`antecipacao-client.tsx:419-423`) usa o mesmo estilo de
comentário mas está correta — ali o comentário é irmão de JSX (depois de `</Table>`, antes de
`<Card>`, sem estar dentro de um `&&(`), o que é sintaxe válida. O bug só existe quando o
comentário vem logo após `&& (`.
**Fix:**
```tsx
{/* Degrau de repouso (D-03), colapsado de lg para md: card
    secundaria (vencimentos por empresa) na mesma tela da card
    principal acima — a escala e um degrau por nivel, nunca dois
    "flutuantes" na mesma superficie. */}
{Object.keys(vencimentosPorEmpresa).length > 0 && (
  <Card className="mt-6 border-2 border-warning/20 bg-gradient-to-br from-card to-card-elevated p-6 shadow-md dark:shadow-[var(--shadow-md)]">
```

## Info

### IN-01: `--color-brilho-topo-a/b` expostos no `@theme inline` sem nenhum consumidor de utilitária Tailwind

**File:** `src/app/globals.css:99-100`
**Issue:** O commit `cd641b4` segue corretamente a convenção do arquivo (todo token em `:root`/`.dark`
ganha um espelho `--color-X` em `@theme inline` para virar utilitária Tailwind, ex.:
`bg-brilho-topo-a`). Mas `body` usa `var(--brilho-topo-a)` diretamente no `background-image`, não
a utilitária gerada — e não há `bg-brilho-topo-a`/`text-brilho-topo-a` em nenhum outro arquivo do
`src/`. Não é um bug (a convenção do arquivo pede o espelho em `@theme inline` independente de uso
imediato), mas as duas entradas ficam sem consumidor de utilitária hoje. Verificado por grep, não
é hipótese.
**Fix:** Nenhuma ação necessária — apenas registrar para não estranhar se um scanner de "token não
usado" apontar essas duas chaves no futuro.

### IN-02: Inconsistência pré-existente no par `lg`↔`--shadow-md`, fora do escopo revisado

**File:** `src/app/(app)/layout.tsx:70`
**Issue:** Ao varrer todo `dark:shadow-[var(...)]` do repo para achar pares trocados pedidos no
foco, encontrei `shadow-lg ... dark:shadow-[var(--shadow-md)]` no `<main>` do layout — um par
realmente trocado (deveria ser `--shadow-lg`). **Confirmei com `git log -S` que essa linha vem do
commit `9274f2b` ("feat(ui): enhance dark mode UX/UI...")**, anterior e fora dos 7 commits em
escopo desta revisão — os commits revisados tocam esse mesmo arquivo (painel da sidebar, chip do
logo) mas não essa linha do `<main>`. Incluo apenas como nota lateral, não como finding dos
commits pedidos.
**Fix:** Fora do escopo desta revisão; sinalizar para uma limpeza futura de sombra caso o time
queira fechar o gap (`shadow-lg dark:shadow-[var(--shadow-lg)]`).

---

_Reviewed: 2026-08-11_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
