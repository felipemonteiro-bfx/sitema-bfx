# SUMMARY — Conciliação com a planilha, visão por mês e deploy destravado

Data: 2026-09-11 · Spec: `SPEC.md` (nesta pasta)

## Entregue

1. **Conciliação** — `prisma/migrations/20260911120000_conciliacao_planilha_antecipacao/migration.sql`.
   Marca como antecipadas as 211 parcelas "ANTECIPAÇÃO OK" da planilha que casaram com o sistema
   (61 vendas, R$ 63.199,43; 186 delas em vendas que estavam com `antecipada = 0`, 25 em vendas
   que já estavam em 1). Roda no `prisma migrate deploy` do start do pod. Guardas: parcela ainda
   não antecipada, valor igual ao da conciliação (±R$ 0,01), venda ativa em desconto em folha.
   Flag da venda recalculado sem rebaixar quem está em 1. Registro em `audit_logs`
   (`acao = antecipacao:conciliacao-planilha`, com os ids marcados). Gerada por
   `scratchpad/marcacao/gerar_migracao.py` a partir do CSV da conciliação.
2. **Bug corrigido** — `updateVenda` preserva `antecipada` ao recriar as parcelas
   (`src/app/(app)/historico/actions.ts`).
3. **Visão por mês** — aba "Por mês" no card da `/prudent` (`resumirAntecipacaoPorMes`, regra
   única `baldeDaParcela` compartilhada com o resumo por comprador). Aviso reescrito para dizer
   exatamente o que a conciliação cobre. Filtros da fila rotulados "Vencimento de/até", com label
   ligado ao campo.
4. **Deploy destravado** — `Dockerfile`: o estágio `deps` não roda mais `apt-get`. Primeiro o
   Release do bullseye-security expirou; o `Check-Valid-Until=false` (commit `ff69118`) passou do
   índice, mas o deploy seguinte caiu em 404 nos pacotes (`libperl5.32`, `libexpat1`), porque o
   bullseye-security saiu do espelho. O apt só instalava o `git`, que o build não usa: nenhuma
   dependência vem de repositório git (`yarn.lock` v1), não há `prepare`/`postinstall`, e o `.git`
   nem entra no contexto (`.dockerignore`). Sem apt, o build não depende mais do espelho do Debian.

## Verificação

- Vitest real, rodado em Docker (`node:20-bookworm-slim`, o `node_modules` é linux-arm64):
  suíte inteira com 1.100 testes passando. Duas suítes da Uber não carregam no container por
  falta de env vars (`src/env.ts`) — passam no CI, que tem as variáveis.
- RED visto antes de cada implementação: 2 falhas no teste do `updateVenda`, 3 na visão por mês.
- Migração testada num Postgres 16 local com o schema real (54 migrações aplicadas): marca só as
  6 parcelas elegíveis do cenário; vendas parcial → 3, completa → 1, já em 1 continua 1, legado
  em folha → 1; PIX, cancelada e valor editado intocados; segunda execução não muda nada.
- `tsc` sem erro nos arquivos tocados; `cores:check` e `jsx:check` OK.

## Revisão em subagentes

UI (aplicado): vencidas sumiam no celular na aba por mês; tabela estourava 400px; texto do aviso
prometia mais que a migração; placeholders contraditórios; rótulos sem `htmlFor`; estado vazio
com o switch já ligado. Não aplicado: nome do mês por extenso (alarga a coluna no celular).

Dados (aplicado): a edição de venda ainda apagava parcela antecipada ao reduzir o número de
parcelas ou virar pagamento único — as guardas agora travam `paga || antecipada` (caso real: venda
52, cabeçalho em 1 parcela com 2 linhas); a edição passa a recalcular `vendas.antecipada` quando
há antecipação registrada por parcela (uma venda em 1 que ganhasse parcela nova a esconderia da
fila), sem tocar nas vendas legadas; a migração passa a conferir também `venda_id` e
`numero_parcela`, não só o id. O revisor rodou a migração contra um snapshot real do VKE: 211
parcelas, R$ 63.199,43, 39 vendas 0 → 1, 14 vendas 0 → 3, nenhuma rebaixada; `prisma migrate
deploy` real com exit 0.

**Para o André decidir:** a venda 64 já estava em 1; a planilha tem 4 das 5 parcelas como
"ANTECIPAÇÃO OK" e não tem a 5/5. Pela regra "nunca rebaixa", a parcela que vence em 30/09/2026
continua contada como antecipada. Se não foi, ela está escondida da fila.

## Continua fora

- A fila ainda deixa antecipar parcela vencida (decisão do André: muda a action e o DRE).
- 271 linhas da planilha sem par no sistema; 21 vendas em folha sem parcelas cadastradas.
- Migrar o Dockerfile para bookworm (OpenSSL 3 nas engines do Prisma).
