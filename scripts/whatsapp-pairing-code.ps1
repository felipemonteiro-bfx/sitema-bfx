# Obtem APENAS o codigo de pareamento - use quando o QR Code der erro
# Fluxo: WhatsApp no celular > Dispositivos vinculados > Vincular com numero de telefone > Digite o codigo
#
# Uso: .\scripts\whatsapp-pairing-code.ps1
#      .\scripts\whatsapp-pairing-code.ps1 -Number "5511999999999"  (opcional: numero com DDI)

param(
    [string]$Number = ""
)

$apiUrl = "http://localhost:8080"
$apiKey = "bfx-evolution-key-change-me"
$instance = "bfx"

$uri = "$apiUrl/instance/connect/$instance"
if ($Number) { $uri += "?number=$Number" }

try {
    $response = Invoke-RestMethod -Uri $uri -Method Get -Headers @{ apikey = $apiKey }
} catch {
    Write-Host "Erro. Verifique se a Evolution API esta rodando (porta 8080) e a instancia '$instance' existe." -ForegroundColor Red
    Write-Host $_.Exception.Message
    exit 1
}

$pairingCode = $response.pairingCode
if (-not $pairingCode -and $response.qrcode.pairingCode) { $pairingCode = $response.qrcode.pairingCode }

if (-not $pairingCode) {
    Write-Host "Codigo de pareamento nao retornado pela API." -ForegroundColor Yellow
    Write-Host "Resposta: $($response | ConvertTo-Json -Depth 3)"
    exit 1
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "  CODIGO DE PAREOAMENTO: $pairingCode" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "No WhatsApp (celular):"
Write-Host "  1. Abra Configuracoes"
Write-Host "  2. Dispositivos vinculados"
Write-Host "  3. Vincular com numero de telefone"
Write-Host "  4. Digite o codigo: $pairingCode"
Write-Host ""
Write-Host "(O codigo expira em ~60 segundos - execute o script de novo se precisar)" -ForegroundColor Yellow
