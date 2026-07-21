---
phase: quick
plan: 260324-eey
type: execute
wave: 1
depends_on: []
autonomous: true
files_modified:
  # Task 1 — Fix broken references to removed Venda fields
  - src/app/api/assinatura/[token]/route.ts          # DELETE this file entirely
  - src/app/api/assinatura/[token]/comprovante/route.ts  # DELETE this file entirely
  - src/app/api/comprovante/route.ts                 # Rewrite to use Documento model
  - src/app/api/cron/cleanup-uploads/route.ts        # Remove comprovantePdf reference
  - src/app/(app)/venda-rapida/actions.ts            # Remove assinaturaStatus, create Assinatura record
  - src/app/(app)/venda-rapida/page.tsx              # Use assinatura relation
  - src/lib/ai-actions.ts                            # Use Assinatura model instead of venda.assinaturaStatus
  - src/app/(app)/historico/actions.ts               # Remove comprovantePdf reference
  - src/components/edit-venda-form-client.tsx         # Use Documento/Assinatura models
  - src/components/edit-venda-historico-form.tsx      # Use Documento model
  - src/components/historico-vendas-cards.tsx         # Use Documento model
  # Task 2 — Enhance signature API with recibo PDF + MinIO
  - src/app/api/assinatura/route.ts                  # Add generateReciboPdf + signature embedding + MinIO
  # Task 3 — Notification bell + polling
  - src/app/api/notificacoes/route.ts                # NEW: GET (list) + PATCH (mark read)
  - src/components/notification-bell.tsx             # NEW: Bell icon with unread count + dropdown
  - src/app/(app)/layout.tsx                         # Add NotificationBell to header area
  # Task 4 — Improve signature page UX
  - src/app/assinatura/[token]/page.tsx              # Better mobile canvas, success state, loading
requirements: []
must_haves:
  truths:
    - "No runtime errors from removed Venda fields (comprovantePdf, assinaturaStatus, assinaturaEm)"
    - "Client signs on canvas and signed PDF is stored in MinIO (or Documento fallback)"
    - "Notification bell shows unread count and notifies when signature is received"
    - "Signature page works well on mobile devices"
  artifacts:
    - path: "src/app/api/notificacoes/route.ts"
      provides: "Notification CRUD API"
      exports: ["GET", "PATCH"]
    - path: "src/components/notification-bell.tsx"
      provides: "Bell icon with polling and dropdown"
  key_links:
    - from: "src/app/api/assinatura/route.ts POST"
      to: "prisma.notificacao.create"
      via: "Creates notification when signature received"
    - from: "src/components/notification-bell.tsx"
      to: "/api/notificacoes"
      via: "Polls every 15s for unread notifications"
    - from: "src/app/api/assinatura/route.ts POST"
      to: "uploadToMinIO / prisma.documento.create"
      via: "Stores signed PDF in MinIO with Documento ByteA fallback"
---

<objective>
Complete the digital signature receipt system: fix all broken references to removed Venda fields,
enhance the signature API to generate proper recibo PDFs with embedded signatures stored in MinIO,
add a notification bell with polling for real-time awareness, and improve the mobile signature UX.

Purpose: The migration to Assinatura/Documento models left ~10 files referencing removed Venda fields,
causing runtime crashes. The existing signature API creates a blank PDF instead of a proper recibo.
Notifications exist in the DB but have no frontend to display them.

Output: Working end-to-end signature flow with proper PDF, MinIO storage, and notification bell.
</objective>

<context>
@.planning/quick/260324-eey-sistema-de-assinatura-de-recibo-com-link/260324-eey-RESEARCH.md
@prisma/schema.prisma
@src/app/api/assinatura/route.ts
@src/app/api/assinatura/[token]/route.ts
@src/lib/minio.ts
@src/lib/recibo-pdf.ts
@src/app/assinatura/[token]/page.tsx
@src/app/(app)/layout.tsx

<interfaces>
<!-- Prisma models (from schema.prisma) -->
model Assinatura {
  id               Int       @id @default(autoincrement())
  vendaId          Int       @unique @map("venda_id")
  assinaturaStatus String?   @map("assinatura_status") // pendente | assinado | expirado
  assinaturaEm     DateTime? @map("assinatura_em")
  venda            Venda     @relation(fields: [vendaId], references: [id])
}

model Documento {
  id           Int      @id @default(autoincrement())
  vendaId      Int?     @map("venda_id")
  tipo         String   // comprovante_assinatura, nfe, contrato, etc.
  mimeType     String   @default("application/pdf")
  conteudo     Bytes    @db.ByteA
  tamanhoBytes Int      @map("tamanho_bytes")
  criadoEm     DateTime @default(now())
  venda        Venda?   @relation(fields: [vendaId], references: [id], onDelete: Cascade)
}

model Notificacao {
  id        Int      @id @default(autoincrement())
  mensagem  String
  lida      Boolean  @default(false)
  criadoEm  DateTime @default(now())
  link      String?
}

<!-- Venda has these relations (NOT direct fields anymore): -->
Venda.assinatura    -> Assinatura? (one-to-one)
Venda.documentos    -> Documento[] (one-to-many)
Venda.assinaturaToken -> String? (still on Venda, used for link)

<!-- MinIO (from src/lib/minio.ts) -->
uploadToMinIO(buffer: Buffer, filename: string, contentType: string): Promise<string | null>
isMinIOConfigured(): boolean

<!-- Recibo PDF (from src/lib/recibo-pdf.ts) -->
generateReciboPdf(vendaId: number, tipo: "venda" | "autorizacao"): Promise<Uint8Array>
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: Fix all broken references to removed Venda fields</name>
  <files>
    src/app/api/assinatura/[token]/route.ts
    src/app/api/assinatura/[token]/comprovante/route.ts
    src/app/api/comprovante/route.ts
    src/app/api/cron/cleanup-uploads/route.ts
    src/app/(app)/venda-rapida/actions.ts
    src/app/(app)/venda-rapida/page.tsx
    src/lib/ai-actions.ts
    src/app/(app)/historico/actions.ts
    src/components/edit-venda-form-client.tsx
    src/components/edit-venda-historico-form.tsx
    src/components/historico-vendas-cards.tsx
  </files>
  <action>
    This is the CRITICAL bug fix. The migration `20260324144709_add_signature_models` removed
    `comprovantePdf`, `assinaturaStatus`, and `assinaturaEm` from the Venda model, but ~10 files
    still reference them. Fix every one:

    **DELETE entirely (old broken routes superseded by /api/assinatura):**
    - `src/app/api/assinatura/[token]/route.ts` — DELETE file. Its useful logic (generateReciboPdf + embed signature) will be merged into `/api/assinatura/route.ts` in Task 2.
    - `src/app/api/assinatura/[token]/comprovante/route.ts` — DELETE file. Comprovante will be served from Documento model via `/api/comprovante`.

    **Fix `src/app/api/comprovante/route.ts`:**
    - Instead of `venda.comprovantePdf`, query `prisma.documento.findFirst({ where: { vendaId, tipo: 'comprovante_assinatura' } })`.
    - Return the `conteudo` (Bytes) as a PDF response with correct content-type headers.
    - If no Documento found, return 404.

    **Fix `src/app/api/cron/cleanup-uploads/route.ts`:**
    - Remove the `prisma.venda.findMany({ select: { comprovantePdf: true } })` line and any code that references `v.comprovantePdf`.
    - If the only purpose was cleaning up old comprovante files, leave the rest of the cleanup logic intact but skip the venda comprovante refs.

    **Fix `src/app/(app)/venda-rapida/actions.ts` (line ~162):**
    - Remove `assinaturaStatus: descontoEmFolha ? "pendente" : undefined` from the venda create data.
    - AFTER creating the venda (after the `tx.venda.create` call), if `descontoEmFolha` is true, create an Assinatura record:
      ```
      if (descontoEmFolha) {
        await tx.assinatura.create({
          data: { vendaId: vendaCriada.id, assinaturaStatus: 'pendente' }
        });
      }
      ```
    - This goes inside the same transaction (`tx`).

    **Fix `src/app/(app)/venda-rapida/page.tsx` (line ~63):**
    - The `ultima` query uses `prisma.venda.findFirst({ include: { itens: true } })` — add `assinatura: true` to the include.
    - Change `ultima.assinaturaStatus` to `ultima.assinatura?.assinaturaStatus` on line 63.

    **Fix `src/lib/ai-actions.ts` (line ~1231):**
    - The `consultar_assinaturas_pendentes` case queries `venda.assinaturaStatus: "pendente"`.
    - Change to query vendas that have an Assinatura with status pendente:
      ```
      where: {
        descontoEmFolha: true,
        assinatura: { assinaturaStatus: "pendente" },
        vendedor: whereVendedor ? { equals: whereVendedor } : undefined,
      }
      ```
    - Also include `assinatura: true` in the include clause.

    **Fix `src/app/(app)/historico/actions.ts` (line ~86):**
    - Remove `...(comprovantePath ? { comprovantePdf: comprovantePath } : {})` — comprovantes are now in Documento model.

    **Fix `src/components/edit-venda-form-client.tsx`:**
    - Remove `comprovantePdf` and `assinaturaStatus` from the type definition (lines ~42-44).
    - Replace `editVenda.comprovantePdf` rendering with a link to `/api/comprovante?vendaId={id}`.
    - Replace `editVenda.assinaturaStatus` with data from the Assinatura relation (pass it as a prop or fetch it).
    - For simplicity: the parent should pass `assinatura?: { assinaturaStatus: string | null }` as part of the venda data.

    **Fix `src/components/edit-venda-historico-form.tsx`:**
    - Remove `comprovantePdf` from the type definition (line ~45).
    - Replace the comprovantePdf link with a link to `/api/comprovante?vendaId={editVenda.id}`.
    - Only show the link if there is a signed document (check via a `hasDocumento` boolean prop, or always show the link and let the API return 404 if none).

    **Fix `src/components/historico-vendas-cards.tsx`:**
    - Remove `comprovantePdf` from the type definition (line ~48).
    - Replace `venda.comprovantePdf` conditional rendering with a link to `/api/comprovante?vendaId={venda.id}`.
    - Show the comprovante link if the venda has `assinatura?.assinaturaStatus === 'assinado'` (already used on historico/page.tsx line 428).

    **For historico/page.tsx:** The select query at line ~107 already correctly uses `assinatura: { select: { assinaturaStatus: true } }` — this is fine. No changes needed there.
  </action>
  <verify>
    Run `npx tsc --noEmit 2>&1 | head -50` to check for TypeScript errors related to removed fields.
    Grep to confirm zero references: `grep -r "venda\.comprovantePdf\|venda\.assinaturaStatus\|venda\.assinaturaEm" src/ --include="*.ts" --include="*.tsx" | grep -v generated/ | grep -v node_modules` should return empty.
  </verify>
  <done>
    Zero references to `venda.comprovantePdf`, `venda.assinaturaStatus`, or `venda.assinaturaEm` in non-generated source files.
    All files use the Assinatura and Documento models instead.
    Old broken route files (`/api/assinatura/[token]/route.ts` and `comprovante/route.ts`) are deleted.
    TypeScript compiles without errors related to these fields.
  </done>
</task>

<task type="auto">
  <name>Task 2: Enhance signature API with recibo PDF generation + MinIO storage</name>
  <files>
    src/app/api/assinatura/route.ts
  </files>
  <action>
    The current `/api/assinatura` POST creates a blank PDF with just the signature image.
    Enhance it to generate a proper recibo with embedded signature, stored in MinIO.

    **Merge the good logic from the deleted `[token]/route.ts`:**

    In the POST handler, after validating token and checking not already signed:

    1. Generate the full recibo PDF: `const pdfBytes = await generateReciboPdf(venda.id, "autorizacao");`
    2. Load the PDF with pdf-lib: `const pdfDoc = await PDFDocument.load(pdfBytes);`
    3. Embed the signature PNG into the PDF at the signature line area:
       ```
       const signatureBuffer = Buffer.from(signature.split(',')[1], 'base64');
       const pngImage = await pdfDoc.embedPng(signatureBuffer);
       const page = pdfDoc.getPages()[0];
       const centerX = 595 / 2;
       const sigWidth = 150;
       const sigHeight = 50;
       page.drawImage(pngImage, {
         x: centerX - sigWidth / 2,
         y: 70 - sigHeight,  // matches the signature line position in recibo-pdf.ts (signatureY = 70)
         width: sigWidth,
         height: sigHeight,
       });
       ```
    4. Save: `const signedPdfBytes = await pdfDoc.save();`
    5. Try MinIO first, fall back to Documento ByteA:
       ```
       import { uploadToMinIO, isMinIOConfigured } from '@/lib/minio';

       let storageUrl: string | null = null;
       const pdfBuffer = Buffer.from(signedPdfBytes);

       if (isMinIOConfigured()) {
         storageUrl = await uploadToMinIO(
           pdfBuffer,
           `recibos/assinado-${venda.id}-${Date.now()}.pdf`,
           'application/pdf'
         );
       }

       // Always store in Documento (as authoritative copy)
       await prisma.documento.create({
         data: {
           vendaId: venda.id,
           tipo: 'comprovante_assinatura',
           mimeType: 'application/pdf',
           conteudo: pdfBuffer,
           tamanhoBytes: pdfBuffer.length,
         },
       });
       ```
    6. Keep the existing Assinatura upsert and Notificacao creation.
    7. Add `generateReciboPdf` import: `import { generateReciboPdf } from '@/lib/recibo-pdf';`
    8. Add MinIO imports: `import { uploadToMinIO, isMinIOConfigured } from '@/lib/minio';`
    9. Remove the old blank PDF creation code (PDFDocument.create + addPage + drawImage).
    10. Remove unused `rgb, StandardFonts` imports from pdf-lib (only `PDFDocument` needed now).
  </action>
  <verify>
    `npx tsc --noEmit 2>&1 | grep "assinatura/route"` should show no errors.
    The file should import `generateReciboPdf` and `uploadToMinIO`.
  </verify>
  <done>
    POST /api/assinatura generates a full recibo PDF with the client's signature embedded at the signature line,
    uploads to MinIO when configured, always stores a copy in the Documento table,
    updates Assinatura status and creates a Notificacao.
  </done>
</task>

<task type="auto">
  <name>Task 3: Create notification bell component with polling</name>
  <files>
    src/app/api/notificacoes/route.ts
    src/components/notification-bell.tsx
    src/app/(app)/layout.tsx
  </files>
  <action>
    **Create `src/app/api/notificacoes/route.ts`:**

    GET handler:
    - Query `prisma.notificacao.findMany({ where: { lida: false }, orderBy: { criadoEm: 'desc' }, take: 20 })`.
    - Return JSON array of notifications with `{ id, mensagem, lida, criadoEm, link }`.
    - Import prisma from `@/lib/db`.

    PATCH handler:
    - Accept `{ ids: number[] }` in body.
    - Update: `prisma.notificacao.updateMany({ where: { id: { in: ids } }, data: { lida: true } })`.
    - Return `{ ok: true }`.

    **Create `src/components/notification-bell.tsx`:**

    This is a `'use client'` component.

    - State: `notifications` array, `open` boolean for dropdown.
    - useEffect with setInterval polling `/api/notificacoes` every 15 seconds. Also fetch on mount.
    - Render a Bell icon (from lucide-react) with a red badge showing unread count when > 0.
    - On click, toggle a dropdown showing recent notifications (mensagem, time ago, link).
    - Each notification is clickable if it has a `link` field.
    - "Marcar todas como lidas" button that calls PATCH with all notification ids.
    - After marking as read, refetch.
    - Use Tailwind for styling: absolute positioned dropdown, shadow, rounded, max-h with overflow scroll.
    - Use `sonner` toast: when a NEW notification appears (id not seen before), show a toast with `toast.info(notification.mensagem)`.
    - Track seen notification IDs in a useRef Set to avoid duplicate toasts.

    **Update `src/app/(app)/layout.tsx`:**

    - Import `NotificationBell` from `@/components/notification-bell`.
    - Add `<NotificationBell />` next to the `<ThemeToggle />` in TWO places:
      1. Desktop sidebar: In the `SidebarContent` function, add it in the header area near ThemeToggle (line ~112 area).
      2. Mobile header: In the mobile top bar, add it next to `<ThemeToggle />` (line ~71 area).
    - Wrap both in a flex container so they sit side by side: `<div className="flex items-center gap-2"><NotificationBell /><ThemeToggle /></div>`
  </action>
  <verify>
    `npx tsc --noEmit 2>&1 | grep -E "notificac|notification-bell|layout"` should show no errors.
    File exists: `ls src/app/api/notificacoes/route.ts src/components/notification-bell.tsx`
  </verify>
  <done>
    Bell icon appears in both desktop sidebar header and mobile top bar.
    Clicking the bell shows a dropdown with unread notifications.
    Unread count badge shows when notifications exist.
    "Marcar todas como lidas" clears the badge.
    New notifications trigger a sonner toast.
    Polling happens every 15 seconds.
  </done>
</task>

<task type="auto">
  <name>Task 4: Improve signature page mobile UX and canvas</name>
  <files>
    src/app/assinatura/[token]/page.tsx
  </files>
  <action>
    The current signature page has a basic canvas that may be blurry on mobile (CSS-only sizing).
    Improve the UX:

    1. **Fix canvas resolution:** Add a ResizeObserver or explicit width/height to the canvas.
       Use a wrapper div with a ref, and on mount/resize set the canvas element's width/height attributes
       to match the container's clientWidth and a fixed height (200px). Use `canvasProps` with
       `width` and `height` as numbers, and also `style: { width: '100%', height: '200px' }` for CSS.
       Better approach: use a `useEffect` with a ref to the wrapper div:
       ```
       const wrapperRef = useRef<HTMLDivElement>(null);
       const [canvasSize, setCanvasSize] = useState({ width: 300, height: 200 });

       useEffect(() => {
         if (wrapperRef.current) {
           const w = wrapperRef.current.clientWidth;
           setCanvasSize({ width: w, height: 200 });
         }
       }, []);
       ```
       Then: `<SignatureCanvas canvasProps={{ width: canvasSize.width, height: canvasSize.height, className: 'rounded-md border' }} />`

    2. **Better success state:** Instead of plain green text, show a Card with a CheckCircle2 icon,
       "Assinatura enviada com sucesso!" message, and a note "Voce pode fechar esta pagina."

    3. **Better error state:** Show error in a Card with AlertCircle icon.

    4. **Better loading state:** Use a simple spinner or "Carregando dados da venda..." with a subtle animation.

    5. **Show venda total:** Add the total value to the venda details display.
       Calculate from itens: `venda.itens.reduce((s, i) => s.subtotal, 0)` + `(venda.valorFrete || 0)`.
       Display as "Total: R$ X.XXX,XX".

    6. **Disable "Assinar e Enviar" button** when canvas is empty (use sigCanvas.current?.isEmpty()).
       Add a check in handleSign and also disable the button visually.

    7. **Mobile-friendly layout:** Ensure padding works on small screens, use `max-w-lg mx-auto` for the card.
       Add `touch-action: none` to the canvas wrapper to prevent scroll while signing.

    8. **Import CheckCircle2 and AlertCircle** from lucide-react.
  </action>
  <verify>
    `npx tsc --noEmit 2>&1 | grep "assinatura"` should show no errors for the page file.
  </verify>
  <done>
    Signature page renders correctly on mobile with proper canvas resolution.
    Success and error states show styled cards with icons.
    Canvas prevents page scroll during signing (touch-action: none).
    Button is disabled when canvas is empty.
    Venda total is displayed.
  </done>
</task>

</tasks>

<verification>
1. `grep -r "venda\.comprovantePdf\|venda\.assinaturaStatus\|venda\.assinaturaEm" src/ --include="*.ts" --include="*.tsx" | grep -v generated/ | grep -v node_modules` returns empty
2. `npx tsc --noEmit` compiles without errors
3. `ls src/app/api/assinatura/[token]/route.ts 2>&1` returns "No such file" (deleted)
4. `ls src/app/api/notificacoes/route.ts src/components/notification-bell.tsx` both exist
5. `grep "generateReciboPdf" src/app/api/assinatura/route.ts` confirms recibo generation is wired
6. `grep "uploadToMinIO" src/app/api/assinatura/route.ts` confirms MinIO storage is wired
7. `grep "NotificationBell" src/app/(app)/layout.tsx` confirms bell is in layout
</verification>

<success_criteria>
- Zero runtime errors from removed Venda fields across all pages
- Signature submission generates a proper recibo PDF (not blank) with signature embedded
- Signed PDF stored in MinIO when configured, always in Documento table
- Notification bell visible in app header with unread count
- Notifications polled every 15 seconds with toast for new ones
- Signature page works smoothly on mobile with proper canvas resolution
- Creating a venda with descontoEmFolha creates an Assinatura record with "pendente" status
</success_criteria>

<output>
After completion, commit all changes and push to `nextjs-migration` branch.
Then create `.planning/quick/260324-eey-sistema-de-assinatura-de-recibo-com-link/260324-eey-SUMMARY.md`
</output>
