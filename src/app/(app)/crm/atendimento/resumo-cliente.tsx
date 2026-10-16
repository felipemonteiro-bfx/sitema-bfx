import Link from 'next/link';
import {Building2} from 'lucide-react';
import {formatBRL} from '@/lib/utils';
import {valorEmReais} from '@/lib/fidelidade';
import {iniciais} from './status-mensagem';

export function ResumoCliente({nome,cadastro,empresa,etapa,pontos,fichaHref,novaAba=false}:{nome:string;cadastro:number;empresa:string|null;etapa:string|null;pontos:number;fichaHref?:string;novaAba?:boolean}){
 return <section aria-label="Identificação do cliente" className="flex flex-col gap-3">
  <div className="flex flex-col items-center gap-2 px-2 pt-1 text-center">
   <span aria-hidden="true" className="flex size-16 items-center justify-center rounded-full bg-marca-tint font-display text-2xl font-semibold text-marca-tint-texto">{iniciais(nome)}</span>
   <h3 className="break-words text-lg font-semibold leading-snug">{nome}</h3>
   <p className="text-sm text-muted-foreground">Cadastro #{cadastro} · {etapa||'Etapa não informada'}</p>
   <p className="flex items-start justify-center gap-2 text-sm font-medium"><Building2 className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden="true"/><span className="break-words">{empresa||'Empresa não informada'}</span></p>
   {fichaHref&&<Link href={fichaHref} {...(novaAba?{target:'_blank',rel:'noopener'}:{})} className="inline-flex min-h-11 items-center text-sm font-semibold text-primary underline-offset-4 hover:underline">Ver ficha do cliente</Link>}
  </div>
  <section aria-label="Benefícios de fidelidade" className="flex flex-col gap-2">
   <h4 className="sr-only">Benefícios de fidelidade</h4>
   <dl className="grid grid-cols-2 gap-1.5">
    <div className="rounded-controle bg-card-elevated p-3"><dt className="text-xs text-muted-foreground">Pontos registrados</dt><dd className="mt-1 font-mono text-lg tabular-nums">{pontos.toLocaleString('pt-BR')}</dd></div>
    <div className="rounded-controle bg-card-elevated p-3"><dt className="text-xs text-muted-foreground">Equivalente em desconto</dt><dd className="mt-1 font-mono text-lg tabular-nums text-marca-tint-texto">{formatBRL(valorEmReais(pontos))}</dd></div>
   </dl>
   <p className="px-1 text-xs leading-snug text-muted-foreground">Não é saldo em dinheiro. Resgate sujeito às regras de fidelidade; nenhum desconto foi aplicado.</p>
  </section>
 </section>;
}
