#!/usr/bin/env bash
# Teste da migração 20260930130000_confirmacao_rh_e_lote (2026-09-30, Fase 3).
#
# O `prisma migrate deploy` roda no start do pod: sem este teste, a primeira execução do SQL seria
# em produção. Um Postgres 16 descartável (porta 55433, container pg-fase3) recebe todas as
# migrações anteriores em ordem, depois as parcelas de fixture.sql (anteriores à Fase 3), e só
# então a migração nova. verifica.sql confere o backfill "legado" e o audit. Em seguida:
#   - rodar a migração de novo não grava um segundo audit nem muda as parcelas (idempotência do
#     backfill — a parte DDL já existiria, então só o bloco de backfill é reaplicado);
#   - `prisma migrate diff` do banco para o schema.prisma tem de sair vazio.
#
#   ./rodar.sh                   # a migração do repositório
#   ./rodar.sh /tmp/mutante.sql  # uma cópia alterada, para provar que a conferência pega o erro
#
# Precisa de docker. Exit 0 = passou.
set -euo pipefail
REPO="$(cd "$(dirname "$0")/../../.." && pwd)"
AQUI="$(cd "$(dirname "$0")" && pwd)"
NOVA=20260930130000_confirmacao_rh_e_lote
SQL_NOVA="${1:-$REPO/prisma/migrations/$NOVA/migration.sql}"
NOME=pg-fase3
PORTA=55433
docker rm -f $NOME >/dev/null 2>&1 || true
docker run -d --name $NOME -p $PORTA:5432 -e POSTGRES_PASSWORD=teste -e POSTGRES_DB=bfx postgres:16 >/dev/null
trap 'docker rm -f $NOME >/dev/null 2>&1 || true' EXIT
# O entrypoint sobe o servidor, roda o init e reinicia: espera a segunda "ready to accept".
for i in $(seq 1 90); do
  [ "$(docker logs $NOME 2>&1 | grep -c 'ready to accept connections')" -ge 2 ] && break; sleep 1
done
psql_() { local db=$1; shift; docker exec -i $NOME psql -v ON_ERROR_STOP=1 -q -U postgres -d "$db" "$@"; }
for dir in $(ls "$REPO/prisma/migrations" | grep -v migration_lock | sort); do
  [ "$dir" = "$NOVA" ] && continue
  psql_ bfx < "$REPO/prisma/migrations/$dir/migration.sql" > /dev/null
done
echo "migrações anteriores aplicadas"

psql_ bfx < "$AQUI/fixture.sql" > /dev/null
psql_ bfx < "$SQL_NOVA"
psql_ bfx < "$AQUI/verifica.sql" 2>&1 | tail -5

echo "== backfill reaplicado não muda nada"
antes=$(psql_ bfx -tA -c "SELECT string_agg(id || '|' || confirmacao_em::text, ',' ORDER BY id) FROM parcelas_vencimento")
# Só a parte de dados (do WITH em diante); o DDL falharia por coluna já existente.
sed -n '/^WITH marcadas AS/,$p' "$SQL_NOVA" | psql_ bfx > /dev/null
depois=$(psql_ bfx -tA -c "SELECT string_agg(id || '|' || confirmacao_em::text, ',' ORDER BY id) FROM parcelas_vencimento")
[ "$antes" = "$depois" ] || { echo "FALHOU: backfill reaplicado mudou parcelas"; exit 1; }
n=$(psql_ bfx -tA -c "SELECT count(*) FROM audit_logs WHERE acao = 'prudent:confirmacao-rh-legado'")
[ "$n" = "1" ] || { echo "FALHOU: backfill reaplicado gravou audit ($n)"; exit 1; }
echo "OK — idempotente"

echo "== parcela nova nasce aguardando"
psql_ bfx -c "INSERT INTO parcelas_vencimento (id, venda_id, numero_parcela, data_vencimento, valor_parcela) VALUES (83, 62, 2, '2026-11-10', 1)" > /dev/null
estado=$(psql_ bfx -tA -c "SELECT coalesce(confirmacao_rh, 'nulo') FROM parcelas_vencimento WHERE id = 83")
[ "$estado" = "nulo" ] || { echo "FALHOU: parcela nova nasceu $estado"; exit 1; }
echo "OK"

echo "== schema.prisma × banco"
cd "$REPO"
DIFF=$(mktemp)
DATABASE_URL="postgresql://postgres:teste@localhost:$PORTA/bfx" npx prisma migrate diff \
  --from-url "postgresql://postgres:teste@localhost:$PORTA/bfx" \
  --to-schema-datamodel prisma/schema.prisma --exit-code > "$DIFF" 2>&1 \
  || { echo "FALHOU: schema.prisma diverge do banco:"; cat "$DIFF"; exit 1; }
echo "OK — sem diferença"
