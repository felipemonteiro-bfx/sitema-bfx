import Link from 'next/link';
import { prisma } from '@/lib/db';
import { requireAdmin } from '@/lib/guards';
import { PageHeader } from '@/components/page-header';
import { KpiCard } from '@/components/kpi-card';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { valorTotalVenda } from '@/lib/venda-utils';
import { formatBRL } from '@/lib/utils';
import { NavAreasCrm } from '../nav-areas-crm';
export const dynamic='force-dynamic';

const SEGMENTOS=['Compra recente','Recorrente','Reaproximar','Sem compra no período'] as const;
// Só apresentação: Recorrente é o destaque da marca; Reaproximar pede atenção; o resto é neutro.
const VARIANTE_SEGMENTO={'Compra recente':'secondary','Recorrente':'marca','Reaproximar':'warning','Sem compra no período':'outline'} as const;

export default async function Page(){
 if(!await requireAdmin())return <p>Acesso restrito.</p>;
 const hoje=new Date();const inicio=new Date(hoje);inicio.setFullYear(inicio.getFullYear()-1);
 const clientes=await prisma.cliente.findMany({select:{id:true,nome:true,vendas:{where:{status:{notIn:['cancelada','estornada']},dataVenda:{gte:inicio,lte:hoje}},select:{dataVenda:true,valorVenda:true,quantidade:true,valorFrete:true,desconto:true,itens:{select:{subtotal:true}}},orderBy:{dataVenda:'desc'}}}});
 const dados=clientes.map(c=>{const dias=c.vendas.length?Math.floor((hoje.getTime()-c.vendas[0].dataVenda.getTime())/86400000):null;return {...c,dias,total:c.vendas.reduce((s,v)=>s+valorTotalVenda(v),0),segmento:dias===null?'Sem compra no período':dias>90?'Reaproximar':c.vendas.length>=3?'Recorrente':'Compra recente'};}).sort((a,b)=>b.total-a.total);
 return (
  <div className="space-y-6">
   <PageHeader title="Relacionamento com clientes" description="Histórico real de compras para decidir a próxima ação. Somente leitura; nenhum envio automático é feito aqui." breadcrumbs={[{label:'CRM',href:'/crm'},{label:'Relacionamento'}]} actions={<NavAreasCrm atual="/crm/relacionamento"/>}/>
   <Card className="anim-entrada p-5">
    <div className="mb-4">
     <h2 className="text-lg font-semibold text-foreground">Segmentos dos últimos 12 meses</h2>
     <p className="text-sm text-muted-foreground">Contagens consideram todos os cadastros.</p>
    </div>
    <div className="grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(min(100%,14rem),1fr))]">
     {SEGMENTOS.map((s,i)=><KpiCard key={s} rotulo={s} valor={String(dados.filter(c=>c.segmento===s).length)} rodape="clientes" valorSensivel={false} ordem={i}/>)}
    </div>
    <p className="mt-4 max-w-prose rounded-interno bg-poco p-4 text-sm leading-relaxed text-muted-foreground">Últimos 12 meses até {hoje.toLocaleDateString('pt-BR',{timeZone:'America/Manaus'})}. Recorrente: 3 ou mais compras e última até 90 dias; reaproximar: última há mais de 90 dias. Valor representa vendas registradas, descontando cancelamentos e estornos; não comprova recebimento. A classificação não autoriza campanhas. Cashback novo não foi ativado.</p>
   </Card>
   <Card className="p-5">
    <div className="mb-4">
     <h2 className="text-lg font-semibold text-foreground">Recência, frequência e valor</h2>
     <p className="text-sm text-muted-foreground">Critérios visíveis, do maior valor vendido para o menor.</p>
    </div>
    <div className="overflow-x-auto rounded-interno bg-poco">
     <Table>
      <TableHeader>
       <TableRow>
        <TableHead>Cliente</TableHead>
        <TableHead>Situação</TableHead>
        <TableHead>Última compra</TableHead>
        <TableHead className="text-right">Compras</TableHead>
        <TableHead className="text-right">Valor vendido</TableHead>
        <TableHead>Próximo passo</TableHead>
       </TableRow>
      </TableHeader>
      <TableBody>
       {dados.slice(0,500).map(c=><TableRow key={c.id}>
        <TableCell peso="medio">{c.nome}</TableCell>
        <TableCell><Badge variant={VARIANTE_SEGMENTO[c.segmento as typeof SEGMENTOS[number]]}>{c.segmento}</Badge></TableCell>
        <TableCell mono>{c.dias===null?'Sem registro':`${c.dias} dias`}</TableCell>
        <TableCell numeric>{c.vendas.length}</TableCell>
        <TableCell numeric className="valor-sensivel">{formatBRL(c.total)}</TableCell>
        <TableCell><Link className="text-sm font-medium text-marca-tint-texto underline-offset-4 hover:underline" href={`/crm?q=${encodeURIComponent(c.nome)}`}>Conferir cadastro e consentimento</Link></TableCell>
       </TableRow>)}
      </TableBody>
     </Table>
    </div>
    {dados.length>500&&<p className="mt-3 text-sm text-muted-foreground">Tabela limitada aos 500 maiores valores; contagens consideram todos os cadastros.</p>}
   </Card>
  </div>
 );
}
