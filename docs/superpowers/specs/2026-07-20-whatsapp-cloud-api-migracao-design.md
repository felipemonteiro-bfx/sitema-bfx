# Migração Evolution API → Meta WhatsApp Cloud API

Data: 2026-07-20

## Objetivo

Substituir a Evolution API (não-oficial, Baileys) pela WhatsApp Business Cloud API
oficial da Meta como único canal de WhatsApp do BFX, eliminando o risco de ban do
número e criando a base de dados de mensagens que o CRM precisa.

## Estado atual

A integração com a Cloud API já está parcialmente construída:

- `src/lib/whatsapp-provider.ts` — abstração com switch `Config.whatsappProvider`
  (`evolution` | `meta_cloud`) e fallback para Evolution
- `src/lib/providers/whatsapp-meta.ts` — `MetaProvider` (texto, documento, template)
- `src/app/api/webhooks/meta-whatsapp/route.ts` — handshake de verificação e recebimento
- `src/lib/whatsapp-templates.ts` — 7 templates registrados com `fallbackText`
- Os 6 crons já chamam `enviarWhatsAppTemplate`

Virar `Config.whatsappProvider` para `meta_cloud` é uma mudança de uma linha. O
trabalho está nas lacunas que fazem essa virada quebrar em produção.

## Lacunas que motivam este trabalho

1. **Envios business-initiated em texto livre falham silenciosamente.**
   `enviarWhatsAppTexto` é usado em venda-rápida (recibo, boas-vindas),
   `boleto-actions.ts`, `campanha-service.ts`, `relatorio-mensal-service.ts` e
   `email.ts`. Fora da janela de 24h a Meta só aceita template aprovado.
2. **Webhook da Meta sem verificação de assinatura.** Não valida
   `X-Hub-Signature-256`, e `/api/webhooks` é isento do middleware de auth
   (`src/middleware.ts`). Qualquer um pode postar uma mensagem falsa, acionar o
   bot de IA e provocar envio de WhatsApp para um número escolhido pelo atacante.
3. **Callbacks de status descartados.** O webhook ignora `statuses`, então
   template rejeitado ou mensagem não entregue são invisíveis.
4. **Sem rastreio da janela de 24h.** Nada registra o último inbound do cliente.
5. **Nenhuma fonte única de histórico.** `WhatsAppEnvioLog` é log de deduplicação
   (chaveado por `clienteId + tipo`); `CampanhaEnvio` cobre só campanhas; envios
   de `email.ts` e do pré-atendimento não são registrados.

## Decisões de escopo

| Decisão | Escolha |
|---|---|
| Destino da Evolution | Remoção completa ao fim da migração |
| Campanhas | Galeria de templates aprovados; sem caixa de texto livre |
| Rastreio de entrega | Completo (`sent → delivered → read → failed`), exposto na UI |
| Modelo de dados | Novo modelo `WhatsAppMensagem` dedicado |
| Fila / outbox | Fora de escopo — throttle simples no `campanha-service` |

Volume de campanha confirmado com o usuário: até ~1.000 destinatários, nunca acima.

### Fora de escopo

- Mídia inbound (imagem, áudio, documento enviados pelo cliente). O
  pré-atendimento segue tratando apenas `type === "text"`; `corpo` recebe um
  marcador (`[imagem recebida]`) e a mídia não é baixada.
- Caixa de entrada de conversas na UI. `WhatsAppMensagem` é a fundação dela, mas
  a interface é trabalho posterior.
- Multi-número / multi-tenancy. `Config` é uma linha global única e o sistema
  assume um número de WhatsApp para toda a instalação.
- Migração de campanhas antigas para templates (ver abaixo).

## Modelo de dados

### Novo: `WhatsAppMensagem`

| Campo | Tipo | Nota |
|---|---|---|
| `id` | Int PK | |
| `clienteId` | Int? | nullable — inbound de número desconhecido |
| `telefone` | String | E.164 normalizado; sobrevive sem cliente vinculado |
| `direcao` | String | `in` \| `out` |
| `waMessageId` | String? @unique | id da Meta; correlação com callbacks |
| `origem` | String | `cron` \| `campanha` \| `venda` \| `boleto` \| `relatorio` \| `pre_atendimento` \| `manual` |
| `templateNome` | String? | null quando é texto livre |
| `corpo` | String | texto renderizado, para histórico legível |
| `status` | String | `pendente` \| `enviado` \| `entregue` \| `lido` \| `falhou` |
| `erroCodigo` | Int? | código de erro da Meta |
| `erroMsg` | String? | |
| `criadoEm` | DateTime | |
| `atualizadoEm` | DateTime | |

Índices: `[clienteId, criadoEm]`, `[waMessageId]`, `[status, criadoEm]`,
`[telefone, direcao, criadoEm]`.

### Alterações em modelos existentes

- `CampanhaEnvio` recebe `mensagemId Int?` (FK para `WhatsAppMensagem`). O status
  por destinatário passa a vir de lá.
- `WhatsAppEnvioLog` permanece inalterado — segue sendo apenas o guarda de
  deduplicação dos crons. Sem migração de dados.
- `Config` recebe `metaAppSecret` (validação de `X-Hub-Signature-256`).
  `metaWhatsappBusinessId` já existe e serve como WABA ID.

### Janela de 24h

Derivada, não armazenada:
`MAX(criadoEm) WHERE telefone = ? AND direcao = 'in'`. Evita campo denormalizado
fora de sincronia.

## Camada de envio

`src/lib/whatsapp.ts` é o único lugar que decide texto vs. template e registra a
mensagem. Nenhum call site fala com provider direto.

Nova função `enviarWhatsApp(destino, msg)` — recebe sempre um template (nome,
params, corpo renderizado) e a `origem`:

1. Normaliza o telefone (`normalizarTelefone`, sem mudança)
2. Consulta a janela de 24h
3. Dentro da janela → texto livre
4. Fora da janela → template aprovado
5. Grava `WhatsAppMensagem` com `status = pendente`; atualiza para `enviado` +
   `waMessageId` quando a Meta responde 200
6. Falha → `status = falhou` com o código de erro. **Sem fallback** — a Evolution
   não existe mais
7. Fora da janela e sem template aplicável → `falhou` com motivo
   `janela_expirada`, em vez de tentar e receber erro opaco da Meta

O passo 3 é o que mantém o pré-atendimento por IA funcionando: o bot responde
quem acabou de escrever, logo está sempre dentro da janela, e resposta gerada por
IA não cabe em template.

### Templates a criar

Já registrados em `whatsapp-templates.ts` (7): `bfx_lembrete_parcela`,
`bfx_parcela_vencida`, `bfx_aniversario`, `bfx_agradecimento`, `bfx_nps`,
`bfx_reativacao`, `bfx_boas_vindas`.

Novos (3): `bfx_recibo`, `bfx_boleto`, `bfx_relatorio_empresa` — todos categoria
utilitária (mais barata e de aprovação mais fácil que marketing). Os templates de
campanha são de marketing e criados conforme a necessidade do negócio.

### Refactor pontual: `getWhatsAppConfig()`

Hoje retorna dados de conexão da Evolution (`baseUrl`, `apiKey`, `instance`) e as
flags `autoX` no mesmo objeto. Os crons chamam apenas pelas flags. Com a Evolution
fora, os campos de conexão viram lixo.

Separar em `getWhatsAppFlags()` (flags de automação) e deixar a resolução de
conexão apenas em `whatsapp-provider.ts`.

## Webhook

Endpoint único `/api/webhooks/meta-whatsapp`, três responsabilidades em funções
distintas.

### Verificação de assinatura

Todo POST valida `X-Hub-Signature-256`: HMAC-SHA256 do corpo **cru** com
`metaAppSecret`, comparado em tempo constante (`crypto.timingSafeEqual`).
Assinatura ausente ou inválida → 401, nada é processado.

O HMAC é sobre os bytes exatos enviados pela Meta. O handler lê `await req.text()`
uma vez, valida, e só então faz `JSON.parse` — `req.json()` seguido de
re-serialização quebra a assinatura.

Nota de implementação: o `CLAUDE.md` do projeto proíbe o padrão `RegExp exec`
(hook de segurança bloqueia a edição). Usar `.split()` quando precisar de parsing.

### Mensagens recebidas

Grava `WhatsAppMensagem` com `direcao = in` **antes** de consultar
`whatsappPreAtendimento` — o inbound alimenta a janela de 24h e o histórico
independentemente do bot estar ligado. O comportamento atual (sair cedo com 200 e
descartar) é invertido.

### Callbacks de status

Casa `statuses[].id` com `waMessageId` e avança o status. Duas defesas:

- **Fora de ordem** — `delivered` pode chegar antes de `sent`. O status só avança
  na progressão `pendente → enviado → entregue → lido`, nunca retrocede.
  `falhou` é terminal.
- **Corrida na escrita** — o callback pode chegar antes de o `waMessageId` ser
  gravado. Não encontrando a mensagem, responde 200 e ignora (a Meta reentrega);
  não cria registro órfão.

### Códigos de resposta

Sempre 200, exceto assinatura inválida (401). Erro interno não pode virar 5xx: a
Meta reentrega com backoff e, com falhas repetidas, desativa a inscrição do
webhook. Erro é logado e engolido.

### Idempotência

`waMessageId` é `@unique`, então reentrega da Meta não duplica inbound — sem isso
a IA responderia duas vezes ao mesmo cliente.

## Campanhas

### Origem da lista de templates

Buscados na Graph API (`GET /{wabaId}/message_templates`), que devolve nome,
categoria, idioma, status e a estrutura de componentes com as variáveis. Sem cópia
manual em código, que sairia de sincronia com o que está aprovado.

Cache de ~5 min no servidor, com botão de atualizar na UI. Apenas templates com
`status = APPROVED` aparecem.

### UI

A caixa de texto livre dá lugar a um seletor de template. Escolhido o template, o
formulário se monta a partir das variáveis dele — um campo por `{{n}}`, aceitando
texto fixo ou placeholder de cliente (`{nome}`, já suportado por `renderMensagem`).
Preview renderiza o corpo com o primeiro cliente do segmento.

Seleção de segmento (`filtroJson`), agendamento (`agendadaPara`) e o cron
`campanhas-agendadas` não mudam. O payload da campanha passa de `mensagem: string`
para `templateNome` + mapa de variáveis.

### Campanhas antigas

As existentes têm texto livre e ficam somente-leitura no histórico — não são
migradas nem apagadas. **Antes do cutover, verificar se alguma está agendada para
o futuro**; se estiver, precisa ser recriada sobre um template.

### Limite de mensagens (messaging tier)

Um número novo começa em **1.000 clientes únicos contatados por 24h**, somando
todos os envios — campanha, lembrete de parcela, aniversário, NPS, cobrança. Com
campanhas chegando perto de mil, o teto é apertado nos primeiros meses. Sobe para
10.000 automaticamente com histórico de qualidade boa.

Duas defesas:

- **Verificação antes do disparo** — o `campanha-service` conta contatos únicos
  das últimas 24h em `WhatsAppMensagem` e avisa na UI se a campanha não couber,
  antes de começar.
- **Prioridade transacional** — folga configurável (padrão: 150 contatos)
  reservada, que campanhas não consomem, para não sufocar lembrete de parcela e
  cobrança.

Throttle simples entre envios no `campanha-service`; sem fila. Excedentes ficam
`falhou` com o código de erro correspondente, visíveis na UI.

## Testes

Todos com `fetch` mockado, sem chamar a Meta. `src/__tests__/whatsapp-provider.test.ts`
(Vitest) serve de modelo. Conforme o `CLAUDE.md` do projeto, cada teste vem antes
da implementação correspondente (TDD).

- Decisão janela/template: inbound recente → texto; sem inbound → template; sem
  inbound e sem template → `falhou` com `janela_expirada`
- Assinatura do webhook: válida passa; inválida, ausente ou corpo adulterado → 401
- Status fora de ordem: `delivered` antes de `sent` não retrocede; `falhou` é terminal
- Idempotência: mesmo `waMessageId` duas vezes → um registro, IA acionada uma vez
- Cota: campanha que não cabe nas 24h é barrada antes do primeiro envio

## Cutover

Todo o código vai para produção com `whatsappProvider` ainda em `evolution` — nada
muda até a virada.

1. Schema, camada de envio e webhook, com Evolution ativa (`MetaProvider` dormente)
2. Número conectado na Meta e os 10 templates transacionais submetidos — **passo mais lento,
   não depende de código**
3. Webhook registrado no dashboard, `metaAppSecret` configurado
4. Teste ponta a ponta com o número de teste da Meta
5. Virada: `Config.whatsappProvider = "meta_cloud"`
6. **PR separado, dias depois:** remover `EvolutionProvider`, `src/lib/evolution.ts`,
   `/api/webhooks/evolution`, `whatsapp-connect.tsx`, `docker-compose.evolution.yml`,
   `deploy/bfx/evolution-api.yaml`, os scripts `registrar-webhook-evolution.js` /
   `whatsapp-qrcode.ps1` / `whatsapp-pairing-code.ps1`, e os campos `evolution*` de
   `Config`

Estado atual da conta Meta (informado pelo usuário): verificação de negócio feita
ou em análise; número ainda não conectado; nenhum template aprovado. O passo 2 é o
gargalo.

## Rollback

Entre os passos 5 e 6 o rollback é reverter uma linha em `Config` — a Evolution
continua de pé. Por isso o passo 6 é PR separado, dias depois, e não no mesmo
commit da virada.

**Risco que o desenho não elimina:** a migração de número é de mão única. Uma vez
que o número entra na Meta, voltar para a Evolution exige tirá-lo de lá, com
indisponibilidade no meio. O rollback de um clique vale para o código; se o
problema for com o próprio número, não vale.
