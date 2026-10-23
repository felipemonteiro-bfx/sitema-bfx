/** Só mensagens novas do dispositivo; nunca histórico ou eventos de grupos. */
export function eventoEvolution(valor:unknown):string{return typeof valor==='string'?valor.replaceAll('.','_').toUpperCase():'';}
export function mensagemNovaEvolution(data:Record<string,unknown>,agora=Date.now()):{telefone:string;id:string;texto:string;fromMe:boolean;humano:boolean}|null {
 const key=data.key as {remoteJid?:unknown;id?:unknown;fromMe?:unknown}|undefined;
 if(typeof key?.remoteJid!=='string'||!/^\d{10,15}@s\.whatsapp\.net$/.test(key.remoteJid)||typeof key.id!=='string'||!key.id||key.id.length>200)return null;
 const timestamp=Number(data.messageTimestamp)*1000;
 if(!Number.isFinite(timestamp)||timestamp<agora-300000||timestamp>agora+30000)return null;
 const message=data.message as {conversation?:unknown;extendedTextMessage?:{text?:unknown}}|undefined;
 const text=message?.conversation??message?.extendedTextMessage?.text;
 const texto=typeof text==='string'?text.slice(0,4096):'[Mídia recebida no WhatsApp conectado — confira no celular]';
 const source=typeof data.source==='string'?data.source.toLowerCase():'';
 return {telefone:key.remoteJid.split('@')[0],id:`evolution:${key.id}`,texto,fromMe:key.fromMe===true,humano:['android','ios','web'].includes(source)};
}
export function statusEvolution(data:Record<string,unknown>):{id:string;status:'enviado'|'entregue'|'lido'}|null {
 const key=data.key as {id?:unknown}|undefined;
 const id=key?.id??data.keyId??data.messageId;
 const update=data.update as {status?:unknown}|undefined;
 const raw=update?.status??data.status;
 const status=raw===2||raw==='SERVER_ACK'||raw==='SENT'?'enviado':raw===3||raw==='DELIVERY_ACK'?'entregue':raw===4||raw===5||raw==='READ'||raw==='PLAYED'?'lido':null;
 return typeof id==='string'&&id.length>0&&id.length<=200&&status?{id:`evolution:${id}`,status}:null;
}
