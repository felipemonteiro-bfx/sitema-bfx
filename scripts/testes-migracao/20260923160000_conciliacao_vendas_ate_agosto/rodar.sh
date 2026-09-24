#!/usr/bin/env bash
# Teste da migração 20260923160000_conciliacao_vendas_ate_agosto (2026-09-23).
#
# O CI não tem Postgres e o `prisma migrate deploy` roda no start do pod: sem este teste, a
# primeira execução do SQL seria em produção. Aqui um Postgres 16 descartável recebe todas as
# migrações em ordem, o fixture de `fixture.sql`, a migração nova e as conferências de
# `verifica.sql` — que falham com exceção na primeira divergência. Roda duas vezes para provar
# que a segunda execução não muda nada.
#
#   ./rodar.sh                 # a migração do repositório
#   ./rodar.sh /tmp/mutante.sql   # uma cópia alterada, para provar que a conferência pega o erro
#
# Precisa de docker. Exit 0 = passou.
set -euo pipefail
REPO="$(cd "$(dirname "$0")/../../.." && pwd)"
AQUI="$(cd "$(dirname "$0")" && pwd)"
NOVA=20260923160000_conciliacao_vendas_ate_agosto
# Opcional: caminho de um SQL alternativo (cópia mutada), para provar que o teste pega o erro.
SQL_NOVA="${1:-$REPO/prisma/migrations/$NOVA/migration.sql}"
NOME=bfx-migracao-teste
docker rm -f $NOME >/dev/null 2>&1 || true
docker run -d --name $NOME -e POSTGRES_PASSWORD=teste -e POSTGRES_DB=bfx postgres:16 >/dev/null
trap 'docker rm -f $NOME >/dev/null 2>&1 || true' EXIT
# O entrypoint sobe o servidor, roda o init e reinicia: espera a segunda "ready to accept".
for i in $(seq 1 90); do
  [ "$(docker logs $NOME 2>&1 | grep -c 'ready to accept connections')" -ge 2 ] && break; sleep 1
done
psql_() { docker exec -i $NOME psql -v ON_ERROR_STOP=1 -q -U postgres -d bfx "$@"; }
for dir in $(ls "$REPO/prisma/migrations" | grep -v migration_lock | sort); do
  [ "$dir" = "$NOVA" ] && continue
  psql_ < "$REPO/prisma/migrations/$dir/migration.sql" > /dev/null
done
echo "migrações anteriores aplicadas"
psql_ < "$AQUI/fixture.sql" > /dev/null
psql_ < "$SQL_NOVA"
psql_ < "$AQUI/verifica.sql" 2>&1 | tail -30
echo "== segunda execução (não pode mudar nada)"
psql_ < "$SQL_NOVA"
psql_ < "$AQUI/verifica.sql" 2>&1 | tail -30
