#!/usr/bin/env bash
# Teste da migração 20260930150000_fechamentos (2026-09-30, Fase 5).
#
# Um Postgres 16 descartável (porta 55435, container pg-fase5) recebe todas as migrações
# anteriores em ordem, depois os dados de fixture.sql (anteriores à Fase 5), e só então a
# migração nova. Em seguida:
#   - os dados de antes não mudam (parcelas sem reserva nem liquidação, nenhum fechamento);
#   - as uniques: um fechamento por empresa e competência; um número de versão por fechamento;
#   - as FKs: empresa com fechamento não é apagada (Restrict); apagar o fechamento solta a reserva
#     da parcela (SetNull) e leva versões, linhas e ajustes (Cascade); apagar a parcela deixa a
#     linha da foto sem parcela (SetNull); apagar o arquivo solta a versão (SetNull);
#   - `prisma migrate diff` do banco para o schema.prisma tem de sair vazio.
#
#   ./rodar.sh                   # a migração do repositório
#   ./rodar.sh /tmp/mutante.sql  # uma cópia alterada, para provar que a conferência pega o erro
#
# Precisa de docker. Exit 0 = passou.
set -euo pipefail
REPO="$(cd "$(dirname "$0")/../../.." && pwd)"
AQUI="$(cd "$(dirname "$0")" && pwd)"
NOVA=20260930150000_fechamentos
SQL_NOVA="${1:-$REPO/prisma/migrations/$NOVA/migration.sql}"
NOME=pg-fase5
PORTA=55435
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
  psql_ bfx < "$REPO/prisma/migrations/$dir/migration.sql" > /dev/null
done
echo "migrações anteriores aplicadas"

psql_ bfx < "$AQUI/fixture.sql" > /dev/null
psql_ bfx < "$SQL_NOVA" > /dev/null
echo "migração nova aplicada"

echo "== dados de antes não mudam"
n=$(psql_ bfx -tA -c "SELECT count(*) FROM parcelas_vencimento WHERE fechamento_id IS NOT NULL OR liquidada_em IS NOT NULL")
[ "$n" = "0" ] || { echo "FALHOU: parcela antiga ganhou reserva ou liquidação ($n)"; exit 1; }
n=$(psql_ bfx -tA -c "SELECT count(*) FROM fechamentos")
[ "$n" = "0" ] || { echo "FALHOU: migração criou fechamento ($n)"; exit 1; }
n=$(psql_ bfx -tA -c "SELECT count(*) FROM parcelas_vencimento WHERE id IN (80, 81)")
[ "$n" = "2" ] || { echo "FALHOU: parcelas sumiram ($n)"; exit 1; }
echo "OK"

echo "== uniques"
psql_ bfx -c "INSERT INTO fechamentos (id, empresa_parceira_id, competencia, atualizado_em) VALUES (1, 1, '2026-10', now())" > /dev/null
s=$(psql_ bfx -tA -c "SELECT status || '|' || versao_atual || '|' || desatualizado FROM fechamentos WHERE id = 1")
[ "$s" = "em_preparacao|0|false" ] || { echo "FALHOU: defaults do fechamento ($s)"; exit 1; }
falha_ "INSERT INTO fechamentos (id, empresa_parceira_id, competencia, atualizado_em) VALUES (2, 1, '2026-10', now())" \
  || { echo "FALHOU: aceitou dois fechamentos da mesma empresa e competência"; exit 1; }
psql_ bfx -c "INSERT INTO fechamentos (id, empresa_parceira_id, competencia, atualizado_em) VALUES (3, 1, '2026-11', now())" > /dev/null
echo "OK — um fechamento por empresa e competência"
psql_ bfx -c "INSERT INTO fechamento_versoes (id, fechamento_id, numero, total_bruto, total_ajustes, total_final, ajustes_json, xlsx_arquivo_id) VALUES (1, 1, 1, 300, 0, 300, '[]', 1)" > /dev/null
falha_ "INSERT INTO fechamento_versoes (id, fechamento_id, numero, total_bruto, total_ajustes, total_final, ajustes_json) VALUES (2, 1, 1, 300, 0, 300, '[]')" \
  || { echo "FALHOU: aceitou duas versões 1 do mesmo fechamento"; exit 1; }
psql_ bfx -c "INSERT INTO fechamento_versoes (id, fechamento_id, numero, total_bruto, total_ajustes, total_final, ajustes_json) VALUES (3, 1, 2, 300, 0, 300, '[]')" > /dev/null
echo "OK — um número de versão por fechamento"

echo "== chaves estrangeiras"
falha_ "INSERT INTO fechamentos (id, empresa_parceira_id, competencia, atualizado_em) VALUES (9, 999, '2026-10', now())" \
  || { echo "FALHOU: fechamento com empresa inexistente"; exit 1; }
falha_ "UPDATE parcelas_vencimento SET fechamento_id = 999 WHERE id = 80" \
  || { echo "FALHOU: reserva num fechamento inexistente"; exit 1; }
psql_ bfx -c "UPDATE parcelas_vencimento SET fechamento_id = 1 WHERE id IN (80, 81)" > /dev/null
psql_ bfx -c "INSERT INTO fechamento_linhas (id, versao_id, parcela_id, venda_id, numero_parcela, total_parcelas, cliente_nome, valor, vencimento, antecipada) VALUES (1, 1, 80, 61, 1, 2, 'CLIENTE A', 300, '2026-10-10', true), (2, 1, 81, 61, 2, 2, 'CLIENTE A', 300, '2026-11-10', false)" > /dev/null
psql_ bfx -c "INSERT INTO fechamento_ajustes (id, fechamento_id, valor, justificativa) VALUES (1, 1, -10, 'desconto combinado')" > /dev/null
falha_ "DELETE FROM empresas_parceiras WHERE id = 1" || { echo "FALHOU: apagou empresa com fechamento"; exit 1; }
# apagar o arquivo solta a versão
psql_ bfx -c "DELETE FROM arquivos_financeiros WHERE id = 1" > /dev/null
x=$(psql_ bfx -tA -c "SELECT coalesce(xlsx_arquivo_id::text, 'nulo') FROM fechamento_versoes WHERE id = 1")
[ "$x" = "nulo" ] || { echo "FALHOU: arquivo apagado deixou a versão apontando ($x)"; exit 1; }
# apagar a parcela (edição de venda recria parcelas) deixa a linha da foto sem parcela
psql_ bfx -c "DELETE FROM parcelas_vencimento WHERE id = 81" > /dev/null
x=$(psql_ bfx -tA -c "SELECT coalesce(parcela_id::text, 'nulo') FROM fechamento_linhas WHERE id = 2")
[ "$x" = "nulo" ] || { echo "FALHOU: linha ficou apontando para parcela apagada ($x)"; exit 1; }
# apagar o fechamento solta a reserva e leva versões, linhas e ajustes
psql_ bfx -c "DELETE FROM fechamentos WHERE id = 1" > /dev/null
x=$(psql_ bfx -tA -c "SELECT coalesce(fechamento_id::text, 'nulo') FROM parcelas_vencimento WHERE id = 80")
[ "$x" = "nulo" ] || { echo "FALHOU: reserva sobreviveu ao fechamento ($x)"; exit 1; }
n=$(psql_ bfx -tA -c "SELECT (SELECT count(*) FROM fechamento_versoes WHERE fechamento_id = 1) + (SELECT count(*) FROM fechamento_linhas) + (SELECT count(*) FROM fechamento_ajustes)")
[ "$n" = "0" ] || { echo "FALHOU: versões/linhas/ajustes sobreviveram ao fechamento ($n)"; exit 1; }
echo "OK"

echo "== schema.prisma × banco"
cd "$REPO"
DIFF=$(mktemp)
DATABASE_URL="postgresql://postgres:teste@localhost:$PORTA/bfx" npx prisma migrate diff \
  --from-url "postgresql://postgres:teste@localhost:$PORTA/bfx" \
  --to-schema-datamodel prisma/schema.prisma --exit-code > "$DIFF" 2>&1 \
  || { echo "FALHOU: schema.prisma diverge do banco:"; cat "$DIFF"; exit 1; }
echo "OK — sem diferença"
