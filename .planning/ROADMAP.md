# Roadmap: Sistema BFX

## Milestones

- ✅ **v1.0 MVP** — Fases 1-4 (PDV multi-produto, parcelamento com datas, busca rápida de cliente, infraestrutura e qualidade) — shipped 2026-08-03 (verificado no código, arquivado em `.planning/milestones/v1.0-phases/`)
- 🚧 **v1.1 Demandas do Cliente BFX** — Fases 5-9 (em andamento)

## Overview

O milestone v1.1 resolve as 11 demandas levantadas pelo cliente no documento "DEMANDAS PARA
SISTEMA BFX", analisadas pelo Grok como revisor externo (`.planning/research/GROK-PLAN.md`) e
decididas por André. A ordem das 5 fases segue (risco de perda de dados + valor pro vendedor) /
esforço: o storage está sangrando mídia a cada rollout do ArgoCD (Fase 5, primeiro); perda de
dados de fornecedores e um hardcode na exportação vêm em seguida (Fase 6); depois a fricção do
vendedor no PDV (Fase 7); depois cosméticos de estoque e identidade visual (Fase 8); por último
integrações e cargas de dados externas, que têm menor risco imediato e uma dependência bloqueada
por um arquivo que o cliente ainda deve (Fase 9).

Duas decisões do André divergem da recomendação do Grok e estão fixadas no PROJECT.md: (1)
storage é **MinIO dentro do cluster** (Deployment + PVC + Service no namespace `bfx`), não Amazon
S3; (2) o piso de custo abaixo do `custoPadrao` é liberado **para todos os vendedores**, não só
para admin — o que reabre o vetor de comissão/margem inflados fechado no commit `a63dc04` (ver
nota na Fase 7).

## Phases

- [ ] **Phase 5: Storage durável (MinIO no cluster)** - Uploads (logo, imagens de produto) sobrevivem a rollout do ArgoCD via MinIO no cluster
- [ ] **Phase 6: Integridade de dados: fornecedores e exportação** - Fornecedores apagados são recuperados, exclusão deixa de ser destrutiva, exportação reflete o banco
- [ ] **Phase 7: PDV sem fricção** - Custo editável sem bloqueio, cadastro de cliente e fornecedor sem sair da tela do PDV
- [ ] **Phase 8: Estoque e identidade visual** - Venda rápida sem alertas de estoque, paleta alinhada à marca BFX
- [ ] **Phase 9: Integrações e carga de dados** - Cotação Uber ativa em produção, import de clientes da Equilibrium idempotente

## Phase Details

### Phase 5: Storage durável (MinIO no cluster)

**Goal**: Uploads (logo e imagens de produto) sobrevivem ao ciclo de vida dos pods no Kubernetes — persistidos em MinIO dentro do cluster, não mais no filesystem efêmero do pod.
**Depends on**: Nothing (primeira fase deste milestone)
**Requirements**: STO-01, STO-02, STO-03, STO-04, STO-05, STO-06
**Success Criteria** (o que deve ser VERDADE ao final):

  1. MinIO está provisionado no cluster (Deployment + PVC + Service) no namespace `bfx`, com volume persistente para os objetos (STO-02)
  2. Upload de logo e de imagens de produto grava no MinIO (object storage), não mais em `public/uploads` no filesystem do pod (STO-01, STO-03)
  3. Depois de um `kubectl delete pod` ou de um rollout do ArgoCD, o logo e as imagens de produto continuam acessíveis, sem link quebrado (STO-01)
  4. Em produção, se o storage não estiver configurado, o upload falha com um erro explícito em vez de reportar sucesso sobre disco efêmero (STO-04)
  5. O logo aparece corretamente no preview de configurações, no recibo em PDF e no catálogo; o cron `cleanup-uploads` roda sobre o MinIO e nunca apaga um objeto ainda referenciado no banco (STO-05, STO-06)

**Plans**: 4/4 plans executed

Plans:

- [x] 05-01-PLAN.md — Fatia vertical: upload da logo no MinIO (prefixo `logo/`, URL absoluta) e leitura de volta, com recusa explícita em produção sem storage (STO-03, STO-04)
- [x] 05-02-PLAN.md — MinIO no cluster como código: Deployment + PVC retido + Service, ExternalSecret apontando pro SSM e rota pública de leitura no Ingress (STO-01, STO-02)
- [x] 05-03-PLAN.md — Leitores da logo: os 4 geradores de PDF e os 3 pontos de renderização no navegador passam a tratar URL absoluta e caminho legado (STO-05)
- [x] 05-04-PLAN.md — Guarda de produção na imagem de produto, trava de regressão do cron `cleanup-uploads` e verificação no cluster (STO-04, STO-06, STO-01)

### Phase 6: Integridade de dados: fornecedores e exportação

**Goal**: Fornecedores apagados em produção são reconstruídos a partir da trilha de auditoria, a exclusão deixa de ser uma operação destrutiva sem rede de proteção, e a exportação rápida reflete as empresas parceiras reais do banco.
**Depends on**: Fase 5 (ordem de execução definida por risco de dados; sem acoplamento técnico com o storage)
**Requirements**: DAT-01, DAT-02, DAT-03
**Success Criteria** (o que deve ser VERDADE ao final):

  1. Os fornecedores apagados em produção (identificados via `audit_logs`, `acao = 'fornecedor:delete'`) foram reconstruídos no cadastro, sem violar o unique de `nome` (DAT-01)
  2. Excluir um fornecedor deixa de ser destrutivo sem rede de proteção — soft-delete e/ou confirmação reforçada + RBAC substituem o hard delete atual (DAT-02)
  3. Um fornecedor excluído por engano pode ser restaurado sem acesso direto ao banco de dados (DAT-02)
  4. A tela de Exportação Rápida (Relatórios) exibe um botão por empresa parceira vinda do banco, sem lista hardcoded (`extraEmpresas`) no código (DAT-03)

**Plans**: TBD

### Phase 7: PDV sem fricção

**Goal**: Vendedor completa uma venda do início ao fim sem sair da tela do PDV — custo editável sem bloqueio de servidor, cliente e fornecedor cadastráveis inline.
**Depends on**: Fase 6 (fornecedores consistentes reduzem o risco de duplicidade no cadastro rápido; sem acoplamento técnico obrigatório)
**Requirements**: PDV-14, PDV-15, PDV-16
**Success Criteria** (o que deve ser VERDADE ao final):

  1. Vendedor pode lançar qualquer custo no item da venda rápida, inclusive abaixo do custo de catálogo, sem o servidor rejeitar a venda (PDV-14)
  2. O valor de custo digitado pelo vendedor é gravado em `item_venda.custo_produto` exatamente como informado, sem piso de `custoPadrao` (PDV-14)
  3. Vendedor pode cadastrar um cliente novo por modal sem sair da tela do PDV, e o cliente recém-criado já fica selecionado na venda (PDV-15)
  4. Vendedor pode cadastrar um fornecedor novo dentro do fluxo de cadastro rápido de produto do PDV, e o fornecedor recém-criado já fica selecionado (PDV-16)

**Nota de risco**: PDV-14 remove o piso de servidor que hoje rejeita custo abaixo de `custoPadrao` — para todos os vendedores, não só admins. Essa validação foi introduzida no commit `a63dc04` justamente para fechar um vetor de comissão/margem inflados (vendedor baixa o custo lançado para inflar a margem/comissão calculada sobre a venda). Esta é uma decisão consciente do André (fricção do vendedor pesa mais que o risco); o Key Decisions do PROJECT.md marca o item como "⚠️ Revisit". Nenhuma mitigação adicional (auditoria de alterações de custo, alerta, etc.) está no escopo desta fase a menos que solicitada.

**Plans**: TBD

### Phase 8: Estoque e identidade visual

**Goal**: Venda rápida deixa de exibir alertas de estoque baixo/sem estoque e limite de quantidade por estoque disponível, mantendo o decremento e a aba Estoque do `/financeiro` intactos; a paleta de cores do sistema reflete as cores oficiais da BFX.
**Depends on**: Fase 7
**Requirements**: UXP-01, UXP-02, UXP-03, UXP-04, UXP-05
**Success Criteria** (o que deve ser VERDADE ao final):

  1. A venda rápida não exibe badge nem alerta de estoque baixo ou sem estoque para nenhum produto (UXP-01)
  2. A quantidade lançada na venda não é mais limitada pelo estoque disponível (UXP-02)
  3. A aba Estoque do `/financeiro` continua calculando capital imobilizado e potencial de receita exatamente como antes — nenhuma regressão nos relatórios financeiros (UXP-03)
  4. A origem do "amarelo" relatado pelo cliente foi determinada com evidência (mesmo build, print sem filtro de tela/Night Shift) antes de qualquer mudança de token de cor (UXP-04)
  5. A paleta de cores do sistema reflete as cores oficiais da BFX, aplicada via tokens semânticos do `globals.css` — sem cor hardcoded (UXP-05)

**Plans**: TBD
**UI hint**: yes

### Phase 9: Integrações e carga de dados

**Goal**: A cotação de frete Uber funciona em produção com degradação clara sem credencial, e o import de clientes da Equilibrium é seguro (dry-run) e idempotente.
**Depends on**: Fase 8
**Requirements**: INT-01, INT-02, INT-03
**Success Criteria** (o que deve ser VERDADE ao final):

  1. Com as credenciais Uber configuradas em produção, a cotação de frete preenche o valor do frete para um endereço válido (INT-01)
  2. Sem credencial Uber configurada, a UI degrada com uma mensagem clara em vez de falhar em silêncio ou travar o formulário (INT-02)
  3. O import de clientes da Equilibrium roda em modo dry-run, reportando quantos registros seriam criados, quantos seriam ignorados (skips) e quais deram erro, antes de qualquer escrita no banco (INT-03)
  4. Rodar o commit do import da Equilibrium duas vezes com o mesmo arquivo não duplica clientes — o commit é idempotente (INT-03)

**Bloqueio conhecido**: INT-03 (import Equilibrium) depende de um arquivo que o cliente ainda não entregou (layout, regras de duplicata, vínculo com empresa parceira). Este item fica pendente até a entrega do arquivo e **não deve bloquear** o encerramento das Fases 5-8 nem a entrega de INT-01/INT-02, que são independentes e podem ser concluídas e verificadas sem o arquivo da Equilibrium.

**Plans**: TBD

## Progress

**Execution Order:**
Fases executam em ordem: 5 → 6 → 7 → 8 → 9 (Fase 9 tem um item interno — INT-03 — bloqueado por dado externo; INT-01/INT-02 não são afetados)

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Multi-Produto | — | Complete (v1.0, verificado no código) | 2026-08-03 |
| 2. Descontos e Parcelamento | — | Complete (parcelas; desconto por item movido ao Backlog como PDV-05/06) | 2026-08-03 |
| 3. Busca Rápida de Cliente | — | Complete (v1.0, verificado no código) | 2026-08-03 |
| 4. Infra e Qualidade | 4/4 | Complete | 2026-03-30 |
| 5. Storage durável (MinIO no cluster) | 4/4 | In Progress|  |
| 6. Integridade de dados: fornecedores e exportação | 0/? | Not started | - |
| 7. PDV sem fricção | 0/? | Not started | - |
| 8. Estoque e identidade visual | 0/? | Not started | - |
| 9. Integrações e carga de dados | 0/? | Not started | - |
