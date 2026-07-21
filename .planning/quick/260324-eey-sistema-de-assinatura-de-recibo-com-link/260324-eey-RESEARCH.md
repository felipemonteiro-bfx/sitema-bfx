# Quick Task: Sistema de Assinatura de Recibo - Research

**Researched:** 2026-03-24
**Domain:** Digital signature capture, PDF generation, real-time notifications, MinIO storage
**Confidence:** HIGH

## Summary

Significant code already exists for digital signature capture and PDF generation. The core flow (client receives link, signs on canvas, system saves) is partially implemented across TWO competing API implementations that need consolidation. The Prisma schema has been migrated to use separate `Assinatura` and `Documento` models, but many files still reference the OLD `venda.comprovantePdf` and `venda.assinaturaStatus` fields that were removed. MinIO integration (`src/lib/minio.ts`) is fully built and working for product images.

**Primary recommendation:** Consolidate the two assinatura API routes, fix all references to removed Venda fields, add SSE-based real-time notifications, and extend MinIO to store signed PDFs instead of local disk.

## Existing Code Inventory (CRITICAL)

### What Already Works
| Component | Location | Status |
|-----------|----------|--------|
| Signature canvas page | `src/app/assinatura/[token]/page.tsx` | Working - uses `react-signature-canvas` |
| API GET (load venda by token) | `src/app/api/assinatura/route.ts` | Working - uses new Assinatura model |
| API POST (save signature + PDF) | `src/app/api/assinatura/route.ts` | Working - creates Documento + Notificacao |
| Prisma models | `Assinatura`, `Notificacao`, `Documento` | Migrated and ready |
| MinIO client | `src/lib/minio.ts` | Working - `uploadToMinIO()`, `isMinIOConfigured()` |
| Recibo PDF generator | `src/lib/recibo-pdf.ts` | Working - `generateReciboPdf()` with pdf-lib |
| Token field on Venda | `venda.assinaturaToken` | In schema, unique |

### What Is BROKEN (references removed fields)
| File | Problem |
|------|---------|
| `src/app/api/assinatura/[token]/route.ts` | References `venda.comprovantePdf`, `venda.assinaturaStatus`, `venda.assinaturaEm` - ALL REMOVED from Venda model |
| `src/app/api/assinatura/[token]/comprovante/route.ts` | Same - references `venda.comprovantePdf`, `venda.assinaturaStatus` |
| `src/app/api/comprovante/route.ts` | References `venda.comprovantePdf` |
| `src/app/api/cron/cleanup-uploads/route.ts` | References `venda.comprovantePdf` |
| `src/app/(app)/venda-rapida/actions.ts` | Sets `assinaturaStatus` on Venda (removed field) |
| `src/app/(app)/venda-rapida/page.tsx` | Reads `ultima.assinaturaStatus` from Venda |
| `src/lib/ai-actions.ts` | Sets `assinaturaStatus: "pendente"` on Venda |
| `src/app/(app)/historico/actions.ts` | References `comprovantePdf` |
| `src/components/edit-venda-form-client.tsx` | Renders `comprovantePdf` and `assinaturaStatus` |
| `src/components/edit-venda-historico-form.tsx` | Renders `comprovantePdf` |
| `src/components/historico-vendas-cards.tsx` | Renders `comprovantePdf` |

**Key insight:** The migration `20260324144709_add_signature_models` moved `assinaturaStatus`, `assinaturaEm`, and `comprovantePdf` OUT of `vendas` table into the `Assinatura` and `Documento` models, but ~10+ files still reference the old fields. These will cause runtime errors.

### TWO Competing API Routes
1. **`/api/assinatura` (route.ts)** - NEWER, correct approach: uses `Assinatura` model + `Documento` model + `Notificacao`
2. **`/api/assinatura/[token]` (route.ts)** - OLDER, broken: writes to `venda.comprovantePdf` etc. BUT has better logic (uses `generateReciboPdf` to create proper recibo, embeds signature into it)

**Recommendation:** Keep the logic from `[token]/route.ts` (proper recibo generation + signature embedding) but rewrite to use the new models (`Assinatura` + `Documento`).

## Standard Stack

All libraries are ALREADY INSTALLED. No new packages needed.

| Library | Version | Purpose | Status |
|---------|---------|---------|--------|
| `react-signature-canvas` | ^1.1.0-alpha.2 | Touch/mouse signature capture | Installed, in use |
| `pdf-lib` | ^1.17.1 | PDF creation and signature embedding | Installed, in use |
| `@aws-sdk/client-s3` | (installed) | MinIO/S3 object storage | Installed, wrapper at `src/lib/minio.ts` |
| `sonner` | (installed) | Toast notifications on frontend | Installed |

**No `npm install` needed.** Per CLAUDE.md, `npm install` fails due to permissions.

## Architecture Patterns

### Recommended Approach: SSE for Real-Time Notifications

For real-time notification delivery to the web dashboard, **Server-Sent Events (SSE)** is the simplest approach in Next.js App Router:

- No WebSocket server needed (Vercel/serverless compatible)
- Native browser `EventSource` API
- One-directional (server to client) which is exactly what notifications need
- Works with App Router route handlers via `ReadableStream`

**Pattern:**
```typescript
// src/app/api/notifications/stream/route.ts
export async function GET() {
  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();
      const interval = setInterval(async () => {
        const unread = await prisma.notificacao.findMany({
          where: { lida: false },
          orderBy: { criadoEm: 'desc' },
          take: 10,
        });
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify(unread)}\n\n`)
        );
      }, 5000); // poll DB every 5s
      // cleanup on close
    },
  });
  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
```

**Alternative (simpler):** Polling with `setInterval` on the client every 10-15 seconds. Less elegant but zero new API routes. Given this is a small business app, polling is acceptable.

### PDF + Signature Flow (Correct)

The `[token]/route.ts` has the RIGHT approach but wrong models:

1. Load venda by token
2. Generate full recibo PDF via `generateReciboPdf(vendaId, "autorizacao")`
3. Embed signature PNG into the PDF at the signature line
4. Save to MinIO (or Documento model as bytes)
5. Update Assinatura record status
6. Create Notificacao

### MinIO Storage for PDFs

`src/lib/minio.ts` already handles:
- Client creation from env vars (`MINIO_ENDPOINT`, `MINIO_ACCESS_KEY`, `MINIO_SECRET_KEY`)
- Bucket creation with public read policy
- Upload via `uploadToMinIO(buffer, filename, contentType)`
- Returns public URL

**For signed PDFs:** Use the same pattern but with a different bucket or key prefix:
```typescript
const url = await uploadToMinIO(
  Buffer.from(signedPdfBytes),
  `recibos/assinado-${vendaId}-${Date.now()}.pdf`,
  'application/pdf'
);
```

**Fallback:** If MinIO is not configured, store PDF bytes in the `Documento` model (ByteA in Postgres) -- this is what `/api/assinatura/route.ts` already does.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead |
|---------|-------------|-------------|
| Signature capture | Custom canvas touch handling | `react-signature-canvas` (already installed) |
| PDF generation | Raw PDF byte manipulation | `pdf-lib` + `generateReciboPdf()` (already built) |
| S3/MinIO upload | Custom HTTP to MinIO API | `src/lib/minio.ts` wrapper (already built) |
| Toast notifications | Custom notification UI | `sonner` toast (already installed) |

## Common Pitfalls

### Pitfall 1: Broken References to Removed Venda Fields
**What goes wrong:** Runtime errors on any page/API that references `venda.comprovantePdf`, `venda.assinaturaStatus`, or `venda.assinaturaEm` -- these fields were removed by migration.
**How to avoid:** Every file listed in the "BROKEN" table above must be updated to use the `Assinatura` relation (`venda.assinatura.assinaturaStatus`) and `Documento` model instead.

### Pitfall 2: Mobile Canvas Sizing
**What goes wrong:** `react-signature-canvas` with CSS classes (`className: 'w-full h-48'`) does NOT properly set the canvas internal resolution -- the canvas element's `width`/`height` attributes stay at defaults (300x150), causing blurry signatures on high-DPI screens.
**How to avoid:** Set explicit `width` and `height` on the canvas via `canvasProps` or use a `ResizeObserver` to sync CSS size with canvas resolution. The current implementation uses only CSS classes which may cause issues.

### Pitfall 3: Dual API Routes Conflict
**What goes wrong:** Two routes handle signature submission (`/api/assinatura` POST and `/api/assinatura/[token]` POST). The page at `src/app/assinatura/[token]/page.tsx` posts to `/api/assinatura` (the non-token route).
**How to avoid:** Consolidate into one route. Remove the broken `[token]` API or update it to use new models.

### Pitfall 4: PDF Stored as ByteA in Postgres
**What goes wrong:** Storing PDFs as `Bytes` (ByteA) in the Documento table works but bloats the database. For a few hundred signatures it's fine, but at scale it's problematic.
**How to avoid:** Prefer MinIO when configured, fall back to Documento ByteA. Add a `storageUrl` field to Documento if using external storage.

### Pitfall 5: SSE Connection Limits
**What goes wrong:** Browsers limit concurrent connections per domain (~6 for HTTP/1.1). If multiple tabs are open, SSE connections can exhaust the limit.
**How to avoid:** Use a single SSE connection with `BroadcastChannel` to share across tabs, or simply use polling (simpler for small app).

## Key Decisions for Implementation

1. **Consolidate to ONE API route** for signature submission. The `/api/assinatura` route (using new models) should be the canonical one, enhanced with recibo generation logic from `[token]/route.ts`.

2. **Fix all broken references** to removed Venda fields. This is the MOST IMPORTANT part of this task -- without it, many pages will crash at runtime.

3. **Real-time notifications:** Start with simple polling (a `useEffect` + `setInterval` fetching `/api/notificacoes`). SSE can be added later if needed. Polling every 15s is fine for a small business app.

4. **Storage strategy:** MinIO when configured, Documento ByteA as fallback. The current `/api/assinatura/route.ts` already does the ByteA fallback correctly.

5. **Notification bell component:** Add a bell icon in the app header that shows unread count and a dropdown with recent notifications. Use the existing `Notificacao` model.

## Open Questions

1. **Should we create an Assinatura record when the venda is created (status "pendente") or only when signed?**
   - Current `/api/assinatura/route.ts` uses `upsert` -- creates on sign if not exists
   - `venda-rapida/actions.ts` tries to set `assinaturaStatus: "pendente"` on Venda (broken) -- this logic needs to create an Assinatura record instead
   - Recommendation: Create Assinatura with status "pendente" when venda is created with `boleto=true`/`descontoEmFolha=true`

2. **SMTP email for future:** Out of scope for now per task description ("futuramente").

## Sources

- Codebase analysis (all findings from direct code inspection) -- HIGH confidence
- `react-signature-canvas` already in `package.json` at ^1.1.0-alpha.2
- `pdf-lib` already in `package.json` at ^1.17.1
- `@aws-sdk/client-s3` already in `package.json`
- Prisma migration `20260324144709_add_signature_models` confirms field removal

## Metadata

**Confidence breakdown:**
- Existing code state: HIGH - direct codebase inspection
- Architecture: HIGH - building on existing patterns
- Pitfalls: HIGH - identified from code analysis (broken references are factual)

**Research date:** 2026-03-24
**Valid until:** 2026-04-24
