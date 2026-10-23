import type {CartaoConversa} from '@/lib/whatsapp-kanban';

export type FiltrosKanban={busca:string;responsavel:'todos'|'ninguem'|number;soSemClassificacao:boolean};

const semAcento=(s:string)=>s.normalize('NFD').split(/[̀-ͯ]/).join('').toLowerCase().trim();
const soDigitos=(s:string)=>s.split(/\D+/).join('');

/** Filtros do quadro, combinados com E. Não altera a ordem nem os cartões. */
export function filtrarCartoes(cartoes:CartaoConversa[],f:FiltrosKanban):CartaoConversa[]{
 const termo=semAcento(f.busca);const digitos=soDigitos(f.busca);
 return cartoes.filter(c=>{
  if(termo&&!(semAcento(c.nome).includes(termo)||(digitos&&soDigitos(c.telefone).includes(digitos))))return false;
  if(f.responsavel==='ninguem'&&c.estado.responsavelId!==null)return false;
  if(typeof f.responsavel==='number'&&c.estado.responsavelId!==f.responsavel)return false;
  if(f.soSemClassificacao&&c.classificado)return false;
  return true;
 });
}
