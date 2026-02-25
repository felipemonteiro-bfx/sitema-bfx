"use client";

import { useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { ReceiptPreview } from "@/components/receipt-preview";

interface ReceiptEditorClientProps {
  titulo: string;
  descricao?: string;
  initialText: string;
  logoPath?: string;
  saveAction: (formData: FormData) => Promise<void>;
  previewLabel?: string;
}

export function ReceiptEditorClient({
  titulo,
  descricao = "Placeholders: {CLIENTE}, {MATRICULA}, {PRODUTO}, {VALOR}, {PARCELAS}, {DATA}.",
  initialText,
  logoPath,
  saveAction,
  previewLabel = "Prévia do Recibo",
}: ReceiptEditorClientProps) {
  const [texto, setTexto] = useState(initialText);

  return (
    <div className="flex flex-col lg:flex-row gap-6">
      <div className="lg:w-1/2 space-y-6">
        <div className="space-y-3">
          <h3 className="text-base font-semibold">{titulo}</h3>
          <div className="mb-3 text-sm text-muted-foreground">{descricao}</div>
          <form action={saveAction} className="space-y-3">
            <Textarea
              name="texto"
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              autoResize
            />
            <Button type="submit">Salvar texto</Button>
          </form>
        </div>
      </div>
      <div className="lg:w-1/2 p-4 border rounded-md bg-gray-50">
        <h3 className="text-lg font-semibold mb-3">{previewLabel}</h3>
        <ReceiptPreview template={texto} logoPath={logoPath} />
      </div>
    </div>
  );
}
