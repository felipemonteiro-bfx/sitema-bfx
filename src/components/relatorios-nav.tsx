import Link from 'next/link';
import { FileSpreadsheet, CalendarDays, Mail, ChartNoAxesCombined, ClockAlert } from 'lucide-react';
const destinos = [
 {id:'vendas',href:'/relatorios',nome:'Vendas',Icone:FileSpreadsheet},
 {id:'inadimplencia',href:'/relatorios?tipo=inadimplencia',nome:'Inadimplência',Icone:ClockAlert},
 {id:'margem',href:'/relatorios?tipo=margem',nome:'Margem por produto',Icone:ChartNoAxesCombined},
 {id:'mensais',href:'/relatorios/mensais',nome:'Mensais',Icone:CalendarDays},
 {id:'emails',href:'/relatorios/emails',nome:'E-mails enviados',Icone:Mail},
] as const;
export function RelatoriosNav({atual}:{atual:string}) {
 return <nav aria-label="Tipos de relatório" className="flex flex-wrap gap-1 rounded-controle border border-divisoria bg-controle p-1">
 {destinos.map(({id,href,nome,Icone})=><Link key={id} href={href} aria-current={id===atual?'page':undefined} scroll={false} className={`inline-flex min-h-11 items-center gap-2 rounded-lg px-3 text-sm ${id===atual?'bg-controle-ativo font-semibold text-foreground':'text-muted-foreground hover:text-foreground'}`}><Icone className="size-4" aria-hidden="true"/>{nome}</Link>)}
 </nav>;
}
