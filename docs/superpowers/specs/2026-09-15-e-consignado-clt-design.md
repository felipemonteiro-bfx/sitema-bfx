# e-Consignado CLT — margem de folha do cliente

Data: 2026-09-15

## Objetivo

A empresa parceira envia todo mês a lista oficial do **e-Consignado CLT**
(export Dataprev). O BFX casa essa lista com o cadastro, soma o desconto
bancário ainda vigente com as parcelas de **desconto em folha da loja**, e
mostra quanto da renda já está comprometida.

- **≥ 20%** da renda: alerta (selo + aviso na venda).
- **≥ 30%** da renda: aviso forte; a venda em folha só sai se o vendedor
  confirmar. Continua gravando, com `excedeuLimite`.
- Aba Clientes filtra por faixa e por empresa parceira.
- Reenvio do mês atualiza contrato a contrato, sem duplicar e sem apagar o
  que saiu da planilha.

## Estado atual

- `Cliente` já tem `renda`, `cpf`, `matricula`, `empresaParceiraId`,
  `estagioCrm`, `origem` (`import_funcionarios` | `manual` | `venda` |
  `catalogo`).
- `Venda.descontoEmFolha` / `formaPagamento = DESCONTO_FOLHA` e
  `excedeuLimite`.
- `checkCredito` (`src/lib/credit.ts`) e `GET /api/clientes/[id]/limite`
  somam **todas** as vendas ativas do cliente, teto
  `min(renda * 0.3, 475)`. Não olham e-Consignado nem filtram folha.
- `VALOR_PARCELA_MAX = 475` em `src/lib/parcelas.ts` é o teto de **uma**
  parcela BFX.
- Importação de funcionários: CSV, prévia, teto 5.000 linhas, admin,
  lead com `origem = import_funcionarios`.
- Não há parser de xlsx no `package.json`. `npm install` neste ambiente
  falha — parser próprio (zip + XML). Não adicionar dependência.

## Decisões (fechadas com o usuário)

| Tema | Escolha |
|---|---|
| O que entra na % | e-Consignado da planilha **+** parcela BFX em desconto em folha vigente |
| Contratos de banco | Qualquer financeira; não precisa ser compra da loja |
| 30% | Aviso forte + confirmação; a venda pode sair (`excedeuLimite`) |
| Sem renda | Importa; faixa `renda_pendente`; sem alerta e sem trava |
| Quem não casa | Vira **lead** (`origem = import_consignado`) |
| Reenvio do mesmo mês | Upsert por financeira + nº do contrato; o que sumiu **fica** |
| O que conta “agora” | Contrato cujo período de desconto cobre o mês civil atual |
| Alerta | Selo no cliente + aviso na venda rápida. Sem sino, sem fila |
| Filtro | Faixas prontas + empresa parceira + busca nome/CPF de hoje |
| Onde sobe o arquivo | Importação → e-Consignado, só admin, prévia antes de gravar |
| Formas de pagamento | Regra 20/30 **só** em desconto em folha |

### Fora de escopo

- Fila tipo Central Prudent e notificação no sino.
- Trava dura (recusar venda mesmo confirmando).
- Criar cliente “completo” (com renda) a partir da planilha.
- Apagar contrato que saiu da planilha.
- Criar `EmpresaParceira` no upload.
- Histórico mês a mês do mesmo contrato (fotos por competência).
- Parser de layouts Dataprev diferentes do arquivo de referência.
- Playwright neste ciclo.
- Tela para o vendedor editar/apagar contrato na mão.
- Mudar o comportamento de PIX/boleto/cartão.

Arquivo de referência: `09 2026 Emprestimo e-Consignado CLT - Amazon Five.xlsx`
(aba `eConsignadoCLT`, competência `09/2026`).

## Arquitetura

Três unidades, cada uma testável sozinha:

1. **Parser** — xlsx/csv → linhas normalizadas + erros por linha. Zero Prisma.
2. **Livro de contratos** — upsert, casamento CPF/matrícula, criação de lead,
   vínculo com empresa parceira.
3. **Comprometimento** — % e faixa a partir do livro + vendas de folha.
   Fonte da verdade para selo, filtro, painel da venda e `checkCredito` no
   caminho de folha.

A % **não** é digitada. `Cliente.pctConsignado` e `Cliente.faixaConsignado`
são cache para filtrar a lista; `recalcularConsignado(clienteId)` é o único
escritor.

```
xlsx/csv → parser → prévia → confirmar
                ↓
     ContratoConsignado (upsert)
                ↓
     casa Cliente / cria lead
                ↓
     recalcularConsignado (cache no Cliente)
                ↓
     Cadastros (selo/filtro)  e  Venda rápida (aviso/confirmação)
```

## Modelo de dados

### Novo: `ContratoConsignado`

Tabela `contratos_consignados`. Um registro por empréstimo, não por linha
de competência.

Chave única: **`(ifConcessoraCodigo, contrato)`**. Número curto (`35362333`)
não pode colidir entre bancos.

| Campo | Tipo | Nota |
|---|---|---|
| `id` | Int PK | |
| `ifConcessoraCodigo` | String | `ifConcessora.codigo` |
| `contrato` | String | número do contrato |
| `ifConcessoraDescricao` | String? | Bradesco, Caixa, … |
| `cpf` | String | só dígitos |
| `matricula` | String? | |
| `nomeTrabalhador` | String | como veio na planilha |
| `nomeEmpregador` | String? | |
| `numeroInscricaoEmpregador` | String? | CNPJ só dígitos |
| `numeroInscricaoEstabelecimento` | String? | CNPJ do estabelecimento, só dígitos |
| `competenciaInicioDesconto` | String | `MM/YYYY` |
| `competenciaFimDesconto` | String | `MM/YYYY` |
| `valorParcela` | Float | |
| `totalParcelas` | Int? | |
| `valorEmprestimo` | Float? | conferência |
| `valorLiberado` | Float? | |
| `dataInicioContrato` | String? | texto da planilha |
| `dataFimContrato` | String? | |
| `dataAdmissao` | String? | |
| `categoriaTrabalhador` | String? | |
| `competenciaArquivo` | String | última competência vista (`09/2026`) |
| `clienteId` | Int | FK `clientes`; sempre preenchido após o commit (cliente ou lead) |
| `empresaParceiraId` | Int? | FK; null se o CNPJ não existir no cadastro |
| `criadoEm` / `atualizadoEm` | DateTime | |

Índices: único `(ifConcessoraCodigo, contrato)`; `clienteId`; `cpf`;
`empresaParceiraId`.

Reenvio: `upsert` nessa chave. Campos da planilha nova vencem. Contrato
ausente no arquivo **não** é apagado.

A % do dia usa **esse** registro (o mais recente do contrato), nunca a soma
de setembro + outubro do mesmo `contrato`. Sem isso o comprometimento
dobraria a cada mês.

Não há tabela de lote de importação. A prévia e o relatório da própria
tela bastam.

### Cliente (cache)

| Campo | Tipo | Valores |
|---|---|---|
| `pctConsignado` | Float? | 0–100, duas casas. `null` se renda pendente |
| `faixaConsignado` | String? | `ok` \| `alerta` \| `limite` \| `renda_pendente` |

`origem` ganha o valor `import_consignado`. Leads novos nascem com
`estagioCrm = novo_lead`. Cliente já existente **não** muda de estágio.

## Parser e upload

Rota: `/importacao/consignado`. Link em “Outras importações” em
`/importacao`. `requireAdmin`. Mesmo padrão de prévia/confirmação de
`/importacao/clientes`.

**Arquivo.** `.xlsx` no layout de referência, ou `.csv` com o mesmo
cabeçalho. Aba preferida: `eConsignadoCLT`; se não existir, a primeira
aba. Cabeçalhos obrigatórios: `ifConcessora.codigo`, `contrato`, `cpf`,
`valorParcela`, `competenciaInicioDesconto`, `competenciaFimDesconto`.
Os demais, quando vierem, gravam; se faltarem, ficam null.

Teto: 5.000 linhas de dados (`LIMITE_LINHAS_IMPORT_CLIENTES`). Acima
disso, recusa o arquivo inteiro, sem gravar.

Parser xlsx: zip + `xl/sharedStrings.xml` + sheet XML. Sem `openpyxl`,
sem SheetJS. Sem `RegExp.prototype.exec` (hook de segurança): só
`.split()` e testes de regex.

Competência: coluna `competencia` por linha. Arquivo misturado (duas
competências) é válido; cada linha leva a sua.

**Arquivo inválido** (extensão, zip quebrado, cabeçalho sem os
obrigatórios): HTTP 400, mensagem clara, **nada** gravado.

**Linha inválida** (sem CPF e sem matrícula; sem contrato; sem financeira;
`valorParcela` não numérico; competência de desconto malformada): entra no
relatório (`linha N: motivo`) e **não** aborta o lote.

Duplicata no mesmo arquivo (mesma financeira + contrato): a última linha
vence; a anterior vira aviso na prévia (“linha 8 substituída pela 41”).

### Casamento

Ordem, depois de normalizar CPF para só dígitos:

1. `Cliente.cpf` igual ao CPF da linha.
2. Senão, `matricula` + `empresaParceiraId` da empresa casada pelo CNPJ.
3. Senão, cria lead.

Dois clientes com o mesmo CPF: usa o de **menor `id`** e avisa na prévia.

Empresa: CNPJ de `numeroInscricaoEstabelecimento` (fallback:
`numeroInscricaoEmpregador`) contra `EmpresaParceira.cnpj` só dígitos. Sem
match: `empresaParceiraId = null`. Não cria empresa.

Lead novo:

- `nome` = `nomeTrabalhador` normalizado (mesma regra de
  `normalizarNomeClienteImport`).
- `cpf`, `matricula`, `empresa` (texto do empregador), `empresaParceiraId`
  se houver.
- `origem = import_consignado`, `estagioCrm = novo_lead`.
- **Não** preenche `renda`.
- `Cliente.nome` é `@unique`. Colisão de nome com outro CPF: grava
  `NOME (1234)` com os quatro últimos dígitos do CPF. Sem CPF, a linha
  falha com erro (“nome duplicado sem CPF para desambiguar”).

Cliente existente: vincula o contrato. Preenche `cpf` / `matricula` /
`empresa` / `empresaParceiraId` **somente se estiverem vazios**. Não
sobrescreve renda, telefone, e-mail, estágio.

Prévia (antes do commit): novos, atualizados, clientes casados, leads a
criar, linhas com erro, avisos de duplicata. Commit só no confirmar.

## Comprometimento (a %)

Função única `calcularConsignado(clienteId, mesRef?)` — `mesRef` default
é o mês civil de `new Date()` (mesmo critério de
`/api/clientes/[id]/limite`).

```
tomadoConsignado = soma valorParcela dos ContratoConsignado do cliente
                   cujo [competenciaInicioDesconto, competenciaFimDesconto]
                   cobre mesRef (inclusive nas duas pontas)

tomadoFolhaBfx   = soma valorParcela das Venda do cliente com
                   descontoEmFolha (ou formaPagamento DESCONTO_FOLHA),
                   status ∉ {cancelada, estornada}, parcela vigente no
                   mesRef pela regra já usada no limite: vendeu até dia 20
                   → primeira parcela no mês seguinte; depois do dia 20 →
                   dois meses depois; vigência = parcelas meses a partir
                   daí.

tomado = tomadoConsignado + tomadoFolhaBfx
```

`MM/YYYY` vira `(ano, mês)`. Cobre `mesRef` se
`(anoInicio, mesInicio) <= mesRef <= (anoFim, mesFim)`.

Renda `null` ou `<= 0`: `pct = null`, faixa `renda_pendente`. Fora de
alerta e de confirmação.

Com renda:

```
pct = (tomado / renda) * 100   // duas casas, half-up

pct < 20            → ok
20 <= pct < 30      → alerta
pct >= 30           → limite
```

20 e 30 são **inclusivos** na faixa mais grave.

`recalcularConsignado(clienteId)` grava `pctConsignado` e
`faixaConsignado`. Disparar:

- no commit do upload, para cada `clienteId` tocado;
- após criar / editar / cancelar / estornar **qualquer** venda daquele
  cliente (a forma pode mudar para folha numa edição);
- após alterar `renda` do cliente.

Contrato cujo fim de desconto já passou some da soma, mesmo continuando
na tabela.

### Crédito existente (não misturar as regras)

Esta feature **não** joga e-Consignado dentro de `min(renda * 0.3, 475)`.
Se o `tomado` passar a incluir o banco e o teto continuar R$ 475, quase
toda venda de folha nasceria `excedeuLimite`.

No caminho **desconto em folha**:

- Painel e `checkCredito` usam `calcularConsignado`.
- Teto percentual = `renda * 0.30` (folha BFX + banco).
- `VALOR_PARCELA_MAX = 475` continua o teto de **uma** parcela BFX
  (`sugerirParcelasDescontoEmFolha`). Não é teto do total com o banco.
- `excedeuLimite = 1` quando, **depois** da parcela nova,
  `pct >= 30`.

PIX, boleto, cartão, dinheiro: `checkCredito` e o painel **atual**
(todas as vendas, `min(30%, 475)`) **não mudam**. Sem aviso 20/30, sem
confirmação extra.

IA (`runAiWithActions`): se criar venda em folha, calcula
`excedeuLimite` com a mesma função; não há dialog. Fora isso, não
expandir ferramentas de IA neste spec.

## Cadastros → Clientes

Lista de hoje (`q_clientes` por nome/CPF/CNPJ) ganha:

1. Coluna **Consignado**: `25%` ou `—` se renda pendente.
2. Selo na linha:
   - `ok`: nada;
   - `alerta`: selo “Alerta 20%”;
   - `limite`: selo “Limite 30%”;
   - `renda_pendente`: selo “Renda pendente”.
3. Query `faixa_consignado` = `ok` | `alerta` | `limite` |
   `renda_pendente`. Filtra `Cliente.faixaConsignado`.
4. Query `empresa_parceira` = id. Filtra `empresaParceiraId`.
   Os dois combinam com a busca (AND).

Lead `import_consignado` aparece como qualquer lead. Com renda preenchida
depois, o recálculo o coloca na faixa certa.

## Venda rápida

Só com desconto em folha **e** cliente selecionado:

- `GET /api/clientes/[id]/limite` **ganha** chaves novas e **não
  reinterpreta** as antigas (`comprometimentoAtual`, `margemTotal`,
  `margemDisponivel` continuam = todas as vendas × `renda * 0.30`, como
  hoje). Novas: `tomadoConsignado`, `tomadoFolhaBfx`, `pctConsignado`,
  `faixaConsignado`, `margemFolhaTotal` (= `renda * 0.30`),
  `margemFolhaDisponivel` (= teto percentual − tomado consignado − folha
  BFX).
- Com desconto em folha, o card lê as chaves novas. Sem renda: texto
  “renda pendente — % de consignado não calculada”, sem trava. Sem
  desconto em folha, o card segue nas chaves antigas.
- `faixa = alerta`: faixa amarela, “já está em alerta de consignado: X%”.
  Envia sem clique extra.
- `faixa = limite` **ou** a parcela nova faria `pct >= 30`: faixa
  vermelha + **AlertDialog** (“Cliente em 30% ou mais de consignado.
  Vender mesmo assim?”). Sem confirmar, o submit não dispara. Confirmou:
  `confirmouLimiteConsignado=1` no FormData.
- Servidor (`venda-rapida/actions.ts`): se a venda é folha e
  `pct posterior >= 30` e o flag não veio → **400**, não grava. Flag
  presente → grava com `excedeuLimite = 1`.

Outras formas de pagamento: card e action como hoje.

## Erros

| Situação | Comportamento |
|---|---|
| Arquivo/cabeçalho inválido | 400, nada gravado |
| Linha sem chave / valor ruim | pula + relatório |
| CPF duplicado no cadastro | menor `id` + aviso |
| CNPJ de empresa desconhecido | contrato sem `empresaParceiraId` |
| Reenvio do mesmo contrato | atualiza, não duplica |
| Contrato sumiu da planilha | permanece; sai da % só se o período acabou |
| Renda vazia | `renda_pendente` |
| Folha ≥ 30% sem confirmar | 400 |
| Folha ≥ 30% confirmada | grava + `excedeuLimite` |
| PIX com % ≥ 30 | não pede confirmação |

## Testes (TDD)

Cada item abaixo é um teste que **falha** antes da implementação.

1. Parser lê o xlsx de referência (ou fixture equivalente): contrato,
   CPF só dígitos, `valorParcela`, competências, financeira.
2. Dois uploads do mesmo `(ifConcessoraCodigo, contrato)` → 1 linha;
   campos da segunda vencem; `competenciaArquivo` atualiza.
3. Contrato presente só no primeiro arquivo permanece depois do segundo.
4. CPF conhecido vincula o cliente; CPF novo cria lead
   `origem = import_consignado`, `estagioCrm = novo_lead`, sem renda.
5. Cliente existente não tem nome/renda/estágio sobrescritos; CPF vazio
   é preenchido.
6. 15% banco + 10% folha BFX = 25% → `alerta`; 15% + 20% = 35% →
   `limite`; renda null → `renda_pendente`.
7. `competenciaFimDesconto` no mês passado não entra na soma.
8. O mesmo contrato em competências 09/2026 e 10/2026 (se o upsert
   regravar) conta **uma** vez.
9. Filtro `faixa_consignado=alerta` e `empresa_parceira` devolve só
   quem bate nos dois.
10. Action de venda folha com `pct posterior >= 30` sem
    `confirmouLimiteConsignado` recusa; com o flag grava
    `excedeuLimite = 1`.
11. Action PIX com o mesmo cliente em `limite` grava sem o flag.
12. Arquivo sem coluna `contrato` recusa o lote; uma linha sem CPF e
    sem matrícula não impede as outras.

Fixture: recortar 3–5 linhas do xlsx de referência (Maria Eveline com
três contratos Bradesco/Socinal/QI; um CPF inexistente no cadastro).
Não commitar o xlsx completo da empresa se tiver PII de produção —
anonimizar CPF na fixture.

## Arquivos tocados (previsão)

- `prisma/schema.prisma` + migration
- `src/lib/consignado-parse.ts` (puro)
- `src/lib/consignado-import.ts` (casamento + upsert)
- `src/lib/consignado.ts` (`calcular` / `recalcular`)
- `src/lib/credit.ts` (caminho folha)
- `src/app/api/clientes/[id]/limite/route.ts`
- `src/app/(app)/importacao/consignado/` (page + actions)
- `src/app/(app)/importacao/page.tsx` (link)
- `src/app/(app)/cadastros/page.tsx` + `clientes-tab-client.tsx`
- `src/app/(app)/venda-rapida/actions.ts` + `venda-rapida-form-v2.tsx`
- testes em `src/__tests__/consignado-*.test.ts` e extensão de
  `credit.test.ts`

## Sucesso

Admin sobe o xlsx da Amazon Five duas vezes no mesmo mês: nenhum
contrato duplicado. Clientes já no BFX mostram %; os outros viram lead.
Quem está em 20–30% aparece com selo e no filtro “Alerta 20%”. Na venda
em folha, 20% avisa e 30% pede confirmação; PIX não pede. Sem renda, a
% não é inventada.
