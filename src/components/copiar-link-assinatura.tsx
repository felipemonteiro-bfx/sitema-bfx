'use client';

import { useState } from 'react';
import { Check, Link2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export function CopiarLinkAssinatura({ token, className }: { token: string; className?: string }) {
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
      variant="outline"
      size="sm"
      onClick={handleCopy}
      title={copied ? 'Link copiado!' : 'Copiar link de assinatura'}
      className={cn("h-auto gap-1 rounded border-warning bg-warning-bg px-2 py-1 text-xs text-warning-text shadow-none hover:bg-warning-bg/70 hover:text-warning-text hover:shadow-none", className)}
    >
      {copied ? (
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
