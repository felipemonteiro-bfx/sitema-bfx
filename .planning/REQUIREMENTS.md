# Requirements: Sistema BFX

**Defined:** 2026-02-19
**Core Value:** O PDV deve ser rápido, completo e sem fricção — uma venda com múltiplos produtos e parcelamento deve poder ser registrada em segundos.

## v1 Requirements

Melhorias no PDV (Venda Rápida) para suporte completo a vendas complexas.

### PDV — Multi-Produto

- [ ] **PDV-01**: Vendedor pode adicionar múltiplos produtos em uma única venda (lista de itens)
- [ ] **PDV-02**: Cada item da lista exibe produto, quantidade e preço unitário
- [ ] **PDV-03**: Vendedor pode remover um item individual da lista sem cancelar a venda
- [ ] **PDV-04**: Total da venda é calculado automaticamente somando todos os itens

### PDV — Desconto por Item

- [ ] **PDV-05**: Vendedor pode aplicar desconto individual (%) em cada item da lista
- [ ] **PDV-06**: Desconto geral da venda continua existindo e é aplicado sobre o subtotal

### PDV — Parcelamento com Datas

- [ ] **PDV-07**: Ao parcelar, o sistema exibe campos de data de vencimento por parcela
- [ ] **PDV-08**: Vendedor pode inserir a data de vencimento de cada parcela manualmente
- [ ] **PDV-09**: Sistema sugere datas automáticas (D+30, D+60...) como ponto de partida editável
- [ ] **PDV-10**: Datas de vencimento são salvas junto à venda no banco de dados

### PDV — Busca Rápida de Cliente

- [ ] **PDV-11**: Vendedor pode buscar cliente por nome ou CPF diretamente no PDV
- [ ] **PDV-12**: Autocomplete exibe lista de sugestões enquanto digita (sem navegar para outra tela)
- [ ] **PDV-13**: Selecionar cliente no autocomplete preenche os dados da venda automaticamente

## v2 Requirements

### Módulo de Compras

- **COMP-01**: Usuário pode registrar compra de fornecedor com produtos e valores
- **COMP-02**: Compra atualiza estoque automaticamente ao ser confirmada
- **COMP-03**: Histórico de compras com filtros por fornecedor e período

### Relatórios Avançados

- **REL-01**: Relatório de vendas por vendedor com totais e comissões
- **REL-02**: Relatório de produtos mais vendidos por período
- **REL-03**: Relatório de margem de lucro por produto/categoria

## Out of Scope

| Feature | Reason |
|---------|--------|
| SaaS multi-tenant | Sistema single-tenant por design — complexidade não justificada agora |
| App mobile nativo | Web responsivo suficiente para o perfil de uso atual |
| Integração fiscal (NF-e) | Alta complexidade regulatória — fora do escopo atual |
| Controle de estoque automático | Depende de módulo de compras (v2) |

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
| PDV-11 | Phase 3 — Busca Rápida de Cliente | Pending |
| PDV-12 | Phase 3 — Busca Rápida de Cliente | Pending |
| PDV-13 | Phase 3 — Busca Rápida de Cliente | Pending |

**Coverage:**
- v1 requirements: 13 total
- Mapped to phases: 13
- Unmapped: 0 ✓

---
*Requirements defined: 2026-02-19*
*Last updated: 2026-02-19 after roadmap creation*
