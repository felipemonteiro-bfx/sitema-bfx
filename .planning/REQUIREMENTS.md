# Requirements: Sistema BFX

**Defined:** 2026-02-19
**Core Value:** O PDV deve ser rapido, completo e sem friccao — uma venda com multiplos produtos e parcelamento deve poder ser registrada em segundos.

## v1 Requirements

Melhorias no PDV (Venda Rapida) para suporte completo a vendas complexas.

### PDV — Multi-Produto

- [ ] **PDV-01**: Vendedor pode adicionar multiplos produtos em uma unica venda (lista de itens)
- [ ] **PDV-02**: Cada item da lista exibe produto, quantidade e preco unitario
- [ ] **PDV-03**: Vendedor pode remover um item individual da lista sem cancelar a venda
- [ ] **PDV-04**: Total da venda e calculado automaticamente somando todos os itens

### PDV — Desconto por Item

- [ ] **PDV-05**: Vendedor pode aplicar desconto individual (%) em cada item da lista
- [ ] **PDV-06**: Desconto geral da venda continua existindo e e aplicado sobre o subtotal

### PDV — Parcelamento com Datas

- [ ] **PDV-07**: Ao parcelar, o sistema exibe campos de data de vencimento por parcela
- [ ] **PDV-08**: Vendedor pode inserir a data de vencimento de cada parcela manualmente
- [ ] **PDV-09**: Sistema sugere datas automaticas (D+30, D+60...) como ponto de partida editavel
- [ ] **PDV-10**: Datas de vencimento sao salvas junto a venda no banco de dados

### PDV — Busca Rapida de Cliente

- [ ] **PDV-11**: Vendedor pode buscar cliente por nome ou CPF diretamente no PDV
- [ ] **PDV-12**: Autocomplete exibe lista de sugestoes enquanto digita (sem navegar para outra tela)
- [ ] **PDV-13**: Selecionar cliente no autocomplete preenche os dados da venda automaticamente

## Infraestrutura e Qualidade (Phase 4)

### Seguranca e Secrets

- [x] **INF-SEC-01**: SESSION_SECRET com fallback "dev-secret" nao funciona em producao (fail-fast com erro claro)
- [x] **INF-SEC-02**: Rotas admin (/api/admin/*) exigem autenticacao antes de executar logica
- [x] **INF-SEC-03**: requireAdmin lanca excecao (requireAdminOrThrow) em vez de retornar boolean ignoravel
- [x] **INF-SEC-04**: recibo-url.ts protegido contra dev-secret em producao

### Integracao Asaas

- [x] **INF-ASAAS-01**: Deteccao de cliente duplicado usa campo code do erro Asaas (nao apenas substring na description)
- [x] **INF-ASAAS-02**: Parcelamento envia installmentValue calculado para Asaas v3

### IA em Producao

- [x] **INF-IA-01**: Env vars obrigatorias validadas com zod no startup (fail-fast se ausentes)
- [x] **INF-IA-02**: .env.example documenta todas as variaveis incluindo LiteLLM

### Cobertura de Testes

- [x] **INF-TEST-01**: vitest configurado com alias @ e script test no package.json
- [x] **INF-TEST-02**: Testes unitarios cobrem logica critica (asaas config, session secret, recibo url, guards, env validation)

## v2 Requirements

### Modulo de Compras

- **COMP-01**: Usuario pode registrar compra de fornecedor com produtos e valores
- **COMP-02**: Compra atualiza estoque automaticamente ao ser confirmada
- **COMP-03**: Historico de compras com filtros por fornecedor e periodo

### Relatorios Avancados

- **REL-01**: Relatorio de vendas por vendedor com totais e comissoes
- **REL-02**: Relatorio de produtos mais vendidos por periodo
- **REL-03**: Relatorio de margem de lucro por produto/categoria

## Out of Scope

| Feature | Reason |
|---------|--------|
| SaaS multi-tenant | Sistema single-tenant por design — complexidade nao justificada agora |
| App mobile nativo | Web responsivo suficiente para o perfil de uso atual |
| Integracao fiscal (NF-e) | Alta complexidade regulatoria — fora do escopo atual |
| Controle de estoque automatico | Depende de modulo de compras (v2) |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| PDV-01 | Phase 1 — Multi-Produto | Pending |
| PDV-02 | Phase 1 — Multi-Produto | Pending |
| PDV-03 | Phase 1 — Multi-Produto | Pending |
| PDV-04 | Phase 1 — Multi-Produto | Pending |
| PDV-05 | Phase 2 — Descontos e Parcelamento | Pending |
| PDV-06 | Phase 2 — Descontos e Parcelamento | Pending |
| PDV-07 | Phase 2 — Descontos e Parcelamento | Pending |
| PDV-08 | Phase 2 — Descontos e Parcelamento | Pending |
| PDV-09 | Phase 2 — Descontos e Parcelamento | Pending |
| PDV-10 | Phase 2 — Descontos e Parcelamento | Pending |
| PDV-11 | Phase 3 — Busca Rapida de Cliente | Pending |
| PDV-12 | Phase 3 — Busca Rapida de Cliente | Pending |
| PDV-13 | Phase 3 — Busca Rapida de Cliente | Pending |
| INF-SEC-01 | Phase 4 — Infra e Qualidade | Complete |
| INF-SEC-02 | Phase 4 — Infra e Qualidade | Complete |
| INF-SEC-03 | Phase 4 — Infra e Qualidade | Complete |
| INF-SEC-04 | Phase 4 — Infra e Qualidade | Complete |
| INF-ASAAS-01 | Phase 4 — Infra e Qualidade | Complete |
| INF-ASAAS-02 | Phase 4 — Infra e Qualidade | Complete |
| INF-IA-01 | Phase 4 — Infra e Qualidade | Complete |
| INF-IA-02 | Phase 4 — Infra e Qualidade | Complete |
| INF-TEST-01 | Phase 4 — Infra e Qualidade | Complete |
| INF-TEST-02 | Phase 4 — Infra e Qualidade | Complete |

**Coverage:**
- v1 requirements: 13 total
- Mapped to phases: 13
- Unmapped: 0
- Phase 4 infra requirements: 10 total
- Mapped to plans: 10
- Unmapped: 0

---
*Requirements defined: 2026-02-19*
*Last updated: 2026-03-30 after Phase 4 planning*
