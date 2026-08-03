# Análise de Plano — Grok (revisor externo)

**Data:** 2026-08-03
**Papel:** Grok atuou como "cérebro" — análise e crítica do plano em modo read-only (não alterou nenhum arquivo do repositório; verificado com `git status`). Claude Opus implementa.
**Entrada:** documento "DEMANDAS PARA SISTEMA BFX.docx" (11 demandas + 3 screenshots) + briefing com o reconhecimento de código e o contexto de deploy em Kubernetes.

> Decisões do André tomadas DEPOIS desta análise divergem dela em dois pontos: storage será **MinIO no cluster** (o Grok recomendou S3) e o custo abaixo do catálogo será **liberado para todos** (o Grok recomendou liberar só para admin). O ROADMAP.md reflete as decisões do André, não estas recomendações.

---


---

## 1. Crítica ao pedido cru

O documento do cliente mistura **sintoma**, **feature** e **dado operacional** sem critérios de aceite. Vários itens descrevem o que a tela “parece”, não a causa.

| Demanda | Problema de especificação |
|--------|---------------------------|
| **1 – Estoque** | “Não precisa ter controle de estoque” vs “não precisa informar estoque baixo”. São coisas diferentes. O código **debita estoque na venda** (`venda-rapida/actions.ts:299-304`), mostra badge “Sem estoque” / `estoqueDisponivel <= 5` (`produto-item-form.tsx:176-188`, `324-328`) e tem aba Estoque no financeiro (`financeiro/page.tsx:103+`). Remover o controle quebra capital imobilizado e potencial de receita. |
| **2 – Clientes Equilibrium** | Bloqueada por dados externos (“André, aguardar”). Sem arquivo, layout, regras de duplicata, vínculo empresa. |
| **3 – Uber** | Já existe cotação no PDV (`lib/uber.ts`, `api/frete/uber/*`, UI em `venda-rapida-form-v2.tsx:168+`). Só quote — **não cria entrega**. Cliente não diz se quer cotação, pedido de corrida, reconciliação de custo ou histórico. Provável gap: **secrets `UBER_*` em produção** (`env.ts:42-45`), não falta de código. |
| **4 – Logo** | Sintoma (“não carrega”). Causa real: upload em disco efêmero do pod (`api/upload-logo/route.ts:17-23`) + zero volume no Deployment (`deploy/bfx/app.yaml`). Afeta também imagens de produto; recibos assinados já têm cópia em `Documento.conteudo` (BYTEA). |
| **5/6 – Cores** | “Cores da BFX” sem palette/hex. “Trocar amarelo por branco” pode ser (a) tokens com matiz quente em `globals.css:72,104` (`oklch(... 0.01 90)` = branco amarelado), (b) Night Shift/f.lux nos prints, (c) imagem de prod desatualizada. **Não se resolve “pintando no escuro”.** |
| **7 – Custo editável** | O campo **já é editável** no UI (`produto-item-form.tsx:273-276` + `CurrencyInput`). O que trava de verdade é **validação de servidor** de 2026-07 (`a63dc04`): `validarItensContraCatalogo` **rejeita custo &lt; custoPadrao** (`venda-item-validation.ts:47-52`, `actions.ts:170-180`). Cliente descreveu “não edita”; o sistema permite editar **para cima**, bloqueia **para baixo**, e não mostra feedback claro no campo. Ambiguidade: override só na linha da venda vs alterar o cadastro do produto. |
| **8 – Cliente no PDV** | Autocomplete de cliente **já existe** (Fase 3 do GSD, de fato entregue). Falta só **criar** cliente sem sair. Escopo de campos (CPF, empresa, limite, endereço para Uber) não definido. |
| **9 – Fornecedores sumiram** | Sintoma de **dados**, não de UI. Modelo sem soft-delete (`schema.prisma:212-218`). Bulk delete hard + audit (`cadastros/page.tsx:205-213`). FK `ON DELETE SET NULL` (`20260205113315...sql`) — produtos ficam órfãos de fornecedor, não apagam. |
| **10 – Fornecedor na venda rápida** | Hoje o modal rápido de produto só **seleciona** fornecedor existente (`cadastrar-produto-rapido-dialog.tsx:44,98`). “Cadastrar SE não tiver” é feature nova; risco de nomes duplicados (`nome` unique). |
| **11 – Exportação rápida** | Único item trivial e bem especificado: `extraEmpresas` hardcoded (`relatorios/page.tsx:24,65`). |

**GSD desatualizado (crítico para não retrabalhar):**  
Fases 1–3 marcadas “não iniciadas” em `.planning/ROADMAP.md`, mas no código:

- Multi-produto: `VendaRapidaFormV2` já é a página (`venda-rapida/page.tsx:7,99`)
- Parcelas com datas: `ParcelasVencimentoForm` + gravação em `criarVendaV2`
- Busca de cliente: autocomplete em `venda-rapida-form-v2.tsx:229+`
- **PDV-05 (desconto % por item): NÃO existe** — só desconto geral da venda
- Fase 4 (infra/testes): feita; vitest + testes em `src/__tests__/`

`k8s/` é legado (README fala em Vercel). Produção real: `deploy/bfx/` + ArgoCD/Kustomize.

---

## 2. Triagem

| # | Demanda | Natureza | Severidade | Esforço | Pré-requisito de / para |
|---|---------|----------|------------|---------|-------------------------|
| 4 | Logo quebrado (e uploads) | **INFRA** (+ BUG-DADOS residual) | **P0** | M (1–3d) | Pré de qualquer upload confiável; afeta marca/recibos com logo |
| 9 | Fornecedores sumidos | **BUG-DADOS** | **P0** | P–M (horas + reconciliação) | Pré de 10 se lista vazia |
| 11 | Exportação rápida todas empresas | **BUG** | **P1** | **XS** (≤2h) | Nenhum |
| 7 | Custo na venda rápida | **BUG**/regra de negócio mal comunicada | **P1** | P (0,5–1d) | Nenhum; alinha com comissão/margem |
| 8 | Cadastrar cliente no PDV | **FEATURE** | **P1** | M (1–2d) | Vizinha Fase 3; endereço importa para Uber |
| 10 | Cadastrar fornecedor no PDV | **FEATURE** | **P2** | P–M | Ideal após 9 |
| 1 | Estoque | **UX**/produto | **P2** | P se só alertas; G se remover controle | Decisão de produto |
| 5/6 | Tema / amarelo | **UX** | **P2** | P após desambiguar | Protocolo de cor primeiro |
| 3 | Uber entregas | **FEATURE**/ops | **P2** | M se só env; G se delivery full | Credenciais; cliente com endereço |
| 2 | Clientes Equilibrium | **BLOQUEADA** | **P2** | M–G | Arquivo + regras de André |
| — | Storage unificado | **INFRA** | **P0** (arquitetura) | M | Cobre 4 + imagens produto |

**Legenda esforço:** XS &lt; meio dia · P 0,5–1d · M 1–3d · G 3d+

---

## 3. Decisão de arquitetura de storage (K8s)

### Recomendação: **Amazon S3 em `sa-east-1`** (mesmo region do ECR)

Não rodar MinIO no cluster “só porque o compose tem”. Não guardar binários grandes em Postgres (exceto o que já está seguro em `Documento`).

| Opção | Prós | Contras | Veredito |
|-------|------|---------|----------|
| **S3 `sa-east-1`** | Durável, barato, multi-réplica ok, sem PVC, backup nativo, já há `@aws-sdk/client-s3` em `lib/minio.ts` | Precisa bucket + IAM (IRSA ideal) + migração de paths | **Escolher** |
| MinIO no cluster + PVC | Parecido com dev | Ops (backup, updates, disco), single-AZ se mal feito, mais superfície | Só se policy proibir S3 |
| PVC no pod app | Patch rápido do logo | `replicas: 1` hoje; quebra com scale-out; rollout ainda precisa ReadWriteMany ou sticky | **Não** como solução final |
| BYTEA no Postgres | Já usado em recibos assinados | Infla DB, backups pesados, ruim para imagens públicas | Manter só para **prova de assinatura** |

### O que fazer

1. **Bucket** `bfx-uploads` (ou similar) em `sa-east-1`, versionamento ligado, lifecycle opcional.
2. **Secrets/IRSA:** `MINIO_ENDPOINT` / keys **ou** evoluir `lib/minio.ts` para S3 “nativo” (region `sa-east-1`, sem `forcePathStyle` se for AWS puro). Hoje o client assume path-style MinIO (`minio.ts:27`).
3. **Unificar writers:**
   - `api/upload-logo/route.ts` → S3 (hoje **só** disco)
   - `api/produtos/upload/route.ts` → já tenta MinIO; fallback disco deve **falhar alto em produção** se storage não configurado
4. **Leitores de logo:** `recibo-pdf.ts`, `api/recibo/route.ts`, catálogo — hoje leem `public/` via `readFile`. Passar a URL pública ou stream do S3.
5. **`Config.logoPath`:** preferir URL absoluta `https://...` ou path estável no bucket; não `/uploads/...` no FS do pod.
6. **Cron `cleanup-uploads`:** hoje varre FS local (`api/cron/cleanup-uploads`). Com S3, reescrever para listar objetos órfãos **ou** desligar até a nova lógica existir (senão é no-op enganoso).
7. **Dados já perdidos:** logo e imagens de produto em FS **não recuperáveis** após rollout. Ação: re-upload da logo; imagens de produto sob demanda. **Recibos assinados:** se `Documento` foi gravado, OK. Fornecedores: **reconstruir via `AuditLog`** (`fornecedor:delete` com `nome`).
8. **replicas &gt; 1:** S3 elimina split-brain de arquivo; não usar emptyDir “compartilhado”.

### Default se secrets MinIO já existirem no cluster

Se `bfx-app-secrets` já tiver `MINIO_*` apontando para algo: validar conectividade primeiro. Se apontar para nada / dev: tratar como não configurado e provisionar S3.

---

## 4. Perguntas que PRECISAM de resposta (máx. 6)

| # | Pergunta | Default se ninguém responder |
|---|----------|------------------------------|
| 1 | **Custo na venda:** vendedor pode informar custo **abaixo** do `custoPadrao` (ex.: liquidação / erro de cadastro)? Ou só ≥ catálogo (anti-fraude de comissão)? | Manter piso ≥ `custoPadrao`; UX: campo editável com mensagem clara + botão “atualizar custo do cadastro” (admin). Liberar custo livre **só com role admin**. |
| 2 | **Estoque:** remover controle, feature-flag, ou só esconder alertas/badges de baixo estoque? | **Só suprimir alertas/UI de “estoque baixo / sem estoque”** e limite de qty; manter decremento e aba Financeiro (reversível). |
| 3 | **Uber:** só cotação no PDV (já no código) ou criar entrega + guardar custo no lançamento? | Ativar **cotação** com secrets + endereço pickup; delivery full fica backlog. |
| 4 | **Palette BFX:** hex oficiais (primary, fundo, accent)? | Fundo/card **neutros** `oklch(0.99 0 0)` / branco; primary slate atual; accent verde. Mudança só após print do **mesmo build** sem filtro de tela. |
| 5 | **Cliente no PDV:** campos mínimos do modal? | Nome + telefone + empresa parceira (+ CPF se boleto). Endereço opcional mas recomendado se Uber. |
| 6 | **Equilibrium:** formato do arquivo e regra de duplicata (CPF / matrícula / nome+empresa)? | Aguardar arquivo; se pressionar, import CSV idempotente por CPF; sem CPF, nome+empresa; dry-run antes de commit. |

---

## 5. Roadmap proposto (formato GSD)

**Substituir** o foco “Fases 1–3 PDV multi-produto” (já entregues em grande parte) por este milestone orientado a **integridade de dados + fricção do vendedor**.  
**Fundir residual GSD:** PDV-05 (desconto por item) → backlog v1.1, **não** neste ciclo de demandas do cliente.  
**Marcar no STATE:** Phase 1 multi-produto, Phase 2 parcelas (parcial), Phase 3 busca cliente = **done no código**; atualizar checkboxes de REQUIREMENTS.

Ordenação: (risco de perda + valor no balcão) / esforço.

---

### Fase A — Storage durável + logo vivo  
**Objetivo:** binários sobrevivem a rollout ArgoCD.  
**Demandas:** 4 (+ base para imagens/produtos).  
**Sucesso verificável:**
1. `upload-logo` grava no object storage; `Config.logoPath` resolve HTTP 200 após `kubectl delete pod` / novo deploy.
2. Em produção, se storage não configurado, upload retorna erro explícito (não “sucesso” em disco efêmero).
3. PDF de recibo e preview de config exibem a logo sem alt quebrado “Logo atual”.
4. Cron de cleanup não apaga objetos ainda referenciados no banco.

**Deps:** bucket + credenciais/IRSA.  
**Fora:** re-host de todas as imagens históricas perdidas; MinIO no cluster.

---

### Fase B — Dados: fornecedores + exportação  
**Objetivo:** catálogo operacional e relatórios honestos.  
**Demandas:** 9, 11.  
**Sucesso verificável:**
1. Query em `audit_logs` com `acao = 'fornecedor:delete'` lista nomes apagados; script/admin recria sem violar unique `nome`.
2. Cadastros → Fornecedores deixa de mostrar só “Nenhum fornecedor encontrado” **se** a reconstrução foi aplicada (contagem ≥ lista auditada, ou justificativa documentada).
3. Exportação Rápida (PDF) renderiza **um botão por empresa parceira do banco** (não só AMAZON FIVE / Gimam); zero hardcode `extraEmpresas` em `relatorios/page.tsx`.
4. Produtos com `fornecedor_id` null pós-delete documentados; opcional re-link manual.

**Deps:** acesso prod ao Postgres / audit.  
**Fora:** soft-delete completo em todos os cadastros (pode ser follow-up).

---

### Fase C — PDV fricção zero (custo, cliente, fornecedor)  
**Objetivo:** venda rápida sem sair da tela e sem “custo fantasma”.  
**Demandas:** 7, 8, 10.  
**Sucesso verificável:**
1. Alterar custo na linha e submeter: se ≥ piso (default) grava `item_venda.custo_produto` = valor digitado; se &lt; piso, toast com a mensagem de `validarItensContraCatalogo` **antes** de parecer sucesso.
2. Modal “Novo cliente” no PDV cria registro e seleciona no autocomplete sem navegar a Cadastros.
3. No cadastro rápido de produto, “+ fornecedor” cria fornecedor e preenche o select.
4. Testes vitest cobrem regra de custo (já existe base em `venda-item-validation.test.ts`) + casos do modal.

**Deps:** Fase B ajuda 10; 8 independente.  
**Fora:** desconto % por item (PDV-05); multi-tenant; bulk import Equilibrium.

---

### Fase D — Produto/UX leve (estoque + tema)  
**Objetivo:** alinhar UI ao pedido sem destruir finanças.  
**Demandas:** 1, 5, 6.  
**Sucesso verificável:**
1. Venda rápida **não** exibe badge/alerta de estoque baixo/sem estoque (se default §4.2); qty sem cap por estoque.
2. Aba Estoque do financeiro ainda calcula se controle mantido.
3. Protocolo de cor executado (screenshot CI ou staging sem Night Shift); se tokens quentes forem a causa, `--background`/`--card` com chroma 0; print do cliente deixa de bater com “amarelo forte” no mesmo build.
4. Nenhuma mudança de primary “no escuro” sem palette.

**Deps:** nenhuma dura.  
**Fora:** redesign completo da marca; dark mode overhaul.

---

### Fase E — Integrações e carga de dados  
**Objetivo:** Uber útil e base Equilibrium.  
**Demandas:** 3, 2.  
**Sucesso verificável:**
1. Com `UBER_*` no secret, status API `enabled: true`; cotação no PDV preenche frete com valor &gt; 0 para endereço válido.
2. Sem credencial, UI degrada com mensagem clara (já parcial).
3. Import Equilibrium: dry-run reporta N creates / M skips / erros; commit idempotente; amostra validada pelo negócio.

**Deps:** secrets Uber; arquivo Equilibrium.  
**Fora:** criar delivery Uber end-to-end, tracking, conciliação contábil automática (salvo pedido explícito depois).

---

### Mapeamento GSD antigo → novo

| Antigo | Destino |
|--------|---------|
| Phase 1 Multi-produto | **Arquivar como done** (código) |
| Phase 2 Parcelas | **Done**; desconto por item → backlog |
| Phase 3 Busca cliente | **Done**; estende com Fase C (criar cliente) |
| Phase 4 Infra | **Done**; Fase A é o gap real de storage que a 4 não cobriu |

---

## 6. Riscos e armadilhas (adversário do plano)

1. **“Consertar logo com PVC”** e achar resolvido: próximo `replicas: 2` ou node drain sem RWO compartilhado = split brain / 404 intermitente.
2. **Só migrar logo e deixar produto no FS:** mesmo bug, outra tela.
3. **S3 com `forcePathStyle: true` e endpoint errado:** upload “ok” em código, URL pública 403; Next/Image e recibo quebram.
4. **Remover validação de custo sem decisão de comissão:** vendedor baixa custo → lucro/comissão inflados (`venda-item-validation.ts` existe por isso).
5. **Reinserir fornecedores do audit sem dedupe:** unique em `nome` estoura; produtos continuam com `fornecedor_id` null.
6. **Bulk delete sem confirmação reforçada / RBAC:** feature de 2026-03-20 (`260320-lmt-...`) pode apagar de novo; considerar soft-delete + `requireAdmin`.
7. **Export “todas empresas”** sem filtro fornecedor: hoje o código **exclui** nomes que batem com fornecedores (`relatorios/page.tsx:26-28`) — manter regra ou cliente verá botões estranhos.
8. **nuqs + `produtos` na URL** (`venda-rapida-form-v2.tsx:112-115`): JSON grande, race em mobile; pode **parecer** que custo “volta” se `setFormState` atrasar. Validar se o sintoma do 7 é também isso.
9. **Estoque:** `updateMany({ where: { nome } })` debita **todos** com o mesmo nome (`actions.ts:301-303`) — bug latente multi-fornecedor; “remover estoque” mascara, não corrige.
10. **K8s:** `app.yaml` image tag hardcoded vs `kustomization.yaml` `newTag` (CONCERNS.md) — risco de “corrigimos no branch e prod não puxou”; amarelo/logo “já consertado” no git e prod velho.
11. **Secrets no repo** (`deploy/bfx/secrets.yaml` placeholders/reais — CONCERNS): não misturar rotação de secret com deploy de storage sem checklist.
12. **Cron cleanup** com storage novo: se ainda apontar pro FS vazio, silêncio; se listar S3 com bug de refs, apaga logo “não referenciada” por path antigo.
13. **Equilibrium import** sem dry-run: lixo em `clientes`, limite de crédito e desconto em folha errados.
14. **Uber:** só quote; cliente espera “automação de custo” e a frete digitável manual continua — alinhar expectativa.

---

## 7. Estratégia de teste (vitest)

| Fase | O que prova |
|------|-------------|
| **A** | Unit: helper de upload monta key/URL; se `!isObjectStorageConfigured()` em `NODE_ENV=production`, upload-logo retorna 503 (mock fs **não** chamado). Integração opcional com LocalStack/S3 mock. Manual: deploy staging → upload → delete pod → GET logo 200. |
| **B** | Unit: builder de `empresaOptions` a partir de lista mock **sem** hardcode. Script/teste de parse de `detalhes` do audit `fornecedor:delete`. Manual: count fornecedores pré/pós restore. |
| **C** | Já há `venda-item-validation.test.ts` — estender: custo = padrao OK; custo &gt; OK; custo &lt; erro; mensagem estável. Component/integration leve dos handlers de create cliente/fornecedor (mock prisma). |
| **D** | Snapshot/token: background chroma 0 (ou teste de CSS vars se fizer sentido). Teste de flag `SHOW_STOCK_WARNINGS=false` esconde ramos (extrair pure function do threshold). |
| **E** | Mock Uber quote 200 → fee; 401 → erro amigável. Import: fixture CSV → contagens create/skip. |

CI: `npm test` (vitest) no PR; smoke K8s só staging.

---

## 8. VEREDITO

**Amanhã de manhã:** (1) **provisionar S3 + ligar upload de logo/produtos** — cada deploy continua queimando mídia e a logo é o sintoma mais visível; (2) **em paralelo, XS da exportação rápida** (remove hardcode, valor imediato pro RH/relatórios); (3) **consultar `audit_logs` de `fornecedor:delete`** e montar lista de restore antes de qualquer feature de cadastro rápido de fornecedor. Só depois mexer em custo (regra de comissão) e modais do PDV. **Não** gastar o dia “trocando amarelo” nem reimplementando multi-produto/busca de cliente — isso já está no código; o GSD que manda recomeçar as fases 1–3 está errado.
