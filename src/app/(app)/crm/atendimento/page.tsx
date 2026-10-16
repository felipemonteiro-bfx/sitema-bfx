import Link from 'next/link';
import { prisma } from '@/lib/db';
import { requireAdmin } from '@/lib/guards';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Reply } from './reply';
export const dynamic='force-dynamic';
const hora=(d:Date)=>d.toLocaleString('pt-BR',{timeZone:'America/Manaus',dateStyle:'short',timeStyle:'short'});
export default async function Page({searchParams}:{searchParams:Promise<{telefone?:string;q?:string}>}) {
  if(!await requireAdmin())return <p>Acesso restrito ao atendimento autorizado.</p>;
  const sp=await searchParams;const q=(sp.q||'').trim().slice(0,100);
  const grupos=await prisma.whatsAppMensagem.groupBy({by:['telefone'],_max:{criadoEm:true},orderBy:{_max:{criadoEm:'desc'}},take:100,...(q?{where:{telefone:{contains:q.replace(/[^\d]/g,'')||q}}}:{})});
  const telefone=/^\d{10,15}$/.test(sp.telefone||'')?sp.telefone:grupos[0]?.telefone;
  const [mensagens,clientes,ultimaEntrada]=await Promise.all([
    telefone?prisma.whatsAppMensagem.findMany({where:{telefone},orderBy:{criadoEm:'desc'},take:100}):Promise.resolve([]),
    prisma.cliente.findMany({where:{telefone:{not:null}},select:{id:true,nome:true,telefone:true}}),
    telefone?prisma.whatsAppMensagem.findFirst({where:{telefone,direcao:'in'},orderBy:{criadoEm:'desc'},select:{criadoEm:true}}):Promise.resolve(null),
  ]);
  const nomes=new Map(clientes.map(c=>[(c.telefone||'').replace(/\D/g,''),c.nome]));
  const nome=(t:string)=>nomes.get(t)||nomes.get(t.replace(/^55/,''))||t;
  const aberta=!!ultimaEntrada&&Date.now()-ultimaEntrada.criadoEm.getTime()<86_400_000;
  return <div className="space-y-5"><PageHeader title="Atendimento WhatsApp" description="Conversas recebidas pela integração oficial do 8250. Horários de Manaus." breadcrumbs={[{label:'CRM',href:'/crm'},{label:'Atendimento'}]}/>
    <p className="text-sm text-muted-foreground">Histórico registrado no Manager a partir da integração. Conversas antigas e mensagens enviadas em outros aplicativos podem não aparecer. Grupos continuam no WhatsApp Web. Acesso restrito aos administradores atuais.</p>
    <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
      <aside className="rounded-xl border p-4 space-y-3"><form className="flex gap-2"><Input name="q" defaultValue={q} aria-label="Buscar telefone" placeholder="Buscar telefone"/><Button variant="outline">Buscar</Button></form>
        <p className="text-xs text-muted-foreground">Até 100 conversas mais recentes</p>
        <div className="max-h-[65vh] space-y-2 overflow-y-auto">{grupos.map(g=><Link key={g.telefone} href={`/crm/atendimento?telefone=${g.telefone}`} className={`block rounded-lg border p-3 ${g.telefone===telefone?'bg-muted':''}`}><strong className="block break-words">{nome(g.telefone)}</strong><span className="text-xs">{g.telefone} · {g._max.criadoEm?hora(g._max.criadoEm):''}</span></Link>)}{!grupos.length&&<p>Nenhuma conversa registrada nesta busca.</p>}</div>
      </aside>
      <section className="min-w-0 rounded-xl border p-4 space-y-4">{telefone?<><h2 className="text-lg font-semibold">{nome(telefone)} · {telefone}</h2><div className="max-h-[60vh] space-y-3 overflow-y-auto">{mensagens.toReversed().map(m=><article key={m.id} className={`max-w-[95%] rounded-xl border p-3 ${m.direcao==='out'?'ml-auto bg-muted':'mr-auto'}`}><p className="text-xs font-semibold mb-2">{m.direcao==='out'?'BFX':'Cliente'} · {hora(m.criadoEm)}</p><p className="whitespace-pre-wrap break-words">{m.corpo}</p><p className="mt-2 text-xs text-muted-foreground">{m.direcao==='in'?'Recebida':m.status==='pendente'?'Pendente de confirmação':m.status==='enviado'?'Aceita pela Meta; entrega não confirmada':m.status==='entregue'?'Entregue':m.status==='lido'?'Lida':m.status==='falhou'?'Falhou':m.status}</p></article>)}</div><Reply key={telefone} telefone={telefone} aberta={aberta}/></>:<p>Aguardando mensagens recebidas pela integração.</p>}</section>
    </div></div>;
}
