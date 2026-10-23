// Regras puras da busca do quadro: o texto vai para o `q` da URL (o servidor consulta o banco todo, até 100 conversas).
import { urlAtendimento } from './conversa-lista';

/** A consulta do servidor devolve no máximo isto (`take: 100` em tela-atendimento). */
export const LIMITE_QUADRO = 100;
export const DEBOUNCE_BUSCA_MS = 400;
export const AVISO_LIMITE = 'Mostrando as 100 conversas mais recentes. Use a busca para achar outras.';

/** Mesma normalização do `q` na tela: aparado e com até 100 caracteres. */
export const qDoQuadro = (texto: string): string => texto.trim().slice(0, 100);

export const urlDaBuscaDoQuadro = (base: string, texto: string): string => urlAtendimento(base, { visao: 'kanban', q: qDoQuadro(texto) });

export const precisaNavegar = (texto: string, qAtual: string): boolean => qDoQuadro(texto) !== qAtual;

/** Bateu no teto: pode haver mais conversas do que as mostradas. */
export const avisoDoLimite = (quantidade: number): string | null => (quantidade >= LIMITE_QUADRO ? AVISO_LIMITE : null);
