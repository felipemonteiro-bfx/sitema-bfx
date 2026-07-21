/**
 * Registra o webhook da Evolution API para enviar mensagens recebidas ao BFX.
 * Uso: WEBHOOK_URL=https://seu-dominio.vercel.app/api/webhooks/evolution node scripts/registrar-webhook-evolution.js
 *      ou: node scripts/registrar-webhook-evolution.js https://seu-dominio.vercel.app/api/webhooks/evolution
 *
 * Para desenvolvimento local, use ngrok: ngrok http 3008
 * Depois: WEBHOOK_URL=https://xxxx.ngrok.io/api/webhooks/evolution node scripts/registrar-webhook-evolution.js
 */
const url = process.env.WEBHOOK_URL || process.argv[2];
const evolutionUrl = process.env.EVOLUTION_API_URL || 'http://localhost:8080';
const apiKey = process.env.EVOLUTION_API_KEY || 'bfx-evolution-key-change-me';
const instance = process.env.EVOLUTION_INSTANCE || 'bfx';

if (!url || !url.startsWith('http')) {
  console.error('Uso: WEBHOOK_URL=<url> node scripts/registrar-webhook-evolution.js');
  console.error('  ou: node scripts/registrar-webhook-evolution.js <url>');
  console.error('Exemplo: node scripts/registrar-webhook-evolution.js https://seu-app.vercel.app/api/webhooks/evolution');
  process.exit(1);
}

const base = url.replace(/\/+$/, '');
const fullWebhookUrl = base.includes('/api/webhooks/evolution')
  ? base
  : base + '/api/webhooks/evolution';
const baseUrl = evolutionUrl.replace(/\/$/, '');
const endpoint = `${baseUrl}/webhook/set/${instance}`;

async function main() {
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: apiKey,
    },
    body: JSON.stringify({
      enabled: true,
      url: fullWebhookUrl,
      webhookByEvents: false,
      webhookBase64: false,
      events: ['MESSAGES_UPSERT'],
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    console.error('Erro ao registrar webhook:', res.status, text);
    process.exit(1);
  }

  const data = await res.json();
  console.log('Webhook registrado com sucesso:', data);
  console.log('URL:', fullWebhookUrl);
  console.log('Eventos: MESSAGES_UPSERT');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
