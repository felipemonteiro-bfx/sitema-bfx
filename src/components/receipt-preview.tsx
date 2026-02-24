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
      <div className="flex justify-between items-center border-b pb-4 mb-4">
        <div>
          <h1 className="text-xl font-bold">BFX Manager</h1>
          <p className="text-sm text-gray-600">Recibo de Venda (Prévia)</p>
        </div>
        {logoPath && (
          <div className="relative w-20 h-20">
            <Image src={logoPath} alt="Company Logo" layout="fill" objectFit="contain" />
          </div>
        )}
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
      <div className="mb-12">
        <h2 className="text-lg font-semibold mb-2 border-b border-gray-100 pb-1">Termos e Condições</h2>
        <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-wrap italic">{filledTemplate}</p>
      </div>

      {/* Signature Section */}
      <div className="mt-16 flex flex-col items-center">
        <div className="w-64 border-t border-gray-400 mb-2"></div>
        <p className="text-sm font-semibold text-gray-900">Assinatura: {dummyData.CLIENTE}</p>
        <p className="text-[10px] text-gray-400 uppercase tracking-widest mt-1">Aceite Digital / Presencial</p>
      </div>

      <div className="mt-8 text-center border-t border-gray-50 pt-4">
        <p className="text-[10px] text-gray-400">Este é um documento oficial gerado pelo BFX Manager.</p>
      </div>
    </div>
  );
}
