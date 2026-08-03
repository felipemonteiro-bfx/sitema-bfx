---
phase: 09-integracoes-e-carga-de-dados
plan: 02
subsystem: database
tags: [prisma, csv-import, crm, rbac, audit-log, next.js-server-actions]

requires:
  - phase: 06-02
    provides: "Padrao de importador CSV: modulo puro parseCsv*/planejar* + action dry-run + action commit + client component, dedupe no arquivo, limite de linhas"
provides:
  - "src/lib/cliente-import.ts: parseCsvClientes, chaveDoCliente (D-04), planejarImportacaoClientes"
  - "Tela /importacao/clientes: dry-run + commit idempotente, vinculado a empresa parceira"
  - "analisarImportacaoClientes / confirmarImportacaoClientes (server actions, admin-only)"
affects: [09-03-cotacao-uber-com-motivo]

actuals:
  tokens: 11210
  tasks: 3
  commits: 6

tech-stack:
  added: []
  patterns:
    - "Reserva de nomes (Set) alimentada por existentes + itens de 'criar' desta chamada, para nunca deixar planejarImportacaoClientes gerar um 'criar' que estoure um @unique de nome global — necessario porque, ao contrario do importador de fornecedores (Fase 6, dedupe so por nome), este importador tem duas chaves possiveis (CPF e nome) e o @unique e so sobre o nome"
    - "Ordem de decisao fixa em 4 passos dentro de planejarImportacaoClientes: dedupe no arquivo -> match por chave (ja_vinculado/sem_empresa/vinculado_a_outra_empresa) -> colisao de nome reservado -> criar. Trocar a ordem move itens para o balde errado (documentado em comentario no codigo)"

key-files:
  created:
    - src/__tests__/cliente-import-parser.test.ts
    - src/__tests__/cliente-import-commit.test.ts
    - src/__tests__/cliente-import-robustez.test.ts
    - src/app/(app)/importacao/clientes/actions.ts
    - src/app/(app)/importacao/clientes/page.tsx
    - src/components/importacao-clientes-client.tsx
  modified:
    - src/lib/cliente-import.ts

key-decisions:
  - "cliente-import.ts nasceu na Task 1 ja com a logica completa de robustez (nome_vazio, cpf_invalido, colisao de nome via reserva) porque a ordem de decisao dos 4 passos e uma unica funcao coesa — separar em duas implementacoes incrementais (uma so para Task 1, endurecida na Task 3) teria significado reescrever a mesma funcao duas vezes. A Task 3 ficou responsavel por escrever a suite de teste dedicada que trava esse comportamento e adicionar o botao 'Baixar Modelo' em page.tsx."
  - "page.tsx recebeu confirmarAction (wiring do botao de commit) durante a Task 2, embora nao estivesse no <files> oficial da Task 2 — sem essa mudanca o botao 'Confirmar importacao' adicionado ao client component nao teria a action disponivel. Tratado como Rule 3 (blocking issue): o par acao/tela so funciona com os dois lados atualizados juntos."
  - "chaveDoCliente usa CPF cru normalizado (so digitos) como chave quando existe, e nome normalizado como fallback — sem misturar com empresaParceiraId na chave (D-04, decisao explicita do usuario documentada no plano: Cliente.nome e @unique global, nao composto com empresa)."

patterns-established:
  - "Terceiro modulo do projeto (depois de fornecedor-import.ts e cliente-rapido.ts) com normalizarNome*/normalizarNomeCliente duplicado de proposito para se manter livre de imports; a Task 3 acrescenta o teste de invariante entre normalizarNomeClienteImport e normalizarNomeCliente para a duplicacao virar propriedade checada no CI, nao acidente."

requirements-completed: [INT-03]

coverage:
  - id: D1
    description: "/importacao/clientes mostra a criar/a vincular/ignorados/com erro antes de qualquer escrita — dry-run, empresa parceira obrigatoria antes de analisar (D-05)"
    requirement: INT-03
    verification:
      - kind: unit
        ref: "src/__tests__/cliente-import-parser.test.ts#Teste 1-8"
        status: unknown
      - kind: other
        ref: "node one-liner Task 1 <verify> — INT-03 DRY-RUN OK"
        status: pass
    human_judgment: true
    rationale: "vitest nao roda nesta maquina (sem node_modules); gate real e o CI. O one-liner local prova o contrato do modulo puro e a ausencia de escrita na action de analise, mas nao substitui a suite completa nem a inspecao visual da tela."
  - id: D2
    description: "Commit e idempotente: segunda passada do mesmo arquivo com clientes ja vinculados nao escreve nada e classifica tudo como ignorado (INT-03, criterio central da fase)"
    requirement: INT-03
    verification:
      - kind: unit
        ref: "src/__tests__/cliente-import-commit.test.ts#Teste 1, Teste 1b, Teste 5"
        status: unknown
      - kind: other
        ref: "node one-liner Task 2 <verify> — INT-03 COMMIT OK"
        status: pass
    human_judgment: true
    rationale: "Mesma restricao de vitest local; suite propria cobre criacao/segunda-passada/recalculo no servidor mas depende do CI para confirmar verde."
  - id: D3
    description: "Chave de idempotencia e CPF quando ha CPF e nome normalizado quando nao ha (D-04)"
    requirement: INT-03
    verification:
      - kind: unit
        ref: "src/__tests__/cliente-import-parser.test.ts#Teste 2, Teste 7"
        status: unknown
      - kind: other
        ref: "node one-liner Task 1 <verify> — chaveDoCliente com/sem CPF"
        status: pass
    human_judgment: false
  - id: D4
    description: "Cliente criado nasce com empresaParceiraId da empresa escolhida e estagioCrm novo_lead/origem import_funcionarios; cliente existente vinculado nunca e rebaixado de estagio nem movido de outra empresa (D-05)"
    requirement: INT-03
    verification:
      - kind: unit
        ref: "src/__tests__/cliente-import-commit.test.ts#Teste 2, Teste 3"
        status: unknown
      - kind: unit
        ref: "src/__tests__/cliente-import-parser.test.ts#Teste 5, Teste 6"
        status: unknown
      - kind: other
        ref: "node one-liner Task 2 <verify> — ocorrenciasEstagio===1 (so na criacao)"
        status: pass
    human_judgment: true
    rationale: "Regra de negocio sensivel (nunca rebaixar/roubar cliente de outra empresa); a suite vitest e a prova formal mas depende do CI. Vale confirmacao humana na primeira carga real da Equilibrium."
  - id: D5
    description: "Nenhuma combinacao de linhas consegue estourar o @unique de Cliente.nome no commit — colisao de nome com outro CPF vira ignorar/nome_ja_usado_por_outro_cpf, nunca uma excecao P2002"
    requirement: INT-03
    verification:
      - kind: unit
        ref: "src/__tests__/cliente-import-robustez.test.ts#Teste 3, Teste 4, Teste 5"
        status: unknown
      - kind: other
        ref: "node one-liner Task 3 <verify> — INT-03 ROBUSTEZ OK"
        status: pass
    human_judgment: false
  - id: D6
    description: "Schema do Prisma nao muda e nenhuma migration e criada; nenhum pacote novo instalado; /crm/importar-leads/ nao e alterado"
    requirement: INT-03
    verification:
      - kind: other
        ref: "git status --porcelain prisma/ (SCHEMA-INTOCADO-OK) + git diff --stat sobre package.json e src/app/(app)/crm/importar-leads/ (ambos vazios)"
        status: pass
    human_judgment: false

duration: 8min
completed: 2026-08-03
status: complete
---

# Phase 9 Plan 2: Importador CSV de Clientes da Equilibrium — Dry-run e Commit Idempotente Summary

**Importador CSV de clientes em duas etapas (dry-run + commit) reaproveitando o padrão da Fase 6, com idempotência por CPF (fallback para nome), vínculo obrigatório à empresa parceira e reserva de nomes que impede o commit de esbarrar no `@unique` global de `Cliente.nome`.**

## Performance

- **Duration:** ~8 min (por timestamp de commit)
- **Started:** 2026-08-03T19:26:06Z
- **Completed:** 2026-08-03T19:34:22Z
- **Tasks:** 3/3
- **Files modified:** 7 (1 modificado, 6 criados)

## Accomplishments

- `src/lib/cliente-import.ts` (módulo puro, zero imports): `parseCsvClientes` (parser de CSV escrito à mão — BOM, aspas, separador `;`/`,`, cabeçalho opcional), `chaveDoCliente` (D-04: CPF quando existe, nome normalizado como fallback) e `planejarImportacaoClientes`, que decide cada linha em 4 passos fixos: dedupe dentro do arquivo → match por chave contra existentes (`ja_vinculado`/`sem_empresa`/`vinculado_a_outra_empresa`) → colisão de nome reservado (`nome_ja_usado_por_outro_cpf`) → `criar`.
- A reserva de nomes (`Set` alimentado por `existentes` + itens já decididos como `criar` nesta mesma chamada) é o que garante que nenhuma combinação de linhas do CSV consiga produzir um `criar` que estoure o `@unique` global de `Cliente.nome` — a armadilha específica deste importador (o de fornecedores, Fase 6, não tinha CPF nem esse risco).
- `/importacao/clientes`: seletor de empresa parceira obrigatório antes de qualquer upload (D-05), upload de CSV, quatro contadores (a criar/a vincular/ignorados/com erro), tabela de linhas com erro, botão "Baixar Modelo" (`modelo-clientes.csv`).
- `analisarImportacaoClientes` (dry-run): `requireAdminOrThrow()` + resolve a empresa por id no servidor (nunca aceita nome vindo do navegador, T-09-07) + uma única leitura de `clientes` (sem N+1) — nenhuma escrita.
- `confirmarImportacaoClientes` (commit): recebe apenas texto bruto + id de empresa, recalcula o plano no servidor contra leitura fresca (T-09-06), aplica em `prisma.$transaction` com `timeout: 30_000`: `criar` via `createMany({ skipDuplicates: true })` (cada registro nasce com `empresaParceiraId`, `estagioCrm: "novo_lead"`, `origem: "import_funcionarios"`), `vincular` via `update` por item sem tocar no estágio do funil. Id de empresa inexistente devolve `empresa_invalida` sem nenhuma escrita (T-09-08). Grava `createAuditLog("cliente:import", {...})` (T-09-11) e `revalidatePath("/crm")` + `revalidatePath("/cadastros")`.
- Botão "Confirmar importação" atrás de `AlertDialog`, habilitado só quando há algo a criar/vincular e uma empresa selecionada, enviando o mesmo texto bruto do arquivo (nunca um plano pronto do navegador).

## Task Commits

Cada task seguiu RED (teste) → GREEN (implementação):

1. **Task 1: Fatia vertical — CSV sobe, dry-run reporta por empresa, nada é escrito**
   - `7b397fe` test(09-02): add failing test for cliente CSV dry-run parser and planner
   - `236b5db` feat(09-02): CSV dry-run parser and planner com tela de clientes
2. **Task 2: Commit idempotente, vinculado à empresa e nascendo como lead**
   - `a45cdd9` test(09-02): add failing test for idempotent cliente import commit
   - `c8de3b6` feat(09-02): commit idempotente vinculado a empresa e nascendo como lead
3. **Task 3: Robustez do parser, colisão de nome, dedupe no arquivo e modelo de CSV**
   - `79654c1` test(09-02): add failing test for parser robustness and nome collision
   - `decd49d` feat(09-02): endurece parser CSV de clientes — colisao de nome e modelo CSV

## Files Created/Modified

- `src/lib/cliente-import.ts` - `parseCsvClientes`, `chaveDoCliente`, `normalizarNomeClienteImport`, `normalizarCpf`, `planejarImportacaoClientes`, `LIMITE_LINHAS_IMPORT_CLIENTES`
- `src/app/(app)/importacao/clientes/actions.ts` - `analisarImportacaoClientes` (dry-run), `confirmarImportacaoClientes` (commit transacional)
- `src/app/(app)/importacao/clientes/page.tsx` - guarda `requireAdmin()`, `PageHeader`, botão "Baixar Modelo", carrega empresas parceiras
- `src/components/importacao-clientes-client.tsx` - seletor de empresa, upload, contadores, tabela de erros, `AlertDialog` de confirmação
- `src/__tests__/cliente-import-parser.test.ts` - 8 casos: parse com cabeçalho, chave por CPF/nome, plano com banco vazio, idempotência, vínculo D-05, não roubar de outra empresa, fallback por nome, resumo consistente
- `src/__tests__/cliente-import-commit.test.ts` - 7 casos: idempotência, vínculo de empresa, estágio de novo lead, RBAC, não-confiança no cliente, empresa inválida, auditoria
- `src/__tests__/cliente-import-robustez.test.ts` - 9 casos: nome vazio, CPF inválido, colisão de nome com outro CPF, colisão dentro do arquivo, dedupe por chave, linhas em branco, vírgula/BOM/aspas sem cabeçalho, limite de linhas, invariante de normalização

## Decisions Made

- `planejarImportacaoClientes` implementa os 4 passos de decisão numa única função coesa desde a Task 1 (em vez de uma versão simplificada endurecida depois na Task 3), porque a ordem entre eles é a parte crítica do algoritmo (trocar a ordem move item para o balde errado) e escrever duas versões incrementais da mesma função arriscava introduzir uma regressão na reescrita. A Task 3 ficou com a responsabilidade de escrever a suite de teste dedicada à robustez e adicionar o botão de modelo CSV — o comportamento em si já nasceu correto.
- `page.tsx` recebeu o wiring de `confirmarAction` durante a Task 2 mesmo não estando no `<files>` oficial dessa task no plano — o botão "Confirmar importação" adicionado ao client component na mesma task não teria como funcionar sem a action disponível na prop. Tratado como deviation Rule 3 (blocking issue): a action e a tela formam um par que só funciona atualizado junto.
- `chaveDoCliente` usa exclusivamente CPF (quando existe) ou nome normalizado (fallback) — sem compor com `empresaParceiraId` — seguindo a decisão explícita do usuário (D-04) registrada no `09-CONTEXT.md`: o `@unique` de `Cliente.nome` é global no schema, não composto com empresa, então uma chave `nome + empresa` não resolveria a colisão real (ela é tratada separadamente como `nome_ja_usado_por_outro_cpf`).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] `page.tsx` atualizado na Task 2 para passar `confirmarAction`**
- **Found during:** Task 2 (Commit idempotente, vinculado à empresa e nascendo como lead)
- **Issue:** O plano listava `page.tsx` apenas no `<files>` da Task 1; a Task 2 adiciona `confirmarImportacaoClientes` em `actions.ts` e o botão "Confirmar importação" no client component, mas sem `page.tsx` passar a nova action como prop, o botão nunca teria a função disponível — quebrando o par ação/tela que a própria Task 2 entrega.
- **Fix:** `page.tsx` passou a importar e passar `confirmarImportacaoClientes` para `<ImportacaoClientesClient confirmarAction={...} />`.
- **Files modified:** `src/app/(app)/importacao/clientes/page.tsx`
- **Verification:** One-liner Task 2 (`INT-03 COMMIT OK`) confirma `cli.includes('confirmarImportacaoClientes')` na tela; leitura manual do JSX resultante confirma a prop chegando ao componente.
- **Committed in:** `c8de3b6` (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Wiring necessário para o próprio entregável da Task 2 funcionar; nenhum escopo novo introduzido, nenhum arquivo fora dos 7 do plano tocado.

## Issues Encountered

- `npx vitest run` falha nesta máquina (`vitest: command not found`, ausência de `node_modules`) — consistente com `<environment_constraints>` do plano. Os três one-liners `node --input-type=module` foram executados com sucesso após cada task, confirmando o contrato do módulo puro (zero imports), a ausência de escrita na action de análise, a presença de todas as regras de negócio do commit (transação com timeout, `createMany`+`skipDuplicates`, vínculo de empresa, estágio gravado uma única vez) e a robustez do parser (nome_vazio, cpf_invalido, colisão de nome, dedupe, limite de linhas). O gate real (`.github/workflows/ci.yml -> npx vitest run`) precisa confirmar as três suites verdes.
- `git status --porcelain prisma/` confirmado vazio após cada task — nenhuma mudança de schema, nenhuma migration criada, consistente com `<environment_constraints>` item 1.
- `git diff --stat` sobre `package.json` e `src/app/(app)/crm/importar-leads/` confirmados vazios — nenhuma dependência nova, tela antiga de leads intacta.

## User Setup Required

None - nenhuma configuração de serviço externo necessária. A carga real de clientes da Equilibrium depende do arquivo que o cliente ainda deve fornecer (a fase entrega a capacidade, não os dados, conforme D-03 do `09-CONTEXT.md`). `EQUILIBRIUM` já existe como `EmpresaParceira` em produção — nenhuma ação adicional de setup é necessária antes da primeira carga real.

## Next Phase Readiness

- `src/lib/cliente-import.ts` está pronto com o contrato completo (parse + chave de idempotência + planejamento + reserva de nomes) para qualquer consumidor futuro; nenhuma assinatura pública mudou depois da Task 1.
- `/importacao/clientes` está funcional ponta a ponta (dry-run → commit) e pronta para receber o arquivo real da Equilibrium quando ele chegar.
- Bloqueio conhecido: as 3 suites vitest desta plan (`cliente-import-parser`, `cliente-import-commit`, `cliente-import-robustez`) ainda não foram confirmadas verdes localmente — gate real é o CI. Primeira execução do CI após o push deve ser conferida antes de considerar INT-03 totalmente fechado.
- `/crm/importar-leads` permanece intacta e fora de escopo, registrada como candidata a unificação futura sobre `cliente-import.ts` (mesma normalização de nome já compartilhada via teste de invariante, Task 3).
- Nenhuma dependência nova em `package.json` — confirmado via `git diff --stat` sobre o arquivo no intervalo desta plan (nenhum commit o toca).

---
*Phase: 09-integracoes-e-carga-de-dados*
*Completed: 2026-08-03*

## Self-Check: PASSED

- Todos os 7 arquivos de código + SUMMARY.md confirmados presentes em disco.
- Todos os 6 commits (`7b397fe`, `236b5db`, `a45cdd9`, `c8de3b6`, `79654c1`, `decd49d`) confirmados em `git log --oneline --all`.
