'use client';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { indiceAberto, indicePorMensagem, type ItemFoto } from './fotos-regras';
import { VisualizadorFotos } from './visualizador-fotos';

type FotosCtx = { abrir: (msgId: number) => void };
const SEM_FOTOS: FotosCtx = { abrir: () => undefined };
const Ctx = createContext<FotosCtx>(SEM_FOTOS);

/** Quem abre a tela cheia (foto da bolha, célula do álbum). Fora do provider é um no-op. */
export const useFotos = (): FotosCtx => useContext(Ctx);

/**
 * Guarda qual foto está aberta e renderiza o visualizador uma vez por conversa. Deve ficar dentro do
 * `RespostaProvider` (o Responder da tela cheia usa o mesmo hook de citação da bolha).
 */
export function FotosProvider({ itens, contato, children }: { itens: ItemFoto[]; contato: { nome: string; telefone: string }; children: ReactNode }) {
  // Guarda a MENSAGEM aberta, não a posição: o refresh de 30s pode trazer foto nova e deslocar os índices.
  const [aberta, setAberta] = useState<number | null>(null);
  const indice = indiceAberto(itens, aberta);
  useEffect(() => { if (aberta !== null && indice === null) setAberta(null); }, [aberta, indice]); // a foto sumiu da conversa: fecha
  const abrir = useCallback((msgId: number) => { if (indicePorMensagem(itens, msgId) >= 0) setAberta(msgId); }, [itens]);
  const mudar = useCallback((i: number) => { const alvo = itens[i]; if (alvo) setAberta(alvo.msgId); }, [itens]);
  const valor = useMemo(() => ({ abrir }), [abrir]);
  return <Ctx.Provider value={valor}>
    {children}
    <VisualizadorFotos itens={itens} indice={indice} aoMudar={mudar} aoFechar={() => setAberta(null)} contato={contato} />
  </Ctx.Provider>;
}
