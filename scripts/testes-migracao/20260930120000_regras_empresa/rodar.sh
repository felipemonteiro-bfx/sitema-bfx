#!/usr/bin/env bash
# Teste da migração 20260930120000_regras_empresa (2026-09-30).
#
# O CI não tem Postgres e o `prisma migrate deploy` roda no start do pod: sem este teste, a
# primeira execução do SQL seria em produção. Um Postgres 16 descartável (porta 55432) recebe todas
# as migrações anteriores em ordem, num banco-modelo copiado para dois bancos:
#   - bfx: as duplicatas exatas da produção (fixture.sql). A migração tem de apagar as cópias,
#     abater o lote e gravar um audit — conferido por verifica.sql, que falha na primeira
#     divergência.
#   - bfx_nao_exata: uma duplicata com valor diferente (fixture-nao-exata.sql). A migração tem de
#     abortar com a mensagem que diz qual venda reparar, sem apagar nenhuma linha.
#
#   ./rodar.sh                   # a migração do repositório
#   ./rodar.sh /tmp/mutante.sql  # uma cópia alterada, para provar que a conferência pega o erro
#
# Precisa de docker. Exit 0 = passou.
set -euo pipefail
REPO="$(cd "$(dirname "$0")/../../.." && pwd)"
AQUI="$(cd "$(dirname "$0")" && pwd)"
NOVA=20260930120000_regras_empresa
SQL_NOVA="${1:-$REPO/prisma/migrations/$NOVA/migration.sql}"
NOME=bfx-migracao-teste
docker rm -f $NOME >/dev/null 2>&1 || true
docker run -d --name $NOME -p 55432:5432 -e POSTGRES_PASSWORD=teste -e POSTGRES_DB=bfx_modelo postgres:16 >/dev/null
trap 'docker rm -f $NOME >/dev/null 2>&1 || true' EXIT
# O entrypoint sobe o servidor, roda o init e reinicia: espera a segunda "ready to accept".
for i in $(seq 1 90); do
  [ "$(docker logs $NOME 2>&1 | grep -c 'ready to accept connections')" -ge 2 ] && break; sleep 1
done
psql_() { local db=$1; shift; docker exec -i $NOME psql -v ON_ERROR_STOP=1 -q -U postgres -d "$db" "$@"; }
for dir in $(ls "$REPO/prisma/migrations" | grep -v migration_lock | sort); do
  [ "$dir" = "$NOVA" ] && continue
  psql_ bfx_modelo < "$REPO/prisma/migrations/$dir/migration.sql" > /dev/null
done
echo "migrações anteriores aplicadas"
psql_ postgres -c "CREATE DATABASE bfx TEMPLATE bfx_modelo" -c "CREATE DATABASE bfx_nao_exata TEMPLATE bfx_modelo"

echo "== duplicatas exatas (bfx)"
psql_ bfx < "$AQUI/fixture.sql" > /dev/null
psql_ bfx < "$SQL_NOVA"
psql_ bfx < "$AQUI/verifica.sql" 2>&1 | tail -30

echo "== duplicata não exata (bfx_nao_exata)"
psql_ bfx_nao_exata < "$AQUI/fixture-nao-exata.sql" > /dev/null
if saida=$(psql_ bfx_nao_exata < "$SQL_NOVA" 2>&1); then
  echo "FALHOU: a migração passou com duplicata não exata"; exit 1
fi
echo "$saida" | grep -F 'parcelas_vencimento com numero repetido (venda/parcela): 61/1' \
  || { echo "FALHOU: mensagem inesperada:"; echo "$saida"; exit 1; }
restantes=$(psql_ bfx_nao_exata -tA -c "SELECT string_agg(id::text, ',' ORDER BY id) FROM parcelas_vencimento")
[ "$restantes" = "70,71" ] || { echo "FALHOU: linhas da duplicata não exata mudaram: $restantes"; exit 1; }
auditoria=$(psql_ bfx_nao_exata -tA -c "SELECT count(*) FROM audit_logs WHERE acao = 'parcelas:dedup-duplicatas-exatas'")
[ "$auditoria" = "0" ] || { echo "FALHOU: audit gravado sem nada apagado"; exit 1; }
echo "OK — duplicata não exata aborta com a venda na mensagem, sem apagar nada"
