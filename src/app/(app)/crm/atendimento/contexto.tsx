import Link from 'next/link';
import type { ReactNode } from 'react';
import {ResumoCliente} from './resumo-cliente';
import { prisma } from '@/lib/db';
import { formatBRL } from '@/lib/utils';
import { iniciais } from './status-mensagem';
import { Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
const data=(d:Date)=>d.toLocaleDateString('pt-BR',{timeZone:'America/Manaus'});

/** Aviso legal das vendas: Popover do ícone de info + leitor de tela (não ocupa um parágrafo no painel). */
const NOTA_VENDAS='Últimas 5 vendas. Baixa registrada não substitui comprovante nem autoriza cobrança; vendas canceladas ou estornadas não compõem saldo ativo. Nenhuma alteração é feita por esta consulta.';

type Props={clienteId:number|null;nome?:string;fichaHref?:string;novaAba?:boolean;/** "Organizar atendimento": entra entre o resumo e as vendas. */organizar?:ReactNode};

/** Somente leitura, chamado após vínculo único e guarda admin da página. */
export async function ContextoCliente({clienteId,nome='',fichaHref,novaAba=false,organizar}:Props) {
  if(!clienteId)return <div className="flex flex-col gap-3">
    <div className="flex flex-col items-center gap-2 px-2 pt-1 text-center"><span aria-hidden="true" className="flex size-16 items-center justify-center rounded-full bg-controle font-display text-xl font-semibold text-texto-secundario">{iniciais(nome)}</span>{nome&&<strong className="break-words text-base font-semibold">{nome}</strong>}{fichaHref&&<Link href={fichaHref} {...(novaAba?{target:'_blank',rel:'noopener'}:{})} className="inline-flex min-h-8 items-center text-sm font-semibold text-primary underline-offset-4 hover:underline">Ver ficha do contato</Link>}</div>
    <div className="rounded-interno bg-poco p-3.5 text-sm"><strong>Vínculo pendente</strong><p className="mt-1 text-xs text-muted-foreground">Telefone sem cadastro único comprovado. Compras e pagamentos não serão associados por nome parcial.</p></div>{organizar}</div>;
  const cliente=await prisma.cliente.findUnique({where:{id:clienteId},select:{id:true,nome:true,empresa:true,empresaParceira:{select:{nome:true}},pontos:true,estagioCrm:true,vendas:{orderBy:{dataVenda:'desc'},take:5,select:{id:true,dataVenda:true,status:true,formaPagamento:true,itens:{select:{produtoNome:true}},parcelasVencimento:{orderBy:{numeroParcela:'asc'},select:{id:true,numeroParcela:true,dataVencimento:true,valorParcela:true,paga:true,dataPagamento:true,origemPagamento:true,liquidadaEm:true}},documentos:{select:{id:true,tipo:true}}}}}});
  if(!cliente)return <p className="rounded-interno bg-poco p-3 text-sm">Cadastro não encontrado. Vínculo pendente.</p>;
  return <div className="flex flex-col gap-3"><ResumoCliente nome={cliente.nome} cadastro={cliente.id} empresa={cliente.empresaParceira?.nome||cliente.empresa} etapa={cliente.estagioCrm} pontos={cliente.pontos??0} fichaHref={fichaHref} novaAba={novaAba}/>{organizar}
   <section aria-label="Últimas vendas e pagamentos" className="relative flex flex-col gap-2.5 rounded-interno bg-poco p-3.5">
    <h3 className="pr-8 text-sm font-semibold">Últimas vendas</h3>
    <Popover>
     <PopoverTrigger asChild><Button type="button" variant="ghost" size="iconSm" aria-label="Sobre as últimas vendas" aria-describedby="nota-vendas" title={NOTA_VENDAS} className="absolute right-2 top-2 size-7 text-muted-foreground"><Info className="size-3.5" aria-hidden="true"/></Button></PopoverTrigger>
     <PopoverContent align="end" className="w-72 p-4 text-xs leading-relaxed">{NOTA_VENDAS}</PopoverContent>
    </Popover>
    <span id="nota-vendas" className="sr-only">{NOTA_VENDAS}</span>
    {cliente.vendas.map((v,i)=>{const baixas=v.parcelasVencimento.filter(p=>p.paga||p.liquidadaEm).length;const total=v.parcelasVencimento.length;const soma=v.parcelasVencimento.reduce((t,p)=>t+Number(p.valorParcela),0);return <div key={v.id} className={`flex flex-col gap-1.5 ${i?'border-t border-divisoria pt-2.5':''}`}>
     <div className="flex items-baseline justify-between gap-2 text-sm"><strong className="font-mono font-normal text-texto-secundario">#{v.id} · {data(v.dataVenda)}</strong>{total>0&&<span title="Soma das parcelas" className="valor-sensivel font-mono tabular-nums">{formatBRL(soma)}</span>}</div>
     {total>0&&<div className="flex items-center gap-2"><span aria-hidden="true" className="block h-1.5 flex-1 overflow-hidden rounded-full bg-grafico-trilha"><span className="block h-full rounded-full bg-primary" style={{width:`${Math.round(baixas/total*100)}%`}}/></span><span className="text-xs text-muted-foreground">{baixas}/{total} com baixa registrada</span></div>}
     <p className="text-xs text-muted-foreground">{v.status} · {v.itens.map(i=>i.produtoNome).join(', ')||'Produtos não informados'} · {v.formaPagamento||'Forma não informada'} · {v.documentos.length} documento(s) registrado(s)</p>
     {!!total&&<details className="text-xs text-muted-foreground"><summary className="flex min-h-8 cursor-pointer items-center">Parcelas ({total})</summary><div className="space-y-1">{v.parcelasVencimento.map(p=><p key={p.id}>Parcela #{p.id} ({p.numeroParcela}) · {formatBRL(p.valorParcela)} · vence {data(p.dataVencimento)} · {p.paga||p.liquidadaEm?`Baixa registrada${p.dataPagamento?' em '+data(p.dataPagamento):''} (${p.origemPagamento||'origem não informada'})`:'Sem baixa registrada — conferir antes de cobrar'}</p>)}</div></details>}
     {!total&&<p className="text-xs text-muted-foreground">Sem parcelas cadastradas; não presumir quitação.</p>}</div>;})}
    {!cliente.vendas.length&&<p className="text-xs text-muted-foreground">Sem venda vinculada neste cadastro.</p>}
    <Link href="/historico" {...(novaAba?{target:'_blank',rel:'noopener'}:{})} className="inline-flex min-h-8 items-center text-xs font-medium text-primary underline underline-offset-4">Abrir histórico de vendas</Link>
   </section></div>;
}
