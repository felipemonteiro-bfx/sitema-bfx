---
phase: quick
plan: 260318-fhz
type: execute
wave: 1
depends_on: []
files_modified:
  - src/app/api/recibo/route.ts
  - src/lib/recibo-pdf.ts
autonomous: true
requirements: [QUICK-BOLETO-ASSINATURA]

must_haves:
  truths:
    - "PDF de venda com boleto exibe bloco de assinatura do cliente"
    - "PDF de venda com desconto em folha continua exibindo bloco de assinatura do cliente"
    - "PDF de venda sem boleto e sem desconto em folha NAO exibe bloco de assinatura"
    - "Altura da pagina PDF se ajusta corretamente quando assinatura e omitida"
  artifacts:
    - path: "src/app/api/recibo/route.ts"
      provides: "Conditional signature block in main recibo PDF route"
      contains: "vendaBase.boleto || vendaBase.descontoEmFolha"
    - path: "src/lib/recibo-pdf.ts"
      provides: "Conditional signature block in legacy recibo PDF generator"
      contains: "venda.boleto || venda.descontoEmFolha"
  key_links:
    - from: "src/app/api/recibo/route.ts"
      to: "prisma.venda"
      via: "vendaBase.boleto and vendaBase.descontoEmFolha boolean fields"
      pattern: "vendaBase\\.boleto"
    - from: "src/lib/recibo-pdf.ts"
      to: "prisma.venda"
      via: "venda.boleto and venda.descontoEmFolha boolean fields"
      pattern: "venda\\.boleto"
---

<objective>
Make the signature block in the PDF receipt conditional: show it only when the payment method is "boleto" or "desconto em folha", and omit it for regular cash/card sales.

Purpose: Currently both PDF generators always render a signature line at the bottom. For regular sales (cash, card, pix) a signature is unnecessary. Boleto and desconto em folha require client signature as proof of agreement.

Output: Both PDF generators conditionally render the signature block based on payment type.
</objective>

<execution_context>
@/home/claudeuser/.claude/get-shit-done/workflows/execute-plan.md
@/home/claudeuser/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@src/app/api/recibo/route.ts
@src/lib/recibo-pdf.ts
@prisma/schema.prisma

<interfaces>
<!-- Key fields from Prisma Venda model relevant to this task -->
From prisma/schema.prisma:
```prisma
model Venda {
  descontoEmFolha    Boolean   @default(false) @map("desconto_em_folha")
  boleto             Boolean   @default(false) @map("boleto")
}
```

From src/app/api/recibo/route.ts (signature section, lines 569-584):
- Signature is always rendered unconditionally
- Uses `y` cursor position, reduces by 48px gap before signature
- Signature line width: 220px centered at page center
- estimatedH includes 80px for "assinatura + rodape"

From src/lib/recibo-pdf.ts (signature section, lines 340-354):
- Signature is always rendered at fixed y=70
- Page height is calculated without considering signature conditionality
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: Conditionally render signature in main recibo route</name>
  <files>src/app/api/recibo/route.ts</files>
  <action>
In `src/app/api/recibo/route.ts`, make the signature block conditional on boleto or desconto em folha:

1. **Add a boolean flag** after the `vendaBase` query (around line 166):
   ```typescript
   const showAssinatura = vendaBase.boleto || vendaBase.descontoEmFolha;
   ```

2. **Adjust `estimatedH` calculation** (around line 269): Change the fixed `80` for "assinatura + rodape" to be conditional:
   ```typescript
   const assinaturaH = showAssinatura ? 80 : 30; // 30 = just footer
   ```
   Then use `assinaturaH` instead of `80` in the `estimatedH` sum.

3. **Wrap the signature section** (lines 569-584) in a conditional:
   ```typescript
   if (showAssinatura) {
     y -= 48;
     // existing signature code (lines 572-584 unchanged)
     const sigLineW = 220;
     const sigLineX = 595 / 2 - sigLineW / 2;
     page.drawLine({ ... });
     const sigText = "Assinatura do Cliente";
     page.drawText(sigText, { ... });
   }
   ```

   Move the `y -= 48` that is currently on line 569 INSIDE the conditional block so it does not create blank space when there is no signature.

4. **Keep the footer (rodape) section** (lines 587-590) OUTSIDE the conditional -- the footer should always render.

Do NOT change the `tipo === "autorizacao"` logic -- that controls the document title and contract text, not signature visibility. The signature should depend purely on `boleto || descontoEmFolha`.
  </action>
  <verify>
    <automated>cd /tmp/sitema-bfx && npx tsc --noEmit src/app/api/recibo/route.ts 2>&1 | head -20</automated>
  </verify>
  <done>Signature block in recibo route only renders when vendaBase.boleto === true or vendaBase.descontoEmFolha === true. Page height adjusts accordingly. TypeScript compiles without errors.</done>
</task>

<task type="auto">
  <name>Task 2: Conditionally render signature in legacy recibo-pdf.ts</name>
  <files>src/lib/recibo-pdf.ts</files>
  <action>
In `src/lib/recibo-pdf.ts`, apply the same conditional logic:

1. **Add a boolean flag** after the venda query (around line 95):
   ```typescript
   const showAssinatura = venda.boleto || venda.descontoEmFolha;
   ```

2. **Wrap the signature section** (lines 340-354) in a conditional:
   ```typescript
   if (showAssinatura) {
     const signatureY = 70;
     page.drawLine({ ... });
     const signatureText = `Assinatura: ${cliente?.nome || "________________________"}`;
     page.drawText(signatureText, { ... });
   }
   ```

3. **Adjust the footer text position** (line 332-338): When signature is not shown, move the footer text down since there is more room. Change line 332 from fixed `y: 110` to:
   ```typescript
   y: showAssinatura ? 110 : 50,
   ```

This ensures the footer does not float with a big gap when signature is absent.
  </action>
  <verify>
    <automated>cd /tmp/sitema-bfx && npx tsc --noEmit src/lib/recibo-pdf.ts 2>&1 | head -20</automated>
  </verify>
  <done>Signature block in recibo-pdf.ts only renders when venda.boleto === true or venda.descontoEmFolha === true. Footer repositions correctly. TypeScript compiles without errors.</done>
</task>

</tasks>

<verification>
1. TypeScript compilation: `npx tsc --noEmit` passes for both files
2. Manual test: Generate PDF for a sale with `boleto=true` -- should show signature
3. Manual test: Generate PDF for a sale with `descontoEmFolha=true` -- should show signature
4. Manual test: Generate PDF for a sale with both false -- should NOT show signature, no blank space where signature was
</verification>

<success_criteria>
- Both PDF generators conditionally render signature based on boleto/descontoEmFolha
- No blank space appears in the PDF when signature is omitted
- Existing boleto and desconto em folha PDFs continue to show signature as before
- TypeScript compiles without errors
</success_criteria>

<output>
After completion, create `.planning/quick/260318-fhz-assinatura-em-caso-de-boleto/260318-fhz-SUMMARY.md`
</output>
