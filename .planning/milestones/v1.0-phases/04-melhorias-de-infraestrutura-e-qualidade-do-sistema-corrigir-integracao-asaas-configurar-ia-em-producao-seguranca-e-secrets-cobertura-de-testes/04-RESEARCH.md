# Phase 4: Melhorias de Infraestrutura e Qualidade — Research

**Researched:** 2026-03-30
**Domain:** Next.js 15 App Router — integração Asaas, configuração IA em produção, segurança de secrets, cobertura de testes
**Confidence:** HIGH

---

## Summary

Esta fase cobre quatro domínios independentes de qualidade/infraestrutura: (1) a integração Asaas para boletos que tem histórico de instabilidade (header revertido, campo access_token vs Authorization não resolvido definitivamente); (2) a IA em produção que funciona via DB config mas ainda depende de variáveis de ambiente como fallback sem documentação clara de quais são obrigatórias em cada ambiente; (3) secrets e segurança — SESSION_SECRET usa `"dev-secret"` como fallback padrão em produção se não configurado, e o admin backfill-estoque não exige autenticação; (4) cobertura de testes — existe apenas um spec Playwright sem playwright.config.ts, sem testes unitários, sem CI test step.

O trabalho real desta fase é: corrigir os bugs remanescentes da integração Asaas, definir e documentar quais env vars são obrigatórias em produção, fechar os buracos de segurança identificados, e criar uma base mínima de testes automatizados que rode no CI sem servidor.

**Primary recommendation:** Tratar cada domínio como um plan separado — Asaas, IA/Produção, Segurança, Testes — com verificações concretas ao final de cada um.

---

## Standard Stack

### Core (já instalado no projeto)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Next.js | 15 (App Router) | Framework principal | Já em uso |
| Prisma | latest | ORM para PostgreSQL | Já em uso |
| jose | latest | JWT sign/verify | Já em uso (session.ts) |
| @ai-sdk/google | latest | Gemini integration | Já em uso |
| @ai-sdk/openai | latest | OpenAI/LiteLLM integration | Já em uso |
| zod | 3.x | Validação de env vars e schemas | Já em uso |

### Para Testes (não instalado)

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| vitest | ^2.x | Unit/integration tests | Testes de funções puras (sem browser) |
| @playwright/test | ^1.x | E2E/browser tests | Já há um spec; falta config |
| msw | ^2.x | Mock de API externas (Asaas) | Isolar testes de integrações externas |

**IMPORTANTE:** `npm install` falha por permissões no projeto. Novos pacotes precisam ser adicionados via `package.json` + `npm install` com sudo, ou no pipeline CI. Verificar se vitest/playwright já estão em `node_modules` como transitive deps antes de propor instalação.

**Verificação prévia obrigatória:**
```bash
ls /tmp/sitema-bfx/node_modules/vitest 2>/dev/null && echo "vitest present"
ls /tmp/sitema-bfx/node_modules/@playwright/test 2>/dev/null && echo "playwright present"
```

---

## Architecture Patterns

### Domínio 1: Asaas — Estado Atual e Problemas

**O que existe:**
- `src/lib/asaas.ts` — cliente completo com `getAsaasConfig`, `getOrCreateCustomer`, `createBoletoPayment`, `listPayments`
- `src/lib/boleto-actions.ts` — Server Action `gerarBoletoAsaas`
- `src/app/(app)/venda-rapida/actions.ts` — também chama `gerarBoletoAsaas`
- Config model no Prisma: `asaasApiKey`, `asaasEnv`

**Problema confirmado via git log:**
1. Header `access_token` foi alterado para `Authorization` (commit 1156dfe) e depois revertido de volta para `access_token` (commit cbc09e4). A mensagem do reverso diz "Asaas usa header access_token (nao Authorization) — revertido". Porém a documentação oficial Asaas v3 usa `access_token` como nome do header (não `Authorization`). O estado atual (`access_token`) está CORRETO.
2. Outros bugs potenciais: error handling para "duplicate customer" pode falhar se a mensagem de erro do Asaas não contiver "invalid", "já", "already" ou "duplicate" — depende da API v3 retornar esses termos.
3. `createBoletoPayment` para parcelas passa `installmentCount + totalValue` mas não passa `installmentValue` — pode ser problema se Asaas exigir um dos dois.

**Padrão correto de autenticação Asaas v3:**
```typescript
// CORRETO — access_token no header (não Authorization)
headers: {
  "Content-Type": "application/json",
  access_token: config.apiKey,
}
```

**Verificação de integração sem credenciais reais:**
- Usar sandbox Asaas (ASAAS_ENV=sandbox) com chave de teste
- Testar fluxo: getOrCreateCustomer → createBoletoPayment → verificar boletoUrl no banco

### Domínio 2: IA em Produção

**O que existe:**
- `src/lib/ai.ts` — `runAi` e `runAiWithActions` com suporte a gemini, openai, litellm
- Config model: `geminiKey`, `openaiKey`, `litellmUrl`, `litellmKey`, `litellmModel`, `aiProvider`
- Fallback: env vars `GOOGLE_GENERATIVE_AI_API_KEY`, `OPENAI_API_KEY`, `LITELLM_URL`

**Problemas identificados:**
1. Nenhuma validação de env vars no build ou startup — sem `@t3-oss/env-nextjs` ou equivalente
2. `SESSION_SECRET` usa `"dev-secret"` como fallback — em produção isso é uma vulnerabilidade se a var não estiver configurada
3. `.env.example` existe mas não há checklist de "o que você PRECISA configurar para produção funcionar"
4. O `docker-compose.yml` tem `SESSION_SECRET: change-me` hardcoded — aceitável para dev, mas sinaliza que falta enforcement

**Padrão recomendado para env vars em Next.js 15:**
```typescript
// src/env.ts — usando zod para validação de runtime
import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  SESSION_SECRET: z.string().min(32, "SESSION_SECRET precisa ter mínimo 32 chars"),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  // Opcionais
  ASAAS_API_KEY: z.string().optional(),
  ASAAS_ENV: z.enum(["sandbox", "production"]).default("sandbox"),
});

export const env = envSchema.parse(process.env);
```

### Domínio 3: Segurança e Secrets

**Problemas identificados (confirmados via código):**

1. **SESSION_SECRET fallback inseguro:**
   ```typescript
   // src/lib/session.ts linha 4
   const secret = new TextEncoder().encode(process.env.SESSION_SECRET || "dev-secret");
   // src/middleware.ts linha 4
   const secret = new TextEncoder().encode(process.env.SESSION_SECRET || "dev-secret");
   ```
   Se `SESSION_SECRET` não estiver definido em produção, todos os tokens JWT são assinados com `"dev-secret"` — qualquer pessoa pode forjar tokens.

2. **Admin backfill-estoque sem autenticação:**
   `src/app/api/admin/backfill-estoque/route.ts` — não chama `getSession()` nem `requireAdmin()`. Qualquer request GET pode triggerar backfill de estoque.

3. **Cron routes públicas no middleware:**
   O middleware libera `"/api/cron"` completamente. Cada cron route usa `CRON_SECRET` individualmente (cleanup-uploads faz isso corretamente), mas `aniversario`, `parcela-vencida`, etc. precisam ser verificados.

4. **`requireAdmin()` retorna boolean, não redireciona:**
   ```typescript
   // src/lib/guards.ts
   export async function requireAdmin() {
     const session = await getSession();
     if (!session || session.role !== "admin") return false;
     return true;
   }
   ```
   Chamadores podem ignorar o retorno. Padrão mais seguro seria `throw` ou retornar a session completa.

**Padrão correto de guard em Server Actions/Route Handlers:**
```typescript
// Padrão robusto — lança exceção em vez de retornar boolean
export async function requireAdminSession() {
  const session = await getSession();
  if (!session) throw new Error("Não autenticado.");
  if (session.role !== "admin") throw new Error("Acesso negado.");
  return session;
}
```

### Domínio 4: Cobertura de Testes

**Estado atual:**
- `tests/venda-rapida-dropdown.spec.ts` — 1 arquivo Playwright, sem `playwright.config.ts`
- Sem unit tests (zero arquivos `.test.ts` no projeto, exceto `node_modules`)
- `package.json` não tem script `test`
- CI: sem passo de teste no workflow (arquivos CI não verificados, mas não há Jest/Vitest config)

**Estratégia recomendada — pragmática para este projeto:**

Para um sistema de PDV com Next.js App Router, as áreas de maior valor para testes são:
1. **Lógica financeira pura** — `src/lib/finance.ts`, cálculo de margem, valorTotal
2. **Asaas helper functions** — `getAsaasConfig`, parsing de erros
3. **Session/auth** — `signReciboId`, `verifyReciboSig`
4. **Smoke tests E2E** — login, venda rápida básica

**Vitest é preferível a Jest para Next.js 15** — integra melhor com ESM, sem necessidade de transform config complexa.

**Playwright config mínimo necessário:**
```typescript
// playwright.config.ts
import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./tests",
  use: { baseURL: "http://localhost:3008" },
  webServer: { command: "npm run dev", url: "http://localhost:3008", reuseExistingServer: true },
});
```

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Env var validation | Custom if/throw checks | zod + schema no startup | Edge cases (tipo errado, ausente em produção) |
| JWT signing | Custom HMAC | jose (já em uso) | Já funciona; não duplicar |
| API mocking em testes | Servidor fake manual | msw v2 | Intercepta fetch nativo sem modificar código |
| Test runner | Scripts manuais | vitest para unit, playwright para E2E | Standard ecosystem |

**Key insight:** Neste projeto, o maior risco não é falta de abstração mas sim falta de garantias em runtime — secrets com fallback inseguro são mais perigosos que código não testado.

---

## Common Pitfalls

### Pitfall 1: Asaas "duplicate customer" error silencioso
**What goes wrong:** `getOrCreateCustomer` captura erros que contêm "invalid", "já", "already", "duplicate" — mas o Asaas v3 pode retornar `{"errors":[{"code":"invalid_action","description":"CPF/CNPJ já cadastrado para outro cliente"}]}`. A string "já" está presente em pt-BR mas pode não estar se o Asaas retornar em inglês.
**Why it happens:** Matching de substring em mensagem de erro localizada.
**How to avoid:** Verificar pelo `code` do erro além da `description`.
**Warning signs:** Boleto falha com erro "Asaas API error: 400" sem mensagem clara.

### Pitfall 2: SESSION_SECRET não configurado em produção
**What goes wrong:** Todos os JWTs são assinados com "dev-secret". Attacker pode criar token admin válido.
**Why it happens:** Fallback conveniente para dev foi copiado para prod sem enforcement.
**How to avoid:** Fail-fast se `NODE_ENV === "production"` e `SESSION_SECRET` não estiver definido.
**Warning signs:** Prod funciona sem SESSION_SECRET configurado — isso é o sintoma do problema.

### Pitfall 3: Playwright spec sem config
**What goes wrong:** `npx playwright test` sem `playwright.config.ts` usa defaults que podem não corresponder ao ambiente do projeto (porta, browser, timeout).
**Why it happens:** Config foi esquecida quando o spec foi criado.
**How to avoid:** Criar `playwright.config.ts` mínimo antes de rodar os testes.
**Warning signs:** Testes falham com "browserType.launch: Executable doesn't exist" ou conectam na porta errada.

### Pitfall 4: npm install falha no projeto
**What goes wrong:** `npm install` falha por permissões em `node_modules` (root:root).
**Why it happens:** Ambiente de desenvolvimento com diretório de projeto pertencente a root.
**How to avoid:** Verificar se pacotes já existem em node_modules antes de propor instalação. Usar `sudo npm install` apenas quando necessário. Não adicionar dependências desnecessárias.
**Warning signs:** Qualquer `npm install` sem sudo falha com EACCES.

### Pitfall 5: `requireAdmin()` retorno ignorado
**What goes wrong:** Server Actions que chamam `requireAdmin()` mas não verificam o retorno `false` continuam executando.
**Why it happens:** A função retorna boolean em vez de lançar exceção.
**How to avoid:** Auditar todos os callers de `requireAdmin()` e garantir `if (!isAdmin) return { error: "..." }`.

---

## Code Examples

### Env validation fail-fast (zod)
```typescript
// src/env.ts
// Source: zod docs + Next.js 15 convention
import { z } from "zod";

const schema = z.object({
  DATABASE_URL: z.string().min(1),
  SESSION_SECRET: z.string().min(32),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
});

// Throws at startup if invalid — melhor que falhar silenciosamente em produção
export const env = schema.parse(process.env);
```

### Session fail-fast em produção
```typescript
// src/lib/session.ts — padrão seguro
const rawSecret = process.env.SESSION_SECRET;
if (!rawSecret || rawSecret === "dev-secret") {
  if (process.env.NODE_ENV === "production") {
    throw new Error("SESSION_SECRET não configurado em produção.");
  }
}
const secret = new TextEncoder().encode(rawSecret || "dev-secret");
```

### Guard que lança em vez de retornar boolean
```typescript
// src/lib/guards.ts — versão segura
export async function requireAdminOrThrow() {
  const session = await getSession();
  if (!session) throw new Error("Não autenticado.");
  if (session.role !== "admin") throw new Error("Acesso negado.");
  return session; // retorna session para uso do caller
}
```

### Vitest config mínima para Next.js 15
```typescript
// vitest.config.ts
import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    environment: "node",
    globals: true,
  },
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
});
```

### Teste unitário de lógica de assinatura de recibo
```typescript
// tests/unit/recibo-url.test.ts
import { signReciboId, verifyReciboSig } from "@/lib/recibo-url";
import { describe, it, expect } from "vitest";

describe("recibo-url", () => {
  it("sig gerada é válida", () => {
    const sig = signReciboId(42);
    expect(verifyReciboSig("42", sig)).toBe(true);
  });
  it("sig inválida rejeitada", () => {
    expect(verifyReciboSig("42", "wrong")).toBe(false);
  });
});
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `Authorization` header Asaas | `access_token` header (revertido) | Mar 2026 | Correto — Asaas v3 usa access_token |
| Jest para Next.js | Vitest (melhor ESM support) | 2023+ | Menos config, mais rápido |
| `.env.local` manual | Validação com zod no startup | Melhor prática atual | Fail-fast > erro silencioso |

**Deprecated/outdated:**
- Playwright sem `playwright.config.ts`: testes existem mas não têm configuração adequada para rodar no projeto
- `requireAdmin()` retornando boolean: padrão frágil, preferir throw/return session

---

## Open Questions

1. **Asaas v3 — código de erro para CPF duplicado**
   - What we know: A API retorna JSON `{errors: [{code, description}]}`
   - What's unclear: Qual o `code` exato para "CPF já cadastrado" em v3
   - Recommendation: Verificar na documentação https://docs.asaas.com/reference ou no sandbox com um caso de teste real

2. **Instalação de vitest/playwright**
   - What we know: `npm install` falha por permissões; pacotes podem já estar presentes como transitive deps
   - What's unclear: Se vitest e @playwright/test estão disponíveis em node_modules já
   - Recommendation: Plan deve verificar com `ls node_modules/vitest` ANTES de propor instalação via sudo

3. **Cron routes sem autenticação**
   - What we know: `cleanup-uploads` verifica CRON_SECRET; outros cron routes não verificados
   - What's unclear: Se os outros cron routes (aniversario, parcela-vencida, etc.) têm proteção
   - Recommendation: Auditar todos os routes em `/api/cron/` no plan de segurança

4. **Asaas parcelamento — installmentValue vs totalValue**
   - What we know: `createBoletoPayment` passa `installmentCount + totalValue`
   - What's unclear: Se Asaas v3 exige `installmentValue` ou aceita `totalValue` para calcular
   - Recommendation: Testar no sandbox com venda parcelada

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Playwright (E2E) — presente em tests/; Vitest (unit) — a adicionar |
| Config file | `playwright.config.ts` — ausente (Wave 0), `vitest.config.ts` — ausente (Wave 0) |
| Quick run command | `npx vitest run tests/unit/ --reporter=verbose` |
| Full suite command | `npx vitest run && npx playwright test` |

### Phase Requirements → Test Map

Esta fase não tem IDs de requirement formais (TBD no roadmap). Mapeando por área funcional:

| Área | Behavior | Test Type | Automated Command | File Exists? |
|------|----------|-----------|-------------------|-------------|
| Asaas config | getAsaasConfig retorna null quando apiKey ausente | unit | `npx vitest run tests/unit/asaas.test.ts -t "config"` | Wave 0 |
| Asaas config | getAsaasConfig usa env var como fallback | unit | `npx vitest run tests/unit/asaas.test.ts -t "env fallback"` | Wave 0 |
| Segurança | verifyReciboSig rejeita sig inválida | unit | `npx vitest run tests/unit/recibo-url.test.ts` | Wave 0 |
| Segurança | Middleware bloqueia /api/* sem sessão | unit | `npx vitest run tests/unit/middleware.test.ts` | Wave 0 |
| Segurança | Admin backfill exige autenticação | smoke manual | Verificação de code review | N/A |
| IA config | runAi retorna erro legível quando provider não configurado | unit | `npx vitest run tests/unit/ai-config.test.ts` | Wave 0 |
| E2E | Login funciona | e2e | `npx playwright test tests/auth.spec.ts` | Wave 0 |

### Sampling Rate
- **Per task commit:** `npx vitest run tests/unit/ --reporter=verbose` (< 10s)
- **Per wave merge:** `npx vitest run` (todos os unit tests)
- **Phase gate:** Full suite green antes de `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `vitest.config.ts` — configuração do test runner com alias `@`
- [ ] `playwright.config.ts` — config mínima para porta 3008
- [ ] `tests/unit/asaas.test.ts` — testes de `getAsaasConfig`, parse de erros
- [ ] `tests/unit/recibo-url.test.ts` — testes de `signReciboId`, `verifyReciboSig`
- [ ] `tests/unit/ai-config.test.ts` — testes de fallback de provider IA
- [ ] Framework install: verificar `ls node_modules/vitest` — se ausente, `sudo npm install -D vitest`

---

## Sources

### Primary (HIGH confidence)
- Leitura direta do código-fonte: `src/lib/asaas.ts`, `src/lib/session.ts`, `src/middleware.ts`, `src/lib/guards.ts`
- `git log --oneline` — histórico de commits confirmando reversão do header Asaas
- `.env.example` — documentação oficial do projeto sobre variáveis de ambiente
- `docker-compose.yml` — configuração de infra de desenvolvimento
- `prisma/schema.prisma` — Config model com campos de integração

### Secondary (MEDIUM confidence)
- `playwright.config.ts` ausente verificado via bash — confirmado sem configuração
- Padrão de vitest + alias para Next.js — amplamente documentado no ecossistema
- Zod env validation — padrão estabelecido para Next.js App Router (t3-env usa essa abordagem)

### Tertiary (LOW confidence)
- Comportamento exato da API Asaas v3 para CPF duplicado — não verificado via docs oficiais nesta sessão; baseado em leitura do código de error handling existente

---

## Metadata

**Confidence breakdown:**
- Asaas estado atual: HIGH — lido diretamente do código + git log
- Segurança (SESSION_SECRET, guards): HIGH — lido diretamente do código
- Arquitetura de testes: HIGH — ausência de config confirmada diretamente
- Asaas comportamento da API em edge cases: LOW — não verificado na documentação oficial
- Instalação de novos pacotes (vitest): MEDIUM — restrição de permissões documentada no CLAUDE.md, mas não testada nesta sessão

**Research date:** 2026-03-30
**Valid until:** 2026-04-30 (stack estável — Asaas v3, Next.js 15)
