# SPEC — Conciliação com a planilha, visão por mês e deploy destravado

Data: 2026-09-11 · Continuação de `../260911-apc-antecipacao-por-comprador/`

## Pedido

> "Marque todas as que tem na planilha e mostre melhor no sistema, abra a tela e mostre, e
> implemente pra que apareça no k8s da softlive."

## 1. Conciliação: marcar como antecipadas as parcelas "ANTECIPAÇÃO OK" da planilha

**Atual:** nenhuma parcela em folha tem `antecipada = true` no banco do VKE. O cruzamento
(somente leitura, `SUMMARY.md` da tarefa anterior) casou as linhas `ANTECIPAÇÃO OK` da planilha
com parcelas do sistema por comprador (CPF → nome), número da parcela, valor (±R$ 0,05) e mês
de vencimento (o mês seguinte ao do desconto).

**Como:** migração de dados do Prisma (`prisma/migrations/20260911120000_conciliacao_planilha_antecipacao`),
aplicada pelo `prisma migrate deploy` no start do pod. Por que migração:

- o hook de segurança do projeto bloqueia acesso direto ao banco de produção (`kubectl exec psql`);
- a rota admin exigiria sessão de admin, que não temos fora do navegador;
- a migração passa pelo pipeline oficial, fica versionada no git e em `_prisma_migrations`.

**SQL estático, sem entrada externa.** Para cada parcela a lista traz `(id, valor)`. Só marca se:

- a parcela ainda estiver com `antecipada = false`;
- o valor gravado bater com o valor da conciliação (±R$ 0,01): se alguém editou a parcela
  depois, ela não é tocada;
- a venda estiver `ativa` e em desconto em folha (`WHERE_VENDA_ANTECIPAVEL`).

Depois recalcula `vendas.antecipada` das vendas afetadas, com a mesma regra da action
`antecipar`: todas marcadas → 1, algumas → 3. **Nunca rebaixa** uma venda que já está em 1.
Por fim grava uma linha em `audit_logs` com a quantidade, o valor e os ids marcados.

A migração é idempotente (rodar de novo não muda nada) e não falha se alguma parcela sumiu.

**Fica de fora:** linhas da planilha sem parcela no sistema, as 21 vendas sem parcelas
cadastradas e as parcelas `PENDENTE DE REPASSE`, que continuam a antecipar.

## 2. Bug: editar a venda apaga o flag `antecipada` das parcelas

**Atual:** `updateVenda` (`src/app/(app)/historico/actions.ts`) apaga e recria as parcelas
copiando só `paga` e `dataPagamento`. Uma parcela antecipada volta a `false`, e o resumo e a fila
passam a oferecê-la de novo. Com a conciliação isso atinge as 211 parcelas marcadas (186 de
vendas que estavam em `antecipada = 0` e 25 de vendas que já estavam em 1).

**Esperado:** a recriação preserva `antecipada` pelo número da parcela, igual a `paga`.

## 3. Mostrar melhor

- Aba **Por mês** no card de antecipação, espelhando as abas da planilha: cada mês de vencimento
  com já antecipado, falta antecipar e vencidas (valor e quantidade). Por padrão, do mês atual em
  diante, com a opção de mostrar os meses anteriores. Uma legenda explica que a aba da planilha é
  o mês do **desconto** e aqui é o mês do **vencimento**, normalmente o seguinte.
- O aviso deixa de dizer que o que está na planilha não aparece (isso deixa de ser verdade).
  Passa a dizer que só aparecem compras cadastradas no sistema.
- Filtros de período da fila rotulados "Vencimento de" / "Vencimento até".

Lógica em `resumirAntecipacaoPorMes` (`src/lib/antecipacao-compradores.ts`), pura e testada.

## 4. Deploy destravado

**Atual:** todo build falha no `apt-get update` do estágio `deps` do `Dockerfile`: o Release do
`bullseye-security` expirou.

**Mudança mínima:** `apt-get -o Acquire::Check-Valid-Until=false update` só nesse `RUN`. A imagem
de runtime não muda (continua bullseye, com OpenSSL 1.1 para as engines do Prisma). As assinaturas
dos pacotes continuam verificadas; só a data de validade do índice é ignorada. Migrar para
bookworm é o conserto definitivo, mas exige conferir as engines do Prisma com OpenSSL 3 — fica
registrado como recomendação.

## Verificação

- Testes: `antecipacao-compradores.test.ts` (visão por mês), teste novo do `updateVenda`
  preservando `antecipada`.
- Migração testada num Postgres 16 local (Docker): schema real (todas as migrações) + dados de
  exemplo cobrindo cada guarda.
- CI verde, deploy concluído, pod novo com a imagem do commit, e a tela aberta mostrando os números.
