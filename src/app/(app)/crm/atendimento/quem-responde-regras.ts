// Regras puras de "quem responde" e do aviso de envio. Nada aqui envia mensagem nem acessa o banco.

export type ModoResposta = 'equipe' | 'automatico' | 'desligado';

const FUSO = 'America/Manaus';
const diaManaus = (d: Date) => d.toLocaleDateString('en-CA', { timeZone: FUSO });
const horaManaus = (d: Date) => d.toLocaleTimeString('pt-BR', { timeZone: FUSO, hour: '2-digit', minute: '2-digit', hour12: false });

/** Mesma leitura de sempre do texto de estado: pausa/parar/desligado = a equipe está no comando. */
export function modoDoEstado(estado: string): ModoResposta {
  if (/desligado/i.test(estado)) return 'desligado';
  return /pausa|parar/i.test(estado) ? 'equipe' : 'automatico';
}

/** "às 12:13" hoje; "amanhã às 00:13"; "19/10 às 11:05" depois. Horário de Manaus. */
export function quandoRetoma(alvo: Date, agora: Date): string {
  const hora = horaManaus(alvo);
  const dia = diaManaus(alvo);
  if (dia === diaManaus(agora)) return `às ${hora}`;
  if (dia === diaManaus(new Date(agora.getTime() + 86_400_000))) return `amanhã às ${hora}`;
  const [, mes, d] = dia.split('-');
  return `${d}/${mes} às ${hora}`;
}

/** Uma frase só sobre o estado, para o topo do menu. */
export function fraseQuemResponde(q: { modo: ModoResposta; retomaEm: Date | null; clientePediuParar?: boolean }, agora: Date): string {
  if (q.modo === 'desligado') return 'O automático está desligado no sistema. Só a equipe responde por aqui.';
  if (q.modo === 'automatico') return 'O automático está atendendo esta conversa. Se a equipe responder, ele pausa sozinho.';
  if (q.clientePediuParar) return 'O cliente pediu para parar. O automático só volta se ele mandar VOLTAR.';
  return q.retomaEm
    ? `A equipe está respondendo. O automático volta sozinho ${quandoRetoma(q.retomaEm, agora)} se ninguém responder.`
    : 'A equipe está respondendo. O automático fica pausado até alguém retomar.';
}

/** O cliente mandou PARAR/SAIR: a pausa não tem prazo, só o cliente (VOLTAR) ou a equipe (Retomar) a encerram. */
export const pediuParar = (estado: string): boolean => /pediu para parar/i.test(estado);

/**
 * Quando o automático volta sozinho: só na pausa por RESPOSTA HUMANA (prazo = resposta + takeover).
 * Cliente que pediu PARAR/SAIR, pausa da equipe e automático desligado não têm prazo.
 */
export function calcularRetomaEm({ automaticoLigado, pausaAtiva, clienteParou, manualEm, minutos }: {
  automaticoLigado: boolean; pausaAtiva: boolean; clienteParou: boolean; manualEm: Date | null; minutos: number;
}): string | null {
  if (!automaticoLigado || !pausaAtiva || clienteParou || !manualEm) return null;
  return new Date(manualEm.getTime() + minutos * 60_000).toISOString();
}

/** Tempo que resta da janela de 24h desde a última entrada do cliente; null se encerrada ou sem entrada. */
export function janelaRestante(ultimaEntrada: Date | null, agora: Date): string | null {
  if (!ultimaEntrada) return null;
  const ms = ultimaEntrada.getTime() + 86_400_000 - agora.getTime();
  if (ms <= 0) return null;
  const h = Math.floor(ms / 3_600_000);
  return h >= 1 ? `${h}h` : `${Math.max(1, Math.ceil(ms / 60_000))}min`;
}

type Controlar = (telefone: string, retomar: boolean) => Promise<{ ok: boolean; message: string }>;

/**
 * Menu → as MESMAS ações de antes: "Equipe responde" = Assumir conversa (retomar=false);
 * "Automático responde" = Retomar automático (retomar=true). Escolher a opção que já está
 * marcada não repete a ação (devolve null).
 */
export async function mudarQuemResponde({ escolha, atual, telefone, controlar }: {
  escolha: 'equipe' | 'automatico'; atual: ModoResposta; telefone: string; controlar: Controlar;
}): Promise<{ ok: boolean; message: string } | null> {
  if (escolha === 'equipe' && atual !== 'automatico') return null;
  if (escolha === 'automatico' && atual === 'automatico') return null; // já está marcado: nada a retomar
  return controlar(telefone, escolha === 'automatico');
}

/** Aviso de envio: só existe quando a integração oficial não está ativa. */
export function avisoDeEnvio(oficialAtiva: boolean): { titulo: string; texto: string; acao: string; href: string } | null {
  if (oficialAtiva) return null;
  return { titulo: 'Envio indisponível.', texto: 'A conexão com o WhatsApp oficial caiu.', acao: 'Ver conexão', href: '/configuracoes' };
}
