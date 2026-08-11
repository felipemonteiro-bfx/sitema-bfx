'use client';

import { useState } from 'react';
import { buttonVariants } from '@/components/ui/button-variants';
import { cn } from '@/lib/utils';
import { Mail } from 'lucide-react';

interface Props {
  vendaId: number;
  onSend: (vendaId: number) => Promise<{ success: boolean; error?: string }>;
}

export function EnviarEmailEmpresaButton({ vendaId, onSend }: Props) {
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{ success?: boolean; error?: string } | null>(null);

  const handleClick = async () => {
    setSending(true);
    setResult(null);
    try {
      const res = await onSend(vendaId);
      setResult(res);
      if (res.success) {
        setTimeout(() => setResult(null), 3000);
      }
    } catch {
      setResult({ success: false, error: 'Erro inesperado.' });
    } finally {
      setSending(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={sending}
      className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }), 'text-xs gap-1')}
      title="Enviar notificacao para empresa"
    >
      <Mail className="h-3.5 w-3.5" />
      {sending ? 'Enviando...' : result?.success ? 'Enviado!' : 'Empresa'}
      {result?.error && (
        <span className="text-destructive text-xs ml-1">{result.error}</span>
      )}
    </button>
  );
}
