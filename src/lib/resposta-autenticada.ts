/**
 * Leitura segura de resposta de endpoint autenticado que devolve LISTA.
 *
 * Contexto (incidente de 2026-08-14, ver docs/observabilidade.md): o middleware so cobre
 * `/api/*` e o JWT de sessao dura 7 dias sem renovacao. Quando ele expira, a pagina segue na
 * tela e so as chamadas de API passam a responder 401 com `{error:"Sessão inválida ou expirada."}`.
 *
 * O call site fazia `const data = await res.json()` e mandava o resultado direto para o estado.
 * O objeto de erro entrava no lugar da lista: o autocomplete de cliente parava de sugerir e o
 * de produto estourava `TypeError: data?.find is not a function`, engolido pelo `.catch`. O
 * usuario via "Preencha os campos obrigatorios: Cliente" e o servidor nao via absolutamente nada.
 *
 * Regra desta funcao: `lista` e SEMPRE array. Quem chama pode usar `.map`/`.find` sem guarda.
 */

export const MENSAGEM_SESSAO_EXPIRADA = "Sua sessão expirou. Entre novamente para continuar.";
const MENSAGEM_FALHA_GENERICA = "Não foi possível carregar os dados. Tente novamente.";

export type LeituraLista<T> = {
  /** `true` so quando veio 2xx E o corpo era mesmo um array. */
  ok: boolean;
  /** Sempre array — vazio quando a leitura falhou. */
  lista: T[];
  sessaoExpirada: boolean;
  /** Texto pronto para exibir quando `ok` for `false`. */
  mensagem?: string;
};

export async function lerListaDaResposta<T = unknown>(res: Response): Promise<LeituraLista<T>> {
  if (res.status === 401) {
    return { ok: false, lista: [], sessaoExpirada: true, mensagem: MENSAGEM_SESSAO_EXPIRADA };
  }

  if (!res.ok) {
    return { ok: false, lista: [], sessaoExpirada: false, mensagem: MENSAGEM_FALHA_GENERICA };
  }

  let corpo: unknown;
  try {
    corpo = await res.json();
  } catch {
    // 204 sem corpo, HTML de pagina de login, resposta truncada — nenhum deles e lista.
    return { ok: false, lista: [], sessaoExpirada: false, mensagem: MENSAGEM_FALHA_GENERICA };
  }

  if (!Array.isArray(corpo)) {
    // Era exatamente aqui que o `{error:...}` virava "sugestao".
    return { ok: false, lista: [], sessaoExpirada: false, mensagem: MENSAGEM_FALHA_GENERICA };
  }

  return { ok: true, lista: corpo as T[], sessaoExpirada: false };
}
