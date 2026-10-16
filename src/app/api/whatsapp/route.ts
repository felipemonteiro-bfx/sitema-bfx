import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/guards';
import { getInstanceState, createInstance, logoutInstance } from '@/lib/evolution';
import { prisma } from '@/lib/db';

const present = (value: unknown) => typeof value === 'string' && value.trim().length > 0;
const isMeta = (cfg: Record<string, unknown> | null) =>
  (cfg?.whatsappProvider || process.env.WHATSAPP_PROVIDER) === 'meta_cloud';

// GET /api/whatsapp — retorna estado e QR code da instância
export async function GET() {
  const ok = await requireAdmin();
  if (!ok) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const cfg = await prisma.config.findFirst() as Record<string, unknown> | null;
  if (isMeta(cfg)) {
    // Presença de configuração não comprova registro do número, assinatura do
    // webhook ou entrega. Não consultar/criar uma instância Evolution aqui.
    return NextResponse.json({ provider: 'meta_cloud', state: 'unknown', meta: {
      phoneConfigured: /^\d+$/.test(String(cfg?.metaWhatsappPhoneNumberId || process.env.META_WHATSAPP_PHONE_NUMBER_ID || '').trim()),
      tokenConfigured: present(cfg?.metaWhatsappToken) || present(process.env.META_WHATSAPP_TOKEN),
      appSecretConfigured: present(cfg?.metaAppSecret) || present(process.env.META_APP_SECRET),
      verifyTokenConfigured: present(cfg?.metaWebhookVerifyToken) || present(process.env.META_WHATSAPP_VERIFY_TOKEN),
      sendingEnabled: cfg?.whatsappAutoEnabled !== undefined
        ? cfg.whatsappAutoEnabled === 1 : process.env.WHATSAPP_AUTO_ENABLED !== '0',
    } }, { headers: { 'Cache-Control': 'no-store' } });
  }
  const result = await getInstanceState();
  return NextResponse.json({ ...result, provider: 'evolution' }, { headers: { 'Cache-Control': 'no-store' } });
}

// POST /api/whatsapp — action: create | logout
export async function POST(req: Request) {
  const ok = await requireAdmin();
  if (!ok) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const cfg = await prisma.config.findFirst() as Record<string, unknown> | null;
  if (isMeta(cfg)) {
    return NextResponse.json({ error: 'A Meta Cloud API não usa conexão por QR Code da Evolution. Conclua a vinculação do número na Meta.' }, { status: 409 });
  }

  const body = await req.json().catch(() => ({}));
  const action: string = body?.action ?? 'create';

  if (action === 'logout') {
    const success = await logoutInstance();
    return NextResponse.json({ success });
  }

  // create (ou reconectar)
  const success = await createInstance();
  if (!success) {
    return NextResponse.json({ error: 'Falha ao criar instância. Verifique a URL e a chave da Evolution API.' }, { status: 502 });
  }
  const result = await getInstanceState();
  return NextResponse.json(result);
}
