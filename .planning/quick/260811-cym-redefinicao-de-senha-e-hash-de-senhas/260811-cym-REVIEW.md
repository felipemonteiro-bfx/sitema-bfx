---
phase: 260811-cym-redefinicao-de-senha-e-hash-de-senhas
reviewed: 2026-08-11T00:00:00Z
depth: deep
files_reviewed: 9
files_reviewed_list:
  - src/lib/senha.ts
  - src/lib/senha-politica.ts
  - src/lib/senha-actions.ts
  - src/components/perfil-senha-form.tsx
  - src/components/reset-senha-dialog.tsx
  - src/app/api/auth/login/route.ts
  - src/app/(app)/perfil/page.tsx
  - src/app/(app)/gestao-rh/page.tsx
  - src/lib/ai-actions.ts
findings:
  critical: 1
  warning: 5
  info: 1
  total: 7
status: issues_found
---

# Phase 260811-cym: Code Review Report — Redefinição de senha e hash de senhas

**Reviewed:** 2026-08-11
**Depth:** deep (cross-file, traced into `src/lib/ai.ts`, `src/lib/mcp.ts`, `src/lib/audit.ts`, `src/lib/guards.ts`, `src/lib/session.ts` as call-chain context even though they weren't in the diff)
**Files Reviewed:** 9 source files (6 commits, `10cd406..1b5892b`); 5 test files read for context/coverage-gap analysis but not filed against (per review rules)
**Status:** issues_found

## Summary

Reviewed the scrypt-hashing rollout, the transparent legacy-password migration on
login, and the two new password Server Actions (self-change, admin reset).

The core cryptography is sound: `hashSenha`/`verificarSenha` use `timingSafeEqual`
correctly, the legacy plaintext path is compared via a fixed-size SHA-256 digest
(no length-based timing leak), the login migration re-hash is best-effort and
never blocks a successful legacy login, and both new Server Actions carry their
own `requireSessionOrThrow`/`requireAdminOrThrow` guard as the first line —
matching the project's documented pattern for actions that can't rely on the
page/layout guard. The reset-password dialog keeps the generated password
client-side only; the two dedicated audit-log calls (`usuario:trocar-senha`,
`usuario:reset-senha`) never include the password value, and this is explicitly
covered by tests (`senha-actions.test.ts` Teste 11/12).

However, **the generic audit-logging path in `src/lib/ai-actions.ts` re-opens
exactly the leak this phase was supposed to close**: `criar_usuario` and
`atualizar_usuario` hash the password before writing it to `Usuario.password`,
but the same plaintext password (and, on success, the freshly-created hash) is
still written verbatim into `AuditLog.detalhes`, retrievable by any admin via
the `consultar_auditoria` tool and, for the hash, sent to the third-party LLM
provider as the tool-call result. This is a BLOCKER — it defeats the stated
purpose of D-04/D-06 through a code path the new tests never assert against
(unlike the equivalent, correctly-tested assertion in `senha-actions.test.ts`
Teste 11).

Several lower-severity gaps remain: password-policy (8-char minimum) is not
enforced on the two AI-driven user tools nor on the "Contratar" tab in
Gestão RH, `validarForcaMinima` checks length on the untrimmed value while
`hashSenha` trims before hashing (a password can pass the length check and
still be hashed at fewer than 8 effective characters), and the hard-coded
`KEYLEN`/`SALT_BYTES` validation constants in `ehHashScrypt` are not actually
free to change later despite the doc comment's claim, unlike `N`/`r`/`p` which
genuinely are read from the stored value.

No hardcoded secrets, no `RegExp.exec()`, no raw colors, and no new
`package.json` dependencies were introduced by this diff.

## Critical Issues

### CR-01: Plaintext (and hashed) password written to `AuditLog.detalhes` by the generic AI-action logger, undoing the D-04/D-06 fix

**File:** `src/lib/ai-actions.ts:1006-1031` (write path) and `:1533-1539` (log path)

**Issue:**
`criar_usuario` and `atualizar_usuario` correctly hash the password before
writing to `Usuario.password`:

```ts
case "criar_usuario": {
  requireAdmin(ctx);
  const { password: senhaCriarUsuario, ...restoCriarUsuario } = parsedParams;
  result = await prisma.usuario.create({
    data: { ...restoCriarUsuario, password: await hashSenha(String(senhaCriarUsuario)) },
  });
  break;
}
```

But JS object destructuring does not mutate the source object: `parsedParams`
still carries the original `password` key with the **plaintext** value the
model/admin typed. A few lines later, `executeAiAction`'s generic wrapper logs
that same object, unredacted:

```ts
await logAction("success", { params: parsedParams, result });
...
await logAction("error", { params, error: msg });
```

`logAction` writes this straight into the database:

```ts
await prisma.auditLog.create({
  data: { ..., detalhes: JSON.stringify(details ?? {}) },
});
```

Net effect, per call:
- **Success path:** `AuditLog.detalhes` contains `params.password` in
  cleartext (from `parsedParams`), *and* `result.password` — the Prisma
  record returned by `create`/`update` with no `select`, so it includes the
  new scrypt hash — since `result` is logged unredacted too.
- **Error path** (e.g. duplicate username → P2002): the raw pre-validation
  `params` object is logged, which still has the plaintext password the
  admin/model attempted to set, even though the write never happened.

This is retrievable in two additional ways beyond raw DB access:
1. Any admin asking the chat "mostra a auditoria de hoje" triggers
   `consultar_auditoria`, which does `JSON.parse(l.detalhes)` and returns it
   as the tool result — so the plaintext password is handed straight back
   into the chat/LLM context on request.
2. `result` (including the hash) is also the literal return value of the
   `tool({ execute: ... })` callback in `src/lib/ai.ts` (`:327-331`,
   `:380-384`, `:490-494`) — that return value is what the AI SDK sends back
   to the third-party provider (OpenAI/Gemini) as the tool-call result for
   the model's next reasoning step. So on every `criar_usuario`/
   `atualizar_usuario` call, the newly-hashed password is transmitted to an
   external LLM API, not just persisted locally.

This is provable by direct code reading (destructuring semantics + the
unconditional `logAction` calls), not a hypothesis. It is also not caught by
`src/__tests__/escritas-senha.test.ts` — Teste 3/4a assert only that
`dbMock.usuario.create/update` received a hashed password; neither test
asserts anything about `dbMock.auditLog.create`, unlike the equivalent and
correct assertion in `senha-actions.test.ts` Teste 11
(`expect(JSON.stringify(detalhes)).not.toContain(senhaUsadaNoTeste)`).

**Fix:** Strip the password before it reaches `logAction`, and stop returning
the password field (hashed or not) from the two Prisma calls at all:

```ts
case "criar_usuario": {
  requireAdmin(ctx);
  const { password: senhaCriarUsuario, ...restoCriarUsuario } = parsedParams;
  result = await prisma.usuario.create({
    data: { ...restoCriarUsuario, password: await hashSenha(String(senhaCriarUsuario)) },
    select: { id: true, username: true, nomeExibicao: true, role: true }, // never select password
  });
  break;
}
```

And in the generic wrapper, redact any `password`/`senha` key before logging
`params`/`parsedParams` (the `result` leak is already closed once `select`
omits `password`):

```ts
function semSenha<T>(obj: T): T {
  if (!obj || typeof obj !== "object") return obj;
  const clone: Record<string, unknown> = { ...(obj as Record<string, unknown>) };
  for (const k of Object.keys(clone)) {
    if (/senha|password/i.test(k)) clone[k] = "[redacted]";
  }
  return clone as T;
}
...
await logAction("success", { params: semSenha(parsedParams), result });
...
await logAction("error", { params: semSenha(params), error: msg });
```

Add a test mirroring `senha-actions.test.ts` Teste 11 for both
`criar_usuario` and `atualizar_usuario` that asserts
`dbMock.auditLog.create` was never called with the raw password in
`detalhes`.

## Warnings

### WR-01: `validarForcaMinima` checks length on the untrimmed value; `hashSenha` trims before hashing — a password can pass the 8-char gate and still be hashed shorter

**File:** `src/lib/senha-politica.ts:10-18`, `src/lib/senha.ts:38-39`, `src/lib/senha-actions.ts:22-23,70`

**Issue:** `trocarMinhaSenha`/`redefinirSenhaDeUsuario` read `nova` straight
from `FormData` without trimming, then call `validarForcaMinima(nova)`, which
checks `nova.length < TAMANHO_MINIMO_SENHA` on the **raw** string. `hashSenha`
then does `String(plain).trim()` before deriving the hash. A value like
`" 1234567"` (one leading space + 7 digits, length 8) passes the policy check,
but the password that actually gets hashed and later must be re-typed to
authenticate is `"1234567"` — 7 effective characters, one below the stated
minimum. This doesn't let anyone bypass authentication, but it silently
violates the invariant the policy module exists to enforce, and it means the
length shown to the user ("mínimo 8 caracteres") is not actually the length
enforced.

**Fix:** Trim before validating, in both Server Actions:
```ts
const nova = String(formData.get("nova") || "").trim();
```
or make `validarForcaMinima` trim internally, so a single source of truth
governs both the check and the hash.

### WR-02: Password-policy minimum (8 chars) is not enforced on AI-driven user writes or on the "Contratar" tab

**File:** `src/lib/ai-actions.ts:134-139,140-148` (zod schemas for
`criar_usuario`/`atualizar_usuario`), `src/app/(app)/gestao-rh/page.tsx:38-55`
(`addUser`)

**Issue:** `criar_usuario`'s zod schema uses `password: requiredString()` —
trims and requires non-empty, but has no `.min(8)`. `atualizar_usuario` uses
`optionalString()` with the same gap. `addUser` only checks
`if (!nome || !login || !senha) return;` — any non-empty string, including a
1-character password, is accepted, hashed, and stored. Meanwhile the two
paths this phase explicitly hardened (`trocarMinhaSenha`,
`redefinirSenhaDeUsuario`) both correctly call `validarForcaMinima`. The
result is an inconsistent policy: an admin (or the LLM acting on an admin's
behalf) can create/reset a user's password to something like `"a"` through
chat or the "Contratar" form, while the same admin cannot set an equally weak
password through `/gestao-rh`'s reset dialog or `/perfil`.

**Fix:** Import and call `validarForcaMinima` (or at minimum
`.min(TAMANHO_MINIMO_SENHA)` in the zod schemas) in all four write points
before hashing, returning/throwing the same message used elsewhere for
consistency.

### WR-03: `ehHashScrypt`'s hard-coded `KEYLEN`/`SALT_BYTES` checks contradict the doc comment's claim that cost parameters can change later without invalidating old hashes

**File:** `src/lib/senha.ts:17-24,58-80`

**Issue:** The header comment on `ehHashScrypt` states the format is
self-descriptive so parameters can be changed later "sem invalidar hashes
antigos." That's true for `N`/`r`/`p` — they're read from the stored string
(`Number(nStr)` etc.) and used as-is in `verificarSenha`. It is **not** true
for salt/key size: `decodeBase64ComTamanho(saltB64, SALT_BYTES)` and
`decodeBase64ComTamanho(hashB64, KEYLEN)` validate against the *current*
module constants, not anything encoded in the stored value. If a future
change bumps `KEYLEN` or `SALT_BYTES` (e.g. to strengthen the derived key),
every hash created under the old constants would immediately fail
`ehHashScrypt` — and `verificarSenha` returns `false` (never falls back to
legacy) for anything that starts with `scrypt$` but fails that check. That
would lock out every existing user in one deploy, exactly the failure mode
this phase is most concerned about (D-01 in the task brief). Currently
dormant (no such change is proposed here), but worth flagging given the
review's explicit priority on "não pode trancar usuário para fora."

**Fix:** Either document explicitly that salt/key length are *not* safe to
change without a data migration (update the comment to stop implying they
are), or encode key/salt length in the stored value (e.g. as two more `$`
fields) so `ehHashScrypt`/`verificarSenha` can validate/derive against the
value actually used at hash time instead of today's constants.

### WR-04: A legacy plaintext password that happens to start with `"scrypt$"` becomes permanently unauthenticatable — no fallback, by design, and no mitigation

**File:** `src/lib/senha.ts:91-119`

**Issue:** `verificarSenha` explicitly refuses to fall back to the legacy
plaintext comparator once the stored value starts with `scrypt$`, even if
`ehHashScrypt` says it's malformed (per T-CYM-04, this is intentional — "não
faz downgrade para texto puro"). This is the right general policy, but it has
one unguarded edge case: if either of the two real production accounts
(`admin`, `jakeline`) has a plaintext password that happens to start with the
literal string `scrypt$` (or is otherwise misdetected — e.g. a password
containing exactly 5 `$`-separated segments after the prefix with
base64-decodable 16/64-byte fields, however unlikely), that account becomes
permanently unable to authenticate the moment this code ships, with no
automatic recovery path (the only "fix" is a DB-level password reset, which
requires infra access, not app-level admin access, since the locked-out
account may itself be the only admin). **This is a hypothesis, not a
confirmed fact** — the actual values of the two production plaintext
passwords aren't available to this review — but given the explicit "trancar
usuário para fora" priority, it's worth a pre-deploy sanity check: confirm
neither production password currently begins with `scrypt$`.

**Fix:** Before deploying, run a one-off check against the two production
`Usuario.password` values (`SELECT username, password LIKE 'scrypt$%' FROM
"Usuario"` or equivalent) to confirm neither legacy value collides with the
new format prefix. No code change needed if the check comes back clean; if
it doesn't, rename the prefix or add a documented recovery procedure.

### WR-05: `PerfilSenhaForm`'s catch-all mislabels any thrown error as "Sessão expirada"

**File:** `src/components/perfil-senha-form.tsx:40-42`

**Issue:**
```ts
} catch {
  // requireSessionOrThrow lanca quando a sessao expirou.
  toast.error("Sessão expirada. Faça login novamente.");
}
```
The comment's premise is incomplete: `trocarMinhaSenha` can also throw from
`prisma.usuario.findUnique` (e.g. a transient DB error), from
`prisma.usuario.update`, or from `createAuditLog` — none of which mean the
session expired. A user hitting a genuine backend error during password
change would be told to log in again, which is both wrong and likely to send
them into a retry loop that doesn't address the actual failure.

**Fix:** Either narrow the message ("Não foi possível trocar a senha. Tente
novamente.") or have `trocarMinhaSenha` convert non-auth errors into the
`{ok:false, erro}` shape (as it already does for validation failures) so only
`requireSessionOrThrow` reaches the client as a thrown exception.

## Info

### IN-01: Dead defensive check in `verificarSenha` — `derivado.length !== hashArmazenado.length` can never be true

**File:** `src/lib/senha.ts:104-111`

**Issue:**
```ts
const derivado = await scryptAsync(senha, salt, hashArmazenado.length, {
  N: Number(nStr), r: Number(rStr), p: Number(pStr),
});
if (derivado.length !== hashArmazenado.length) return false;
return timingSafeEqual(derivado, hashArmazenado);
```
`hashArmazenado.length` is passed as the `keylen` argument to `scryptAsync`,
so `derivado.length` is guaranteed equal to `hashArmazenado.length` by
construction — the guard can never trigger, and `timingSafeEqual` (which
throws on length mismatch) is unreachably protected here regardless. Harmless
as written, but it reads as defense against a case that structurally cannot
occur, which can mislead a future reader into thinking `timingSafeEqual`'s
crash-on-mismatch risk is being handled generically when it's actually
prevented by argument choice.

**Fix:** Either remove the redundant check, or add a one-line comment noting
it's unreachable by construction (kept only as a belt-and-suspenders guard
should the `keylen` argument ever change).

---

_Reviewed: 2026-08-11_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: deep_
