# Milestones

## v1.1 v1.1 (Shipped: 2026-08-03)

**Phases completed:** 5 phases, 16 plans, 43 tasks

**Key accomplishments:**

- Reescrita de `POST /api/upload-logo` para gravar no MinIO sob o prefixo `logo/`, persistir URL absoluta em `Config.logoPath`, recusar upload explicitamente em producao sem storage configurado (503, sem tocar disco), e um `logo-loader.ts` que le tanto a URL nova quanto o caminho legado `/uploads/...`.
- Deployment + PVC + Service for MinIO in namespace `bfx`, ExternalSecret wired to AWS SSM, and an Ingress path `/produtos` exposing only the S3 API port — no cluster commands executed.
- Um unico helper `embedLogoNoPdf` (em `logo-loader.ts`) substitui a leitura manual de arquivo local nos quatro geradores de PDF, e um unico helper `logoSrcParaBrowser` (em `storage-policy.ts`) corrige o bug de `src` invalido e centraliza a resolucao de URL absoluta vs. caminho legado nos tres componentes que renderizam a logo no navegador.
- A rota de upload de imagem de produto ganha a mesma guarda de producao da rota de logo (503 antes de disco), o cron `cleanup-uploads` ganha um teste de regressao que trava a decisao D-05 (nunca remove asset no MinIO), e a verificacao real no cluster (SSM, ArgoCD, `kubectl delete pod`) fica documentada como runbook para o André — nenhum comando de cluster foi executado por este agente.
- Fatia vertical: `Fornecedor.deletedAt` no schema + migration manual, `bulkDeleteFornecedores` com `requireAdminOrThrow()` e exclusao logica via `updateMany`, e `src/lib/fornecedor-import.ts` (modulo puro) que reativa por nome em vez de estourar o `@unique`, com `fornecedor:create`/`fornecedor:restore` auditados.
- Importador CSV de fornecedores em duas etapas (dry-run + commit) escrito à mão em módulo puro, idempotente por nome normalizado, reativando soft-deletados em vez de estourar o `@unique`, com dedupe interno ao arquivo e teto de 5000 linhas.
- As quatro leituras de fornecedor esquecidas (PDV, listagem/busca/criação via IA) passam a respeitar o soft-delete de 06-01, e a Exportação Rápida de `/relatorios` monta seus botões a partir das empresas parceiras do banco via um novo módulo puro `empresa-options.ts`, em vez de uma lista de nomes fixa no código.
- `validarItensContraCatalogo` perde a comparacao contra `custoPadrao` do catalogo — so a checagem de subtotal permanece — nos dois chamadores (PDV e chat da IA), com suite existente invertida e trava de regressao nova documentando a decisao de negocio D-03.
- `POST /api/clientes` criada do zero com sessao obrigatoria, modulo puro `cliente-rapido.ts` para validacao/normalizacao, modal `CadastrarClienteRapidoDialog` com nome + telefone + empresa parceira + CPF opcional, aviso nao bloqueante de nome parecido, e o cliente criado ja selecionado na venda (PDV-15, D-04, D-05, D-07).
- `POST /api/fornecedores` novo (sessão obrigatória, reativação de soft-deletado reusando `classificarNomeFornecedor` da Fase 6, conflito de nome único traduzido para 409 legível) mais `CadastrarFornecedorRapidoDialog` renderizado dentro do cadastro rápido de produto, deixando o fornecedor criado já selecionado.
- `aplicarTetoQuantidade` (modulo puro, zero imports) substitui o recorte de quantidade embutido no componente, e `produto-item-form.tsx` perde badges/rotulos de estoque, mantendo os dois decrementos de estoque em `actions.ts` intocados.
- Extraiu o calculo de capital imobilizado, potencial de receita, margem e itens zerados de `financeiro/page.tsx` para `src/lib/estoque-metrics.ts` (zero imports, generico em T) e travou os quatro numeros com suite de nao-regressao de 9 casos com valores dourados literais.
- Croma zerado nos quatro tokens de fundo do tema claro (`oklch(... 0.01 90)` -> `oklch(... 0 0)`), travado por um gate de CI que parseia `globals.css` sem depender de build/browser, mais a evidencia de producao que fechou UXP-04 versionada em artefato, e a paleta oficial da BFX registrada como pendencia bloqueada (UXP-06/D-02).
- `getDeliveryQuote()` para de devolver `null` em todo caminho de erro; passa a devolver um resultado discriminado com 4 motivos distintos, cada um com mensagem pt-BR propria exibida no PDV, sem nunca bloquear a venda.
- Importador CSV de clientes em duas etapas (dry-run + commit) reaproveitando o padrão da Fase 6, com idempotência por CPF (fallback para nome), vínculo obrigatório à empresa parceira e reserva de nomes que impede o commit de esbarrar no `@unique` global de `Cliente.nome`.

---
