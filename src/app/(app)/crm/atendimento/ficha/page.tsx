import Link from 'next/link';
import { prisma } from '@/lib/db';
import { requireAdmin } from '@/lib/guards';
import { identificarContato } from '@/lib/crm-whatsapp-identidade';
import { ContextoCliente } from '../contexto';
import { PageHeader } from '@/components/page-header';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { buttonVariants } from '@/components/ui/button-variants';
import { cn } from '@/lib/utils';
import { Building2, UserRound, ShoppingBag, FileText, ArrowLeft } from 'lucide-react';
export const dynamic='force-dynamic';
export default async function Page({searchParams}:{searchParams:Promise<{telefone?:string}>}){
 if(!await requireAdmin())return <p>Acesso restrito ao atendimento autorizado.</p>;
 const {telefone=''}=await searchParams;const valido=/^\d{10,15}$/.test(telefone);
 const cadastros=valido?await prisma.cliente.findMany({where:{telefone:{not:null}},select:{id:true,telefone:true}}):[];
 const vinculo=valido?identificarContato(telefone,cadastros):null;
 const c=vinculo?await prisma.cliente.findUnique({where:{id:vinculo.id},select:{id:true,nome:true,telefone:true,email:true,empresa:true,estagioCrm:true,origem:true,empresaParceira:{select:{nome:true}},_count:{select:{vendas:true}},vendas:{orderBy:{dataVenda:'desc'},take:20,select:{id:true,dataVenda:true,status:true,documentos:{select:{id:true,tipo:true}}}}}}):null;
 return (
  <div className="mx-auto max-w-5xl space-y-6">
   <Link href={`/crm/atendimento?telefone=${encodeURIComponent(telefone)}`} className="inline-flex min-h-11 items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground"><ArrowLeft className="size-4"/>Voltar à conversa</Link>
   <PageHeader title={c?c.nome:'Identificação pendente'} description="Ficha de atendimento: quem é o cliente, seu vínculo e seu histórico no Manager." breadcrumbs={[{label:'CRM',href:'/crm'},{label:'Atendimento',href:'/crm/atendimento'},{label:'Ficha do cliente'}]}/>
   {!c?(
    <Card className="p-6">
     <UserRound className="mb-3 size-6 text-muted-foreground"/>
     <h2 className="text-lg font-semibold text-foreground">Este telefone não identifica um único cliente</h2>
     <p className="mt-2 max-w-prose text-sm leading-relaxed text-muted-foreground">Pode haver cadastro ausente ou mais de um cadastro com esse número. Não associamos contratos, compras ou pagamentos por nome parecido. Confira o cadastro antes de vincular.</p>
     <Link href="/cadastros?tab=clientes" className={cn(buttonVariants({variant:'outline',size:'sm'}),'mt-4')}>Conferir clientes</Link>
    </Card>
   ):(
    <>
     <Card className="anim-entrada p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
       <div className="flex items-center gap-3">
        <div className="flex size-12 items-center justify-center rounded-full bg-controle text-muted-foreground"><UserRound/></div>
        <div>
         <h2 className="text-lg font-semibold text-foreground">{c.nome}</h2>
         <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">Cadastro #{c.id}<Badge variant="secondary" size="sm">{c.estagioCrm||'Etapa não informada'}</Badge></p>
        </div>
       </div>
       <Link href={`/cadastros?tab=clientes&editCliente=${c.id}`} className={cn(buttonVariants({variant:'outline',size:'sm'}))}>Abrir cadastro</Link>
      </div>
      <div className="mt-6 grid gap-3 sm:grid-cols-3">
       <div className="rounded-interno bg-card-elevated p-4"><p className="flex items-center gap-2 text-sm font-medium text-muted-foreground"><Building2 className="size-4"/>Empresa parceira</p><strong className="mt-2 block text-foreground">{c.empresaParceira?.nome||'Sem vínculo cadastrado'}</strong><p className="mt-1 text-sm text-muted-foreground">Empresa informada: {c.empresa||'Não informada'}</p></div>
       <div className="rounded-interno bg-card-elevated p-4"><p className="flex items-center gap-2 text-sm font-medium text-muted-foreground"><ShoppingBag className="size-4"/>Compras registradas</p><strong className="mt-2 block font-mono text-2xl font-medium tabular-nums text-foreground">{c._count.vendas}</strong><p className="mt-1 text-xs text-muted-foreground">Inclui histórico; status aparece em cada venda.</p></div>
       <div className="rounded-interno bg-card-elevated p-4"><p className="text-sm font-medium text-muted-foreground">Contato</p><strong className="mt-2 block break-all text-foreground">{c.telefone||'Não informado'}</strong><p className="mt-1 break-all text-sm text-muted-foreground">{c.email||'E-mail não informado'}</p></div>
      </div>
     </Card>
     <Card className="p-5 sm:p-6">
      <h2 className="flex items-center gap-2 text-lg font-semibold text-foreground"><FileText className="size-5 text-muted-foreground"/>Contratos e documentos de compra</h2>
      <p className="mt-1 text-sm text-muted-foreground">Últimas 20 vendas. Documento registrado não comprova pagamento ou validade contratual.</p>
      <div className="mt-4 space-y-3">
       {c.vendas.map(v=><div key={v.id} className="flex flex-wrap items-center justify-between gap-3 rounded-interno bg-poco p-3"><div><strong className="font-mono text-sm text-foreground">Venda #{v.id}</strong><p className="mt-1 text-xs text-muted-foreground">{v.dataVenda.toLocaleDateString('pt-BR',{timeZone:'America/Manaus'})} · {v.status} · {v.documentos.length} documento(s)</p></div>{v.documentos.some(d=>d.tipo==='comprovante_assinatura')?<a className="text-sm font-medium text-marca-tint-texto underline-offset-4 hover:underline" href={`/api/assinatura/documento?vendaId=${v.id}&inline=1`} target="_blank" rel="noopener noreferrer">Abrir documento assinado</a>:<span className="text-xs text-muted-foreground">{v.documentos.length?v.documentos.map(d=>d.tipo).join(', '):'Documento não localizado'}</span>}</div>)}
       {!c.vendas.length&&<p className="text-sm text-muted-foreground">Sem documentos de venda vinculados neste cadastro.</p>}
      </div>
     </Card>
     <ContextoCliente clienteId={c.id}/>
    </>
   )}
  </div>
 );
}
