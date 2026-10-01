"use server";

// Agenda de obrigações (2026-09-30, Fase 4; spec §3.4, §3.5 e §6): o documento do boleto Prudent,
// os pagamentos que a BFX faz, a substituição e o direcionamento.
// Guarda própria em cada action: o Action ID vive no bundle e é invocável sem passar pelo layout.
//
// Toda gravação que depende do estado do boleto leva o estado lido no `where` (status e
// `atualizadoEm`) e confere o `count`: dois cliques, ou duas abas, gravam uma vez só.

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { ROTULO_STATUS_FECHAMENTO, STATUS_FECHAMENTO, rotuloCompetencia } from "@/lib/fechamento";
import { requireAdminOrThrow } from "@/lib/guards";
import { createAuditLog } from "@/lib/audit";
import { hojeDataPura } from "@/lib/data-pura";
import { dataPuraOuNula } from "@/lib/lote-antecipacao";
import { decodificarLinhaDigitavel, somenteDigitos } from "@/lib/linha-digitavel";
import {
  DIRECIONAMENTO,
  STATUS_BOLETO,
  divergencia,
  statusPorPagamentos,
  validarNovoPagamento,
} from "@/lib/boleto-prudent";
import {
  MIMES_FINANCEIRO,
  MIMES_SO_PDF,
  prepararArquivoFinanceiro,
  salvarArquivoFinanceiro,
  type ArquivoPreparado,
} from "@/lib/arquivo-financeiro";

type Resp = { ok: true } | { ok: false; erro: string };

/** Erro com mensagem para o usuário, lançado dentro da transação para desfazê-la. */
class ErroBoleto extends Error {}

const ROTA = "/obrigacoes";
const JUSTIFICATIVA_MINIMA = 5;
const AUTENTICACAO_MAXIMA = 200;

function usuarioDe(sessao: { nomeExibicao?: string | null; username?: string | null }): string | null {
  return sessao.nomeExibicao || sessao.username || null;
}

function idPositivo(valor: unknown): number | null {
  const n = Number(valor);
  return Number.isInteger(n) && n > 0 ? n : null;
}

const centavos = (v: number) => Math.round(v * 100) / 100;

/** Campo de valor opcional: vazio ou zero → null; ilegível ou negativo → NaN (erro). */
function valorOpcional(valor: FormDataEntryValue | null): number | null {
  const s = String(valor ?? "").trim();
  if (!s) return null;
  const n = Number(s);
  if (!Number.isFinite(n) || n < 0) return Number.NaN;
  return n === 0 ? null : centavos(n);
}

function arquivoEnviado(valor: FormDataEntryValue | null): File | null {
  return valor instanceof File && valor.size > 0 ? valor : null;
}

function erroDe(e: unknown, mensagemConflito: string): Resp {
  if (e instanceof ErroBoleto) return { ok: false, erro: e.message };
  if ((e as { code?: string } | null)?.code === "P2002") return { ok: false, erro: mensagemConflito };
  console.error("[obrigacoes]", e);
  return { ok: false, erro: "Não foi possível salvar. Tente de novo." };
}

type DocumentoPreparado = {
  valorDocumento: number;
  vencimentoDocumento: Date;
  linhaDigitavel: string | null;
  divergenciaJustificativa: string | null;
  pdf: ArquivoPreparado | null;
};

/**
 * Lê o documento do boleto do formulário: PDF (opcional), linha digitável e, quando a linha não
 * decodifica ou não traz valor/vencimento (convênio), os dois digitados à mão. Linha que não
 * decodifica não é gravada. Valor ou vencimento diferente do esperado exige justificativa.
 * `boletoAtualId`: a linha pode já estar nele (anexar); na substituição o original conta como outro.
 */
async function prepararDocumento(
  fd: FormData,
  esperado: { vencimento: Date; valorEsperado: number },
  boletoAtualId: number | null
): Promise<{ ok: true; doc: DocumentoPreparado } | { ok: false; erro: string }> {
  let pdf: ArquivoPreparado | null = null;
  const arquivo = arquivoEnviado(fd.get("pdf"));
  if (arquivo) {
    const p = await prepararArquivoFinanceiro(arquivo, MIMES_SO_PDF);
    if (!p.ok) return p;
    pdf = p;
  }

  const valorManual = valorOpcional(fd.get("valorManual"));
  if (Number.isNaN(valorManual)) return { ok: false, erro: "Valor do boleto inválido." };
  const vencimentoTxt = String(fd.get("vencimentoManual") ?? "").trim();
  const vencimentoManual = vencimentoTxt ? dataPuraOuNula(vencimentoTxt) : null;
  if (vencimentoTxt && !vencimentoManual) return { ok: false, erro: "Vencimento do boleto inválido." };

  const digitos = somenteDigitos(String(fd.get("linhaDigitavel") ?? ""));
  let valor: number | null = valorManual;
  let vencimento: Date | null = vencimentoManual;
  let linha: string | null = null;
  if (digitos) {
    const d = decodificarLinhaDigitavel(digitos, esperado.vencimento);
    if (d.ok) {
      linha = d.linha;
      valor = d.valor ?? valorManual;
      vencimento = d.vencimento ?? vencimentoManual;
      if (valor == null || vencimento == null) {
        return { ok: false, erro: "A linha não traz valor ou vencimento. Informe-os à mão." };
      }
    } else if (valorManual == null || vencimentoManual == null) {
      return { ok: false, erro: `${d.erro} Confira a linha ou informe valor e vencimento à mão.` };
    }
  } else if (valorManual == null || vencimentoManual == null) {
    return { ok: false, erro: "Informe a linha digitável ou o valor e o vencimento do boleto." };
  }
  if (!pdf && !linha) return { ok: false, erro: "Anexe o PDF do boleto ou informe uma linha digitável válida." };
  if (valor == null || vencimento == null) {
    return { ok: false, erro: "Informe a linha digitável ou o valor e o vencimento do boleto." };
  }

  const div = divergencia(esperado, { valor, vencimento });
  const partes = [div.valor ? "valor" : null, div.vencimento ? "vencimento" : null].filter(Boolean);
  let justificativa: string | null = null;
  if (partes.length > 0) {
    justificativa = String(fd.get("justificativa") ?? "").trim();
    if (justificativa.length < JUSTIFICATIVA_MINIMA) {
      return {
        ok: false,
        erro: `O documento difere do esperado (${partes.join(" e ")}). Escreva a justificativa (${JUSTIFICATIVA_MINIMA} caracteres ou mais).`,
      };
    }
  }

  if (linha) {
    const outro = await prisma.boletoPrudent.findFirst({
      where: { linhaDigitavel: linha, ...(boletoAtualId ? { id: { not: boletoAtualId } } : {}) },
      select: { id: true },
    });
    if (outro) return { ok: false, erro: `Esta linha digitável já está no boleto #${outro.id}.` };
  }

  return {
    ok: true,
    doc: {
      valorDocumento: valor,
      vencimentoDocumento: vencimento,
      linhaDigitavel: linha,
      divergenciaJustificativa: justificativa,
      pdf,
    },
  };
}

const MORTO: string[] = [STATUS_BOLETO.substituido, STATUS_BOLETO.cancelado];

/** Anexa o PDF e a linha digitável ao boleto que aguardava o documento; ele passa a "a pagar". */
export async function anexarDocumentoBoleto(fd: FormData): Promise<Resp> {
  const sessao = await requireAdminOrThrow();
  const boletoId = idPositivo(fd.get("boletoId"));
  if (!boletoId) return { ok: false, erro: "Boleto não encontrado." };

  const boleto = await prisma.boletoPrudent.findUnique({
    where: { id: boletoId },
    select: { id: true, vencimento: true, valorEsperado: true, status: true },
  });
  if (!boleto) return { ok: false, erro: "Boleto não encontrado." };
  if (MORTO.includes(boleto.status)) return { ok: false, erro: "Este boleto já foi substituído ou cancelado." };
  if (boleto.status !== STATUS_BOLETO.aguardandoDocumento) {
    return { ok: false, erro: "Este boleto já tem documento. Para trocar, substitua o boleto." };
  }

  const prep = await prepararDocumento(fd, boleto, boleto.id);
  if (!prep.ok) return prep;
  const { pdf, ...doc } = prep.doc;

  try {
    await prisma.$transaction(async (tx) => {
      const arquivo = pdf ? await salvarArquivoFinanceiro(tx, pdf, usuarioDe(sessao)) : null;
      const { count } = await tx.boletoPrudent.updateMany({
        where: { id: boletoId, status: STATUS_BOLETO.aguardandoDocumento },
        data: { ...doc, ...(arquivo ? { pdfArquivoId: arquivo.id } : {}), status: STATUS_BOLETO.aPagar },
      });
      if (count === 0) throw new ErroBoleto("O boleto mudou enquanto você anexava. Recarregue.");
    });
  } catch (e) {
    return erroDe(e, "Esta linha digitável já está em outro boleto.");
  }

  await createAuditLog("obrigacoes:anexar", {
    boletoId,
    valorDocumento: doc.valorDocumento,
    vencimentoDocumento: doc.vencimentoDocumento.toISOString().slice(0, 10),
    linhaDigitavel: doc.linhaDigitavel,
    divergenciaJustificativa: doc.divergenciaJustificativa,
    pdf: Boolean(pdf),
  });
  revalidatePath(ROTA);
  return { ok: true };
}

/**
 * Pagamento do boleto pela BFX. Numa transação: confere o valor contra os pagamentos vivos,
 * recusa comprovante já usado (hash), cria o pagamento e move o status com o estado lido no
 * `where` — o segundo clique encontra o boleto mudado e desfaz tudo.
 */
export async function registrarPagamentoBoleto(fd: FormData): Promise<Resp> {
  const sessao = await requireAdminOrThrow();
  const boletoId = idPositivo(fd.get("boletoId"));
  if (!boletoId) return { ok: false, erro: "Boleto não encontrado." };

  const dataTxt = String(fd.get("dataPagamento") ?? "").trim();
  const data = dataPuraOuNula(dataTxt);
  if (!data) return { ok: false, erro: "Data de pagamento inválida." };
  // "YYYY-MM-DD" comparado como texto já é cronológico.
  if (dataTxt > hojeDataPura()) return { ok: false, erro: "Data de pagamento não pode ser no futuro." };

  const principalTxt = String(fd.get("valorPrincipal") ?? "").trim();
  // vazio ou ilegível vira NaN e `validarNovoPagamento` recusa com a mensagem dele
  const principal = principalTxt ? centavos(Number(principalTxt)) : Number.NaN;
  const encargos = valorOpcional(fd.get("valorEncargos"));
  if (Number.isNaN(encargos)) return { ok: false, erro: "Encargos inválidos." };
  const autenticacao = String(fd.get("autenticacao") ?? "").trim().slice(0, AUTENTICACAO_MAXIMA) || null;

  let comprovante: ArquivoPreparado | null = null;
  const arquivo = arquivoEnviado(fd.get("comprovante"));
  if (arquivo) {
    const p = await prepararArquivoFinanceiro(arquivo, MIMES_FINANCEIRO);
    if (!p.ok) return p;
    comprovante = p;
  }

  let novoStatus = "";
  try {
    await prisma.$transaction(async (tx) => {
      const boleto = await tx.boletoPrudent.findUnique({
        where: { id: boletoId },
        select: {
          id: true,
          status: true,
          direcionamento: true,
          valorDocumento: true,
          valorEsperado: true,
          atualizadoEm: true,
          pagamentos: { select: { valorPrincipal: true, estornadoEm: true } },
        },
      });
      if (!boleto) throw new ErroBoleto("Boleto não encontrado.");
      if (boleto.direcionamento !== DIRECIONAMENTO.bfx) {
        throw new ErroBoleto("Este boleto é pago pela empresa; a BFX não registra pagamento nele.");
      }
      const v = validarNovoPagamento(boleto, boleto.pagamentos, principal);
      if (!v.ok) throw new ErroBoleto(v.erro);

      let comprovanteArquivoId: number | null = null;
      if (comprovante) {
        const usado = await tx.boletoPagamento.findUnique({
          where: { comprovanteHash: comprovante.sha256 },
          select: { id: true },
        });
        if (usado) throw new ErroBoleto("Este comprovante já foi usado.");
        comprovanteArquivoId = (await salvarArquivoFinanceiro(tx, comprovante, usuarioDe(sessao))).id;
      }

      await tx.boletoPagamento.create({
        data: {
          boletoId,
          dataPagamento: data,
          valorPrincipal: principal,
          valorEncargos: encargos ?? 0,
          comprovanteArquivoId,
          comprovanteHash: comprovante?.sha256 ?? null,
          autenticacao,
          registradoPor: usuarioDe(sessao),
        },
      });
      novoStatus = statusPorPagamentos(boleto, [...boleto.pagamentos, { valorPrincipal: principal, estornadoEm: null }]);
      const { count } = await tx.boletoPrudent.updateMany({
        where: { id: boletoId, status: boleto.status, atualizadoEm: boleto.atualizadoEm },
        data: { status: novoStatus, atualizadoEm: new Date() },
      });
      if (count === 0) throw new ErroBoleto("O boleto mudou enquanto você registrava. Recarregue.");
    });
  } catch (e) {
    return erroDe(e, "Este comprovante já foi usado.");
  }

  await createAuditLog("obrigacoes:pagamento", {
    boletoId,
    dataPagamento: dataTxt,
    valorPrincipal: principal,
    valorEncargos: encargos ?? 0,
    comprovante: Boolean(comprovante),
    status: novoStatus,
  });
  revalidatePath(ROTA);
  return { ok: true };
}

/** Estorno: o pagamento fica no histórico com quem estornou e quando; o status é recalculado. */
export async function estornarPagamentoBoleto(pagamentoId: number): Promise<Resp> {
  const sessao = await requireAdminOrThrow();
  if (!Number.isInteger(pagamentoId) || pagamentoId <= 0) return { ok: false, erro: "Pagamento não encontrado." };

  let boletoId = 0;
  let novoStatus = "";
  try {
    await prisma.$transaction(async (tx) => {
      const pagamento = await tx.boletoPagamento.findUnique({
        where: { id: pagamentoId },
        select: {
          id: true,
          estornadoEm: true,
          boleto: {
            select: {
              id: true,
              status: true,
              valorDocumento: true,
              valorEsperado: true,
              atualizadoEm: true,
              pagamentos: { select: { id: true, valorPrincipal: true, estornadoEm: true } },
            },
          },
        },
      });
      if (!pagamento) throw new ErroBoleto("Pagamento não encontrado.");
      if (pagamento.estornadoEm) throw new ErroBoleto("Este pagamento já foi estornado.");
      const boleto = pagamento.boleto;
      boletoId = boleto.id;
      if (MORTO.includes(boleto.status)) {
        throw new ErroBoleto("Boleto substituído ou cancelado: o pagamento não é estornado por aqui.");
      }

      const agora = new Date();
      const { count: estornados } = await tx.boletoPagamento.updateMany({
        where: { id: pagamentoId, estornadoEm: null },
        // O hash sai do pagamento estornado para o mesmo comprovante valer no registro corrigido;
        // o arquivo continua ligado por `comprovanteArquivoId` e guarda o próprio sha256.
        data: { estornadoEm: agora, estornadoPor: usuarioDe(sessao), comprovanteHash: null },
      });
      if (estornados === 0) throw new ErroBoleto("Este pagamento já foi estornado.");

      const restantes = boleto.pagamentos.map((p) => (p.id === pagamentoId ? { ...p, estornadoEm: agora } : p));
      novoStatus = statusPorPagamentos(boleto, restantes);
      const { count } = await tx.boletoPrudent.updateMany({
        where: { id: boleto.id, status: boleto.status, atualizadoEm: boleto.atualizadoEm },
        data: { status: novoStatus, atualizadoEm: new Date() },
      });
      if (count === 0) throw new ErroBoleto("O boleto mudou enquanto você estornava. Recarregue.");
    });
  } catch (e) {
    return erroDe(e, "Não foi possível estornar. Recarregue.");
  }

  await createAuditLog("obrigacoes:estorno", { pagamentoId, boletoId, status: novoStatus });
  revalidatePath(ROTA);
  return { ok: true };
}

/**
 * A Prudent reemitiu o boleto: o novo nasce com o documento novo, aponta para o original
 * (`substituiId`), herda lote, vencimento, valor esperado e direcionamento, e leva as parcelas. O
 * original vira "substituído" primeiro — o índice parcial só admite um boleto vivo por lote e
 * vencimento — e continua listado. Boleto com pagamento vivo não é substituído.
 */
export async function substituirBoleto(fd: FormData): Promise<Resp> {
  const sessao = await requireAdminOrThrow();
  const boletoId = idPositivo(fd.get("boletoId"));
  if (!boletoId) return { ok: false, erro: "Boleto não encontrado." };

  const original = await prisma.boletoPrudent.findUnique({
    where: { id: boletoId },
    select: {
      id: true,
      loteId: true,
      empresaParceiraId: true,
      vencimento: true,
      valorEsperado: true,
      direcionamento: true,
      status: true,
      atualizadoEm: true,
      pagamentos: { select: { valorPrincipal: true, estornadoEm: true } },
    },
  });
  if (!original) return { ok: false, erro: "Boleto não encontrado." };
  if (MORTO.includes(original.status)) return { ok: false, erro: "Este boleto já foi substituído ou cancelado." };
  if (original.pagamentos.some((p) => p.estornadoEm == null)) {
    return { ok: false, erro: "Boleto com pagamento registrado não pode ser substituído. Estorne o pagamento antes." };
  }

  const prep = await prepararDocumento(fd, original, null);
  if (!prep.ok) return prep;
  const { pdf, ...doc } = prep.doc;

  let novoId = 0;
  try {
    await prisma.$transaction(async (tx) => {
      const { count } = await tx.boletoPrudent.updateMany({
        where: { id: original.id, status: original.status, atualizadoEm: original.atualizadoEm },
        data: { status: STATUS_BOLETO.substituido, atualizadoEm: new Date() },
      });
      if (count === 0) throw new ErroBoleto("O boleto mudou enquanto você substituía. Recarregue.");

      const arquivo = pdf ? await salvarArquivoFinanceiro(tx, pdf, usuarioDe(sessao)) : null;
      const novo = await tx.boletoPrudent.create({
        data: {
          loteId: original.loteId,
          empresaParceiraId: original.empresaParceiraId,
          vencimento: original.vencimento,
          valorEsperado: original.valorEsperado,
          direcionamento: original.direcionamento,
          substituiId: original.id,
          status: STATUS_BOLETO.aPagar,
          ...doc,
          pdfArquivoId: arquivo?.id ?? null,
        },
        select: { id: true },
      });
      novoId = novo.id;
      await tx.parcelaVencimento.updateMany({
        where: { boletoPrudentId: original.id },
        data: { boletoPrudentId: novo.id },
      });
    });
  } catch (e) {
    return erroDe(e, "Outro boleto já usa esta linha digitável, ou este já foi substituído. Recarregue.");
  }

  await createAuditLog("obrigacoes:substituir", {
    boletoId,
    novoBoletoId: novoId,
    valorDocumento: doc.valorDocumento,
    vencimentoDocumento: doc.vencimentoDocumento.toISOString().slice(0, 10),
    divergenciaJustificativa: doc.divergenciaJustificativa,
  });
  revalidatePath(ROTA);
  return { ok: true };
}

/**
 * Quem paga o boleto: a empresa ("empresa") ou a BFX ("bfx"). Só em boleto vivo. A trava
 * "bfx → empresa só sem parcela em fechamento conferido" entra na Fase 5, com o fechamento.
 */
export async function alterarDirecionamento(boletoId: number, destino: "empresa" | "bfx"): Promise<Resp> {
  await requireAdminOrThrow();
  if (destino !== DIRECIONAMENTO.empresa && destino !== DIRECIONAMENTO.bfx) {
    return { ok: false, erro: "Direcionamento inválido." };
  }
  const id = idPositivo(boletoId);
  const erro = "Boleto não encontrado, já com esse direcionamento ou fora de uso.";
  if (!id) return { ok: false, erro };

  // Fase 5 (spec §3.4): devolver à empresa um boleto com parcela em fechamento conferido ou
  // posterior faria a empresa pagar a parcela duas vezes (Prudent e Pix). Numa transação, o boleto
  // é travado (update) antes de olhar os fechamentos: o conferir trava os mesmos boletos, então um
  // espera o outro e a leitura seguinte já vê o status novo.
  try {
    await prisma.$transaction(async (tx) => {
      const { count } = await tx.boletoPrudent.updateMany({
        where: { id, status: { notIn: MORTO }, direcionamento: { not: destino } },
        data: { direcionamento: destino },
      });
      if (count === 0) throw new ErroBoleto(erro);
      if (destino !== DIRECIONAMENTO.empresa) return;
      const travada = await tx.parcelaVencimento.findFirst({
        where: { boletoPrudentId: id, fechamento: { status: { not: STATUS_FECHAMENTO.emPreparacao } } },
        select: { vendaId: true, numeroParcela: true, fechamento: { select: { status: true, competencia: true } } },
      });
      if (travada?.fechamento) {
        const status = ROTULO_STATUS_FECHAMENTO[travada.fechamento.status] ?? travada.fechamento.status;
        throw new ErroBoleto(
          `Parcela deste boleto está no fechamento de ${rotuloCompetencia(travada.fechamento.competencia)} (${status}). ` +
            "Reabra o fechamento antes de devolver o boleto à empresa."
        );
      }
    });
  } catch (e) {
    return erroDe(e, erro);
  }

  await createAuditLog("obrigacoes:direcionamento", { boletoId: id, destino });
  revalidatePath(ROTA);
  return { ok: true };
}
