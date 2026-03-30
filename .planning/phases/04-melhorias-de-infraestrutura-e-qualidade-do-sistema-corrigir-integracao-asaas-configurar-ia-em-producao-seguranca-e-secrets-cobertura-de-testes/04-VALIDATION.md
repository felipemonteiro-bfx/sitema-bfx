---
phase: 4
slug: melhorias-de-infraestrutura-e-qualidade-do-sistema-corrigir-integracao-asaas-configurar-ia-em-producao-seguranca-e-secrets-cobertura-de-testes
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-30
---

# Phase 4 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest (if available as transitive dep) / manual scripts |
| **Config file** | none — Wave 0 installs if needed |
| **Quick run command** | `npx vitest run --reporter=verbose 2>/dev/null` |
| **Full suite command** | `npx vitest run 2>/dev/null` |
| **Estimated runtime** | ~10 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run --reporter=verbose 2>/dev/null`
- **After every plan wave:** Run `npx vitest run 2>/dev/null`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 4-01-01 | 01 (Asaas) | 1 | Asaas CPF dup error | unit | `npx vitest run src/__tests__/asaas` | ❌ W0 | ⬜ pending |
| 4-01-02 | 01 (Asaas) | 1 | Asaas parcelamento | unit | `npx vitest run src/__tests__/asaas` | ❌ W0 | ⬜ pending |
| 4-02-01 | 02 (IA prod) | 1 | Env validation startup | unit | `npx vitest run src/__tests__/env` | ❌ W0 | ⬜ pending |
| 4-03-01 | 03 (Segurança) | 1 | SESSION_SECRET required | unit | `npx vitest run src/__tests__/session` | ❌ W0 | ⬜ pending |
| 4-03-02 | 03 (Segurança) | 1 | Admin routes auth | unit | `npx vitest run src/__tests__/admin` | ❌ W0 | ⬜ pending |
| 4-04-01 | 04 (Testes) | 2 | Test coverage baseline | unit | `npx vitest run --coverage` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/__tests__/asaas.test.ts` — stubs para CPF duplicado e parcelamento
- [ ] `src/__tests__/env.test.ts` — validação de env vars obrigatórias
- [ ] `src/__tests__/session.test.ts` — SESSION_SECRET sem fallback inseguro
- [ ] `src/__tests__/admin.test.ts` — rotas admin requerem autenticação
- [ ] `vitest.config.ts` — configuração básica se não existir

*Se vitest não disponível como transitive dep: instalar com sudo ou usar scripts manuais.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Asaas webhook em produção | Asaas integration | Requer sandbox Asaas | Testar via painel Asaas sandbox |
| IA em produção com LiteLLM | IA config | Requer chave de API real | Testar no ambiente de staging |
| SESSION_SECRET em produção | Segurança | Requer deploy real | Verificar variável em env de produção |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
