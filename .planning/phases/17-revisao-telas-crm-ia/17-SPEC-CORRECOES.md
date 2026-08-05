# Fase 17 — Spec das correções (CRM e IA)

Base: `17-ACHADOS.md`. Metade do caminho já foi feita na fase 16 (`--success-text`,
`--warning-text`, `--info-text` existem, estão em `TOKEN_PAIRS` e as telas financeiras
já migraram). Aqui termina o que ficou de fora.

Gates antes: `token-contrast.mjs` **43 pass / 0 fail / 3 skip** · `raw-color-scan --check` **0**.

---

## P1 — Dado errado: o rótulo do provedor em `/inteligencia`

**Hoje:** `page.tsx:158` grava `provider: "gemini"` fixo ao mapear o histórico e
`intelligence-chat-client.tsx:122` fixa `const provider = "gemini"`. O rótulo é renderizado
em `:167`. O provedor real vem de `getAiProvider()` (`config.aiProvider` → `AI_PROVIDER`).
Uma resposta gerada pelo LiteLLM aparece rotulada GEMINI.

**Esperado:** cada mensagem carrega o provedor com que foi gerada.

**Por que coluna nova e não leitura do provedor atual:** o rótulo é histórico. Ler
`getAiProvider()` na renderização rotularia **todas** as mensagens antigas com o provedor
configurado *hoje* — trocaria uma mentira fixa ("sempre gemini") por outra móvel
("sempre o atual"). O provedor tem de ser persistido no momento da escrita.

**Mudanças:**
- `prisma/schema.prisma` → `AiMensagem.provider String? @map("provider")`
- `prisma/migrations/20260805120000_ai_mensagem_provider/migration.sql`, escrita à mão,
  idempotente (`ADD COLUMN IF NOT EXISTS`). **Nenhum `prisma migrate`/`db push` é rodado** —
  o container aplica no deploy.
- `addAssistantMessage` passa a receber e gravar `provider`.
- `getDisplayHistory` seleciona `provider`; o mapa devolve `m.provider ?? null`.
- **Linhas antigas ficam com `NULL`** — e `NULL` não vira "gemini". A pílula some quando o
  provedor é desconhecido. Ausência é honesta; um rótulo inventado não é.
- O balão otimista (client) recebe o provedor atual por prop `currentProvider`, vindo do
  server component. É o provedor que a requisição em curso vai usar de fato.
- `Message.provider` passa a ser `string | null`.

**Fora de escopo:** backfill das linhas existentes (exigiria escrever no banco, proibido).

## P2 — Terminar a migração de tokens

### `--error-text` (achado 3)
Não existe. O callout de erro mede 4.02:1 e não tem para onde migrar.
Mesmo padrão dos outros três — mesma matiz e mesmo croma do token de preenchimento, só o L cai:

| | valor | vs `--card` | vs `--error-bg` | vs `bg-error/10` |
|---|---|---|---|---|
| claro | `oklch(0.52 0.24 25)` | **5.60** | **4.66** | **4.69** |
| escuro | `oklch(0.70 0.24 25)` | **5.67** | 5.66 (composto) | — |

Quatro pontos: `:root`, `.dark`, `@theme inline` e `tailwind.config.ts`. Mais **dois pares novos
em `TOKEN_PAIRS`** (`error-text/card`, `error-text/error-bg`) — token sem par não é policiado.

> `tailwind.config.ts` está **inerte** neste projeto (Tailwind v4 via `@tailwindcss/postcss`, sem
> `@config` em nenhum CSS): quem gera a classe é o `@theme inline`. O config é atualizado por
> coerência com os outros três tokens, não porque funcione.

### 6 call sites (achado 2) + `badge.tsx` (achado 3)
| arquivo:linha | de | para |
|---|---|---|
| `crm/fidelidade:76` | `text-success` | `text-success-text` |
| `crm/fidelidade:117` | `text-success` | `text-success-text` |
| `crm/campanhas:212` | `text-warning` | `text-warning-text` |
| `crm/importar-leads:35` | `bg-success/10 text-success` | `bg-success-bg text-success-text` |
| `crm/campanhas:77` | `bg-error/10 text-error` | `bg-error-bg text-error-text` |
| `crm/importar-leads:41` | `bg-error/10 text-error` | `bg-error-bg text-error-text` |
| `ui/badge.tsx:24` (`error`) | `text-error` | `text-error-text` |

Duas armadilhas herdadas da fase 16, respeitadas aqui:
`text-*-text/NN` anula o ganho (4.59 → 3.30) e sobre `bg-*/20` o texto trava mesmo com o token —
por isso o tint opaco `bg-*-bg` nos callouts.

## P3 — Demais achados

| # | Correção |
|---|---|
| 1 | `min-w-0` no `<Card>` de "Saldo de pontos" — é item de `grid lg:grid-cols-2` e o `min-content` de 473px da tabela vaza. O diagnóstico do revisor é explícito: `min-width:0` no Card leva 552→472; no `.overflow-x-auto` não muda nada |
| 4 | `/inteligencia` ganha `<PageHeader>` como as outras 20 rotas (h1 24px/700, `page-title-gradient`, breadcrumb). O `CardTitle` de 30px vira o título real; "Limpar conversa" vira `actions` |
| 5 | `FormSelect`: o wrapper tinha `min-h-10` fixo, então com `h-7` no gatilho o bloco continuava com 40px e o gatilho encostava no topo — 10px de desalinho na base contra o botão irmão. Remove-se o `min-h-10` (redundante com o gatilho `h-10` padrão) e os dois call sites do `/crm` passam a `h-9 rounded-md`, a mesma altura e o mesmo raio de `size="sm"` |
| 6 | `/inteligencia` em 390px: `CardHeader`/`CardContent` com `p-6` fixo → `p-4 sm:p-6`; a bolha vai a `max-w-full` em telas estreitas. Recupera ~48px de leitura |
| 7 | Corpo da tabela markdown: `text-muted-foreground` (4.43:1) → `text-foreground`. Célula de dado é conteúdo primário; a distinção com o cabeçalho já é o `font-semibold` |
| 8 | `stripToolMarkup()` filtra `<tool_call>…</tool_call>` e `<function=…>` **na renderização**. O banco não é tocado. Mensagem que fica vazia depois do filtro mostra um aviso discreto em vez de bolha em branco |
| 9 | Rótulos "Você"/"Assistente" → `text-foreground` (3.65:1 e 4.45:1 vinham de `muted-foreground` sobre tint). Pílula do provedor sai de `bg-muted` (4.35:1) para `bg-card` + `border` (4.87:1) |
| 10 | `page-header.tsx:29` — "Inicio" → "Início". Vale para as 21 rotas de uma vez |

**Não corrigido:** o corpo da mensagem do LiteLLM que expõe o nome do modelo (parte do achado 8) —
é texto de erro real, não markup interno; filtrar esconderia diagnóstico.

## Ordem
Spec → teste que falha (`src/__tests__/telas-crm-ia.test.ts`) → implementação → revisão em subagente.
