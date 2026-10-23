'use client';

import { useState } from 'react';
import { Check, Link2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export function CopiarLinkAssinatura({ token, className, somenteIcone = false }: { token: string; className?: string; somenteIcone?: boolean }) {
  const [copied, setCopied] = useState(false);

  const url = `${typeof window !== "undefined" ? window.location.origin : ""}/assinatura/${token}`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
      const el = document.createElement('textarea');
      el.value = url;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <Button
      type="button"
      variant={somenteIcone ? "ghost" : "tintAviso"}
      size={somenteIcone ? "icon" : "sm"}
      onClick={handleCopy}
      title={copied ? 'Link copiado!' : 'Copiar link de assinatura'}
      aria-label={somenteIcone ? (copied ? 'Link copiado!' : 'Copiar link de assinatura') : undefined}
      className={cn(somenteIcone ? "shrink-0" : "h-auto gap-1", className)}
    >
      {somenteIcone ? (
        copied ? <Check className="size-4" aria-hidden="true" /> : <Link2 className="size-4" aria-hidden="true" />
      ) : copied ? (
        <>
          <Check className="h-3 w-3" />
          Copiado!
        </>
      ) : (
        <>
          <Link2 className="h-3 w-3" />
          Copiar Link
        </>
      )}
    </Button>
  );
}
