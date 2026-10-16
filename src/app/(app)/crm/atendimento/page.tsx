import Link from 'next/link';
import { prisma } from '@/lib/db';
import { requireAdmin } from '@/lib/guards';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Reply } from './reply';
import { identificarContato } from '@/lib/crm-whatsapp-identidade';
import { variantesLocaisDeTelefone } from '@/lib/telefone-busca';
import { ContextoCliente } from './contexto';
import { MessageSquare, Users, Megaphone, Gift, Search } from 'lucide-react';
import { inicioDaPausa } from '@/lib/whatsapp-pausa';
export const dynamic='force-dynamic';
const hora=(d:Date)=>d.toLocaleString('pt-BR',{timeZone:'America/Manaus',dateStyle:'short',timeStyle:'short'});
export default async function Page({searchParams}:{searchParams:Promise<{telefone?:string;q?:string}>}) {
  if(!await requireAdmin())return <p>Acesso restrito ao atendimento autorizado.</p>;
  const sp=await searchParams;const q=(sp.q||'').trim().slice(0,100);
  const clientes=await prisma.cliente.findMany({where:{telefone:{not:null}},select:{id:true,nome:true,telefone:true,atendimentoHumanoAt:true}});
  const normalizar=(t:string)=>t.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
  const buscaNome=clientes.filter(c=>normalizar(c.nome).includes(normalizar(q)));
  const telefonesNome=buscaNome.flatMap(c=>variantesLocaisDeTelefone(c.telefone||'').map(t=>'55'+t));
  const digitos=q.replace(/[^\d]/g,'');
  const grupos=await prisma.whatsAppMensagem.groupBy({by:['telefone'],_max:{criadoEm:true},orderBy:{_max:{criadoEm:'desc'}},take:100,...(q?{where:{OR:[...(digitos?[{telefone:{contains:digitos}}]:[]),{telefone:{in:telefonesNome}}]}}:{})});
  const telefone=/^\d{10,15}$/.test(sp.telefone||'')?sp.telefone:grupos[0]?.telefone;
  const [mensagens,ultimaEntrada,cfg]=await Promise.all([
    telefone?prisma.whatsAppMensagem.findMany({where:{telefone},orderBy:{criadoEm:'desc'},take:100}):Promise.resolve([]),
    telefone?prisma.whatsAppMensagem.findFirst({where:{telefone,direcao:'in'},orderBy:{criadoEm:'desc'},select:{criadoEm:true}}):Promise.resolve(null),
    prisma.config.findFirst({select:{whatsappPreAtendimento:true,whatsappTakeoverMinutos:true}}),
  ]);
  const nome=(t:string)=>identificarContato(t,clientes)?.nome||t;
  const contato=telefone?identificarContato(telefone,clientes):null;
  const controle=mensagens.find(m=>m.direcao==='sistema'&&['controle_pausa','controle_retomada'].includes(m.origem))||null;
  const inicio=inicioDaPausa(new Date(),cfg?.whatsappTakeoverMinutos||60,controle);
  const manual=inicio&&mensagens.find(m=>m.direcao==='out'&&m.origem==='manual'&&m.criadoEm>=inicio);
  const pediuHumano=inicio&&mensagens.some(m=>m.direcao==='in'&&m.criadoEm>=inicio&&/\b(atendente|humano|vendedor|sair|parar)\b/i.test(m.corpo));
  const escolha=mensagens.find(m=>m.direcao==='in'&&/^(sair|parar|voltar)$/i.test(m.corpo.trim()));
  const estadoAutomatico=cfg?.whatsappPreAtendimento!==2?'Automático gratuito desligado':!inicio?'Automático pausado pela equipe':escolha&&/^(sair|parar)$/i.test(escolha.corpo.trim())?'Cliente pediu para parar — aguardar VOLTAR':manual?`Pausa após resposta humana até ${hora(new Date(manual.criadoEm.getTime()+(cfg?.whatsappTakeoverMinutos||60)*60000))}`:pediuHumano||(contato?.atendimentoHumanoAt&&contato.atendimentoHumanoAt>=inicio)?'Pausa de atendimento humano ativa':'Automático gratuito disponível para assuntos previstos';
  const ultimaConversa=mensagens.find(m=>m.direcao==='in'||m.direcao==='out');
  const semResposta=ultimaConversa?.direcao==='in';
  const aberta=!!ultimaEntrada&&Date.now()-ultimaEntrada.criadoEm.getTime()<86_400_000;
  return <div className="space-y-5"><PageHeader title="Atendimento WhatsApp" description="Conversas recebidas pela integração oficial do 8250. Horários de Manaus." breadcrumbs={[{label:'CRM',href:'/crm'},{label:'Atendimento'}]}/>
    <nav aria-label="Áreas do CRM" className="flex flex-wrap gap-2">{[{href:'/crm/atendimento',nome:'Conversas',Icon:MessageSquare},{href:'/crm',nome:'Clientes',Icon:Users},{href:'/crm/relacionamento',nome:'Relacionamento',Icon:Users},{href:'/crm/campanhas',nome:'Campanhas',Icon:Megaphone},{href:'/crm/fidelidade',nome:'Fidelidade',Icon:Gift}].map(({href,nome,Icon})=><Link key={href} href={href} className={`inline-flex min-h-11 items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium ${href==='/crm/atendimento'?'bg-primary text-primary-foreground':'bg-muted text-foreground hover:bg-muted/70'}`}><Icon className="size-4"/>{nome}</Link>)}</nav>
    <details className="text-xs text-muted-foreground"><summary className="cursor-pointer">Sobre este histórico</summary><p className="mt-2 leading-relaxed">Conversas registradas no Manager desde a integração. Mensagens de outros aplicativos podem não aparecer aqui. Grupos continuam no WhatsApp Web.</p></details>
    <div className="grid gap-4 lg:grid-cols-[300px_minmax(0,1fr)]">
      <aside className="rounded-xl border bg-muted/20 p-4 space-y-4"><h2 className="flex items-center gap-2 font-semibold"><MessageSquare className="size-4 text-primary"/>Conversas <span className="ml-auto text-xs text-muted-foreground">{grupos.length}</span></h2><form className="flex gap-2"><Input name="q" defaultValue={q} aria-label="Buscar nome ou telefone" placeholder="Nome ou telefone"/><Button variant="outline" aria-label="Buscar conversa"><Search className="size-4"/></Button></form>
        <p className="text-xs text-muted-foreground">Até 100 conversas mais recentes</p>
        <div className="max-h-[65vh] space-y-2 overflow-y-auto">{grupos.map(g=><Link key={g.telefone} href={`/crm/atendimento?telefone=${g.telefone}`} className={`block rounded-lg border p-3 ${g.telefone===telefone?'border-primary bg-primary/10':'bg-background hover:bg-muted'}`}><strong className="block break-words">{nome(g.telefone)}</strong><span className="text-xs">{g.telefone} · {g._max.criadoEm?hora(g._max.criadoEm):''}</span></Link>)}{!grupos.length&&<p>Nenhuma conversa registrada nesta busca.</p>}</div>
      </aside>
      <section className="min-w-0 rounded-xl border p-4 space-y-4">{telefone?<><header className="flex flex-wrap items-center justify-between gap-3 border-b pb-4"><div><h2 className="text-lg font-semibold"><Link className="underline decoration-primary/30 underline-offset-4 hover:text-primary" href={`/crm/atendimento/ficha?telefone=${telefone}`}>{nome(telefone)}</Link></h2><p className="mt-1 text-sm text-muted-foreground"><Link href={`/crm/atendimento/ficha?telefone=${telefone}`} className="font-medium underline underline-offset-4" aria-label="Abrir ficha pelo telefone">+{telefone}</Link> · Ver ficha do cliente</p></div><span className="rounded-full bg-muted px-3 py-1 text-xs font-medium">{aberta?'Atendimento disponível':'Aguardando cliente'}</span></header>{semResposta&&<div role="status" className="rounded-lg border border-primary/30 bg-primary/5 p-3 text-sm"><strong>Mensagem do cliente aguardando resposta</strong><p className="mt-1 text-muted-foreground">{estadoAutomatico.includes('Pausa')||estadoAutomatico.includes('pausado')?'A equipe assumiu ou o automático está pausado.':'Se o automático não respondeu, confira o assunto e use uma resposta pronta abaixo. Retomar trata somente a última entrada recente sem resposta.'}</p></div>}<ContextoCliente clienteId={contato?.id??null}/><div className="max-h-[55vh] space-y-4 overflow-y-auto rounded-xl bg-muted/20 p-3 sm:p-5">{mensagens.toReversed().map(m=><article key={m.id} className={`max-w-[95%] rounded-2xl border px-4 py-3 sm:max-w-[85%] ${m.direcao==='out'?'ml-auto border-primary/20 bg-primary/10':m.direcao==='sistema'?'mx-auto border-dashed bg-muted/50 text-muted-foreground':'mr-auto bg-background'}`}><p className="text-xs font-semibold mb-2">{m.direcao==='sistema'?'Controle interno':m.direcao==='out'?'BFX':'Cliente'} · {hora(m.criadoEm)}</p><p className="whitespace-pre-wrap break-words leading-relaxed">{m.corpo}</p><p className="mt-2 text-xs text-muted-foreground">{m.direcao==='sistema'?'Registro interno; sem envio externo':m.direcao==='in'?'Recebida':m.status==='pendente'?'Pendente de confirmação':m.status==='enviado'?'Aceita pela Meta; entrega não confirmada':m.status==='entregue'?'Entregue':m.status==='lido'?'Lida':m.status==='falhou'?'Falhou':m.status}</p></article>)}</div><Reply key={telefone} telefone={telefone} aberta={aberta} estadoAutomatico={estadoAutomatico}/></>:<p>Aguardando mensagens recebidas pela integração.</p>}</section>
    </div></div>;
}
