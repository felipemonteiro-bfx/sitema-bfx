---
phase: 06-integridade-de-dados-fornecedores-e-exportacao
plan: 02
subsystem: database
tags: [prisma, csv-import, soft-delete, rbac, audit-log, next.js-server-actions]

requires:
  - phase: 06-01
    provides: "Fornecedor.deletedAt no schema, classificarNomeFornecedor/normalizarNomeFornecedor (contrato puro)"
provides:
  - "src/lib/fornecedor-import.ts estendido: parseCsvFornecedores, planejarImportacaoFornecedores, LIMITE_LINHAS_IMPORT"
  - "Tela /importacao/fornecedores: dry-run + commit idempotente por nome normalizado"
  - "analisarImportacaoFornecedores / confirmarImportacaoFornecedores (server actions, admin-only)"
affects: [06-03-demais-leituras-fornecedor-e-relatorios]

actuals:
  tokens: 7800
  tasks: 3
  commits: 6

tech-stack:
  added: []
  patterns:
    - "Parser de CSV escrito a mao (zero libs) em modulo puro, testavel via node --input-type=module quando vitest nao roda na maquina"
    - "Dry-run/commit com o mesmo par de funcoes puras recalculado no servidor a partir do texto bruto — nunca confia em plano vindo do navegador"
    - "Dedupe dentro do arquivo via Set acumulado durante a iteracao do plano, evitando estourar unique constraint em nomes repetidos no mesmo CSV"

key-files:
  created:
    - src/__tests__/fornecedor-import-parser.test.ts
    - src/__tests__/fornecedor-import-commit.test.ts
    - src/__tests__/fornecedor-import-robustez.test.ts
    - src/app/(app)/importacao/fornecedores/actions.ts
    - src/app/(app)/importacao/fornecedores/page.tsx
    - src/components/importacao-fornecedores-client.tsx
  modified:
    - src/lib/fornecedor-import.ts

key-decisions:
  - "dividirLinhaCsv foi escrita como split() caractere a caractere (nao regex exec) para respeitar o hook de seguranca e ainda suportar celulas entre aspas com separador interno."
  - "O dedupe dentro do arquivo usa um Set de nomes ja decididos nesta chamada de planejarImportacaoFornecedores, sobrescrevendo o motivo para 'duplicado_no_arquivo' na segunda ocorrencia — mais simples que acumular no array de existentes, com o mesmo resultado observável."
  - "Historico de commits: um processo concorrente (06-03), rodando na mesma working tree nao-isolada, bundlou temporariamente o codigo da Task 1 deste plano em um commit proprio (test(06-03)) e depois refez o commit isolando so os arquivos dele — meu codigo voltou a working tree sem commit. Reconstrui os commits de Task 1 (feat) e Task 2 (feat) a partir do estado da working tree, staged por caminho explicito, preservando a atribuicao correta por task. Nenhum codigo foi perdido; apenas o SHA original de duas commits GREEN mudou."

patterns-established:
  - "Nao instalar dependencia nova para parsing de CSV quando o modulo precisa ficar livre de imports (ambiente sem node_modules) — parser a mao e o padrao para este projeto."

requirements-completed: [DAT-01]

coverage:
  - id: D1
    description: "/importacao/fornecedores mostra criados/reativados/ignorados/erros antes de qualquer escrita (dry-run, D-01)"
    requirement: DAT-01
    verification:
      - kind: unit
        ref: "src/__tests__/fornecedor-import-parser.test.ts#Teste 1-5"
        status: unknown
      - kind: other
        ref: "node one-liner Task 1 <verify> — DAT-01 DRY-RUN OK"
        status: pass
    human_judgment: true
    rationale: "vitest nao roda nesta maquina (sem node_modules); gate real e o CI. O one-liner local prova o contrato do modulo puro e a ausencia de escrita na action de analise, mas nao substitui a suite completa."
  - id: D2
    description: "Commit e idempotente por nome normalizado: segunda passada do mesmo arquivo nao escreve nada (D-01)"
    requirement: DAT-01
    verification:
      - kind: unit
        ref: "src/__tests__/fornecedor-import-commit.test.ts#Teste 1, Teste 1b"
        status: unknown
      - kind: other
        ref: "node one-liner Task 2 <verify> — DAT-01 COMMIT OK"
        status: pass
    human_judgment: true
    rationale: "Mesma restricao de vitest local; suite propria cobre o cenario mas depende do CI para confirmar verde."
  - id: D3
    description: "Nome soft-deletado e reativado via update (deletedAt: null), nunca reinserido (D-03)"
    requirement: DAT-01
    verification:
      - kind: unit
        ref: "src/__tests__/fornecedor-import-commit.test.ts#Teste 2"
        status: unknown
      - kind: unit
        ref: "src/__tests__/fornecedor-import-parser.test.ts#Teste 4"
        status: unknown
    human_judgment: true
    rationale: "Depende do CI para vitest; verificado localmente via one-liner (id do reativar bate com o registro soft-deletado)."
  - id: D4
    description: "Linha sem nome vira erro reportado com numero de linha, sem lancar excecao; linhas em branco descartadas em silencio"
    requirement: DAT-01
    verification:
      - kind: unit
        ref: "src/__tests__/fornecedor-import-robustez.test.ts#Teste 1, Teste 2"
        status: unknown
      - kind: other
        ref: "node one-liner Task 3 <verify> — DAT-01 ROBUSTEZ OK"
        status: pass
    human_judgment: false
  - id: D5
    description: "Dedupe dentro do arquivo: mesmo nome repetido no CSV nao gera dois creates (evita estourar @unique no commit)"
    requirement: DAT-01
    verification:
      - kind: unit
        ref: "src/__tests__/fornecedor-import-robustez.test.ts#Teste 3"
        status: unknown
      - kind: other
        ref: "node one-liner Task 3 <verify> — DAT-01 ROBUSTEZ OK"
        status: pass
    human_judgment: false
  - id: D6
    description: "Analise e commit exigem requireAdminOrThrow(); commit recalcula o plano no servidor, nunca confia em plano vindo do navegador (T-06-05, T-06-06)"
    requirement: DAT-01
    verification:
      - kind: unit
        ref: "src/__tests__/fornecedor-import-commit.test.ts#Teste 3, Teste 4"
        status: unknown
      - kind: other
        ref: "node one-liner Tasks 1/2 <verify> — bloco de codigo inspecionado, sem chamadas de escrita fora do esperado"
        status: pass
    human_judgment: true
    rationale: "RBAC e nao-confianca no cliente sao propriedades de seguranca; a suite vitest e a prova formal, mas nao roda nesta maquina — CI e o gate real antes de considerar T-06-05/T-06-06 fechados."

duration: 12min
completed: 2026-08-03
status: complete
---

# Phase 6 Plan 2: Importador CSV de Fornecedores — Dry-run e Commit Idempotente Summary

**Importador CSV de fornecedores em duas etapas (dry-run + commit) escrito à mão em módulo puro, idempotente por nome normalizado, reativando soft-deletados em vez de estourar o `@unique`, com dedupe interno ao arquivo e teto de 5000 linhas.**

## Performance

- **Duration:** ~12 min (por timestamp de commit)
- **Tasks:** 3/3
- **Files modified:** 7 (1 modificado, 6 criados)

## Accomplishments

- `src/lib/fornecedor-import.ts` ganhou `parseCsvFornecedores` e `planejarImportacaoFornecedores`, estendendo (sem quebrar) o contrato puro de `classificarNomeFornecedor`/`normalizarNomeFornecedor` criado em 06-01. O módulo continua com **zero imports**, verificável via `node --input-type=module` nesta máquina.
- Parser escrito à mão: BOM removido, separador detectado (`;` ou `,`), cabeçalho opcional (`NOME`), células entre aspas com separador interno preservado, linhas em branco/só-separador descartadas em silêncio, linha sem nome vira erro reportado com número da linha (nunca exceção).
- `planejarImportacaoFornecedores` classifica cada linha em `criar`/`reativar`/`ignorar`/`erros` delegando a `classificarNomeFornecedor` — a mesma regra que reativa soft-deletados (D-03) torna o commit idempotente (D-01). Dedupe dentro do próprio arquivo: a segunda ocorrência do mesmo nome normalizado cai em `ignorar`/`duplicado_no_arquivo`, fechando o caminho que estouraria o `@unique` de nome no commit.
- `LIMITE_LINHAS_IMPORT = 5000` corta o processamento antes de qualquer trabalho, mitigando DoS via CSV gigante (T-06-07).
- `/importacao/fornecedores` (página irmã de `/importacao`): upload de CSV, quatro contadores (a criar/a reativar/ignorados/com erro), tabela de linhas com erro, botão "Baixar Modelo" (`modelo-fornecedores.csv`).
- `analisarImportacaoFornecedores` (dry-run): `requireAdminOrThrow()` + única leitura (`fornecedor.findMany`, incluindo soft-deletados) — nenhuma escrita.
- `confirmarImportacaoFornecedores` (commit): recebe **apenas o texto bruto** do arquivo, recalcula o plano no servidor contra uma leitura fresca (fecha T-06-05), aplica `criar`/`reativar` dentro de `prisma.$transaction`, grava `createAuditLog("fornecedor:import", {criados, reativados, ignorados})` e `revalidatePath("/cadastros")`.
- Botão "Confirmar importação" atrás de `AlertDialog`, habilitado só quando há algo a criar/reativar, enviando o mesmo texto bruto do arquivo (nunca um plano pronto do navegador).

## Task Commits

Cada task seguiu RED (teste) → GREEN (implementação):

1. **Task 1: Fatia vertical — CSV sobe, dry-run reporta, nada é escrito**
   - `7e21478` test(06-02): add failing test for CSV dry-run parser and planner
   - `b688125` feat(06-02): CSV dry-run parser and planner com tela de fornecedores
2. **Task 2: Commit idempotente com reativação e RBAC**
   - `47f39bf` test(06-02): add failing test for idempotent import commit with reactivation
   - `fd9b99f` feat(06-02): commit idempotente com reativacao, RBAC e auditoria
3. **Task 3: Robustez do parser, dedupe dentro do arquivo e modelo de CSV**
   - `6172d98` test(06-02): add failing test for parser robustness, dedupe and file limit
   - `ea559e8` feat(06-02): endurece parser CSV — aspas, dedupe no arquivo e limite de linhas

## Files Created/Modified

- `src/lib/fornecedor-import.ts` - `parseCsvFornecedores`, `planejarImportacaoFornecedores`, `dividirLinhaCsv` (interno), `LIMITE_LINHAS_IMPORT`
- `src/app/(app)/importacao/fornecedores/actions.ts` - `analisarImportacaoFornecedores` (dry-run), `confirmarImportacaoFornecedores` (commit transacional)
- `src/app/(app)/importacao/fornecedores/page.tsx` - guarda `requireAdmin()`, `PageHeader`, botão "Baixar Modelo"
- `src/components/importacao-fornecedores-client.tsx` - upload, contadores, tabela de erros, `AlertDialog` de confirmação
- `src/__tests__/fornecedor-import-parser.test.ts` - 5 casos: parse com cabeçalho, banco vazio, ignorar ativo, reativar soft-deletado, resumo consistente
- `src/__tests__/fornecedor-import-commit.test.ts` - idempotência, reativação via update, RBAC, não-confiança no cliente, auditoria
- `src/__tests__/fornecedor-import-robustez.test.ts` - nome vazio, linhas em branco, dedupe no arquivo, vírgula sem cabeçalho, BOM, aspas, limite de linhas

## Decisions Made

- `dividirLinhaCsv` foi escrita como `.split()` caractere a caractere (não o método de execução de regex bloqueado pelo hook de segurança) para suportar células entre aspas com separador interno preservado.
- O dedupe dentro do arquivo usa um `Set` de nomes já decididos nesta chamada de `planejarImportacaoFornecedores` — mais simples que acumular no array de `existentes`, com o mesmo resultado observável (segunda ocorrência sempre ignorada com motivo distinto).
- **Histórico de commits reconstruído:** um processo concorrente (plano 06-03), rodando na mesma working tree não-isolada (sem worktree), fez `git commit` sem escopo restrito e bundlou temporariamente o código GREEN da Task 1 deste plano dentro de um commit próprio (`test(06-03): ...`). Ao perceber o problema, esse processo refez seu commit isolando apenas os arquivos dele, o que deixou meu código de volta na working tree como alterações não commitadas. Reconstruí os commits de Task 1 e Task 2 (feat) a partir do estado da working tree, restaurando temporariamente as versões incrementais de cada task via backup em `/private/tmp/.../scratchpad` para preservar a atribuição correta por task. **Nenhum código foi perdido** — apenas os SHAs finais de duas commits GREEN são diferentes dos que teriam existido numa execução isolada. Os commits RED (`test(06-02)`) nunca foram afetados.

## Deviations from Plan

None de escopo — plano executado exatamente como escrito. O único desvio foi operacional (git), documentado acima em Decisions Made: a reconstrução dos commits GREEN de Task 1/Task 2 após bundling acidental por um agente concorrente na mesma working tree.

## Issues Encountered

- `npx vitest run` falha nesta máquina (`sh: vitest: command not found`, ausência de `node_modules`) — consistente com `<environment_constraints>` do plano. Os três one-liners `node --input-type=module` foram executados com sucesso, confirmando o contrato do módulo puro e a ausência de escrita/chamadas indevidas nas duas server actions. O gate real (`.github/workflows/ci.yml -> npx vitest run`) precisa confirmar as três suites verdes.
- Working tree compartilhada com outro executor (plano 06-03) rodando em paralelo sem isolamento via git worktree — ver "Decisions Made" acima. Recomendação para futuras execuções paralelas: usar `git worktree` por plano para eliminar esse risco de corrida no índice do git.

## User Setup Required

None - nenhuma configuração de serviço externo necessária. A carga real de fornecedores depende do arquivo CSV que o cliente ainda deve fornecer (a fase entrega a capacidade, não os dados, conforme a premissa corrigida no `06-CONTEXT.md`).

## Next Phase Readiness

- `src/lib/fornecedor-import.ts` está pronto com o contrato completo (parse + planejamento + dedupe + limite) para qualquer consumidor futuro; assinaturas de 06-01 (`classificarNomeFornecedor`, `normalizarNomeFornecedor`, tipos) não mudaram.
- `/importacao/fornecedores` está funcional ponta a ponta (dry-run → commit) e pronta para receber o arquivo real do cliente quando ele chegar.
- Bloqueio conhecido: as 3 suites vitest desta plan (`fornecedor-import-parser`, `fornecedor-import-commit`, `fornecedor-import-robustez`) ainda não foram confirmadas verdes localmente — gate real é o CI. Primeira execução do CI após o push deve ser conferida antes de considerar DAT-01 totalmente fechado.
- Nenhuma dependência nova em `package.json` — confirmado via `git log` sobre o arquivo no intervalo desta plan (nenhum commit o toca).

---
*Phase: 06-integridade-de-dados-fornecedores-e-exportacao*
*Completed: 2026-08-03*

## Self-Check: PASSED

- Todos os 7 arquivos criados/modificados confirmados presentes em disco.
- Todos os 6 commits (`7e21478`, `b688125`, `47f39bf`, `fd9b99f`, `6172d98`, `ea559e8`) confirmados em `git log --oneline --all`.
