'use client';
import { useState, useTransition, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { Download, Loader2, RotateCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useFotos } from './fotos-contexto';
import { tentarMidiaDeNovo } from './midia-tentar-actions';

/** Foto na bolha: o próprio gatilho que abre a tela cheia (cursor de lupa). A mídia e a hora entram como filhos. */
export function FotoBotao({ msgId, rotulo, className = '', children }: { msgId: number; rotulo: string; className?: string; children: ReactNode }) {
  const { abrir } = useFotos();
  return <button type="button" aria-label={rotulo} onClick={() => abrir(msgId)}
    className={`group/foto relative block cursor-zoom-in overflow-hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${className}`}>{children}</button>;
}

/** Pílula "↓ 115 kB" da foto que falhou: pede o download de novo ao servidor e atualiza a conversa. */
export function BotaoTentarFoto({ id, rotulo, children }: { id: string; rotulo: string; children: ReactNode }) {
  const router = useRouter();
  const [pendente, iniciar] = useTransition();
  const [erro, setErro] = useState('');
  return <>
    <button type="button" aria-label={rotulo} disabled={pendente}
      onClick={() => iniciar(async () => { const r = await tentarMidiaDeNovo(id); setErro(r.ok ? '' : r.message); router.refresh(); })}
      className="absolute inset-0 flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring">
      <span className="flex h-10 items-center gap-2 rounded-full bg-poco/80 px-3.5 text-sm font-medium text-foreground backdrop-blur-sm">
        {pendente ? <Loader2 className="size-4 animate-spin motion-reduce:animate-none" aria-hidden="true" /> : <Download className="size-4" aria-hidden="true" />}{children}
      </span>
    </button>
    {erro && <span role="alert" className="pointer-events-none absolute inset-x-2 bottom-2 rounded-md bg-poco/90 px-2 py-1 text-center text-xs text-foreground">{erro}</span>}
  </>;
}

/** "Tentar de novo" da mídia que falhou: pede o download ao servidor e atualiza a conversa. */
export function BotaoTentarDeNovo({ id }: { id: string }) {
  const router = useRouter();
  const [pendente, iniciar] = useTransition();
  const [erro, setErro] = useState('');
  return <div className="flex flex-col items-start gap-1">
    <Button type="button" variant="outline" size="sm" disabled={pendente}
      onClick={() => iniciar(async () => { const r = await tentarMidiaDeNovo(id); setErro(r.ok ? '' : r.message); router.refresh(); })}>
      <RotateCw className={`size-4 ${pendente ? 'animate-spin motion-reduce:animate-none' : ''}`} aria-hidden="true" />Tentar de novo
    </Button>
    {erro && <span role="alert" className="text-xs text-error-text">{erro}</span>}
  </div>;
}
