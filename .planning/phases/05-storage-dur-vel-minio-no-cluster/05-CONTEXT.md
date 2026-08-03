# Phase 5: Storage durável (MinIO no cluster) - Context

**Gathered:** 2026-08-03
**Status:** Ready for planning
**Mode:** Smart discuss (autonomous) — decisões propostas em lote e aceitas pelo André

<domain>
## Phase Boundary

Uploads (logo e imagens de produto) sobrevivem ao ciclo de vida dos pods no Kubernetes —
persistidos em MinIO dentro do cluster, não mais no filesystem efêmero do pod.

**Causa raiz confirmada:** `src/app/api/upload-logo/route.ts` grava com `writeFile` em
`public/uploads/` (filesystem do pod) e guarda o caminho em `Config.logoPath` (Postgres).
`deploy/bfx/app.yaml` não declara volume nem PVC, e o `Dockerfile` só copia o `public` do build.
Todo rollout do ArgoCD recria o pod e apaga os uploads de runtime, deixando caminhos mortos no
banco — o `alt="Logo atual"` quebrado do print do cliente.

Agravante: `src/lib/minio.ts` existe e `src/app/api/produtos/upload/route.ts` já o usa atrás de
`isMinIOConfigured()`, mas **não há MinIO no cluster** (`deploy/bfx/kustomization.yaml` não tem
manifesto de MinIO) e **não há env `MINIO_*`** — então o guard é `false` em produção e as imagens
de produto caem no mesmo disco efêmero.

</domain>

<decisions>
## Implementation Decisions

### Decididas com o André (2026-08-03)

1. **`Config.logoPath` guarda URL absoluta** do MinIO — é o que `uploadToMinIO()` já retorna
   (`${MINIO_PUBLIC_URL}/${bucket}/${key}`). Manter compatibilidade retroativa: valores legados
   no formato `/uploads/...` continuam funcionando enquanto existirem.

2. **Reusar o bucket existente com prefixo `logo/`** em vez de criar um segundo bucket. Evita
   duplicar bucket policy e `ensureBucket`. O bucket vem de `MINIO_BUCKET` (default `produtos`).

3. **Leitores de logo passam a tratar os dois formatos.** Hoje `src/app/api/recibo/route.ts:295`
   e `src/app/api/catalogo/route.ts:75` fazem `readFile(path.join(process.cwd(), "public", logoPath))`
   — isso quebra com URL absoluta. Passar a: se o path for absoluto (`http://` ou `https://`),
   buscar por `fetch` e usar os bytes; senão, manter o `readFile` atual.

4. **Credenciais do MinIO via `ExternalSecret`** apontando para o AWS SSM, seguindo o padrão
   estabelecido no commit `e94fe79` (que tirou `bfx-app-secrets` do git). O manifesto é escrito
   nesta fase; **criar os valores no SSM é ação do André**, fora do alcance do agente.

5. **Cron `cleanup-uploads` continua varrendo apenas o filesystem legado** e não apaga nada no
   MinIO. Motivo: `cleanupMinIOPrefix()` traz aviso explícito de não usar em prefixos de assets
   vivos, e apagar por path antigo arriscaria remover a logo. STO-06 é satisfeito por não-remoção.

### Claude's Discretion

Nomes de arquivos de manifesto, estrutura dos testes, e como fatiar os planos.

</decisions>

<code_context>
## Existing Code Insights

- `src/lib/minio.ts` — client S3 (`@aws-sdk/client-s3`), `forcePathStyle: true`, região fixa
  `us-east-1`. Exporta `uploadToMinIO()`, `isMinIOConfigured()`, `ensureBucket()`,
  `cleanupMinIOPrefix()`. Lê `MINIO_ENDPOINT`, `MINIO_ACCESS_KEY`, `MINIO_SECRET_KEY`,
  `MINIO_BUCKET` (default `produtos`), `MINIO_PUBLIC_URL` (default `http://localhost:9000`).
- `src/app/api/upload-logo/route.ts` — o único writer que **não** usa MinIO. Alvo principal.
- `src/app/api/produtos/upload/route.ts` — já usa `uploadToMinIO` com fallback para disco.
- Leitores de `logoPath`: `src/app/catalogo/page.tsx:39`, `src/app/(app)/configuracoes/page.tsx:232`,
  `src/app/api/catalogo/route.ts:74`, `src/app/api/recibo/route.ts:293`.
- `src/app/api/cron/cleanup-uploads/route.ts` — varre `public/uploads` por referências no banco.
- `docker-compose.yml` — já sobe MinIO em dev (`bfx_minio:/data`, console em 9001), então o
  manifesto do cluster deve espelhar essa configuração.
- `deploy/bfx/kustomization.yaml` — onde o novo manifesto precisa ser registrado.
- `deploy/bfx/externalsecret-app.yaml` — padrão de ExternalSecret a seguir.

</code_context>

<specifics>
## Specific Ideas

- STO-04 pede falha explícita em produção quando o storage não está configurado. Hoje o
  fallback para disco é silencioso e reporta sucesso — é o que mascarou o problema por meses.
  O comportamento novo: em `NODE_ENV=production` sem storage configurado, o upload retorna erro
  (ex.: 503) em vez de gravar em disco efêmero. Em dev, o fallback continua.
- O teste que prova STO-04 não depende de cluster: mockar `isMinIOConfigured() === false` com
  `NODE_ENV=production` e afirmar que a rota devolve erro e que `writeFile` não foi chamado.

</specifics>

<deferred>
## Deferred Ideas

- Migrar as imagens de produto já perdidas — não são recuperáveis (fora de escopo, registrado
  no REQUIREMENTS.md em Out of Scope).
- Reescrever o cron de cleanup para operar sobre o MinIO — adiado; hoje ele não apaga nada lá.
- Trocar MinIO por S3 — decisão explícita do André foi MinIO no cluster.

</deferred>
