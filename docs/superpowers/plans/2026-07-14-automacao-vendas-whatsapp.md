# Plano de Execução — Automação Vendas + WhatsApp + Relatórios Empresas Parceiras

> **Branch:** `nextjs-migration`  
> **Data:** 2026-07-14  
> **Canal WhatsApp:** Evolution API (já integrado) — não migrar para Meta Cloud API neste plano  
> **Stack:** Next.js 15, Prisma, Evolution API, Asaas, BFX Intelligence (Gemini/OpenAI/LiteLLM)

---

## 1. Objetivo

Fechar o ciclo operacional **atendimento → pedido → assinatura/pagamento → confirmação → cobrança/retenção → relatório à empresa parceira** com o mínimo de digitação manual, reutilizando:

| Camada | Responsabilidade |
|--------|------------------|
| **Evolution API** | Enviar/receber mensagens, mídia, estado da instância |
| **BFX** | IA, vendas, inbox, templates, regras, crons, notificações, relatórios |
| **Asaas** | Boleto/PIX e confirmação de pagamento (webhook) |
| **SMTP / e-mail** | Relatórios semanais e **mensais** para RH das empresas parceiras |

**Fora de escopo deste plano:** Instagram/Telegram, Meta Cloud API, multi-número comercial vs cobrança, A/B de campanhas avançado, portal self-service da empresa (login do RH).

---

## 2. Estado atual (baseline)

### Já existe e deve ser reaproveitado

| Capacidade | Onde |
|------------|------|
| Envio texto/mídia WhatsApp | `src/lib/whatsapp.ts` |
| Config Evolution + flags auto | `Config` no Prisma + Configurações UI |
| Webhook mensagens | `src/app/api/webhooks/evolution/route.ts` |
| Pré-atendimento IA + takeover | `src/lib/whatsapp-pre-atendimento.ts` |
| Crons (lembrete, vencida, NPS, aniversário, reativação, agradecimento) | `src/app/api/cron/*` + `vercel.json` |
| Auto recibo/assinatura/boleto na venda | `src/app/(app)/venda-rapida/actions.ts` |
| Boletos Asaas | `src/lib/asaas.ts`, `src/lib/boleto-actions.ts` |
| Upsell/cross-sell | `src/app/api/vendas/sugestoes/route.ts` |
| Catálogo público | `src/app/catalogo/*` |
| Log de envios | `WhatsAppEnvioLog` |
| Notificações in-app | `Notificacao` |
| Assinatura digital | `Assinatura` + `/assinatura/[token]` |
| Transcrição de voz | `src/app/api/transcribe/route.ts` |
| **Relatório semanal por empresa parceira** | `src/app/api/cron/relatorio-semanal/route.ts` + `sendWeeklyReport()` em `src/lib/email.ts` |
| E-mail na venda (empresa) | `notifyEmpresaNovaVenda` (ou equivalente) em `src/lib/email.ts` |
| Export manual vendas (PDF/CSV) por empresa | `/relatorios` + `/api/relatorios/vendas*` |
| FK cliente → empresa | `Cliente.empresaParceiraId` → `EmpresaParceira` (`emailRh`, `emailsExtras`, `telefoneRh`) |

### Lacunas principais

1. Conversas não são persistidas → sem inbox
2. IA não cria pedido/venda
3. Sem webhook Asaas → pagamento não fecha o loop no WhatsApp
4. Templates hardcoded nos crons
5. Status de venda limitado (`ativa` \| `cancelada` \| `estornada`) — sem pipeline operacional
6. Sem opt-out LGPD
7. Catálogo não gera intenção de compra no Zap
8. **Sem relatório mensal automático** para empresas parceiras (só semanal + export manual)
9. Cron semanal **existe no código** mas **não está registrado** em `vercel.json`
10. Relatório semanal é resumo de vendas; RH costuma precisar de **desconto em folha / parcelas do mês** (folha de descontos)

---

## 3. Princípios de execução

1. **Spec → TDD → implementação → review por subagente** (conforme `Claude.md`)
2. **Evolution só como transporte** — lógica de negócio no BFX
3. **PRs pequenos e entregáveis** — cada PR devolve valor usável em produção
4. **Feature flags** — novas automações desligadas por default em `Config`
5. **Idempotência** — crons e webhooks não reenviam a mesma mensagem (usar/estender `WhatsAppEnvioLog`)
6. **Não instalar pacotes** se `npm install` falhar por permissões; preferir parser/APIs nativas
7. **Commit + push** ao finalizar cada PR no branch `nextjs-migration` (pull --rebase antes)

---

## 4. Fases e PRs

```text
Fase 0  Fundação de dados e logging
Fase 1  Fechar o funil (inbox + pedido + pagamento)
Fase 1B Relatórios B2B (mensal + endurecer semanal)  ← empresas parceiras / RH
Fase 2  Menos atrito (templates + catálogo + pipeline)
Fase 3  Crescimento e retenção (cobrança, campanhas, métricas)
```

Estimativas em **dias de dev focado** (1 pessoa). Ajustar se houver revisão/QA separado.

| Fase | PRs | Estimativa | Dependências |
|------|-----|------------|--------------|
| 0 | PR-0 | 1–2 d | — |
| 1 | PR-1, PR-2, PR-3 | 8–12 d | Fase 0 |
| **1B** | **PR-E1 (relatório mensal empresas)** | **2–4 d** | **Independente da Fase 1; pode ir em paralelo** |
| 2 | PR-4, PR-5, PR-6 | 6–9 d | PR-0; PR-5 se beneficia de PR-2 |
| 3 | PR-7 … PR-10 | 8–12 d | Fase 1; PR-4 ajuda templates |

**Total orientativo:** 5–8 semanas em sequência; **PR-E1 pode sair cedo** (alto valor para RH/parceiros) sem esperar inbox/pedido no Zap.

---

## 5. Diagrama do fluxo-alvo (Fase 1)

```text
Cliente WhatsApp
      │
      ▼
 Evolution API  ──webhook MESSAGES_UPSERT──►  BFX /api/webhooks/evolution
      ▲                                              │
      │                                              ▼
      │                                     Persiste WhatsAppMensagem
      │                                              │
      │                         ┌────────────────────┼────────────────────┐
      │                         ▼                    ▼                    ▼
      │                    Inbox UI            Pré-atendimento        Intent "quero X"
      │                    (humano)            (IA texto)             (criar proposta)
      │                         │                    │                    │
      │                         │                    │                    ▼
      │                         │                    │              Venda status=proposta
      │                         │                    │                    │
      │                         │                    │         ┌──────────┴──────────┐
      │                         │                    │         ▼                     ▼
      │                         │                    │   Link assinatura        Boleto/PIX
      │                         │                    │   (BFX)                  (Asaas)
      │◄── sendText/sendMedia ──┴────────────────────┴─────────┴─────────────────────┘
      │
      │   Asaas webhook PAYMENT_RECEIVED ──► BFX ──► marca parcela ──► WhatsApp "pago ✓"
```

---

## 6. Detalhamento por PR

### PR-0 — Fundação: conversas, opt-out e log unificado

**Goal:** Persistir o que entra/sai no WhatsApp e preparar opt-out, sem mudar UX de venda ainda.

#### Schema (Prisma)

- [ ] `Cliente.whatsappOptOut Boolean @default(false)`
- [ ] `Cliente.whatsappOptOutEm DateTime?`
- [ ] Model `WhatsAppConversa`:
  - `id`, `telefone` (unique normalizado), `clienteId?`, `modo` (`ia` \| `humano`), `ultimoContatoEm`, `atribuidoUsuarioId?`
- [ ] Model `WhatsAppMensagem`:
  - `id`, `conversaId`, `direcao` (`in` \| `out`), `texto`, `midiaUrl?`, `origem` (`cliente` \| `ia` \| `humano` \| `sistema` \| `cron`), `evolutionMessageId?`, `criadoEm`
- [ ] Estender `WhatsAppEnvioLog.tipo` (documentar tipos canônicos) e opcionalmente `sucesso Boolean`, `erro String?`

#### Código

- [ ] `src/lib/whatsapp-conversa.ts` — upsert conversa, append mensagem, normalizar telefone (reusar lógica de `whatsapp-pre-atendimento` / `whatsapp.ts`)
- [ ] Webhook Evolution: gravar inbound **antes** de processar IA; gravar outbound quando `enviarWhatsAppTexto` / `enviarWhatsAppArquivo` tiverem sucesso
- [ ] Em todos os envios automáticos: se `whatsappOptOut` → não enviar
- [ ] Detectar palavras `PARE` / `SAIR` / `CANCELAR` no webhook → set opt-out + resposta de confirmação
- [ ] Comando `VOLTAR` → limpa opt-out (opcional nesta PR)

#### Testes

- [ ] Unit: normalização de telefone e matching de opt-out
- [ ] Unit: não envia se optOut
- [ ] Integração leve: webhook grava mensagem inbound

#### Arquivos principais

| Ação | Path |
|------|------|
| Create | `prisma/migrations/..._whatsapp_conversa` |
| Create | `src/lib/whatsapp-conversa.ts` |
| Modify | `src/lib/whatsapp.ts` |
| Modify | `src/app/api/webhooks/evolution/route.ts` |
| Modify | `src/lib/whatsapp-pre-atendimento.ts` |
| Create | `src/__tests__/whatsapp-opt-out.test.ts` |

#### Aceite

- Mensagens in/out aparecem no banco
- Cliente com opt-out não recebe crons nem IA
- `PARE` desliga e confirma no Zap

#### Rollback

Feature é aditiva; desligar gravação se necessário com flag `Config.whatsappLogConversas` (opcional).

---

### PR-1 — Inbox de atendimento (humano + IA)

**Goal:** Time vê conversas, assume/libera atendimento e responde pelo sistema (via Evolution).

**Depende de:** PR-0

#### Backend

- [ ] `GET /api/whatsapp/conversas` — lista (filtro: todas / ia / humano / não lidas)
- [ ] `GET /api/whatsapp/conversas/[id]` — mensagens paginadas + cliente vinculado
- [ ] `POST /api/whatsapp/conversas/[id]/assumir` — `modo=humano`, `atendimentoHumanoAt=now`, `atribuidoUsuarioId`
- [ ] `POST /api/whatsapp/conversas/[id]/devolver-ia` — limpa takeover, `modo=ia`
- [ ] `POST /api/whatsapp/conversas/[id]/responder` — envia via Evolution, grava mensagem `origem=humano`
- [ ] Notificação in-app quando cliente pede humano (já há frase no prompt da IA — detectar intent e criar `Notificacao`)

#### Frontend

- [ ] Página `src/app/(app)/atendimento/page.tsx` (ou `whatsapp/`)
- [ ] Layout 2 colunas desktop / stack mobile: lista + thread
- [ ] Badges: IA / Humano / Opt-out
- [ ] Link para cliente e últimas vendas
- [ ] Item no sidebar: **Atendimento** (grupo Vendas & Operações)

#### Testes

- [ ] Assumir bloqueia resposta da IA (reusa `estaEmModoHumano`)
- [ ] Responder grava mensagem e chama Evolution (mock)

#### Aceite

- Vendedor assume chat, responde pelo app, IA para de responder
- Devolver à IA funciona após N minutos ou botão explícito
- Mensagem “quero falar com vendedor” gera notificação

#### Fora desta PR

- Multi-atendente com fila de distribuição
- Métricas de SLA

---

### PR-2 — Pedido / proposta pelo pré-atendimento

**Goal:** IA conduz pedido no WhatsApp e cria venda em status operacional `proposta` (ou equivalente), enviando link de assinatura e/ou cobrança.

**Depende de:** PR-0 (ideal); PR-1 facilita operação humana em falhas

#### Decisões de produto (fixar na spec da PR)

| Decisão | Recomendação |
|---------|--------------|
| Status novo | Expandir `Venda.status`: `proposta` \| `aguardando_assinatura` \| `aguardando_pagamento` \| `ativa` \| `cancelada` \| `estornada` |
| Quem é vendedor | Config `whatsappVendedorPadraoId` ou round-robin simples; default: primeiro admin |
| Cliente sem cadastro | Criar cliente mínimo (nome + telefone) com flag `origem=whatsapp` se necessário |
| Confirmação | IA lista itens/total e só cria venda após “sim” / “confirmo” |
| Limite de crédito | Reusar `credit.ts` / `consultar_limite_cliente`; se exceder, pedir humano |

#### Backend / IA

- [ ] Estender pré-atendimento com **máquina de estados leve** por conversa:
  - `idle` → `coletando_itens` → `confirmando` → `aguardando_pagamento` / `aguardando_assinatura` → `concluido`
- [ ] Persistir estado em `WhatsAppConversa.estadoJson` (Json)
- [ ] Funções BFX (não tools soltas na Evolution):
  - `buscarProdutosCatalogo(query)`
  - `criarPropostaVenda({ clienteId, itens, formaPagamento })`
  - reutilizar trechos de `venda-rapida/actions.ts` (extrair service `src/lib/venda-service.ts` se necessário)
- [ ] Após criar proposta:
  - desconto em folha → token assinatura + `sendText` com link
  - boleto/PIX → gerar Asaas + link
  - à vista genérico → instruções + notificar vendedor
- [ ] Upsell: opcional chamar lógica de `/api/vendas/sugestoes` após 1º item
- [ ] Feature flag: `Config.whatsappPedidoEnabled` default `0`

#### Testes (TDD)

- [ ] Fluxo mockado: “quero produto X” → confirma → cria `Venda` `proposta` + item
- [ ] Sem estoque → recusa e sugere alternativa
- [ ] Opt-out → não cria nem envia
- [ ] Pedido de humano interrompe máquina de estados

#### Aceite

- Cliente consegue fechar um pedido de 1–2 itens só pelo Zap (happy path)
- Venda aparece no Histórico com status/origem identificável
- Vendedor recebe notificação da proposta criada

#### Riscos

- Alucinação de preço: **sempre** ler preço do Prisma, nunca da “memória” da IA
- Duplicar venda: idempotência por `conversaId + hash itens` em janela de 10 min

---

### PR-3 — Webhook Asaas: pagamento confirmado

**Goal:** Ao pagar boleto/PIX, marcar parcela/venda e avisar no WhatsApp.

**Depende de:** — (pode começar em paralelo à PR-1 se boleto já grava `paymentId`)

#### Pré-requisitos técnicos

- [ ] Garantir que cobranças Asaas salvam `asaasPaymentId` (ou equivalente) em `Venda` / `ParcelaVencimento` — auditar `boleto-actions.ts` e schema; migration se faltar
- [ ] Configurar URL webhook no painel Asaas: `/api/webhooks/asaas`
- [ ] `ASAAS_WEBHOOK_TOKEN` (ou validação por header Asaas) no env

#### Backend

- [ ] `POST /api/webhooks/asaas` (público no middleware, como Evolution)
- [ ] Eventos: `PAYMENT_RECEIVED`, `PAYMENT_CONFIRMED` (tratar ambos de forma idempotente)
- [ ] Localizar parcela/venda pelo payment id
- [ ] Marcar `parcela.paga = true` (e data pagamento se existir)
- [ ] Se todas parcelas pagas e status `aguardando_pagamento` → `ativa` (ou `paga`)
- [ ] WhatsApp: template sistema “Pagamento confirmado…”
- [ ] Log em `WhatsAppEnvioLog` tipo `pagamento_confirmado`
- [ ] Notificação interna opcional para o vendedor

#### Testes

- [ ] Payload fixture Asaas → parcela marcada uma vez (replay não duplica)
- [ ] Payment desconhecido → 200 + log (não quebrar Asaas)

#### Aceite

- Pagar boleto sandbox atualiza sistema e manda Zap
- Replay do mesmo evento não reenvia (ou reenvia no máximo com dedupe por log)

---

### PR-4 — Templates editáveis de mensagem

**Goal:** Time edita textos das automações sem deploy.

**Depende de:** PR-0 (opt-out + log); independente de PR-1–3

#### Schema

- [ ] Model `WhatsAppTemplate`:
  - `chave` unique (`lembrete_parcela`, `parcela_vencida`, `aniversario`, `reativacao`, `nps`, `boas_vindas`, `agradecimento`, `pagamento_confirmado`, `recibo_venda`, `link_assinatura`, `boleto`, `opt_out_confirmacao`)
  - `conteudo` String (com placeholders)
  - `ativo` Boolean
  - `atualizadoEm`

#### Lib

- [ ] `src/lib/whatsapp-templates.ts`
  - `renderTemplate(chave, vars)` → string
  - defaults embutidos no código se DB vazio (seed na migration)
  - vars: `{nome}`, `{valor}`, `{vencimento}`, `{link_boleto}`, `{link_assinatura}`, `{numero_parcela}`, `{venda_id}`, …

#### UI

- [ ] Configurações → aba WhatsApp → lista de templates + preview com vars de exemplo
- [ ] Validação: placeholders desconhecidos avisam, não bloqueiam

#### Migração dos crons

- [ ] Cada `src/app/api/cron/*` e envios em `venda-rapida/actions.ts` / `boleto-actions.ts` usam `renderTemplate`
- [ ] Remover strings hardcoded (manter default na lib)

#### Testes

- [ ] Render com vars faltando → placeholder vazio ou texto fallback seguro
- [ ] Cron com template customizado envia texto do DB (mock)

#### Aceite

- Alterar “lembrete de parcela” na UI reflete no próximo cron sem redeploy

---

### PR-5 — Catálogo → intenção de compra no WhatsApp

**Goal:** Do catálogo público, cliente abre conversa com contexto do produto.

**Depende de:** PR-2 para fechar pedido sozinho; sem PR-2 ainda envia msg pré-preenchida (wa.me)

#### Implementação

- [ ] Botão **“Pedir no WhatsApp”** em `catalogo-publico-client.tsx`
- [ ] Link `https://wa.me/55...?...` com texto: `Olá! Tenho interesse no produto: {nome} (#{id})`
- [ ] Número comercial configurável: `Config.whatsappNumeroPublico` ou da instância Evolution
- [ ] (Opcional com PR-2) Deep link interno: query `?produtoId=` no estado da conversa quando a msg chegar (match por id no texto)

#### Aceite

- Um toque no catálogo mobile abre WhatsApp com produto certo
- Pré-atendimento reconhece produto por id/nome e responde com preço/estoque real

---

### PR-6 — Pipeline de status da venda + lembretes por etapa

**Goal:** Status operacionais e automações de “parado há X tempo”.

**Depende de:** PR-2 (status `proposta` etc.) e PR-3 (pagamento)

#### Status canônicos

```text
proposta → aguardando_assinatura → aguardando_pagamento → ativa → (cancelada|estornada)
                │                         │
                └── lembrete 24h/48h ─────┘
```

#### Backend

- [ ] Transições centralizadas em `src/lib/venda-status.ts` (validar transições ilegais)
- [ ] Ao assinar (`Assinatura`): se desconto em folha → `ativa` ou `aguardando_pagamento` conforme regra atual; notificar empresa/vendedor se já existir feature de email
- [ ] Cron `src/app/api/cron/lembrete-pipeline/route.ts`:
  - propostas sem confirmação > 24h
  - assinatura pendente > 24h e > 48h
  - pagamento pendente > 48h
- [ ] Registrar em `WhatsAppEnvioLog` para não spam
- [ ] UI Histórico: badge de status + filtro
- [ ] (Opcional) Kanban simples na mesma página ou `/pipeline`

#### Testes

- [ ] Transição inválida lança erro
- [ ] Lembrete só 1x por janela/tipo

#### Aceite

- Venda parada em assinatura gera lembrete automático
- Histórico mostra status legível

---

### PR-E1 — Relatório mensal automático para empresas parceiras

**Goal:** Todo início de mês, cada empresa parceira recebe o **fechamento do mês anterior**: vendas dos colaboradores, totais e (quando aplicável) **valores a descontar em folha** no período — por e-mail (HTML + anexo) e fallback WhatsApp no `telefoneRh`.

**Depende de:** — (independente do funil WhatsApp). Reaproveita:
- `sendWeeklyReport` / query por `empresaParceiraId` em `relatorio-semanal`
- `EmpresaParceira.emailRh`, `emailsExtras`, `telefoneRh`
- Exports PDF/XLSX existentes em `/api/relatorios/*` (padrão de geração)
- SMTP em `Config` / env

**Prioridade de negócio:** alta para operação B2B (RH confere descontos e compras do mês).

#### Por que mensal (além do semanal)

| Tipo | Uso típico do RH |
|------|------------------|
| **Semanal** (já existe) | Acompanhamento operacional, novidades da semana |
| **Mensal** (novo) | Fechamento de folha, auditoria, arquivo contábil, total do mês |

#### Conteúdo do relatório mensal (v1)

Para cada `EmpresaParceira` com pelo menos 1 venda no mês de referência **ou** flag “sempre enviar”:

1. **Cabeçalho:** empresa, mês/ano (ex.: `Junho/2026`), gerado em, contato BFX  
2. **Resumo:**
   - Qtd. vendas
   - Valor total vendido
   - Qtd. colaboradores com compra
   - Total **desconto em folha** (soma das parcelas com vencimento no mês **ou** vendas `descontoEmFolha` do mês — ver decisão abaixo)
   - Total boleto/outros (se houver)
3. **Tabela detalhada (e-mail HTML):**
   - Matrícula | Nome | Data | Produtos | Valor | Forma pag. | Parcelas | Status assinatura (se DF)
4. **Seção “Descontos em folha no mês”** (crítico para RH):
   - Linhas por colaborador/parcela com vencimento no mês de referência
   - Colunas: Matrícula | Nome | Venda # | Parcela n/N | Vencimento | Valor | Status (paga/pendente)
   - Subtotal por colaborador + total geral a descontar
5. **Anexo (recomendado v1):**
   - PDF e/ou XLSX com as mesmas abas: `Vendas` e `Descontos_Folha`
   - Nome: `BFX_relatorio_mensal_{empresa}_{YYYY-MM}.pdf`

#### Decisões de produto (fixar na spec da PR)

| Decisão | Recomendação |
|---------|--------------|
| Período | Mês civil anterior (America/Manaus), do dia 1 00:00 ao último dia 23:59:59 |
| Quando rodar | Cron dia **1** às **08:00** (horário do deploy); reenvio manual na UI |
| Critério “desconto do mês” | **Parcelas com `dataVencimento` no mês** (alinha com folha). Alternativa: data da venda — documentar se RH preferir |
| Empresa sem vendas no mês | Não enviar (default) **ou** e-mail “sem movimentação” se `relatorioMensalSempre = 1` na empresa |
| Destinatários | `emailRh` + `emailsExtras` (split vírgula); CC `Config.adminEmail` |
| Sem e-mail | WhatsApp resumo curto no `telefoneRh` + link seguro temporário para baixar PDF (token 7 dias) **ou** só resumo no Zap se não houver storage de link |
| Idempotência | Log `EmpresaRelatorioEnvio` (`empresaId`, `tipo=mensal`, `periodo=YYYY-MM`, `enviadoEm`, `canal`, `sucesso`) — não reenviar no mesmo período salvo force |
| Flag global | `Config.relatorioMensalEnabled` default `1` após validar SMTP |
| Flag por empresa | `EmpresaParceira.relatorioMensalEnabled` default `1` |

#### Backend

- [ ] Extrair query compartilhada em `src/lib/relatorio-empresa.ts`:
  - `buscarVendasEmpresaPeriodo(empresaId, from, to)`
  - `buscarParcelasDescontoFolhaMes(empresaId, year, month)` — vendas DF dos clientes da empresa
  - Preferir `cliente.empresaParceiraId`; fallback texto `empresa` só para legado (igual semanal)
- [ ] `buildRelatorioMensalEmpresa(...)` → `{ html, resumoTexto, rowsVendas, rowsFolha, totais }`
- [ ] `sendMonthlyReport(...)` em `src/lib/email.ts` (espelhar `sendWeeklyReport`, com HTML mais completo + anexo se viável)
- [ ] Geração PDF: reutilizar padrões de `src/app/api/relatorios/vendas/pdf` / `pdf-lib`
- [ ] Geração XLSX: reutilizar padrão de `vendas-xlsx` / `antecipacao-xlsx` se já houver lib no projeto
- [ ] `GET /api/cron/relatorio-mensal` — auth `Bearer CRON_SECRET`
  - Calcula mês anterior
  - Itera empresas elegíveis
  - Envia + grava log
  - Retorna `{ empresas, enviados, pulados, erros }`
- [ ] Registrar em `vercel.json`:
  ```json
  {"path":"/api/cron/relatorio-mensal","schedule":"0 12 1 * *"}
  ```
  (12:00 UTC ≈ manhã em Manaus; ajustar se timezone do cron for outro)
- [ ] **Também registrar** o semanal que falta no `vercel.json` (ex.: segunda 11:00 UTC):
  ```json
  {"path":"/api/cron/relatorio-semanal","schedule":"0 14 * * 1"}
  ```
- [ ] Refator leve: semanal passa a usar `relatorio-empresa.ts` (evita duas queries divergentes)

#### UI (Relatórios + Empresas)

- [ ] Card em `/relatorios`: **“Relatório mensal — empresas parceiras”**
  - Select mês/ano
  - Select empresa (ou “todas”)
  - Botões: **Gerar PDF**, **Gerar XLSX**, **Enviar agora** (admin)
- [ ] API admin:
  - `GET /api/relatorios/empresa-mensal?empresaId=&year=&month=&format=pdf|xlsx|json`
  - `POST /api/relatorios/empresa-mensal/enviar` — body `{ empresaId | "all", year, month, force?: boolean }`
- [ ] Aba Empresas (cadastro): toggle “Recebe relatório mensal”, preview e-mails
- [ ] Histórico simples: últimos envios (tabela `EmpresaRelatorioEnvio`) na ficha da empresa ou em Relatórios

#### Schema (Prisma)

```prisma
model EmpresaRelatorioEnvio {
  id         Int      @id @default(autoincrement())
  empresaId  Int      @map("empresa_id")
  tipo       String   // "semanal" | "mensal"
  periodo    String   // "2026-W23" ou "2026-06"
  canal      String   // "email" | "whatsapp" | "ambos"
  sucesso    Boolean  @default(true)
  detalhe    String?  // erro ou qtd linhas
  enviadoEm  DateTime @default(now()) @map("enviado_em")
  empresa    EmpresaParceira @relation(fields: [empresaId], references: [id])

  @@unique([empresaId, tipo, periodo])
  @@index([tipo, periodo])
  @@map("empresa_relatorio_envios")
}
```

- [ ] Campos opcionais em `EmpresaParceira`:
  - `relatorioMensalEnabled Int? @default(1)`
  - `relatorioSemanalEnabled Int? @default(1)`

#### Testes (TDD)

- [ ] Período mês anterior: boundaries (1º e último dia, timezone Manaus)
- [ ] Empresa só com fallback texto `cliente.empresa` ainda entra no relatório
- [ ] Parcelas DF: inclui só vencimento no mês; exclui canceladas/estornadas
- [ ] Idempotência: segundo envio do mesmo `periodo` não dispara (sem `force`)
- [ ] Empresa sem e-mail e sem telefone → `pulados`, sem throw
- [ ] HTML escapa nomes com caracteres especiais

#### Aceite

- No dia 1 (ou via “Enviar agora”), RH da empresa recebe e-mail do **mês anterior** com resumo + detalhe
- Seção de desconto em folha confere com o que o financeiro/RH espera fechar na folha
- Admin gera PDF/XLSX manual de qualquer mês passado
- Cron mensal e semanal aparecem no `vercel.json` e respondem 200 com `CRON_SECRET`
- Reexecução do cron no mesmo mês não spam (unique log)

#### Fora desta PR (evoluções)

- Portal do RH com login
- Assinatura digital do “recibo de descontos” pela empresa
- Comparativo mês a mês no e-mail
- Envio só de desconto em folha (sem vendas à vista) como template separado

#### Arquivos principais

| Ação | Path |
|------|------|
| Create | `src/lib/relatorio-empresa.ts` |
| Create | `src/app/api/cron/relatorio-mensal/route.ts` |
| Create | `src/app/api/relatorios/empresa-mensal/route.ts` |
| Create | `src/app/api/relatorios/empresa-mensal/enviar/route.ts` |
| Create | `src/__tests__/relatorio-empresa-mensal.test.ts` |
| Modify | `src/lib/email.ts` (`sendMonthlyReport`) |
| Modify | `src/app/api/cron/relatorio-semanal/route.ts` (usar lib compartilhada) |
| Modify | `src/app/(app)/relatorios/page.tsx` + client de botões |
| Modify | `src/components/empresas-tab-client.tsx` (toggles) |
| Modify | `vercel.json` (crons mensal + semanal) |
| Modify | `prisma/schema.prisma` + migration |

#### Estimativa

2–4 dias (3 se PDF+XLSX+e-mail+cron+UI; 2 se só e-mail HTML + cron + envio manual).

---

### PR-7 — Cobrança inteligente + 2ª via sob demanda

**Goal:** Sequência de cobrança e self-service de boleto no chat.

**Depende de:** PR-0, PR-4 (templates), pré-atendimento

#### Cobrança

- [ ] Sequência configurável (defaults): D-2 (já existe), D0, D+3, D+7
- [ ] Estender cron `parcela-vencida` ou crons dedicados com tipos de log distintos
- [ ] Após D+7: notificar financeiro/vendedor em vez de só cliente (flag)

#### 2ª via no Zap

- [ ] Intent no pré-atendimento: “boleto”, “2ª via”, “copia boleto”
- [ ] Buscar parcelas em aberto do cliente pelo telefone
- [ ] Enviar `boletoUrl` via Evolution (texto ou mídia)
- [ ] Se várias: listar e pedir número da parcela

#### Aceite

- Cliente pede 2ª via e recebe link sem humano
- Sequência D+3 não reenvia se já pagou (checar `paga`)

---

### PR-8 — Reativação com oferta real

**Goal:** Mensagem de inativos com produtos relevantes, não só texto genérico.

**Depende de:** PR-4; opcional PR-5

#### Implementação

- [ ] No cron `reativacao-inativos`:
  - pegar últimas categorias/produtos do cliente
  - sugerir 1–2 itens em estoque (query Prisma; opcional IA só para redigir)
  - incluir link do catálogo
- [ ] Template `reativacao` com `{produtos_sugeridos}`, `{link_catalogo}`
- [ ] Flag e `whatsappDiasInativo` já existem — manter

#### Aceite

- Mensagem de reativação cita produto alinhado ao histórico quando houver dados

---

### PR-9 — Campanhas segmentadas (disparo manual controlado)

**Goal:** Admin seleciona segmento e dispara campanha única com preview.

**Depende de:** PR-0, PR-4; cuidado com ban — rate limit

#### Backend

- [ ] Model `WhatsAppCampanha`: nome, filtro JSON, template, status, criadoEm, enviados, erros
- [ ] `POST /api/whatsapp/campanhas` — cria e enfileira
- [ ] Worker simples: processar em batches (ex.: 20 msg / minuto) via cron `campanha-processar` ou loop com delay no route (Vercel: preferir cron a cada minuto)
- [ ] Filtros v1: categoria comprada, dias sem compra, empresa parceira, com parcela em aberto (excluir), opt-out sempre excluído
- [ ] Preview: count de destinatários antes de confirmar

#### UI

- [ ] Página admin **Campanhas WhatsApp**
- [ ] Confirmação com contagem
- [ ] Log de resultado

#### Aceite

- Disparo para N clientes respeita opt-out e rate limit
- Campanha fica auditável (quem/quando/quantos)

#### Risco

- Ban do número: documentar limite e recomendar horário comercial + opt-in implícito de clientes ativos

---

### PR-10 — Dashboard de automações + digest interno

**Goal:** Visibilidade do que a automação está fazendo e alertas diários para o time.

**Depende de:** PR-0 (logs/conversas); enriquece com dados das demais

#### Métricas (v1)

- [ ] Página `/relatorios/automacoes` ou card no Dashboard:
  - envios 7d por tipo (`WhatsAppEnvioLog`)
  - conversas IA vs humano
  - propostas criadas via WhatsApp
  - pagamentos confirmados via webhook
  - taxa opt-out
- [ ] Cron `digest-diario` (ex.: 8h): WhatsApp ou notificação para admins com resumo:
  - parcelas que vencem hoje
  - assinaturas pendentes
  - conversas pedindo humano não assumidas
  - estoque baixo top sellers (threshold config)

#### Aceite

- Gestor vê em 1 tela se lembretes/cobrança/IA estão ativos e com volume

---

## 7. Backlog pós-plano (não agendar ainda)

| Item | Motivo de adiar |
|------|-----------------|
| Multi-instância Evolution (comercial vs cobrança) | Complexidade ops |
| Meta Cloud API | Só se ban/volume |
| Voz → venda completa (transcribe + criar) | Depende PR-2 estável |
| CRM tags/score lead | Pode nascer do inbox depois |
| A/B templates | Precisa volume e métricas (PR-10) |
| Negociação de dívida por IA | Risco jurídico/financeiro |

---

## 8. Ordem de merge recomendada

```text
PR-0  Fundação (conversa + opt-out + log)
  ├── PR-1  Inbox
  ├── PR-2  Pedido pelo Zap
  ├── PR-3  Webhook Asaas          ← pode em paralelo com PR-1
  └── PR-4  Templates              ← pode em paralelo com PR-1
        │
        ├── PR-5  Catálogo → Zap   (melhor após PR-2)
        ├── PR-6  Pipeline status  (após PR-2 + PR-3)
        ├── PR-7  Cobrança + 2ª via
        ├── PR-8  Reativação com oferta
        ├── PR-9  Campanhas
        └── PR-10 Dashboard + digest

PR-E1 Relatório mensal empresas parceiras  ← paralelo desde o início
      (não bloqueia nem é bloqueado pelo funil WhatsApp;
       só precisa de SMTP/e-mail RH e dados de venda/parcela)
```

**Caminhos críticos (dois trilhos de valor):**

| Trilho | Sequência | Valor |
|--------|-----------|--------|
| **Venda conversacional** | `PR-0 → PR-1 → PR-2 → PR-3 → PR-6` | Fecha pedido no Zap |
| **B2B / RH parceiros** | `PR-E1` (e registrar cron semanal) | Fecha o mês com a empresa |

Recomendação: se o time de RH/parceiros está cobrando fechamento, **priorizar PR-E1 em paralelo ou antes** do inbox.

---

## 9. Checklist operacional (por fase)

### Antes de ligar em produção

- [ ] Evolution conectada e webhook público registrado (`scripts/registrar-webhook-evolution.js`)
- [ ] `CRON_SECRET` e crons no `vercel.json` (e/ou K8s se aplicável) — **incluir `relatorio-semanal` e `relatorio-mensal`**
- [ ] SMTP validado (`Config` / env) com envio de teste para 1 empresa parceira
- [ ] Empresas com `emailRh` (e opcionalmente `emailsExtras`) cadastrados; fallback `telefoneRh`
- [ ] Clientes vinculados via `empresaParceiraId` (não só texto livre) para o relatório bater certo
- [ ] Asaas sandbox testado; depois produção + webhook
- [ ] Número WhatsApp dedicado (não pessoal do sócio)
- [ ] Flags novas em `0` → ligar uma a uma
- [ ] Amostra de 2–3 clientes internos antes de base toda
- [ ] Validar 1 relatório mensal com RH real (conferência de descontos em folha) antes do disparo em massa

### Observabilidade

- [ ] Logs `[WhatsApp]`, `[PreAtendimento]`, `[AsaasWebhook]` estruturados
- [ ] Contagem de falhas Evolution (já em console; evoluir para log DB na PR-0)
- [ ] Alerta se instância Evolution `close` (endpoint diagnóstico já existe em `/api/whatsapp/diagnostico`)

### LGPD / boa prática

- [ ] Opt-out honrado em **todos** os envios (checklist na review de cada PR)
- [ ] Não enviar marketing para quem só tem parcela em aberto sem relação ativa (regra na PR-9)
- [ ] Conversas acessíveis só a roles autenticados (admin/vendedor)

---

## 10. Definição de pronto (DoD) por PR

1. Spec curta no PR (comportamento atual vs esperado)
2. Testes que falham primeiro nas regras de negócio
3. Flag default off para automação nova de saída em massa
4. Review por subagente / `/review` antes de merge
5. `git pull --rebase` + commit + push
6. Doc atualizada se mudar setup (`docs/WHATSAPP-*.md`)

---

## 11. Métricas de sucesso do programa

| Métrica | Baseline | Meta (90 dias após Fase 1) |
|---------|----------|----------------------------|
| % vendas com origem WhatsApp | ~0 | Definir com negócio (ex.: 15%+) |
| Tempo médio até 1ª resposta | manual | &lt; 1 min (IA) |
| % parcelas com lembrete enviado | parcial | &gt; 90% com telefone válido |
| Confirmações de pagamento automáticas | 0 | &gt; 80% boletos Asaas |
| Opt-outs / reclamações | — | monitorar; &lt; 2% da base/mês |
| Pedidos resolvidos sem humano | 0 | &gt; 30% dos chats com intent de compra |
| **Empresas com relatório mensal entregue no D+1** | 0 automático | **&gt; 95%** das empresas com e-mail/tel e movimento no mês |
| **Reenvios manuais por erro de folha** | n/d | Tendência de queda após 2 ciclos |

---

## 12. Primeira spec a escrever (kickoff)

Ao iniciar implementação, a **primeira tarefa** é a spec detalhada da **PR-0** (schema final + contrato do webhook + lista de pontos que chamam `enviarWhatsAppTexto` para injetar log/opt-out).

Comando sugerido para o time/agent:

```text
Implementar PR-0 do plano docs/superpowers/plans/2026-07-14-automacao-vendas-whatsapp.md
seguindo Spec → TDD → código → review subagente.
```

---

## 13. Mapa B2B — relatórios para empresas parceiras

```text
                    ┌─────────────────────────┐
                    │   EmpresaParceira       │
                    │   emailRh, telefoneRh   │
                    └───────────┬─────────────┘
                                │ clientes.empresaParceiraId
                                ▼
┌──────────────┐    vendas / parcelas DF     ┌──────────────────────────┐
│ Venda Rápida │ ──────────────────────────► │ relatorio-empresa.ts     │
│ + WhatsApp   │                             │ (período semana ou mês)  │
└──────────────┘                             └────────────┬─────────────┘
                                                          │
              ┌───────────────────────────────────────────┼───────────────────────────┐
              ▼                                           ▼                           ▼
   Cron relatorio-semanal                    Cron relatorio-mensal (PR-E1)    UI /relatorios
   (já no código; registrar cron)            Dia 1 · mês anterior             Gerar / Enviar agora
              │                                           │                           │
              └───────────────┬───────────────────────────┴───────────────────────────┘
                              ▼
                 E-mail HTML (+ PDF/XLSX no mensal)
                 fallback WhatsApp (Evolution) no telefoneRh
                              │
                              ▼
                 EmpresaRelatorioEnvio (auditoria / idempotência)
```

| Entrega | Frequência | Canal | Status no plano |
|---------|------------|-------|-----------------|
| Aviso de **nova venda** | Em tempo real | E-mail / WhatsApp RH | Já especificado / parcial no código |
| Relatório **semanal** | 1×/semana | E-mail / WhatsApp | Código pronto; **falta cron no `vercel.json`** (PR-E1) |
| Relatório **mensal** + folha | Dia 1 (mês ant.) | E-mail + anexo + fallback Zap | **PR-E1** |
| Export sob demanda | Manual | PDF/XLSX na tela Relatórios | **PR-E1** estende o que já existe |

---

## 14. Resumo executivo

| O que | Como |
|-------|------|
| Canal cliente | Evolution API (manter) |
| Canal RH empresa | SMTP (primário) + Evolution fallback |
| Cérebro | BFX + IA |
| Dinheiro | Asaas webhook |
| Fase 1 | Inbox + pedido no Zap + pagamento confirmado |
| **Fase 1B** | **Relatório mensal empresas parceiras (PR-E1)** |
| Fase 2 | Templates + catálogo + pipeline |
| Fase 3 | Cobrança, reativação, campanhas, dashboard |

Este plano é a **fonte de verdade** para sequenciar o trabalho de automação de vendas, WhatsApp e **relatórios B2B**. Cada PR deve referenciar o ID (PR-0 … PR-10, **PR-E1**) na descrição do commit/PR do GitHub.
