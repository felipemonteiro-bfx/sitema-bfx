# Roadmap: Sistema BFX

## Milestones

- ✅ **v1.0 MVP** — Fases 1-4 (PDV multi-produto, parcelamento, busca de cliente, infra) — shipped 2026-08-03
- ✅ **v1.1 Demandas do Cliente BFX** — Fases 5-9 (storage MinIO, integridade de dados, PDV sem fricção, estoque/tema, integrações) — shipped 2026-08-03, 19/21 requisitos (2 bloqueados em terceiros)
- 🚧 **v1.2 Consistência Visual e UX** — Fases 10-14 (em andamento)

## Overview

Auditoria tela a tela das **24 telas** do sistema, usando o checklist da skill `ui-ux-pro-max`
como critério e o Playwright para validar em produção. A ordem das fases é: primeiro a fundação
(tokens + trava de lint), porque sem ela cada tela corrigida pode regredir na semana seguinte;
depois as telas, agrupadas por densidade de problema e criticidade de uso.

**Não é redesign.** A paleta sugerida pela skill (azul `#1E40AF`) foi descartada — o sistema tem
identidade própria e a paleta oficial da marca segue bloqueada em UXP-06. O que se aproveita é o
checklist de qualidade: contraste, foco, alvos de toque, `aria-label`, consistência.

**O problema medido:** 250 usos de cor Tailwind crua onde deveria haver token semântico. Isso
viola a convenção registrada no CLAUDE.md e, pior, quebra o tema escuro — das 39 cores neutras
cruas, só 13 têm variante `dark:`.

## Phases

- [ ] **Phase 10: Fundação visual** - Tokens cobrem todos os casos, lint impede regressão, acessibilidade de base
- [ ] **Phase 11: Telas de operação** - Venda rápida, histórico, cadastros e importação consistentes
- [ ] **Phase 12: Telas financeiras** - Financeiro, boletos, prudent, relatórios e comissões consistentes
- [ ] **Phase 13: Telas de dados e IA** - Inteligência e CRM consistentes (maior concentração de cor crua)
- [ ] **Phase 14: Telas de sistema e públicas** - Dashboard, configurações, RH, login, catálogo e assinatura

## Phase Details

### Phase 10: Fundação visual
**Goal**: A base impede que a inconsistência volte — tokens cobrem todos os casos de uso, uma regra de lint barra cor crua no CI, e os problemas de acessibilidade de base estão corrigidos.
**Depends on**: Nothing (primeira fase deste milestone)
**Requirements**: UI-01, UI-02, UI-03, UI-04, UI-05, UI-06
**Success Criteria** (o que deve ser VERDADE ao final):
  1. Existe um mapa de-para documentado ligando cada cor crua em uso ao token semântico correspondente (UI-01)
  2. Uma regra de lint falha o build quando alguém introduz `bg-*-500` / `text-*-600` em `src/` (UI-03)
  3. Todo botão apenas-ícone do projeto tem `aria-label` descritivo (UI-04)
  4. Os tokens necessários existem em `globals.css` para os dois temas, sem precisar de cor crua para nenhum estado (UI-01, UI-02)
**Plans**: TBD

### Phase 11: Telas de operação
**Goal**: As telas de uso diário do vendedor — venda rápida, histórico, cadastros, importação — usam só tokens, funcionam nos dois temas e passam no checklist de acessibilidade.
**Depends on**: Fase 10 (o de-para e o lint precisam existir antes de migrar tela)
**Requirements**: OPE-01, OPE-02, OPE-03, OPE-04
**Success Criteria**:
  1. Zero cor crua nos arquivos dessas telas
  2. Cada tela renderiza corretamente em claro e escuro, verificado por screenshot nos dois temas
  3. Estados de erro, foco e carregamento seguem o mesmo padrão visual entre as 4 telas
  4. Nenhuma regressão funcional — o fluxo de venda continua funcionando de ponta a ponta
**Plans**: TBD

### Phase 12: Telas financeiras
**Goal**: Financeiro, boletos, prudent, relatórios e comissões consistentes, com atenção especial à legibilidade de números e à leitura de tabelas densas.
**Depends on**: Fase 11
**Requirements**: FIN-01, FIN-02, FIN-03, FIN-04
**Success Criteria**:
  1. Zero cor crua nos arquivos dessas telas
  2. Valores monetários e percentuais legíveis nos dois temas, com contraste ≥ 4.5:1
  3. Indicadores de positivo/negativo usam token semântico (`success`/`error`), não verde/vermelho cru
  4. As métricas do `/financeiro` continuam com os mesmos números (não-regressão do v1.1)
**Plans**: TBD

### Phase 13: Telas de dados e IA
**Goal**: As telas com maior concentração de inconsistência — `/inteligencia` (100 ocorrências) e `/crm` — passam a usar tokens.
**Depends on**: Fase 12
**Requirements**: DIA-01, DIA-02
**Success Criteria**:
  1. `bfx-intelligence-panel.tsx` sai de 100 ocorrências de cor crua para zero
  2. O chat da IA (bolhas, badges de status, blocos de código, tabelas markdown) legível nos dois temas
  3. As 3 sub-telas do CRM seguem o mesmo padrão visual do restante
  4. Nenhuma regressão no `runAiWithActions` nem na renderização de tabelas markdown
**Plans**: TBD

### Phase 14: Telas de sistema e públicas
**Goal**: Dashboard, configurações, perfil, RH e as telas públicas (login, catálogo, assinatura) fecham a auditoria.
**Depends on**: Fase 13
**Requirements**: SIS-01, SIS-02, SIS-03, SIS-04
**Success Criteria**:
  1. Zero cor crua nos arquivos dessas telas
  2. As telas públicas (sem sessão) mantêm identidade visual coerente com o sistema autenticado
  3. O catálogo público e a página de assinatura renderizam corretamente nos dois temas
  4. A auditoria fecha: `grep` por cor crua em `src/` retorna zero e o lint da Fase 10 passa
**Plans**: TBD
**UI hint**: yes

## Progress

**Execution Order:**
Fases executam em ordem: 10 → 11 → 12 → 13 → 14. A Fase 10 é pré-requisito real das demais —
migrar tela sem o de-para e sem a trava de lint só adia o problema.

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 10. Fundação visual | 0/? | Not started | - |
| 11. Telas de operação | 0/? | Not started | - |
| 12. Telas financeiras | 0/? | Not started | - |
| 13. Telas de dados e IA | 0/? | Not started | - |
| 14. Telas de sistema e públicas | 0/? | Not started | - |
