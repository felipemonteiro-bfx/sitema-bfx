"use client";

import { useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { ReceiptPreview } from "@/components/receipt-preview";

interface ReceiptEditorClientProps {
  initialModeloContrato: string;
  logoPath?: string;
  saveContrato: (formData: FormData) => Promise<void>;
}

export function ReceiptEditorClient({
  initialModeloContrato,
  logoPath,
  saveContrato,
}: ReceiptEditorClientProps) {
  const [modeloContrato, setModeloContrato] = useState(initialModeloContrato);

  const handleTextareaChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    setModeloContrato(event.target.value);
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6">
      <div className="lg:w-1/2 space-y-6">
        <div className="space-y-3">
          <div className="mb-3 text-sm text-muted-foreground">
            Você pode usar os placeholders: {"{CLIENTE}"}, {"{MATRICULA}"}, {"{PRODUTO}"}, {"{VALOR}"}, {"{PARCELAS}"}.
          </div>
          <form action={saveContrato} className="space-y-3">
            <Textarea
              name="texto"
              value={modeloContrato}
              onChange={handleTextareaChange}
              autoResize
            />
            <Button type="submit">Salvar texto</Button>
          </form>
        </div>
        {/* Separator and LogoUploadForm will be outside this component in page.tsx */}
      </div>
      <div className="lg:w-1/2 p-4 border rounded-md bg-gray-50">
        <h3 className="text-lg font-semibold mb-3">Prévia do Recibo</h3>
        <ReceiptPreview template={modeloContrato} logoPath={logoPath} />
      </div>
    </div>
  );
}
