import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/guards";
import { lerDetalheFechamento } from "@/lib/fechamento-leitura";
import FechamentoDetalheClient from "@/components/fechamento-detalhe-client";

export const dynamic = "force-dynamic";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const ok = await requireAdmin();
  if (!ok) return <div>Acesso restrito.</div>;

  const { id } = await params;
  const fechamentoId = Number(id);
  if (!Number.isInteger(fechamentoId) || fechamentoId <= 0) notFound();
  const detalhe = await lerDetalheFechamento(fechamentoId);
  if (!detalhe) notFound();

  return <FechamentoDetalheClient d={detalhe} />;
}
