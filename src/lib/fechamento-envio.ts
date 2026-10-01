/**
 * Envio do demonstrativo ao RH (Fase 5). Só de fechamento conferido: gera o PDF da versão atual
 * (sem Pix — o bloco entra na Fase 6), manda PDF + XLSX ao `emailRh` com Cc `emailCopia`, registra
 * no histórico de e-mails (tipo "fechamento"). Antes do SMTP o fechamento é reivindicado
 * (conferido → enviado, com a versão no where); se o e-mail falha, volta a conferido. Depois do
 * e-mail, o PDF fica guardado na versão.
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

/**
 * Envios em andamento neste processo: o clique duplo não manda dois e-mails. (Entre processos, o
 * `marcarEnviado` com o status no where impede o segundo "enviado", mas não o segundo e-mail.)
 */
const enviando = new Set<number>();

/** Corpo do e-mail: saudação, competência, valor final em destaque, vencimento do Pix e anexos. */
export function htmlEmailFechamento(e: {
  empresa: string;
  competencia: string;
  versao: number;
  totalFinal: number;
  vencimentoPix: Date;
  anexos: string[];
}): string {
  const competencia = escaparHtml(rotuloCompetencia(e.competencia));
  const anexos = e.anexos.map((a) => `<li>${escaparHtml(a)}</li>`).join("");
  return `<!doctype html>
<html lang="pt-BR"><body style="margin:0;padding:24px;font-family:Arial,Helvetica,sans-serif;color:#1f2937;background:#ffffff">
<p style="margin:0 0 16px">Olá,</p>
<p style="margin:0 0 16px">Segue o demonstrativo BFX de <strong>${competencia}</strong> da ${escaparHtml(e.empresa)} (versão ${e.versao}).</p>
<p style="margin:0 0 4px;font-size:13px;color:#4b5563">Valor final a pagar</p>
<p style="margin:0 0 16px;font-size:24px;font-weight:bold">${escaparHtml(formatBRL(e.totalFinal))}</p>
<p style="margin:0 0 16px">Vencimento do Pix: ${escaparHtml(formatarDataPura(e.vencimentoPix))}</p>
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
      empresaParceira: { select: { id: true, nome: true, cnpj: true, emailRh: true, emailCopia: true } },
      // A versão atual é a de maior número (conferir cria versaoAtual + 1).
      versoes: {
        orderBy: { numero: "desc" },
        take: 1,
        select: {
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

  const cfg = await prisma.config.findFirst({ select: { logoPath: true } });
  const pdf = await gerarFechamentoPdf({ ...dados, pix: null, logoPath: cfg?.logoPath ?? null });
  const nomePdf = nomeArquivoDemonstrativo(empresa.nome, f.competencia, versao.numero, "pdf");
  const xlsx = Buffer.from(versao.xlsx.conteudo);

  const cc = emailsCopia(empresa.emailCopia, emailRh);
  await reivindicarEnvio({ fechamentoId: f.id, versao: versao.numero });
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
        vencimentoPix: dados.vencimentoPix,
        anexos: [nomePdf, versao.xlsx.nome],
      }),
      attachments: [
        { filename: nomePdf, contentType: "application/pdf", content: pdf },
        { filename: versao.xlsx.nome, contentType: XLSX_MIME, content: xlsx },
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
  return { versao: versao.numero, para: emailRh };
}
