#!/usr/bin/env bash
# Teste da migração 20260930160000_cobranca_recebimento_fechamento (2026-09-30, Fase 6).
#
# Um Postgres 16 descartável (porta 55436, container pg-fase6) recebe todas as migrações
# anteriores em ordem, depois os dados de fixture.sql (anteriores à Fase 6), e só então a
# migração nova. Em seguida:
#   - os dados de antes não mudam (empresa sem cliente Asaas, parcelas sem liquidação, fechamento
#     no mesmo status, nenhuma cobrança nem recebimento);
#   - defaults: cobrança nasce `ativa`; recebimento exige status;
#   - uniques: `asaas_payment_id` único na cobrança e no recebimento (vários recebimentos manuais
#     sem id convivem); o índice parcial: duas cobranças ativas no mesmo fechamento → erro; uma
#     cancelada mais uma ativa → ok;
#   - as FKs: fechamento ou versão com cobrança não é apagado; fechamento com recebimento não é
#     apagado; cobrança com recebimento não é apagada (Restrict); apagar o arquivo do comprovante
#     solta o recebimento (SetNull);
#   - `prisma migrate diff` do banco para o schema.prisma tem de sair vazio (o índice parcial,
#     fora do schema, não é acusado como drift).
#
#   ./rodar.sh                   # a migração do repositório
#   ./rodar.sh /tmp/mutante.sql  # uma cópia alterada, para provar que a conferência pega o erro
#
# Precisa de docker. Exit 0 = passou.
set -euo pipefail
REPO="$(cd "$(dirname "$0")/../../.." && pwd)"
AQUI="$(cd "$(dirname "$0")" && pwd)"
NOVA=20260930160000_cobranca_recebimento_fechamento
SQL_NOVA="${1:-$REPO/prisma/migrations/$NOVA/migration.sql}"
NOME=pg-fase6
PORTA=55436
docker rm -f $NOME >/dev/null 2>&1 || true
docker run -d --name $NOME -p $PORTA:5432 -e POSTGRES_PASSWORD=teste -e POSTGRES_DB=bfx postgres:16 >/dev/null
trap 'docker rm -f $NOME >/dev/null 2>&1 || true' EXIT
# O entrypoint sobe o servidor, roda o init e reinicia: espera a segunda "ready to accept".
for i in $(seq 1 90); do
  [ "$(docker logs $NOME 2>&1 | grep -c 'ready to accept connections')" -ge 2 ] && break; sleep 1
done
psql_() { local db=$1; shift; docker exec -i $NOME psql -v ON_ERROR_STOP=1 -q -U postgres -d "$db" "$@"; }
# Comando que TEM de falhar: devolve 0 só se o psql recusou.
falha_() { if psql_ bfx -c "$1" >/dev/null 2>&1; then return 1; else return 0; fi; }
for dir in $(ls "$REPO/prisma/migrations" | grep -v migration_lock | sort); do
  [ "$dir" = "$NOVA" ] && continue
  psql_ bfx < "$REPO/prisma/migrations/$dir/migration.sql" > /dev/null 2>&1
done
echo "migrações anteriores aplicadas"

psql_ bfx < "$AQUI/fixture.sql" > /dev/null
psql_ bfx < "$SQL_NOVA" > /dev/null
echo "migração nova aplicada"

echo "== dados de antes não mudam"
x=$(psql_ bfx -tA -c "SELECT coalesce(asaas_customer_id, 'nulo') || '|' || cnpj FROM empresas_parceiras WHERE id = 1")
[ "$x" = "nulo|12.345.678/0001-90" ] || { echo "FALHOU: empresa mudou ($x)"; exit 1; }
n=$(psql_ bfx -tA -c "SELECT count(*) FROM parcelas_vencimento WHERE liquidada_em IS NOT NULL OR paga OR fechamento_id IS DISTINCT FROM 1")
[ "$n" = "0" ] || { echo "FALHOU: parcela mudou ($n)"; exit 1; }
x=$(psql_ bfx -tA -c "SELECT status || '|' || versao_atual FROM fechamentos WHERE id = 1")
[ "$x" = "enviado|1" ] || { echo "FALHOU: fechamento mudou ($x)"; exit 1; }
n=$(psql_ bfx -tA -c "SELECT (SELECT count(*) FROM cobrancas_fechamento) + (SELECT count(*) FROM recebimentos_fechamento)")
[ "$n" = "0" ] || { echo "FALHOU: migração criou cobrança ou recebimento ($n)"; exit 1; }
echo "OK"

echo "== defaults e obrigatórios"
psql_ bfx -c "INSERT INTO cobrancas_fechamento (id, fechamento_id, versao_id, asaas_payment_id, external_reference, valor, vencimento) VALUES (1, 1, 1, 'pay_1', 'FEC-1-2026-10-v1', 600, '2026-10-15')" > /dev/null
x=$(psql_ bfx -tA -c "SELECT status FROM cobrancas_fechamento WHERE id = 1")
[ "$x" = "ativa" ] || { echo "FALHOU: cobrança não nasceu ativa ($x)"; exit 1; }
falha_ "INSERT INTO recebimentos_fechamento (fechamento_id, origem, valor, data_recebimento) VALUES (1, 'manual', 10, '2026-10-15')" \
  || { echo "FALHOU: aceitou recebimento sem status"; exit 1; }
echo "OK"

echo "== uniques"
falha_ "INSERT INTO cobrancas_fechamento (id, fechamento_id, versao_id, asaas_payment_id, external_reference, valor, vencimento, status) VALUES (2, 1, 1, 'pay_1', 'FEC-1-2026-10-v1', 600, '2026-10-15', 'cancelada')" \
  || { echo "FALHOU: aceitou duas cobranças com o mesmo id do Asaas"; exit 1; }
falha_ "INSERT INTO cobrancas_fechamento (id, fechamento_id, versao_id, asaas_payment_id, external_reference, valor, vencimento) VALUES (3, 1, 1, 'pay_2', 'FEC-1-2026-10-v1', 600, '2026-10-15')" \
  || { echo "FALHOU: aceitou duas cobranças ativas no mesmo fechamento"; exit 1; }
psql_ bfx -c "UPDATE cobrancas_fechamento SET status = 'cancelada', cancelada_em = now() WHERE id = 1" > /dev/null
psql_ bfx -c "INSERT INTO cobrancas_fechamento (id, fechamento_id, versao_id, asaas_payment_id, external_reference, valor, vencimento) VALUES (4, 1, 1, 'pay_4', 'FEC-1-2026-10-v1', 600, '2026-10-15')" > /dev/null
echo "OK — uma cobrança ativa por fechamento; cancelada convive com a ativa"
psql_ bfx -c "INSERT INTO recebimentos_fechamento (id, fechamento_id, cobranca_id, origem, valor, data_recebimento, asaas_payment_id, status) VALUES (1, 1, 1, 'asaas', 200, '2026-10-15', 'pay_1', 'confirmado')" > /dev/null
falha_ "INSERT INTO recebimentos_fechamento (id, fechamento_id, cobranca_id, origem, valor, data_recebimento, asaas_payment_id, status) VALUES (2, 1, 1, 'asaas', 200, '2026-10-15', 'pay_1', 'confirmado')" \
  || { echo "FALHOU: aceitou o mesmo pagamento do Asaas duas vezes"; exit 1; }
psql_ bfx -c "INSERT INTO recebimentos_fechamento (id, fechamento_id, origem, valor, data_recebimento, status, comprovante_arquivo_id) VALUES (3, 1, 'manual', 50, '2026-10-16', 'pendente', 2), (4, 1, 'manual', 50, '2026-10-16', 'pendente', NULL)" > /dev/null
echo "OK — um recebimento por pagamento do Asaas; manuais sem id convivem"

echo "== chaves estrangeiras"
falha_ "INSERT INTO cobrancas_fechamento (fechamento_id, versao_id, asaas_payment_id, external_reference, valor, vencimento, status) VALUES (999, 1, 'pay_x', 'x', 1, '2026-10-15', 'cancelada')" \
  || { echo "FALHOU: cobrança com fechamento inexistente"; exit 1; }
falha_ "INSERT INTO recebimentos_fechamento (fechamento_id, origem, valor, data_recebimento, status) VALUES (999, 'manual', 1, '2026-10-15', 'pendente')" \
  || { echo "FALHOU: recebimento com fechamento inexistente"; exit 1; }
falha_ "DELETE FROM cobrancas_fechamento WHERE id = 1" || { echo "FALHOU: apagou cobrança com recebimento"; exit 1; }
falha_ "DELETE FROM fechamento_versoes WHERE id = 1" || { echo "FALHOU: apagou versão com cobrança"; exit 1; }
falha_ "DELETE FROM fechamentos WHERE id = 1" || { echo "FALHOU: apagou fechamento com cobrança"; exit 1; }
# sem cobranças, o recebimento sozinho ainda segura o fechamento
psql_ bfx -c "UPDATE recebimentos_fechamento SET cobranca_id = NULL" > /dev/null
psql_ bfx -c "DELETE FROM cobrancas_fechamento" > /dev/null
falha_ "DELETE FROM fechamentos WHERE id = 1" || { echo "FALHOU: apagou fechamento com recebimento"; exit 1; }
# apagar o arquivo do comprovante solta o recebimento
psql_ bfx -c "DELETE FROM arquivos_financeiros WHERE id = 2" > /dev/null
x=$(psql_ bfx -tA -c "SELECT coalesce(comprovante_arquivo_id::text, 'nulo') FROM recebimentos_fechamento WHERE id = 3")
[ "$x" = "nulo" ] || { echo "FALHOU: arquivo apagado deixou o recebimento apontando ($x)"; exit 1; }
echo "OK"

echo "== schema.prisma × banco"
cd "$REPO"
DIFF=$(mktemp)
DATABASE_URL="postgresql://postgres:teste@localhost:$PORTA/bfx" npx prisma migrate diff \
  --from-url "postgresql://postgres:teste@localhost:$PORTA/bfx" \
  --to-schema-datamodel prisma/schema.prisma --exit-code > "$DIFF" 2>&1 \
  || { echo "FALHOU: schema.prisma diverge do banco:"; cat "$DIFF"; exit 1; }
echo "OK — sem diferença"
