# Atendimento: atalhos rápidos (dados e servidor)

Escopo: só a camada de dados/servidor. A UI (painel de atalhos no composer) vem depois.
Artboard de referência: `AtendimentoAtalhos.dc.html` (abas Estoque, Parcelas, Boletos; clicar só preenche o campo).

## Atual × esperado

- Atual: a equipe responde "tem estoque?", "quanto falta pagar?" e "manda o boleto" de cabeça ou abrindo outras telas. A lógica de parcelas e boletos do cliente só existe dentro do `mcp-agente.ts` (usada pela IA), sem filtro de venda cancelada/estornada.
- Esperado: três consultas prontas para o admin no atendimento, mais textos prontos para inserir no campo de mensagem, reaproveitando a mesma lógica da IA.

## Decisões (André, 16/10)

- D1: `minhas_parcelas` e `meus_boletos` passam a aplicar `FILTRO_VENDA_VALIDA` (venda cancelada/estornada não aparece). Vale também para a IA/MCP.
- D3: estoque usa a busca híbrida do MCP (`buscarProdutos`); resultado vindo só por significado sai marcado `aproximado`.
- D4: a aba Boletos usa a visão de `meus_boletos` (data da venda, valor, emitido ou não). Não se inventa vencimento.
- Nenhuma resposta de estoque leva preço, nem no payload; o texto também não cita quantidade.

## Arquivos

- `src/lib/cliente-financeiro.ts` (novo): `parcelasDoCliente` e `boletosDoCliente`, por `clienteId` já resolvido. Extraído dos cases do `mcp-agente.ts`; a saída do MCP não muda para venda válida.
- `src/lib/mcp-agente.ts`: só os cases `minhas_parcelas` e `meus_boletos` passam a chamar o módulo.
- `src/lib/atendimento-atalhos.ts` (novo): `estoque(termo)`, `parcelas(telefone)`, `boletos(telefone)`. Telefone resolvido por `resolverEscopo`; ambíguo ou sem cadastro devolve `cliente: null`, `motivo` e listas vazias. Toda consulta usa só `escopo.clienteId`.
- `src/lib/atendimento-atalhos-texto.ts` (novo): textos prontos (tem/não tem estoque, resumo de parcelas com ressalva de baixa, 2ª via do boleto). Link só se `https:`. Datas dd/mm lidas como data pura (UTC), sem deslocar para o fuso de Manaus.
- `src/app/(app)/crm/atendimento/atalhos-actions.ts` (novo): server actions `buscarEstoqueAtalho`, `parcelasDoContato`, `boletosDoContato`, cada uma com `requireAdmin` próprio e telefone `^\d{10,15}$`.

## Fora de escopo

UI, envio automático (o atalho só preenche o campo), vencimento de boleto, preço e quantidade em texto, `meu_limite`, mudança do schema.
