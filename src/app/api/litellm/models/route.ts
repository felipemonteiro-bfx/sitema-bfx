import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/guards';
import { prisma } from '@/lib/db';

export async function GET() {
  const ok = await requireAdmin();
  if (!ok) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const cfg = await prisma.config.findFirst();
    const url = cfg?.litellmUrl?.replace(/\/$/, '') || process.env.LITELLM_URL;
    const key = cfg?.litellmKey || process.env.LITELLM_KEY;

    if (!url) return NextResponse.json({ models: [] });

    const res = await fetch(`${url}/v1/models`, {
      headers: key ? { Authorization: `Bearer ${key}` } : {},
      signal: AbortSignal.timeout(5000),
    });

    if (!res.ok) return NextResponse.json({ models: [] });

    const data = await res.json();
    const models: string[] = (data?.data ?? []).map((m: { id: string }) => m.id).sort();
    return NextResponse.json({ models });
  } catch {
    return NextResponse.json({ models: [] });
  }
}
