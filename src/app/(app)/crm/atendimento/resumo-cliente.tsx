import Link from 'next/link';
import {Info} from 'lucide-react';
import {formatBRL} from '@/lib/utils';
import {valorEmReais} from '@/lib/fidelidade';
import {Button} from '@/components/ui/button';
import {Popover,PopoverContent,PopoverTrigger} from '@/components/ui/popover';
import {iniciais} from './status-mensagem';

/** Aviso legal dos pontos: vive no Popover do ícone de info e no leitor de tela, não num parágrafo. */
const NOTA_PONTOS='Não é saldo em dinheiro. Resgate sujeito às regras de fidelidade; nenhum desconto foi aplicado.';

export function ResumoCliente({nome,cadastro,empresa,etapa,pontos,fichaHref,novaAba=false}:{nome:string;cadastro:number;empresa:string|null;etapa:string|null;pontos:number;fichaHref?:string;novaAba?:boolean}){
 return <section aria-label="Identificação do cliente" className="relative flex flex-col gap-3.5">
  <div className="flex flex-col items-center gap-2 px-2 pt-1 text-center">
   <span aria-hidden="true" className="flex size-16 items-center justify-center rounded-full bg-marca-tint font-display text-xl font-semibold text-marca-tint-texto">{iniciais(nome)}</span>
   <h3 className="break-words text-base font-semibold leading-snug">{nome}</h3>
   <p className="break-words text-xs text-muted-foreground">Cadastro #{cadastro} · {empresa||'Empresa não informada'}<span className="sr-only"> · Etapa: {etapa||'Etapa não informada'}</span></p>
   {fichaHref&&<Link href={fichaHref} {...(novaAba?{target:'_blank',rel:'noopener'}:{})} className="inline-flex min-h-8 items-center text-sm font-semibold text-primary underline-offset-4 hover:underline">Ver ficha do cliente</Link>}
  </div>
  <section aria-label="Benefícios de fidelidade" className="px-2">
   <h4 className="sr-only">Benefícios de fidelidade</h4>
   <dl className="grid grid-cols-2 gap-1.5">
    <div className="rounded-interno bg-card-elevated p-3"><dt className="text-xs text-muted-foreground">Pontos registrados</dt><dd className="mt-1 font-mono text-lg tabular-nums">{pontos.toLocaleString('pt-BR')}</dd></div>
    <div className="rounded-interno bg-card-elevated p-3"><dt className="text-xs text-muted-foreground">Equivalente em desconto</dt><dd className="mt-1 font-mono text-lg tabular-nums text-marca-tint-texto">{formatBRL(valorEmReais(pontos))}</dd></div>
   </dl>
   <Popover>
    <PopoverTrigger asChild><Button type="button" variant="ghost" size="iconSm" aria-label="Sobre os pontos de fidelidade" aria-describedby="nota-pontos" title={NOTA_PONTOS} className="absolute right-2 top-0 size-7 text-muted-foreground"><Info className="size-3.5" aria-hidden="true"/></Button></PopoverTrigger>
    <PopoverContent align="end" className="w-72 p-4 text-xs leading-relaxed">{NOTA_PONTOS}</PopoverContent>
   </Popover>
   <span id="nota-pontos" className="sr-only">{NOTA_PONTOS}</span>
  </section>
 </section>;
}
