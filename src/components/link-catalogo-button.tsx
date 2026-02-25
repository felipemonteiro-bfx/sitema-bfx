"use client";

import { useState } from "react";
import { Copy, Check, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { buttonVariants } from "@/components/ui/button-variants";
import { cn } from "@/lib/utils";

export function LinkCatalogoButton() {
  const [copied, setCopied] = useState(false);

  const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
  const link = `${baseUrl}/catalogo`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      toast.success("Link do catálogo copiado! Compartilhe no WhatsApp ou status.");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Erro ao copiar link.");
    }
  };

  return (
    <div className="flex gap-2">
      <button
        type="button"
        onClick={handleCopy}
        className={cn(
          buttonVariants({ variant: "outline" }),
          "border-blue-900 text-blue-900 hover:bg-blue-50 dark:border-blue-400 dark:text-blue-400 dark:hover:bg-blue-950 cursor-pointer gap-2"
        )}
      >
        {copied ? (
          <>
            <Check className="h-4 w-4" />
            Copiado!
          </>
        ) : (
          <>
            <Copy className="h-4 w-4" />
            Link do Catálogo
          </>
        )}
      </button>
      <a
        href={link}
        target="_blank"
        rel="noopener noreferrer"
        className={cn(
          buttonVariants({ variant: "outline" }),
          "border-blue-900 text-blue-900 hover:bg-blue-50 dark:border-blue-400 dark:text-blue-400 dark:hover:bg-blue-950 gap-2"
        )}
      >
        <ExternalLink className="h-4 w-4" />
        Abrir
      </a>
    </div>
  );
}
