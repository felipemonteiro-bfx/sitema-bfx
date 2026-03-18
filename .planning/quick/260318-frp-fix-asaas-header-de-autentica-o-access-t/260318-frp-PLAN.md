---
id: 260318-frp
mode: quick-full
description: "fix: Asaas header de autenticação access_token → Authorization (API v3)"
date: 2026-03-18
must_haves:
  truths:
    - "Requisições ao Asaas usam header Authorization (não access_token)"
    - "Todas as chamadas à API Asaas autenticam com sucesso"
  artifacts:
    - "src/lib/asaas.ts — header alterado de access_token para Authorization"
  key_links:
    - "src/lib/asaas.ts:131 — função asaasFetch, linha do header"
---

# Quick Plan 260318-frp

## Task 1 — Corrigir header de autenticação

**files:** `src/lib/asaas.ts`

**action:**
Na função `asaasFetch` (linha ~131), alterar o nome do header de `access_token` para `Authorization`:

```typescript
// Antes
access_token: config.apiKey,

// Depois
Authorization: config.apiKey,
```

**verify:** `npx tsc --noEmit`

**done:**
- `src/lib/asaas.ts` usa `Authorization: config.apiKey` no headers object
- TypeScript compila sem erros
