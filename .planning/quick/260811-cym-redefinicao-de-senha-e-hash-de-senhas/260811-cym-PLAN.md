---
phase: quick-260811-cym
plan: 01
type: execute
wave: 1
depends_on: []
autonomous: true
requirements: [QK-CYM-01, QK-CYM-02, QK-CYM-03, QK-CYM-04, QK-CYM-05]
files_modified:
  - src/lib/senha.ts
  - src/lib/senha-politica.ts
  - src/lib/senha-actions.ts
  - src/components/perfil-senha-form.tsx
  - src/components/reset-senha-dialog.tsx
  - src/app/api/auth/login/route.ts
  - src/app/(app)/perfil/page.tsx
  - src/app/(app)/gestao-rh/page.tsx
  - src/lib/ai-actions.ts
  - src/__tests__/senha.test.ts
  - src/__tests__/login-migracao-senha.test.ts
  - src/__tests__/senha-politica.test.ts
  - src/__tests__/escritas-senha.test.ts
  - src/__tests__/senha-actions.test.ts

estimate:
  tokens: 95000
  raw_tokens: 95000
  tasks: 3
  confidence: low

must_haves:
  truths:
    - "O `admin` e a `jakeline` continuam entrando com as senhas que valem hoje depois do deploy — a migracao para hash nao tranca ninguem para fora (D-04)."
    - "Depois do primeiro login de um usuario legado, a coluna `password` dele deixa de ser texto puro e passa a comecar com o prefixo do formato scrypt (D-04)."
    - "Login com senha errada e login com usuario inexistente devolvem 401 com exatamente a mesma mensagem e o mesmo corpo — nao da para descobrir se um login existe (D-04)."
    - "Nenhum caminho do sistema grava senha em texto puro: login (re-hash), /perfil, `addUser` da Gestao RH, a redefinicao do admin e as tools `criar_usuario`/`atualizar_usuario` da IA gravam hash (D-04, D-06)."
    - "Em /perfil, senha atual errada ou confirmacao divergente nao grava nada e a tela mostra o erro (D-03)."
    - "Em /perfil, salvar os dados pessoais nao mexe na senha, e um erro na troca de senha nao descarta a edicao dos dados pessoais — sao dois formularios independentes (D-03)."
    - "O id do usuario em /perfil continua vindo da SESSAO, nunca do formulario (D-03)."
    - "Uma Server Action de senha invocada por um vendedor direto pelo Action ID falha na guarda da propria action, sem depender do render da pagina (D-02)."
    - "O admin redefine a senha de qualquer usuario em /gestao-rh e ve o valor uma unica vez para copiar; esse valor nunca aparece em URL, log de servidor ou AuditLog (D-02)."
    - "Nova senha com menos de 8 caracteres e recusada nos dois fluxos (D-03)."
  artifacts:
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
  key_links:
    - "POST /api/auth/login -> verificarSenha(digitada, user.password) -> se ehHashScrypt(user.password) === false -> prisma.usuario.update({ password: await hashSenha(digitada) }) antes de responder"
    - "src/lib/senha-politica.ts NAO importa node:crypto — e o unico modulo de senha que um componente 'use client' pode importar (gerarSenhaForte roda no browser via globalThis.crypto.getRandomValues)"
    - "ResetSenhaDialog (client) -> FormData montada a mao -> redefinirSenhaDeUsuario -> requireAdminOrThrow() -> hashSenha -> createAuditLog('usuario:reset-senha') sem a senha"
    - "PerfilSenhaForm (client) -> trocarMinhaSenha -> requireSessionOrThrow().id (nunca o id do formulario) -> verificarSenha(atual) -> validarTrocaDeSenha -> hashSenha"
    - "executeAiAction('criar_usuario'|'atualizar_usuario') -> hashSenha antes do prisma.usuario.create/update (parsedParams nao pode mais ir cru para `data`)"
    - "ResetSenhaDialog fica dentro do <form action={updateMeta}> da aba Detalhes -> nao pode conter <form> proprio (HTML invalido); chama a action com FormData montada, igual ao DeleteUserButton"
---

<objective>
Trocar o armazenamento de senha de texto puro para hash scrypt (`node:crypto`, sem instalar pacote) com migracao transparente no login, e entregar os dois fluxos de redefinicao decididos pelo dono: o admin redefine a senha de qualquer usuario em /gestao-rh, e o usuario troca a propria senha em /perfil exigindo a senha atual.

Purpose: hoje `usuarios.password` guarda a senha em texto puro e a comparacao no login e' `!==` de string. Qualquer leitura do banco (dump, backup, `consulta_sql` da IA, acesso ao pod) entrega todas as senhas. Alem disso nao existe forma de redefinir senha sem editar o banco a mao — foi o que o orquestrador acabou de fazer para destravar o admin.

Output: `src/lib/senha.ts` (hash/verificacao/deteccao de legado), `src/lib/senha-politica.ts` (regra minima + gerador, isomorfico), `src/lib/senha-actions.ts` (duas Server Actions com guarda propria), dois componentes client (`PerfilSenhaForm`, `ResetSenhaDialog`), login com re-hash transparente, e todos os pontos de escrita de senha gravando hash — inclusive as tools de usuario da IA.

Escopo travado por D-06. NAO entra: fluxo por e-mail, tabela de token, 2FA, expiracao de senha, rate limiting no login, mudanca no JWT/sessao.
</objective>

<execution_context>
@/Users/andrebrumcortezferreira/Documents/BFX/sitema-bfx/.claude/gsd-core/workflows/execute-plan.md
@/Users/andrebrumcortezferreira/Documents/BFX/sitema-bfx/.claude/gsd-core/templates/summary.md
</execution_context>

<context>
@CLAUDE.md
@.claude/skills/shadcn-bfx/SKILL.md

# Estado atual dos pontos que mexem em senha
@src/app/api/auth/login/route.ts
@src/lib/guards.ts
@src/lib/audit.ts
@src/components/delete-user-button.tsx

# Padroes de teste a seguir
@src/__tests__/clientes-post-route.test.ts
@src/__tests__/guards.test.ts
</context>

<constraints_do_ambiente>
Ler antes de escrever qualquer linha:

- **Nao instalar pacote.** `npm install` falha neste projeto por permissao em `node_modules`. `bcrypt`/`argon2` estao fora por decisao (D-04). Usar `node:crypto` (`scrypt`, `randomBytes`, `timingSafeEqual`, `createHash`).
- **Hook de seguranca do projeto bloqueia edicoes que contenham o padrao de `RegExp exec`.** Nao usar esse metodo em lugar nenhum. Nenhuma das funcoes deste plano precisa de regex — a validacao e' por tamanho e comparacao de string, e o gerador usa array de caracteres.
- **Os testes nao rodam nesta maquina** (D-07): o CI e' o gate. Escrever os testes na ordem TDD, rodar o que der (`npx tsc --noEmit`, `npx eslint`) e nao travar se o runner de teste falhar por ambiente. Registrar no SUMMARY o que rodou e o que nao rodou.
- **Sem migration de Prisma.** Verificado: `prisma/migrations/0001_init/migration.sql` cria `"password" TEXT NOT NULL` e o `datasource` e' `postgresql` — `TEXT` e' ilimitado, cabe a string scrypt (~150 chars). Nenhum campo novo e' necessario porque o formato armazenado e' auto-descritivo no mesmo campo.
- **`src/lib/senha.ts` importa `node:crypto`** — nunca pode ser importado por um componente `'use client'`. Tudo que o browser precisa (gerador e regra de tamanho) mora em `src/lib/senha-politica.ts`, que nao importa nada de Node.
- **shadcn/ui obrigatorio** (skill `shadcn-bfx`): `Dialog`, `Button`, `Input`, `Label` de `@/components/ui/`. Nada de `<button>`/`<input>` cru. Cor so por token (`text-muted-foreground`, `variant="destructive"`, etc.), nunca classe de cor crua.
</constraints_do_ambiente>

<tasks>

<task type="tracer" tdd="true">
  <name>Task 1: nucleo de hash scrypt + login com migracao transparente (fatia ponta a ponta)</name>
  <files>src/lib/senha.ts, src/app/api/auth/login/route.ts, src/__tests__/senha.test.ts, src/__tests__/login-migracao-senha.test.ts</files>
  <behavior>
    Escrever estes testes ANTES da implementacao e ver cada um falhar (D-05).

    `src/__tests__/senha.test.ts` (unitario puro, sem mock):
    - Teste 1: `hashSenha("segredo123")` chamado duas vezes devolve strings diferentes (salt aleatorio) e `verificarSenha("segredo123", ...)` aceita as duas.
    - Teste 2: `verificarSenha("errada", await hashSenha("segredo123"))` devolve false.
    - Teste 3: o valor devolvido por `hashSenha` comeca com o prefixo do formato e tem 6 campos separados por `$`; `ehHashScrypt` devolve true para ele.
    - Teste 4: `ehHashScrypt("senhaEmTextoPuro")` devolve false, e `verificarSenha("senhaEmTextoPuro", "senhaEmTextoPuro")` devolve true (caminho legado).
    - Teste 5: espacos nas pontas do valor digitado sao ignorados na verificacao, tanto no caminho novo quanto no legado — preserva o `String(body.password).trim()` que o login faz hoje.
    - Teste 6: valor armazenado vazio devolve false sem lancar; valor que comeca com o prefixo do formato mas esta mal-formado devolve false e NAO cai no comparador de texto puro (T-CYM-04).
    - Teste 7: `verificarSenhaFalsa("qualquer")` resolve para false (existe so para gastar o mesmo tempo quando o usuario nao existe).

    `src/__tests__/login-migracao-senha.test.ts` (rota, mocks no padrao de `src/__tests__/clientes-post-route.test.ts`: `vi.mock("@/lib/db")`, `vi.mock("@/lib/session")`):
    - Teste 1 (regressao obrigatoria de D-05): usuario com `password` em texto puro autentica -> resposta 200, e `prisma.usuario.update` foi chamado uma vez com um `password` que passa em `ehHashScrypt`. Nenhum usuario existente pode ficar trancado para fora.
    - Teste 2: usuario que ja tem hash autentica -> 200 e `prisma.usuario.update` NAO e' chamado.
    - Teste 3: senha errada -> 401, corpo com a mensagem generica de hoje, `update` nao chamado.
    - Teste 4: usuario inexistente -> 401 com exatamente o mesmo status e o mesmo corpo do Teste 3 (sem enumeracao de usuario, T-CYM-03).
    - Teste 5: se `prisma.usuario.update` rejeitar, o login legado ainda responde 200 — falha ao re-hashear nao pode derrubar o login.
  </behavior>
  <action>
    Criar `src/lib/senha.ts` com `import { scrypt, randomBytes, timingSafeEqual, createHash } from "node:crypto"` e `promisify` do `node:util`. Exportar:

    - `PREFIXO_SCRYPT` — identificador do formato, e as constantes de custo `N=16384`, `r=8`, `p=1`, `keylen=64`, salt de 16 bytes. Justificar em comentario: `128*N*r` = 16MB, abaixo do `maxmem` padrao de 32MB do Node, entao nao precisa passar `maxmem`.
    - `hashSenha(plain: string): Promise<string>` — aplica `.trim()` na entrada (normalizacao unica do sistema; o login ja fazia isso e todos os pontos de escrita passam a fazer), gera salt com `randomBytes`, deriva com scrypt e devolve a string auto-descritiva `scrypt` + `$` + N + `$` + r + `$` + p + `$` + salt em base64 + `$` + hash em base64.
    - `ehHashScrypt(armazenado: string): boolean` — valida a FORMA COMPLETA: comeca com o prefixo, `split("$")` devolve 6 partes, as tres partes de custo sao inteiros positivos, e as duas ultimas decodificam de base64 com o tamanho esperado. Sem regex.
    - `verificarSenha(plain: string, armazenado: string): Promise<boolean>` — se `ehHashScrypt(armazenado)`, deriva com os parametros gravados e compara com `timingSafeEqual` (os dois buffers tem o mesmo `keylen`, entao nao lanca). Se o valor comecar com o prefixo do formato mas nao passar em `ehHashScrypt`, devolver false SEM cair no comparador de texto puro (T-CYM-04). Caso contrario e' legado: comparar o digest sha256 do valor digitado (ja com trim) com o digest sha256 do valor armazenado usando `timingSafeEqual` — os dois digests tem 32 bytes fixos, o que da comparacao de tempo constante sem depender do tamanho da senha. Nunca lancar: valor vazio ou nulo devolve false.
    - `verificarSenhaFalsa(plain: string): Promise<false>` — chama `hashSenha(plain)` e descarta o resultado. Existe para o login gastar o mesmo tempo quando o login nao existe.

    Editar `src/app/api/auth/login/route.ts` mantendo o contrato de resposta atual (mesmos status, mesmo corpo, mesmo cookie, mesmo payload de sessao). Ordem nova: buscar o usuario; se nao existir, aguardar `verificarSenhaFalsa(senhaDigitada)` e responder o 401 generico; se existir, `const ok = await verificarSenha(senhaDigitada, user.password)` e responder o MESMO 401 generico quando false; quando true e `ehHashScrypt(user.password) === false`, gravar `prisma.usuario.update({ where: { id: user.id }, data: { password: await hashSenha(senhaDigitada) } })` dentro de try/catch — se a gravacao falhar, seguir e responder 200 assim mesmo (a proxima tentativa re-hasheia). Adicionar `export const runtime = "nodejs";` no topo para deixar explicito que a rota nao roda no Edge, onde `node:crypto` nao existe.

    Nao mexer em `src/lib/session.ts`, no cookie, no `maxAge` nem no middleware (D-06).
  </action>
  <verify>
    <automated>npx vitest run src/__tests__/senha.test.ts src/__tests__/login-migracao-senha.test.ts --reporter=verbose; npx tsc --noEmit</automated>
    <human-check>Se o runner nao rodar nesta maquina (D-07), registrar a falha de ambiente no SUMMARY e confirmar que `npx tsc --noEmit` passou.</human-check>
  </verify>
  <done>Um usuario com senha em texto puro autentica e sai do login ja com hash gravado; um usuario com hash autentica sem escrita extra; senha errada e usuario inexistente devolvem 401 identicos. `npx tsc --noEmit` limpo.</done>
</task>

<task type="auto" tdd="true">
  <name>Task 2: regra de politica + gerador isomorfico, e hash nos pontos de escrita sem UI (Gestao RH e IA)</name>
  <files>src/lib/senha-politica.ts, src/app/(app)/gestao-rh/page.tsx, src/lib/ai-actions.ts, src/__tests__/senha-politica.test.ts, src/__tests__/escritas-senha.test.ts</files>
  <behavior>
    Testes primeiro, falhando (D-05).

    `src/__tests__/senha-politica.test.ts` (unitario puro):
    - Teste 1: `validarForcaMinima("1234567")` devolve resultado nao-ok com mensagem sobre o minimo de 8; `validarForcaMinima("12345678")` devolve ok.
    - Teste 2: `validarTrocaDeSenha({ nova: "senhaboa1", confirmacao: "senhaboa2", igualAtual: false })` devolve nao-ok com a mensagem de confirmacao divergente.
    - Teste 3: `validarTrocaDeSenha({ nova: "senhaboa1", confirmacao: "senhaboa1", igualAtual: true })` devolve nao-ok com a mensagem de senha igual a atual.
    - Teste 4: `validarTrocaDeSenha` com nova valida, confirmacao igual e `igualAtual: false` devolve ok.
    - Teste 5: `gerarSenhaForte(16)` devolve 16 caracteres, duas chamadas devolvem valores diferentes, e todo caractere pertence ao alfabeto declarado (sem os ambiguos `0 O o l 1 I`).

    `src/__tests__/escritas-senha.test.ts` (mocks de `@/lib/db`, `@/lib/session`, `@/lib/revalidacao`, `@/lib/audit`, `next/cache` — padrao de `src/__tests__/fornecedor-rbac-auditoria.test.ts`, que ja importa Server Action exportada de um `page.tsx`):
    - Teste 1: `addUser` (exportada de `@/app/(app)/gestao-rh/page`) com sessao admin chama `prisma.usuario.create` com um `password` que passa em `ehHashScrypt`, e `verificarSenha` aceita a senha original — nunca o valor cru do formulario.
    - Teste 2: `addUser` com sessao de vendedor lanca e nao chama `create` (guarda existente preservada).
    - Teste 3: `executeAiAction("criar_usuario", { username, password, role }, ctx admin)` chama `prisma.usuario.create` com password hasheado que `verificarSenha` aceita.
    - Teste 4: `executeAiAction("atualizar_usuario", { id, password }, ctx admin)` chama `prisma.usuario.update` com password hasheado; com `{ id, nomeExibicao }` sem password, o objeto `data` do update nao traz a chave `password` (nao pode zerar a senha de ninguem).
    - Teste 5: `executeAiAction("criar_usuario", ..., ctx com role vendedor)` lanca e nao escreve (guarda `requireAdmin(ctx)` preservada).
  </behavior>
  <action>
    Criar `src/lib/senha-politica.ts` SEM nenhum import de `node:` — este e' o modulo que o browser importa. Exportar:
    - `TAMANHO_MINIMO_SENHA = 8` e o tipo `ResultadoPolitica = { ok: true } | { ok: false; erro: string }`.
    - `validarForcaMinima(nova: string): ResultadoPolitica` — regra simples e explicita de D-03: so tamanho minimo, sem biblioteca de politica de senha.
    - `validarTrocaDeSenha({ nova, confirmacao, igualAtual }): ResultadoPolitica` — encadeia forca minima, confirmacao identica e diferenca em relacao a atual. Mensagens em pt-BR, uma por regra, prontas para virar toast.
    - `gerarSenhaForte(tamanho = 16): string` — alfabeto explicito em constante (maiusculas, minusculas, digitos e um punhado de simbolos seguros para copiar/colar), sem os caracteres ambiguos. Sortear com `globalThis.crypto.getRandomValues(new Uint32Array(tamanho))` e descartar valores acima do maior multiplo do tamanho do alfabeto que cabe em 32 bits (amostragem por rejeicao, para nao enviesar). Sem regex, sem `Math.random`.

    Editar `src/app/(app)/gestao-rh/page.tsx`: em `addUser`, trocar a gravacao do valor do formulario por `password: await hashSenha(senha)`. Manter tudo o mais como esta — `requireAdminOrThrow()`, o `login.toLowerCase()`, o `revalidarUsuario()` e os campos existentes. Exportar `addUser` (sem `default`) para o teste conseguir importa-la, seguindo o precedente ja usado no projeto em `@/app/(app)/cadastros/page`.

    Editar `src/lib/ai-actions.ts` nos dois `case` de usuario, mantendo `requireAdmin(ctx)` intacto:
    - `criar_usuario`: separar `password` do resto de `parsedParams` por desestruturacao e montar o `data` com `password: await hashSenha(String(password))`. `parsedParams` nao pode mais ir cru para `data`.
    - `atualizar_usuario`: separar `password`; quando vier preenchido, gravar `await hashSenha(...)`; quando nao vier, o `data` nao pode conter a chave `password` de forma alguma.
    Nao alterar o schema zod das tools, nem os nomes das acoes, nem o mapa de revalidacao.

    Registrar como follow-up no SUMMARY (nao implementar, fora de D-06): `criar_usuario` da IA nao aplica `toLowerCase()` no username, entao um usuario criado pela IA com letra maiuscula nunca consegue logar, porque o login busca o username em minusculas.
  </action>
  <verify>
    <automated>npx vitest run src/__tests__/senha-politica.test.ts src/__tests__/escritas-senha.test.ts --reporter=verbose; npx tsc --noEmit; npx eslint src/lib/senha-politica.ts src/lib/ai-actions.ts "src/app/(app)/gestao-rh/page.tsx"</automated>
  </verify>
  <done>Nenhuma das duas tools de usuario da IA e nenhuma criacao de usuario na Gestao RH grava senha crua; a regra de politica e o gerador existem, sao isomorficos e estao cobertos por teste.</done>
</task>

<task type="auto" tdd="true">
  <name>Task 3: Server Actions de senha com guarda propria + UI de troca em /perfil e de redefinicao em /gestao-rh</name>
  <files>src/lib/senha-actions.ts, src/components/perfil-senha-form.tsx, src/components/reset-senha-dialog.tsx, src/app/(app)/perfil/page.tsx, src/app/(app)/gestao-rh/page.tsx, src/__tests__/senha-actions.test.ts</files>
  <behavior>
    Testes primeiro, falhando (D-05). `src/__tests__/senha-actions.test.ts`, mocks de `@/lib/db`, `@/lib/session`, `@/lib/audit`, `next/cache`.

    `trocarMinhaSenha` (D-03):
    - Teste 1: com sessao valida e senha atual correta, chama `prisma.usuario.update` com o id da SESSAO e um password que passa em `ehHashScrypt`; devolve resultado ok.
    - Teste 2: o id do usuario usado no `update` e' o da sessao mesmo quando o FormData carrega um `id` diferente — o campo do formulario e' ignorado (nao regredir a correcao de seguranca ja existente).
    - Teste 3: senha atual errada devolve resultado nao-ok com mensagem e `prisma.usuario.update` NAO e' chamado (nada gravado).
    - Teste 4: confirmacao divergente devolve nao-ok e nao grava.
    - Teste 5: nova senha com 7 caracteres devolve nao-ok e nao grava.
    - Teste 6: nova senha igual a atual devolve nao-ok e nao grava.
    - Teste 7: sem sessao, a action lanca e nao grava.

    `redefinirSenhaDeUsuario` (D-02):
    - Teste 8: sessao de vendedor faz a action lancar e nao grava nada — a guarda vive na propria action, nao na pagina (T-CYM-01).
    - Teste 9: sessao admin com `usuarioId` valido de usuario existente grava password que passa em `ehHashScrypt` no id ALVO (nao no id do admin).
    - Teste 10: `usuarioId` nao numerico, zero, negativo ou de usuario inexistente devolve nao-ok e nao grava (T-CYM-02).
    - Teste 11: em caso de sucesso, `createAuditLog` e' chamado com uma acao de redefinicao de senha, e o objeto de detalhes NAO contem a senha em lugar nenhum (T-CYM-05, T-CYM-06). Serializar o argumento e afirmar que a senha usada no teste nao aparece nele.
    - Teste 12: o valor de retorno da action nunca traz a senha — so `ok` e opcionalmente `erro`.
  </behavior>
  <action>
    Criar `src/lib/senha-actions.ts` com `"use server"` na primeira linha (mesmo padrao dos modulos de action ja existentes, ex.: `src/app/(app)/historico/actions.ts`). Duas actions, ambas devolvendo `{ ok: boolean; erro?: string }` — devolver objeto em vez de lancar nos erros de validacao, porque o Next mascara mensagem de erro lancada por Server Action em producao e o usuario veria um texto generico. Erros de autorizacao continuam lancando.

    `trocarMinhaSenha(formData)`:
    - `const sessao = await requireSessionOrThrow()`; o id vem SEMPRE de `sessao.id`, nunca do FormData (D-03).
    - Ler `atual`, `nova`, `confirmacao` do FormData; carregar o usuario pelo id da sessao.
    - `await verificarSenha(atual, user.password)` — se false, devolver erro de senha atual incorreta sem gravar nada.
    - Calcular `igualAtual` com `await verificarSenha(nova, user.password)` e passar para `validarTrocaDeSenha`; devolver o `erro` da politica se houver.
    - Gravar `password: await hashSenha(nova)` no id da sessao e chamar `createAuditLog("usuario:trocar-senha", { usuarioId: sessao.id })` — nunca com a senha. Devolver ok.

    `redefinirSenhaDeUsuario(formData)`:
    - `const admin = await requireAdminOrThrow()` como PRIMEIRA linha da action (D-02: guarda propria; o guard da pagina roda no render, depois da action, e o Action ID vive no bundle servido estaticamente).
    - `const alvoId = Number(formData.get("usuarioId") || 0)`; recusar se nao for inteiro positivo. Carregar o alvo com `findUnique` e recusar se nao existir (D-02: o id vem do formulario, entao valide).
    - `validarForcaMinima(nova)`; gravar `password: await hashSenha(nova)` no id ALVO.
    - `createAuditLog("usuario:reset-senha", { usuarioId: alvo.id, alvo: alvo.username, porAdmin: admin.username })` — os detalhes NUNCA podem conter a senha. O admin redefinindo a propria senha por essa via e' permitido de proposito (valvula de escape, D-02) e fica registrado igual.
    - Nunca devolver a senha no retorno, nunca `console.log` do valor.

    Criar `src/components/perfil-senha-form.tsx` (`'use client'`): um `<form>` proprio com tres campos `Input type="password"` + `Label` (senha atual `autoComplete="current-password"`, nova e confirmacao `autoComplete="new-password"`) e um `<Button>` "Alterar senha". No submit, montar o FormData e chamar `trocarMinhaSenha`; em `ok` mostrar `toast.success` e limpar os tres campos; em erro mostrar `toast.error(erro)` mantendo o que foi digitado. Envolver a chamada em try/catch para o caso de a action lancar (sessao expirada), com toast generico. Usar `sonner` e os componentes de `@/components/ui/`, como em `src/components/delete-user-button.tsx`. Nada de HTML cru, cor so por token.

    Criar `src/components/reset-senha-dialog.tsx` (`'use client'`): props `{ userId: number; userName: string }`. Trigger `<Button type="button" variant="outline">` — `type="button"` e' obrigatorio porque o componente fica dentro do `<form action={updateMeta}>` da aba Detalhes. Dentro do `<Dialog>`: um `Input type="text"` controlado com a nova senha, um `<Button type="button">` "Gerar senha forte" que preenche o campo com `gerarSenhaForte()` de `@/lib/senha-politica` (roda no browser — por isso a politica nao pode importar `node:crypto`), e um `<Button type="button">` "Copiar" com `navigator.clipboard.writeText`. O conteudo do dialog NAO pode conter um elemento `<form>` (form aninhado e' HTML invalido): montar o FormData a mao com `usuarioId` e `nova` e chamar `redefinirSenhaDeUsuario`, exatamente como `DeleteUserButton` faz. Em sucesso, `toast.success` avisando que o valor so aparece uma vez e deve ser copiado agora; limpar o estado ao fechar o dialog. A senha vive so no estado do React: nunca em `searchParams`, nunca em `defaultValue` vindo do servidor, nunca em `console.log`.

    Editar `src/app/(app)/perfil/page.tsx`: remover o campo de senha do formulario de dados pessoais e remover a gravacao condicional de senha de `savePerfil` — a partir daqui `savePerfil` so cuida de nome, e-mail, telefone e endereco. Adicionar um `Card` novo "Alterar senha" com `<PerfilSenhaForm />`, irmao do card de dados pessoais, para que um erro de senha nao descarte a edicao dos outros campos nem o contrario (D-03). Manter o comentario existente que explica por que o id vem da sessao.

    Editar `src/app/(app)/gestao-rh/page.tsx`: no rodape de cada linha da aba Detalhes, ao lado de `<DeleteUserButton>`, inserir `<ResetSenhaDialog userId={u.id} userName={u.nomeExibicao || u.username} />`.
  </action>
  <verify>
    <automated>npx vitest run src/__tests__/senha-actions.test.ts --reporter=verbose; npx tsc --noEmit; npx eslint src/lib/senha-actions.ts src/components/perfil-senha-form.tsx src/components/reset-senha-dialog.tsx "src/app/(app)/perfil/page.tsx" "src/app/(app)/gestao-rh/page.tsx"; npm run cores:check</automated>
    <human-check>Subir a aplicacao e conferir: (1) em /perfil, trocar a senha com a atual errada mostra erro e nao desloga; trocar corretamente permite entrar de novo com a nova senha; (2) em /gestao-rh > Detalhes, "Redefinir senha" gera um valor forte, permite copiar, e o usuario alvo entra com ele; (3) o valor gerado nao aparece na URL nem no HTML servido (View Source).</human-check>
  </verify>
  <done>O usuario troca a propria senha em /perfil exigindo a atual, o admin redefine a senha de qualquer usuario em /gestao-rh vendo o valor uma unica vez, as duas actions carregam guarda propria, e nenhum caminho grava senha crua.</done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| browser -> Server Action | O Action ID vive no bundle servido estaticamente; a action e' invocavel por POST direto, sem passar pelo render (e portanto sem passar pelo guard da pagina) |
| browser -> POST /api/auth/login | Rota nao autenticada por definicao; recebe username e senha de quem quiser |
| chat da IA -> executeAiAction | Parametros chegam do modelo, potencialmente sob influencia do texto do usuario |
| banco -> aplicacao | O valor de `usuarios.password` hoje e' texto puro; durante a migracao os dois formatos coexistem |

## STRIDE Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation Plan |
|-----------|----------|-----------|----------|-------------|-----------------|
| T-CYM-01 | Elevation of Privilege | `redefinirSenhaDeUsuario` em `src/lib/senha-actions.ts` | critical | mitigate | `requireAdminOrThrow()` como primeira linha da propria action; Teste 8 chama a action com sessao de vendedor e exige throw sem escrita |
| T-CYM-02 | Tampering | `usuarioId` vindo do FormData na redefinicao | high | mitigate | Validar inteiro positivo e existencia com `findUnique` antes de gravar; Teste 10 cobre id nao numerico, zero, negativo e inexistente |
| T-CYM-03 | Information Disclosure | `POST /api/auth/login` — enumeracao de usuario | medium | mitigate | Mensagem e status unicos para senha errada e usuario inexistente (Teste 4), e `verificarSenhaFalsa` gasta o mesmo tempo de scrypt quando o login nao existe |
| T-CYM-04 | Spoofing | `verificarSenha` — downgrade para o comparador legado | high | mitigate | `ehHashScrypt` valida a forma completa (6 campos, custos inteiros, base64 do tamanho certo); valor com o prefixo mas mal-formado devolve false e nunca cai na comparacao de texto puro (Teste 6) |
| T-CYM-05 | Information Disclosure | Senha gerada no `ResetSenhaDialog` | high | mitigate | Gerada no browser via `crypto.getRandomValues`, vive so no estado do React, nunca em searchParam/HTML servido/`console.log`; o servidor nunca a devolve (Teste 12) nem a grava no AuditLog (Teste 11) |
| T-CYM-06 | Repudiation | Admin redefine a senha de outro admin sem rastro | medium | mitigate | `createAuditLog("usuario:reset-senha", { usuarioId, alvo, porAdmin })` no padrao ja existente de `src/lib/audit.ts`, sem a senha |
| T-CYM-07 | Information Disclosure | `usuarios.password` em texto puro no banco | critical | mitigate | scrypt com salt por registro + migracao transparente no login (Teste 1 de `login-migracao-senha`) + todos os pontos de escrita gravando hash (Task 2 e Task 3) |
| T-CYM-08 | Spoofing | Troca de senha sem exigir a senha atual — sessao roubada vira takeover | high | mitigate | `/perfil` verifica a senha atual com `verificarSenha` antes de qualquer gravacao (Teste 3) |
| T-CYM-09 | Denial of Service | scrypt (~100ms, 16MB) em rota publica permite exaustao de CPU por flood de login | medium | accept | Rate limiting esta fora de escopo por D-06; parametros escolhidos ficam abaixo do `maxmem` padrao de 32MB do Node. Registrar como follow-up no SUMMARY |
| T-CYM-10 | Tampering | Prompt injection leva a IA a chamar `atualizar_usuario` e trocar a senha do admin | high | accept | Vetor pre-existente, nao introduzido por esta mudanca; `requireAdmin(ctx)` ja limita a admins e o hash nao altera o risco. Fora de D-06 — registrar como follow-up |
| T-CYM-SC | Tampering | Instalacao de pacote (npm) | n/a | mitigate | Nenhum pacote e' instalado neste plano (D-04): `node:crypto` e' builtin. Nao ha superficie de supply chain nova |
</threat_model>

<verification>
1. `npx tsc --noEmit` limpo.
2. `npx vitest run src/__tests__/senha.test.ts src/__tests__/senha-politica.test.ts src/__tests__/login-migracao-senha.test.ts src/__tests__/escritas-senha.test.ts src/__tests__/senha-actions.test.ts` — todos verdes (ou, se o runner nao subir nesta maquina por D-07, registrar no SUMMARY e deixar o CI ser o gate).
3. `npx eslint` limpo nos arquivos tocados e `npm run cores:check` sem regressao (catraca de cor crua do projeto).
4. Nenhum arquivo tocado usa o metodo de execucao de regex bloqueado pelo hook do projeto.
5. Nenhum `package.json`/`package-lock.json` modificado — a implementacao inteira usa builtin do Node.
6. Nenhuma migration nova em `prisma/migrations/` e nenhuma alteracao em `prisma/schema.prisma`.
</verification>

<success_criteria>
- [ ] Um usuario com senha em texto puro loga normalmente e sai do login com a senha ja hasheada no banco (D-04)
- [ ] Login com senha errada e com usuario inexistente devolvem 401 identicos (D-04)
- [ ] `/perfil` exige senha atual, nova com 8+ caracteres, confirmacao batendo e nova diferente da atual; erro nao grava nada (D-03)
- [ ] `/perfil` separa a troca de senha do cadastro de dados pessoais em dois formularios independentes (D-03)
- [ ] `/gestao-rh` permite ao admin redefinir a senha de qualquer usuario, com opcao de gerar senha forte e copiar o valor uma unica vez (D-02)
- [ ] As duas Server Actions de senha carregam guarda propria e sao testadas contra invocacao por vendedor (D-02)
- [ ] `addUser`, `criar_usuario` e `atualizar_usuario` gravam hash (D-04, D-06)
- [ ] Testes escritos antes da implementacao, cobrindo os seis itens de D-05
- [ ] Nenhum pacote instalado, nenhuma migration, nenhuma mudanca em JWT/sessao (D-04, D-06)
</success_criteria>

<output>
Criar `.planning/quick/260811-cym-redefinicao-de-senha-e-hash-de-senhas/260811-cym-SUMMARY.md` ao terminar, registrando: o que rodou e o que nao rodou de teste nesta maquina (D-07), e os follow-ups (rate limiting no login T-CYM-09, prompt injection nas tools de usuario T-CYM-10, `criar_usuario` da IA sem `toLowerCase` no username).
</output>
