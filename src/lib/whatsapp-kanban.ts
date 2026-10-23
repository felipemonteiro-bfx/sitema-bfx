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
  return {versao:1,etapa:o.etapa,responsavelId:o.responsavelId,responsavelNome:o.responsavelNome.trim()==='Não atribuído'?SEM_RESPONSAVEL:o.responsavelNome,proximaAcao:o.proximaAcao};
 }catch{return null;}
}
/** Texto exibido sem responsável. Registros antigos gravaram "Não atribuído" no JSON: `lerEstadoKanban` normaliza. */
export const SEM_RESPONSAVEL='Sem responsável';
export const ESTADO_KANBAN_INICIAL:EstadoKanban={versao:1,etapa:'novas',responsavelId:null,responsavelNome:SEM_RESPONSAVEL,proximaAcao:'Revisar histórico e definir o próximo passo.'};
export type CartaoConversa={telefone:string;nome:string;ultimaMensagem:string;revisao:number;estado:EstadoKanban;classificado:boolean;/** Trecho da última mensagem (entrada ou saída); mídia vem como "[Foto]" etc. */ultimoTexto?:string};
export type ResponsavelAtendimento={id:number;nome:string};
export function movimentoKanban(c:CartaoConversa,etapa:string):{telefone:string;etapa:string;responsavelId:number|null;proximaAcao:string;revisao:number}|null{
 if(!ETAPAS_ATENDIMENTO.some(e=>e.id===etapa)||etapa===c.estado.etapa)return null;
 return {telefone:c.telefone,etapa,responsavelId:c.estado.responsavelId,proximaAcao:c.estado.proximaAcao,revisao:c.revisao};
}
export function resumoEventoKanban(corpo:string):string{
 const e=lerEstadoKanban(corpo);
 return e?`Quadro atualizado: ${ETAPAS_ATENDIMENTO.find(x=>x.id===e.etapa)?.nome}. Responsável: ${e.responsavelNome}. Próxima ação: ${e.proximaAcao}`:'Organização do quadro indisponível; conferir com a equipe.';
}
/** Telefone do WhatsApp para leitura: `+55 92 99999-0001` (DDI, DDD, número com hífen; 8 ou 9 dígitos). Fora do padrão BR passa só com "+". */
export function formatarTelefoneBr(telefone:string):string{
 const d=telefone.replace(/\D/g,'');
 if(d.startsWith('55')&&(d.length===12||d.length===13)){
  const numero=d.slice(4);const corte=numero.length-4;
  return `+55 ${d.slice(2,4)} ${numero.slice(0,corte)}-${numero.slice(corte)}`;
 }
 return d?`+${d}`:'';
}
/** Trecho da mensagem para o cartão: espaços colapsados, até 140 caracteres. */
export function resumirUltimoTexto(corpo:string,max=140):string{
 const limpo=corpo.replace(/\s+/g,' ').trim();
 return limpo.length>max?limpo.slice(0,max)+'…':limpo;
}

/** Contato sem nome salvo: o "nome" é só o próprio telefone (ou vazio). */
export function semNomeSalvo(nome:string,telefone:string):boolean{
 const d=nome.replace(/\D/g,'');
 return !nome.trim()||(!/\p{L}/u.test(nome)&&d===telefone.replace(/\D/g,''));
}
/** Nome para a tela: o salvo, ou o telefone formatado `+55 92 99407-0720` quando não há nome. */
export function nomeParaExibir(nome:string,telefone:string):string{
 return semNomeSalvo(nome,telefone)?(formatarTelefoneBr(telefone)||telefone):nome;
}
