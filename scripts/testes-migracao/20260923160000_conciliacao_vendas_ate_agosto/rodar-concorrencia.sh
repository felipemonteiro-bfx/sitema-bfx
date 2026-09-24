#!/usr/bin/env bash
# Teste de concorrência da migração 20260923160000_conciliacao_vendas_ate_agosto (2026-09-23).
#
# Cenário da revisão: durante o rolling update, o webhook do Asaas (ou uma baixa manual) commita a
# baixa de uma parcela do recorte DEPOIS de a migração tirar o snapshot e ANTES de o UPDATE chegar
# no lock daquela linha. Sem a guarda de pagamento repetida no WHERE do UPDATE, a origem do
# dinheiro era reescrita para 'prudent' — reproduzido em Postgres 16.
#
# Aqui a sessão B abre uma transação, dá a baixa em 'asaas' na parcela 1 e só commita depois; a
# migração roda em paralelo, bloqueia no lock e, ao destravar, tem de PULAR essa parcela. A rede de
# segurança da migração reconcilia o total do lote e registra o ajuste.
#
#   ./rodar-concorrencia.sh                 # a migração do repositório
#   ./rodar-concorrencia.sh /tmp/mutante.sql   # uma cópia sem a guarda, para provar que o teste pega
#
# Precisa de docker. Exit 0 = passou.
set -euo pipefail
REPO="$(cd "$(dirname "$0")/../../.." && pwd)"
AQUI="$(cd "$(dirname "$0")" && pwd)"
NOVA=20260923160000_conciliacao_vendas_ate_agosto
SQL_NOVA="${1:-$REPO/prisma/migrations/$NOVA/migration.sql}"
NOME=bfx-migracao-concorrencia
docker rm -f $NOME >/dev/null 2>&1 || true
docker run -d --name $NOME -e POSTGRES_PASSWORD=teste -e POSTGRES_DB=bfx postgres:16 >/dev/null
trap 'docker rm -f $NOME >/dev/null 2>&1 || true' EXIT
for i in $(seq 1 90); do
  [ "$(docker logs $NOME 2>&1 | grep -c 'ready to accept connections')" -ge 2 ] && break; sleep 1
done
psql_() { docker exec -i $NOME psql -v ON_ERROR_STOP=1 -q -U postgres -d bfx "$@"; }
for dir in $(ls "$REPO/prisma/migrations" | grep -v migration_lock | sort); do
  [ "$dir" = "$NOVA" ] && continue
  psql_ < "$REPO/prisma/migrations/$dir/migration.sql" > /dev/null
done
psql_ < "$AQUI/fixture.sql" > /dev/null
echo "migrações anteriores e fixture aplicados"

# Sessão B: baixa do Asaas na parcela 1, commitada 6 s depois de começar.
psql_ <<'SQL' > /dev/null &
BEGIN;
UPDATE parcelas_vencimento
   SET paga = true, origem_pagamento = 'asaas', data_pagamento = '2026-09-22 00:00:00', asaas_payment_id = 'pay_concorrente'
 WHERE id = 1;
SELECT pg_sleep(6);
COMMIT;
SQL
B=$!
sleep 2   # a migração entra com a parcela 1 ainda livre no seu snapshot e bloqueia no lock
psql_ < "$SQL_NOVA"
wait $B
psql_ < "$AQUI/verifica-concorrencia.sql" 2>&1 | tail -30
