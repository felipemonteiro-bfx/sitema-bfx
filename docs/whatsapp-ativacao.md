# Ativação da WhatsApp Cloud API — runbook de SQL

Rodar **no banco de PRODUÇÃO**, com os templates já aprovados na Meta. A tabela
`config` tem uma única linha, então cada `UPDATE config SET ...` afeta essa linha.

⚠️ **A virada de provider é de mão única para o número.** Depois que o número
entra na Meta, voltar para a Evolution exige tirá-lo de lá, com indisponibilidade.

---

## Estágio 0 — Credenciais e webhook (antes de qualquer envio)

Preencher com os valores da sua conta Meta (App Dashboard / WhatsApp Manager):

```sql
UPDATE config SET
  meta_whatsapp_token            = '<TOKEN_PERMANENTE_DO_SYSTEM_USER>',
  meta_whatsapp_phone_number_id  = '<PHONE_NUMBER_ID>',
  meta_whatsapp_business_id      = '<WABA_ID>',
  meta_whatsapp_api_version      = 'v21.0',
  meta_webhook_verify_token      = '<VERIFY_TOKEN_QUE_VOCE_ESCOLHER>',
  meta_app_secret                = '<APP_SECRET_DO_APP_META>';
```

Depois, no App Dashboard, registrar o webhook:
- Callback URL: `https://<seu-dominio>/api/webhooks/meta-whatsapp`
- Verify Token: o mesmo `meta_webhook_verify_token` acima
- Assinar o campo `messages`

O handshake (GET) deve retornar o challenge. Se der 403, o verify token não bate.

**Teste antes de virar:** mande uma mensagem do número de teste para o sistema e
confirme que aparece:

```sql
SELECT telefone, direcao, corpo, criado_em
FROM whatsapp_mensagens ORDER BY criado_em DESC LIMIT 5;
```

Tem que aparecer uma linha com `direcao = 'in'`. Se aparecer, o webhook e a
assinatura estão OK.

---

## Estágio 1 — Virar o provider para a Meta

```sql
UPDATE config SET
  whatsapp_provider = 'meta_cloud',
  whatsapp_auto_enabled = 1;
```

A partir daqui, os envios saem pela Cloud API. O que já estava ligado (recibo,
boleto, lembrete — ligados por padrão) passa a usar template fora da janela de 24h.

**Rollback (só do código, não do número):** `UPDATE config SET whatsapp_provider = 'evolution';`

---

## Estágio 2 — Ligar o transacional (baixo volume, seguro)

Estes disparam por evento (venda, parcela, aniversário do dia) — volume diário
baixo, cabem no tier inicial sem problema:

```sql
UPDATE config SET
  whatsapp_auto_recibo         = 1,
  whatsapp_auto_boleto         = 1,
  whatsapp_auto_lembrete       = 1,
  whatsapp_auto_inadimplencia  = 1,
  whatsapp_auto_agradecimento  = 1,
  whatsapp_auto_nps            = 1,
  whatsapp_auto_boas_vindas    = 1,
  whatsapp_auto_primeira_compra = 1,
  whatsapp_auto_aniversario    = 1;
```

Monitorar por 1–2 dias:

```sql
SELECT status, count(*) FROM whatsapp_mensagens
WHERE criado_em > now() - interval '24 hours' GROUP BY status;
```

Falha com `erro_codigo = 131047` = envio fora da janela sem template válido →
template não aprovado ou nome divergente. Falha de tier aparece com outro código.

---

## Estágio 3 — Ligar os de varredura (⚠️ risco de estourar o tier)

**Não ligar junto com o Estágio 2.** `reativacao` (base 60+ dias) e `recompra`
(base 30–59 dias) podem varrer centenas/milhares de clientes na primeira
execução e estourar o teto de **1.000 contatos únicos/24h** do tier inicial.

Recomendação: ligar **um de cada vez**, depois que o tier subir para 10.000
(acontece automático com histórico de qualidade bom, alguns dias/semanas):

```sql
-- primeiro só a recompra, observar 1 dia:
UPDATE config SET whatsapp_auto_recompra = 1;

-- depois a reativação:
UPDATE config SET whatsapp_auto_reativacao = 1;

-- comemorativas: só dispara nas 6 datas fixas, para clientes ativos.
-- Pode ligar quando quiser; conta na mesma cota de 24h no dia da data:
UPDATE config SET whatsapp_auto_comemorativas = 1;
```

Parâmetros (opcionais, já têm padrão): `whatsapp_dias_recompra` (30),
`whatsapp_dias_inativo` (60), `whatsapp_meses_ativo_comemorativa` (6).

---

## Estágio 4 — Pré-atendimento por IA (opcional)

Liga a IA responder quem manda mensagem no WhatsApp (responde dentro da janela
de 24h, texto livre):

```sql
UPDATE config SET whatsapp_pre_atendimento = 1;
```

---

## Depois de estável — aposentar a Evolution

Só depois de dias estável na Meta. Ver a seção "Remoção da Evolution" em
`docs/whatsapp-cloud-api.md` (PR separado que remove código, compose, k8s e os
campos `evolution*` do Config).

## Referência de templates

Os 21 templates e seus corpos estão em `docs/whatsapp-templates-meta.md`. Cada
flag acima só deve ser ligada depois do template correspondente APROVADO na Meta.
