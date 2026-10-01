/**
 * Envio do demonstrativo ao RH (Fase 5) com o Pix do Asaas (Fase 6). Só de fechamento conferido.
 *
 * 1. Valida (versão, e-mail do RH, Asaas configurado, CNPJ) antes de qualquer chamada ou gravação.
 * 2. Cliente Asaas da empresa; cobranças ativas de versões anteriores encerradas (paga → recebimento;
 *    senão cancelada no Asaas). Ainda conferido: nada a desfazer se falhar.
 * 3. Reivindica o envio (conferido → enviado, com a versão no where): só um envio segue daqui.
 * 4. Cobrança Pix da versão pelo saldo (valor final − já recebido); saldo ≤ 0 → sem cobrança.
 * 5. PDF com o bloco "Pague com Pix"; e-mail com PDF, XLSX, QR (`pix-<competência>.png`) e o
 *    copia-e-cola numa linha só. Falha no Pix ou no SMTP → volta a conferido (a cobrança criada
 *    fica ativa e é reaproveitada no próximo envio da mesma versão).
 * 6. PDF guardado na versão; recalcula (o já recebido pode cobrir a versão nova → pago).
 *
 * Ver docs/superpowers/specs/2026-09-30-fechamento-pix-prudent-design.md §5.2 e §5.4.
 */
import { prisma } from "@/lib/db";
import { sendEmail } from "@/lib/email";
import { emailsCopia } from "@/lib/email-copia";
import { escaparHtml } from "@/lib/html";
import { formatarDataPura } from "@/lib/data-pura";
import { formatBRL } from "@/lib/utils";
import { STATUS_FECHAMENTO, intervaloCompetencia, rotuloCompetencia } from "@/lib/fechamento";
import {
  desfazerReivindicacao,
  marcarEnviado,
  montarDemonstrativo,
  nomeArquivoDemonstrativo,
  reivindicarEnvio,
} from "@/lib/fechamento-db";
import { gerarFechamentoPdf } from "@/lib/fechamento-pdf";
import { sha256Hex } from "@/lib/arquivo-financeiro";
import { regraVigente } from "@/lib/regra-empresa";
import { regrasDaEmpresa } from "@/lib/regra-empresa-db";
import { XLSX_MIME } from "@/lib/relatorio-mensal-xlsx";
import { getAsaasConfig, getOrCreateCustomerEmpresa } from "@/lib/asaas";
import { encerrarCobrancasAnteriores, garantirCobrancaPix } from "@/lib/cobranca-fechamento-db";
import { recalcularEAvisar } from "@/lib/recebimento-fechamento-db";
import { hojeDataPura } from "@/lib/data-pura";

/**
 * Envios em andamento neste processo: o clique duplo não manda dois e-mails. (Entre processos, o
 * `marcarEnviado` com o status no where impede o segundo "enviado", mas não o segundo e-mail.)
 */
const enviando = new Set<number>();

/** Uma linha só: sem \r, \n nem separadores Unicode de linha (o espaço interno do payload conta). */
function umaLinha(texto: string): string {
  return Array.from(texto.trim()).filter((c) => !"\r\n\u2028\u2029".includes(c)).join("");
}

/**
 * Corpo do e-mail: saudação, competência, valor final, o já recebido e o Pix (valor, vencimento,
 * copia-e-cola num bloco monoespaçado que não quebra — o e-mail é a fonte para copiar; o PDF pode
 * quebrar a linha), e os anexos.
 */
export function htmlEmailFechamento(e: {
  empresa: string;
  competencia: string;
  versao: number;
  totalFinal: number;
  vencimentoPix: Date;
  anexos: string[];
  pix: { copiaECola: string; valor: number; identificacao: string } | null;
  recebido: number;
}): string {
  const competencia = escaparHtml(rotuloCompetencia(e.competencia));
  const anexos = e.anexos.map((a) => `<li>${escaparHtml(a)}</li>`).join("");
  const rotulo = (t: string) => `<p style="margin:0 0 4px;font-size:13px;color:#4b5563">${t}</p>`;
  const valor = (v: number, tamanho: number) =>
    `<p style="margin:0 0 16px;font-size:${tamanho}px;font-weight:bold">${escaparHtml(formatBRL(v))}</p>`;
  const recebido = e.recebido > 0 ? `${rotulo("Já recebido")}\n${valor(e.recebido, 16)}\n` : "";
  const pix = e.pix
    ? `${rotulo("Valor do Pix")}
${valor(e.pix.valor, 24)}
<p style="margin:0 0 16px">Vencimento do Pix: ${escaparHtml(formatarDataPura(e.vencimentoPix))}</p>
<p style="margin:0 0 4px">Pix copia e cola (o QR Code está em anexo):</p>
<div style="margin:0 0 8px;padding:12px;border:1px solid #d1d5db;border-radius:6px;background:#f9fafb;font-family:'Courier New',Courier,monospace;font-size:12px;white-space:nowrap;overflow-x:auto">${escaparHtml(umaLinha(e.pix.copiaECola))}</div>
<p style="margin:0 0 16px;font-size:13px;color:#4b5563">Identificação: ${escaparHtml(e.pix.identificacao)}</p>`
    : `<p style="margin:0 0 16px"><strong>Nada a pagar:</strong> o valor deste demonstrativo já foi recebido.</p>`;
  return `<!doctype html>
<html lang="pt-BR"><body style="margin:0;padding:24px;font-family:Arial,Helvetica,sans-serif;color:#1f2937;background:#ffffff">
<p style="margin:0 0 16px">Olá,</p>
<p style="margin:0 0 16px">Segue o demonstrativo BFX de <strong>${competencia}</strong> da ${escaparHtml(e.empresa)} (versão ${e.versao}).</p>
${rotulo("Valor final do demonstrativo")}
${valor(e.totalFinal, e.pix && e.recebido === 0 ? 16 : 24)}
${recebido}${pix}
<p style="margin:0 0 4px">Anexos:</p>
<ul style="margin:0 0 16px;padding-left:20px">${anexos}</ul>
<p style="margin:0">Qualquer dúvida, é só responder este e-mail.</p>
</body></html>`;
}

export async function enviarFechamento(e: { fechamentoId: number; versao: number; usuario: string | null }): Promise<{ versao: number; para: string }> {
  if (enviando.has(e.fechamentoId)) throw new Error("Envio deste fechamento já em andamento. Aguarde.");
  enviando.add(e.fechamentoId);
  try {
    return await enviar(e);
  } finally {
    enviando.delete(e.fechamentoId);
  }
}

async function enviar(e: { fechamentoId: number; versao: number; usuario: string | null }): Promise<{ versao: number; para: string }> {
  const f = await prisma.fechamento.findUnique({
    where: { id: e.fechamentoId },
    select: {
      id: true,
      status: true,
      competencia: true,
      versaoAtual: true,
      responsavel: true,
      empresaParceiraId: true,
      empresaParceira: { select: { id: true, nome: true, cnpj: true, emailRh: true, emailCopia: true, asaasCustomerId: true } },
      // A versão atual é a de maior número (conferir cria versaoAtual + 1).
      versoes: {
        orderBy: { numero: "desc" },
        take: 1,
        select: {
          id: true,
          numero: true,
          totalBruto: true,
          totalAjustes: true,
          totalFinal: true,
          ajustesJson: true,
          xlsx: { select: { nome: true, conteudo: true } },
          linhas: {
            select: {
              vendaId: true,
              numeroParcela: true,
              totalParcelas: true,
              clienteNome: true,
              matricula: true,
              valor: true,
              vencimento: true,
              loteId: true,
              antecipada: true,
            },
            orderBy: [{ vendaId: "asc" }, { numeroParcela: "asc" }],
          },
        },
      },
    },
  });
  if (!f) throw new Error("Fechamento não encontrado.");
  if (f.status !== STATUS_FECHAMENTO.conferido) throw new Error("Só um fechamento conferido pode ser enviado ao RH.");
  // A versão que a tela mostrou ao confirmar: se outra aba reabriu e conferiu de novo, não envia a outra.
  if (f.versaoAtual !== e.versao) {
    throw new Error(`O fechamento está na versão ${f.versaoAtual}, não na ${e.versao}. Recarregue antes de enviar.`);
  }

  const empresa = f.empresaParceira;
  const emailRh = empresa.emailRh?.trim();
  if (!emailRh) {
    throw new Error(`${empresa.nome} não tem e-mail do RH. Cadastre em Cadastros › Empresas antes de enviar.`);
  }

  const versao = f.versoes[0];
  if (!versao || versao.numero !== f.versaoAtual || !versao.xlsx) throw new Error("A versão conferida está sem a planilha. Reabra e confira de novo.");

  const { inicio } = intervaloCompetencia(f.competencia);
  const regra = regraVigente(await regrasDaEmpresa(empresa.id), inicio);
  const ajustes = JSON.parse(versao.ajustesJson) as { valor: number; justificativa: string }[];
  const dados = montarDemonstrativo({
    empresa: { nome: empresa.nome, cnpj: empresa.cnpj },
    competencia: f.competencia,
    versao: versao.numero,
    regra,
    responsavel: f.responsavel,
    linhas: versao.linhas,
    ajustes,
    totalBruto: versao.totalBruto,
    totalAjustes: versao.totalAjustes,
    totalFinal: versao.totalFinal,
  });

  // Antes de qualquer chamada ao Asaas ou gravação: configuração e CNPJ.
  const cfg = await prisma.config.findFirst({ select: { logoPath: true, asaasApiKey: true, asaasEnv: true } });
  const asaas = getAsaasConfig(cfg ?? undefined);
  if (!asaas) throw new Error("Configure o Asaas em Configurações para gerar o Pix.");
  if ((empresa.cnpj ?? "").replace(/\D/g, "").length !== 14) throw new Error("Cadastre o CNPJ da empresa para gerar o Pix.");

  const customerId = await getOrCreateCustomerEmpresa(empresa, prisma, asaas);
  try {
    await encerrarCobrancasAnteriores({ fechamentoId: f.id, versaoId: versao.id, config: asaas });
  } catch (erro) {
    console.error("[fechamento-envio] falha ao encerrar a cobrança anterior:", erro);
    throw new Error(
      "Não foi possível cancelar a cobrança anterior no Asaas (ela pode ter acabado de ser paga). " +
        "Recarregue e tente de novo; o fechamento continua conferido."
    );
  }

  const nomePdf = nomeArquivoDemonstrativo(empresa.nome, f.competencia, versao.numero, "pdf");
  const xlsx = Buffer.from(versao.xlsx.conteudo);
  const cc = emailsCopia(empresa.emailCopia, emailRh);

  await reivindicarEnvio({ fechamentoId: f.id, versao: versao.numero });

  let cobranca: Awaited<ReturnType<typeof garantirCobrancaPix>>;
  try {
    cobranca = await garantirCobrancaPix({
      fechamentoId: f.id,
      versaoId: versao.id,
      versao: versao.numero,
      empresaId: empresa.id,
      empresaNome: empresa.nome,
      competencia: f.competencia,
      customerId,
      totalFinal: versao.totalFinal,
      diaPix: regra.diaPix,
      config: asaas,
      hoje: hojeDataPura(),
    });
  } catch (erro) {
    console.error("[fechamento-envio] falha ao gerar o Pix:", erro);
    await desfazerReivindicacao({ fechamentoId: f.id, versao: versao.numero }).catch((x) =>
      console.error("[fechamento-envio] não voltou a conferido depois da falha no Pix:", x)
    );
    const motivo = erro instanceof Error && erro.message ? ` (${erro.message})` : "";
    throw new Error(`Não foi possível gerar o Pix no Asaas${motivo}. O fechamento continua conferido.`);
  }

  const pix = cobranca.pix;
  const pdf = await gerarFechamentoPdf({
    ...dados,
    pix: pix
      ? { copiaECola: pix.copiaECola, qrPng: pix.qrPng, vencimento: pix.vencimento, identificacao: pix.identificacao, valor: pix.valor }
      : null,
    logoPath: cfg?.logoPath ?? null,
  });
  const nomeQr = `pix-${f.competencia}.png`;

  try {
    await sendEmail({
      to: emailRh,
      ...(cc.length > 0 ? { cc } : {}),
      subject: `Demonstrativo BFX — ${rotuloCompetencia(f.competencia)} — ${empresa.nome}`,
      html: htmlEmailFechamento({
        empresa: empresa.nome,
        competencia: f.competencia,
        versao: versao.numero,
        totalFinal: versao.totalFinal,
        vencimentoPix: pix?.vencimento ?? dados.vencimentoPix,
        anexos: [nomePdf, versao.xlsx.nome, ...(pix ? [nomeQr] : [])],
        pix: pix ? { copiaECola: pix.copiaECola, valor: pix.valor, identificacao: pix.identificacao } : null,
        recebido: cobranca.recebido,
      }),
      attachments: [
        { filename: nomePdf, contentType: "application/pdf", content: pdf },
        { filename: versao.xlsx.nome, contentType: XLSX_MIME, content: xlsx },
        ...(pix ? [{ filename: nomeQr, contentType: "image/png", content: Buffer.from(pix.qrPng) }] : []),
      ],
      registro: { tipo: "fechamento", empresaId: empresa.id, origem: "manual" },
    });
  } catch (erro) {
    console.error("[fechamento-envio] falha no e-mail:", erro);
    await desfazerReivindicacao({ fechamentoId: f.id, versao: versao.numero }).catch((x) =>
      console.error("[fechamento-envio] não voltou a conferido depois da falha no e-mail:", x)
    );
    // O detalhe (host, resposta do servidor) fica no histórico de e-mails, não na tela.
    throw new Error("O e-mail não saiu. O motivo ficou no histórico de e-mails; o fechamento continua conferido.");
  }

  const arquivo = await prisma.arquivoFinanceiro.create({
    data: {
      nome: nomePdf,
      contentType: "application/pdf",
      tamanho: pdf.length,
      sha256: sha256Hex(pdf),
      conteudo: new Uint8Array(pdf),
      criadoPor: e.usuario,
    },
    select: { id: true },
  });
  await marcarEnviado({ fechamentoId: f.id, versao: versao.numero, pdfArquivoId: arquivo.id, usuario: e.usuario });
  // O já recebido (de versões anteriores) pode cobrir esta: pago_parcial ou pago agora.
  await recalcularEAvisar(f.id).catch((x) => console.error("[fechamento-envio] falha ao recalcular depois do envio:", x));
  return { versao: versao.numero, para: emailRh };
}
