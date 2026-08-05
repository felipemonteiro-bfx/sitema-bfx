# Fase 18 — Achados da revisão visual (configurações, RH, perfil e rotas públicas)

**Revisor:** subagente com a skill `ui-ux-pro-max`
**Método:** MCP do navegador indisponível; reaproveitou o harness da fase 17 (Chromium do cache
`ms-playwright` por script Node, login via `POST /api/auth/login`). Contraste por composição em
canvas. Sanity 21.00 em 100% das medições; tema conferido pelo `bodyBg` em toda execução.
**Telas:** `/configuracoes` (6 abas), `/gestao-rh` (3 abas), `/perfil`, `/login`, `/catalogo`,
`/offline` — 1440px e 390px, claro e escuro. Nenhuma escrita.

## Erro de dado

Numérico: **nenhum**. `/gestao-rh` fecha (2 usuários, 1 admin, meta média R$ 22.500,00 exata) e
`/perfil` bate com a linha do admin.

**Rótulo errado:** o botão diz **"Excluir Vendedor" também para o `Administrador`**.
`delete-user-button.tsx:55` — string fixa, sem condicional por perfil.

## Alta

| # | Tela | Problema | Evidência |
|---|---|---|---|
| 1 | **todas as 21 rotas** | **`text-destructive-foreground` não gera regra CSS** — o texto herda `--foreground` | `--color-destructive-foreground` **não existe** no `@theme` (só `--color-destructive`, linha 51). Sonda em runtime: `text-error-foreground` resolve, `text-destructive-foreground` herda. Botão medido: **4.04:1** claro, **3.23:1** escuro. Os tokens estão certos (4.69 / 6.09) — a utilitária não é gerada. **10 call sites**, incluindo `ui/button-variants.ts:13`, `ui/badge.tsx:16`, `lib/design-tokens.ts:92`. `git log -S` prova que a chave nunca existiu: inconsistência de origem. É por isso que `contraste:check` passa — ele mede o par de tokens, não a utilitária |
| 2 | configuracoes (Recibo) | Única das 21 rotas com rolagem horizontal em **1440px** | `scrollWidth` **1471** vs **1440**. `<Input type="file" className="sr-only">` (`logo-upload-form.tsx:87`) renderiza **1078×40px**: o `sr-only` aplica `position`/`clip`, mas `w-full`/`h-10` da base do `<Input>` vencem `width:1px`/`height:1px` — o tailwind-merge não trata `sr-only` como conflitante |
| 3 | configuracoes (todas as abas) | Rolagem horizontal em 390px | `scrollWidth` **465** vs **390**. `[role=tablist]` mede **436px** numa caixa de 358px. 3ª rota com tablist largo (fase 16: 476 e 477) |
| 4 | configuracoes (WhatsApp) | success/warning/info como texto — mesma causa das fases 16 e 17 | 5 call sites: `configuracoes:513` **3.86:1** · `whatsapp-connect:103,104` **2.97:1** · `:109,110` **2.06:1**. Escuro passa |

## Média

| # | Tela | Problema | Evidência |
|---|---|---|---|
| 5 | configuracoes, gestao-rh, perfil | Sem breadcrumb, enquanto 15 das 19 rotas de `(app)` têm | `<PageHeader>` sem a prop. Só estas 3 + `/importacao`. O `<h1>` está certo: 24px/700 com gradiente |
| 6 | gestao-rh (Detalhes) | Degrau de 4px entre botões da mesma linha | "Excluir Vendedor" h=36/r8/12px vs "Salvar Alterações" h=40/r10/14px |
| 7 | offline | `<button>` cru com estilo à mão | `offline/page.tsx:15` — weight 600 vs 500 do `<Button>`, padding 20/10 vs 16/8, sem focus-visible, sem hover, sem active:scale. Ícone `<svg>` inline em vez de lucide |
| 8 | configuracoes (Recibo) | 8 cores cruas em hex no preview, 2 ilegíveis | `receipt-preview.tsx` — `text-[#9ca3af]` sobre branco = **2.54:1**, nos dois temas. A catraca `cores:check` não pegou. O branco fixo é defensável (simula papel); o 2.54:1 não |
| 9 | login | Nenhum `<h1>` na página | O título é um `CardTitle` (`<div>`) 24px. Mesma família do achado 4 da fase 17 |

## Baixa

| # | Tela | Problema | Evidência |
|---|---|---|---|
| 10 | configuracoes, gestao-rh | Abas inativas a **4.47:1** no claro | Idêntico ao achado 12 da fase 16 — é o componente `Tabs` |
| 11 | configuracoes (WhatsApp) | 8 rótulos 12px a **4.36:1** sobre painel tintado | O mesmo cinza passa (4.6) sobre card branco e reprova sobre o painel `info` |
| 12 | configuracoes, gestao-rh (390px) | `[role=tab]` mede **32px** de altura (mínimo de toque 44) | É o `TabsTrigger` (`py-1.5`), vale para todas as rotas com abas |
| 13 | catalogo | Diverge dos tokens de forma do app | Busca h=44/r14 vs `<Input>` h=40/r10; `<h1>` 20px sem `page-title-gradient`. Inconsistência **de origem** — rota pública, nunca compartilhou o header |

## OK (registrado para não parecer omissão)

**`/perfil` está boa**: zero reprovações nas 4 combinações, sem rolagem, 7 controles a 40px exatos.
**As 3 rotas públicas estão boas**: `/login`, `/catalogo` e `/offline` com zero reprovação e zero
rolagem em 1440 e 390, nos dois temas — e as três respeitam `prefers-color-scheme`. Nada divergiu
por falta de revisão, ao contrário do que se esperava. **Estados de erro passam**: login inválido
4.82/5.67, `/assinatura` com token inexistente devolve 200 com mensagem e zero reprovação.
**Zero componente errado nas 6 telas.** O achado 3 da fase 17 (`--error-text`) foi fechado no
commit `6d2e425`.

## Não avaliado

`/assinatura/[token]` com token **válido** (não havia como obter sem gravar) · qualquer submissão em
`/configuracoes` (grava credencial real) · criar/excluir usuário · salvar `/perfil` · estados
"Conectado"/"Aguardando QR" do WhatsApp com sessão real · `/catalogo` com produto que tenha foto
(só 1 de 208).

## Veredito das 21 rotas

Estruturalmente coerente — mesmo `PageHeader`, mesmo `Card`, mesmos componentes, tema escuro
praticamente sem reprovação. **Incoerente na camada de cor de texto**, onde a mesma causa (token de
preenchimento usado como texto, agora acompanhada de um par que nunca chegou ao `@theme`) reprovou
no tema claro nas quatro fases.
