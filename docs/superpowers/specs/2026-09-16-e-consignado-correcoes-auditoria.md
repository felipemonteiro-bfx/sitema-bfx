# e-Consignado CLT — correções da auditoria

Data: 2026-09-16
Base: spec `2026-09-15-e-consignado-clt-design.md`, implementação `5c6ec20..24f9f44`.

A auditoria comparou o código com a spec e rodou o parser no xlsx real da
Amazon Five (70 contratos, 0 erros). O núcleo está certo; os itens abaixo são
os desvios confirmados.

## 1. Venda em folha sem renda mostra trava falsa (P1)

**Hoje.** `montarPayloadLimite` troca renda `null` por 0. No form, a margem de
folha fica negativa, `excedeuMargem` liga, o card fica vermelho e diz “A venda
só sai se você confirmar”. O submit não pede confirmação (a decisão trata renda
nula como livre), então a tela mente.

**Esperado (spec original).** Sem renda: texto “renda pendente”, sem trava.

**Correção.** Função pura `estadoCardLimite` em `src/lib/consignado-venda.ts`
decide o tom do card e os números exibidos:

| Caso | Tom | Limite / Disponível | Barra |
|---|---|---|---|
| folha, renda ≤ 0 ou nula | `renda_pendente` (neutro) | `—` | sem barra |
| folha, parcela nova leva a ≥ 30% ou faixa `limite` | `limite` | chaves de folha | sim |
| folha, faixa `alerta` | `alerta` | chaves de folha | sim |
| folha, resto | `ok` | chaves de folha | sim |
| outra forma, parcela > disponível + 1 | `excede` | chaves antigas | sim |
| outra forma, resto | `ok` | chaves antigas | sim |

“≥ 30%” usa a mesma conta de `decidirConfirmacaoConsignado` (pct posterior),
para o card e o diálogo nunca discordarem. A barra de progresso volta para
todas as formas (tinha sido removida também de PIX/cartão, contra a spec).

## 2. Faixa nunca calculada para clientes antigos e velha na virada do mês (P1)

**Hoje.** A migração só cria as colunas. Só tem faixa quem passou pelo upload,
teve venda criada/editada ou cadastro salvo. Cliente que já passa de 20% só com
folha BFX não aparece no filtro “Alerta 20%”. E a % depende do mês corrente
(contrato que termina, parcela BFX que começa), mas o cache não é refeito na
virada.

**Correção.**

- Coluna nova `clientes.consignado_mes_ref` (`TEXT`, nula) = mês `YYYY-MM` em
  que `pct/faixa` foram calculados. Migração só adiciona a coluna.
- `recalcularConsignado(clienteId)` grava também `consignadoMesRef`.
- `recalcularConsignadoPendentes()` em `consignado-db.ts`: busca clientes com
  `consignadoMesRef` nulo ou diferente do mês atual, carrega contratos e vendas
  de folha desses clientes em lote, calcula em memória e grava com
  `updateMany` agrupado por `(pct, faixa)`.
- Planejamento puro `planejarRecalculoConsignado` em `consignado.ts` (testável
  sem banco).
- Disparo: na página `/cadastros`, antes da consulta da lista de clientes. O
  primeiro acesso do mês paga o custo; falha é logada e não derruba a página.
- Por que não CronJob: infra/GitOps tem outro dono; o disparo preguiçoso cobre
  backfill, virada de mês e clientes criados por caminhos que não recalculam
  (CRM, importação de funcionários, cadastro rápido).

## 3. Prévia sem avisos e erros em código (P2)

**Hoje.** A tela mostra só contadores e uma tabela com `sem_cpf_nem_matricula`,
`competencia_invalida`, `nome_duplicado`. Os avisos calculados (“linha 8
substituída pela 41”, CPF duplicado no cadastro) não aparecem.

**Correção.** `descreverMotivoConsignado(motivo)` e
`descreverAvisoConsignado(aviso)` (puras, em `consignado-import.ts`) traduzem
para frase. A prévia ganha a seção “Avisos” com os avisos do parse e do plano.

## 4. Excluir venda não recalcula a faixa (P2)

**Hoje.** `deleteVenda` não recalcula; `criarVendaV2` e `updateVenda`
recalculam em *fire-and-forget* depois de revalidar a página.

**Correção.** `recalcularConsignadoSeguro(clienteId)` (aguarda, loga erro, nunca
lança). `deleteVenda` lê o `clienteId` antes de apagar e recalcula depois.
Criar/editar passam a aguardar o recálculo antes de revalidar.

## 5. Lead com nome repetido derruba a importação pela metade (P2)

**Hoje.** `nomeDoLead` só compara com clientes já cadastrados. Dois leads novos
com o mesmo nome e CPFs diferentes no mesmo arquivo batem no `@unique` de
`Cliente.nome` no meio da gravação. Não há transação: metade fica gravada.

**Correção.**

- Plano reserva nomes dos leads do próprio arquivo. Identidade do lead: CPF;
  sem CPF, matrícula + empresa parceira. Mesma identidade → mesmo lead e mesmo
  nome. Identidade diferente com nome já reservado → sufixo `(últimos 4 do
  CPF)`; sem CPF para desambiguar → erro na linha (`nome_duplicado`).
- `aplicarImportacaoConsignado` grava leads, preenchimentos e contratos dentro
  de `prisma.$transaction` (timeout 2 min). Recálculo das faixas depois do
  commit.
- `analisarImportacaoConsignado` passa a `await` o plano dentro do `try`.

## 6. Formato e rótulos (P3)

- % em pt-BR: `formatarPctConsignado(25.5)` → `25,5%`; `null` → `—`. Usado na
  coluna da lista e no card da venda.
- Rótulos únicos em `ROTULO_FAIXA_CONSIGNADO` (consignado.ts): selo e filtro
  dizem a mesma coisa (“Alerta 20%”, “Limite 30%”, “Renda pendente”, “Abaixo de
  20%”).
- Filtros com nome acessível (`Label` `sr-only` ligado ao `id`), carregamento
  da análise com `role="status"`.
- Cabeçalho da lista de clientes empilha no celular (`flex-col`, `sm:flex-row`).

## 7. Editar e excluir venda sem sessão (segurança)

**Hoje.** `updateVenda` e `deleteVenda` (`historico/actions.ts`) não chamam
guarda nenhuma. O layout roda depois da action e o middleware só cobre `/api`,
então quem tiver o Action ID edita ou apaga venda sem estar logado.

**Correção.** `await requireSessionOrThrow()` na primeira linha das duas e da
vizinha `enviarEmailEmpresa` (mesmo arquivo, mesmo buraco: dispara e-mail para
a empresa parceira). Só sessão, não admin: não muda quem pode editar/excluir
hoje (regra de negócio fica como está).

## 8. Achados da revisão por subagentes (aplicados)

- **Nome de lead e acento (alta).** Há índice único em `f_unaccent(upper(nome))`:
  "JOSÉ" cadastrado e "JOSE" no arquivo colidem no banco, e com a transação a
  importação inteira volta. A checagem de nome ocupado passa a comparar sem
  acento e em maiúscula.
- **Criar venda sem sessão (alta, mesmo buraco do item 7).** `criarVendaV2` e a
  legada `criarVenda` ganham `requireSessionOrThrow()` na primeira linha.
- **Card × diálogo com desconto.** O submit calculava a parcela sem desconto nem
  pontos; o card e o servidor descontam. As duas contas passam a sair de
  `parcelaDe`.
- **Corrida no lote.** O `updateMany` repete o filtro de pendente, para não
  sobrescrever um recálculo feito por venda entre a leitura e a gravação.
- **Chave do lead sem CPF e sem empresa parceira** usa o CNPJ da linha; antes a
  mesma matrícula em dois empregadores não cadastrados virava um lead só.
- **Prévia:** tabela de recusadas sai do `ScrollArea` (cortava sem rolagem),
  região viva sempre montada, lista de avisos rolável por teclado, texto de
  `nome_duplicado` sem afirmar falta de CPF, título do diálogo de 30%.

Reportados e **não** aplicados (anteriores à feature ou decisão de negócio):
`updateVenda` não regrava `valorParcela` ao mudar parcelas/total; card de
PIX/cartão diz "excede" sem renda e ignora o teto de R$ 475 que o servidor usa;
alerta 20% olha a faixa atual, não a posterior (conforme spec original).

## 9. Segunda rodada (pedido do André, mesmo dia)

Os quatro itens que ficaram "reportados e não aplicados" acima.

### 9.1 Editar venda não atualiza `valorParcela`

**Hoje.** `updateVenda` grava `parcelas`, total e itens, mas nunca `valorParcela`.
Venda de R$ 600 em 12x (R$ 50) editada para 6x fica `parcelas=6, valorParcela=50`:
limite de crédito e consignado contam metade.

**Risco da correção.** Recalcular sempre quebraria idempotência (ver memória de
round-trip): venda importada ou legada cujo `valorParcela` não é `total/parcelas`
(juros embutidos, planilha) seria reescrita num save sem mudança nenhuma.

**Correção.** Função pura `valorParcelaAposEdicao` em `src/lib/parcelas.ts`:
recalcula `trunc(total / parcelas, 2 casas)` (mesma conta de `criarVendaV2`)
**só** quando o número de parcelas ou o total (itens + frete − desconto) mudou em
relação ao que está gravado; senão devolve `undefined` e o campo não é tocado.
`updateVenda` lê a venda antes do update para comparar.

### 9.2 Card de PIX/cartão diverge do servidor

**Hoje.** Nas formas que não são folha, o card usa `renda × 30%` como limite e diz
"Excede disponível" para cliente sem renda. O servidor (`checkCredito`) libera
quem não tem renda e usa teto `min(renda × 30%, R$ 475)`.

**Correção.** Ramo não-folha de `estadoCardLimite` espelha `checkCredito`: sem
renda → tom `renda_pendente` (sem limite/disponível, texto "sem renda
cadastrada, limite não calculado"); com renda → limite = `min(margemTotal,
tetoParcelaMax)`, excede quando `comprometido + parcela > limite + 1`.

### 9.3 Tabela cortada nas outras importações

`importacao-clientes-client.tsx` e `importacao-fornecedores-client.tsx` têm o
mesmo `ScrollArea` com `max-h-64` que cortava as linhas sem rolagem. Mesma
troca feita no e-Consignado (div com `overflow-y-auto`, rolável por teclado).

### 9.4 Alerta 20% olha a venda que está sendo feita

**Hoje (spec original).** Amarelo só se a faixa **atual** é `alerta`. Cliente em
15% que vai a 25% com esta venda não vê aviso.

**Correção (muda a spec original a pedido).** Em folha, tom `alerta` quando a
faixa atual é `alerta` **ou** a % depois da parcela nova fica entre 20 e 30.
`estadoCardLimite` passa a devolver `pctPosterior`; o card mostra "Consignado
atual: X% · com esta venda: Y%" e os avisos citam a % posterior.

### Testes (falham antes)

1. `valorParcelaAposEdicao`: sem mudança → `undefined`; 12x→6x → 100; total
   mudou → recalcula; venda com juros salva sem mudança → `undefined`.
2. `updateVenda` grava `valorParcela` novo ao mudar parcelas e não grava num
   save idêntico.
3. `estadoCardLimite` PIX: sem renda → `renda_pendente`; renda 3000 com
   comprometido 400 e parcela 100 → `excede`, limite 475.
4. `estadoCardLimite` folha: 15% + parcela que leva a 25% → `alerta`,
   `pctPosterior` 25.
5. Fonte das duas importações sem `ScrollArea`.

## Fora de escopo

- Ordenar pela coluna Consignado.
- Restringir editar/excluir venda a admin (decisão de negócio).
- CSV com separador de milhar (`1.234,56`).
- Gravação em lote (createMany) na importação.

## Testes (falham antes da correção)

1. `estadoCardLimite`: folha sem renda → `renda_pendente`, sem números de
   limite; folha com pct posterior ≥ 30 → `limite`; faixa `alerta` → `alerta`;
   PIX excedendo → `excede`; PIX normal → barra com % das chaves antigas.
2. `planejarRecalculoConsignado`: cliente só com folha BFX a 25% e faixa nula →
   grupo `alerta`; sem renda → `renda_pendente`; agrupa ids com mesmo
   `(pct, faixa)`.
3. `descreverMotivoConsignado` / `descreverAvisoConsignado`: todos os códigos
   viram frase; código desconhecido não vaza cru sem contexto.
4. `deleteVenda` chama o recálculo com o `clienteId` da venda apagada.
5. Plano: dois CPFs com o mesmo nome no arquivo → segundo recebe sufixo; mesmo
   CPF duas vezes → um lead; sem CPF e nome reservado → erro `nome_duplicado`.
6. `aplicarImportacaoConsignado` grava pelo cliente da transação, não pelo
   `prisma` global.
7. `formatarPctConsignado` e rótulos do filtro = rótulos do selo.
8. `updateVenda` e `deleteVenda` sem sessão lançam antes de tocar no banco.
