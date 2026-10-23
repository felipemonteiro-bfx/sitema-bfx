import { requireAdmin } from '@/lib/guards';
import { TelaAtendimento, type ParametrosAtendimento } from '@/app/(app)/crm/atendimento/tela-atendimento';
import Link from 'next/link';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'WhatsApp BFX' };

/**
 * Tela própria do atendimento: tela cheia, sem a sidebar do sistema (cabeçalho fino
 * "WhatsApp BFX" + estado da integração + "Voltar ao sistema"). Reaproveita os mesmos
 * componentes do atendimento normal e a mesma guarda `requireAdmin`.
 */
export default async function Page({ searchParams }: { searchParams: Promise<ParametrosAtendimento> }) {
  if (!await requireAdmin()) {
    return <main className="p-6"><h1 className="font-display text-lg font-semibold">WhatsApp BFX</h1><p className="mt-2">Acesso restrito ao atendimento autorizado.</p><Link href="/dashboard" className="mt-4 inline-flex min-h-11 items-center font-semibold text-primary underline underline-offset-4">Voltar ao sistema</Link></main>;
  }
  return <TelaAtendimento searchParams={searchParams} modo="janela" />;
}
