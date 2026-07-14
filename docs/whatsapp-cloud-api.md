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
