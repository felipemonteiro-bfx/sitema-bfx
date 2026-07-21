---
phase: quick-260402-grr
plan: 1
type: execute
wave: 1
depends_on: []
files_modified:
  - src/lib/email.ts
  - src/app/api/relatorios/vendas/pdf/route.ts
  - src/app/api/relatorios/vendas/route.ts
  - src/app/api/cron/relatorio-semanal/route.ts
  - src/app/(app)/historico/page.tsx
  - src/lib/db-search.ts
  - src/app/api/search/route.ts
  - src/app/(app)/cadastros/page.tsx
  - src/components/clientes-tab-client.tsx
  - prisma/schema.prisma
autonomous: true
requirements: [EMAIL-01, RELATORIO-01, RELATORIO-02, FUZZY-01, SIMILAR-01, WHATSAPP-01, EMPRESAS-01]

must_haves:
  truths:
    - "Ao criar uma venda, email eh enviado para a empresa parceira do cliente (emailRh + emailsExtras)"
    - "Relatorio PDF de vendas mostra colunas: matricula, nome, produtos, vendedor, data, valor, parcelas"
    - "Cron semanal envia relatorio por empresa com copia pro admin"
    - "Busca no historico de vendas aceita texto fuzzy (nome parcial ou com typo)"
    - "Ao digitar nome de novo cliente, alerta se ja existe cliente com nome similar"
    - "WhatsApp service esta funcional (config corrigida)"
    - "Empresas parceiras podem ser vinculadas entre si"
  artifacts:
    - path: "src/lib/email.ts"
      provides: "Email sending infrastructure via nodemailer"
      exports: ["sendEmail", "sendVendaNotification", "sendWeeklyReport"]
    - path: "src/app/api/cron/relatorio-semanal/route.ts"
      provides: "Weekly sales report cron endpoint"
      exports: ["GET"]
    - path: "src/app/api/search/route.ts"
      provides: "Fuzzy search extended with vendas type"
      exports: ["GET"]
  key_links:
    - from: "src/app/(app)/venda-rapida/actions.ts"
      to: "src/lib/email.ts"
      via: "sendVendaNotification after venda creation"
      pattern: "sendVendaNotification"
    - from: "src/app/api/cron/relatorio-semanal/route.ts"
      to: "src/lib/email.ts"
      via: "sendWeeklyReport for each empresa"
      pattern: "sendWeeklyReport"
    - from: "src/app/api/search/route.ts"
      to: "src/lib/db-search.ts"
      via: "fuzzyFindVendas function"
      pattern: "fuzzyFindVendas"
---

<objective>
Implementar 7 melhorias no sistema BFX: (1) envio de email para empresa parceira ao criar venda, (2) relatorio PDF de vendas com colunas matricula/nome/produtos/vendedor/data/valor/parcelas, (3) relatorio semanal por empresa via cron com copia admin, (4) corrigir servico WhatsApp off, (5) vinculos entre empresas parceiras, (6) alerta de nome similar ao cadastrar cliente, (7) fuzzy search em vendas.

Purpose: Melhorar comunicacao com empresas parceiras, qualidade dos relatorios, e usabilidade da busca.
Output: Email lib, PDF melhorado, cron semanal, fuzzy vendas, alerta duplicidade cliente.
</objective>

<execution_context>
@/home/claudeuser/.claude/get-shit-done/workflows/execute-plan.md
@/home/claudeuser/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@prisma/schema.prisma
@src/lib/db-search.ts
@src/app/api/relatorios/vendas/pdf/route.ts
@src/app/api/relatorios/vendas/route.ts
@src/app/api/search/route.ts
@src/app/(app)/cadastros/page.tsx
@src/components/clientes-tab-client.tsx
@src/components/empresas-tab-client.tsx
@src/app/(app)/historico/page.tsx
@src/app/api/whatsapp/route.ts
@src/lib/evolution.ts
@src/lib/venda-utils.ts
@src/app/api/cron/lembrete-parcelas/route.ts

<interfaces>
From prisma/schema.prisma:
```prisma
model EmpresaParceira {
  id            Int     @id @default(autoincrement())
  nome          String  @unique
  responsavelRh String? @map("responsavel_rh")
  telefoneRh    String? @map("telefone_rh")
  emailRh       String? @map("email_rh")
  cnpj          String? @map("cnpj")
  emailsExtras  String? @map("emails_extras")
  @@map("empresas_parceiras")
}

model Cliente {
  id        Int     @id @default(autoincrement())
  nome      String  @unique
  empresa   String?   // nome da empresa parceira (text field, not FK)
  matricula String?
  ...
}

model Venda {
  id          Int       @id @default(autoincrement())
  dataVenda   DateTime
  vendedor    String?
  clienteId   Int?
  parcelas    Int?
  ...
  cliente     Cliente?
  itens       ItemVenda[]
}
```

From src/lib/db-search.ts:
```typescript
async function fuzzyIds(table: string, column: string, query: string, limit: number, threshold?: number): Promise<number[]>
export async function fuzzyFindClientes(search: string, limit?: number)
export async function fuzzyFindProdutos(search: string, limit?: number)
```

From src/app/api/cron/lembrete-parcelas/route.ts (cron pattern):
```typescript
// Auth: Bearer CRON_SECRET header
// Returns: NextResponse.json({ ok, enviados, total, ... })
```
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: Email infrastructure + notificacao venda para empresa + relatorio PDF melhorado + relatorio semanal cron</name>
  <files>
    src/lib/email.ts,
    src/app/(app)/venda-rapida/actions.ts,
    src/app/api/relatorios/vendas/pdf/route.ts,
    src/app/api/relatorios/vendas/route.ts,
    src/app/api/cron/relatorio-semanal/route.ts,
    prisma/schema.prisma
  </files>
  <action>
  1. Adicionar campos SMTP na model Config em prisma/schema.prisma:
     - smtpHost String? @map("smtp_host")
     - smtpPort Int? @map("smtp_port")
     - smtpUser String? @map("smtp_user")
     - smtpPass String? @map("smtp_pass")
     - smtpFrom String? @map("smtp_from")
     - adminEmail String? @map("admin_email")
     Rodar `npx prisma db push` para aplicar.

  2. Criar src/lib/email.ts:
     - Usar nodemailer (ja disponivel no ecossistema Node, verificar se instalado; se nao, usar fetch com API de email ou SMTP puro).
     - IMPORTANTE: `npm install` falha por permissoes. Verificar se nodemailer existe em node_modules; se nao, implementar SMTP via net/tls nativo OU usar a API do Resend/outro servico via fetch.
     - Funcao getSmtpConfig() que le da Config (prisma) ou env vars (SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM).
     - Funcao sendEmail({ to: string | string[], subject: string, html: string, cc?: string[] }): envia email via SMTP.
     - Funcao sendVendaNotification(venda): busca o cliente da venda, encontra a EmpresaParceira pelo campo cliente.empresa (case-insensitive match), envia email para emailRh + emailsExtras (split por virgula) com dados da venda (cliente, matricula, produtos, valor, parcelas, vendedor, data).
     - Funcao sendWeeklyReport(empresaNome, vendas[], adminEmail?): gera HTML table com colunas matricula, nome, produtos, vendedor, data, valor, parcelas; envia para emails da empresa + CC para adminEmail.

  3. Integrar sendVendaNotification no fluxo de criacao de venda:
     - Em src/app/(app)/venda-rapida/actions.ts, apos criar a venda com sucesso, chamar sendVendaNotification(vendaCriada) em fire-and-forget (nao bloquear resposta). Usar .catch(console.error) para nao quebrar o fluxo.
     - Tambem verificar src/lib/ai-actions.ts se tem criar_venda e integrar la tambem.

  4. Melhorar relatorio PDF (src/app/api/relatorios/vendas/pdf/route.ts):
     - Alterar colunas para: Matricula | Nome | Produtos | Vendedor | Data | Valor | Parcelas
     - Incluir cliente.matricula na query (adicionar ao select do include)
     - Ajustar colX para 7 colunas: [40, 95, 180, 300, 380, 440, 510]
     - Headers: ["Mat.", "Nome", "Produtos", "Vendedor", "Data", "Valor", "Parc."]
     - Remover coluna Status (temNota), adicionar Matricula (primeira) e Parcelas (ultima)

  5. Melhorar relatorio CSV (src/app/api/relatorios/vendas/route.ts):
     - Adicionar matricula na query (cliente select)
     - Header: "Matricula,Nome,Produtos,Vendedor,Data,Valor,Parcelas\n"
     - Reordenar campos para: matricula, nome cliente, produtos, vendedor, data, valor, parcelas

  6. Criar cron relatorio semanal (src/app/api/cron/relatorio-semanal/route.ts):
     - Seguir padrao de src/app/api/cron/lembrete-parcelas/route.ts (auth via Bearer CRON_SECRET)
     - Buscar todas as empresas parceiras com emailRh preenchido
     - Para cada empresa, buscar vendas da ultima semana (7 dias) onde cliente.empresa matches (case-insensitive)
     - Gerar HTML email com tabela: matricula, nome, produtos, vendedor, data, valor, parcelas
     - Enviar para empresa (emailRh + emailsExtras) com CC para adminEmail (do Config)
     - Retornar JSON com { ok, empresas, enviados }
  </action>
  <verify>
    <automated>cd /tmp/sitema-bfx && npx tsc --noEmit src/lib/email.ts src/app/api/cron/relatorio-semanal/route.ts src/app/api/relatorios/vendas/pdf/route.ts 2>&1 | head -30</automated>
  </verify>
  <done>
    - src/lib/email.ts exporta sendEmail, sendVendaNotification, sendWeeklyReport
    - Relatorio PDF tem 7 colunas: Mat., Nome, Produtos, Vendedor, Data, Valor, Parc.
    - Relatorio CSV tem header Matricula,Nome,Produtos,Vendedor,Data,Valor,Parcelas
    - Cron /api/cron/relatorio-semanal envia relatorio por empresa com CC admin
    - Criacao de venda dispara email para empresa do cliente
  </done>
</task>

<task type="auto">
  <name>Task 2: Fuzzy search em vendas + alerta nome similar em novo cliente + WhatsApp fix + vinculos empresas</name>
  <files>
    src/lib/db-search.ts,
    src/app/api/search/route.ts,
    src/app/(app)/historico/page.tsx,
    src/components/clientes-tab-client.tsx,
    src/app/(app)/cadastros/page.tsx,
    src/app/api/clientes/similar/route.ts,
    src/lib/evolution.ts,
    src/app/api/whatsapp/route.ts,
    prisma/schema.prisma,
    src/components/empresas-tab-client.tsx
  </files>
  <action>
  1. Fuzzy search em vendas (src/lib/db-search.ts):
     - Adicionar funcao fuzzyFindVendas(search: string, limit = 50) que faz fuzzy search multi-coluna:
       a. Busca por nome do cliente: fuzzy match em clientes.nome, retorna cliente IDs
       b. Busca por nome do produto: fuzzy match em itens_venda.produto_nome
       c. Busca por vendedor: fuzzy match em vendas.vendedor
       d. Combina resultados: SELECT DISTINCT vendas.id WHERE clienteId IN (...ids) OR vendas.vendedor ILIKE OR vendas.id IN (SELECT venda_id FROM itens_venda WHERE ...)
       e. Retorna vendas com includes necessarios (cliente, itens)

  2. Adicionar type "vendas" ao search API (src/app/api/search/route.ts):
     - Import fuzzyFindVendas
     - type === "vendas": retorna { options: vendas.map(v => ({ value: String(v.id), label: `${v.cliente?.nome} - ${produtosTexto(v)} - ${formatDateBR(v.dataVenda)}` })) }

  3. Adicionar campo de busca fuzzy no historico (src/app/(app)/historico/page.tsx):
     - Adicionar searchParam `q` ao tipo Search
     - Quando `sp.q` preenchido, usar fuzzyFindVendas para filtrar vendas (IDs) em vez de query Prisma padrao
     - Adicionar Input de busca com placeholder "Buscar por cliente, produto ou vendedor..." acima dos filtros

  4. Alerta nome similar ao cadastrar cliente:
     - Criar endpoint GET /api/clientes/similar?nome=X (src/app/api/clientes/similar/route.ts):
       Usa fuzzyFindClientes com threshold baixo (0.3) e limit 5. Retorna { similares: [{ id, nome }] }.
     - Em src/components/clientes-tab-client.tsx:
       a. Adicionar estado `similares: { id: number; nome: string }[]`
       b. No input "nome" do form de novo cliente, adicionar onBlur handler que chama /api/clientes/similar?nome=value via fetch
       c. Se similares.length > 0, mostrar Alert (amarelo) abaixo do campo nome: "Clientes com nome similar: {nomes}. Deseja continuar?"
       d. Nao bloquear submit, apenas informar

  5. Corrigir servico WhatsApp off:
     - Verificar src/lib/evolution.ts: getInstanceState() pode estar falhando silenciosamente
     - Em getEvolutionConfig(): se Config nao tem evolutionApiUrl, retornar null (ja faz). Problema provavel: instancia desconectada ou config vazia.
     - Em src/app/api/whatsapp/route.ts GET: se getInstanceState() retorna erro ou 'close', adicionar reconnect automatico: chamar createInstance() para reconectar.
     - Adicionar try-catch mais robusto em getInstanceState() com log de erro detalhado.

  6. Vinculos entre empresas parceiras:
     - Adicionar campo opcional empresaParceiraId Int? @map("empresa_parceira_id") ao model EmpresaParceira (auto-referencia para agrupar empresas vinculadas). Ou melhor: criar tabela de juncao.
     - Adicionar model EmpresaVinculo no schema.prisma:
       ```
       model EmpresaVinculo {
         id         Int @id @default(autoincrement())
         empresaId  Int @map("empresa_id")
         vinculadaId Int @map("vinculada_id")
         empresa    EmpresaParceira @relation("empresa", fields: [empresaId], references: [id], onDelete: Cascade)
         vinculada  EmpresaParceira @relation("vinculada", fields: [vinculadaId], references: [id], onDelete: Cascade)
         @@unique([empresaId, vinculadaId])
         @@map("empresas_vinculos")
       }
       ```
     - Adicionar relacoes no EmpresaParceira: vinculos EmpresaVinculo[] @relation("empresa") e vinculadaPor EmpresaVinculo[] @relation("vinculada")
     - Em src/components/empresas-tab-client.tsx: na tabela, adicionar coluna "Vinculadas" mostrando nomes das empresas vinculadas.
     - No form de edicao de empresa, adicionar multi-select para vincular empresas (usar checkboxes ou select simples com as empresas disponiveis).
     - Em src/app/(app)/cadastros/page.tsx: nas server actions de empresa, tratar vinculacao (receber ids[] do form e criar/deletar EmpresaVinculo).
     - Rodar prisma db push apos alteracoes no schema.
  </action>
  <verify>
    <automated>cd /tmp/sitema-bfx && npx tsc --noEmit src/lib/db-search.ts src/app/api/search/route.ts src/app/api/clientes/similar/route.ts 2>&1 | head -30</automated>
  </verify>
  <done>
    - fuzzyFindVendas funciona e busca por cliente/produto/vendedor
    - /api/search?type=vendas&q=X retorna resultados fuzzy
    - Historico tem campo de busca fuzzy acima dos filtros
    - /api/clientes/similar?nome=X retorna clientes com nome parecido
    - Form de novo cliente mostra alerta quando nome similar encontrado
    - WhatsApp API reconnecta automaticamente quando estado eh 'close'
    - EmpresaVinculo model existe e empresas podem ser vinculadas na UI
  </done>
</task>

</tasks>

<verification>
1. TypeScript compila sem erros: `npx tsc --noEmit`
2. Relatorio PDF gerado com 7 colunas corretas
3. Endpoint /api/cron/relatorio-semanal responde com JSON valido
4. /api/search?type=vendas&q=test retorna formato correto
5. /api/clientes/similar?nome=test retorna formato correto
6. Schema Prisma valido: `npx prisma validate`
</verification>

<success_criteria>
- Email para empresa parceira disparado ao criar venda (fire-and-forget)
- Relatorio PDF e CSV com colunas: matricula, nome, produtos, vendedor, data, valor, parcelas
- Cron semanal envia relatorio agrupado por empresa com CC admin
- Busca fuzzy no historico de vendas funciona por cliente/produto/vendedor
- Alerta de nome similar aparece ao cadastrar novo cliente
- WhatsApp reconnecta automaticamente quando desconectado
- Empresas parceiras podem ser vinculadas entre si na UI
</success_criteria>

<output>
After completion, create `.planning/quick/260402-grr-mandar-email-para-a-empresa-em-que-o-cli/260402-grr-SUMMARY.md`
</output>
