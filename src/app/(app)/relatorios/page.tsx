import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { PageHeader } from '@/components/page-header';
import { buttonVariants } from '@/components/ui/button-variants';
import { requireAdmin } from '@/lib/guards';
import { prisma } from '@/lib/db';
import { ReportButtonsClient } from '@/components/report-buttons-client';
import { RelatoriosNav } from '@/components/relatorios-nav';
import { montarEmpresaOptions } from '@/lib/empresa-options';
import { hojeDataPura, inicioDoMesDataPura } from '@/lib/data-pura';
const relatorios = {
 vendas: {titulo:'Relatório de vendas',descricao:'Escolha a empresa, o período e as colunas que deseja exportar.'},
 inadimplencia: {titulo:'Inadimplência',descricao:'Parcelas vencidas e não pagas até a data escolhida. Sem data inicial, inclui todos os atrasos anteriores.'},
 margem: {titulo:'Margem por produto',descricao:'Compare receita, custo e margem dos produtos vendidos no período.'},
};
export default async function Page({searchParams}:{searchParams:Promise<{tipo?:string}>}) {
 if (!await requireAdmin()) return <div className="p-6 text-sm text-muted-foreground">Acesso restrito a administradores.</div>;
 const {tipo:valor}=await searchParams;
 const tipo=valor==='inadimplencia'||valor==='margem'?valor:'vendas';
 const today=hojeDataPura(); const monthStartStr=inicioDoMesDataPura(today);
 const [empresas,fornecedores]=tipo==='vendas'?await Promise.all([
  prisma.empresaParceira.findMany({orderBy:{nome:'asc'}}),
  prisma.fornecedor.findMany({where:{deletedAt:null},select:{nome:true}}),
 ]):[[],[]];
 const empresaOptions=montarEmpresaOptions(empresas,fornecedores);
 const relatorio=relatorios[tipo];
 return <div className="space-y-6">
  <PageHeader title="Relatórios" description="Gere arquivos ou acompanhe os relatórios e e-mails enviados." breadcrumbs={[{label:'Relatórios'}]} actions={<Link href="/financeiro" className={buttonVariants({variant:'outline'})}>Financeiro</Link>}/>
  <RelatoriosNav atual={tipo}/>
  <Card><CardHeader><CardTitle variant="secao">{relatorio.titulo}</CardTitle><CardDescription>{relatorio.descricao}</CardDescription></CardHeader>
   <CardContent><ReportButtonsClient key={tipo} tipo={tipo} empresaOptions={empresaOptions} defaultFrom={tipo==='inadimplencia'?'':monthStartStr} defaultTo={today}/></CardContent>
  </Card>
 </div>;
}
