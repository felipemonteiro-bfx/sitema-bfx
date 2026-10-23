'use client';
import { useEffect, useRef, useState } from 'react';
import { Search } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { formatBRL } from '@/lib/utils';
import { dataDiaMes, textoEstoque, textoResumoParcelas, textoSegundaVia } from '@/lib/atendimento-atalhos-texto';
import type { ItemEstoque } from '@/lib/atendimento-atalhos';
import { boletosDoContato, buscarEstoqueAtalho, parcelasDoContato } from './atalhos-actions';
import { filtrarProntas } from './composer-regras';
import { DEBOUNCE_MS, ROTULO_SITUACAO, contarVencidas, proximoVencimento, termoBuscavel } from './atalhos-regras';

/**
 * Painel dos atalhos rápidos (Estoque, Parcelas, Boletos). Inserir SÓ entrega o
 * texto ao pai (`onInserir`), que preenche o campo; nada aqui envia mensagem.
 */

type Resp<T> = Awaited<T>;
type RespParcelas = Extract<Resp<ReturnType<typeof parcelasDoContato>>, { ok: true }>;
type RespBoletos = Extract<Resp<ReturnType<typeof boletosDoContato>>, { ok: true }>;
type Carga<T> = { estado: 'carregando' } | { estado: 'erro'; mensagem: string } | { estado: 'ok'; dados: T };

const LINHA = 'flex flex-wrap items-center gap-x-3 gap-y-2 rounded-controle px-2.5 py-2.5 hover:bg-controle';
const LISTA = 'flex flex-col rounded-controle bg-card-elevated p-1';

/** Botão de inserir do artboard (tint de marca). O invólucro cuida do lugar na linha. */
function BotaoInserir({ onClick, children, grande }: { onClick: () => void; children: React.ReactNode; grande?: boolean }) {
  return <span className={grande ? 'self-end' : 'ml-auto shrink-0'}><Button type="button" variant="tint" size="sm" onClick={onClick}>{children}</Button></span>;
}

function Aviso({ children, erro }: { children: React.ReactNode; erro?: boolean }) {
  return <p role={erro ? 'alert' : 'status'} className={`rounded-controle bg-card-elevated px-3 py-4 text-center text-sm ${erro ? 'text-error-text' : 'text-texto-secundario'}`}>{children}</p>;
}

function Carregando() {
  return <div role="status" aria-label="Carregando" className="flex flex-col gap-2 rounded-controle bg-card-elevated p-3 [&>*]:h-9 [&>*:nth-child(2)]:w-4/5"><Skeleton /><Skeleton /><Skeleton /></div>;
}

/* ---------- Respostas prontas ---------- */

type ProntaItem = { titulo: string; texto: string; atalho?: string };

function AbaProntas({ prontas, onInserir }: { prontas: readonly ProntaItem[]; onInserir: (texto: string) => void }) {
  const [termo, setTermo] = useState('');
  const itens = filtrarProntas(prontas, termo.replace(/^\//, ''));
  return <div className="flex flex-col gap-2.5">
    <Input aria-label="Buscar resposta pronta" placeholder="Buscar resposta pronta (ex.: pagamento)" autoComplete="off" leftIcon={<Search className="size-4" aria-hidden="true" />} value={termo} onChange={(e) => setTermo(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') e.preventDefault(); }} />
    {itens.length === 0 ? <Aviso>Nenhuma resposta pronta com esse termo.</Aviso> : <ul aria-label="Respostas prontas" className={`${LISTA} max-h-72 overflow-y-auto`}>
      {itens.map((p) => <li key={p.titulo} className="[&>button]:h-auto [&>button]:w-full [&>button]:flex-col [&>button]:items-stretch [&>button]:gap-0.5 [&>button]:px-2.5 [&>button]:py-2.5 [&>button]:text-left [&>button]:font-normal">
        <Button type="button" variant="ghost" onClick={() => onInserir(p.texto)}>
          <span className="flex items-center justify-between gap-3"><span className="text-sm font-semibold">{p.titulo}</span>{p.atalho && <span className="font-mono text-xs text-texto-secundario">/{p.atalho}</span>}</span>
          <span className="line-clamp-2 whitespace-normal text-xs text-texto-secundario">{p.texto}</span>
        </Button>
      </li>)}
    </ul>}
  </div>;
}

/* ---------- Estoque ---------- */

export function ListaEstoque({ itens, destaque, onDestacar, onInserir }: {
  itens: readonly ItemEstoque[]; destaque: number; onDestacar: (i: number) => void; onInserir: (item: ItemEstoque) => void;
}) {
  return <ul aria-label="Resultados do estoque" className={`${LISTA} max-h-72 overflow-y-auto`}>
    {itens.map((p, i) => <li key={`${p.nome}-${i}`} onMouseEnter={() => onDestacar(i)} onFocus={() => onDestacar(i)} className={`${LINHA} ${i === destaque ? 'bg-controle' : ''}`}>
      <div className="min-w-0 flex-1 basis-40">
        <div className="truncate text-sm font-medium" title={p.nome}>{p.nome}</div>
        <div className="truncate text-xs text-texto-secundario">
          {p.categoria ?? 'Sem categoria'}
          {p.aproximado && <span> · aproximado</span>}
        </div>
      </div>
      {p.quantidade > 0 ? <Badge variant="marca"><span className="font-mono">{p.quantidade} un.</span></Badge> : <Badge variant="neutro">Sem estoque</Badge>}
      <BotaoInserir onClick={() => onInserir(p)}><span>Inserir</span><span className="sr-only"> {p.nome}</span></BotaoInserir>
    </li>)}
  </ul>;
}

function AbaEstoque({ onInserir }: { onInserir: (texto: string) => void }) {
  const [termo, setTermo] = useState('');
  const [carga, setCarga] = useState<Carga<ItemEstoque[]> | null>(null);
  const [destaque, setDestaque] = useState(0);
  const seq = useRef(0);

  // Debounce + descarte de resposta atrasada (só a última busca vale).
  useEffect(() => {
    const t = termo.trim();
    const minha = ++seq.current;
    if (!termoBuscavel(t)) { setCarga(null); return; }
    setCarga({ estado: 'carregando' });
    const timer = setTimeout(async () => {
      try {
        const r = await buscarEstoqueAtalho(t);
        if (minha !== seq.current) return;
        setDestaque(0);
        setCarga(r.ok ? { estado: 'ok', dados: r.itens } : { estado: 'erro', mensagem: r.message });
      } catch {
        if (minha === seq.current) setCarga({ estado: 'erro', mensagem: 'Não foi possível consultar o estoque agora.' });
      }
    }, DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [termo]);

  const itens = carga?.estado === 'ok' ? carga.dados : [];
  const previa = itens[Math.min(destaque, itens.length - 1)];
  return <div className="flex flex-col gap-2.5">
    <Input aria-label="Buscar produto no estoque" placeholder="Buscar produto (ex.: lavadora 14 kg)" autoComplete="off" leftIcon={<Search className="size-4" aria-hidden="true" />} value={termo} onChange={(e) => setTermo(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') e.preventDefault(); }} />
    {carga === null && <Aviso>Digite ao menos 2 letras do produto para consultar o estoque.</Aviso>}
    {carga?.estado === 'carregando' && <Carregando />}
    {carga?.estado === 'erro' && <Aviso erro>{carga.mensagem}</Aviso>}
    {carga?.estado === 'ok' && !itens.length && <Aviso>Nenhum produto encontrado para &quot;{termo.trim()}&quot;.</Aviso>}
    {itens.length > 0 && <ListaEstoque itens={itens} destaque={destaque} onDestacar={setDestaque} onInserir={(p) => onInserir(textoEstoque(p))} />}
    {previa && <p className="line-clamp-2 text-xs text-texto-secundario">Prévia do que entra no campo: <span className="text-foreground">{textoEstoque(previa)}</span></p>}
  </div>;
}

/* ---------- Parcelas ---------- */

function Cliente({ nome }: { nome: string }) {
  return <p className="text-sm text-texto-secundario">Cliente desta conversa: <strong className="font-semibold text-foreground">{nome}</strong></p>;
}

export function ParcelasView({ dados, onInserir }: { dados: RespParcelas; onInserir: (texto: string) => void }) {
  if (!dados.cliente) return <Aviso>{dados.motivo}</Aviso>;
  const prox = proximoVencimento(dados.parcelas);
  const vencidas = contarVencidas(dados.parcelas);
  const cards: [string, React.ReactNode][] = [
    ['Em aberto', <span key="a" className="valor-sensivel">{formatBRL(dados.totalEmAberto)}</span>],
    ['Vencidas', <span key="v" className={vencidas ? 'text-error-text' : ''}>{vencidas}</span>],
    ['Próximo vencimento', prox ? dataDiaMes(prox) : '—'],
  ];
  return <div className="flex flex-col gap-2.5">
    <Cliente nome={dados.cliente.nome} />
    <dl className="grid grid-cols-3 gap-1.5">
      {cards.map(([rotulo, valor]) => <div key={rotulo} className="min-w-0 rounded-controle bg-card-elevated px-3 py-2.5">
        <dt className="truncate text-xs text-texto-secundario">{rotulo}</dt>
        <dd className="mt-0.5 font-mono text-base">{valor}</dd>
      </div>)}
    </dl>
    {dados.parcelas.length === 0 ? <Aviso>Nenhuma parcela em aberto neste cadastro.</Aviso> : <ul aria-label="Parcelas em aberto" className={`${LISTA} max-h-56 overflow-y-auto`}>
      {dados.parcelas.map((q) => <li key={`${q.vendaId}-${q.numeroParcela}`} className={`${LINHA} text-sm`}>
        <span className="shrink-0 whitespace-nowrap font-mono text-texto-secundario">Venda #{q.vendaId} · {q.numeroParcela}</span>
        <span className="min-w-0 flex-1 font-mono"><span className="valor-sensivel">{formatBRL(q.valor)}</span> · vence {dataDiaMes(q.dataVencimento)}</span>
        <Badge variant={q.situacao === 'vencida' ? 'error' : 'neutro'}>{ROTULO_SITUACAO[q.situacao]}</Badge>
      </li>)}
    </ul>}
    <BotaoInserir grande onClick={() => onInserir(textoResumoParcelas(dados.parcelas))}>Inserir resumo na mensagem</BotaoInserir>
  </div>;
}

/* ---------- Boletos ---------- */

export function BoletosView({ dados, onInserir }: { dados: RespBoletos; onInserir: (texto: string) => void }) {
  if (!dados.cliente) return <Aviso>{dados.motivo}</Aviso>;
  return <div className="flex flex-col gap-2.5">
    <Cliente nome={dados.cliente.nome} />
    {dados.boletos.length === 0 ? <Aviso>Nenhuma venda com boleto neste cadastro.</Aviso> : <ul aria-label="Boletos" className={`${LISTA} max-h-64 overflow-y-auto`}>
      {dados.boletos.map((b) => {
        const texto = textoSegundaVia(b.link);
        return <li key={b.vendaId} className={`${LINHA} text-sm`}>
          <span className="min-w-0 flex-1 basis-44 font-mono">
            Venda #{b.vendaId} · {dataDiaMes(b.dataVenda)}
            {b.valor !== null && <> · <span className="valor-sensivel">{formatBRL(b.valor)}</span></>}
          </span>
          <Badge variant={b.emitido ? 'marca' : 'neutro'}>{b.emitido ? 'Emitido' : 'Não emitido'}</Badge>
          {texto ? <BotaoInserir onClick={() => onInserir(texto)}><span>Inserir link</span><span className="sr-only"> da venda {b.vendaId}</span></BotaoInserir> : <Badge variant="outline">sem link</Badge>}
        </li>;
      })}
    </ul>}
  </div>;
}

/* ---------- Abas que consultam o contato ---------- */

function AbaContato<R extends { ok: boolean }>({ telefone, consultar, render }: {
  telefone: string; consultar: (t: string) => Promise<R | { ok: false; message: string }>; render: (dados: Extract<R, { ok: true }>) => React.ReactNode;
}) {
  const [carga, setCarga] = useState<Carga<Extract<R, { ok: true }>>>({ estado: 'carregando' });
  useEffect(() => {
    let vivo = true;
    consultar(telefone).then((r) => {
      if (!vivo) return;
      setCarga(r.ok ? { estado: 'ok', dados: r as Extract<R, { ok: true }> } : { estado: 'erro', mensagem: (r as { message: string }).message });
    }).catch(() => vivo && setCarga({ estado: 'erro', mensagem: 'Não foi possível consultar agora. Tente de novo.' }));
    return () => { vivo = false; };
  }, [telefone, consultar]);
  if (carga.estado === 'carregando') return <Carregando />;
  if (carga.estado === 'erro') return <Aviso erro>{carga.mensagem}</Aviso>;
  return <>{render(carga.dados)}</>;
}

/* ---------- Painel ---------- */

export function PainelAtalhos({ telefone, onInserir, prontas = [] }: { telefone: string; onInserir: (texto: string) => void; prontas?: readonly ProntaItem[] }) {
  const abas = [...(prontas.length ? [['prontas', 'Respostas prontas']] : []), ['estoque', 'Estoque'], ['parcelas', 'Parcelas'], ['boletos', 'Boletos']];
  return <Tabs defaultValue={abas[0][0]}>
    <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 pb-1">
      <TabsList aria-label="Atalho">
        {abas.map(([v, n]) => <TabsTrigger key={v} value={v}>{n}</TabsTrigger>)}
      </TabsList>
      <span className="text-xs text-texto-secundario">Clicar só preenche o campo · Esc fecha</span>
    </div>
    {prontas.length > 0 && <TabsContent value="prontas"><AbaProntas prontas={prontas} onInserir={onInserir} /></TabsContent>}
    <TabsContent value="estoque"><AbaEstoque onInserir={onInserir} /></TabsContent>
    <TabsContent value="parcelas"><AbaContato telefone={telefone} consultar={parcelasDoContato} render={(d) => <ParcelasView dados={d} onInserir={onInserir} />} /></TabsContent>
    <TabsContent value="boletos"><AbaContato telefone={telefone} consultar={boletosDoContato} render={(d) => <BoletosView dados={d} onInserir={onInserir} />} /></TabsContent>
  </Tabs>;
}
