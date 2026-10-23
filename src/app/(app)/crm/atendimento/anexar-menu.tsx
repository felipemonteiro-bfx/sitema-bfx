'use client';
import { useRef } from 'react';
import { FileText, Image as ImagemIcone, Camera, Sticker, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { OPCOES_ANEXO, type NomeOpcaoAnexo } from './composer-regras';

const ICONES = { 'Documento': FileText, 'Fotos e vídeos': ImagemIcone, 'Câmera': Camera, 'Figurinha': Sticker } as const;

/** Botão "+" do composer: abre o menu com as 4 origens de anexo. Escolher só entrega o arquivo; quem envia é o composer. */
export function AnexarMenu({ desabilitado, onEscolher }: { desabilitado: boolean; onEscolher: (opcao: NomeOpcaoAnexo, arquivo: File) => void }) {
  const refs = useRef<Partial<Record<NomeOpcaoAnexo, HTMLInputElement | null>>>({});
  return <>
    <DropdownMenu>
      <span className="shrink-0 [&>button]:rounded-full"><DropdownMenuTrigger asChild><Button type="button" variant="ghost" size="icon" aria-label="Anexar" title="Anexar" disabled={desabilitado}><Plus className="size-5 text-muted-foreground" aria-hidden="true"/></Button></DropdownMenuTrigger></span>
      <DropdownMenuContent side="top" align="start" aria-label="Anexar">
        {OPCOES_ANEXO.map(o => { const Icone = ICONES[o.nome]; return <DropdownMenuItem key={o.nome} onSelect={() => refs.current[o.nome]?.click()}><Icone className="text-marca-tint-texto" aria-hidden="true"/>{o.nome}</DropdownMenuItem>; })}
      </DropdownMenuContent>
    </DropdownMenu>
    {/* Seletores de arquivo escondidos: exceção legítima do shadcn-bfx (o Input não cobre o seletor nativo). */}
    {OPCOES_ANEXO.map(o => <input key={o.nome} ref={el => { refs.current[o.nome] = el; }} type="file" hidden tabIndex={-1} aria-hidden="true" accept={o.accept} capture={o.capture}
      onChange={e => { const f = e.target.files?.[0]; e.target.value = ''; if (f) onEscolher(o.nome, f); }}/>)}
  </>;
}
