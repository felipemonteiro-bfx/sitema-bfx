# Venda em desconto em folha em 1x grava a parcela

Data: 2026-09-17. Aprovado pelo André no chat ("sim"). Achado da revisão da planilha da folha.

## Comportamento atual × esperado

- Atual: a venda rápida só grava linhas em `parcelas_vencimento` com mais de uma parcela
  (`parcelas > 1 ? ... : []`); a edição, ao virar a venda para 1x sem payload, apaga as linhas.
  Venda em folha em 1x (e venda antiga sem linhas) não aparece na ficha de recebimento, não
  tem como dar baixa nem antecipar, e a fila da Prudent e a planilha de controle não a veem.
  A planilha da folha calcula a parcela, mas ela não existe no banco.
- Esperado: toda venda ativa em desconto em folha tem as linhas das parcelas, inclusive em 1x.

## Mudanças

1. `parcelaUnicaDaFolha` (pura, `src/lib/parcelas.ts`): venda em folha em 1x com total > 0 →
   uma linha, número 1, vencimento `calcularPrimeiroVencimento(dataVenda)` (dia 10 do mês
   seguinte; dois meses à frente depois do dia 20), valor = total em centavos. Fora da folha ou
   total ≤ 0 → nenhuma linha.
2. Venda rápida: sem payload de datas e com 1 parcela, grava o que `parcelaUnicaDaFolha` devolve.
   PIX, boleto e as outras formas em 1x continuam sem linha.
3. Edição (`updateVenda`), sem payload de datas, com 1 parcela e total conhecido: as linhas
   passam a ser as de `parcelaUnicaDaFolha` — em folha, a linha 1 é recriada preservando baixa e
   antecipação; fora da folha, as linhas somem. **Parcela paga ou antecipada mantém o vencimento e
   o valor gravados** (é o registro do que a Prudent pagou); só a linha aberta acompanha a edição.
   Continua recusando quando uma parcela paga ou antecipada sumiria. Com total desconhecido, não
   cria linha nenhuma (o cabeçalho em 1x ainda apaga as antigas, regra CR-01). A lista preservada é
   a mesma que alimenta a taxa da Prudent e o `createMany` — uma fonte só.
   **Decisão:** reduzir uma venda de 3x para 1x com alguma parcela já paga ou antecipada continua
   recusado (regra CR-01, anterior): as outras linhas sumiriam. Quem precisa disso desfaz a baixa
   antes.
4. Migração `20260917180000_parcelas_venda_folha_sem_linhas`: para venda em folha fora de
   cancelada/estornada (o recorte de `WHERE_VENDA_ANTECIPAVEL`), com `boleto = false`, sem nenhuma
   linha e com total > 0, cria `max(1, parcelas)` linhas pela mesma regra de `parcelasDaVenda`
   da planilha da folha — uma por mês no dia 10, total dividido igualmente e o resto de centavos
   na última (a planilha da folha sai igual antes e depois). Venda com o flag legado
   `antecipada = 1` ganha as linhas antecipadas e pagas pela Prudent (mesma carga de 16/09);
   flags 2 e 3 não dizem quais parcelas, então as linhas nascem abertas. Registro em
   `audit_logs`. Rodar de novo não cria nada. Só flag `antecipada` 0, 1 ou nulo: os flags 2 (em
   andamento) e 3 (parcial) não dizem quais parcelas foram antecipadas, e linhas abertas as
   devolveriam à fila da Prudent — ficam de fora, para conferência manual. Teste versionado em
   `scripts/testes-migracao/20260917180000_parcelas_venda_folha_sem_linhas/` (Postgres 16 em
   docker, todas as migrações em ordem, fixture e conferência linha a linha); o encadeamento
   completo também foi validado com `prisma migrate deploy` de verdade num banco novo (60
   migrações, exit 0). As vendas puladas por flag 2/3 ficam listadas em `audit_logs`
   (`parcela:carga-venda-folha-pulada`), senão ninguém descobre quais conferir à mão.

5. A venda rápida monta as linhas por `parcelasDaVendaRapida` (pura, em `src/lib/parcelas.ts`),
   com as datas em UTC como o resto da regra.

## Quem mais lê as linhas (conferido)

- Cobrança por WhatsApp (`cron/parcela-vencida`, `cron/lembrete-parcelas`): só `venda.boleto =
  true` — a guarda `boleto = false` da migração garante que nenhuma linha nova dispara mensagem.
- Consignado/limite: lê a venda, não as linhas. Agente e IA: só vencimento futuro.
- Fila e resumo da Prudent, planilha de controle, ficha de recebimento: passam a enxergar a venda
  (é o objetivo). Venda antiga sem baixa aparece como vencida.
- Relatório de inadimplência e alerta diário do admin: parcela vencida sem baixa passa a contar,
  como já conta a das vendas parceladas em folha.
- Relatório mensal ao RH: é por data da venda; só ganha o vencimento no cronograma.

## Efeito em número financeiro

A taxa da Prudent (`taxaFinanceiraValor`, abatida do lucro) de venda **nova ou editada** em folha
em 1x passa a contar o prazo até o vencimento real, como nas parceladas, em vez dos 31 dias do
fallback de `titulosDeVenda`. Vendas antigas mantêm a taxa gravada: a migração não recalcula.

## Diferenças conhecidas que ficam (revisão de 17/09)

- **Resto dos centavos:** a venda rápida trunca todas as parcelas (100,00 em 3x → 33,33 × 3 =
  99,99); a migração e `parcelasDaVenda` põem o resto na última (33,33 / 33,33 / 33,34). Manter as
  duas convenções é o que faz a planilha da folha sair igual antes e depois da migração. Uniformizar
  é tarefa à parte, porque mexe no valor gravado de venda nativa.
- **`valorParcela` do cabeçalho × linha:** o cabeçalho trunca e a linha arredonda, então em totais
  como R$ 16,15 os dois diferem em um centavo. Pré-existente; `valorParcela` alimenta limite de
  crédito e consignado.
- **`ROUND` do Postgres × `Math.round` do JS:** total com três casas (R$ 1,005) arredonda para
  cima no SQL e para baixo no JS. Só aparece em valor fora do padrão de moeda.
- **Fila da Prudent:** venda antiga migrada passa a ter vencimento real, quase sempre no passado,
  então o prazo médio e o deságio do card de seleção caem para ela (antes usava o fallback
  30/60/90).
- **Inadimplência e alerta do admin:** parcela migrada, vencida e sem baixa passa a contar. Não
  há como medir o volume sem o banco de produção — conferir pelo `audit_logs` depois do deploy.
- **`deleteMany` + `createMany` sem transação** na edição: padrão pré-existente do arquivo.

## Fora do escopo

- Linhas para 1x em outras formas de pagamento.
- Recalcular taxa ou lucro das vendas antigas.
- Vendas com o flag legado 2 ou 3 sem linhas (conferência manual).
