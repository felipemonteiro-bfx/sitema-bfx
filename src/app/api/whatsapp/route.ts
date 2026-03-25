import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/guards';
import { getInstanceState, createInstance, logoutInstance } from '@/lib/evolution';

// GET /api/whatsapp — retorna estado e QR code da instância
export async function GET() {
  const ok = await requireAdmin();
  if (!ok) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const result = await getInstanceState();
  return NextResponse.json(result);
}

// POST /api/whatsapp — action: create | logout
export async function POST(req: Request) {
  const ok = await requireAdmin();
  if (!ok) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

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
