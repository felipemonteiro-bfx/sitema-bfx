'use client';
import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Bot, ChevronDown, CircleHelp, RotateCw, UserRound } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { controlarAutomatico } from './actions';
import { fraseQuemResponde, modoDoEstado, mudarQuemResponde, pediuParar } from './quem-responde-regras';

/** Regra de uso do automático: abre no diálogo do menu e fica no leitor de tela (aria-describedby do gatilho). */
function Ajuda({ aberta }: { aberta: boolean }) {
  return <>
    <p>{aberta ? 'Janela aberta. Templates com tarifa continuam bloqueados.' : 'Janela encerrada. Envio com tarifa bloqueado.'} Escolha, ajuste o texto e envie. Clicar no botão não envia a mensagem. Enter envia; Shift+Enter quebra a linha; &quot;/&quot; abre as respostas prontas.</p>
    <p className="mt-2">Ao assumir, as respostas automáticas ficam pausadas. Retomar pode atender a última entrada de até 30 minutos ainda sem resposta. Respostas já registradas não são repetidas. Mensagens enviadas por outros aplicativos podem não aparecer aqui.</p>
  </>;
}

const OPCOES = [
  { id: 'equipe', nome: 'Equipe responde', detalhe: 'O automático fica pausado nesta conversa', Icone: UserRound },
  { id: 'automatico', nome: 'Automático responde', detalhe: 'A IA volta a atender esta conversa agora', Icone: Bot },
] as const;

/**
 * Seletor de "quem responde" no cabeçalho do chat. As escolhas chamam as mesmas ações de antes
 * (Assumir conversa / Retomar automático). No celular vira só o ícone; o estado fica no aria-label.
 */
export function QuemResponde({ telefone, estadoAutomatico, retomaEm, aberta = true, agora }: {
  telefone: string; estadoAutomatico: string; retomaEm?: string | null; aberta?: boolean; agora?: Date;
}) {
  const router = useRouter();
  const [ocupado, setOcupado] = useState(false);
  const [ajudaAberta, setAjudaAberta] = useState(false);
  const enviando = useRef(false);
  const modo = modoDoEstado(estadoAutomatico);
  const doAutomatico = modo === 'automatico';
  const rotulo = doAutomatico ? 'Automático responde' : 'Equipe responde';
  const Icone = doAutomatico ? Bot : UserRound;

  async function escolher(escolha: 'equipe' | 'automatico') {
    if (enviando.current) return;
    enviando.current = true;
    setOcupado(true);
    try {
      const r = await mudarQuemResponde({ escolha, atual: modo, telefone, controlar: controlarAutomatico });
      if (r) toast(r.message);
      router.refresh();
    } catch {
      toast('Não foi possível confirmar a mudança. Atualize antes de repetir.');
    } finally {
      enviando.current = false;
      setOcupado(false);
    }
  }

  return <>
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button type="button" variant="outline" size="sm" forma="pill" disabled={ocupado} aria-haspopup="menu" aria-describedby="ajuda-automatico" aria-label={`Quem responde esta conversa: ${doAutomatico ? 'Automático' : 'Equipe'}. Abrir opções`}>
          <Icone className="size-4 text-marca-tint-texto" aria-hidden="true" />
          <span className="max-sm:sr-only">{rotulo}</span>
          <ChevronDown className="size-3.5 text-texto-secundario max-sm:hidden" aria-hidden="true" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" role="menu" aria-label="Quem responde" className="w-80 max-w-[calc(100vw-1.5rem)]">
        <p className="px-2.5 pb-2.5 pt-2 text-xs leading-relaxed text-texto-secundario">{fraseQuemResponde({ modo, retomaEm: retomaEm ? new Date(retomaEm) : null, clientePediuParar: pediuParar(estadoAutomatico) }, agora ?? new Date())}</p>
        <DropdownMenuRadioGroup value={doAutomatico ? 'automatico' : 'equipe'}>
          {OPCOES.map(({ id, nome, detalhe, Icone: I }) => <DropdownMenuRadioItem key={id} value={id} onSelect={() => void escolher(id)} className="[&>span:first-child]:hidden">
            <span className="-ml-6 flex items-start gap-2.5 py-1">
            <I className={`mt-0.5 size-4 shrink-0 ${id === (doAutomatico ? 'automatico' : 'equipe') ? 'text-marca-tint-texto' : 'text-texto-secundario'}`} aria-hidden="true" />
            <span className="flex flex-col">
              <span className="text-sm font-semibold">{nome}</span>
              <span className="text-xs text-texto-secundario">{detalhe}</span>
            </span>
            </span>
          </DropdownMenuRadioItem>)}
        </DropdownMenuRadioGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => router.refresh()}><RotateCw aria-hidden="true" />Atualizar estado</DropdownMenuItem>
        <DropdownMenuItem onSelect={() => setAjudaAberta(true)}><CircleHelp aria-hidden="true" />Como funciona o automático</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
    <div id="ajuda-automatico" className="sr-only"><Ajuda aberta={aberta} /></div>
    <Dialog open={ajudaAberta} onOpenChange={setAjudaAberta}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Como funciona o automático</DialogTitle>
          <DialogDescription className="sr-only">Regras do atendimento automático e das respostas da equipe.</DialogDescription>
        </DialogHeader>
        <div className="text-sm leading-relaxed"><Ajuda aberta={aberta} /></div>
      </DialogContent>
    </Dialog>
  </>;
}
