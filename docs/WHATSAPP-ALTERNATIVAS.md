# Alternativas de Conexão WhatsApp

Se o QR Code sempre dá erro "não dá para adicionar dispositivos", tente as opções abaixo.

---

## 1. Manager no navegador

Acesse **http://localhost:8080/manager** e use o QR Code exibido diretamente na página (às vezes funciona melhor que o HTML gerado).

---

## 2. Aguardar e tentar de novo

O WhatsApp pode bloquear temporariamente. Tente:
- Esperar algumas horas
- Usar outra rede (ex.: dados móveis em vez de Wi‑Fi)
- Reiniciar o celular e o app

---

## 3. WPPConnect (outra ferramenta, mesma ideia)

O WPPConnect é outra API open-source que usa o mesmo tipo de conexão. Se a Evolution continuar falhando, você pode trocar:

- Site: https://wppconnect.io
- Docker: `docker run -p 21465:21465 wppconnect-team/wppconnect`

Depois seria necessário adaptar o `src/lib/whatsapp.ts` para a API do WPPConnect.

---

## 4. API Oficial WhatsApp Business (Meta)

A integração oficial não usa QR Code e é mais estável, mas é paga:
- Custo aproximado: R$ 500–2.000/mês
- Aprovação em cerca de 7–15 dias
- Sem risco de bloqueio por uso de protocolo não oficial

---

## Limite de dispositivos

O WhatsApp permite até 4 dispositivos vinculados. Se já tiver 4:
- WhatsApp > Dispositivos vinculados
- Desvincule um dispositivo que não usa mais
