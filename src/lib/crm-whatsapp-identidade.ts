import { variantesLocaisDeTelefone } from '@/lib/telefone-busca';
export function identificarContato<T extends {id:number;telefone:string|null}>(telefone:string,clientes:readonly T[]):T|null {
  const variantes=new Set(variantesLocaisDeTelefone(telefone));
  const matches=clientes.filter(c=>variantesLocaisDeTelefone(c.telefone||'').some(t=>variantes.has(t)));
  return matches.length===1?matches[0]:null;
}
