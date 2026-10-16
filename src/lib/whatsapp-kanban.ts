export const ETAPAS_ATENDIMENTO = [
 {id:'novas',nome:'Novas'},
 {id:'em_atendimento',nome:'Em atendimento'},
 {id:'aguardando_cliente',nome:'Aguardando cliente'},
 {id:'aguardando_fornecedor',nome:'Aguardando fornecedor'},
 {id:'concluidas',nome:'Concluídas'},
] as const;
export type EtapaAtendimento=typeof ETAPAS_ATENDIMENTO[number]['id'];
export type EstadoKanban={versao:1;etapa:EtapaAtendimento;responsavelId:number|null;responsavelNome:string;proximaAcao:string};
export const ORIGEM_KANBAN='kanban_controle';
export function lerEstadoKanban(corpo:string):EstadoKanban|null{
 try{
  const o=JSON.parse(corpo);
  if(o?.versao!==1||!ETAPAS_ATENDIMENTO.some(e=>e.id===o.etapa)||!(o.responsavelId===null||Number.isSafeInteger(o.responsavelId)&&o.responsavelId>0)||typeof o.responsavelNome!=='string'||!o.responsavelNome.trim()||o.responsavelNome.length>160||typeof o.proximaAcao!=='string'||!o.proximaAcao.trim()||o.proximaAcao.length>500)return null;
  return {versao:1,etapa:o.etapa,responsavelId:o.responsavelId,responsavelNome:o.responsavelNome,proximaAcao:o.proximaAcao};
 }catch{return null;}
}
export const ESTADO_KANBAN_INICIAL:EstadoKanban={versao:1,etapa:'novas',responsavelId:null,responsavelNome:'Não atribuído',proximaAcao:'Revisar histórico e definir o próximo passo.'};
export type CartaoConversa={telefone:string;nome:string;ultimaMensagem:string;revisao:number;estado:EstadoKanban;classificado:boolean};
export type ResponsavelAtendimento={id:number;nome:string};
export function resumoEventoKanban(corpo:string):string{
 const e=lerEstadoKanban(corpo);
 return e?`Quadro atualizado: ${ETAPAS_ATENDIMENTO.find(x=>x.id===e.etapa)?.nome}. Responsável: ${e.responsavelNome}. Próxima ação: ${e.proximaAcao}`:'Organização do quadro indisponível; conferir com a equipe.';
}
