'use client';
import { useEffect, useState } from 'react';
import { FileText, Loader2, Send, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { TipoMidia } from '@/lib/whatsapp-midia-politica';

const tamanho = (b: number) => b >= 1024 * 1024 ? `${(b / (1024 * 1024)).toFixed(1).replace('.', ',')} MB` : `${Math.max(1, Math.round(b / 1024))} KB`;

/** Prévia do anexo escolhido: miniatura (imagem/vídeo/figurinha) ou nome e tamanho, legenda opcional, Enviar e Cancelar. */
export function AnexoPrevia({ arquivo, tipo, legenda, enviando, onLegenda, onEnviar, onCancelar }: {
  arquivo: File; tipo: TipoMidia; legenda: string; enviando: boolean;
  onLegenda: (v: string) => void; onEnviar: () => void; onCancelar: () => void;
}) {
  const [url, setUrl] = useState<string | null>(null);
  const visual = tipo === 'imagem' || tipo === 'video' || tipo === 'figurinha';
  // Miniatura por object URL; revogada ao fechar ou trocar o arquivo.
  useEffect(() => {
    if (!visual) return;
    const u = URL.createObjectURL(arquivo); setUrl(u);
    return () => { URL.revokeObjectURL(u); setUrl(null); };
  }, [arquivo, visual]);
  const comLegenda = tipo !== 'figurinha';
  return <section aria-label="Prévia do anexo" aria-busy={enviando} className="mx-3 mt-2 flex flex-wrap items-center gap-3 rounded-painel border border-painel-borda bg-card-elevated p-3">
    <div className="flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-controle bg-controle">
      {visual && url && tipo === 'video' && <video src={url} muted preload="metadata" className="size-full object-cover" aria-label="Miniatura do vídeo"/>}
      {/* Miniatura local (blob:): não há o que otimizar com next/image. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {visual && url && tipo !== 'video' && <img src={url} alt="Miniatura do anexo" className="size-full object-cover"/>}
      {!visual && <FileText className="size-7 text-texto-secundario" aria-hidden="true"/>}
    </div>
    <div className="min-w-40 flex-1">
      <p className="truncate text-sm font-semibold" title={arquivo.name}>{arquivo.name}</p>
      <p className="text-xs text-texto-secundario">{tamanho(arquivo.size)}</p>
      {comLegenda && <div className="mt-2"><span className="sr-only"><Label htmlFor="legenda-anexo">Legenda</Label></span><Input id="legenda-anexo" placeholder="Legenda (opcional)" maxLength={1024} value={legenda} disabled={enviando} onChange={e => onLegenda(e.target.value)}/></div>}
    </div>
    <div className="flex items-center gap-2">
      <Button type="button" variant="outline" disabled={enviando} onClick={onCancelar}><X className="size-4" aria-hidden="true"/>Cancelar</Button>
      <Button type="button" disabled={enviando} onClick={onEnviar}>{enviando ? <Loader2 className="size-4 animate-spin" aria-hidden="true"/> : <Send className="size-4" aria-hidden="true"/>}Enviar</Button>
    </div>
  </section>;
}
