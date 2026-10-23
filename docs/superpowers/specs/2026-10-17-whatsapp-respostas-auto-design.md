# Respostas automáticas do WhatsApp: um controle, uma decisão

Data: 2026-10-17 · Trabalho só local · Artboard aprovado: `ConfigRespostasAuto.dc.html` (lado "Proposta").

## Hoje

Três controles decidem uma coisa só: o botão geral de envios (`whatsappAutoEnabled`), o seletor
"Respostas automáticas" (0 desligado, 2 gratuito por regras, 1 IA externa) e a caixa "Assistente de
IA com MCP" (`whatsappIaMcp`). A IA com MCP só responde com as três opções certas e a tela não diz se
ela está respondendo. O valor 1 (gateway antigo) somado à caixa gera duas respostas ao cliente. Sem
modelo do LiteLLM a caixa fica marcada e a IA nunca responde, sem aviso.

## Esperado

- Um Switch "Responder clientes automaticamente", gravado em `whatsappPreAtendimento`
  (ligado = 2, desligado = 0). Schema intacto.
- A IA depende só de haver modelo (URL + chave do LiteLLM e segredo `MCP_AGENTE_SECRET` de 32+
  caracteres). `whatsappIaMcp` deixa de ser lido e gravado; a coluna fica (comentário "obsoleto").
- Linha de estado (`role="status"`, `aria-live="polite"`) mostra o que realmente acontece. Prioridade:
  desligado, envios gerais desligados, provedor que não é Meta, sem LiteLLM, sem segredo MCP, IA
  respondendo (com o modelo; vazio mostra o modelo de reserva `gpt-4o`, o mesmo do runtime).
- Tabela "Quem responde cada mensagem" com 4 linhas; a 2ª diz "IA com MCP", "Regras (sem modelo)" ou
  "Ninguém".
- O servidor calcula o estado e passa ao componente cliente só `{tom, titulo, texto, acao, modelo}`;
  a chave do LiteLLM nunca chega ao cliente. Ao desligar o Switch a linha muda na hora.

## Lib pura (`src/lib/whatsapp-respostas-auto.ts`)

- `respostasAutoLigadas(cfg)`: verdadeiro para 1 e 2 (banco não migrado continua funcionando).
- `disponibilidadeIa(cfg, env)`: `{disponivel, motivo: 'sem_litellm' | 'sem_segredo_mcp' | null, modelo}`.
- `estadoRespostasAuto({ligado, masterLigado, provedorMeta, ia})`: `{tom, titulo, texto, acao?}`.

Usadas em `modeloDaConfig`, `processarAtendimentoGratuito`, no `iaAposResposta` do webhook Meta, na
tela de atendimento e na página de configurações.

## Arquivos

`whatsapp-assistente-ia.ts`, `whatsapp-atendimento-gratuito.ts`, `meta-whatsapp/route.ts`,
`evolution/route.ts`, `crm/atendimento/tela-atendimento.tsx`, `configuracoes/page.tsx`, novo
`components/whatsapp-respostas-auto.tsx`, `prisma/schema.prisma` (só comentário),
`scripts/sql/2026-10-17-whatsapp-respostas-auto.sql`.

## Webhooks

O valor 1 deixa de chamar `processarMensagemRecebida` (Meta e Evolution). O Evolution só registra a
pausa `fromMe`. A função fica na lib, sem uso.

## Migração de dados

`UPDATE config SET whatsapp_pre_atendimento = 2, whatsapp_ia_mcp = true WHERE whatsapp_pre_atendimento IN (1,2);`
Idempotente; sem pasta nova em `prisma/migrations/`. Roda à mão nos bancos locais, com antes e depois.

## Deploy (ordem obrigatória)

A IA interna liga sozinha, então o gateway externo do mcp-bfx precisa estar desligado antes, ou o
cliente recebe duas respostas. Ordem: 1) desligar o gateway; 2) rodar o script SQL; 3) deploy. No
estado "IA respondendo" a tela mantém o aviso permanente: "Confira que o gateway externo do mcp-bfx
está desligado, para o cliente não receber duas respostas."

## Provedor (revisão)

`situacaoProvedor` repete a regra de `resolveWhatsAppProviders`: meta_cloud (config ou
`WHATSAPP_PROVIDER`) com token e número (config ou env). Sem credencial o estado é âmbar ("Falta
configurar o token ou o número da API oficial da Meta", link "Configurar conexão"). A tela de
atendimento usa a mesma função. Sem URL/chave do LiteLLM: "Falta a URL ou a chave do LiteLLM" com o
link "Configurar LiteLLM" (`#litellm-config`). O título do webhook muda com o provedor.

## Fica de fora

Botão geral de envios (continua, também desliga campanhas e lembretes); remoção da coluna
`whatsapp_ia_mcp`; remoção de `processarMensagemRecebida`.
