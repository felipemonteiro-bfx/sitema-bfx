---
phase: 06-integridade-de-dados-fornecedores-e-exportacao
plan: 03
subsystem: database
tags: [prisma, soft-delete, next.js-server-components, ai-tools, pure-module]

requires:
  - phase: 06-integridade-de-dados-fornecedores-e-exportacao/06-01
    provides: "Fornecedor.deletedAt no schema + classificarNomeFornecedor (reativacao por nome, D-03)"
provides:
  - "As quatro leituras de fornecedor fora de /cadastros (PDV, listagem da IA, busca fuzzy da IA, criacao/reativacao da IA) filtram deletedAt: null ou selecionam deletedAt: true propositalmente (leitura de classificacao)"
  - "src/lib/empresa-options.ts — modulo puro montarEmpresaOptions(empresas, fornecedores), contrato reutilizavel por qualquer tela que precise da mesma regra de exclusao"
  - "relatorios/page.tsx sem nenhuma lista de nomes de empresa fixa no codigo — Exportacao Rapida monta um botao por empresa parceira do banco, com estado vazio explicado"
affects: [07-pdv-sem-friccao]

actuals:
  tokens: 4820
  tasks: 2
  commits: 4

tech-stack:
  added: []
  patterns:
    - "Segundo modulo de dominio puro do projeto (zero imports), seguindo o padrao de fornecedor-import.ts (06-01): permite verificacao local via node --input-type=module quando vitest nao roda na maquina"
    - "Reaproveitamento de classificarNomeFornecedor (06-01) num segundo call site (ai-actions.ts criar_fornecedor) sem modificar o modulo original — consumo cross-plan dentro da mesma onda"

key-files:
  created:
    - src/lib/empresa-options.ts
    - src/__tests__/fornecedor-leituras-soft-delete.test.ts
    - src/__tests__/empresa-options.test.ts
  modified:
    - src/app/(app)/venda-rapida/page.tsx
    - src/lib/ai-actions.ts
    - src/lib/db-search.ts
    - src/app/(app)/relatorios/page.tsx

key-decisions:
  - "criar_fornecedor da IA replica exatamente a ramificacao criar/reativar/ignorar/erro que addFornecedor (06-01) usa em cadastros/page.tsx, incluindo o comentario explicando por que a leitura de candidatos NAO leva deletedAt: null."
  - "No ramo 'ignorar' (nome ja ativo), criar_fornecedor devolve o registro existente via findUnique em vez de nao escrever nada silenciosamente como addFornecedor faz — a ferramenta de IA precisa de um result com .nome para o chat formatar a resposta (buildToolSummary em ai.ts), diferente de uma server action de formulario que so revalida a pagina."
  - "empresa-options.ts nao foi colocado dentro de fornecedor-import.ts (mesmo sendo os dois modulos puros de dominio) para respeitar o interface_contract: fornecedor-import.ts e propriedade exclusiva do plano 06-02 nesta onda, e este plano nao pode toca-lo."

patterns-established:
  - "Modulo puro de opcoes derivadas (empresa-options.ts): recebe duas listas de {nome}, aplica normalizacao .trim().toLowerCase() para comparacao, preserva a ordem/caixa original na saida. Reutilizavel para qualquer futura tela que precise excluir nomes coincidentes entre duas entidades."

requirements-completed: [DAT-02, DAT-03]

coverage:
  - id: D1
    description: "PDV (venda-rapida), listagem da IA (listar_fornecedores) e busca fuzzy da IA (fuzzyFindFornecedores) filtram deletedAt: null — fornecedor excluido nao aparece em nenhuma das tres superficies (D-02, DAT-02)"
    requirement: DAT-02
    verification:
      - kind: unit
        ref: "src/__tests__/fornecedor-leituras-soft-delete.test.ts#Teste 1, Teste 2, Teste 3"
        status: unknown
      - kind: other
        ref: "node one-liner Task 1 <verify> — DAT-02 LEITURAS OK"
        status: pass
    human_judgment: false
  - id: D2
    description: "criar_fornecedor da IA reativa um nome soft-deletado (update limpando deletedAt) em vez de tentar create e estourar o @unique de nome (D-03)"
    requirement: DAT-02
    verification:
      - kind: unit
        ref: "src/__tests__/fornecedor-leituras-soft-delete.test.ts#Teste 4, Teste 5"
        status: unknown
      - kind: other
        ref: "node one-liner Task 1 <verify> — DAT-02 LEITURAS OK"
        status: pass
    human_judgment: false
  - id: D3
    description: "relatorios/page.tsx nao contem mais nenhuma lista de nomes de empresa escrita no codigo; Exportacao Rapida monta um botao por empresa parceira do banco via montarEmpresaOptions, preservando o filtro que exclui nomes coincidentes com fornecedores (D-06, DAT-03)"
    requirement: DAT-03
    verification:
      - kind: unit
        ref: "src/__tests__/empresa-options.test.ts#Teste 1, Teste 2, Teste 3, Teste 4, Teste 5"
        status: unknown
      - kind: other
        ref: "node one-liner Task 2 <verify> — DAT-03 SEM HARDCODE OK"
        status: pass
    human_judgment: false
  - id: D4
    description: "Quando nao ha empresa parceira elegivel, a secao de Exportacao Rapida explica o vazio (link para Cadastros -> Empresas) em vez de sumir silenciosamente"
    requirement: DAT-03
    verification:
      - kind: other
        ref: "node one-liner Task 2 <verify> — DAT-03 SEM HARDCODE OK (confere presenca de empresaOptions no bloco; a renderizacao do estado vazio em si e revisao de codigo, nao testada por unit test)"
        status: pass
    human_judgment: true
    rationale: "O estado vazio e uma decisao de UX/copy (texto exibido, link de destino) que nenhum teste automatizado desta task cobre linha a linha — o checkpoint humano da Task 3 confirma visualmente em producao, quando as 6 empresas reais do banco (nenhuma delas ausente) tornam esse ramo pouco provavel de aparecer no dia a dia, mas o codigo precisa ser revisado como correto de qualquer forma."
  - id: D5
    description: "Verificacao humana pos-rollout dos 4 criterios da fase (Task 3): Exportacao Rapida com botoes reais, exclusao reversivel, RBAC do bulk delete, importador CSV idempotente, e regressao do PDV"
    verification: []
    human_judgment: true
    rationale: "Checkpoint gate=blocking do proprio plano — depende de um rollout de imagem (ArgoCD) que o executor nao dispara. Nao pode ser auto-aprovado sob nenhuma circunstancia (instrucao explicita do prompt de execucao)."

duration: 12min
completed: 2026-08-03
status: complete
---

# Phase 6 Plan 3: Leituras de Fornecedor Fora de /cadastros e Exportação Rápida Sem Hardcode Summary

**As quatro leituras de fornecedor esquecidas (PDV, listagem/busca/criação via IA) passam a respeitar o soft-delete de 06-01, e a Exportação Rápida de `/relatorios` monta seus botões a partir das empresas parceiras do banco via um novo módulo puro `empresa-options.ts`, em vez de uma lista de nomes fixa no código.**

## Performance

- **Duration:** ~12 min (por timestamp de commit)
- **Started:** 2026-08-03T14:11Z
- **Completed:** 2026-08-03T14:13Z (parte automatizada; Task 3 fica aberta como checkpoint)
- **Tasks:** 2/3 (Task 3 é checkpoint humano pós-rollout, não executável pelo agente)
- **Files modified:** 7 (4 modificados, 3 criados)

## Accomplishments

- `venda-rapida/page.tsx`: o `findMany` de fornecedores do PDV ganhou `where: { deletedAt: null }` — um fornecedor excluído não chega mais ao `VendaRapidaFormV2`.
- `ai-actions.ts` `listar_fornecedores`: o ramo sem `search` ganhou o mesmo filtro.
- `db-search.ts` `fuzzyFindFornecedores`: o `findMany` que hidrata os ids do SQL cru de similaridade ganhou `deletedAt: null`. O SQL cru continua aplicando `LIMIT` antes do filtro — comentário acima da função documenta esse tradeoff aceito (tabela pequena, mudar o SQL cru duplicaria a regra de soft-delete em string).
- `ai-actions.ts` `criar_fornecedor` (D-03): passou a carregar candidatos com `select: { id, nome, deletedAt }` (sem `deletedAt: null`, propositalmente — precisa ver os excluídos) e ramificar via `classificarNomeFornecedor` (06-01): `criar` faz `create` normal; `reativar` faz `update` limpando `deletedAt`; `ignorar` devolve o registro existente sem escrever; `erro` devolve `{ error: "..." }`. Antes, um nome soft-deletado quebraria no `@unique` com um erro incompreensível no chat.
- `src/lib/empresa-options.ts` (novo, módulo puro): `montarEmpresaOptions(empresas, fornecedores)` — nomes na ordem recebida, exclui coincidência com fornecedor (ignorando caixa/espaços — regra de D-06), remove duplicatas por caixa mantendo a primeira ocorrência, descarta nomes vazios, nunca injeta nome que não veio de `empresas`.
- `relatorios/page.tsx`: a leitura de fornecedores ganhou `deletedAt: null`; o bloco de montagem de `empresaOptions` (duas listas: `extraEmpresas` mais o filtro inline) foi substituído por uma única chamada a `montarEmpresaOptions`; o array literal `["AMAZON FIVE", "Gimam"]` do bloco "Exportação Rápida (PDF)" foi substituído por `empresaOptions`, com um estado vazio explícito ("Nenhuma empresa parceira elegível encontrada... Cadastre em Cadastros → Empresas") quando a lista vier vazia.

## Efeito visível em produção (D-06 — não é regressão)

**Confirmado com os dados reais do banco, fornecidos no prompt de execução (6 linhas em `empresas_parceiras`):**
`AMAZON FIVE`, `CLIENTE PF BFX SHOP`, `EQUILIBRIUM`, `MIRAX SEGURANÇA`, `SEM EMPRESA`, `SOFT LIVE`.

Depois do rollout, a seção "Exportação Rápida (PDF)" de `/relatorios` vai mostrar:
- **O botão `Gimam` desaparece** — não existe como `EmpresaParceira` cadastrada, era só uma string fixa no código.
- **Cinco novos botões aparecem**: `CLIENTE PF BFX SHOP`, `EQUILIBRIUM`, `MIRAX SEGURANÇA`, `SEM EMPRESA`, `SOFT LIVE` (mais `AMAZON FIVE`, que já existia e continua).

**Isso é o comportamento pedido** ("aparecer botão de todas as empresas e não apenas 2"), não um bug. Se alguém notar o sumiço do `Gimam` sem contexto, pode parecer regressão — por isso este aviso está registrado aqui e replicado no checkpoint da Task 3.

## Task Commits

Cada task seguiu RED (teste) → GREEN (implementação):

1. **Task 1: As quatro leituras de fornecedor fora de /cadastros respeitam o soft-delete**
   - `053d223` test(06-03): failing test for fornecedor leituras soft-delete (DAT-02)
   - `1c6c1d5` feat(06-03): quatro leituras de fornecedor fora de /cadastros respeitam soft-delete (D-02, D-03, DAT-02)
2. **Task 2: Exportação Rápida sai do hardcode — módulo puro de opções de empresa (DAT-03)**
   - `70ac92a` test(06-03): failing test for empresa-options pure module (DAT-03, D-06)
   - `c805dfb` feat(06-03): Exportacao Rapida sai do hardcode via modulo empresa-options (D-06, DAT-03)
3. **Task 3: Verificação humana dos 4 critérios da fase após o rollout** — checkpoint, não executado pelo agente. Ver `## Ações humanas pendentes` abaixo.

## Files Created/Modified

- `src/app/(app)/venda-rapida/page.tsx` - `findMany` de fornecedores do PDV com `deletedAt: null`
- `src/lib/ai-actions.ts` - `listar_fornecedores` com `deletedAt: null`; `criar_fornecedor` ramificado via `classificarNomeFornecedor` (criar/reativar/ignorar/erro)
- `src/lib/db-search.ts` - `fuzzyFindFornecedores` com `deletedAt: null` no `findMany` que hidrata os ids, comentário documentando o tradeoff do `LIMIT` no SQL cru
- `src/app/(app)/relatorios/page.tsx` - leitura de fornecedores com `deletedAt: null`; `empresaOptions` via `montarEmpresaOptions`; bloco "Exportação Rápida (PDF)" itera `empresaOptions` com estado vazio explícito
- `src/lib/empresa-options.ts` (novo) - módulo puro `montarEmpresaOptions`
- `src/__tests__/fornecedor-leituras-soft-delete.test.ts` (novo) - 5 casos: PDV, listagem IA, busca fuzzy IA, reativação IA (D-03), criação de nome inédito
- `src/__tests__/empresa-options.test.ts` (novo) - 5 casos: ordem preservada, filtro de fornecedores (D-06), lista vazia (DAT-03), dedupe por caixa, descarte de nomes vazios

## Decisions Made

- `criar_fornecedor` da IA replica a mesma ramificação criar/reativar/ignorar/erro que `addFornecedor` (06-01) usa em `cadastros/page.tsx` — mesma leitura de candidatos sem `deletedAt: null` (precisa ver os excluídos para classificar), mesmo uso de `classificarNomeFornecedor`.
- No ramo "ignorar" (nome já existe ativo), `criar_fornecedor` devolve o registro existente via `findUnique` — diferente de `addFornecedor`, que apenas revalida a página sem escrever. A ferramenta de IA precisa de um `result` com `.nome` para `buildToolSummary` (`src/lib/ai.ts`) formatar a resposta no chat; uma server action de formulário não tem esse requisito.
- `empresa-options.ts` foi criado como módulo próprio, e não anexado a `fornecedor-import.ts`, para respeitar o `interface_contract` do plano: `fornecedor-import.ts` é propriedade exclusiva do plano 06-02 nesta onda (wave 2) e este plano não pode tocá-lo.

## Deviations from Plan

**None** - plano executado exatamente como escrito.

**Nota operacional (não é deviation de código):** durante a execução, arquivos do plano paralelo 06-02 (mesma wave 2, mesmo diretório de trabalho sem isolamento de worktree) estavam staged no índice do git no momento do primeiro commit deste plano. O primeiro `git commit` acabou incluindo `src/lib/fornecedor-import.ts` e os arquivos de `importacao/fornecedores` que pertencem exclusivamente ao 06-02. Isso foi detectado imediatamente (antes de qualquer push) e corrigido com `git reset --soft` + `git restore --staged` nos arquivos alheios, seguido de um commit limpo contendo apenas os arquivos deste plano. Confirmado com `git show --name-only` em cada um dos 4 commits deste plano: nenhum inclui `fornecedor-import.ts` ou os arquivos de `importacao/fornecedores`.

## Issues Encountered

- Concorrência de git index com o plano 06-02 executando na mesma wave (ver nota acima) — resolvida sem `git push` e sem tocar em nenhum arquivo do outro plano além de tirá-lo do staging.

## Ações humanas pendentes

**Bloqueio: checkpoint `gate="blocking"` — NÃO aprovar automaticamente. Requer rollout de imagem no namespace `bfx` (ArgoCD) antes de qualquer verificação abaixo fazer sentido**, porque a coluna `deleted_at` só existe em produção depois que o container novo sobe (`prisma migrate deploy` no `Dockerfile:51`, antes de `node server.js`).

Depois do merge do PR e do rollout, verificar manualmente (Andre):

1. **DAT-03 — Exportação Rápida.** Abrir `/relatorios` como admin.
   - **Comportamento esperado (não é regressão):** o botão `Gimam` some (não existe como empresa parceira cadastrada); aparecem botões para `CLIENTE PF BFX SHOP`, `EQUILIBRIUM`, `MIRAX SEGURANÇA`, `SEM EMPRESA` e `SOFT LIVE`, além de `AMAZON FIVE` que já existia.
   - Se `Gimam` for uma empresa real que falta cadastrar: ir em `/cadastros` → aba Empresas → cadastrar `Gimam` → recarregar `/relatorios` → o botão deve aparecer.
   - Confirmar que nenhum nome que coincida com um fornecedor aparece na lista de botões.
   - **Critério de sucesso:** a contagem de botões bate com o número de empresas parceiras cadastradas menos as que coincidem com nome de fornecedor.

2. **DAT-02 — exclusão reversível.** Em `/cadastros` → aba Fornecedores: criar `FORNECEDOR TESTE 06`, excluí-lo, e cadastrá-lo de novo com o mesmo nome.
   - **Critério de sucesso:** reativa sem erro (nenhum erro de nome duplicado); aparece uma única vez na aba.

3. **DAT-02 — RBAC.** Logar com usuário de perfil vendedor e tentar excluir um fornecedor.
   - **Critério de sucesso:** a ação é recusada.

4. **DAT-01 — importador.** Em `/importacao/fornecedores`: baixar `modelo-fornecedores.csv`, preencher 2-3 nomes, subir (dry-run deve mostrar contadores sem gravar nada), confirmar, subir o **mesmo arquivo de novo**.
   - **Critério de sucesso:** na segunda subida, tudo cai em "ignorados" e o total de fornecedores não muda.

5. **Regressão do PDV.** Abrir `/venda-rapida` e conferir o seletor de fornecedor no cadastro rápido de produto, **antes** de recriar o `FORNECEDOR TESTE 06` do passo 2 (enquanto ele ainda está excluído).
   - **Critério de sucesso:** `FORNECEDOR TESTE 06` excluído não aparece na lista.

Se qualquer passo falhar, descrever o que aconteceu em vez de aprovar — não há comando de CLI para o Andre rodar; tudo acima é navegação na UI em `/relatorios`, `/cadastros`, `/importacao/fornecedores` e `/venda-rapida`.

## User Setup Required

**Rollout de imagem necessário.** Mesma dependência já registrada em 06-01: `deleted_at` só existe em produção após o rollout no namespace `bfx`. Nenhuma ação de dashboard além do próprio rollout da imagem.

## Next Phase Readiness

- `src/lib/empresa-options.ts` está pronto e testado — qualquer tela futura que precise excluir nomes coincidentes entre duas entidades pode reaproveitar o mesmo padrão.
- Bloqueio conhecido: os 2 suites vitest desta plan (`fornecedor-leituras-soft-delete.test.ts`, `empresa-options.test.ts`) ainda não foram confirmados verdes — gate real é o CI (`.github/workflows/ci.yml` → `npx vitest run`), não esta máquina (`vitest: command not found`, sem `node_modules`).
- Fase 6 fica com o código completo das 3 plans (06-01, 06-02, 06-03); falta apenas o checkpoint humano da Task 3 pós-rollout para fechar a fase como um todo.

---
*Phase: 06-integridade-de-dados-fornecedores-e-exportacao*
*Completed: 2026-08-03*

## Self-Check: PASSED

- Todos os 7 arquivos criados/modificados (`src/lib/empresa-options.ts`, `src/__tests__/fornecedor-leituras-soft-delete.test.ts`, `src/__tests__/empresa-options.test.ts`, `src/app/(app)/venda-rapida/page.tsx`, `src/lib/ai-actions.ts`, `src/lib/db-search.ts`, `src/app/(app)/relatorios/page.tsx`) confirmados presentes em disco.
- Todos os 4 commits (`053d223`, `1c6c1d5`, `70ac92a`, `c805dfb`) confirmados em `git log --oneline --all`.
- Confirmado (`git show --name-only` em cada commit) que nenhum dos 4 commits deste plano toca `src/lib/fornecedor-import.ts` — respeita o `interface_contract` (propriedade exclusiva do 06-02 nesta onda).
