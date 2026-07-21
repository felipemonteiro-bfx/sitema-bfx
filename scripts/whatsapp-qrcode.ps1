# Gera HTML com QR Code e codigo de pareamento para Evolution API
# Uso: .\scripts\whatsapp-qrcode.ps1
# Requer: instancia "bfx" criada (instance/create com integration WHATSAPP-BAILEYS)

$apiUrl = "http://localhost:8080"
$apiKey = "bfx-evolution-key-change-me"
$instance = "bfx"

try {
    $response = Invoke-RestMethod -Uri "$apiUrl/instance/connect/$instance" -Method Get -Headers @{ apikey = $apiKey }
} catch {
    Write-Host "Erro ao conectar. Verifique se a Evolution API esta rodando e a instancia '$instance' existe." -ForegroundColor Red
    Write-Host $_.Exception.Message
    exit 1
}

# Base64 pode vir em base64, qrcode.base64 ou no create response
$base64 = $null
if ($response.base64) { $base64 = $response.base64 }
elseif ($response.qrcode.base64) { $base64 = $response.qrcode.base64 }

$pairingCode = $response.pairingCode
if (-not $pairingCode -and $response.qrcode.pairingCode) { $pairingCode = $response.qrcode.pairingCode }

$htmlPath = Join-Path (Join-Path $PSScriptRoot "..") "whatsapp-qrcode.html"

$imgHtml = ""
if ($base64) {
    $imgHtml = "<img src=`"$base64`" alt=`"QR Code`" style=`"max-width:350px; image-rendering: pixelated; image-rendering: crisp-edges;`">"
} else {
    $imgHtml = "<p style='color:#c00'>QR Code nao retornado pela API. Use o codigo de pareamento abaixo ou acesse <a href='$apiUrl/manager'>$apiUrl/manager</a></p>"
}

$pairingHtml = ""
if ($pairingCode) {
    $pairingHtml = @"
<div style="margin-top:1.5rem; padding:1rem; background:#f0fdf4; border-radius:8px; font-size:1.2rem;">
  <strong>Ou use o codigo de pareamento:</strong><br>
  <code style="font-size:1.5rem; letter-spacing:0.2em; font-weight:bold;">$pairingCode</code>
  <p style="font-size:0.85rem; margin-top:0.5rem; color:#166534;">WhatsApp > Dispositivos vinculados > Vincular com numero de telefone > Digite o codigo</p>
</div>
"@
}

$html = @"
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>WhatsApp - Conectar bfx</title>
  <style>
    body { font-family: system-ui, sans-serif; text-align: center; padding: 2rem; max-width: 500px; margin: 0 auto; }
    h1 { font-size: 1.25rem; }
    p { color: #64748b; font-size: 0.9rem; }
    .warn { background: #fef3c7; padding: 0.75rem; border-radius: 8px; margin-top: 1rem; font-size: 0.85rem; }
  </style>
</head>
<body>
  <h1>Escaneie com WhatsApp</h1>
  <p>Abra o WhatsApp no celular > Dispositivos vinculados > Vincular dispositivo</p>
  $imgHtml
  $pairingHtml
  <div class="warn">O QR Code expira em ~60 segundos. Se expirou, execute o script novamente.</div>
</body>
</html>
"@

$html | Out-File -FilePath $htmlPath -Encoding UTF8 -NoNewline
Write-Host "Arquivo gerado: $htmlPath"
Write-Host "Abra no navegador para escanear o QR Code."
if ($pairingCode) {
    Write-Host "Codigo de pareamento: $pairingCode"
}
Start-Process $htmlPath
