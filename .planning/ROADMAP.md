# Roadmap: Sistema BFX — PDV Melhorias

## Overview

O PDV atual suporta apenas um produto por venda. Este roadmap entrega suporte completo a vendas complexas em tres fases sequenciais: primeiro a lista de multiplos produtos (fundacao), depois os controles financeiros sobre essa lista (descontos por item e parcelamento com datas de vencimento), e por ultimo a busca rapida de cliente com autocomplete sem sair da tela.

## Phases

- [ ] **Phase 1: Multi-Produto** - PDV suporta lista de itens com multiplos produtos por venda
- [ ] **Phase 2: Descontos e Parcelamento** - Desconto individual por item e parcelas com datas de vencimento
- [ ] **Phase 3: Busca Rapida de Cliente** - Autocomplete de cliente diretamente no PDV

## Phase Details

### Phase 1: Multi-Produto
**Goal**: Vendedor pode registrar uma venda com multiplos produtos em uma unica operacao
**Depends on**: Nothing (first phase)
**Requirements**: PDV-01, PDV-02, PDV-03, PDV-04
**Success Criteria** (what must be TRUE):
  1. Vendedor pode adicionar mais de um produto na mesma venda sem navegar para outra tela
  2. Cada item na lista exibe produto, quantidade e preco unitario
  3. Vendedor pode remover um item da lista sem perder os demais itens ja adicionados
  4. O total da venda atualiza automaticamente ao adicionar, remover ou alterar quantidade de qualquer item
**Plans**: 1 plan

Plans:
- [ ] 1-PLAN.md — Ativar VendaRapidaFormV2 na pagina do PDV, corrigir tipos e substituir alerts por toasts

### Phase 2: Descontos e Parcelamento
**Goal**: Vendedor pode aplicar desconto individual por item e definir datas de vencimento por parcela
**Depends on**: Phase 1
**Requirements**: PDV-05, PDV-06, PDV-07, PDV-08, PDV-09, PDV-10
**Success Criteria** (what must be TRUE):
  1. Vendedor pode inserir um percentual de desconto em cada item da lista individualmente
  2. O desconto geral da venda continua funcionando sobre o subtotal da lista
  3. Ao escolher parcelamento, o sistema exibe um campo de data de vencimento para cada parcela
  4. O sistema preenche automaticamente as datas sugeridas (D+30, D+60...) como ponto de partida editavel
  5. As datas de vencimento definidas sao salvas corretamente no banco de dados junto a venda
**Plans**: TBD

### Phase 3: Busca Rapida de Cliente
**Goal**: Vendedor pode localizar e vincular um cliente a venda sem sair da tela do PDV
**Depends on**: Phase 2
**Requirements**: PDV-11, PDV-12, PDV-13
**Success Criteria** (what must be TRUE):
  1. Vendedor pode digitar nome ou CPF no campo de cliente e ver sugestoes aparecerem enquanto digita
  2. Selecionar uma sugestao preenche automaticamente os dados do cliente na venda
  3. Todo o fluxo de busca e selecao ocorre na tela do PDV sem redirecionamento
**Plans**: TBD

### Phase 4: Melhorias de infraestrutura e qualidade do sistema
**Goal:** Fechar vulnerabilidades de seguranca, corrigir bugs na integracao Asaas, validar env vars em producao, e estabelecer base de testes automatizados
**Requirements**: INF-SEC-01, INF-SEC-02, INF-SEC-03, INF-SEC-04, INF-ASAAS-01, INF-ASAAS-02, INF-IA-01, INF-IA-02, INF-TEST-01, INF-TEST-02
**Depends on:** Independent (can run in parallel with Phase 1-3)
**Plans:** 2/4 plans executed

Plans:
- [ ] 04-01-PLAN.md — Seguranca: SESSION_SECRET fail-fast, admin auth, requireAdminOrThrow
- [ ] 04-02-PLAN.md — Asaas: error handling robusto para duplicatas, installmentValue no parcelamento
- [ ] 04-03-PLAN.md — IA/Producao: validacao zod de env vars, .env.example atualizado
- [ ] 04-04-PLAN.md — Testes: vitest setup, testes unitarios para logica critica

## Progress

**Execution Order:**
Phases execute in order: 1 -> 2 -> 3 (Phase 4 independent, can run anytime)

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Multi-Produto | 0/1 | In progress | - |
| 2. Descontos e Parcelamento | 0/? | Not started | - |
| 3. Busca Rapida de Cliente | 0/? | Not started | - |
| 4. Infra e Qualidade | 2/4 | In Progress|  |
