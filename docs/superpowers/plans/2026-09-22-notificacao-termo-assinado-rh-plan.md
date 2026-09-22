# Notificação do termo assinado ao RH Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enviar o PDF do termo assinado ao e-mail principal do RH somente após a assinatura e permitir reenvio manual pelo histórico.

**Architecture:** Centralizar o envio em um serviço que recebe `vendaId`, carrega o documento assinado e envia exclusivamente para `EmpresaParceira.emailRh`. Persistir o resultado na venda, disparar a primeira tentativa após a assinatura ser salva e reutilizar o mesmo serviço na action de reenvio manual.

**Tech Stack:** Next.js 16 App Router, TypeScript, Prisma/PostgreSQL, SMTP nativo, `pdf-lib`, Vitest, React 18.

**Spec:** `docs/superpowers/specs/2026-09-22-notificacao-termo-assinado-rh-design.md`

## Global Constraints

- Enviar somente para `EmpresaParceira.emailRh`; não usar `emailsExtras` nem WhatsApp.
- O envio automático ocorre somente depois de `Documento` e `Assinatura.assinaturaStatus = "assinado"` serem persistidos.
- Falha de SMTP não invalida a assinatura nem impede a resposta de sucesso ao cliente.
- Reenvio manual reutiliza o PDF salvo em `documentos`; não gera outro PDF.
- Preservar as alterações locais existentes em `src/app/(app)/historico/actions.ts`, `src/app/(app)/venda-rapida/actions.ts` e `src/lib/parcelas.ts`.

---

### Task 1: Persistir o estado do envio do termo

**Files:**
- Modify: `prisma/schema.prisma` — modelo `Venda`.
- Create: `prisma/migrations/20260922120000_add_termo_email_status/migration.sql`.
- Test: `src/__tests__/termo-email-status.test.ts` (ou teste de schema existente, se o projeto já tiver cobertura equivalente).

**Interfaces:**
- Produces fields Prisma `Venda.termoEmailStatus`, `Venda.termoEmailEnviadoEm` e `Venda.termoEmailErro` para as tasks seguintes.

- [ ] **Step 1: Escrever o teste/checagem de contrato do modelo**

  Verificar que o modelo gerado expõe os três campos e que os valores usados pelo serviço são `pendente`, `enviado`, `falhou`, `sem_email` e `erro_dados`. Se não houver infraestrutura de teste de schema, registrar o contrato em um teste puro de constantes do serviço e validar a migration com Prisma na etapa de verificação.

- [ ] **Step 2: Rodar a checagem para confirmar a ausência dos campos**

  Run: `npx prisma validate`

  Expected: o teste/checagem falha antes da alteração porque os campos ainda não existem no modelo.

- [ ] **Step 3: Adicionar os campos ao modelo `Venda`**

  Usar os nomes Prisma:

  ```prisma
  termoEmailStatus      String?   @map("termo_email_status")
  termoEmailEnviadoEm   DateTime? @map("termo_email_enviado_em")
  termoEmailErro        String?   @map("termo_email_erro")
  ```

  Manter todos os campos opcionais para não quebrar vendas históricas.

- [ ] **Step 4: Criar a migration SQL**

  A migration deve adicionar as três colunas nullable em `vendas`, sem alterar ou apagar dados existentes:

  ```sql
  ALTER TABLE "vendas"
    ADD COLUMN "termo_email_status" TEXT,
    ADD COLUMN "termo_email_enviado_em" TIMESTAMP(3),
    ADD COLUMN "termo_email_erro" TEXT;
  ```

- [ ] **Step 5: Gerar o Prisma Client e validar**

  Run: `npx prisma generate && npx prisma validate`

  Expected: PASS, com os campos disponíveis em `Venda`.

- [ ] **Step 6: Commitar**

  ```bash
  git add prisma/schema.prisma prisma/migrations/20260922120000_add_termo_email_status/migration.sql src/__tests__/termo-email-status.test.ts
  git commit -m "feat: persistir status do envio do termo"
  ```

### Task 2: Criar o serviço de envio do PDF assinado

**Files:**
- Modify: `src/lib/email.ts` — tipos e serviço de notificação assinada.
- Modify: `src/lib/documento-service.ts` — reutilizar ou expor consulta do documento assinado, se necessário.
- Test: `src/__tests__/termo-assinado-email.test.ts`.
- Test: `src/__tests__/email-mime.test.ts` — manter/expandir a cobertura do anexo se necessário.

**Interfaces:**
- Produces `enviarTermoAssinadoAoRh(vendaId: number): Promise<{ status: "enviado" | "falhou" | "sem_email" | "erro_dados"; error?: string }>`.
- Consumes `sendEmail`, `EmailAttachment`, `obterDocumentoPorVendaETipo` e os modelos Prisma de venda/empresa.

- [ ] **Step 1: Escrever testes falhando para o contrato do serviço**

  Cobrir estes casos com Prisma e SMTP mockados:

  ```ts
  it("envia somente para emailRh e anexa o documento assinado", async () => {
    // venda vinculada por empresaParceiraId, documento PDF e emailRh definidos
    // expect(sendEmail).toHaveBeenCalledWith(expect.objectContaining({
    //   to: "rh@empresa.test",
    //   attachments: [{ filename: `termo-assinado-${vendaId}.pdf`, contentType: "application/pdf", content: pdf }],
    // }))
  });

  it("não usa emailsExtras nem WhatsApp", async () => {
    // to deve ser apenas empresa.emailRh
  });

  it("marca sem_email quando emailRh não existe", async () => { /* ... */ });

  it("marca falhou e preserva a assinatura quando SMTP lança erro", async () => { /* ... */ });

  it("marca erro_dados quando o documento assinado não existe", async () => { /* ... */ });
  ```

  O teste deve verificar que o `update` salva o status, limpa `termoEmailErro` em sucesso e sanitiza o texto do erro em falha.

- [ ] **Step 2: Rodar os testes para confirmar a falha**

  Run: `npx vitest run src/__tests__/termo-assinado-email.test.ts`

  Expected: FAIL porque `enviarTermoAssinadoAoRh` ainda não existe.

- [ ] **Step 3: Implementar a função de envio**

  A função deve:

  1. Carregar venda com `cliente`, `itens` e empresa parceira por FK; manter fallback por nome apenas para dados legados.
  2. Retornar `erro_dados` se não houver venda/cliente/empresa/documento assinado.
  3. Retornar `sem_email` e atualizar a venda quando `emailRh` estiver vazio.
  4. Montar o HTML escapado com os dados atuais da venda.
  5. Chamar `sendEmail({ to: empresa.emailRh, subject, html, attachments })` com um único anexo PDF.
  6. Em sucesso, atualizar `termoEmailStatus: "enviado"`, `termoEmailEnviadoEm: new Date()` e `termoEmailErro: null`.
  7. Em erro de transporte, atualizar `termoEmailStatus: "falhou"` e `termoEmailErro` com uma mensagem limitada/sanitizada; não lançar o erro para o chamador automático.

- [ ] **Step 4: Rodar os testes do serviço e MIME**

  Run: `npx vitest run src/__tests__/termo-assinado-email.test.ts src/__tests__/email-mime.test.ts`

  Expected: PASS, incluindo `multipart/mixed`, nome do anexo e conteúdo PDF em base64.

- [ ] **Step 5: Commitar**

  ```bash
  git add src/lib/email.ts src/lib/documento-service.ts src/__tests__/termo-assinado-email.test.ts src/__tests__/email-mime.test.ts
  git commit -m "feat: enviar termo assinado ao email do RH"
  ```

### Task 3: Disparar o envio após a assinatura

**Files:**
- Modify: `src/app/api/assinatura/route.ts` — POST de assinatura.
- Modify: `src/app/(app)/venda-rapida/actions.ts` — remover notificações antecipadas da criação/edição.
- Test: `src/__tests__/assinatura-termo-email.test.ts`.
- Modify: testes existentes que mockam `sendVendaNotification`, caso deixem de refletir o fluxo.

**Interfaces:**
- Consumes `enviarTermoAssinadoAoRh(vendaId)` da Task 2.
- Produces uma assinatura concluída que dispara exatamente uma tentativa automática depois da persistência.

- [ ] **Step 1: Escrever teste falhando para a ordem do fluxo**

  Mockar Prisma, geração de PDF e `enviarTermoAssinadoAoRh`. Verificar que o serviço só é chamado depois de `documento.create` e `assinatura.upsert`, e que uma rejeição do envio não altera a resposta de assinatura:

  ```ts
  it("assina e tenta notificar sem falhar quando o email falha", async () => {
    // await POST(request)
    // expect(response.status).toBe(200)
    // expect(enviarTermoAssinadoAoRh).toHaveBeenCalledWith(vendaId)
  });
  ```

- [ ] **Step 2: Rodar o teste para confirmar a falha**

  Run: `npx vitest run src/__tests__/assinatura-termo-email.test.ts`

  Expected: FAIL porque a rota ainda não chama o novo serviço.

- [ ] **Step 3: Integrar o serviço na rota**

  Após o `prisma.assinatura.upsert`, chamar o serviço em bloco protegido (`try/catch` ou `void` com tratamento explícito) e manter a resposta `200` da assinatura mesmo com status `falhou`, `sem_email` ou `erro_dados`.

- [ ] **Step 4: Remover os disparos antecipados**

  Excluir os blocos `sendVendaNotification` executados em `criarVenda`/`criarVendaV2` e qualquer disparo equivalente na edição. Não remover a action manual até a Task 4; ela será redirecionada para o novo serviço.

- [ ] **Step 5: Rodar os testes de assinatura e regressão**

  Run: `npx vitest run src/__tests__/assinatura-termo-email.test.ts src/__tests__/historico-venda-guarda-consignado.test.ts src/__tests__/historico-edicao-parcela-unica.test.ts`

  Expected: PASS; nenhum teste de edição deve voltar a disparar e-mail automático.

- [ ] **Step 6: Commitar**

  ```bash
  git add src/app/api/assinatura/route.ts src/app/(app)/venda-rapida/actions.ts src/__tests__/assinatura-termo-email.test.ts src/__tests__
  git commit -m "feat: notificar RH após assinatura do termo"
  ```

### Task 4: Implementar reenvio manual no histórico

**Files:**
- Modify: `src/app/(app)/historico/actions.ts` — action `enviarEmailEmpresa`.
- Modify: `src/app/(app)/historico/page.tsx` — selects, status e renderização do botão.
- Modify: `src/components/enviar-email-empresa-button.tsx` — texto, estado e erro específicos do termo.
- Test: `src/__tests__/historico-termo-assinado-email.test.ts`.

**Interfaces:**
- Consumes `enviarTermoAssinadoAoRh(vendaId)` da Task 2.
- Produces action `{ success: boolean; error?: string }` e botão disponível somente para venda assinada.

- [ ] **Step 1: Escrever testes falhando para a action e visibilidade**

  Verificar que:

  - venda não assinada retorna erro sem chamar o serviço;
  - venda assinada chama `enviarTermoAssinadoAoRh`;
  - `enviado` retorna sucesso;
  - `falhou`, `sem_email` e `erro_dados` retornam mensagens úteis;
  - a query da página carrega `termoEmailStatus`, `termoEmailEnviadoEm` e `termoEmailErro`;
  - o botão não é renderizado para venda sem `assinaturaStatus = "assinado"`.

- [ ] **Step 2: Rodar os testes para confirmar a falha**

  Run: `npx vitest run src/__tests__/historico-termo-assinado-email.test.ts`

  Expected: FAIL porque a action e a tela ainda usam a notificação genérica da empresa.

- [ ] **Step 3: Atualizar a action manual**

  Em `enviarEmailEmpresa`, validar sessão, carregar a assinatura e rejeitar qualquer venda sem status `assinado`. Chamar `enviarTermoAssinadoAoRh(vendaId)` e traduzir os quatro estados para respostas curtas em português, por exemplo `Termo enviado ao RH`, `Falha ao enviar termo`, `Empresa sem e-mail de RH` e `Termo assinado não encontrado`.

- [ ] **Step 4: Atualizar a consulta e a UI do histórico**

  Incluir os campos de status no `select` da venda. Renderizar o botão somente em vendas assinadas e passar uma prop de contexto como `label="Reenviar termo ao RH"`. Mostrar, próximo ao botão, estado `Enviado`, `Falhou` ou `Sem e-mail do RH`, sem expor stack trace.

- [ ] **Step 5: Rodar testes da action e checagens de frontend**

  Run: `npx vitest run src/__tests__/historico-termo-assinado-email.test.ts && npx eslint src/app/api/assinatura/route.ts src/app/(app)/historico/actions.ts src/app/(app)/historico/page.tsx src/components/enviar-email-empresa-button.tsx src/lib/email.ts`

  Expected: PASS, sem erros de TypeScript/lint nos arquivos alterados.

- [ ] **Step 6: Commitar**

  ```bash
  git add src/app/(app)/historico/actions.ts src/app/(app)/historico/page.tsx src/components/enviar-email-empresa-button.tsx src/__tests__/historico-termo-assinado-email.test.ts
  git commit -m "feat: permitir reenvio manual do termo ao RH"
  ```

### Task 5: Verificação integrada e documentação operacional

**Files:**
- Modify: `README.md` ou documentação operacional existente de SMTP, somente se faltar instrução para testar o envio.
- Test: suíte existente relevante em `src/__tests__`.

**Interfaces:**
- Consumes todos os componentes das Tasks 1–4.
- Produces confirmação de migration, testes e build sem alterar as mudanças locais não relacionadas.

- [ ] **Step 1: Aplicar a migration em banco de teste**

  Run: `npx prisma migrate deploy`

  Expected: migration aplicada sem recriar/remover colunas existentes.

- [ ] **Step 2: Rodar a suíte focada completa**

  Run: `npx vitest run src/__tests__/email-mime.test.ts src/__tests__/termo-email-status.test.ts src/__tests__/termo-assinado-email.test.ts src/__tests__/assinatura-termo-email.test.ts src/__tests__/historico-termo-assinado-email.test.ts`

  Expected: PASS.

- [ ] **Step 3: Rodar lint e build**

  Run: `npx eslint src && npm run build`

  Expected: PASS. Se houver falha causada pelas alterações locais preexistentes, separar o diagnóstico e não revertê-las.

- [ ] **Step 4: Fazer smoke test manual**

  1. Cadastrar uma empresa com `emailRh` e, opcionalmente, `emailsExtras`.
  2. Criar uma venda com assinatura.
  3. Confirmar que nenhum e-mail é enviado na criação.
  4. Assinar pelo link do cliente.
  5. Confirmar um e-mail apenas para `emailRh`, com `termo-assinado-{id}.pdf` anexado.
  6. Simular falha SMTP, confirmar status `falhou` e clicar em `Reenviar termo ao RH` após corrigir SMTP.

- [ ] **Step 5: Registrar o resultado da verificação**

  Se todos os testes, lint, build e smoke test passarem, não criar um commit vazio. Se a verificação exigir uma correção nos arquivos da feature, revisar `git diff` e então commitar explicitamente apenas os arquivos corrigidos com:

  ```bash
  git add prisma/schema.prisma prisma/migrations/20260922120000_add_termo_email_status/migration.sql src/lib/email.ts src/lib/documento-service.ts src/app/api/assinatura/route.ts src/app/(app)/venda-rapida/actions.ts src/app/(app)/historico/actions.ts src/app/(app)/historico/page.tsx src/components/enviar-email-empresa-button.tsx
  git commit -m "fix: ajustar verificação do envio do termo ao RH"
  ```
