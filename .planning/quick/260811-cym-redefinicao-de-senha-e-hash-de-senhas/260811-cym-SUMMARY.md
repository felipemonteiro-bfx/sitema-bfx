---
phase: quick-260811-cym
plan: 01
subsystem: auth
tags: [scrypt, node-crypto, server-actions, nextjs, prisma, rbac]

requires: []
provides:
  - "src/lib/senha.ts: hashSenha/verificarSenha/ehHashScrypt/verificarSenhaFalsa (scrypt via node:crypto)"
  - "src/lib/senha-politica.ts: validarForcaMinima/validarTrocaDeSenha/gerarSenhaForte (isomorfico)"
  - "src/lib/senha-actions.ts: trocarMinhaSenha / redefinirSenhaDeUsuario (Server Actions com guarda propria)"
  - "Migracao transparente de senha em texto puro para hash no login"
  - "UI de troca de senha em /perfil e de redefinicao em /gestao-rh"
affects: [gestao-rh, perfil, ai-actions, login]

actuals:
  tokens: 13287
  tasks: 3
  commits: 6

tech-stack:
  added: []
  patterns:
    - "Hash de senha com node:crypto scrypt, sem instalar pacote (bcrypt/argon2 fora por decisao)"
    - "Formato auto-descritivo no mesmo campo: scrypt$N$r$p$salt-base64$hash-base64"
    - "Migracao transparente: login legado re-hasheia apos autenticar com sucesso"
    - "Server Action com guarda propria como primeira linha (nao depende do guard de pagina/layout)"
    - "Dialog aninhado dentro de outro <form>: FormData montado a mao, sem <form> proprio (mesmo padrao de DeleteUserButton)"

key-files:
  created:
    - src/lib/senha.ts
    - src/lib/senha-politica.ts
    - src/lib/senha-actions.ts
    - src/components/perfil-senha-form.tsx
    - src/components/reset-senha-dialog.tsx
    - src/__tests__/senha.test.ts
    - src/__tests__/login-migracao-senha.test.ts
    - src/__tests__/senha-politica.test.ts
    - src/__tests__/escritas-senha.test.ts
    - src/__tests__/senha-actions.test.ts
  modified:
    - src/app/api/auth/login/route.ts
    - src/app/(app)/perfil/page.tsx
    - src/app/(app)/gestao-rh/page.tsx
    - src/lib/ai-actions.ts

key-decisions:
  - "scrypt (node:crypto) em vez de bcrypt/argon2 — nao instala pacote (npm install falha no ambiente); N=16384/r=8/p=1/salt=16B/keylen=64B, ~16MB por derivacao, abaixo do maxmem padrao de 32MB do Node"
  - "Login re-hasheia a senha legada de forma best-effort: se a gravacao falhar, responde 200 do mesmo jeito, para nunca trancar admin/jakeline (as duas contas reais de producao, hoje em texto puro) para fora"
  - "verificarSenha nunca faz downgrade: valor com prefixo scrypt mal-formado devolve false sem cair no comparador de texto puro (T-CYM-04)"
  - "Duas Server Actions com guarda propria (requireSessionOrThrow / requireAdminOrThrow como primeira linha), nao dependem do render da pagina (T-CYM-01)"
  - "/perfil: troca de senha vira formulario e Server Action independentes de savePerfil — erro em um nao descarta o outro (D-03)"

patterns-established:
  - "Modulo isomorfico separado (senha-politica.ts) sem import de node: para logica que precisa rodar no browser (gerador de senha via globalThis.crypto)"
  - "Server Action devolve { ok, erro? } em erro de validacao (em vez de lancar) porque o Next mascara mensagem de erro lancada por Server Action em producao"

requirements-completed: [QK-CYM-01, QK-CYM-02, QK-CYM-03, QK-CYM-04, QK-CYM-05]

coverage:
  - id: D1
    description: "hashSenha/verificarSenha/ehHashScrypt/verificarSenhaFalsa — nucleo de hash scrypt com migracao transparente no login"
    requirement: "QK-CYM-01"
    verification:
      - kind: unit
        ref: "src/__tests__/senha.test.ts (7 testes) — executado via script node --experimental-strip-types (equivalente ao vitest, mesmas 7 asserções), TODOS passaram"
        status: pass
      - kind: integration
        ref: "src/__tests__/login-migracao-senha.test.ts (5 testes) — escrito e revisado linha a linha contra a implementacao; NAO executado (npx vitest falha neste ambiente, D-07)"
        status: unknown
    human_judgment: true
    rationale: "vitest nao roda nesta maquina (sem node_modules); o nucleo puro (senha.ts) foi validado por execucao real via node --experimental-strip-types, mas o teste de rota (mocks de prisma/session) depende do runner. CI e' o gate real."
  - id: D2
    description: "senha-politica.ts (validarForcaMinima/validarTrocaDeSenha/gerarSenhaForte) isomorfico, sem node:"
    requirement: "QK-CYM-03"
    verification:
      - kind: unit
        ref: "src/__tests__/senha-politica.test.ts (5 testes) — executado via node --experimental-strip-types, TODOS passaram"
        status: pass
    human_judgment: false
  - id: D3
    description: "addUser (/gestao-rh) e tools criar_usuario/atualizar_usuario da IA gravam hash, nunca senha crua"
    requirement: "QK-CYM-04"
    verification:
      - kind: unit
        ref: "src/__tests__/escritas-senha.test.ts (5 testes) — nao executado (zod/uuid indisponiveis localmente, D-07); revisado linha a linha contra a implementacao"
        status: unknown
    human_judgment: true
    rationale: "ai-actions.ts importa zod/uuid, pacotes ausentes neste ambiente (npm install falha) — impossivel importar o modulo fora do vitest. CI e' o gate."
  - id: D4
    description: "trocarMinhaSenha (/perfil) e redefinirSenhaDeUsuario (/gestao-rh) — Server Actions com guarda propria, AuditLog sem a senha"
    requirement: "QK-CYM-02"
    verification:
      - kind: unit
        ref: "src/__tests__/senha-actions.test.ts (12 testes) — nao executado (depende de jose/next/headers, D-07); revisado linha a linha contra a implementacao, todos os 12 casos tracados manualmente"
        status: unknown
    human_judgment: true
    rationale: "senha-actions.ts depende de @/lib/guards -> @/lib/session -> jose/next/headers, indisponiveis localmente. CI e' o gate; o human-check do plano (subir a app e testar /perfil e /gestao-rh) tambem cobre isto."
  - id: D5
    description: "npm run cores:check sem regressao de cor crua nos arquivos tocados"
    verification:
      - kind: other
        ref: "npm run cores:check"
        status: pass
    human_judgment: false

duration: 55min
completed: 2026-08-11
status: complete
---

# Quick Task 260811-cym: Redefinição de senha e hash de senhas

**Substitui senha em texto puro por hash scrypt (node:crypto, sem instalar pacote) com migração transparente no login, e entrega dois fluxos de redefinição: admin redefine qualquer senha em /gestao-rh, usuário troca a própria em /perfil exigindo a senha atual.**

## Performance

- **Duration:** ~55min
- **Tasks:** 3/3
- **Files modified:** 14 (5 criados de produção + 5 testes + 4 modificados)

## Accomplishments

- `usuarios.password` deixa de comparar com `!==` de string em texto puro; agora usa scrypt com salt por registro (`src/lib/senha.ts`), formato auto-descritivo `scrypt$N$r$p$salt$hash` no mesmo campo — sem migration de banco.
- Login migra silenciosamente: um usuário com senha legada autentica normalmente e sai com hash gravado, sem re-digitar nada. Falha na gravação do re-hash não derruba o login (best-effort). Isso é o que impede `admin` e `jakeline` — hoje as únicas duas contas do sistema, ambas em texto puro — de ficarem trancadas para fora no deploy.
- Login com senha errada e com usuário inexistente devolvem exatamente o mesmo 401/corpo, e o caminho de usuário inexistente gasta o mesmo tempo de um scrypt real (`verificarSenhaFalsa`) — sem enumeração de usuário por tempo de resposta.
- Todos os pontos de escrita de senha gravam hash: `addUser` (Gestão RH), `criar_usuario`/`atualizar_usuario` (tools da IA), `trocarMinhaSenha` (/perfil) e `redefinirSenhaDeUsuario` (/gestao-rh).
- Duas Server Actions novas com guarda própria (não dependem do render da página): `trocarMinhaSenha` exige a senha atual e usa sempre o id da sessão; `redefinirSenhaDeUsuario` tem `requireAdminOrThrow()` como primeira linha, valida o `usuarioId` do formulário e grava `AuditLog` sem a senha em lugar nenhum.
- `/perfil` ganhou um card "Alterar senha" independente do formulário de dados pessoais — erro em um não descarta o outro. A senha some do HTML servido (antes vinha como campo do form de dados pessoais).
- `/gestao-rh` ganhou `ResetSenhaDialog` ao lado de `DeleteUserButton`: gera senha forte (`globalThis.crypto.getRandomValues`, amostragem por rejeição, sem `Math.random`), permite copiar, mostra o valor uma única vez. Nenhum `<form>` aninhado — FormData montado à mão, igual ao padrão já usado por `DeleteUserButton`.

## Task Commits

1. **Task 1: núcleo de hash scrypt + login com migração transparente**
   - `10cd406` test: RED — senha.test.ts + login-migracao-senha.test.ts
   - `5627728` feat: GREEN — src/lib/senha.ts + login route
2. **Task 2: senha-politica.ts + hash nos pontos de escrita sem UI**
   - `871811a` test: RED — senha-politica.test.ts + escritas-senha.test.ts
   - `0574beb` feat: GREEN — senha-politica.ts + gestao-rh addUser + ai-actions.ts
3. **Task 3: Server Actions de senha + UI**
   - `645519f` test: RED — senha-actions.test.ts
   - `1b5892b` feat: GREEN — senha-actions.ts + PerfilSenhaForm + ResetSenhaDialog + perfil/gestao-rh

_Nenhum commit de metadados de plano incluído aqui — o orquestrador cuida do commit de docs (SUMMARY/STATE) separadamente, conforme instrução da execução._

## Files Created/Modified

- `src/lib/senha.ts` — hashSenha/verificarSenha/ehHashScrypt/verificarSenhaFalsa (scrypt via node:crypto)
- `src/lib/senha-politica.ts` — validarForcaMinima/validarTrocaDeSenha/gerarSenhaForte, isomórfico (sem `node:`)
- `src/lib/senha-actions.ts` — trocarMinhaSenha / redefinirSenhaDeUsuario
- `src/components/perfil-senha-form.tsx` — formulário de troca de senha em /perfil
- `src/components/reset-senha-dialog.tsx` — dialog de redefinição em /gestao-rh
- `src/app/api/auth/login/route.ts` — verificação + migração transparente + `runtime = "nodejs"`
- `src/app/(app)/perfil/page.tsx` — savePerfil só cuida de dados pessoais; card "Alterar senha" novo
- `src/app/(app)/gestao-rh/page.tsx` — addUser exportado e grava hash; ResetSenhaDialog na lista
- `src/lib/ai-actions.ts` — criar_usuario/atualizar_usuario gravam hash; atualizar_usuario nunca zera a senha quando não veio no payload
- `src/__tests__/senha.test.ts`, `login-migracao-senha.test.ts`, `senha-politica.test.ts`, `escritas-senha.test.ts`, `senha-actions.test.ts`

## Decisions Made

- **scrypt via `node:crypto`, sem instalar pacote** — `npm install` falha neste ambiente por permissão em `node_modules`; `bcrypt`/`argon2` estavam fora por decisão do plano (D-04). Custo N=16384/r=8/p=1, salt 16 bytes, keylen 64 bytes — memória usada ≈16MB por derivação, abaixo do `maxmem` padrão de 32MB do Node.
- **Migração best-effort no login** — se `prisma.usuario.update` falhar ao re-hashear, o login segue e responde 200 do mesmo jeito. Decisão deliberada: a próxima tentativa re-hasheia de novo, e nunca pode haver um cenário em que uma falha de escrita tranca um usuário existente para fora.
- **`verificarSenha` nunca faz downgrade** (T-CYM-04) — um valor armazenado que começa com o prefixo `scrypt$` mas está mal-formado retorna `false` direto, nunca cai no comparador de texto puro legado.
- **Guarda própria em vez de confiar no guard de página** (T-CYM-01) — `redefinirSenhaDeUsuario` chama `requireAdminOrThrow()` como primeira linha, porque o Action ID vive no bundle servido estaticamente e é invocável por POST direto, sem passar pelo render.

## Deviations from Plan

None - plan executado exatamente como escrito. As duas mudanças abaixo são follow-ups **registrados, não implementados**, conforme instrução explícita do próprio plano (fora de escopo por D-06):

- **T-CYM-09 (aceito no plano, não mitigado):** scrypt (~100ms, 16MB) numa rota pública de login permite exaustão de CPU por flood de requisições. Rate limiting está fora de escopo (D-06).
- **T-CYM-10 (aceito no plano, não mitigado):** prompt injection pode levar a IA a chamar `atualizar_usuario` e trocar a senha de um admin. Vetor pré-existente, não introduzido por esta mudança — `requireAdmin(ctx)` já limita a admins.
- **`criar_usuario` da IA não aplica `toLowerCase()` no username** — um usuário criado pela IA com letra maiúscula no username nunca consegue logar, porque o login busca `username` já em minúsculas (`String(body.username).toLowerCase().trim()`). Não corrigido porque estava fora do escopo travado da Task 2 (a instrução do plano foi "registrar como follow-up, não implementar").

## Issues Encountered

**Ambiente sem `node_modules` (D-07), mais restrito do que o plano antecipava.** O plano previa rodar `npx vitest` e `npx tsc --noEmit` localmente e cair para "registrar no SUMMARY" só se o runner falhasse. Na prática:

- `npx vitest run ...` falha ao carregar `vitest.config.ts` (`Cannot find module 'vitest/config'`) — não existe `node_modules/vitest` neste checkout.
- `npx tsc --noEmit` falha (não existe `node_modules/typescript`; `npx` recusa baixar/rodar).
- `npx eslint ...` falha (`Cannot find package 'eslint'` ao carregar `eslint.config.mjs`).
- `npm run cores:check` **funciona** (script Node puro, sem dependência de pacote) — rodado após cada task, sempre `OK — sem regressões. Saldo: 0 a menos que o baseline`.

**Mitigação aplicada:** para o código sem dependência de pacotes externos (`src/lib/senha.ts` e `src/lib/senha-politica.ts`), escrevi scripts standalone executados com `node --experimental-strip-types` (Node 26, disponível neste ambiente) reproduzindo exatamente as asserções dos arquivos de teste — as 7 asserções de `senha.test.ts` e as 5 de `senha-politica.test.ts` passaram todas contra a implementação real (não mockada), incluindo o caminho crítico de regressão: hash com salt aleatório, verificação do caminho legado em texto puro, e o caso de downgrade bloqueado (T-CYM-04).

Para os quatro arquivos de teste que dependem de pacotes ausentes localmente (`login-migracao-senha.test.ts` usa `next/server`; `escritas-senha.test.ts` e `senha-actions.test.ts` dependem de `zod`/`uuid`/`jose`/`next/headers` via os módulos que testam), não foi possível executar nem `tsc`. Cada um foi revisado manualmente linha a linha contra a implementação (todos os campos de mock, todas as asserções, todos os casos de borda do plano) antes do commit GREEN. **CI é o gate real para estes cinco arquivos de teste** — a suíte completa (`npx vitest run src/__tests__/senha.test.ts src/__tests__/senha-politica.test.ts src/__tests__/login-migracao-senha.test.ts src/__tests__/escritas-senha.test.ts src/__tests__/senha-actions.test.ts`) precisa ser conferida verde no CI antes de considerar o plano verificado ponta a ponta.

## User Setup Required

Nenhuma configuração de serviço externo é necessária — tudo usa `node:crypto` builtin, sem pacote novo, sem variável de ambiente nova, sem migration.

**Ação humana recomendada antes de fechar esta quick task (human-check do plano, Task 3):** subir a aplicação (ou aguardar o CI/deploy) e confirmar:
1. Em `/perfil`, trocar a senha com a atual errada mostra erro e não desloga; trocar corretamente permite entrar de novo com a nova senha.
2. Em `/gestao-rh` > Detalhes, "Redefinir senha" gera um valor forte, permite copiar, e o usuário alvo entra com ele.
3. O valor gerado não aparece na URL nem no HTML servido (View Source).
4. **Crítico:** confirmar que `admin` e `jakeline` — as duas contas reais de produção, hoje com senha em texto puro — continuam entrando normalmente após o deploy (o teste de regressão automatizado cobre isso, mas vale a confirmação manual pós-deploy pela mesma razão que motivou este plano).

## Next Phase Readiness

Escopo da quick task encerrado. Nenhum bloqueio para o próximo trabalho. Os três follow-ups documentados acima (T-CYM-09, T-CYM-10, `toLowerCase` no username da IA) ficam como candidatos a backlog, não como bloqueio.

---
*Phase: quick-260811-cym*
*Completed: 2026-08-11*

## Self-Check: PASSED

All 14 files created/modified verified present on disk; all 6 task commit hashes verified present in `git log --oneline --all`.
