---
gsd_state_version: 1.0
milestone: v1.1
milestone_name: Demandas do Cliente BFX
current_phase: 5
current_phase_name: first phase of milestone v1.1
status: verifying
stopped_at: Completed 07-02-PLAN.md
last_updated: "2026-08-03T18:36:57.897Z"
last_activity: 2026-08-03
last_activity_desc: "05-02: manifestos MinIO (Deployment/PVC/Service), ExternalSecret e runbook SSM concluídos"
progress:
  total_phases: 3
  completed_phases: 3
  total_plans: 10
  completed_plans: 10
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-08-03)

**Core value:** O PDV deve ser rápido, completo e sem fricção — uma venda com múltiplos produtos e parcelamento deve poder ser registrada em segundos.
**Current focus:** Phase 5 — Storage durável (MinIO no cluster)

## Current Position

Phase: 5 of 9 (Storage durável (MinIO no cluster)) — first phase of milestone v1.1
Plan: 4 of 4
Status: Phase complete — ready for verification
Last activity: 2026-08-03 — 05-02: manifestos MinIO (Deployment/PVC/Service), ExternalSecret e runbook SSM concluídos

Progress: [██████████] 100%

## Performance Metrics

**Velocity:**

- Total plans completed: 0
- Average duration: -
- Total execution time: 0 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| Phase 04-melhorias-infra P03 | 1 | 2 tasks | 3 files |
| Phase 04-melhorias-infra P01 | 1m | 2 tasks | 5 files |
| Phase 04-melhorias-infra P04 | 12 | 2 tasks | 8 files |

**Recent Trend:**

- Last 5 plans: -
- Trend: -

*Updated after each plan completion*
**Per-Plan Metrics:**

| Plan | Duration | Tasks | Files |
|------|----------|-------|-------|
| Phase 05 P02 | 20min | 3 tasks | 6 files |
| Phase 5 P4 | 20min | 2 tasks | 4 files |
| Phase 06 P01 | 5min | 3 tasks | 7 files |
| Phase 06 P02 | 12min | 3 tasks | 7 files |
| Phase 07 P01 | 16min | 3 tasks | 5 files |
| Phase 07 P03 | 3min | 3 tasks | 4 files |
| Phase 07 P02 | 6min | 3 tasks | 6 files |

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- [v1.1 kickoff]: Storage de uploads = MinIO no cluster (Deployment + PVC + Service, namespace `bfx`), não Amazon S3 — decisão do André, diverge da recomendação do Grok
- [v1.1 kickoff]: Custo abaixo do `custoPadrao` liberado para TODOS os vendedores (não só admin) na venda rápida — reabre vetor de comissão/margem inflados fechado no commit `a63dc04`. Marcado "⚠️ Revisit" no PROJECT.md
- [v1.1 kickoff]: Estoque — suprimir apenas alertas/badge e o cap de quantidade; manter decremento e aba Estoque do `/financeiro` (reversível)
- [v1.1 kickoff]: Fases 1-3 do v1.0 (multi-produto, parcelas, busca de cliente) encerradas como entregues — verificação de código mostrou já em produção; replanejar seria retrabalho
- [v1.1 kickoff]: Grok atua como revisor externo de plano (read-only); Claude implementa
- [Phase quick-260323-kp0]: Gross margin only (CMV/receita), excludes taxaNota/custoEnvio; returns null when cost data unavailable
- [Phase 04-melhorias-infra]: SESSION_SECRET requires 32+ chars only in production; bypasses with dev-secret default in dev
- [Phase 04-melhorias-infra]: SKIP_ENV_VALIDATION env var bypasses zod schema for CI/Docker build scenarios
- [Phase 04-melhorias-infra]: env.ts wired via db.ts (not middleware.ts) to avoid Edge Runtime incompatibility
- [Phase 04-01]: Mantida compatibilidade retroativa de requireAdmin() — adicionado requireAdminOrThrow() como alternativa segura
- [Phase 04-01]: Fail-fast no nivel de modulo em producao para SESSION_SECRET (lanca em import-time, nao request-time)
- [Phase 04-melhorias-infra]: Deteccao de duplicata Asaas usa two-layer check: error code + substrings (backward compat)
- [Phase 04-melhorias-infra]: installmentValue calculado automaticamente (totalValue/installmentCount) com suporte a valor explicito via ?? operator
- [Phase 04-melhorias-infra]: env-validation tests use await import() rejects pattern because env.ts runs validateEnv() at module scope
- [Phase 04-melhorias-infra]: session-secret test mocks next/headers to keep unit tests in pure Node.js without cookie dependency
- [Phase ?]: Plano 05-02: imagem MinIO mantida em latest (mesma tag do docker-compose.yml); strategy Recreate obrigatoria com PVC ReadWriteOnce; console 9001 nunca exposto por Ingress (T-05-06)
- [Phase ?]: 05-04: guarda de producao replicada na rota de imagem de produto (mesmo padrao do plano 05-01); cron cleanup-uploads travado por teste sem mudanca de logica (D-05); Task 3 (checkpoint no cluster) documentada como runbook pendente, nao executada pelo agente
- [Phase ?]: 06-01: bulkDeleteFornecedores e addFornecedor exportados de page.tsx para serem testaveis; auditoria create/restore adicionada so na Task 3 (unica mudanca de producao dela)
- [Phase ?]: 06-02: importador CSV de fornecedores dry-run + commit idempotente, com dedupe interno ao arquivo e reconstrucao de 2 commits GREEN apos bundling acidental por execucao paralela na mesma working tree
- [Phase ?]: D-01/D-02/D-03 (PDV-14): piso de custo removido do servidor, regra de subtotal mantida, casos de teste invertidos (nao apagados), liberado para todos os vendedores
- [Phase ?]: 07-03: rota POST /api/fornecedores reusa classificarNomeFornecedor da Fase 6 (criar/reativar/ignorar) implementada de uma vez na Task 1, sem reimplementar normalizacao/comparacao de nome
- [Phase ?]: 07-03: modal CadastrarFornecedorRapidoDialog diferencia toast por reativado/jaExistia do corpo da resposta, nao pelo status HTTP
- [Phase ?]: D-04/D-07: POST /api/clientes criada com modal de cadastro rapido no PDV, cliente ja fica selecionado na venda
- [Phase ?]: D-05: aviso de nome parecido via GET /api/clientes/similar e deliberadamente nao bloqueante

### Roadmap Evolution

- Milestone v1.1 iniciado: ROADMAP.md substituído com Fases 5-9 (Storage MinIO, Integridade de dados, PDV sem fricção, Estoque/identidade visual, Integrações e carga de dados) — v1.0 (Fases 1-4) arquivado como shipped
- Phase 4 added (v1.0): Melhorias de infraestrutura e qualidade do sistema (Asaas, IA, segurança, testes)

### Pending Todos

None yet.

### Blockers/Concerns

- INT-03 (import de clientes da Equilibrium, Fase 9) está bloqueado por um arquivo que o cliente ainda não entregou (layout, regras de duplicata, vínculo com empresa parceira). Não bloqueia as demais fases.
- Fase 7 (PDV-14) reabre o vetor de comissão/margem inflados fechado no commit `a63dc04` ao liberar custo abaixo de `custoPadrao` para todos os vendedores — decisão consciente do André, marcada "⚠️ Revisit" no PROJECT.md
- Verificar se `produto-item-form.tsx` e `parcelas-vencimento-form.tsx` são reutilizáveis ou precisam ser reescritos (herdado do v1.0)
- Fase 5 (Storage MinIO): STO-01/STO-02/STO-05 dependem de checkpoint humano no cluster (SSM secrets, sync ArgoCD, kubectl delete pod) — runbook completo em 05-04-SUMMARY.md '## Acoes humanas pendentes'. Fase so fecha apos passo 6 (sobrevivencia ao delete pod) confirmado.

### Quick Tasks Completed

| # | Description | Date | Commit | Status | Directory |
|---|-------------|------|--------|--------|-----------|
| 1 | all plans | 2026-02-19 | 8679000 | Verified | [1-all-plans](./quick/1-all-plans/) |
| 2 | assinatura condicional em caso de boleto | 2026-03-18 | e053b3a | Verified | [260318-fhz-assinatura-em-caso-de-boleto](./quick/260318-fhz-assinatura-em-caso-de-boleto/) |
| 3 | fix: Asaas header access_token → Authorization (API v3) | 2026-03-18 | 1156dfe | Verified | [260318-frp-fix-asaas-header-de-autentica-o-access-t](./quick/260318-frp-fix-asaas-header-de-autentica-o-access-t/) |
| 4 | fuzzy search (usuarios) + AI FK confirmation flow | 2026-03-20 | d432ccd | Verified | [260320-jjr-continue-fuzzy-search-and-ai-confirmatio](./quick/260320-jjr-continue-fuzzy-search-and-ai-confirmatio/) |
| 5 | add delete product functionality (Trash2 + AlertDialog) | 2026-03-20 | 827815c | Verified | [260320-jtr-adicionar-funcionalidade-de-excluir-prod](./quick/260320-jtr-adicionar-funcionalidade-de-excluir-prod/) |
| 6 | fix AI product registration (all fields) + fuzzy search produtos + no duplicate confirm | 2026-03-20 | ee25eba | Verified | [260320-ki7-fix-ai-product-registration-fuzzy-search](./quick/260320-ki7-fix-ai-product-registration-fuzzy-search/) |
| 7 | dual AI context (contextResumo) + direct write execution (no confirmation modal) | 2026-03-20 | 633adb1 | Verified | [260320-kuo-separar-redis-em-dois-contexto-ia-resumi](./quick/260320-kuo-separar-redis-em-dois-contexto-ia-resumi/) |
| 8 | bulk delete in all cadastros tabs (clientes, produtos, fornecedores, empresas) | 2026-03-20 | 584169b | Verified | [260320-lmt-implementar-bulk-delete-na-area-de-cadas](./quick/260320-lmt-implementar-bulk-delete-na-area-de-cadas/) |
| 9 | live search produtos (debounce/clear/empty state) + marca UPPERCASE + fornecedorId fix + LiteLLM enable_thinking | 2026-03-20 | 637058b | Verified | [260320-lwq-search-produtos-live-debounce-clear-empt](./quick/260320-lwq-search-produtos-live-debounce-clear-empt/) |
| 10 | AI financial fixes: lucroLiquido in criar_venda, comissoes itens, taxaNota in cost, margem date filter | 2026-03-23 | 9104110 | Verified | [260323-dyu-busque-por-mais-poss-veis-falhas-de-l-gi](./quick/260323-dyu-busque-por-mais-poss-veis-falhas-de-l-gi/) |
| 11 | /api/catalogo liberated as public route (shareable PDF catalog link) | 2026-03-23 | 8457e81 | Verified | [260323-fwq-o-link-do-cat-logo-n-o-est-funcionando-r](./quick/260323-fwq-o-link-do-cat-logo-n-o-est-funcionando-r/) |
| 12 | aba Estoque no /financeiro: capital imobilizado, potencial receita, margem, itens zerados + card Capital em Estoque no DRE | 2026-03-23 | 69e5278 | Verified | [260323-hdn-adicionar-aba-estoque-no-financeiro-com-](./quick/260323-hdn-adicionar-aba-estoque-no-financeiro-com-/) |
| 13 | stock decrement on sale create (criarVenda, criarVendaV2, criar_venda IA) + restore on delete + backfill endpoint | 2026-03-23 | cc0379b | Verified | [260323-k3c-quando-eu-fa-ao-uma-venda-de-um-produto-](./quick/260323-k3c-quando-eu-fa-ao-uma-venda-de-um-produto-/) |
| 14 | mostrar custo e margem de lucro nas vendas do historico | 2026-03-23 | cfe9cf1 | — | [260323-kp0-mostrar-custo-e-margem-de-lucro-nas-vend](./quick/260323-kp0-mostrar-custo-e-margem-de-lucro-nas-vend/) |
| 15 | sistema de assinatura de recibo com link para assinatura digital e notificacoes no sistema | 2026-03-24 | 8e79807 | — | [260324-eey-sistema-de-assinatura-de-recibo-com-link](./quick/260324-eey-sistema-de-assinatura-de-recibo-com-link/) |
| 16 | fix: DateInput quebrava form ao clicar na data (type="button" ausente) | 2026-04-01 | 57b2be9 | — | [260401-np7-em-venda-rapida-quando-eu-clico-na-data-](./quick/260401-np7-em-venda-rapida-quando-eu-clico-na-data-/) |
| 17 | Mandar email para a empresa em que o cliente vinculado; relatório de vendas com matrícula/nome/produtos/vendedor/data/valor/parcelas; relatório semanal por empresa com cópia pro admin; ajustar serviço WhatsApp off; ajustar vínculos de empresas parceiras; informar nome similar em novo cliente; fuzzy search em vendas | 2026-04-02 | c035e1c | Verified | [260402-grr-mandar-email-para-a-empresa-em-que-o-cli](./quick/260402-grr-mandar-email-para-a-empresa-em-que-o-cli/) |
| 18 | Se não tiver email configurado enviar notificação via WhatsApp (não impeditivo fallback email→WhatsApp). Fix /venda-rapida clicar na data quebra o sistema. | 2026-04-02 | 0e6582c | Verified | [260402-ix6-se-n-o-tiver-email-configurado-enviar-no](./quick/260402-ix6-se-n-o-tiver-email-configurado-enviar-no/) |
| 19 | Planilha das vendas do mes de marco em excel | 2026-04-13 | 01ad52e | — | [260413-bug-quero-uma-planilha-das-vendas-do-mes-de-](./quick/260413-bug-quero-uma-planilha-das-vendas-do-mes-de-/) |

## Session Continuity

Last session: 2026-08-03T18:36:57.890Z
Stopped at: Completed 07-02-PLAN.md
Resume file: None
