# Roadmap: Sistema BFX — PDV Melhorias

## Overview

O PDV atual suporta apenas um produto por venda. Este roadmap entrega suporte completo a vendas complexas em três fases sequenciais: primeiro a lista de múltiplos produtos (fundação), depois os controles financeiros sobre essa lista (descontos por item e parcelamento com datas de vencimento), e por último a busca rápida de cliente com autocomplete sem sair da tela.

## Phases

- [ ] **Phase 1: Multi-Produto** - PDV suporta lista de itens com múltiplos produtos por venda
- [ ] **Phase 2: Descontos e Parcelamento** - Desconto individual por item e parcelas com datas de vencimento
- [ ] **Phase 3: Busca Rápida de Cliente** - Autocomplete de cliente diretamente no PDV

## Phase Details

### Phase 1: Multi-Produto
**Goal**: Vendedor pode registrar uma venda com múltiplos produtos em uma única operação
**Depends on**: Nothing (first phase)
**Requirements**: PDV-01, PDV-02, PDV-03, PDV-04
**Success Criteria** (what must be TRUE):
  1. Vendedor pode adicionar mais de um produto na mesma venda sem navegar para outra tela
  2. Cada item na lista exibe produto, quantidade e preço unitário
  3. Vendedor pode remover um item da lista sem perder os demais itens já adicionados
  4. O total da venda atualiza automaticamente ao adicionar, remover ou alterar quantidade de qualquer item
**Plans**: TBD

### Phase 2: Descontos e Parcelamento
**Goal**: Vendedor pode aplicar desconto individual por item e definir datas de vencimento por parcela
**Depends on**: Phase 1
**Requirements**: PDV-05, PDV-06, PDV-07, PDV-08, PDV-09, PDV-10
**Success Criteria** (what must be TRUE):
  1. Vendedor pode inserir um percentual de desconto em cada item da lista individualmente
  2. O desconto geral da venda continua funcionando sobre o subtotal da lista
  3. Ao escolher parcelamento, o sistema exibe um campo de data de vencimento para cada parcela
  4. O sistema preenche automaticamente as datas sugeridas (D+30, D+60...) como ponto de partida editável
  5. As datas de vencimento definidas são salvas corretamente no banco de dados junto à venda
**Plans**: TBD

### Phase 3: Busca Rápida de Cliente
**Goal**: Vendedor pode localizar e vincular um cliente à venda sem sair da tela do PDV
**Depends on**: Phase 2
**Requirements**: PDV-11, PDV-12, PDV-13
**Success Criteria** (what must be TRUE):
  1. Vendedor pode digitar nome ou CPF no campo de cliente e ver sugestões aparecerem enquanto digita
  2. Selecionar uma sugestão preenche automaticamente os dados do cliente na venda
  3. Todo o fluxo de busca e seleção ocorre na tela do PDV sem redirecionamento
**Plans**: TBD

## Progress

**Execution Order:**
Phases execute in order: 1 → 2 → 3

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Multi-Produto | 0/? | Not started | - |
| 2. Descontos e Parcelamento | 0/? | Not started | - |
| 3. Busca Rápida de Cliente | 0/? | Not started | - |
