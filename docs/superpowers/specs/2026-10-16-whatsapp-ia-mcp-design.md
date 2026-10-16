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


## Revisão do Grok (16/10) e decisões do André — o que muda no desenho

Decisões do André: dados do cliente podem ir ao LiteLLM da Softlive (`ai.softlive.dev`); a IA
**não** informa preço (mantém "a equipe confirma preço e condições"); **existe um gateway externo
ativo** usando o `mcp-bfx` no mesmo número.

Correções incorporadas (Crítico/Importante do parecer):

1. **Ordem:** a IA entra no MESMO ponto onde hoje roda `consultarRespostaManager` — depois de config,
   janela 24h, provedor, SAIR/PARAR, pausa, takeover e resposta manual/atendente recentes. Teste
   negativo: em cada guarda, nem `fetch` ao MCP nem LiteLLM são chamados.
2. **Webhook não espera a IA:** o processamento do modo 2 com IA roda depois do 200 à Meta
   (`after()` do Next) — a entrada já está gravada, e reentrega cai em `nova === false`.
3. **Trava de duplicidade antes do modelo:** dentro do `pg_advisory_xact_lock` por telefone, cria a
   linha `out/pre_atendimento` com status `gerando` amarrada ao id da mensagem de entrada; se já existe
   resposta para essa entrada, sai. Depois gera, atualiza o corpo e envia. O dedupe por corpo de 24 h
   deixa de ser a única barreira.
4. **Aterramento:** em assunto financeiro/pedido (mesma detecção de hoje), a resposta da IA só sai se
   houve `tools/call` com `isError: false`; senão, cai no determinístico. Sempre: sem promessa de
   preço nem de quitação — ressalvas fixas anexadas por código, não pelo modelo; corte de `<think>`
   (`stripThinkTags`), de markdown e truncamento em fronteira de linha (sem quebrar link de boleto).
5. **Isolamento da IA interna:** o assistente NÃO importa `runAiWithActions`, `aiActions` nem
   `src/lib/mcp.ts` (teste negativo de import). Monta o modelo LiteLLM próprio a partir da Config.
6. **Cliente MCP:** trata 202 sem corpo em `notifications/initialized`, 401 sem envelope e
   `isError: true` com HTTP 200 (entrega ao modelo só `para_o_cliente`, nunca
   `instrucao_interna_nao_repetir`). URL com host permitido (`127.0.0.1`, `localhost`,
   `*.svc.cluster.local`); padrão em produção = Service `mcp-bfx`; em dev, `MCP_AGENTE_URL` explícito
   (a porta do dev é 3008). JWT por `SignJWT` próprio com `MCP_AGENTE_SECRET`, `aud=mcp-bfx`,
   `exp` 5 min — nunca `createSessionToken`.
7. **Bug no servidor MCP:** `meu_limite` não aplica `FILTRO_VENDA_VALIDA` (conta cancelada/estornada)
   — corrigir junto, com teste.
8. **Contexto:** passa o nome do perfil do webhook para o claim `nome`; inclui as últimas N (ex.: 6)
   mensagens da conversa nas últimas 24 h para "sim"/"o primeiro" terem referente; entrada cortada em
   1000 caracteres; limite de respostas de IA por telefone por hora.
9. **Gateway externo ativo (aberto — decisão do André):** o assistente interno e o gateway não podem
   responder a mesma mensagem. A flag `whatsappIaMcp` nasce desligada e o desenho de convivência
   depende de como o gateway recebe as mensagens (ver pergunta registrada na conversa).
