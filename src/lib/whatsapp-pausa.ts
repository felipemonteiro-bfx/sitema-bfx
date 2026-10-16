export function inicioDaPausa(agora:Date,minutos:number,controle:{origem:string;criadoEm:Date}|null):Date|null {
  if(controle?.origem==='controle_pausa')return null;
  const inicio=new Date(agora.getTime()-Math.max(5,minutos)*60_000);
  return controle?.origem==='controle_retomada'&&controle.criadoEm>inicio?controle.criadoEm:inicio;
}
