# `mcp-bfx` — servidor MCP para o agente de WhatsApp

Spec escrita antes da implementação, conforme o fluxo do `CLAUDE.md`.

## Por que existe

A plataforma de atendimento por WhatsApp responde ao **cliente final** da BFX
consultando dados reais deste sistema. O único ponto de acesso programático
hoje é `/api/mcp`, e ele **não serve** para isso, por três motivos verificados
no código:

1. **Não é MCP.** É REST (`POST {name, params}` → `{result}`). Sem JSON-RPC,
   sem `initialize`, sem `tools/list`. O cliente MCP do gateway não fala com
   ele.
2. **Autentica por cookie de navegador.** `getSession()` lê apenas
   `cookies().get("session")`. Não há caminho máquina-a-máquina; o gateway
   teria de forjar um cookie se passando por um usuário interno.
3. **O catálogo é de usuário interno.** São 32 `aiActions`, incluindo
   `criar_venda`, `atualizar_usuario`, `listar_inadimplentes` e `consulta_sql`.
   O filtro `mode === "plan"` só olha `readOnly` — que separa leitura de
   escrita, **não dado próprio de dado alheio**. `consultar_parcelas_cliente`
   é `readOnly: true` e recebe `clienteId`/`clienteNome` como parâmetro livre,
   sem vínculo com quem pergunta.

## O requisito de correção

Um cliente final jamais pode obter dado de outro cliente. Isso não é qualidade,
é correção — e não pode depender de instrução em linguagem natural nem da boa
vontade do modelo, que escreve os argumentos da chamada.

## Decisão central: o escopo não é um argumento

Neste servidor, **nenhuma tool aceita identificador de cliente**. Não há
`clienteId`, `clienteNome`, `telefone` ou `cpf` em schema nenhum.

A identidade chega fora da banda, no token de autenticação, e o servidor a
resolve **uma vez** para um `clienteId` interno. Toda consulta é filtrada por
esse id.

A diferença em relação a "validar o argumento" é estrutural: não se pode pedir
o que a API não sabe expressar. Um modelo alucinando `clienteId: 42` não tem
onde escrever isso. Uma tool nova adicionada sem regra de escopo não vaza — ela
simplesmente não recebe de quem falar, e o autor precisa buscar o escopo
explicitamente.

Os nomes das tools são em primeira pessoa (`minhas_parcelas`, não
`consultar_parcelas_cliente`) para que a ausência de variante "de outra pessoa"
seja evidente no ponto de chamada.

## Autenticação

`Authorization: Bearer <JWT>`, HS256, assinado com `MCP_AGENTE_SECRET`.

Claims:

| Claim | Conteúdo |
|---|---|
| `sub` | telefone do contato de WhatsApp, como o gateway o recebeu |
| `aud` | `mcp-bfx` |
| `exp` | curto (minutos) — o gateway assina por conversa |

**Segredo separado de `SESSION_SECRET`, deliberadamente.** `SESSION_SECRET`
assina sessões de usuário interno, inclusive `admin`. Reaproveitá-lo faria de
um vazamento do segredo do agente um caminho para emitir sessão de admin.

O `aud` é verificado: sem ele, um JWT emitido para outro fim e assinado com o
mesmo segredo seria aceito aqui.

Expiração curta importa porque o token carrega a identidade do cliente: um
token vazado expõe **um** cliente por poucos minutos, não a base inteira.

## Resolução de identidade — falha fechada

`sub` (telefone) → `Cliente`:

- **0 correspondências** → erro `cliente_nao_identificado`. O agente diz que
  não localizou cadastro e oferece atendente.
- **2 ou mais** → erro `identificacao_ambigua`. **Nunca** escolher a primeira.
  `Cliente.telefone` não é único no schema; escolher uma linha entre duas seria
  entregar dado do cliente errado com 50% de chance.
- **1** → esse é o escopo da requisição inteira.

Comparação por dígitos normalizados, ignorando máscara e código de país, sobre
os últimos 10 dígitos (DDD + número). Menos que isso colide entre DDDs
diferentes.

## Tools (allowlist escrita à mão)

Não é um filtro sobre `aiActions`. Uma allowlist derivada daquele array voltaria
a expor por padrão toda ação nova marcada `readOnly`. Aqui, expor algo exige
escrevê-lo neste arquivo.

| Tool | Escopo | Retorna |
|---|---|---|
| `minhas_parcelas` | cliente autenticado | parcelas, totais em aberto e vencido, dias de atraso |
| `meu_limite` | cliente autenticado | margem consignável, comprometimento, limite disponível |
| `meus_boletos` | cliente autenticado | boletos das vendas do próprio cliente |
| `catalogo_produtos` | nenhum (dado público) | produtos com estoque e preço |

`catalogo_produtos` não é dado pessoal e por isso não é filtrado por cliente —
mas ainda exige token válido, porque o catálogo comercial não é público na
internet.

**Fora de escopo, permanentemente:** qualquer escrita, qualquer agregado da
empresa (`listar_inadimplentes`, `fluxo_caixa`, `resumo_financeiro`,
`consultar_comissoes`), qualquer dado de usuário interno, e `consulta_sql`.

## Protocolo

JSON-RPC 2.0 sobre HTTP POST — o subconjunto de Streamable HTTP que o caso usa:

- `initialize` → `protocolVersion`, `capabilities.tools`, `serverInfo`
- `notifications/initialized` → 202, sem corpo
- `tools/list`
- `tools/call`
- qualquer outro método → `-32601`

**Servidor sem sessão, por decisão.** A spec do MCP torna o `Mcp-Session-Id`
opcional. Um id de sessão exigiria estado compartilhado entre réplicas (ou
afinidade de pod) para nada: a autenticação já viaja em toda requisição, no
Bearer, e é ela que carrega o escopo. Sem sessão, qualquer réplica atende
qualquer chamada.

## O estado de identificação viaja no `initialize`

Medido rodando de verdade, com o modelo real do proxy: instruído apenas pelo
prompt, o modelo barato **pede CPF ao cliente antes de chamar qualquer
ferramenta**. A mensagem de erro da ferramenta — que já explica que não existe
consulta por documento — nunca chegava a ser lida, porque a ferramenta nunca
era chamada. Reforçar o prompt não resolveu de forma confiável.

O campo `instructions` do `initialize` é o mecanismo que a spec do MCP prevê
para o servidor orientar o cliente sobre como usá-lo, e o cliente o coloca no
prompt do modelo. É o único canal do servidor que chega ao modelo **antes** de
ele decidir o que dizer. Então é ele que carrega o estado de identificação:

- identificado → "O cliente desta conversa é *Fulano*, já identificado."
- sem cadastro → "ATENÇÃO: ... ofereça encaminhar para um atendente."
- ambíguo → "ATENÇÃO: ... um atendente vai confirmar a identidade."

Custa uma resolução de identidade por sessão. Em troca, o modelo abre a
conversa sabendo com quem fala, e o comportamento deixa de depender de ele
escolher chamar a ferramenta primeiro.

Pelo mesmo motivo, o erro de identificação devolve dois campos separados e
rotulados — `para_o_cliente` e `instrucao_interna_nao_repetir`. Com os dois no
mesmo texto, o modelo repapagueia a instrução interna para o cliente ("não
preciso de CPF..."), que é ruído do sistema vazando para o WhatsApp.

## Escopo desta entrega

**Dentro:** a rota MCP, a resolução de identidade, as quatro tools, os testes.

**Fora:**
- Um Deployment separado. O servidor roda dentro do `bfx-app` porque é lá que
  moram o Prisma client e a credencial do `bfx-db`; um pod novo duplicaria os
  dois sem isolar nada (mesmo banco, mesmo segredo). Um `Service` chamado
  `mcp-bfx` aponta para o mesmo Deployment, de modo que separar depois seja
  mudança de manifesto, não de código nem de configuração do gateway.
- Alterar `/api/mcp` ou `aiActions`. O chat interno segue como está.

## Como colocar em produção

1. **Gerar o segredo** (32+ caracteres) e guardá-lo nos dois lados. Ele é o
   mesmo valor de dois lugares: quem assina (gateway) e quem verifica (aqui).

   ```bash
   openssl rand -base64 48
   ```

2. **BFX** — acrescentar `MCP_AGENTE_SECRET` ao JSON do parâmetro SSM
   `/softlive/bfx/prod/secrets/bfx-app-secrets` (sa-east-1, SecureString). O
   ExternalSecret usa `dataFrom.extract`, então nenhum manifesto muda; o ESO
   relê a cada 1h e o Reloader reinicia o Deployment. Para aplicar na hora:

   ```bash
   kubectl annotate externalsecret bfx-app-secrets -n bfx force-sync=$(date +%s) --overwrite
   ```

3. **Plataforma de WhatsApp** — o mesmo valor em `MCP_BFX_SIGNING_SECRET`. O
   manifesto do tenant (`tenants/bfx/tenant.yaml`) já aponta para
   `http://mcp-bfx.bfx.svc.cluster.local/api/mcp/agente` com
   `audience: mcp-bfx`.

4. **Aplicar o Service `mcp-bfx`** (`deploy/bfx/app.yaml`) — via ArgoCD, como o
   resto.

Sem o segredo dos dois lados o caminho falha fechado: a rota devolve 401 e o
agente responde sem ferramenta, dizendo que não conseguiu consultar. Nenhum
atendimento fica errado por falta de configuração — fica apenas sem consulta.

## Como verificar depois de subir

```bash
kubectl -n bfx port-forward svc/mcp-bfx 8099:80
# token de teste assinado com o mesmo segredo, aud=mcp-bfx, sub=<telefone>
curl -s -X POST http://127.0.0.1:8099/api/mcp/agente \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}' | jq '.result.tools[].name'
```

Deve listar exatamente `minhas_parcelas`, `meu_limite`, `meus_boletos`,
`catalogo_produtos`. Sem o header, 401.
