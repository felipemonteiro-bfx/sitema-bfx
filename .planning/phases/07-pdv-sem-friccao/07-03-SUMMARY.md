---
phase: 07-pdv-sem-friccao
plan: 03
subsystem: api
tags: [next.js, prisma, soft-delete, audit-log, react, shadcn-dialog]

requires:
  - phase: 06-integridade-de-dados-fornecedores-e-exportacao
    provides: "src/lib/fornecedor-import.ts (classificarNomeFornecedor/normalizarNomeFornecedor) e Fornecedor.deletedAt"
provides:
  - "POST /api/fornecedores — rota nova, exige sessao, reativa soft-deletado, nao duplica ativo, 409 legivel em conflito de nome"
  - "CadastrarFornecedorRapidoDialog — modal de cadastro rapido de fornecedor"
  - "cadastrar-produto-rapido-dialog.tsx renderiza o modal aninhado e seleciona o fornecedor recem-criado"
affects: [07-pdv-sem-friccao, venda-rapida]

actuals:
  tokens: 4073
  tasks: 3
  commits: 6

tech-stack:
  added: []
  patterns:
    - "Rota POST reusa modulo puro de classificacao da Fase 6 (classificarNomeFornecedor) em vez de reimplementar normalizacao/comparacao de nome"
    - "Dialogs shadcn aninhados: modal de fornecedor renderizado dentro do DialogContent do modal de produto, com estado de open proprio (onOpenChange interno nao fecha o externo)"
    - "useMemo dedupe+sort (localeCompare pt-BR) combinando prop server-component com registros criados na sessao do modal, para o select refletir criacoes sem re-fetch"

key-files:
  created:
    - src/app/api/fornecedores/route.ts
    - src/components/cadastrar-fornecedor-rapido-dialog.tsx
    - src/__tests__/fornecedores-post-route.test.ts
  modified:
    - src/components/cadastrar-produto-rapido-dialog.tsx

key-decisions:
  - "A logica completa da rota (criar/reativar/ignorar) foi implementada de uma vez na Task 1 (tracer), em vez de so o ramo 'criar' como o plano descrevia por task — o tracer ja precisava do import de classificarNomeFornecedor e a decisao nunca e recalculada, entao nao houve razao pratica para atrasar os outros dois ramos, que ja seguem o mesmo padrao provado em addFornecedor (06-01). Tasks 2 e 3 verificaram e travaram esse comportamento com os testes correspondentes, sem precisar tocar na rota de novo."
  - "O modal (cadastrar-fornecedor-rapido-dialog.tsx) recebeu a diferenciacao de toast (criado/reativado/ja cadastrado) so na Task 2, mantendo o commit da Task 1 focado no fluxo minimo (toast generico de sucesso), conforme a granularidade de tasks do plano."

patterns-established:
  - "Primeira rota HTTP de escrita de Fornecedor fora de /cadastros — segue o mesmo padrao de sessao-antes-de-tudo que POST /api/produtos, mas com getSession() em vez de guarda de admin (D-03: qualquer usuario autenticado cadastra fornecedor)."

requirements-completed: [PDV-16]

coverage:
  - id: D1
    description: "POST /api/fornecedores existe, exige sessao (401 sem cookie, nenhuma escrita) e devolve { id, nome, reativado, jaExistia } para o modal selecionar sem segunda requisicao"
    requirement: PDV-16
    verification:
      - kind: unit
        ref: "src/__tests__/fornecedores-post-route.test.ts#Teste 1, Teste 3, Teste 9"
        status: unknown
      - kind: other
        ref: "node one-liner Task 1 <verify> — PDV-16 TRACER OK"
        status: pass
    human_judgment: false
  - id: D2
    description: "Nome soft-deletado e reativado (update + deletedAt: null) em vez de reinserido, reusando classificarNomeFornecedor da Fase 6 — nao estoura o @unique de nome"
    requirement: PDV-16
    verification:
      - kind: unit
        ref: "src/__tests__/fornecedores-post-route.test.ts#Teste 5, Teste 6"
        status: unknown
      - kind: other
        ref: "node one-liner Task 2 <verify> — PDV-16 SOFT-DELETE OK"
        status: pass
    human_judgment: false
  - id: D3
    description: "Nome ja ativo devolve o registro existente sem duplicar e sem escrita; conflito de @unique (P2002) vira 409 legivel citando o nome; erro inesperado vira 500 generico, nunca vazando o erro cru do Prisma"
    requirement: PDV-16
    verification:
      - kind: unit
        ref: "src/__tests__/fornecedores-post-route.test.ts#Teste 7, Teste 10, Teste 11"
        status: unknown
      - kind: other
        ref: "node one-liner Task 3 <verify> — PDV-16 TRAVA OK"
        status: pass
    human_judgment: false
  - id: D4
    description: "Vendedor cadastra fornecedor sem sair do cadastro rapido de produto do PDV, e o fornecedor criado ja aparece selecionado no campo Fornecedor (D-07)"
    requirement: PDV-16
    verification:
      - kind: other
        ref: "node one-liner Task 1 <verify> — checagem estrutural de CadastrarFornecedorRapidoDialog + useMemo + setFornecedorId em cadastrar-produto-rapido-dialog.tsx"
        status: pass
    human_judgment: true
    rationale: "Fluxo de UI (abrir modal aninhado, digitar nome, ver selecao acontecer) so pode ser confirmado visualmente apos o rollout — nao ha node_modules nesta maquina para subir a aplicacao. Ver human-check da Task 2/3."

duration: 3min
completed: 2026-08-03
status: complete
---

# Phase 7 Plan 3: Cadastro rápido de fornecedor no PDV Summary

**`POST /api/fornecedores` novo (sessão obrigatória, reativação de soft-deletado reusando `classificarNomeFornecedor` da Fase 6, conflito de nome único traduzido para 409 legível) mais `CadastrarFornecedorRapidoDialog` renderizado dentro do cadastro rápido de produto, deixando o fornecedor criado já selecionado.**

## Performance

- **Duration:** ~3 min (por timestamp de commit)
- **Started:** 2026-08-03T14:28:46-04:00
- **Completed:** 2026-08-03T14:31:49-04:00
- **Tasks:** 3/3
- **Files modified:** 4 (3 criados, 1 modificado)

## Accomplishments

- `POST /api/fornecedores` — primeira rota HTTP de escrita de fornecedor fora da tela de Cadastros. `getSession()` é a primeira instrução do handler, antes de ler o corpo e antes de qualquer chamada ao Prisma (T-07-10).
- A decisão criar/reativar/ignorar vem inteira de `classificarNomeFornecedor` (Fase 6, `src/lib/fornecedor-import.ts`, **não alterado** neste plano) — a leitura de existentes deliberadamente não filtra `deletedAt`, para a reativação enxergar os soft-deletados (T-07-13).
- Ramo `reativar`: `update` limpando `deletedAt` e gravando telefone (trim), audita `fornecedor:restore`. Ramo `criar`: `create`, audita `fornecedor:create`. Ramo `ignorar`: nenhuma escrita, devolve o registro ativo encontrado.
- Conflito de `@unique` (`P2002`, corrida entre a leitura e a escrita) vira `409` citando só o nome; erro inesperado vira `500` genérico — nenhum dos dois vaza o erro cru do Prisma (T-07-12).
- `CadastrarFornecedorRapidoDialog` — modal novo com campo único (nome, caixa alta, `autoFocus`), `fetch("/api/fornecedores")`, toast diferenciado por `reativado`/`jaExistia` do corpo da resposta (não pelo status HTTP), `onCriado` + fechar no sucesso (D-07).
- `cadastrar-produto-rapido-dialog.tsx` renderiza o modal de fornecedor como dialog aninhado (Radix): o `onOpenChange` interno só mexe no próprio estado, sem fechar o modal de produto. As opções do `FormSelect` de fornecedor saem de um `useMemo` que junta a prop `fornecedores` (server component) com os criados nesta sessão do modal, dedupe por id, ordenado por `localeCompare` pt-BR. O `onCriado` acrescenta o registro e chama `setFornecedorId`, deixando-o selecionado.

## Task Commits

Cada task seguiu RED (teste) -> GREEN (implementação):

1. **Task 1: Fatia vertical — cadastrar fornecedor dentro do produto rápido e já sair selecionado (D-06, D-07, PDV-16)**
   - `28e0134` test(07-03): failing test for POST /api/fornecedores
   - `3b4613a` feat(07-03): cadastro rapido de fornecedor no PDV ja selecionado (PDV-16, D-06, D-07)
2. **Task 2: Respeitar o soft-delete da Fase 6 — reativar em vez de reinserir (D-06, PDV-16)**
   - `b942a0e` test(07-03): failing test for reativacao de fornecedor soft-deletado
   - `db8a957` feat(07-03): POST /api/fornecedores reativa soft-deletado e nao duplica ativo (D-06)
3. **Task 3: Trava de regressão — sessão obrigatória e conflito de nome legível (D-06, PDV-16)**
   - `b0d40d4` test(07-03): trava de sessao e conflito de nome na rota de fornecedores

## Files Created/Modified

- `src/app/api/fornecedores/route.ts` - `POST` com sessão obrigatória, três ramos (criar/reativar/ignorar) via `classificarNomeFornecedor`, 409 em conflito de nome único, 500 genérico em erro inesperado
- `src/components/cadastrar-fornecedor-rapido-dialog.tsx` - modal de cadastro rápido de fornecedor (nome único, toast diferenciado, `onCriado`)
- `src/components/cadastrar-produto-rapido-dialog.tsx` - botão "+ Novo fornecedor", dialog aninhado, `useMemo` de opções combinadas, seleção automática do fornecedor criado
- `src/__tests__/fornecedores-post-route.test.ts` - 11 casos: sessão/nome vazio/criação/auditoria (1-4), reativação/ignorar/telefone (5-8), trava de RBAC/conflito único/erro inesperado (9-11)

## Decisions Made

- A lógica completa da rota (`criar`/`reativar`/`ignorar`) foi implementada de uma vez na Task 1 (tracer) em vez de só o ramo `criar`, como o plano descrevia por task. O tracer já precisava importar `classificarNomeFornecedor` e a decisão nunca é recalculada na rota, então os outros dois ramos seguiram o mesmo padrão já provado em `addFornecedor` (06-01) sem custo adicional relevante. As Tasks 2 e 3 verificaram e travaram esse comportamento com os testes correspondentes — a rota não precisou mudar de novo nessas tasks, exatamente como o plano previa para a Task 3 ("se a implementação já cobrir os três casos, a rota não muda").
- A diferenciação de toast do modal (criado/reativado/já cadastrado) foi implementada só na Task 2, mantendo o commit da Task 1 focado no fluxo mínimo (toast genérico de sucesso) — granularidade de commits alinhada à divisão de tasks do plano.

## Deviations from Plan

None - plano executado exatamente como escrito, com a única mudança de granularidade documentada acima em "Decisions Made" (implementação completa da rota antecipada para a Task 1, sem pular nenhum teste ou verificação das Tasks 2/3).

## Issues Encountered

- **Race de git index com executor concorrente:** ao commitar a Task 3 (`git add src/__tests__/fornecedores-post-route.test.ts && git commit`), o commit resultante incluiu `src/__tests__/clientes-post-route.test.ts` (arquivo de outro executor rodando em paralelo no mesmo working tree, plano 07-02), aparentemente staged por aquele processo entre o `add` e o `commit` desta sessão. Recuperado sem descartar trabalho de ninguém: `git reset --soft HEAD~1` (moveu HEAD de volta, manteve os dois arquivos staged), `git restore --staged src/__tests__/clientes-post-route.test.ts` (destaged só o arquivo alheio, conteúdo no working tree intacto), e recommit só com `fornecedores-post-route.test.ts`. Nenhum `git add -A`/`git commit -a` foi usado em nenhum momento desta sessão; nenhuma operação destrutiva (`git clean`, `git reset --hard`, `git checkout --` em arquivo alheio) foi necessária.

## User Setup Required

None - nenhuma mudança de schema, nenhuma variável de ambiente nova. Nenhum `git push` foi executado (regra do ambiente); os commits ficam locais até o push da branch.

## Next Phase Readiness

- `POST /api/fornecedores` está pronto e segue o mesmo contrato de resposta (`{ id, nome, reativado, jaExistia }`) usado pelo modal — qualquer tela futura que precise cadastrar fornecedor inline pode reusar a rota sem mudança.
- Os três `<human-check>` do plano (excluir fornecedor em `/cadastros`, recriar pelo PDV e confirmar reativação auditada; sessão expirada mostrando mensagem de não autenticado) **ficam pendentes de UAT pós-rollout** — não há `node_modules` nesta máquina para subir a aplicação. Registrado aqui como verificação pendente, não como falha.
- A suíte `fornecedores-post-route.test.ts` (11 casos) ainda não foi confirmada verde localmente (`vitest: command not found` — restrição de ambiente documentada no plano). O gate real é o CI (`.github/workflows/ci.yml` → `npx vitest run`); conferir a primeira execução após o push antes de considerar PDV-16 totalmente fechado.
- `src/lib/fornecedor-import.ts` **não foi alterado** neste plano — continua o contrato público da Fase 6, usado agora por três consumidores (`addFornecedor` em `/cadastros`, o importador CSV da 06-02, e esta rota).

---
*Phase: 07-pdv-sem-friccao*
*Completed: 2026-08-03*

## Self-Check: PASSED

- Todos os 4 arquivos de codigo/teste (`src/app/api/fornecedores/route.ts`, `src/components/cadastrar-fornecedor-rapido-dialog.tsx`, `src/__tests__/fornecedores-post-route.test.ts`, `src/components/cadastrar-produto-rapido-dialog.tsx`) confirmados presentes em disco.
- Todos os 5 commits do plano (`28e0134`, `3b4613a`, `b942a0e`, `db8a957`, `b0d40d4`) confirmados em `git log --oneline --all`.
