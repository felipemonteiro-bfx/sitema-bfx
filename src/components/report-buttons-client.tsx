"use client";

import { Button } from "@/components/ui/button";
import { FileSpreadsheet, FileText } from "lucide-react";

export function ReportButtonsClient() {
  const handleDownload = (type: 'csv' | 'pdf') => {
    const form = document.getElementById('report-form') as HTMLFormElement;
    if (!form) return;
    
    const formData = new FormData(form);
    const params = new URLSearchParams();
    formData.forEach((value, key) => {
      params.append(key, value.toString());
    });
    
    const endpoint = type === 'csv' ? '/api/relatorios/vendas' : '/api/relatorios/vendas/pdf';
    window.location.href = `${endpoint}?${params.toString()}`;
  };

  return (
    <div className="flex flex-wrap gap-3 pt-4 border-t">
      <Button
        type="button"
        onClick={() => handleDownload('csv')}
        className="bg-emerald-600 hover:bg-emerald-700 text-white"
        leftIcon={<FileSpreadsheet className="h-4 w-4" />}
      >
        Baixar CSV (Excel)
      </Button>

      <Button
        type="button"
        onClick={() => handleDownload('pdf')}
        className="bg-rose-600 hover:bg-rose-700 text-white"
        leftIcon={<FileText className="h-4 w-4" />}
      >
        Baixar PDF (Impressão)
      </Button>
    </div>
  );
}
