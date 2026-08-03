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

**Goal**: O cadastro de fornecedores volta a ser populável e deixa de ser destrutível sem rede de proteção, e a exportação rápida reflete as empresas parceiras reais do banco.
**Depends on**: Fase 5 (ordem de execução definida por risco de dados; sem acoplamento técnico com o storage)
**Requirements**: DAT-01, DAT-02, DAT-03

**Premissa corrigida em 2026-08-03** (consulta somente-leitura ao banco de produção): não há nada
a restaurar. `fornecedores` = 0, mas `audit_logs` com `acao='fornecedor:delete'` = **0 também** —
nunca houve nenhuma ação de fornecedor registrada; os 197 produtos têm `fornecedor_id` NULL; não
existe banco legado nem backup no pod. Os fornecedores nunca existiram neste banco (ficaram no
sistema legado Streamlit). DAT-01 deixa de ser "restaurar via audit log" e passa a ser "entregar
o importador", decidido com o André.

**Success Criteria** (o que deve ser VERDADE ao final):

  1. Existe um importador de fornecedores por CSV com dry-run (reporta criados/ignorados/erros antes de escrever) e commit idempotente por nome — a carga dos dados reais depende do arquivo que o cliente ainda deve (DAT-01)
  2. Excluir um fornecedor deixa de ser destrutivo sem rede de proteção — soft-delete e/ou confirmação reforçada + RBAC substituem o hard delete atual (DAT-02)
  3. Um fornecedor excluído por engano pode ser restaurado sem acesso direto ao banco de dados (DAT-02)
  4. A tela de Exportação Rápida (Relatórios) exibe um botão por empresa parceira vinda do banco, sem lista hardcoded (`extraEmpresas`) no código (DAT-03)

**Plans**: 3/3 plans executed

Plans:

- [x] 06-01-PLAN.md — Fatia vertical: soft-delete de fornecedor com `requireAdminOrThrow()` no bulk delete, migration SQL escrita à mão e reativação por nome normalizado (DAT-02)
- [x] 06-02-PLAN.md — Importador CSV em `/importacao/fornecedores`: dry-run que só reporta e commit idempotente por nome, com reativação de soft-deletados (DAT-01)
- [x] 06-03-PLAN.md — Leituras remanescentes de fornecedor (PDV, IA, busca fuzzy) filtram excluídos, e a Exportação Rápida sai do hardcode via módulo puro `empresa-options` (DAT-02, DAT-03)

**Onda de execução**: 06-01 (wave 1) → 06-02 e 06-03 em paralelo (wave 2). O plano 06-03 termina com
checkpoint humano bloqueante: os 4 critérios só viram verdade em produção depois do rollout, porque
a coluna `deleted_at` é criada pelo `prisma migrate deploy` que o container roda no start
(`Dockerfile:51`) — o executor não aplica migration nem toca no cluster.

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

**Plans**: 3/3 plans executed

Plans:

- [x] 07-01-PLAN.md — Custo livre no PDV: sai só a regra de piso de `custoPadrao` do módulo puro, os dois chamadores (venda rápida e IA) acompanham, e uma trava de regressão documenta a decisão (PDV-14)
- [x] 07-02-PLAN.md — `POST /api/clientes` (rota nova) + modal de cadastro rápido no PDV com aviso não bloqueante de nome parecido, deixando o cliente já selecionado (PDV-15)
- [x] 07-03-PLAN.md — `POST /api/fornecedores` (rota nova) reusando a reativação de soft-delete da Fase 6 + modal dentro do cadastro rápido de produto, deixando o fornecedor já selecionado (PDV-16)

**Onda de execução**: os 3 planos são wave 1 — não há dependência entre eles nem sobreposição de arquivos, então executam em paralelo. Nenhum plano cria migration: a fase inteira não muda schema. Os critérios interativos (3 e 4) só viram verdade depois do rollout da imagem; ficam como `<human-check>` nos planos 07-02/07-03, não como checkpoint bloqueante — não há `node_modules` na máquina de execução para subir a aplicação.

### Phase 8: Estoque e identidade visual

**Goal**: Venda rápida deixa de exibir alertas de estoque baixo/sem estoque e limite de quantidade por estoque disponível, mantendo o decremento e a aba Estoque do `/financeiro` intactos; o fundo do tema claro deixa de ter tom creme (croma zero nos tokens de fundo).
**Depends on**: Fase 7
**Requirements**: UXP-01, UXP-02, UXP-03, UXP-04, UXP-05
**Success Criteria** (o que deve ser VERDADE ao final):

  1. A venda rápida não exibe badge nem alerta de estoque baixo ou sem estoque para nenhum produto (UXP-01)
  2. A quantidade lançada na venda não é mais limitada pelo estoque disponível (UXP-02)
  3. A aba Estoque do `/financeiro` continua calculando capital imobilizado e potencial de receita exatamente como antes — nenhuma regressão nos relatórios financeiros (UXP-03)
  4. A origem do "amarelo" relatado pelo cliente está determinada com evidência versionada em `08-EVIDENCE-UXP-04.md` — mesmo build (`88268e9`), CSS servido define `#fdfaf3`/`#fffdf8`, amarelo forte dos prints é filtro de tela do cliente (UXP-04 — **resolvido no discuss, antes de qualquer mudança de token**)
  5. Os tokens de fundo/superfície do tema claro (`--background`, `--card`, `--popover`, `--glass-bg`) têm croma 0 em `globals.css`, travado por gate de CI — sem cor hardcoded (UXP-05, na leitura decidida em D-01)

**Nota de escopo (D-02)**: a paleta completa da marca BFX (demanda 5 — primary/accent oficiais) está **fora desta fase e bloqueada** por falta dos hex oficiais, que o cliente não forneceu. Fica registrada como UXP-06 no `REQUIREMENTS.md`. O que a Fase 8 entrega de cor é a leitura literal da demanda 6: fundo neutro.

**Plans**: 3 plans
Plans:
- [ ] 08-01-PLAN.md — Venda rápida sem alertas de estoque nem teto de quantidade (UXP-01, UXP-02)
- [ ] 08-02-PLAN.md — Trava de não-regressão das métricas da aba Estoque (UXP-03)
- [ ] 08-03-PLAN.md — Tokens de fundo com croma zero + evidência de UXP-04 (UXP-04, UXP-05)

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
| 5. Storage durável (MinIO no cluster) | 4/4 | Código completo — CI verde (PR #36). Aguarda ação humana no cluster (SSM + ArgoCD) para STO-01/02/05 | - |
| 6. Integridade de dados: fornecedores e exportação | 3/3 | In Progress|  |
| 7. PDV sem fricção | 3/3 | In Progress|  |
| 8. Estoque e identidade visual | 0/? | Not started | - |
| 9. Integrações e carga de dados | 0/? | Not started | - |
