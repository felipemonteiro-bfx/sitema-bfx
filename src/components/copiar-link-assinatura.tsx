'use client';

import { useState } from 'react';
import { Copy, Check, Link2 } from 'lucide-react';

export function CopiarLinkAssinatura({ token }: { token: string }) {
  const [copied, setCopied] = useState(false);

  const url = `${window.location.origin}/assinatura/${token}`;

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
    <button
      type="button"
      onClick={handleCopy}
      title={copied ? 'Link copiado!' : 'Copiar link de assinatura'}
      className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded border border-amber-300 bg-amber-50 text-amber-700 hover:bg-amber-100 transition-colors"
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
    </button>
  );
}
