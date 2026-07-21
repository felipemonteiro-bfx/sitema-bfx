---
phase: quick-260402-grr
plan: 1
subsystem: email, relatorios, busca, empresas, whatsapp
tags: [email, smtp, fuzzy-search, pdf, csv, cron, vinculos, empresas, whatsapp]
dependency_graph:
  requires: [prisma/schema.prisma, src/lib/db-search.ts, src/app/(app)/venda-rapida/actions.ts]
  provides: [src/lib/email.ts, src/app/api/cron/relatorio-semanal/route.ts, src/app/api/clientes/similar/route.ts, src/components/historico-busca-fuzzy.tsx]
  affects: [src/app/(app)/historico/page.tsx, src/app/(app)/cadastros/page.tsx, src/components/empresas-tab-client.tsx, src/components/clientes-tab-client.tsx]
tech_stack:
  added: [SMTP nativo (Node net/tls), EmpresaVinculo model, fuzzyFindVendas]
  patterns: [fire-and-forget async, fuzzy pg_trgm multi-coluna, symmetric vinculos]
key_files:
  created:
    - src/lib/email.ts
    - src/app/api/cron/relatorio-semanal/route.ts
    - src/app/api/clientes/similar/route.ts
    - src/components/historico-busca-fuzzy.tsx
  modified:
    - prisma/schema.prisma
    - src/lib/db-search.ts
    - src/app/api/search/route.ts
    - src/app/api/relatorios/vendas/pdf/route.ts
    - src/app/api/relatorios/vendas/route.ts
    - src/app/(app)/venda-rapida/actions.ts
    - src/app/(app)/historico/page.tsx
    - src/app/(app)/cadastros/page.tsx
    - src/components/clientes-tab-client.tsx
    - src/components/empresas-tab-client.tsx
    - src/app/api/whatsapp/route.ts
decisions:
  - SMTP nativo via net/tls em vez de nodemailer (nao instalado, sem permissoes npm install)
  - Vinculos simetricos automaticos (A->B cria tambem B->A) para facilitar queries por empresa
  - fuzzyFindVendas combina 3 fontes (clientes, vendedor, itens_venda) com OR
  - Auto-reconnect WhatsApp no GET apenas (nao no frontend polling loop para evitar spam)
  - Fuzzy busca historico usa querystring param q; desativa filtros normais quando presente
metrics:
  duration: "~45min"
  completed: "2026-04-02"
  tasks_completed: 2
  files_changed: 15
---

# Quick Task 260402-grr Summary

**One-liner:** SMTP nativo + notificacao email empresa parceira ao criar venda, relatorio PDF 7 colunas landscape, cron semanal por empresa, fuzzy search vendas, alerta duplicata cliente, WhatsApp auto-reconnect, vinculos entre empresas parceiras.

## Tasks Completed

| # | Task | Commit | Status |
|---|------|--------|--------|
| 1 | Email infra + notificacao venda + PDF/CSV + cron semanal | be10f98 | Done |
| 2 | Fuzzy vendas + alerta similar + WhatsApp fix + vinculos empresas | 927e052 | Done |

## What Was Built

### Task 1: Email + Relatorios + Cron

**src/lib/email.ts** — Infraestrutura SMTP completa usando Node native `net`/`tls` (nodemailer nao disponivel):
- `getSmtpConfig()`: le de env vars (SMTP_HOST/PORT/USER/PASS/FROM) ou tabela Config (campos adicionados)
- `sendEmail({ to, subject, html, cc })`: envia via SMTP com STARTTLS ou TLS (porta 465)
- `sendVendaNotification(venda)`: busca EmpresaParceira pelo campo cliente.empresa (case-insensitive), envia email para emailRh + emailsExtras
- `sendWeeklyReport(empresaNome, vendas, emails, adminEmail)`: gera tabela HTML com 7 colunas, envia com CC para admin

**prisma/schema.prisma**:
- Config: campos smtpHost, smtpPort, smtpUser, smtpPass, smtpFrom, adminEmail adicionados
- EmpresaVinculo: novo model com relacoes simetricas em EmpresaParceira

**venda-rapida/actions.ts**: fire-and-forget `sendVendaNotification` em `criarVenda` e `criarVendaV2` usando `.catch(console.error)` para nao bloquear resposta

**pdf/route.ts**: landscape A4 (842x595), 7 colunas `[40,100,210,380,490,580,680]`, headers `["Mat.", "Nome", "Produtos", "Vendedor", "Data", "Valor", "Parc."]`, inclui `cliente.matricula` no select

**relatorios/vendas/route.ts**: CSV header `Matricula,Nome,Produtos,Vendedor,Data,Valor,Parcelas`, inclui matricula, valores corretamente separados

**api/cron/relatorio-semanal/route.ts**: auth Bearer CRON_SECRET, busca empresas com emailRh, para cada empresa busca vendas 7 dias, envia via `sendWeeklyReport`

### Task 2: Fuzzy + Similar + WhatsApp + Vinculos

**db-search.ts** — `fuzzyFindVendas(search, limit)`: busca multi-coluna combinando IDs de:
1. `fuzzyIds("clientes", "nome")` → clienteId IN (...)
2. `$queryRawUnsafe` em vendas.vendedor
3. `$queryRawUnsafe` em itens_venda.produto_nome
Retorna vendas com include cliente+itens

**api/search/route.ts**: `type=vendas` adicionado, label formatado como `clienteNome — produtos — data`

**api/clientes/similar/route.ts**: `GET ?nome=X`, threshold 0.3, limit 5, retorna `{ similares: [{ id, nome }] }`

**clientes-tab-client.tsx**: state `similares`, `handleNomeBlur` chama `/api/clientes/similar`, exibe `AlertTriangle` + nomes similares abaixo do campo nome, limpa ao digitar

**historico-busca-fuzzy.tsx**: componente client com debounce 600ms, atualiza URL com param `q`, botao limpar

**historico/page.tsx**: param `q` no tipo Search, quando presente executa `fuzzyFindVendas` e usa `{ id: { in: fuzzyVendaIds } }` no where

**api/whatsapp/route.ts**: GET auto-chama `createInstance()` quando estado e `close` ou `unknown`

**empresas-tab-client.tsx**: coluna Vinculadas na tabela, botao Vincular abre card inline com checkboxes, `saveVinculos` chama `onVincularAction`

**cadastros/page.tsx**: `vincularEmpresas` action (deleta vinculos antigos, cria novos simetricos), empresas query com `include vinculos` em try-catch (retrocompatibilidade)

## Deviations from Plan

None — plano executado conforme especificado. SMTP nativo foi a alternativa planejada para o caso de nodemailer nao estar disponivel (confirmado ausente).

## Self-Check: PASSED

- src/lib/email.ts: FOUND
- src/app/api/cron/relatorio-semanal/route.ts: FOUND
- src/app/api/clientes/similar/route.ts: FOUND
- src/components/historico-busca-fuzzy.tsx: FOUND
- TypeScript: zero erros nos arquivos do projeto (apenas erros pre-existentes em env-validation.test.ts)
- Prisma schema valido
- Commits: be10f98, 927e052
