import { prisma } from './db';

export type InstanceState = 'open' | 'connecting' | 'close' | 'unknown';

type EvolutionConfig = {
  url: string;
  key: string;
  instance: string;
};

async function getEvolutionConfig(): Promise<EvolutionConfig | null> {
  let cfg;
  try { cfg = await prisma.config.findFirst(); } catch { /* fallback de ambiente */ }
  const url = cfg?.evolutionApiUrl?.trim() || process.env.EVOLUTION_API_URL?.trim();
  const key = cfg?.evolutionApiKey?.trim() || process.env.EVOLUTION_API_KEY?.trim();
  const instance = cfg?.evolutionInstance?.trim() || process.env.EVOLUTION_INSTANCE?.trim() || 'bfx';
  return url && key ? {url:url.replace(/\/$/,''),key,instance} : null;
}

async function evolutionFetch(
  path: string,
  options: RequestInit = {},
  config?: EvolutionConfig,
): Promise<Response> {
  const cfg = config ?? (await getEvolutionConfig());
  if (!cfg) throw new Error('Evolution API não configurada.');
  return fetch(`${cfg.url}${path}`, {
    signal: AbortSignal.timeout(15000),
    ...options,
    headers: {
      'Content-Type': 'application/json',
      apikey: cfg.key,
      ...(options.headers as Record<string, string> | undefined),
    },
  });
}

export async function getInstanceState(): Promise<{ state: InstanceState; qrcode?: string }> {
  const cfg = await getEvolutionConfig();
  if (!cfg) return { state: 'unknown' };

  try {
    // Tenta pegar estado da instância
    const stateRes = await evolutionFetch(`/instance/connectionState/${cfg.instance}`, {}, cfg);
    if (stateRes.ok) {
      const data = await stateRes.json();
      const state: InstanceState = data?.instance?.state ?? data?.state ?? 'close';
      if (state === 'open') return { state: 'open' };
    }

    // Se não conectado, tenta obter QR code
    const connectRes = await evolutionFetch(`/instance/connect/${cfg.instance}`, {}, cfg);
    if (connectRes.ok) {
      const data = await connectRes.json();
      // Evolution API retorna base64 com ou sem data URI prefix
      let qrcode: string | undefined = data?.qrcode?.base64 ?? data?.base64 ?? data?.qrcode;
      if (qrcode && !qrcode.startsWith('data:')) {
        qrcode = `data:image/png;base64,${qrcode}`;
      }
      return { state: 'connecting', qrcode };
    }

    return { state: 'close' };
  } catch {
    return { state: 'unknown' };
  }
}

export async function createInstance(qrcode = true): Promise<boolean> {
  const cfg = await getEvolutionConfig();
  if (!cfg) return false;

  try {
    const res = await evolutionFetch(
      '/instance/create',
      {
        method: 'POST',
        body: JSON.stringify({
          instanceName: cfg.instance,
          qrcode,
          syncFullHistory: false,
          groupsIgnore: true,
          readMessages: false,
          readStatus: false,
          integration: 'WHATSAPP-BAILEYS',
        }),
      },
      cfg,
    );
    return res.ok || res.status === 409; // 409 = já existe, tudo bem
  } catch {
    return false;
  }
}

export async function logoutInstance(): Promise<boolean> {
  const cfg = await getEvolutionConfig();
  if (!cfg) return false;

  try {
    const res = await evolutionFetch(
      `/instance/logout/${cfg.instance}`,
      { method: 'DELETE' },
      cfg,
    );
    return res.ok;
  } catch {
    return false;
  }
}

export async function sendTextMessage(phone: string, text: string): Promise<boolean> {
  const cfg = await getEvolutionConfig();
  if (!cfg) return false;

  // Normaliza número: remove não-dígitos, adiciona 55 se necessário
  const digits = phone.replace(/\D/g, '');
  const normalized = digits.startsWith('55') ? digits : `55${digits}`;

  try {
    const res = await evolutionFetch(
      `/message/sendText/${cfg.instance}`,
      {
        method: 'POST',
        body: JSON.stringify({
          number: normalized,
          text,
        }),
      },
      cfg,
    );
    return res.ok;
  } catch {
    return false;
  }
}

/** Consulta sem conectar: o polling nunca invalida o QR que o usuário está escaneando. */
export async function getEvolutionConnectionState(): Promise<{state:InstanceState}> {
  const cfg = await getEvolutionConfig();
  if (!cfg) return {state:'unknown'};
  try {
    const r=await evolutionFetch(`/instance/connectionState/${encodeURIComponent(cfg.instance)}`,{},cfg);
    if(!r.ok)return {state:'close'};
    const data=await r.json(); const state=data.instance?.state??data.state;
    return {state:state==='open'?'open':state==='connecting'?'connecting':'close'};
  } catch {return {state:'unknown'};}
}

export async function connectEvolutionQR():Promise<{state:InstanceState;qrcode?:string;error?:string}> {
 const cfg=await getEvolutionConfig();
 if(!cfg)return {state:'unknown',error:'A conexão do servidor ainda não está configurada.'};
 try {
  const estado=await evolutionFetch(`/instance/connectionState/${encodeURIComponent(cfg.instance)}`,{},cfg);
  if(estado.ok){const d=await estado.json();if((d.instance?.state??d.state)==='open')return {state:'open'};}
  else if(estado.status!==404)return {state:'unknown',error:'Não foi possível acessar a conexão. Tente novamente.'};
  else if(!await createInstance(false))return {state:'close',error:'Não foi possível preparar a conexão. Tente novamente.'};
  const origin=process.env.NEXT_PUBLIC_APP_URL || 'https://bfx.softlive.dev';
  const webhook=await evolutionFetch(`/webhook/set/${encodeURIComponent(cfg.instance)}`,{method:'POST',body:JSON.stringify({webhook:{enabled:true,url:new URL('/api/webhooks/evolution',origin).toString(),headers:{'x-evolution-apikey':process.env.EVOLUTION_WEBHOOK_SECRET||cfg.key},byEvents:false,base64:false,events:['MESSAGES_UPSERT','MESSAGES_UPDATE']}})},cfg);
  if(!webhook.ok)return {state:'close',error:'Não foi possível preparar o recebimento das mensagens. Tente novamente.'};
  const res=await evolutionFetch(`/instance/connect/${encodeURIComponent(cfg.instance)}`,{},cfg);
  if(!res.ok)return {state:'close',error:'Não foi possível gerar o QR Code. Tente novamente.'};
  const data=await res.json();const raw=data.qrcode?.base64??data.base64;
  if(typeof raw!=='string'||!raw)return {state:'connecting',error:'O QR Code ainda não está disponível. Clique em Gerar QR Code novamente.'};
  const qrcode=raw.startsWith('data:')?raw:`data:image/png;base64,${raw}`;
  if(!/^data:image\/png;base64,[A-Za-z0-9+/=]+$/.test(qrcode)||qrcode.length>200000)return {state:'close',error:'O servidor retornou um QR Code inválido.'};
  return {state:'connecting',qrcode};
 }catch{return {state:'unknown',error:'O servidor de conexão não respondeu. Tente novamente.'};}
}
