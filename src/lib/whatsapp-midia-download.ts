/**
 * Download idempotente das mídias recebidas pelo WhatsApp (Meta -> storage privado).
 *
 * O claim é atômico (`updateMany`): só um processo por vez baixa a mesma mídia, e uma
 * mídia `baixando` há mais de 5 min (processo morto) é retomada. Nada aqui grava mensagem,
 * URL ou token no banco: o campo `erro` guarda apenas um código curto.
 */
import { prisma } from "@/lib/db";
import { ErroMidiaMeta, baixarConteudo, obterInfoMidia, type InfoMidia } from "@/lib/whatsapp-midia-meta";
import { classificarMidia, limiteMaximoEntrada, type TipoMidia } from "@/lib/whatsapp-midia-politica";
import { contarPaginasPdf } from "@/lib/whatsapp-midia-pdf";
import { MidiaStorageError, chaveNova, gravar, remover } from "@/lib/whatsapp-midia-storage";

const TOLERANCIA_BAIXANDO_MS = 5 * 60_000;
const SHA_SEM_REFERENCIA = "0".repeat(64);
/** Espera mínima entre tentativas AUTOMÁTICAS; depois de 3 tentativas sobe para 10 min (máx. 6 por hora). */
const ESPERA_INICIAL_MS = 2 * 60_000;
const ESPERA_LONGA_MS = 10 * 60_000;
const TENTATIVAS_ESPERA_CURTA = 3;
/** Erros que repetir não resolve: só estes levam a `indisponivel`. */
const ERROS_DEFINITIVOS = ["midia_indisponivel", "tamanho_excedido"] as const;

/** Falha que não adianta repetir: a mídia vira `indisponivel` de imediato. */
class Definitivo extends Error {
  constructor(readonly codigo: string) {
    super(codigo);
  }
}

function erroDefinitivo(e: unknown): boolean {
  return e instanceof Definitivo || (e instanceof ErroMidiaMeta && (ERROS_DEFINITIVOS as readonly string[]).includes(e.codigo));
}

/** `where` das mídias que o fluxo AUTOMÁTICO pode (re)tentar agora, respeitando o backoff. */
function elegiveisAutomatico(agora: number) {
  return [
    { status: "pendente" },
    { status: "falhou", tentativas: { lt: TENTATIVAS_ESPERA_CURTA }, atualizadoEm: { lt: new Date(agora - ESPERA_INICIAL_MS) } },
    { status: "falhou", tentativas: { gte: TENTATIVAS_ESPERA_CURTA }, atualizadoEm: { lt: new Date(agora - ESPERA_LONGA_MS) } },
  ];
}

/** `indisponivel` por erro que NÃO era definitivo (herança do teto antigo): o botão pode reviver. */
const REVIVIVEL_PELO_BOTAO = {
  status: "indisponivel",
  OR: [{ erro: null }, { erro: { notIn: [...ERROS_DEFINITIVOS] } }],
  NOT: { erro: { startsWith: "recusada_" } },
};

/** Código curto e seguro para gravar em `erro` (nunca a mensagem crua). */
function codigoDoErro(e: unknown): string {
  if (e instanceof ErroMidiaMeta) return e.codigo;
  if (e instanceof MidiaStorageError) return `storage_${e.code}`;
  if (e instanceof Definitivo) return e.codigo;
  return "erro_interno";
}

async function baixarComRenovacao(mediaId: string, tipo: TipoMidia): Promise<{ bytes: Uint8Array; sha256: string }> {
  const limiteBytes = limiteMaximoEntrada(tipo);
  let info: InfoMidia = await obterInfoMidia(mediaId);
  try {
    return await baixarConteudo(info, { tipo, limiteBytes });
  } catch (e) {
    if (!(e instanceof ErroMidiaMeta) || e.codigo !== "url_expirada") throw e;
    info = await obterInfoMidia(mediaId); // a URL temporária venceu: nova info, uma vez só
    return await baixarConteudo(info, { tipo, limiteBytes });
  }
}

/**
 * Baixa e guarda uma mídia de ENTRADA. Seguro para chamar várias vezes e em paralelo.
 * `manual` (botão "Tentar de novo") ignora o backoff e pode reviver `indisponivel` de erro transitório.
 */
export async function processarMidia(midiaId: string, opcoes: { manual?: boolean } = {}): Promise<void> {
  const agora = Date.now();
  const reivindicada = await prisma.whatsAppMidia.updateMany({
    where: {
      id: midiaId,
      mensagem: { direcao: "in" }, // mídia de saída nasce `pendente` e nunca é baixada da Meta
      OR: [
        ...(opcoes.manual
          ? [{ status: { in: ["pendente", "falhou"] } }, REVIVIVEL_PELO_BOTAO]
          : elegiveisAutomatico(agora)),
        { status: "baixando", atualizadoEm: { lt: new Date(agora - TOLERANCIA_BAIXANDO_MS) } },
      ],
    },
    data: { status: "baixando", tentativas: { increment: 1 } },
  });
  if (reivindicada.count === 0) return;

  const midia = await prisma.whatsAppMidia.findUnique({ where: { id: midiaId } });
  if (!midia) return;

  // Escritas finais só valem se a linha ainda é desta execução: `baixando` e com as `tentativas`
  // lidas após o claim. Se outro worker retomou a linha, este não mexe no estado.
  const aindaMinha = { id: midiaId, status: "baixando", tentativas: midia.tentativas };
  let chaveGravada: string | null = null;
  let concluida = false;
  try {
    const tipo = midia.tipo as TipoMidia;
    const baixado = await baixarComRenovacao(midia.metaMediaId, tipo);

    // O tipo vem dos bytes; divergência ou conteúdo perigoso não se resolve com nova tentativa.
    const analise = classificarMidia(tipo, baixado.bytes, midia.mime);
    if (!analise.ok) throw new Definitivo(`recusada_${analise.motivo}`);

    if (midia.sha256 !== SHA_SEM_REFERENCIA && baixado.sha256 !== midia.sha256) {
      throw new ErroMidiaMeta("sha_divergente");
    }

    const paginas = analise.mime === "application/pdf" ? await contarPaginasPdf(baixado.bytes) : null;
    const chave = chaveNova();
    await gravar(chave, baixado.bytes, analise.mime);
    chaveGravada = chave;
    const r = await prisma.whatsAppMidia.updateMany({
      where: aindaMinha,
      data: { status: "salva", chaveStorage: chave, mime: analise.mime, tamanho: analise.bytes, erro: null, ...(paginas !== null ? { paginas } : {}) },
    });
    concluida = r.count > 0;
  } catch (e) {
    const codigo = codigoDoErro(e);
    await prisma.whatsAppMidia
      .updateMany({ where: aindaMinha, data: { status: erroDefinitivo(e) ? "indisponivel" : "falhou", erro: codigo } })
      .catch(() => {});
  }
  if (!concluida && chaveGravada) {
    // Objeto gravado sem linha apontando para ele (update falhou ou outro worker assumiu): só a chave DESTE worker.
    await remover(chaveGravada).catch(() => {});
  }
}

/**
 * Para quem abre a conversa: processa em série as mídias de entrada pendentes ou com falha do
 * telefone, respeitando o backoff (roda a cada render/refresh de 30 s).
 */
export async function processarPendentesDaConversa(telefone: string): Promise<void> {
  const pendentes = await prisma.whatsAppMidia.findMany({
    where: { OR: elegiveisAutomatico(Date.now()), mensagem: { telefone, direcao: "in" } },
    orderBy: { criadoEm: "asc" },
    select: { id: true },
  });
  for (const { id } of pendentes) {
    await processarMidia(id).catch(() => {
      console.warn("[Mídia WhatsApp] Falha ao processar mídia pendente");
    });
  }
}
