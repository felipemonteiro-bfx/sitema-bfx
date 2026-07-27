import { NextResponse, type NextRequest } from 'next/server';
import { requireAdmin } from '@/lib/guards';
import { prisma } from '@/lib/db';

/**
 * Normaliza a base URL da instancia LiteLLM:
 * - adiciona https:// quando o usuario digita so o host
 * - remove barra final
 * - remove sufixo /v1 (senao a chamada viraria /v1/v1/models)
 */
function normalizeBaseUrl(raw: string): string {
  let url = raw.trim();
  if (!url) return '';
  if (!/^https?:\/\//i.test(url)) url = `https://${url}`;
  url = url.replace(/\/+$/, '');
  url = url.replace(/\/v1$/i, '');
  return url;
}

async function fetchModels(baseUrl: string, key: string): Promise<string[]> {
  const headers: Record<string, string> = key ? { Authorization: `Bearer ${key}` } : {};
  let lastStatus = 0;

  // LiteLLM expoe as duas rotas; /v1/models e a canonica, /models e o alias.
  for (const path of ['/v1/models', '/models']) {
    const res = await fetch(`${baseUrl}${path}`, {
      headers,
      cache: 'no-store',
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) {
      lastStatus = res.status;
      continue;
    }
    const data = await res.json();
    const models: string[] = (data?.data ?? [])
      .map((m: { id?: string }) => m?.id)
      .filter((id: unknown): id is string => typeof id === 'string' && id.length > 0)
      .sort((a: string, b: string) => a.localeCompare(b));
    if (models.length) return models;
  }

  if (lastStatus === 401 || lastStatus === 403) {
    throw new Error('Chave da API recusada pela instancia LiteLLM (401/403).');
  }
  if (lastStatus) {
    throw new Error(`Instancia LiteLLM respondeu HTTP ${lastStatus} em /v1/models.`);
  }
  return [];
}

export async function GET(request: NextRequest) {
  const ok = await requireAdmin();
  if (!ok) return NextResponse.json({ models: [], error: 'Unauthorized' }, { status: 401 });

  // Permite testar valores ainda nao salvos (digitados no formulario de Configuracoes),
  // eliminando o "salve a URL e a chave primeiro".
  const qsUrl = request.nextUrl.searchParams.get('url')?.trim() || '';
  const qsKey = request.nextUrl.searchParams.get('key')?.trim() || '';

  let cfg: { litellmUrl: string | null; litellmKey: string | null } | null = null;
  try {
    cfg = await prisma.config.findFirst({ select: { litellmUrl: true, litellmKey: true } });
  } catch {
    // colunas podem nao existir em bases antigas
  }

  const baseUrl = normalizeBaseUrl(qsUrl || cfg?.litellmUrl || process.env.LITELLM_URL || '');
  const key = qsKey || cfg?.litellmKey || process.env.LITELLM_KEY || '';

  if (!baseUrl) {
    return NextResponse.json({ models: [], error: 'Informe a URL da instancia LiteLLM.' });
  }

  try {
    const models = await fetchModels(baseUrl, key);
    if (!models.length) {
      return NextResponse.json({
        models: [],
        error: 'A instancia respondeu, mas nenhum modelo esta liberado para esta chave.',
      });
    }
    return NextResponse.json({ models });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    const friendly =
      e instanceof Error && e.name === 'TimeoutError'
        ? 'Tempo esgotado ao contatar a instancia LiteLLM.'
        : msg;
    return NextResponse.json({ models: [], error: friendly });
  }
}
