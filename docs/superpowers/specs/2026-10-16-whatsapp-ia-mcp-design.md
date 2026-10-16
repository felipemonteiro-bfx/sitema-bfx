# Assistente de IA do WhatsApp usando o MCP da BFX

Data: 2026-10-16 · Trabalho **só local** (nada de push/PR no GitHub do Felipe) · Decisões do André
na mesma data: cliente MCP de verdade, modelo = LiteLLM das Configurações, IA com MCP substitui as
regras no modo 2.

## Hoje (medido no código e, só leitura, na config de produção)

- Produção está em `whatsappPreAtendimento = 2` ("gratuito"), `whatsappAutoEnabled = 1`, provedor
  `meta_cloud`, `aiProvider = litellm`.
- **Modo 2** (`src/lib/whatsapp-atendimento-gratuito.ts`, chamado pelo webhook
  `api/webhooks/meta-whatsapp`): sem IA. Responde por regex (`respostaPorRegras`), consulta compras
  e parcelas direto no banco (`consultarRespostaManager`, que reaproveita `resolverEscopo` do MCP mas
  **não** o protocolo) e busca estoque por termo. Guardas antes de responder: config, telefone
  válido, janela de 24h, provedor Meta, SAIR/PARAR, pausa (`inicioDaPausa`), cliente assumido por
  humano, resposta manual/pedido de atendente recente; depois, lock por telefone + dedupe de 24h +
  registro `origem: pre_atendimento` + envio (botões no menu de saudação).
- **Modo 1** (`src/lib/whatsapp-pre-atendimento.ts`): IA com **Gemini fixo no código**, histórico e
  catálogo colados no prompt, sem tools, sem as guardas do modo 2. Fora do escopo desta mudança.
- **MCP da BFX** (`src/app/api/mcp/agente/route.ts` + `src/lib/mcp-agente.ts`, spec em
  `docs/MCP-AGENTE-SPEC.md`): JSON-RPC 2.0 sem sessão; `Authorization: Bearer` JWT HS256 com
  `MCP_AGENTE_SECRET`, `sub` = telefone, `aud = mcp-bfx`, `exp` curto; tools `minhas_parcelas`,
  `meu_limite`, `meus_boletos`, `catalogo_produtos`; **nenhuma tool aceita id de cliente**; o
  `initialize` devolve `instructions` com o estado de identificação. `MCP_AGENTE_SECRET` já existe
  em produção. Nunca foi usado pelo assistente interno.
- O pacote `ai` 6 instalado **não** traz cliente MCP (`@ai-sdk/mcp` não está instalado e não pode
  ser instalado). `jsonSchema`/`tool`/`generateText` estão disponíveis.

## Esperado

No modo 2, depois de TODAS as guardas atuais (inalteradas), a resposta passa a vir de um
**assistente de IA que usa o MCP da BFX como cliente MCP real**:

1. **Regras que ficam determinísticas** (não vão para a IA): mensagem vazia/mídia (`[`), pedido de
   humano/atendente/SAIR/PARAR (bot se cala, como hoje), e a saudação/menu (mantém os botões
   "Ver produtos / Meu pedido / Falar com a equipe").
2. **Todo o resto** vai para o assistente:
   - Assina um JWT por conversa (`sub` = telefone do webhook, `aud = mcp-bfx`, `exp` = 5 min) com
     `MCP_AGENTE_SECRET`.
   - Cliente MCP mínimo (`src/lib/mcp-cliente.ts`, só `fetch`): `initialize` → guarda
     `instructions`; `notifications/initialized`; `tools/list`; `tools/call`. URL em
     `MCP_AGENTE_URL` (padrão: o próprio app, `http://127.0.0.1:${PORT||3000}/api/mcp/agente`).
   - `generateText` com o modelo LiteLLM das Configurações (`litellmUrl/Key/Model`, mesma leitura
     de `runAi`), system prompt = persona curta da BFX para WhatsApp + `instructions` do servidor;
     tools = as do `tools/list`, convertidas com `jsonSchema`, cada `execute` chamando `tools/call`.
     Limite de passos (ex.: 4) e timeout total (ex.: 20 s).
   - Saída: texto puro, até `MAX_RESPONSE_CHARS`, sem markdown pesado.
3. **Falha fechada para o determinístico:** sem `MCP_AGENTE_SECRET`, sem LiteLLM configurado,
   timeout, erro de protocolo ou resposta vazia → usa a resposta de hoje (`consultarRespostaManager`
   / estoque / `respostaPorRegras` / "Não consegui identificar…"). O cliente nunca fica sem resposta
   por causa da IA, e nunca recebe erro técnico.
4. **Liga/desliga** sem deploy: campo novo `Config.whatsappIaMcp` (boolean, default `false`,
   migração) exposto nas Configurações do WhatsApp. Desligado = comportamento atual, idêntico.

## Segurança

- Escopo do cliente continua **só** no servidor MCP (identidade no token, tools sem id). O
  assistente não ganha caminho novo para dado de outro cliente.
- Texto do cliente é entrada não confiável (prompt injection): as tools são só leitura e escopadas;
  não há tool de escrita; o modelo não vê segredo, token nem `instrucao_interna_nao_repetir` (o
  erro de identificação com dois campos já existe no servidor — repassar só `para_o_cliente`).
- JWT com `exp` de minutos, assinado por mensagem processada; segredo nunca logado.
- Não reaproveitar `SESSION_SECRET` (decisão já registrada na spec do MCP).

## Fora de escopo

Modo 1 (Gemini) e Evolution; tools novas no MCP; histórico de conversa no contexto além da mensagem
atual (avaliar depois); memória entre conversas; qualquer push/PR/deploy.

## Testes (TDD)

- `mcp-cliente`: initialize/tools/list/tools/call contra `fetch` mockado; Bearer presente; erro
  JSON-RPC vira exceção tratada; timeout.
- JWT: claims `sub/aud/exp`, HS256, verificável por `verificarToken` do servidor.
- Assistente: tools vêm do `tools/list` (nenhuma com `clienteId`); `instructions` entram no system;
  limite de passos; texto truncado; fallback em cada falha.
- Guardas do modo 2 inalteradas (testes atuais verdes) e, com `whatsappIaMcp=false`, saída idêntica
  à de hoje.
- Ponta a ponta local: o próprio `/api/mcp/agente` rodando no dev, LiteLLM mockado, sem enviar
  WhatsApp.
