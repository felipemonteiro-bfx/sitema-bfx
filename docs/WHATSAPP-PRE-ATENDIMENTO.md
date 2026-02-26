# Pré-atendimento por IA via WhatsApp

O Sistema BFX pode responder automaticamente a quem envia mensagens no WhatsApp, usando uma IA com acesso ao catálogo de produtos (nome, categoria, preços, estoque). A resposta é enviada de volta via Evolution API.

## Arquitetura

1. **Evolution API** envia um POST para o webhook do BFX quando recebe mensagens (`MESSAGES_UPSERT`)
2. O **BFX** recebe a mensagem em `/api/webhooks/evolution`, verifica se o pré-atendimento está ativado
3. A **IA** (Gemini ou OpenAI) gera uma resposta usando o catálogo de produtos
4. O BFX envia a resposta via Evolution API para o número do cliente

## Pré-requisitos

- Evolution API configurada e instância conectada ao WhatsApp
- Chave Gemini (ou OpenAI) configurada em Configurações → IA
- URL pública do BFX (produção) ou túnel ngrok (desenvolvimento) para receber o webhook

## Passo a passo

### 1. Ativar o pré-atendimento

Em **Configurações → WhatsApp**, marque a opção **Pré-atendimento por IA** e salve.

### 2. Registrar o webhook na Evolution API

A Evolution precisa saber para onde enviar as mensagens recebidas. Use o script:

```bash
# Produção (ex.: Vercel)
WEBHOOK_URL=https://seu-dominio.vercel.app node scripts/registrar-webhook-evolution.js

# Ou passando a URL completa
node scripts/registrar-webhook-evolution.js https://seu-dominio.vercel.app/api/webhooks/evolution
```

**Desenvolvimento local** (Evolution e BFX na mesma máquina):

1. Use ngrok para expor o servidor local:
   ```bash
   ngrok http 3008
   ```

2. Copie a URL do ngrok (ex.: `https://xxxx.ngrok.io`) e registre:
   ```bash
   node scripts/registrar-webhook-evolution.js https://xxxx.ngrok.io/api/webhooks/evolution
   ```

### 3. Variáveis de ambiente

O script usa:

- `WEBHOOK_URL` – URL base do seu app (ou passa como argumento)
- `EVOLUTION_API_URL` – URL da Evolution API (default: `http://localhost:8080`)
- `EVOLUTION_API_KEY` – Chave da Evolution API
- `EVOLUTION_INSTANCE` – Nome da instância (default: `bfx`)

## Comportamento da IA

- Responde em português, de forma amigável e objetiva
- Usa o catálogo de produtos (nome, categoria, preço, estoque) para informar o cliente
- Se o cliente pedir para falar com um humano, informa que um vendedor entrará em contato
- As respostas são curtas (até ~1500 caracteres) para caber bem no WhatsApp

## Custo

Cada mensagem recebida gera uma chamada à API do Gemini (ou OpenAI). Avalie o volume e o custo conforme seu uso.

## Solução de problemas

- **Webhook não recebe requisições**: Confirme que a URL é pública e acessível pela Evolution. Use ngrok em desenvolvimento.
- **IA não responde**: Verifique se a chave Gemini (ou OpenAI) está configurada em Configurações → IA.
- **Evolution não envia ao webhook**: Confirme que o webhook foi registrado com sucesso (`node scripts/registrar-webhook-evolution.js`) e que a instância está conectada.
