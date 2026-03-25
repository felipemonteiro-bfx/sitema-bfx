import { prisma } from './db';

export type InstanceState = 'open' | 'connecting' | 'close' | 'unknown';

type EvolutionConfig = {
  url: string;
  key: string;
  instance: string;
};

async function getEvolutionConfig(): Promise<EvolutionConfig | null> {
  const url = process.env.EVOLUTION_API_URL;
  const key = process.env.EVOLUTION_API_KEY;
  const instance = process.env.EVOLUTION_INSTANCE;

  if (url && key) {
    return { url: url.replace(/\/$/, ''), key, instance: instance || 'bfx' };
  }

  try {
    const cfg = await prisma.config.findFirst();
    if (cfg?.evolutionApiUrl && cfg?.evolutionApiKey) {
      return {
        url: cfg.evolutionApiUrl.replace(/\/$/, ''),
        key: cfg.evolutionApiKey,
        instance: cfg.evolutionInstance || 'bfx',
      };
    }
  } catch {
    // DB não disponível
  }
  return null;
}

async function evolutionFetch(
  path: string,
  options: RequestInit = {},
  config?: EvolutionConfig,
): Promise<Response> {
  const cfg = config ?? (await getEvolutionConfig());
  if (!cfg) throw new Error('Evolution API não configurada.');
  return fetch(`${cfg.url}${path}`, {
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

export async function createInstance(): Promise<boolean> {
  const cfg = await getEvolutionConfig();
  if (!cfg) return false;

  try {
    const res = await evolutionFetch(
      '/instance/create',
      {
        method: 'POST',
        body: JSON.stringify({
          instanceName: cfg.instance,
          qrcode: true,
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
