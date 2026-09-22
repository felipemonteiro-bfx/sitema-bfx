# Task 5 — Cron diário de relatório mensal configurável

## Status

Implementação concluída e validada no escopo solicitado.

## Alterações

- `src/app/api/cron/relatorio-mensal/route.ts`
  - Mantém a autenticação por `autorizarCron` antes de qualquer acesso ao banco.
  - Determina data, dia e competência no fuso `America/Manaus`; consulta os dias configurados e seleciona somente empresas cujo dia efetivo coincide com hoje (`null` equivale ao dia 1).
  - Processa cada empresa selecionada com os limites UTC do mês corrente até o fim do dia em Manaus e retorna a contagem `empresas`; uma seleção vazia retorna sucesso com `empresas: 0` e não chama o serviço.
- `deploy/bfx/cronjobs-app.yaml`
  - Agenda `bfx-relatorio-mensal` diariamente às 12:00 UTC (08:00 Manaus), preservando horário e política de concorrência.
- `src/__tests__/relatorio-mensal-route.test.ts`
  - Cobre seleção do dia 21, exclusão de outros dias e do fallback nesse dia, fallback de configuração ausente no dia 1, limites parciais de Manaus e seleção vazia.

## TDD

1. Os testes de rota foram adicionados antes da alteração de produção.
2. RED confirmado com `npx vitest run src/__tests__/relatorio-mensal-route.test.ts`: os três testes falharam porque a rota anterior processava todas as empresas com a competência anterior, sem limites parciais.
3. Após a implementação, a mesma suíte passou com 3/3 testes.

## Verificação final

- `npx vitest run src/__tests__/relatorio-mensal-route.test.ts src/__tests__/cron-auth.test.ts` — 2 arquivos, 8 testes aprovados.
- `npx eslint src/app/api/cron/relatorio-mensal/route.ts` — exit 0, sem erros.
- `git diff --check` — sem erros de whitespace.

## Autorrevisão

- Confirmado que a autorização continua sendo a primeira condição da rota e que a suíte de autenticação permanece aprovada.
- Confirmado que o período e os limites partem da mesma referência temporal e usam o dia civil de Manaus.
- Confirmado que nenhuma empresa fora do dia efetivo dispara o serviço e que a resposta vazia não envia relatórios.
- Confirmado que somente os três arquivos da Task 5 serão incluídos no commit; alterações preexistentes em `src/app/(app)/venda-rapida/actions.ts`, `src/lib/parcelas.ts` e `task-4-report.md` ficam intactas e fora dele.

## Correção da revisão mandatória

- `diaEfetivoRelatorioMensal` agora recebe o último dia do mês e normaliza dias configurados 29–31 para `min(diaConfigurado, ultimoDiaDoMes)`. A rota calcula esse limite a partir da data civil de Manaus. Há cobertura para dia 31 no último dia de fevereiro e abril.
- A seleção automática resolve os grupos econômicos antes de disparar o serviço. Cada grupo é enviado uma vez, no menor dia efetivo de seus membros, sempre com `grupo.canonica.id` (ID determinístico); isso impede que membros vinculados acionem o mesmo consolidado mais de uma vez.
- Foram restaurados os parâmetros manuais `periodo`, `empresaId` e `force`, com o contrato anterior de período completo. Somente a chamada sem parâmetros usa seleção diária e limites parciais do mês atual em Manaus.

### Evidência TDD e verificação focada

1. RED confirmado com `npx vitest run src/__tests__/empresa-relatorio-config.test.ts src/__tests__/relatorio-mensal-route.test.ts`: 5 falhas esperadas — o helper não limitava o dia 31, fevereiro/abril não selecionavam a empresa e parâmetros manuais caíam no fluxo automático.
2. GREEN confirmado com o mesmo comando: 2 arquivos, 13 testes aprovados.
3. Verificação final focada: `npx vitest run src/__tests__/relatorio-mensal-route.test.ts src/__tests__/empresa-relatorio-config.test.ts src/__tests__/cron-auth.test.ts` — 3 arquivos, 18 testes aprovados; `npx eslint src/app/api/cron/relatorio-mensal/route.ts src/lib/relatorio-mensal-config.ts src/__tests__/relatorio-mensal-route.test.ts src/__tests__/empresa-relatorio-config.test.ts` — exit 0; `git diff --check` — sem erros.

Nenhuma suíte completa foi executada nesta correção; a validação foi restrita ao escopo solicitado.
