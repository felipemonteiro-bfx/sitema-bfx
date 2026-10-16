import Link from 'next/link';
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { ETAPAS_ATENDIMENTO } from '@/lib/whatsapp-kanban';
import { iniciais } from './status-mensagem';

export type ItemConversa = {
  telefone: string; nome: string; hora: string; previa: string; aguardando: boolean;
  etapa: string; etapaNome: string; responsavel: string;
};

/** Monta a URL da tela mantendo só os parâmetros que têm valor. */
export function urlAtendimento(base: string, p: { visao?: string; telefone?: string; q?: string; etapa?: string }): string {
  const qs = new URLSearchParams();
  for (const k of ['visao', 'telefone', 'q', 'etapa'] as const) {
    const v = p[k];
    if (v && !(k === 'etapa' && v === 'todas')) qs.set(k, v);
  }
  const s = qs.toString();
  return s ? `${base}?${s}` : base;
}

/** Alternador Lista/Kanban em links (funciona sem JS). Só a Lista carrega o telefone aberto. */
export function AlternarVisao({ base, visao, q, telefone }: { base: string; visao: string; q: string; telefone?: string }) {
  return <nav aria-label="Visualização das conversas" className="inline-flex rounded-controle bg-poco p-[3px]">
    {[{ id: 'lista', nome: 'Lista' }, { id: 'kanban', nome: 'Kanban' }].map(v =>
      <Link key={v.id} href={urlAtendimento(base, { visao: v.id, q, telefone: v.id === 'lista' ? telefone : undefined })} aria-current={visao === v.id ? 'page' : undefined}
        className={`inline-flex min-h-8 items-center rounded-lg px-2.5 text-xs ${visao === v.id ? 'bg-controle-ativo font-semibold text-foreground' : 'text-muted-foreground hover:text-foreground'}`}>{v.nome}</Link>)}
  </nav>;
}

/**
 * Busca por nome ou telefone: formulário GET comum, sem JS. Um campo só, com a lupa dentro do poço
 * (como no artboard); o envio é pelo Enter, sem botão de lupa separado.
 */
export function BuscaConversas({ visao, q, etapa, rotulo = 'Buscar nome ou telefone' }: { visao: string; q: string; etapa?: string; rotulo?: string }) {
  return <form role="search">
    <input type="hidden" name="visao" value={visao} />
    {etapa && etapa !== 'todas' && <input type="hidden" name="etapa" value={etapa} />}
    <label className="flex h-11 items-center gap-2.5 rounded-controle bg-poco px-3 text-sm text-muted-foreground focus-within:ring-2 focus-within:ring-ring">
      <Search className="size-4 shrink-0" aria-hidden="true" />
      <Input name="q" type="search" defaultValue={q} aria-label={rotulo} placeholder="Nome ou telefone" className="h-auto min-w-0 flex-1 border-0 bg-transparent p-0 hover:border-0 focus-visible:border-0 focus-visible:shadow-none focus-visible:ring-0" />
    </label>
  </form>;
}

type Props = {
  itens: ItemConversa[]; selecionado?: string; base: string; busca: string; visao: string; etapa: string;
  contagens: Record<string, number>;
};

/** Regra do limite da lista: fica no title do contador (e em texto só para leitor de tela), não num parágrafo no pé. */
const NOTA_LISTA = 'Até as 100 mais recentes. Contagens se referem a esta busca. Etapa do atendimento é independente da janela de envio.';

export function ConversaLista({ itens, selecionado, base, busca, visao, etapa, contagens }: Props) {
  const chips = [{ id: 'todas', nome: 'Todas' }, ...ETAPAS_ATENDIMENTO];
  return <section id="conversas" aria-label="Conversas" className="order-2 flex min-w-0 flex-col gap-3 rounded-painel border border-painel-borda bg-card pb-2 pt-3.5 dark:border-transparent lg:order-none">
    <div className="flex flex-wrap items-center justify-between gap-2 px-3">
      <h2 className="text-base font-semibold">Conversas <span title={NOTA_LISTA} className="cursor-help font-mono text-sm font-normal text-muted-foreground">{contagens.todas ?? itens.length}</span><span className="sr-only"> ({NOTA_LISTA})</span></h2>
      <AlternarVisao base={base} visao={visao} q={busca} telefone={selecionado} />
    </div>
    <div className="px-2"><BuscaConversas visao={visao} q={busca} etapa={etapa} /></div>
    <nav aria-label="Filtrar por etapa" className="flex gap-1.5 overflow-x-auto px-2 pb-1">
      {chips.map(c => {
        const ativo = etapa === c.id;
        return <Link key={c.id} href={urlAtendimento(base, { visao: 'lista', telefone: selecionado, q: busca, etapa: c.id })} aria-current={ativo ? 'true' : undefined}
          className={`inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full border px-2.5 text-xs transition-colors duration-[var(--mov-nav)] ${ativo ? 'border-marca-tint-texto/30 bg-marca-tint font-semibold text-marca-tint-texto' : 'border-divisoria text-muted-foreground hover:bg-controle'}`}>
          {c.nome}<span className="font-mono">{contagens[c.id] ?? 0}</span></Link>;
      })}
    </nav>
    <ul className="mx-2 flex max-h-[60vh] min-h-24 flex-col overflow-y-auto rounded-interno bg-poco py-1 lg:max-h-none lg:flex-1">
      {itens.map(c => {
        const atual = c.telefone === selecionado;
        return <li key={c.telefone}>
          <Link href={urlAtendimento(base, { visao: 'lista', telefone: c.telefone, q: busca, etapa })} aria-current={atual ? 'page' : undefined}
            className={`mx-1 flex items-center gap-3 rounded-controle p-3 transition-colors duration-[var(--mov-nav)] motion-reduce:transition-none ${atual ? 'bg-controle-ativo' : 'hover:bg-controle'}`}>
            <span aria-hidden="true" className={`flex size-11 shrink-0 items-center justify-center rounded-full font-display text-sm font-semibold ${c.aguardando ? 'bg-marca-tint text-marca-tint-texto' : 'bg-controle text-texto-secundario'}`}>{iniciais(c.nome)}</span>
            <span className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span className="flex items-baseline justify-between gap-2">
                <strong className="truncate text-sm font-semibold">{c.nome}</strong>
                <span className={`shrink-0 font-mono text-xs ${c.aguardando ? 'text-marca-tint-texto' : 'text-muted-foreground'}`}>{c.hora}</span>
              </span>
              <span className="flex items-center justify-between gap-2">
                <span className="truncate text-xs text-texto-secundario">{c.previa}</span>
                {c.aguardando && <span role="img" aria-label="Aguardando resposta" className="size-2.5 shrink-0 rounded-full bg-primary" />}
              </span>
              <span className="truncate text-xs text-muted-foreground">{c.etapaNome} · {c.responsavel}</span>
            </span>
          </Link>
        </li>;
      })}
      {!itens.length && <li className="p-4 text-center text-sm text-muted-foreground">Nenhuma conversa registrada nesta busca.</li>}
    </ul>
  </section>;
}
