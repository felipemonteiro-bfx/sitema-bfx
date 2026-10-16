import Link from 'next/link';
import {Info,Star,BadgePercent} from 'lucide-react';
import {formatBRL} from '@/lib/utils';
import {valorEmReais} from '@/lib/fidelidade';
import {Button} from '@/components/ui/button';
import {Popover,PopoverContent,PopoverTrigger} from '@/components/ui/popover';
import {iniciais} from './status-mensagem';

/** Aviso legal dos pontos: vive no Popover do ícone de info e no leitor de tela, não num parágrafo. */
const NOTA_PONTOS='Não é saldo em dinheiro. Resgate sujeito às regras de fidelidade; nenhum desconto foi aplicado.';

export function ResumoCliente({nome,cadastro,empresa,etapa,pontos,fichaHref,telefone,novaAba=false}:{nome:string;cadastro:number;empresa:string|null;etapa:string|null;pontos:number;fichaHref?:string;telefone?:string;novaAba?:boolean}){
 return <>
  <section aria-label="Identificação do cliente" className="flex flex-col items-center gap-2 px-4 pb-5 pt-5 text-center">
   <span aria-hidden="true" className="flex size-16 items-center justify-center rounded-full bg-marca-tint font-display text-xl font-semibold text-marca-tint-texto">{iniciais(nome)}</span>
   <h3 className="break-words text-lg font-semibold leading-snug">{nome}</h3>
   {telefone&&<p className="font-mono text-sm text-texto-secundario">+{telefone}</p>}
   <p className="break-words text-xs text-muted-foreground">Cadastro #{cadastro} · {empresa||'Empresa não informada'}<span className="sr-only"> · Etapa: {etapa||'Etapa não informada'}</span></p>
   {fichaHref&&<Link href={fichaHref} {...(novaAba?{target:'_blank',rel:'noopener'}:{})} className="inline-flex min-h-8 items-center text-sm font-semibold text-primary underline-offset-4 hover:underline">Ver ficha do cliente</Link>}
  </section>
  <section aria-label="Benefícios de fidelidade" className="relative flex flex-col gap-2.5 border-t border-divisoria px-4 py-4">
   <h4 className="pr-8 text-xs font-medium text-muted-foreground">Fidelidade</h4>
   <dl className="grid grid-cols-2 gap-1.5">
    <div className="rounded-interno bg-card-elevated p-3"><dt className="flex items-center gap-1.5 text-xs text-muted-foreground"><Star className="size-3.5 shrink-0" aria-hidden="true"/><span aria-hidden="true">Pontos</span><span className="sr-only">Pontos registrados</span></dt><dd className="mt-1 font-mono text-lg tabular-nums">{pontos.toLocaleString('pt-BR')}</dd></div>
    <div className="rounded-interno bg-card-elevated p-3"><dt className="flex items-center gap-1.5 text-xs text-muted-foreground"><BadgePercent className="size-3.5 shrink-0" aria-hidden="true"/><span aria-hidden="true">Em desconto</span><span className="sr-only">Equivalente em desconto</span></dt><dd className="valor-sensivel mt-1 font-mono text-lg tabular-nums text-marca-tint-texto">{formatBRL(valorEmReais(pontos))}</dd></div>
   </dl>
   <Popover>
    <PopoverTrigger asChild><Button type="button" variant="ghost" size="iconSm" aria-label="Sobre os pontos de fidelidade" aria-describedby="nota-pontos" title={NOTA_PONTOS} className="absolute right-3 top-2 size-7 text-muted-foreground"><Info className="size-3.5" aria-hidden="true"/></Button></PopoverTrigger>
    <PopoverContent align="end" className="w-72 p-4 text-xs leading-relaxed">{NOTA_PONTOS}</PopoverContent>
   </Popover>
   <span id="nota-pontos" className="sr-only">{NOTA_PONTOS}</span>
  </section>
 </>;
}
