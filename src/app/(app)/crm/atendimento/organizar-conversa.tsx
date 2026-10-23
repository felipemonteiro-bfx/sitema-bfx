'use client';
import {useRef,useState} from 'react';
import {useRouter} from 'next/navigation';
import {Settings2} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {Textarea} from '@/components/ui/textarea';
import {Label} from '@/components/ui/label';
import {FormSelect} from '@/components/form-select';
import {ETAPAS_ATENDIMENTO,type EstadoKanban,type EtapaAtendimento,type CartaoConversa,type ResponsavelAtendimento} from '@/lib/whatsapp-kanban';
import {salvarOrganizacaoConversa} from './kanban-actions';
import {formularioSujo} from './refresh-regras';

/**
 * "Organizar atendimento". `aberto`: formulário sempre aberto (painel de dados do contato, como no artboard);
 * sem `aberto`: recolhível em <details> (cartões do kanban). Nos dois, o wrapper leva `data-kanban-editor` e
 * `data-sujo="true"` enquanto há alteração não salva — é só isso que pausa o refresh de 30s.
 */
export function OrganizarConversa({cartao,pessoas,onAviso,onSalvo,disabled=false,aberto=false,classe='mx-3 mb-3 rounded-interno'}:{cartao:CartaoConversa;pessoas:ResponsavelAtendimento[];onAviso?:(mensagem:string)=>void;/** Salvou: sobe o estado e a revisão nova ao pai (a chave remonta e o formulário deixa de ficar sujo sem esperar o refresh). */onSalvo?:(telefone:string,estado:EstadoKanban,revisao:number)=>void;disabled?:boolean;aberto?:boolean;/** Margem e raio do bloco aberto. */classe?:string}){
 // Remonta quando o cartão é salvo/atualizado (revisão nova): os campos voltam a refletir o que está gravado.
 return <OrganizarInterno key={`${cartao.telefone}-${cartao.revisao}`} cartao={cartao} pessoas={pessoas} onAviso={onAviso} onSalvo={onSalvo} disabled={disabled} aberto={aberto} classe={classe}/>;
}

function OrganizarInterno({cartao,pessoas,onAviso,onSalvo,disabled,aberto,classe}:{cartao:CartaoConversa;pessoas:ResponsavelAtendimento[];onAviso?:(mensagem:string)=>void;onSalvo?:(telefone:string,estado:EstadoKanban,revisao:number)=>void;disabled:boolean;aberto:boolean;classe:string}){
 const router=useRouter();const detalhes=useRef<HTMLDetailsElement>(null);
 const [busy,setBusy]=useState(false);const [aviso,setAviso]=useState('');const sufixo=cartao.telefone;
 const original={etapa:cartao.estado.etapa as string,responsavel:String(cartao.estado.responsavelId??''),acao:cartao.estado.proximaAcao};
 // Campos controlados: o FormSelect guarda o valor em estado e o "sujo" sai da comparação com o que está salvo.
 const [atual,setAtual]=useState(original);const sujo=formularioSujo(atual,original);
 const opcoesResponsavel=[{value:'',label:'Sem responsável'},...(cartao.estado.responsavelId&&!pessoas.some(p=>p.id===cartao.estado.responsavelId)?[{value:String(cartao.estado.responsavelId),label:`${cartao.estado.responsavelNome} (revisar atribuição)`}]:[]),...pessoas.map(p=>({value:String(p.id),label:p.nome}))];
 const formulario=<form className={aberto?'space-y-3':'mt-3 space-y-3'} onSubmit={async e=>{e.preventDefault();if(busy)return;setBusy(true);setAviso('');try{const id=atual.responsavel;const r=await salvarOrganizacaoConversa({telefone:cartao.telefone,etapa:atual.etapa,responsavelId:id?Number(id):null,proximaAcao:atual.acao,revisao:cartao.revisao});setAviso(r.message);onAviso?.(`${cartao.nome}: ${r.message}`);if(r.ok){if(detalhes.current)detalhes.current.open=false;if(r.revisao){const resp=id?pessoas.find(p=>p.id===Number(id)):null;onSalvo?.(cartao.telefone,{versao:1,etapa:atual.etapa as EtapaAtendimento,responsavelId:id?Number(id):null,responsavelNome:resp?.nome??(id?cartao.estado.responsavelNome:'Sem responsável'),proximaAcao:atual.acao.trim()},r.revisao);}router.refresh();}}catch{setAviso('Não foi possível confirmar o salvamento. Atualize e confira antes de repetir.');onAviso?.('Não foi possível confirmar o salvamento. Atualize e confira antes de repetir.');}finally{setBusy(false);}}}>
   <fieldset disabled={busy||disabled} className="space-y-3">
    <div className="flex flex-col gap-1.5"><Label htmlFor={`etapa-${sufixo}`}>Etapa</Label><FormSelect id={`etapa-${sufixo}`} name="etapa" value={atual.etapa} onValueChange={v=>setAtual(a=>({...a,etapa:v}))} searchable={false} options={ETAPAS_ATENDIMENTO.map(e=>({value:e.id,label:e.nome}))}/></div>
    <div className="flex flex-col gap-1.5"><Label htmlFor={`responsavel-${sufixo}`}>Responsável</Label><FormSelect id={`responsavel-${sufixo}`} name="responsavel" value={atual.responsavel} onValueChange={v=>setAtual(a=>({...a,responsavel:v}))} searchable={false} options={opcoesResponsavel}/></div>
    <div className="flex flex-col gap-1.5 [&_textarea]:min-h-16"><Label htmlFor={`acao-${sufixo}`}>Próxima ação</Label><Textarea id={`acao-${sufixo}`} name="acao" value={atual.acao} onChange={e=>{const v=e.target.value;setAtual(a=>({...a,acao:v}));}} maxLength={500} required/></div>
    <div className={aberto?'grid gap-2':'flex flex-wrap gap-2'}><Button size="sm" type="submit" variant={aberto?'secondary':'default'}>{busy?'Salvando…':'Salvar cartão'}</Button>{(!aberto||sujo)&&<Button size="sm" type="button" variant="ghost" onClick={()=>{setAtual(original);if(detalhes.current)detalhes.current.open=false;setAviso('');}}>Cancelar</Button>}</div>
   </fieldset>
  </form>;
 const nota=aviso&&<p role="status" className="mt-2 text-sm leading-relaxed text-texto-secundario">{aviso}</p>;
 if(aberto)return <div data-kanban-editor data-sujo={sujo?'true':'false'} className={`${classe} bg-poco p-3.5`}><h3 className="mb-3 text-sm font-semibold">Organizar atendimento</h3>{formulario}{nota}</div>;
 return <div className="mt-3 border-t border-divisoria pt-3"><details ref={detalhes} data-kanban-editor data-sujo={sujo?'true':'false'}><summary className="flex min-h-11 cursor-pointer items-center gap-2 text-sm font-semibold"><Settings2 className="size-4"/>Organizar atendimento</summary>
  {formulario}
 </details>{nota}</div>;
}
