# Requirements: Sistema BFX

**Defined:** 2026-02-19
**Last milestone update:** 2026-08-03 (v1.1 — Demandas do Cliente BFX)
**Core Value:** O PDV deve ser rapido, completo e sem friccao — uma venda com multiplos produtos e parcelamento deve poder ser registrada em segundos.

## v1.1 Requirements — Demandas do Cliente

Origem: documento "DEMANDAS PARA SISTEMA BFX.docx" (11 demandas + 3 screenshots), analisado
pelo Grok como revisor externo. Ver `.planning/research/GROK-PLAN.md`.

### Storage de Arquivos (STO)

Contexto: o app roda em Kubernetes (`deploy/bfx/`, ArgoCD + Kustomize) sem volume nem PVC.
`src/app/api/upload-logo/route.ts` grava em `public/uploads` no filesystem do pod e guarda o
caminho em `Config.logoPath`. Todo rollout recria o pod e apaga os uploads, deixando caminhos
mortos no banco — e essa e a causa real da demanda 4 ("logo nao carrega").

- [ ] **STO-01**: Uploads sobrevivem a rollout do ArgoCD e a recriacao de pod
- [ ] **STO-02**: MinIO provisionado no cluster (Deployment + PVC + Service) no namespace `bfx`
- [ ] **STO-03**: Upload de logo grava no object storage, nao no filesystem do pod
- [ ] **STO-04**: Em producao, upload sem storage configurado falha com erro explicito em vez de reportar sucesso em disco efemero
- [ ] **STO-05**: Logo aparece no preview de configuracoes, no recibo PDF e no catalogo
- [ ] **STO-06**: Cron `cleanup-uploads` opera sobre o novo storage sem apagar objeto ainda referenciado no banco

### Integridade de Dados (DAT)

Contexto: `model Fornecedor` nao tem soft-delete e `src/app/(app)/cadastros/page.tsx:209` faz
`deleteMany` direto. Todos os fornecedores sumiram em producao (demanda 9). Fator atenuante:
`createAuditLog("fornecedor:delete", { fornecedorId, nome })` registrou os nomes em `audit_logs`,
o que torna a lista reconstruivel.

- [ ] **DAT-01**: Fornecedores apagados sao reconstruidos a partir de `audit_logs` (`acao = 'fornecedor:delete'`)
- [ ] **DAT-02**: Exclusao de fornecedor deixa de ser destrutiva sem rede de protecao (soft-delete ou confirmacao reforcada + RBAC)
- [ ] **DAT-03**: Exportacao rapida exibe um botao por empresa parceira vinda do banco, sem lista hardcoded

### PDV — Fricção Zero (PDV)

Contexto: o campo de custo ja e editavel no UI (`produto-item-form.tsx:274`); o que bloqueia e a
validacao de servidor `validarItensContraCatalogo` (`src/lib/venda-item-validation.ts:47-52`),
que recusa custo menor que `custoPadrao`. Essa e a causa real da demanda 7.

- [ ] **PDV-14**: Vendedor pode lancar qualquer custo na venda rapida, inclusive abaixo do custo de catalogo, e o valor digitado e gravado em `item_venda.custo_produto`
- [ ] **PDV-15**: Vendedor pode cadastrar cliente novo por modal, sem sair da tela do PDV, e o cliente ja fica selecionado na venda
- [ ] **PDV-16**: Vendedor pode cadastrar fornecedor novo no fluxo de produto rapido do PDV, e o fornecedor ja fica selecionado

### Experiência de Uso (UXP)

Contexto: o codigo debita estoque na venda e alimenta a aba Estoque do `/financeiro` (capital
imobilizado). A demanda 1 pede para nao ter controle de estoque, mas remover o decremento
quebraria esses relatorios — dai a leitura literal: suprimir apenas os alertas.
Sobre o "amarelo": `globals.css` define `--background: oklch(0.985 0.01 90)` (quase branco);
nao ha amarelo dominante no codigo, mas os 3 screenshots do cliente sao amarelos. A origem
precisa ser determinada antes de mexer em token.

- [ ] **UXP-01**: Venda rapida nao exibe badge nem alerta de estoque baixo ou sem estoque
- [ ] **UXP-02**: Quantidade na venda nao e limitada pelo estoque disponivel
- [ ] **UXP-03**: Aba Estoque do `/financeiro` continua calculando capital imobilizado e potencial de receita (regressao proibida)
- [ ] **UXP-04**: Origem do "amarelo" relatado pelo cliente e determinada com evidencia (mesmo build, sem filtro de tela) antes de qualquer alteracao de token
- [ ] **UXP-05**: Paleta reflete as cores oficiais da BFX

### Integrações e Carga de Dados (INT)

- [ ] **INT-01**: Cotacao Uber funciona em producao e preenche o frete para endereco valido
- [ ] **INT-02**: Sem credencial Uber, a UI degrada com mensagem clara em vez de falhar em silencio
- [ ] **INT-03**: Import de clientes da Equilibrium roda em dry-run reportando creates/skips/erros, e o commit e idempotente

## Entregue em v1.0

### PDV — Multi-Produto (Phase 1) — entregue

Verificado no codigo em 2026-08-03: `VendaRapidaFormV2` e a pagina ativa do PDV.

- [x] **PDV-01**: Vendedor pode adicionar multiplos produtos em uma unica venda (lista de itens)
- [x] **PDV-02**: Cada item da lista exibe produto, quantidade e preco unitario
- [x] **PDV-03**: Vendedor pode remover um item individual da lista sem cancelar a venda
- [x] **PDV-04**: Total da venda e calculado automaticamente somando todos os itens

### PDV — Parcelamento com Datas (Phase 2) — entregue

- [x] **PDV-07**: Ao parcelar, o sistema exibe campos de data de vencimento por parcela
- [x] **PDV-08**: Vendedor pode inserir a data de vencimento de cada parcela manualmente
- [x] **PDV-09**: Sistema sugere datas automaticas (D+30, D+60...) como ponto de partida editavel
- [x] **PDV-10**: Datas de vencimento sao salvas junto a venda no banco de dados

### PDV — Busca Rapida de Cliente (Phase 3) — entregue

- [x] **PDV-11**: Vendedor pode buscar cliente por nome ou CPF diretamente no PDV
- [x] **PDV-12**: Autocomplete exibe lista de sugestoes enquanto digita (sem navegar para outra tela)
- [x] **PDV-13**: Selecionar cliente no autocomplete preenche os dados da venda automaticamente

### Infraestrutura e Qualidade (Phase 4) — entregue

- [x] **INF-SEC-01**: SESSION_SECRET com fallback "dev-secret" nao funciona em producao (fail-fast com erro claro)
- [x] **INF-SEC-02**: Rotas admin (/api/admin/*) exigem autenticacao antes de executar logica
- [x] **INF-SEC-03**: requireAdmin lanca excecao (requireAdminOrThrow) em vez de retornar boolean ignoravel
- [x] **INF-SEC-04**: recibo-url.ts protegido contra dev-secret em producao
- [x] **INF-ASAAS-01**: Deteccao de cliente duplicado usa campo code do erro Asaas (nao apenas substring na description)
- [x] **INF-ASAAS-02**: Parcelamento envia installmentValue calculado para Asaas v3
- [x] **INF-IA-01**: Env vars obrigatorias validadas com zod no startup (fail-fast se ausentes)
- [x] **INF-IA-02**: .env.example documenta todas as variaveis incluindo LiteLLM
- [x] **INF-TEST-01**: vitest configurado com alias @ e script test no package.json
- [x] **INF-TEST-02**: Testes unitarios cobrem logica critica (asaas config, session secret, recibo url, guards, env validation)

## Backlog

### PDV — Desconto por Item

Remanescente do v1.0. Nao existe no codigo e ficou fora do ciclo v1.1 para nao competir com as
demandas do cliente.

- **PDV-05**: Vendedor pode aplicar desconto individual (%) em cada item da lista
- **PDV-06**: Desconto geral da venda continua existindo e e aplicado sobre o subtotal

### Bugs latentes identificados (nao agendados)

- **BUG-01**: `src/app/(app)/venda-rapida/actions.ts:301` debita estoque com `updateMany({ where: { nome } })`, atingindo todos os produtos homonimos. Com unique em `(nome, fornecedor_id)`, o mesmo nome pode repetir entre fornecedores.
- **BUG-02**: Drift entre a tag de imagem fixa em `deploy/bfx/app.yaml` e `newTag` em `deploy/bfx/kustomization.yaml` — risco de correcao existir no branch e nao chegar em producao.

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
| Storage em Amazon S3 | Decisao do André em 2026-08-03: MinIO no cluster, por paridade com dev e sem dependencia de conta AWS |
| Criar corrida Uber end-to-end (delivery, tracking, conciliacao) | Neste ciclo so a cotacao; o codigo de quote ja existe em `src/lib/uber.ts` |
| Soft-delete em todos os cadastros | Neste ciclo apenas fornecedores — o cadastro que sofreu perda real |
| Remover o decremento de estoque | Quebraria capital imobilizado e potencial de receita no `/financeiro`; a demanda e atendida suprimindo os alertas |
| Re-hospedar midia historica ja perdida | Arquivos gravados no filesystem efemero antes do fix nao sao recuperaveis |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| STO-01 | TBD | Pending |
| STO-02 | TBD | Pending |
| STO-03 | TBD | Pending |
| STO-04 | TBD | Pending |
| STO-05 | TBD | Pending |
| STO-06 | TBD | Pending |
| DAT-01 | TBD | Pending |
| DAT-02 | TBD | Pending |
| DAT-03 | TBD | Pending |
| PDV-14 | TBD | Pending |
| PDV-15 | TBD | Pending |
| PDV-16 | TBD | Pending |
| UXP-01 | TBD | Pending |
| UXP-02 | TBD | Pending |
| UXP-03 | TBD | Pending |
| UXP-04 | TBD | Pending |
| UXP-05 | TBD | Pending |
| INT-01 | TBD | Pending |
| INT-02 | TBD | Pending |
| INT-03 | TBD | Pending |

**Coverage:**
- v1.1 requirements: 20 total
- Mapped to phases: 0 (preenchido na criacao do roadmap)
- Unmapped: 20

---
*Requirements defined: 2026-02-19*
*Last updated: 2026-08-03 after starting milestone v1.1*
