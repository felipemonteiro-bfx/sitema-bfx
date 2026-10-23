'use client';
import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { AlignLeft, Loader2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { pcmDaMidia, TAXA_PCM } from './audio-decodificado';
import { DURACAO_MAX_S, MSG_LONGO, descreverProgresso, podeTranscrever } from './transcricao-regras';
import { ErroTranscricao, ouvirTranscricao, transcreverPcm, transcricaoOcupada, type ProgressoTranscricao } from './transcricao-cliente';
import { MSG_MODELO_NAO_CONFERE } from './transcricao-modelo';
import { salvarTranscricao } from './transcricao-actions';

export const NOTA_TRANSCRICAO = 'Gerada no navegador · não verificada · pode conter erros';

/** Depois de uma divergência de hash o modelo fica desativado até recarregar a página. */
let modeloInvalido = false;

function Bloco({ texto }: { texto: string }) {
  return <div data-transcricao className="mx-2 flex flex-col gap-1 rounded-controle bg-poco px-2.5 py-2">
    <span className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground"><AlignLeft className="size-3.5" aria-hidden="true" />Transcrição automática</span>
    <p className="whitespace-pre-wrap break-words text-sm leading-normal text-foreground">{texto}</p>
    <span className="text-xs text-muted-foreground">{NOTA_TRANSCRICAO}</span>
  </div>;
}

/**
 * Transcrição sob o player: botão "Transcrever" (só sem transcrição salva), progresso com aviso da primeira vez e,
 * pronto, o bloco com a nota. O texto é dado NÃO confiável: sempre texto puro, nunca HTML. Um trabalho por vez por aba;
 * sair da tela cancela (o worker é encerrado).
 */
export function TranscricaoAudio({ id, tamanho, duracao, transcricao }: { id: string; tamanho: number | null; duracao: number; transcricao?: string | null }) {
  const [texto, setTexto] = useState(transcricao ?? '');
  const [progresso, setProgresso] = useState<ProgressoTranscricao | null>(null);
  const [erro, setErro] = useState('');
  const [desativado, setDesativado] = useState(modeloInvalido);
  const ocupada = useSyncExternalStore(ouvirTranscricao, transcricaoOcupada, () => false);
  const aborto = useRef<AbortController | null>(null);
  useEffect(() => { if (transcricao) setTexto(transcricao); }, [transcricao]);
  useEffect(() => () => aborto.current?.abort(), []);

  if (texto) return <Bloco texto={texto} />;
  const limite = podeTranscrever(duracao > 0 ? duracao : undefined, tamanho);
  if (!limite.ok) return <p className="mx-2 text-xs text-muted-foreground">{limite.message}</p>;
  if (desativado) return <p role="alert" className="mx-2 text-xs text-muted-foreground">{MSG_MODELO_NAO_CONFERE}</p>;

  if (progresso) {
    const desc = descreverProgresso(progresso);
    return <div role="status" className="mx-2 flex flex-col gap-1.5">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs text-muted-foreground">{desc.rotulo}</span>
        <Button type="button" variant="ghost" size="sm" aria-label="Cancelar transcrição" onClick={() => aborto.current?.abort()}><X className="size-3" aria-hidden="true" />Cancelar</Button>
      </div>
      {desc.indeterminado
        ? <div role="progressbar" aria-label="Progresso da transcrição" className="h-1 w-full overflow-hidden rounded-full bg-primary/20"><div className="h-full w-full animate-pulse rounded-full bg-primary motion-reduce:animate-none" /></div>
        : <Progress value={desc.valor} aria-label="Progresso da transcrição" className="h-1" />}
      {progresso.fase === 'modelo' && <span className="text-xs text-muted-foreground">Primeira vez: baixando o modelo de voz (80 MB), depois fica salvo.</span>}
    </div>;
  }

  async function transcrever() {
    if (transcricaoOcupada()) return;
    const ac = new AbortController();
    aborto.current = ac;
    setErro(''); setProgresso({ fase: 'leitura', pct: 0 });
    try {
      const pcm = await pcmDaMidia(id);
      if (ac.signal.aborted) throw new DOMException('Cancelado', 'AbortError');
      const dur = pcm.length / TAXA_PCM;
      if (dur > DURACAO_MAX_S) throw new ErroTranscricao(MSG_LONGO);
      const bruto = await transcreverPcm(pcm, dur, setProgresso, ac.signal);
      const r = await salvarTranscricao(id, bruto, dur);
      if (r.ok && r.transcricao) setTexto(r.transcricao); else setErro(r.message);
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') { /* cancelado: volta ao botão */ }
      else if (e instanceof ErroTranscricao && e.modeloInvalido) { modeloInvalido = true; setDesativado(true); }
      else setErro(e instanceof Error && e.message ? e.message : 'Não foi possível transcrever este áudio.');
    } finally { aborto.current = null; setProgresso(null); }
  }

  return <div className="mx-2 flex flex-col items-start gap-1">
    <Button type="button" variant="outline" size="sm" aria-label="Transcrever áudio" disabled={ocupada} onClick={() => void transcrever()}>
      {ocupada ? <Loader2 className="size-3.5 animate-spin motion-reduce:animate-none" aria-hidden="true" /> : <AlignLeft className="size-3.5" aria-hidden="true" />}Transcrever
    </Button>
    {erro && <p role="alert" className="text-xs text-muted-foreground">{erro}</p>}
  </div>;
}
