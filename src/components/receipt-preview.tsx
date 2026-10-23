"use client";

import React, { useMemo } from "react";
import Image from "next/image";
import { logoSrcParaBrowser } from "@/lib/storage-policy";

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
  DATA: new Intl.DateTimeFormat("pt-BR").format(new Date()),
};

function fillTemplate(template: string, data: Record<string, string>) {
  return template.replace(/\{(\w+)\}/g, (_, key) => data[key] ?? "");
}

export function ReceiptPreview({ template, logoPath }: ReceiptPreviewProps) {
  const filledTemplate = useMemo(() => fillTemplate(template, dummyData), [template]);

  // A very simplified representation of the PDF layout
  // This would need to be expanded and styled to closely match the PDF
  //
  // Nota (Fase 14, D-06): esta prévia representa uma folha impressa/PDF — deve
  // permanecer clara independente do tema do app (igual ao comportamento atual,
  // sem nenhuma variante dark:). Por isso as cores usam os tokens `papel-*`
  // (mesmo valor nos dois temas, em globals.css) em vez de "foreground"/
  // "muted-foreground", que trocam no tema escuro e deixariam o texto
  // ilegível sobre este fundo branco fixo. A sombra (D-03)
  // nao tem o mesmo problema — o fundo branco e fixo, entao o par de tema
  // escuro so deixa a elevacao mais forte, sem risco de contraste.
  return (
    <div className="font-sans text-papel-texto p-4 bg-papel shadow-md dark:shadow-elevacao-md rounded-md">
      {/* Header */}
      <div className="flex justify-between items-center border-b pb-4 mb-4">
        <div>
          <h1 className="text-xl font-bold">BFX Manager</h1>
          <p className="text-sm text-papel-texto-medio">Recibo de Venda (Prévia)</p>
        </div>
        {logoPath && (
          <div className="relative w-20 h-20">
            <Image
              src={logoSrcParaBrowser(logoPath)}
              alt="Company Logo"
              fill
              unoptimized
              className="object-contain"
            />
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
        <h2 className="text-lg font-semibold mb-2 border-b border-papel-linha pb-1">Termos e Condições</h2>
        <p className="text-sm text-papel-texto-medio leading-relaxed whitespace-pre-wrap italic">{filledTemplate}</p>
      </div>

      {/* Signature Section */}
      <div className="mt-16 flex flex-col items-center">
        <div className="w-64 border-t border-papel-traco mb-2"></div>
        <p className="text-sm font-semibold text-papel-texto-forte">Assinatura: {dummyData.CLIENTE}</p>
        {/* gray-400 (#9ca3af) sobre o branco do papel media 2.54:1 nos dois
            temas; `papel-texto-fraco` (#6b7280) da 4.83:1 e mantem o tom discreto.
            O branco fixo continua: o preview simula papel, nao superficie do app.
            Fase 18, achado 8. */}
        <p className="text-xs text-papel-texto-fraco uppercase tracking-widest mt-1">Aceite Digital / Presencial</p>
      </div>

      <div className="mt-8 text-center border-t border-papel-linha pt-4">
        <p className="text-xs text-papel-texto-fraco">Este é um documento oficial gerado pelo BFX Manager.</p>
      </div>
    </div>
  );
}
