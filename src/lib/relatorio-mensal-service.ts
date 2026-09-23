/**
 * Orquestracao (com efeitos) do relatorio mensal por empresa parceira.
 *
 * Reune a logica pura, os dois geradores .xlsx e o envio ao RH, registrando o
 * resultado em `RelatorioEnvioLog`.
 *
 * Reusado por:
 *  - a rota cron `src/app/api/cron/relatorio-mensal/route.ts` (envio agendado);
 *  - a server action da pagina admin de relatorios mensais (reenvio manual).
 */
import { prisma } from "@/lib/db";
import { sendEmail } from "@/lib/email";
import { emailsCopia } from "@/lib/email-copia";
import { formatBRL } from "@/lib/utils";
import {
  resolverGruposEconomicos,
  montarDadosRelatorio,
  periodoLabel,
  periodoBoundaries,
  type EmpresaLite,
  type VinculoLite,
  type GrupoEconomico,
  type RelatorioMensalData,
} from "@/lib/relatorio-mensal";
import { gerarRelatorioMensalPdf } from "@/lib/relatorio-mensal-pdf";
import { XLSX_MIME, gerarPlanilhaAntecipacao, gerarRelatorioMensalXlsx } from "@/lib/relatorio-mensal-xlsx";
import { gerarPlanilhaModeloOficial } from "@/lib/relatorio-mensal-oficial-xls";
import { consolidarProdutosRelatorio } from "@/lib/relatorio-mensal-produtos";

export type StatusRelatorio = "enviado" | "erro" | "sem_vendas" | "sem_email";

export type ResultadoEmpresa = {
  empresaId: number;
  empresaNome: string;
  periodo: string;
  status: StatusRelatorio;
  totalVendas: number;
  valorTotal: number;
  erro?: string;
};

function isAlfaNum(c: string): boolean {
  const code = c.charCodeAt(0);
  return (
    (code >= 48 && code <= 57) || // 0-9
    (code >= 65 && code <= 90) || // A-Z
    (code >= 97 && code <= 122) // a-z
  );
}

function slugFilename(s: string): string {
  return s
    .normalize("NFD")
    .split("")
    .map((c) => (isAlfaNum(c) ? c : "-"))
    .join("")
    .split("-")
    .filter(Boolean)
    .join("-")
    .toLowerCase();
}

/** Busca vendas ativas do grupo economico no periodo (FK + fallback texto legado). */
async function buscarVendasDoGrupo(grupo: GrupoEconomico, inicio: Date, fim: Date) {
  const orClauses = [
    { empresaParceiraId: { in: grupo.empresaIds } },
    ...grupo.empresas.map((e) => ({
      empresa: { equals: e.nome, mode: "insensitive" as const },
      empresaParceiraId: null,
    })),
  ];

  return prisma.venda.findMany({
    where: {
      dataVenda: { gte: inicio, lte: fim },
      status: "ativa",
      cliente: { OR: orClauses },
    },
    include: {
      cliente: { select: { id: true, nome: true, cpf: true, matricula: true, empresa: true } },
      itens: { select: { produtoNome: true, quantidade: true, subtotal: true } },
      parcelasVencimento: {
        select: { numeroParcela: true, dataVencimento: true, valorParcela: true },
        orderBy: { numeroParcela: "asc" },
      },
    },
    orderBy: [{ dataVenda: "asc" }, { id: "asc" }],
  });
}

/** Grava/atualiza o log de envio (idempotente via unique empresaId+periodo+tipo). */
async function upsertLog(
  empresaId: number,
  periodo: string,
  data: {
    status: StatusRelatorio;
    destinatarios?: string | null;
    erro?: string | null;
    totalVendas: number;
    valorTotal: number;
    pdfKey?: string | null;
    xlsxKey?: string | null;
  }
) {
  const payload = {
    destinatarios: data.destinatarios ?? null,
    status: data.status,
    erro: data.erro ?? null,
    totalVendas: data.totalVendas,
    valorTotal: data.valorTotal,
    pdfKey: data.pdfKey ?? null,
    xlsxKey: data.xlsxKey ?? null,
    enviadoEm: new Date(),
  };
  await prisma.relatorioEnvioLog.upsert({
    where: { empresaId_periodo_tipo: { empresaId, periodo, tipo: "mensal" } },
    create: { empresaId, periodo, tipo: "mensal", ...payload },
    update: payload,
  });
}

function resumoHtml(empresaNome: string, periodo: string, dados: RelatorioMensalData): string {
  return `<!DOCTYPE html>
<html lang="pt-BR"><head><meta charset="UTF-8"><style>
  body { font-family: Arial, sans-serif; color: #222; background: #f7f8fa; margin: 0; padding: 20px; }
  .card { background: #fff; border-radius: 8px; padding: 24px; max-width: 560px; margin: 0 auto; box-shadow: 0 2px 8px rgba(0,0,0,0.07); }
  h2 { color: #122050; margin-top: 0; }
  .kpi { display: inline-block; margin-right: 24px; }
  .kpi span { display: block; font-size: 0.8em; color: #888; }
  .kpi strong { font-size: 1.2em; color: #122050; }
</style></head><body>
<div class="card">
  <h2>Relatório Mensal de Vendas — ${empresaNome}</h2>
  <p>Seguem em anexo as duas planilhas de desconto em folha de <strong>${periodoLabel(periodo)}</strong>.</p>
  <div>
    <div class="kpi"><span>Total de vendas</span><strong>${dados.totalVendas}</strong></div>
    <div class="kpi"><span>Valor total</span><strong>${formatBRL(dados.valorTotal)}</strong></div>
    <div class="kpi"><span>A descontar em folha</span><strong>${formatBRL(dados.totalDescontoFolha)}</strong></div>
  </div>
  <p style="margin-top:16px;font-size:0.85em;color:#888;">Enviado automaticamente pelo Sistema BFX.</p>
</div></body></html>`;
}

/** Processa um unico grupo economico: gera artefatos, envia e registra o log. */
async function processarGrupo(
  grupo: GrupoEconomico,
  periodo: string,
  limites: { inicio: Date; fim: Date },
  force: boolean
): Promise<ResultadoEmpresa> {
  const empresaId = grupo.canonica.id;
  const empresaNome = grupo.canonica.nome;
  const baseResult = { empresaId, empresaNome, periodo };

  // Idempotencia: pular se ja enviado com sucesso e sem force.
  if (!force) {
    const existente = await prisma.relatorioEnvioLog.findUnique({
      where: { empresaId_periodo_tipo: { empresaId, periodo, tipo: "mensal" } },
    });
    if (existente && existente.status === "enviado") {
      return { ...baseResult, status: "enviado", totalVendas: existente.totalVendas, valorTotal: existente.valorTotal };
    }
  }

  const vendas = await buscarVendasDoGrupo(grupo, limites.inicio, limites.fim);
  const dados = montarDadosRelatorio(vendas);

  if (dados.totalVendas === 0) {
    await upsertLog(empresaId, periodo, { status: "sem_vendas", totalVendas: 0, valorTotal: 0 });
    return { ...baseResult, status: "sem_vendas", totalVendas: 0, valorTotal: 0 };
  }

  try {
    const consolidado = consolidarProdutosRelatorio(vendas, limites.inicio, limites.fim);
    const antecipacao = gerarPlanilhaAntecipacao(consolidado.linhas, periodo);
    const oficial = gerarPlanilhaModeloOficial(consolidado.linhas, periodo);
    const empresaArquivo = slugFilename(empresaNome);
    const anexos = [
      { filename: `antecipacao-${empresaArquivo}-${periodo}.xlsx`, contentType: XLSX_MIME, content: antecipacao },
      { filename: `relatorio-oficial-${empresaArquivo}-${periodo}.xlsx`, contentType: XLSX_MIME, content: oficial },
    ];

    const emailRh = grupo.canonica.emailRh?.trim();
    if (!emailRh) {
      await upsertLog(empresaId, periodo, {
        status: "sem_email",
        totalVendas: dados.totalVendas,
        valorTotal: dados.valorTotal,
      });
      return { ...baseResult, status: "sem_email", totalVendas: dados.totalVendas, valorTotal: dados.valorTotal };
    }

    const cc = emailsCopia(grupo.canonica.emailCopia, emailRh);
    await sendEmail({
      to: emailRh,
      ...(cc.length > 0 ? { cc } : {}),
      subject: `Relatório Mensal de Vendas — ${empresaNome} (${periodoLabel(periodo)})`,
      html: resumoHtml(empresaNome, periodo, dados),
      attachments: anexos,
    });

    await upsertLog(empresaId, periodo, {
      status: "enviado",
      destinatarios: [emailRh, ...cc].join(", "),
      totalVendas: dados.totalVendas,
      valorTotal: dados.valorTotal,
    });
    await prisma.notificacao.create({
      data: {
        mensagem: `Relatório mensal (${periodoLabel(periodo)}) enviado para ${empresaNome}: ${dados.totalVendas} vendas, ${formatBRL(dados.valorTotal)}`,
        link: `/relatorios`,
        usuarioId: 1,
      },
    });

    return { ...baseResult, status: "enviado", totalVendas: dados.totalVendas, valorTotal: dados.valorTotal };
  } catch (err) {
    const erro = err instanceof Error ? err.message : String(err);
    console.error(`[relatorio-mensal] Erro ao processar ${empresaNome}:`, err);
    await upsertLog(empresaId, periodo, {
      status: "erro",
      erro,
      totalVendas: dados.totalVendas,
      valorTotal: dados.valorTotal,
    });
    return { ...baseResult, status: "erro", totalVendas: dados.totalVendas, valorTotal: dados.valorTotal, erro };
  }
}

/** Carrega empresas + vinculos e monta os grupos economicos. */
async function carregarGrupos(): Promise<GrupoEconomico[]> {
  const empresas = await prisma.empresaParceira.findMany({
    select: { id: true, nome: true, emailRh: true, emailCopia: true },
    orderBy: { id: "asc" },
  });
  const vinculosRaw = await prisma.empresaVinculo.findMany({
    select: { empresaId: true, vinculadaId: true },
  });
  const empresasLite: EmpresaLite[] = empresas.map((empresa) => ({
    ...empresa,
    emailsExtras: null,
    telefoneRh: null,
  }));
  const vinculos: VinculoLite[] = vinculosRaw;
  return resolverGruposEconomicos(empresasLite, vinculos);
}

/**
 * Regenera os artefatos (PDF + XLSX) do relatorio de uma empresa/periodo, sem enviar.
 * Usado pela rota de download da pagina admin. Retorna null se a empresa nao existir.
 */
export async function gerarArtefatosRelatorioMensal(
  empresaId: number,
  periodo: string
): Promise<{ pdf: Buffer; xlsx: Buffer; empresaNome: string } | null> {
  const grupos = await carregarGrupos();
  const grupo = grupos.find((g) => g.empresaIds.includes(empresaId));
  if (!grupo) return null;

  const { inicio, fim } = periodoBoundaries(periodo);
  const vendas = await buscarVendasDoGrupo(grupo, inicio, fim);
  const dados = montarDadosRelatorio(vendas);
  const cfgRow = await prisma.config.findFirst();
  const logoPath = (cfgRow?.logoPath as string | undefined) ?? null;

  const pdf = await gerarRelatorioMensalPdf({ empresaNome: grupo.canonica.nome, periodo, dados, logoPath });
  const xlsx = gerarRelatorioMensalXlsx(dados);
  return { pdf, xlsx, empresaNome: grupo.canonica.nome };
}

export type ProcessarRelatorioMensalOptions = {
  periodo: string;
  /** Se informado, processa apenas o grupo que contem esta empresa. */
  empresaId?: number;
  /** Ignora a idempotencia (reenvia mesmo se ja enviado). */
  force?: boolean;
  /** Inicio UTC do periodo; informe junto com `fim` para um mes corrente parcial. */
  inicio?: Date;
  /** Fim UTC do periodo; informe junto com `inicio` para um mes corrente parcial. */
  fim?: Date;
};

/** Processa o relatorio mensal de todas as empresas (ou de uma so, se `empresaId`). */
export async function processarRelatorioMensal(
  opts: ProcessarRelatorioMensalOptions
): Promise<{ periodo: string; resultados: ResultadoEmpresa[] }> {
  const { periodo, empresaId, force = false, inicio, fim } = opts;
  const limites = inicio && fim ? { inicio, fim } : periodoBoundaries(periodo);

  let grupos = await carregarGrupos();
  if (empresaId) {
    grupos = grupos.filter((g) => g.empresaIds.includes(empresaId));
  }

  const resultados: ResultadoEmpresa[] = [];
  for (const grupo of grupos) {
    resultados.push(await processarGrupo(grupo, periodo, limites, force));
  }
  return { periodo, resultados };
}
