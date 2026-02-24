"use client";

import { Button } from "@/components/ui/button";

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
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><line x1="8" y1="13" x2="16" y2="13"/><line x1="8" y1="17" x2="16" y2="17"/><line x1="10" y1="9" x2="8" y2="9"/></svg>
        Baixar CSV (Excel)
      </Button>

      <Button 
        type="button"
        onClick={() => handleDownload('pdf')}
        className="bg-rose-600 hover:bg-rose-700 text-white"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><path d="M16 13H8"/><path d="M16 17H8"/><path d="M10 9H8"/></svg>
        Baixar PDF (Impressão)
      </Button>
    </div>
  );
}
