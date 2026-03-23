---
phase: quick-260323-fwq
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - src/middleware.ts
autonomous: true
requirements:
  - FWQ-CATALOGO-01
must_haves:
  truths:
    - "O link /catalogo (web) abre sem autenticacao e mostra os produtos"
    - "O link /api/catalogo (PDF) pode ser aberto sem sessao ativa (ex: WhatsApp)"
  artifacts:
    - path: "src/middleware.ts"
      provides: "Rotas publicas corretamente liberadas"
      contains: "/api/catalogo"
  key_links:
    - from: "src/middleware.ts"
      to: "/api/catalogo"
      via: "PUBLIC_API_PATHS"
      pattern: "PUBLIC_API_PATHS.*api/catalogo"
---

<objective>
Corrigir o link do catalogo que nao funciona ao ser acessado fora do sistema (ex: compartilhado no WhatsApp).

Purpose: O endpoint /api/catalogo gera o PDF do catalogo de produtos. Ele e protegido pelo middleware de autenticacao e retorna 401 quando acessado sem sessao ativa — o que quebra o compartilhamento externo via IA / WhatsApp.

Output: Middleware atualizado para liberar /api/catalogo como rota publica.
</objective>

<execution_context>
@/home/claudeuser/.claude/get-shit-done/workflows/execute-plan.md
@/home/claudeuser/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md

<!-- Contrato relevante: middleware.ts -->
<!-- PUBLIC_API_PATHS atual:
  "/api/auth/login",
  "/api/auth/logout",
  "/api/cron",
  "/api/assinatura",
  "/api/webhooks"
-->
<!-- Falta: "/api/catalogo" -->
</context>

<tasks>

<task type="auto">
  <name>Task 1: Liberar /api/catalogo no middleware como rota publica</name>
  <files>src/middleware.ts</files>
  <action>
    Adicionar "/api/catalogo" ao array PUBLIC_API_PATHS em src/middleware.ts.

    O array atual e:
    ```
    const PUBLIC_API_PATHS = [
      "/api/auth/login",
      "/api/auth/logout",
      "/api/cron",
      "/api/assinatura",
      "/api/webhooks",
    ];
    ```

    Adicionar "/api/catalogo" na lista para que o PDF do catalogo seja acessivel sem autenticacao (link compartilhavel via WhatsApp / IA).

    IMPORTANTE: Nao alterar mais nada no middleware. A logica isPublicApiPath() ja usa startsWith(p + "/") entao "/api/catalogo" cobre tanto GET /api/catalogo quanto qualquer subpath futuro.
  </action>
  <verify>
    Grep confirma que "/api/catalogo" esta em PUBLIC_API_PATHS:
    grep -n "api/catalogo" /tmp/sitema-bfx/src/middleware.ts
  </verify>
  <done>"/api/catalogo" presente em PUBLIC_API_PATHS; acesso ao PDF do catalogo nao exige sessao autenticada</done>
</task>

</tasks>

<verification>
- grep -n "api/catalogo" src/middleware.ts mostra a entrada na lista PUBLIC_API_PATHS
- A pagina /catalogo (web) ja e acessivel sem auth pois o middleware so cobre /api/*
- O PDF /api/catalogo agora tambem e acessivel sem sessao
</verification>

<success_criteria>
- src/middleware.ts contem "/api/catalogo" em PUBLIC_API_PATHS
- Link copiado pelo LinkCatalogoButton (/catalogo) funciona sem login
- Link gerado pela IA (/api/catalogo) funciona sem login — PDF do catalogo abre normalmente
</success_criteria>

<output>
Apos conclusao, criar `.planning/quick/260323-fwq-o-link-do-cat-logo-n-o-est-funcionando-r/260323-fwq-SUMMARY.md`
</output>
