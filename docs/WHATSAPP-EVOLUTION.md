# Integração WhatsApp com Evolution API

O Sistema BFX usa a **Evolution API** (gratuita e open-source) para envio automático de mensagens WhatsApp.

## Passo a passo

### 1. Subir a Evolution API

```bash
yarn evolution:up
```

Ou manualmente:

```bash
docker compose -f docker-compose.evolution.yml up -d
```

Serviço disponível:
- **API**: http://localhost:8080

### 2. Criar instância e conectar WhatsApp

1. Crie a instância e obtenha o QR Code via API (PowerShell):

```powershell
# Criar instância (integration obrigatório)
Invoke-RestMethod -Uri "http://localhost:8080/instance/create" -Method Post -Headers @{apikey="bfx-evolution-key-change-me"; "Content-Type"="application/json"} -Body '{"instanceName":"bfx","integration":"WHATSAPP-BAILEYS","qrcode":true}'

# Obter QR Code (retorna base64 no response)
Invoke-RestMethod -Uri "http://localhost:8080/instance/connect/bfx" -Method Get -Headers @{apikey="bfx-evolution-key-change-me"}
```

Para gerar um HTML com o QR Code (recomendado - trata diferentes formatos da API e inclui codigo de pareamento):
```powershell
.\scripts\whatsapp-qrcode.ps1
```

Alternativa manual:
```powershell
$r = Invoke-RestMethod -Uri "http://localhost:8080/instance/connect/bfx" -Method Get -Headers @{apikey="bfx-evolution-key-change-me"}
$b64 = if ($r.base64) { $r.base64 } else { $r.qrcode.base64 }
"<html><body><img src='$b64'/><p>Ou codigo: $($r.pairingCode)</p></body></html>" | Out-File whatsapp-qrcode.html -Encoding utf8
```

2. Ou use o Swagger em http://localhost:8080 para testar os endpoints.
3. Escaneie o QR Code retornado com o WhatsApp (recomendado: número dedicado para o negócio).

### 3. Configurar o Sistema BFX

As variáveis já estão no `.env.local`:

```env
EVOLUTION_API_URL="http://localhost:8080"
EVOLUTION_API_KEY="bfx-evolution-key-change-me"
EVOLUTION_INSTANCE="bfx"
```

**Importante:** A API Key deve ser a mesma usada na Evolution API. Por padrão, `AUTHENTICATION_API_KEY` no container usa o valor de `EVOLUTION_API_KEY` do `.env.local`.

Alternativa: configure em **Configurações → WhatsApp** no sistema.

### 4. O que é enviado automaticamente

| Momento | Mensagem |
|---------|----------|
| Ao finalizar venda | Recibo ou link de assinatura (e boleto se gerado) |
| Ao gerar boleto manualmente | Link do boleto |
| 2 dias antes do vencimento | Lembrete da parcela |

## Parar os serviços

```bash
yarn evolution:down
```
