#!/usr/bin/env bash
# Teste da migração 20260930140000_boletos_prudent (2026-09-30, Fase 4).
#
# O `prisma migrate deploy` roda no start do pod: sem este teste, a primeira execução do SQL seria
# em produção. Um Postgres 16 descartável (porta 55434, container pg-fase4) recebe todas as
# migrações anteriores em ordem, depois os dados de fixture.sql (anteriores à Fase 4), e só então
# a migração nova. Em seguida:
#   - os dados de antes não mudam (parcelas sem boleto, config sem e-mail do financeiro);
#   - o índice parcial: dois boletos vivos no mesmo lote e vencimento → erro; um substituído (ou
#     cancelado) mais um vivo → ok; vencimentos diferentes → ok;
#   - as FKs: boleto com parcela ou pagamento ligado não é apagado (Restrict); apagar o arquivo do
#     PDF solta o boleto (SetNull); comprovante repetido → erro (hash único);
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
NOVA=20260930140000_boletos_prudent
SQL_NOVA="${1:-$REPO/prisma/migrations/$NOVA/migration.sql}"
NOME=pg-fase4
PORTA=55434
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
n=$(psql_ bfx -tA -c "SELECT count(*) FROM parcelas_vencimento WHERE boleto_prudent_id IS NOT NULL")
[ "$n" = "0" ] || { echo "FALHOU: parcela antiga ganhou boleto ($n)"; exit 1; }
n=$(psql_ bfx -tA -c "SELECT count(*) FROM boletos_prudent")
[ "$n" = "0" ] || { echo "FALHOU: migração criou boleto ($n)"; exit 1; }
e=$(psql_ bfx -tA -c "SELECT coalesce(email_financeiro, 'nulo') FROM config WHERE id = 1")
[ "$e" = "nulo" ] || { echo "FALHOU: email_financeiro nasceu $e"; exit 1; }
echo "OK"

echo "== índice parcial: um boleto vivo por lote e vencimento"
psql_ bfx -c "INSERT INTO boletos_prudent (id, lote_id, vencimento, valor_esperado, atualizado_em) VALUES (1, 20, '2026-10-10', 300, now())" > /dev/null
falha_ "INSERT INTO boletos_prudent (id, lote_id, vencimento, valor_esperado, status, atualizado_em) VALUES (2, 20, '2026-10-10', 300, 'a_pagar', now())" \
  || { echo "FALHOU: aceitou dois boletos vivos no mesmo lote e vencimento"; exit 1; }
echo "OK — dois vivos recusados"
# substituição: o original vira substituido, o novo (vivo) aponta para ele
psql_ bfx -c "UPDATE boletos_prudent SET status = 'substituido' WHERE id = 1" > /dev/null
psql_ bfx -c "INSERT INTO boletos_prudent (id, lote_id, vencimento, valor_esperado, substitui_id, atualizado_em) VALUES (3, 20, '2026-10-10', 300, 1, now())" > /dev/null
echo "OK — substituído + vivo aceito"
psql_ bfx -c "INSERT INTO boletos_prudent (id, lote_id, vencimento, valor_esperado, status, atualizado_em) VALUES (4, 20, '2026-10-10', 300, 'cancelado', now())" > /dev/null
echo "OK — cancelado + vivo aceito"
psql_ bfx -c "INSERT INTO boletos_prudent (id, lote_id, vencimento, valor_esperado, atualizado_em) VALUES (5, 20, '2026-11-10', 300, now())" > /dev/null
echo "OK — outro vencimento do mesmo lote aceito"
falha_ "INSERT INTO boletos_prudent (id, lote_id, vencimento, valor_esperado, substitui_id, atualizado_em) VALUES (6, 20, '2026-12-10', 300, 1, now())" \
  || { echo "FALHOU: dois boletos substituindo o mesmo original"; exit 1; }
echo "OK — um substituto por original"

echo "== chaves estrangeiras"
psql_ bfx -c "UPDATE parcelas_vencimento SET boleto_prudent_id = 3 WHERE id = 80" > /dev/null
falha_ "DELETE FROM boletos_prudent WHERE id = 3" || { echo "FALHOU: apagou boleto com parcela ligada"; exit 1; }
psql_ bfx -c "INSERT INTO arquivos_financeiros (id, nome, content_type, tamanho, sha256, conteudo) VALUES (1, 'b.pdf', 'application/pdf', 4, 'abc', '\\x25504446')" > /dev/null
psql_ bfx -c "UPDATE boletos_prudent SET pdf_arquivo_id = 1 WHERE id = 5" > /dev/null
psql_ bfx -c "INSERT INTO boletos_prudent_pagamentos (id, boleto_id, data_pagamento, valor_principal, comprovante_hash) VALUES (1, 5, '2026-11-09', 300, 'h1')" > /dev/null
falha_ "DELETE FROM boletos_prudent WHERE id = 5" || { echo "FALHOU: apagou boleto com pagamento"; exit 1; }
falha_ "INSERT INTO boletos_prudent_pagamentos (id, boleto_id, data_pagamento, valor_principal, comprovante_hash) VALUES (2, 5, '2026-11-09', 1, 'h1')" \
  || { echo "FALHOU: aceitou comprovante repetido"; exit 1; }
psql_ bfx -c "DELETE FROM arquivos_financeiros WHERE id = 1" > /dev/null
p=$(psql_ bfx -tA -c "SELECT coalesce(pdf_arquivo_id::text, 'nulo') FROM boletos_prudent WHERE id = 5")
[ "$p" = "nulo" ] || { echo "FALHOU: arquivo apagado deixou o boleto apontando ($p)"; exit 1; }
falha_ "INSERT INTO boletos_prudent (id, lote_id, vencimento, valor_esperado, atualizado_em) VALUES (7, 999, '2026-10-10', 1, now())" \
  || { echo "FALHOU: boleto com lote inexistente"; exit 1; }
echo "OK"

echo "== schema.prisma × banco"
cd "$REPO"
DIFF=$(mktemp)
DATABASE_URL="postgresql://postgres:teste@localhost:$PORTA/bfx" npx prisma migrate diff \
  --from-url "postgresql://postgres:teste@localhost:$PORTA/bfx" \
  --to-schema-datamodel prisma/schema.prisma --exit-code > "$DIFF" 2>&1 \
  || { echo "FALHOU: schema.prisma diverge do banco:"; cat "$DIFF"; exit 1; }
echo "OK — sem diferença"
