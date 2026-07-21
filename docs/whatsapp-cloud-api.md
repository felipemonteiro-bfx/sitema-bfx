# Migração WhatsApp: Evolution API → Meta WhatsApp Business Cloud API

## Por quê

A Evolution API usa Baileys, que **emula o app WhatsApp** — é exatamente o vetor de
**banimento do número** que queremos eliminar. A **Cloud API oficial da Meta** é REST puro
(`graph.facebook.com`, Bearer token) e não corre esse risco. Integração via `fetch` puro,
sem SDK npm (mesmo padrão já usado com Asaas/Evolution) — respeita a restrição de não instalar pacotes.

BSPs (Twilio, 360dialog, Gupshup) só adicionam markup de preço e/ou SDK npm. Plano B: **360dialog**,
que expõe API compatível com a da Meta, caso a verificação do Meta Business trave.

## Já implementado neste repositório

- **Schema `Config`** (migração `20260714000000_relatorio_envio_log`): campos
  `whatsappProvider` (default `evolution`), `metaWhatsappToken`, `metaWhatsappPhoneNumberId`,
  `metaWhatsappBusinessId`, `metaWhatsappApiVersion` (default `v21.0`), `metaWebhookVerifyToken`,
  `whatsappFallbackEvolution` (default `1`). Coluna `provider` em `WhatsAppEnvioLog`.
- **Abstração de provider** (código):
  - `src/lib/whatsapp-provider.ts` — interface `WhatsAppProvider` + `resolveWhatsAppProviders()`.
  - `src/lib/providers/whatsapp-evolution.ts` e `whatsapp-meta.ts` — implementações.
  - `src/lib/whatsapp.ts` — agora roteia por `Config.whatsappProvider`, **mantendo as
    assinaturas públicas** (`enviarWhatsAppTexto`, `enviarWhatsAppArquivo`, `getWhatsAppConfig`);
    nova `enviarWhatsAppTemplate`. Padrão = `evolution` → **zero mudança de comportamento**.
  - `src/app/api/webhooks/meta-whatsapp/route.ts` — webhook (GET handshake + POST → pré-atendimento).
- **`.env.example`**: bloco `META_WHATSAPP_*` documentado.

**Para ativar o Meta:** depois de configurar Meta Business + número + templates (abaixo),
setar `Config.whatsappProvider = "meta_cloud"` (fallback Evolution segue ligado via
`whatsappFallbackEvolution = 1`). Validar em runtime antes de desligar o fallback.

## Pré-requisitos operacionais (fora do código)

1. **Meta Business verificado** (Business Manager → Verificação da empresa).
2. **Número dedicado**: o número atual conectado à Evolution **não pode** estar registrado no app
   WhatsApp comum ao migrar. Use um **número novo** para a Cloud API e mantenha a Evolution no número
   antigo durante a transição (fallback).
3. **System User token permanente** (não o token temporário de 24h do painel).
4. **Templates aprovados** para toda mensagem *business-initiated* (ver mapa abaixo).

## Regras de template e janela de 24h (impacto nos fluxos atuais)

| Fluxo (código) | Tipo | Categoria de template | Observação |
|---|---|---|---|
| `cron/lembrete-parcelas` | business-initiated | utility | barato |
| `cron/parcela-vencida` | business-initiated | utility | barato |
| recibo/boleto pós-venda (`venda-rapida/actions`, `boleto-actions`) | business-initiated | utility | barato |
| `cron/aniversario` | business-initiated | marketing | desligável via `whatsappAutoAniversario` |
| `cron/reativacao-inativos` | business-initiated | marketing | desligável |
| `cron/pesquisa-satisfacao` (NPS) | business-initiated | marketing | desligável |
| `cron/agradecimento-pos-venda` | business-initiated | utility/marketing | |
| chatbot `whatsapp-pre-atendimento` | **user-initiated** | texto livre (janela 24h) | **sem template** — só muda o transporte |

Cada texto hardcoded de cron vira um template com variáveis `{{1}}, {{2}}, ...`. O chatbot de
pré-atendimento responde dentro da janela de 24h aberta pela mensagem do cliente, então continua
usando texto livre.

## Design da abstração de código (a implementar em ambiente com build/DB)

Manter as assinaturas públicas de `src/lib/whatsapp.ts` (`enviarWhatsAppTexto`,
`enviarWhatsAppArquivo`, `getWhatsAppConfig`) para **não tocar** nos 8 crons, `email.ts` e
`venda-rapida/actions.ts`.

```
src/lib/whatsapp-provider.ts          # interface + tipos
src/lib/providers/whatsapp-evolution.ts   # move o fetch atual de whatsapp.ts (verbatim)
src/lib/providers/whatsapp-meta.ts        # POST graph.facebook.com/{ver}/{phoneNumberId}/messages
src/lib/whatsapp.ts                    # vira roteador: escolhe provider por Config.whatsappProvider
```

Interface:

```ts
export type WhatsAppSendResult = { ok: boolean; messageId?: string; error?: string; provider: string };

export interface WhatsAppProvider {
  readonly name: "evolution" | "meta_cloud";
  sendText(numeroE164: string, texto: string): Promise<WhatsAppSendResult>;
  sendDocument(numeroE164: string, doc: { url?: string; base64?: string; filename: string; mimetype: string; caption?: string }): Promise<WhatsAppSendResult>;
  sendTemplate(numeroE164: string, tpl: { name: string; language: string; bodyParams: string[]; headerDocumentUrl?: string; fallbackText: string }): Promise<WhatsAppSendResult>;
}
```

- Evolution: `sendTemplate` cai para `sendText(fallbackText)` (Baileys não tem templates).
- Meta: payloads `type: "text" | "template" | "document"`.
- Roteador: seleciona por `Config.whatsappProvider`; se `meta_cloud` falhar e
  `whatsappFallbackEvolution === 1`, tenta Evolution. Grava `provider` em `WhatsAppEnvioLog`.

**Cuidado (motivo de não ter sido feito às cegas):** hoje `getWhatsAppConfig()` retorna `null`
quando a Evolution não está configurada, e os crons checam as flags `autoX` a partir desse retorno.
Ao rotear para Meta, as flags `autoX`/`enabled` (independentes de provider) precisam continuar
disponíveis mesmo sem Evolution configurada — separar "config de automações" de "config de transporte".
Isso exige rodar o app para validar o roteamento; fazer sem build arriscaria quebrar silenciosamente
todas as automações.

Payload de texto Meta (referência):

```ts
await fetch(`https://graph.facebook.com/${apiVersion}/${phoneNumberId}/messages`, {
  method: "POST",
  headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
  body: JSON.stringify({ messaging_product: "whatsapp", to: numeroE164, type: "text", text: { body: texto } }),
});
```

## Templates dos crons (business-initiated)

Mensagens iniciadas pelo sistema (lembrete, cobrança, aniversário, NPS, etc.) exigem
**templates aprovados** no Meta. O registry `src/lib/whatsapp-templates.ts` centraliza os
nomes (`TEMPLATES`) e o helper `comFallback(name, bodyParams, fallbackText)`.

Os crons chamam `enviarWhatsAppTemplate(telefone, comFallback(...))`:
- No **Evolution** (provider padrão): envia o `fallbackText` como texto livre — **comportamento
  idêntico ao atual**.
- No **Meta**: envia o template `name` com os `bodyParams` ({{1}}, {{2}}, ...).

Já convertido como referência: `cron/lembrete-parcelas`. Os demais crons
(`parcela-vencida`, `aniversario`, `agradecimento-pos-venda`, `pesquisa-satisfacao`,
`reativacao-inativos`) seguem o **mesmo padrão** — trocar `enviarWhatsAppTexto(tel, msg)` por
`enviarWhatsAppTemplate(tel, comFallback(TEMPLATES.x, [params], msg))`. Antes de ativar o Meta,
**crie os templates com esses nomes** (ou ajuste os nomes em `TEMPLATES` para os seus) e defina
`META_TEMPLATE_LANG` se não for `pt_BR`.

## Webhook de entrada (chatbot)

`src/app/api/webhooks/meta-whatsapp/route.ts`:
- `GET`: handshake — comparar `hub.verify_token` com `Config.metaWebhookVerifyToken`, devolver `hub.challenge`.
- `POST`: normalizar `entry[].changes[].value.messages[]` para o mesmo shape que
  `src/app/api/webhooks/evolution/route.ts` entrega ao `whatsapp-pre-atendimento.ts`.
  Idempotência por `messages[].id`.

## Sequência de corte (gradual, sem downtime)

1. Merge da abstração com `whatsappProvider = "evolution"` → **zero mudança de comportamento**.
2. Configurar Meta em produção (número novo, token, templates aprovados).
3. Trocar `whatsappProvider = "meta_cloud"` com `whatsappFallbackEvolution = 1`.
4. Monitorar `WhatsAppEnvioLog.provider` e a taxa de erro por alguns dias.
5. Desligar fallback (`whatsappFallbackEvolution = 0`) e remover `deploy/bfx/evolution-api.yaml`
   do `deploy/bfx/kustomization.yaml`.

## Runbook de cutover

Pré-requisitos (não dependem de código, e são o gargalo):

1. Verificação de negócio aprovada na Meta.
2. Número conectado à WABA.
3. Os templates transacionais aprovados: `bfx_lembrete_parcela`,
   `bfx_parcela_vencida`, `bfx_aniversario`, `bfx_agradecimento`, `bfx_nps`,
   `bfx_reativacao`, `bfx_boas_vindas`, `bfx_recibo`, `bfx_assinatura`,
   `bfx_boleto`, `bfx_relatorio_venda`, `bfx_relatorio_semanal`,
   `bfx_relatorio_mensal`. (`bfx_relatorio_empresa` foi aposentado — não criar.)
   A lista completa e os corpos prontos estão em `docs/whatsapp-templates-meta.md`.
   Os nomes devem bater EXATAMENTE com `src/lib/whatsapp-templates.ts`, e a
   contagem de variáveis do corpo deve bater com os `bodyParams` de cada call site.

Passos:

1. Preencher em Config (ou por env): `metaWhatsappToken`,
   `metaWhatsappPhoneNumberId`, `metaWhatsappBusinessId`,
   `metaWebhookVerifyToken`, `metaAppSecret`.
2. Registrar o webhook no App Dashboard apontando para
   `https://<dominio>/api/webhooks/meta-whatsapp`, assinando os campos
   `messages`. O handshake GET deve retornar o challenge.
3. Enviar uma mensagem de teste do número de teste da Meta para o sistema e
   confirmar que aparece em `whatsapp_mensagens` com `direcao = 'in'`.
4. Antes de virar: verificar se há campanha com `status = 'agendada'` e
   `agendada_para` no futuro. Campanhas anteriores à migração têm
   `template_nome` nulo e vão falhar — recriar sobre um template.

   ```sql
   SELECT id, nome, agendada_para FROM campanhas
   WHERE status = 'agendada' AND template_nome IS NULL;
   ```

5. Virar a chave: `UPDATE config SET whatsapp_provider = 'meta_cloud';`
6. Monitorar por alguns dias:

   ```sql
   SELECT status, count(*) FROM whatsapp_mensagens
   WHERE criado_em > now() - interval '24 hours' GROUP BY status;
   ```

   Falhas com `erro_codigo = 131047` significam envio fora da janela de 24h sem
   template válido — indica template não aprovado ou nome divergente.

## Rollback

Entre o passo 5 e a remoção da Evolution:
`UPDATE config SET whatsapp_provider = 'evolution';`

**Isto vale para o código, não para o número.** A migração de número é de mão
única: uma vez que o número entra na Meta, tirá-lo de lá implica
indisponibilidade. Se o problema for com o próprio número, o rollback acima não
resolve.

## Remoção da Evolution (PR separado, dias após a virada)

Só depois de confirmada a estabilidade. Remover:

- `src/lib/providers/whatsapp-evolution.ts`, `src/lib/evolution.ts`
- `src/app/api/webhooks/evolution/route.ts`, `src/app/api/whatsapp/route.ts`
- `src/components/whatsapp-connect.tsx`
- o `fallbackText` de `WhatsAppTemplate` e o `comFallback` correspondente
- `docker-compose.evolution.yml`, `deploy/bfx/evolution-api.yaml`
- `scripts/registrar-webhook-evolution.js`, `scripts/config-whatsapp.js`,
  `scripts/whatsapp-qrcode.ps1`, `scripts/whatsapp-pairing-code.ps1`
- os scripts `evolution:up` / `evolution:down` do `package.json`
- os campos `evolution*` e `whatsappFallbackEvolution` de `Config` (migração)

## Novos gatilhos (recompra, primeira compra, comemorativas)

Três automações adicionais, todas dormentes por padrão (flag `Config` = 0):

- **Recompra** (`whatsappAutoRecompra`, `whatsappDiasRecompra` padrão 30) — cron
  `/api/cron/recompra`. Cliente cuja última compra está na faixa
  [diasRecompra, diasInativo) dias atrás. Não colide com reativação (60+).
- **Primeira compra** (`whatsappAutoPrimeiraCompra`) — cron
  `/api/cron/primeira-compra`. Dia seguinte à 1ª compra do cliente. Quando
  ligada, o agradecimento genérico deixa de enviar a essas vendas.
- **Datas comemorativas** (`whatsappAutoComemorativas`,
  `whatsappMesesAtivoComemorativa` padrão 6) — cron `/api/cron/datas-comemorativas`.
  6 datas fixas (Ano Novo, Dia das Mulheres, Namorados, Cliente, Crianças, Natal).
  Só clientes ativos; respeita a cota de 24h (envia o disponível, loga o excedente).

### Templates a aprovar na Meta (8)

Transacionais (utilitário): `bfx_recompra`, `bfx_primeira_compra`.
Marketing: `bfx_natal`, `bfx_ano_novo`, `bfx_dia_cliente`, `bfx_dia_criancas`,
`bfx_dia_namorados`, `bfx_dia_mulheres`. Os nomes devem bater com o registry em
`src/lib/whatsapp-templates.ts`. Ligar cada flag só após o template aprovado.
