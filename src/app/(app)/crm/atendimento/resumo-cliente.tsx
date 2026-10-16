import {UserRound,Building2,Gift} from 'lucide-react';
import {formatBRL} from '@/lib/utils';
import {valorEmReais} from '@/lib/fidelidade';

export function ResumoCliente({nome,cadastro,empresa,etapa,pontos}:{nome:string;cadastro:number;empresa:string|null;etapa:string|null;pontos:number}){
 return <section aria-label="Identificação do cliente" className="overflow-hidden rounded-xl border border-primary/30 bg-background">
  <header className="flex items-start gap-3 border-b border-primary/20 bg-primary/10 p-5 sm:p-6">
   <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground"><UserRound className="size-6"/></div>
   <div className="min-w-0"><h3 className="break-words text-xl font-bold leading-snug sm:text-2xl">{nome}</h3><p className="mt-2 text-sm text-muted-foreground">Cadastro #{cadastro} · {etapa||'Etapa não informada'}</p><p className="mt-3 flex items-start gap-2 text-sm font-semibold"><Building2 className="mt-0.5 size-4 shrink-0"/><span className="break-words">{empresa||'Empresa não informada'}</span></p></div>
  </header>
  <section aria-label="Benefícios de fidelidade" className="p-5 sm:p-6"><h4 className="mb-4 flex items-center gap-2 text-sm font-semibold"><Gift className="size-4 text-primary"/>Benefícios de fidelidade</h4><dl className="grid gap-4 sm:grid-cols-2"><div><dt className="text-sm text-muted-foreground">Pontos registrados</dt><dd className="mt-1 text-2xl font-bold tabular-nums">{pontos.toLocaleString('pt-BR')}</dd></div><div className="border-t pt-4 sm:border-l sm:border-t-0 sm:pl-5 sm:pt-0"><dt className="text-sm text-muted-foreground">Equivalente em desconto</dt><dd className="mt-1 text-2xl font-bold tabular-nums text-primary">{formatBRL(valorEmReais(pontos))}</dd></div></dl><p className="mt-4 text-xs leading-relaxed text-muted-foreground">Não é saldo em dinheiro. Resgate sujeito às regras de fidelidade; nenhum desconto foi aplicado.</p></section>
 </section>;
}
