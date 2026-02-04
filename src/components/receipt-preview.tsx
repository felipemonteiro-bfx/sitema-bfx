"use client";

import React, { useMemo } from "react";
import Image from "next/image";

interface ReceiptPreviewProps {
  template: string;
  logoPath?: string;
}

const dummyData = {
  CLIENTE: "Fulano de Tal",
  MATRICULA: "123456",
  PRODUTO: "Produto Exemplo",
  VALOR: "1.234,56",
  PARCELAS: "12",
};

function fillTemplate(template: string, data: Record<string, string>) {
  return template.replace(/\{(\w+)\}/g, (_, key) => data[key] ?? "");
}

export function ReceiptPreview({ template, logoPath }: ReceiptPreviewProps) {
  const filledTemplate = useMemo(() => fillTemplate(template, dummyData), [template]);

  // A very simplified representation of the PDF layout
  // This would need to be expanded and styled to closely match the PDF
  return (
    <div className="font-sans text-gray-800 p-4 bg-white shadow-md rounded-md">
      {/* Header */}
      <div className="flex items-center gap-4 border-b pb-4 mb-4">
        {logoPath && (
          <div className="relative w-16 h-16 shrink-0">
            <Image
              src={logoPath}
              alt="Company Logo"
              fill
              sizes="64px"
              className="object-contain"
            />
          </div>
        )}
        <div>
          <h1 className="text-xl font-bold">BFX Manager</h1>
          <p className="text-sm text-gray-600">Recibo de Venda (Prévia)</p>
        </div>
      </div>

      {/* Sale Details */}
      <div className="mb-4">
        <h2 className="text-lg font-semibold mb-2">Detalhes da Venda</h2>
        <p className="text-sm">Cliente: {dummyData.CLIENTE}</p>
        <p className="text-sm">Produto: {dummyData.PRODUTO}</p>
        <p className="text-sm">Valor: R$ {dummyData.VALOR}</p>
        <p className="text-sm">Parcelas: {dummyData.PARCELAS}x</p>
      </div>

      {/* Terms and Conditions */}
      <div>
        <h2 className="text-lg font-semibold mb-2">Termos e Condições</h2>
        <p className="text-sm whitespace-pre-wrap">{filledTemplate}</p>
      </div>
    </div>
  );
}
