import { requireAdmin } from '@/lib/guards';
import { TelaAtendimento, type ParametrosAtendimento } from './tela-atendimento';
export const dynamic='force-dynamic';
export default async function Page({searchParams}:{searchParams:Promise<ParametrosAtendimento>}) {
  if(!await requireAdmin())return <p>Acesso restrito ao atendimento autorizado.</p>;
  return <TelaAtendimento searchParams={searchParams} modo="sistema"/>;
}
