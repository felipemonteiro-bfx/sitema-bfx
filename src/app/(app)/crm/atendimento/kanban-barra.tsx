'use client';
import {RotateCw,Search} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Label} from '@/components/ui/label';
import {Toggle} from '@/components/ui/toggle';
import {Select,SelectContent,SelectItem,SelectTrigger,SelectValue} from '@/components/ui/select';
import {ETAPAS_ATENDIMENTO,type ResponsavelAtendimento} from '@/lib/whatsapp-kanban';
import type {FiltrosKanban} from './kanban-filtros';

/** Barra de ferramentas do quadro: busca, responsável, "só sem classificação", etapa e atualizar. Controlada por props. */
export function BarraKanban({filtros,busca,onBusca,onFiltros,etapa,onEtapa,contagemPorEtapa,total,pessoas,movendo,onAtualizar}:{filtros:FiltrosKanban;/** Texto do campo: vai para o `q` da URL (busca no servidor), não para o filtro local. */busca:string;onBusca:(v:string)=>void;onFiltros:(f:FiltrosKanban)=>void;etapa:string;onEtapa:(e:string)=>void;contagemPorEtapa:Record<string,number>;total:number;pessoas:ResponsavelAtendimento[];movendo:boolean;onAtualizar:()=>void}){
 const valorResp=typeof filtros.responsavel==='number'?String(filtros.responsavel):filtros.responsavel;
 const rotuloResp=valorResp==='todos'?'Responsável':valorResp==='ninguem'?'Sem responsável':pessoas.find(p=>String(p.id)===valorResp)?.nome??'Responsável';
 return <div role="toolbar" aria-label="Ferramentas do quadro" className="flex flex-wrap items-center gap-2">
  <div className="min-w-48 flex-1 sm:max-w-xs"><Input type="search" className="h-8 text-sm" id="kanban-busca" name="busca" aria-label="Buscar no quadro" placeholder="Buscar no quadro" leftIcon={<Search aria-hidden="true"/>} value={busca} onChange={e=>onBusca(e.target.value)}/></div>
  <Select value={valorResp} onValueChange={v=>onFiltros({...filtros,responsavel:v==='todos'||v==='ninguem'?v:Number(v)})}><SelectTrigger id="kanban-filtro-responsavel" aria-label="Responsável" className="h-8 w-auto min-w-40 text-sm"><SelectValue placeholder="Responsável">{rotuloResp}</SelectValue></SelectTrigger><SelectContent><SelectItem value="todos">Todos os responsáveis</SelectItem><SelectItem value="ninguem">Sem responsável</SelectItem>{pessoas.map(p=><SelectItem key={p.id} value={String(p.id)}>{p.nome}</SelectItem>)}</SelectContent></Select>
  <Toggle variant="outline" className="h-8 text-sm data-[state=on]:border-marca-tint-texto/30 data-[state=on]:bg-marca-tint data-[state=on]:text-marca-tint-texto" pressed={filtros.soSemClassificacao} onPressedChange={v=>onFiltros({...filtros,soSemClassificacao:v})}>Só sem classificação</Toggle>
  <div className="flex items-center"><Label htmlFor="kanban-filtro-etapa" className="sr-only">Mostrar etapa</Label><Select value={etapa} onValueChange={onEtapa}><SelectTrigger id="kanban-filtro-etapa" className="h-8 w-auto min-w-48 text-sm"><SelectValue/></SelectTrigger><SelectContent><SelectItem value="todas">Todas as etapas ({total})</SelectItem>{ETAPAS_ATENDIMENTO.map(e=><SelectItem key={e.id} value={e.id}>{e.nome} ({contagemPorEtapa[e.id]??0})</SelectItem>)}</SelectContent></Select></div>
  <p className="ml-auto hidden text-xs text-muted-foreground xl:block">Arraste os cartões entre colunas. Mover não envia mensagem.</p>
  <Button variant="outline" size="sm" className="h-8 max-xl:ml-auto" disabled={movendo} onClick={onAtualizar}><RotateCw className="size-4" aria-hidden="true"/>Atualizar quadro</Button>
 </div>;
}
