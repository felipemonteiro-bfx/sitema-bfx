"use server";

import { prisma } from "@/lib/db";
import { checkboxLigado } from "@/lib/form-values";
import { revalidarVenda } from "@/lib/revalidacao";
import { createAuditLog } from "@/lib/audit";
import { enviarTermoAssinadoAoRh } from "@/lib/email";
import {
  FORMA_PAGAMENTO,
  formaFromLegacyFlags,
  isFormaPagamento,
  legacyFlagsFromForma,
  type FormaPagamento,
} from "@/lib/forma-pagamento";
import { custoAntecipacaoVenda, lucroLiquidoComAntecipacao } from "@/lib/antecipacao-custo";
import { recalcularConsignadoSeguro } from "@/lib/consignado-db";
import { requireSessionOrThrow } from "@/lib/guards";
import { numerosDeParcelaRepetidos, parcelaUnicaDaFolha, valorParcelaAposEdicao } from "@/lib/parcelas";
import { regraDoClienteNaData } from "@/lib/regra-empresa-db";
import type { RegraVencimento } from "@/lib/regra-empresa";
import { flagDaVenda } from "@/lib/lote-antecipacao";
import { valorTotalVenda } from "@/lib/venda-utils";
import { z } from "zod";
import { produtoItemSchema } from "@/lib/validations/venda";
import { validarItensContraCatalogo } from "@/lib/venda-item-validation";

// Toda action daqui precisa da própria guarda: o matcher do middleware cobre só /api
// e o layout roda depois da action, então nenhum dos dois protege.

/** Parcela que a edição não pode apagar: paga, antecipada ou num lote aberto da Prudent. */
function travada(p: { paga: boolean; antecipada: boolean; antecipacaoLoteId?: number | null }): boolean {
  return p.paga || p.antecipada || p.antecipacaoLoteId != null;
}

function motivoTravada(parcelas: { paga: boolean; antecipada: boolean; antecipacaoLoteId?: number | null }[]): string {
  return parcelas.some((p) => p.antecipacaoLoteId != null && !p.paga && !p.antecipada)
    ? "esta(o) num lote enviado a Prudent"
    : "ja esta(o) paga(s) ou antecipada(s)";
}

export async function updateVenda(formData: FormData): Promise<{ success: boolean; error?: string }> {
  await requireSessionOrThrow();
  const id = Number(formData.get("id") || 0);
  const data = String(formData.get("data") || "");
  const frete = Number(formData.get("frete") || 0);
  const envio = Number(formData.get("envio") || 0);
  const temNota = checkboxLigado(formData.get("temNota"));
  const taxaNota = Number(formData.get("taxaNota") || 5.97);
  const desconto = Number(formData.get("desconto") || 0);
  // Forma de pagamento canonica. Quando o form nao envia (legacy), derivamos dos flags.
  const formaPagamentoRaw = formData.get("formaPagamento");
  const parcelasNum = Number(formData.get("parcelas") || 1);
  const formaPagamento: FormaPagamento = isFormaPagamento(formaPagamentoRaw)
    ? formaPagamentoRaw
    : formaFromLegacyFlags({
        descontoEmFolha: checkboxLigado(formData.get("descontoEmFolha")),
        boleto: checkboxLigado(formData.get("boleto")),
        parcelas: parcelasNum,
      });
  const { descontoEmFolha, boleto } = legacyFlagsFromForma(formaPagamento);

  type ItemForm = { produtoNome: string; custoProduto: number; valorVenda: number; quantidade: number; subtotal: number };
  let itens: ItemForm[] = [];
  const itensRaw = formData.get("itensJson");
  if (itensRaw) {
    try { itens = JSON.parse(String(itensRaw)); } catch { /* ignore */ }
  }

  if (!id || !data) return { success: false, error: "Dados inválidos." };

  // Mesmas regras da criação (vendaV2Schema + validarItensContraCatalogo): sem isto a
  // edição gravava custo negativo, subtotal que não é valor × quantidade ou frete negativo.
  const itensValidos = z.array(produtoItemSchema).safeParse(itens);
  if (!itensValidos.success) {
    return { success: false, error: itensValidos.error.issues[0]?.message ?? "Produtos inválidos." };
  }
  const erroItens = validarItensContraCatalogo(itens);
  if (erroItens) return { success: false, error: erroItens };
  if (!Number.isFinite(frete) || !Number.isFinite(envio) || !Number.isFinite(desconto) || !Number.isFinite(taxaNota)) {
    return { success: false, error: "Frete, custo de envio, desconto e taxa da nota precisam ser números." };
  }
  if (frete < 0 || envio < 0 || desconto < 0) {
    return { success: false, error: "Frete, custo de envio e desconto não podem ser negativos." };
  }
  if (taxaNota < 0 || taxaNota > 100) {
    return { success: false, error: "Taxa da nota deve ficar entre 0% e 100%." };
  }
  if (!Number.isInteger(parcelasNum) || parcelasNum < 1) {
    return { success: false, error: "Número de parcelas deve ser pelo menos 1." };
  }

  // Venda como está gravada: base do "mudou ou não" do valorParcela e dos dados de
  // produto quando o form não os traz.
  let vendaAntes: {
    clienteId?: number | null;
    dataVenda?: Date | null;
    formaPagamento?: string | null;
    descontoEmFolha?: boolean;
    boleto?: boolean;
    parcelas: number | null;
    valorFrete: number | null;
    desconto: number | null;
    valorVenda: number | null;
    quantidade: number | null;
    custoProduto: number | null;
    produtoNome: string | null;
    itens: { subtotal: number }[];
  } | null = null;
  try {
    vendaAntes = await prisma.venda.findUnique({
      where: { id },
      select: {
        clienteId: true,
        dataVenda: true,
        formaPagamento: true,
        descontoEmFolha: true,
        boleto: true,
        parcelas: true,
        valorFrete: true,
        desconto: true,
        valorVenda: true,
        quantidade: true,
        custoProduto: true,
        produtoNome: true,
        itens: { select: { subtotal: true } },
      },
    });
  } catch (err) {
    console.error("Erro ao ler venda para edição:", err);
    return { success: false, error: "Erro ao salvar alterações. Tente novamente." };
  }

  // O form de edição descarta item cujo nome é vazio/só espaço e não tem `valor`/`custo_prod`.
  // Sem dado de produto, o caminho legado gravaria valorVenda 0 e lucro sem receita.
  // - form mandou a lista e ela veio vazia: a edição do item seria perdida em silêncio → recusa;
  // - venda com itens gravados e nenhum item no payload: o cabeçalho não representa os itens → recusa;
  // - payload sem a lista numa venda legada (só cabeçalho): mantém os dados de produto gravados.
  const semDadoDeProduto = itens.length === 0 && !formData.has("valor");
  if (semDadoDeProduto && (itensRaw != null || (vendaAntes?.itens.length ?? 0) > 0)) {
    return {
      success: false,
      error: "Preencha o nome do produto antes de salvar: item sem nome não é gravado.",
    };
  }
  const legadoDoBanco = semDadoDeProduto ? vendaAntes : null;
  const valorLegado = itens.length > 0
    ? 0
    : legadoDoBanco ? (legadoDoBanco.valorVenda ?? 0) : Number(formData.get("valor") || 0);
  const quantidadeLegado = itens.length > 0
    ? 0
    : legadoDoBanco ? (legadoDoBanco.quantidade ?? 1) : Number(formData.get("quantidade") || 1);
  const custoLegado = itens.length > 0
    ? 0
    : legadoDoBanco ? (legadoDoBanco.custoProduto ?? 0) : Number(formData.get("custo_prod") || 0);
  const produtoLegado = legadoDoBanco
    ? (legadoDoBanco.produtoNome ?? "")
    : String(formData.get("produto") || "");

  const subtotal = itens.length > 0
    ? itens.reduce((s, i) => s + i.subtotal, 0)
    : valorLegado * quantidadeLegado;
  const totalCusto = itens.length > 0
    ? itens.reduce((s, i) => s + i.custoProduto * i.quantidade, 0)
    : custoLegado * quantidadeLegado;
  const valorDescontoNota = temNota ? (subtotal * taxaNota) / 100 : 0;
  const total = subtotal + frete - desconto;
  if (total < 0) {
    return { success: false, error: "Desconto maior que o valor da venda (produtos + frete)." };
  }
  const lucro = total - (totalCusto + envio + valorDescontoNota);

  // Parse do campo de parcelas subido para ANTES do `prisma.venda.update`:
  // alimenta tanto o calculo do custo de antecipacao logo abaixo quanto a
  // reescrita da tabela `parcelas_vencimento` mais adiante. Parsear duas
  // vezes abriria espaco para os dois lugares discordarem entre si.
  type ParcelaForm = { numeroParcela: number; dataVencimento: string; valorParcela: number };
  let parcelasForm: ParcelaForm[] = [];
  const parcelasRaw = formData.get("parcelasVencimento");
  if (parcelasRaw) {
    try {
      const parsed = JSON.parse(String(parcelasRaw));
      if (Array.isArray(parsed)) parcelasForm = parsed;
    } catch {
      // Tabela parcelas_vencimento pode não existir em produção antiga
    }
  }

  try {
    // Leitura de parcelaVencimento HOISTED para antes do prisma.venda.update: alimenta
    // a guarda de parcela paga logo abaixo, o calculo de custo de antecipacao mais
    // adiante e e reaproveitada no bloco de regravacao no fim — uma unica leitura,
    // nunca duas fontes que podem discordar entre si. Try/catch proprio: a tabela
    // parcelas_vencimento pode nao existir em producao antiga.
    type ParcelaExistente = {
      numeroParcela: number;
      paga: boolean;
      dataPagamento: Date | null;
      dataVencimento: Date;
      valorParcela: number;
      antecipada: boolean;
      origemPagamento?: string | null;
      asaasPaymentId?: string | null;
      baixaPor?: string | null;
      /** Lote enviado à Prudent esperando retorno (2026-09-17). */
      antecipacaoLoteId?: number | null;
      /** Envio ao RH e confirmação (2026-09-30, Fase 3). */
      enviadaRhEm?: Date | null;
      confirmacaoRh?: string | null;
      confirmacaoOrigem?: string | null;
      confirmacaoEm?: Date | null;
      confirmacaoPor?: string | null;
      confirmacaoMotivo?: string | null;
      /** Boleto Prudent da parcela antecipada (2026-09-30, Fase 4). */
      boletoPrudentId?: number | null;
    };
    let parcelasExistentes: ParcelaExistente[] = [];
    // Ligado quando a venda vira pagamento unico sem payload de parcelas (CR-01).
    let limparParcelasSemPayload = false;
    try {
      parcelasExistentes = await prisma.parcelaVencimento.findMany({
        where: { vendaId: id },
        select: {
          numeroParcela: true,
          paga: true,
          dataPagamento: true,
          dataVencimento: true,
          valorParcela: true,
          antecipada: true,
          origemPagamento: true,
          asaasPaymentId: true,
          baixaPor: true,
          antecipacaoLoteId: true,
          enviadaRhEm: true,
          confirmacaoRh: true,
          confirmacaoOrigem: true,
          confirmacaoEm: true,
          confirmacaoPor: true,
          confirmacaoMotivo: true,
          boletoPrudentId: true,
        },
      });
    } catch {
      // Tabela parcelas_vencimento pode não existir em produção antiga
    }
    // As linhas sao apagadas e recriadas no save: o que precisa sobreviver a
    // edicao (pagamento, baixa e antecipacao na Prudent) sai daqui, pelo numero da parcela.
    const pagasMap = new Map(
      parcelasExistentes.map((p) => [
        p.numeroParcela,
        {
          paga: p.paga,
          dataPagamento: p.dataPagamento,
          dataVencimento: p.dataVencimento,
          valorParcela: p.valorParcela,
          antecipada: p.antecipada,
          origemPagamento: p.origemPagamento ?? null,
          asaasPaymentId: p.asaasPaymentId ?? null,
          baixaPor: p.baixaPor ?? null,
          antecipacaoLoteId: p.antecipacaoLoteId ?? null,
          enviadaRhEm: p.enviadaRhEm ?? null,
          confirmacaoRh: p.confirmacaoRh ?? null,
          confirmacaoOrigem: p.confirmacaoOrigem ?? null,
          confirmacaoEm: p.confirmacaoEm ?? null,
          confirmacaoPor: p.confirmacaoPor ?? null,
          confirmacaoMotivo: p.confirmacaoMotivo ?? null,
          boletoPrudentId: p.boletoPrudentId ?? null,
        },
      ])
    );
    // Envio ao RH e confirmação (2026-09-30) sobrevivem à recriação, pelo número da parcela.
    // Parcela nova, sem par, nasce nula: aguardando o RH.
    const camposDoRh = (existente: ReturnType<typeof pagasMap.get>) => ({
      enviadaRhEm: existente?.enviadaRhEm ?? null,
      confirmacaoRh: existente?.confirmacaoRh ?? null,
      confirmacaoOrigem: existente?.confirmacaoOrigem ?? null,
      confirmacaoEm: existente?.confirmacaoEm ?? null,
      confirmacaoPor: existente?.confirmacaoPor ?? null,
      confirmacaoMotivo: existente?.confirmacaoMotivo ?? null,
    });

    if (parcelasForm.length > 0) {
      // Numero de parcela repetido (spec 2026-09-30 §3.2): com a unique
      // (venda_id, numero_parcela) o createMany falharia depois do deleteMany e a venda
      // ficaria sem linhas. Recusa aqui, antes de qualquer escrita.
      const repetidos = numerosDeParcelaRepetidos(parcelasForm);
      if (repetidos.length > 0) {
        return {
          success: false,
          error: `Parcela ${repetidos.join(", ")} aparece mais de uma vez. Revise as datas de vencimento.`,
        };
      }

      // T-ddr-01: nunca apagar em silencio uma parcela ja marcada como paga. O
      // payload vem do cliente (hidden parcelasVencimento) — o servidor confia nele
      // para apagar e recriar todas as linhas de parcelas_vencimento, entao a guarda
      // precisa estar aqui, ANTES de qualquer escrita (cabecalho ainda intacto).
      const numerosNoPayload = new Set(parcelasForm.map((p) => p.numeroParcela));
      // Antecipada conta como paga: a linha e o unico registro de que o dinheiro ja
      // veio da Prudent, e apaga-la faria a parcela sumir do "ja antecipado".
      const travadasDescartadas = parcelasExistentes.filter(
        (p) => travada(p) && !numerosNoPayload.has(p.numeroParcela)
      );
      if (travadasDescartadas.length > 0) {
        const numeros = travadasDescartadas.map((p) => p.numeroParcela).join(", ");
        return {
          success: false,
          error: `Nao e possivel salvar: a(s) parcela(s) ${numeros} ${motivoTravada(travadasDescartadas)} e seria(m) apagada(s).`,
        };
      }

      // T-ddr-02: cabecalho (parcelas) e linhas (parcelasVencimento) nunca podem
      // divergir — foi exatamente esse estado que a venda 182 ficou em producao.
      // updateVenda tem um unico consumidor de producao (EditVendaHistoricoForm via
      // historico/page.tsx), confirmado por grep antes de aplicar esta recusa.
      if (parcelasForm.length !== parcelasNum) {
        return {
          success: false,
          error: "Numero de parcelas nao bate com a quantidade de datas de vencimento informadas.",
        };
      }
    }

    // CR-01: o payload ausente NAO significa "nada a fazer com as parcelas".
    // Com o campo Parcelas em 1, EditParcelasSection desmonta inteiro
    // (`if (numeroParcelas <= 1) return null`), o hidden `parcelasVencimento`
    // some do formulario e as duas guardas acima ficam inalcancaveis — o
    // cabecalho gravava `parcelas: 1` e as N linhas antigas continuavam la.
    // Era o bug da venda 182 reproduzido por uso normal, sem erro na tela.
    if (parcelasForm.length === 0 && parcelasExistentes.length > 0 && parcelasNum !== parcelasExistentes.length) {
      // Mesma trava da guarda acima: parcela antecipada tambem nao pode ser apagada.
      const travadasExistentes = parcelasExistentes.filter(travada);
      if (travadasExistentes.length > 0) {
        const numeros = travadasExistentes.map((p) => p.numeroParcela).join(", ");
        return {
          success: false,
          error: `Nao e possivel mudar para ${parcelasNum} parcela(s): a(s) parcela(s) ${numeros} ${motivoTravada(travadasExistentes)}.`,
        };
      }
      if (parcelasNum > 1) {
        // Sem as datas nao da para gerar as linhas aqui sem inventar vencimento.
        return {
          success: false,
          error: "Abra \"Datas de Vencimento\" e confirme as datas antes de salvar.",
        };
      }
      // parcelasNum === 1 e nenhuma paga: virar a venda para pagamento unico
      // apaga as linhas, senao cabecalho e linhas divergem de novo.
      limparParcelasSemPayload = true;
    }

    // Em 1x sem payload (a secao de datas nao aparece), as linhas passam a ser as de
    // `parcelaUnicaDaFolha`: em folha, a parcela 1 recriada com o vencimento e o total
    // atuais; fora da folha, nenhuma. Com o total desconhecido nao da para gerar: nao mexe.
    const totalConhecido = itens.length > 0 || formData.has("valor") || legadoDoBanco != null;
    const geraLinhasUnicas = parcelasForm.length === 0 && parcelasNum === 1 && totalConhecido;
    const emFolha = formaPagamento === FORMA_PAGAMENTO.DESCONTO_FOLHA;
    // Save sem mudar a data da venda nem a forma de pagamento nao reescreve o vencimento gravado
    // da parcela 1 (2026-09-30): a linha e apagada e recriada a cada save, e regenerar aqui
    // trocaria em silencio o vencimento que a venda rapida gravou pela regra da empresa (ou que
    // alguem ajustou a mao). So quando a data ou a forma mudam o vencimento sai de novo da regra
    // da empresa do cliente na data da venda.
    const formaAntes = vendaAntes
      ? isFormaPagamento(vendaAntes.formaPagamento)
        ? vendaAntes.formaPagamento
        : formaFromLegacyFlags({
            descontoEmFolha: Boolean(vendaAntes.descontoEmFolha),
            boleto: Boolean(vendaAntes.boleto),
            parcelas: vendaAntes.parcelas ?? 1,
          })
      : null;
    const mesmaDataVenda =
      vendaAntes?.dataVenda instanceof Date &&
      !Number.isNaN(new Date(data).getTime()) &&
      vendaAntes.dataVenda.toISOString().slice(0, 10) === new Date(data).toISOString().slice(0, 10);
    const vencimentoGravado = pagasMap.get(1)?.dataVencimento;
    const manterVencimentoGravado = mesmaDataVenda && formaAntes === formaPagamento && vencimentoGravado != null;
    let regraUnica: RegraVencimento | undefined;
    if (geraLinhasUnicas && emFolha && !manterVencimentoGravado && vendaAntes?.clienteId) {
      regraUnica = await regraDoClienteNaData(vendaAntes.clienteId, new Date(data));
    }
    const linhasUnicas = geraLinhasUnicas
      ? parcelaUnicaDaFolha({ emFolha, dataVenda: new Date(data), total, regra: regraUnica })
          // Parcela paga ou antecipada mantem o vencimento e o valor gravados: a linha e o
          // registro do que a Prudent pagou. Aplicado aqui, e nao na hora de gravar, para a
          // taxa de antecipacao sair da MESMA lista que vai para o banco.
          .map((p) => {
            const existente = pagasMap.get(p.numeroParcela);
            if (existente && (existente.paga || existente.antecipada)) {
              return { ...p, dataVencimento: existente.dataVencimento, valorParcela: existente.valorParcela };
            }
            return manterVencimentoGravado && existente ? { ...p, dataVencimento: existente.dataVencimento } : p;
          })
      : null;
    if (linhasUnicas) {
      // So recusa a parcela travada que SUMIRIA (virou outra forma de pagamento, ou sobrava linha
      // de um parcelamento maior). A parcela 1 que fica e preservada mais abaixo.
      const numerosFinaisUnicos = new Set(linhasUnicas.map((p) => p.numeroParcela));
      const travadas = parcelasExistentes.filter((p) => travada(p) && !numerosFinaisUnicos.has(p.numeroParcela));
      if (travadas.length > 0) {
        const numeros = travadas.map((p) => p.numeroParcela).join(", ");
        return {
          success: false,
          error: `Nao e possivel salvar: a(s) parcela(s) ${numeros} ${motivoTravada(travadas)} e seria(m) apagada(s).`,
        };
      }
    }

    const vendedorTexto = String(formData.get("vendedor") || "");
    const vendedorUser = vendedorTexto ? await prisma.usuario.findFirst({
      where: { OR: [{ username: { equals: vendedorTexto, mode: "insensitive" } }, { nomeExibicao: { equals: vendedorTexto, mode: "insensitive" } }] },
      select: { id: true },
    }) : null;

    // Fonte das parcelas que define o custo de antecipacao: as do form quando
    // vieram; senao as que ja existem no banco (mesma leitura hoisted acima). Sem
    // esse fallback, editar so a data da venda (sem reenviar as parcelas) cairia no
    // fallback de 30/60/90 e inventaria uma taxa diferente da que a tela da Prudent
    // mostra para a mesma venda.
    const parcelasParaCusto =
      parcelasForm.length > 0
        ? parcelasForm.map((p) => ({ dataVencimento: p.dataVencimento, valorParcela: p.valorParcela }))
        : linhasUnicas
          ? linhasUnicas
          : parcelasExistentes.map((p) => ({ dataVencimento: p.dataVencimento, valorParcela: p.valorParcela }));

    // Custo de antecipacao Prudent (QK-LGJ-01): dado derivado da forma de
    // pagamento, no mesmo espirito do comentario acima sobre
    // `custoEnvioFonte` — tem de ser reescrito a cada save, senao fica
    // congelado num estado que nao corresponde mais a venda (ex.: taxa velha
    // sobrevivendo depois de trocar para Pix).
    const taxaAntecipacao = custoAntecipacaoVenda({
      formaPagamento,
      dataVenda: new Date(data),
      valorVenda: total,
      parcelas: parcelasNum,
      parcelas_detalhes: parcelasParaCusto.length > 0 ? parcelasParaCusto : undefined,
    });
    const lucroFinal = lucroLiquidoComAntecipacao(lucro, taxaAntecipacao);

    // Com antecipacao registrada por parcela, o flag da venda segue a regra da action
    // `antecipar` (todas -> 1, algumas -> 3): sem isto uma venda em 1 que ganhasse uma
    // parcela nova a esconderia da fila para sempre. Sem nenhuma parcela marcada o flag
    // nao e tocado — as vendas legadas tem a antecipacao so na venda (antecipada = 1).
    const numerosFinais = linhasUnicas
      ? linhasUnicas.map((p) => p.numeroParcela)
      : limparParcelasSemPayload
        ? []
        : parcelasForm.length > 0
          ? parcelasForm.map((p) => p.numeroParcela)
          : parcelasExistentes.map((p) => p.numeroParcela);
    const linhasFinais = numerosFinais.map((n) => ({
      antecipada: Boolean(pagasMap.get(n)?.antecipada),
      emAndamento: pagasMap.get(n)?.antecipacaoLoteId != null,
    }));
    // Mesma regra do lote (`flagDaVenda`): sem ela uma venda em andamento perdia o flag 2 ao salvar.
    const novoStatusAntecipacao =
      linhasFinais.some((l) => l.antecipada || l.emAndamento) ? flagDaVenda(linhasFinais) : undefined;

    // valorParcela alimenta limite de credito e consignado. Mudou parcelas ou total, a
    // parcela e recalculada; save sem mudanca nao reescreve o valor gravado (ver
    // valorParcelaAposEdicao). O total gravado e reconstruido do mesmo jeito que `total`.
    // Sem itens, sem `valor` e sem a venda gravada para completar, `total` sai 0 por
    // falta de dado, não por mudança real.
    const novoValorParcela = valorParcelaAposEdicao({
      antes: vendaAntes ? { parcelas: vendaAntes.parcelas, total: valorTotalVenda(vendaAntes) } : null,
      depois: { parcelas: parcelasNum, total: totalConhecido ? total : null },
    });

    const vendaAtualizada = await prisma.venda.update({
      where: { id },
      data: {
        ...(novoStatusAntecipacao !== undefined ? { antecipada: novoStatusAntecipacao } : {}),
        ...(novoValorParcela !== undefined ? { valorParcela: novoValorParcela } : {}),
        dataVenda: new Date(data),
        vendedor: vendedorTexto,
        vendedorId: vendedorUser?.id ?? undefined,
        produtoNome: itens.length > 0 ? (itens[0].produtoNome || "") : produtoLegado,
        quantidade: itens.length > 0 ? itens.reduce((s, i) => s + i.quantidade, 0) : quantidadeLegado,
        valorVenda: itens.length > 0 ? (itens[0]?.valorVenda ?? 0) : valorLegado,
        valorFrete: frete,
        custoEnvio: envio,
        // Quem edita a venda esta digitando o frete a mao: a procedencia volta a ser
        // "manual". Sem isto a fonte ficaria congelada em "uber_final" e uma recaptura
        // posterior sobrescreveria a correcao humana achando que so reconcilia.
        custoEnvioFonte: "manual",
        parcelas: parcelasNum,
        temNota,
        taxaNota,
        desconto,
        lucroLiquido: lucroFinal,
        taxaFinanceiraValor: taxaAntecipacao,
        descontoEmFolha,
        boleto,
        formaPagamento,
      },
      select: { clienteId: true },
    });

    if (itens.length > 0) {
      await prisma.itemVenda.deleteMany({ where: { vendaId: id } });
      await prisma.itemVenda.createMany({
        data: itens.map((item) => ({
          vendaId: id,
          produtoNome: item.produtoNome,
          custoProduto: item.custoProduto,
          valorVenda: item.valorVenda,
          quantidade: item.quantidade,
          subtotal: item.subtotal,
        })),
      });
    }

    if (parcelasForm.length > 0) {
      try {
        // Reaproveita o `pagasMap` montado a partir da leitura hoisted no topo do
        // try — nao reler aqui evita que as duas fontes discordem entre si.
        await prisma.parcelaVencimento.deleteMany({ where: { vendaId: id } });
        // asaas_payment_id é único: número de parcela repetido no payload copiaria o mesmo id para
        // duas linhas, o createMany lançaria P2002 depois do deleteMany e a venda perderia as linhas.
        const cobrancasUsadas = new Set<string>();
        await prisma.parcelaVencimento.createMany({
          data: parcelasForm.map((p) => {
            const existente = pagasMap.get(p.numeroParcela);
            // A cobrança do Asaas quita UMA parcela: na linha repetida a baixa dela não é copiada
            // (a antecipação é, porque trava a parcela contra ser apagada).
            const baixaRepetida =
              existente?.asaasPaymentId != null && cobrancasUsadas.has(existente.asaasPaymentId);
            if (existente?.asaasPaymentId) cobrancasUsadas.add(existente.asaasPaymentId);
            const baixa = baixaRepetida ? undefined : existente;
            return {
              vendaId: id,
              numeroParcela: p.numeroParcela,
              dataVencimento: new Date(p.dataVencimento),
              valorParcela: p.valorParcela,
              paga: baixa?.paga ?? false,
              dataPagamento: baixa?.dataPagamento ?? null,
              // Sem isto o lote em andamento perdia as parcelas a cada save da venda.
              antecipacaoLoteId: existente?.antecipacaoLoteId ?? null,
              // Sem isto a parcela ja antecipada na Prudent voltava a "a antecipar"
              // a cada edicao da venda, e a fila deixava antecipa-la de novo.
              antecipada: existente?.antecipada ?? false,
              // A baixa (Asaas, Prudent, manual) tambem precisa sobreviver: sem a origem e a
              // cobranca, a sincronizacao do Asaas nao reconhece a propria baixa.
              origemPagamento: baixa?.origemPagamento ?? null,
              asaasPaymentId: baixa?.asaasPaymentId ?? null,
              baixaPor: baixa?.baixaPor ?? null,
              // O boleto Prudent acompanha a antecipação: sem ele o boleto ficava sem parcela.
              boletoPrudentId: existente?.boletoPrudentId ?? null,
              ...camposDoRh(existente),
            };
          }),
        });
      } catch {
        // Tabela parcelas_vencimento pode não existir em produção antiga
      }
    } else if (linhasUnicas && (linhasUnicas.length > 0 || parcelasExistentes.length > 0)) {
      // 1x: ja foi verificado acima que nenhuma linha descartada esta paga ou antecipada. A
      // parcela mantida leva a baixa e a antecipacao que tinha — e, se estiver travada, tambem o
      // vencimento e o valor gravados: a linha antecipada e o registro do que a Prudent pagou.
      try {
        await prisma.parcelaVencimento.deleteMany({ where: { vendaId: id } });
        if (linhasUnicas.length > 0) {
          await prisma.parcelaVencimento.createMany({
            data: linhasUnicas.map((p) => {
              const existente = pagasMap.get(p.numeroParcela);
              return {
                vendaId: id,
                numeroParcela: p.numeroParcela,
                dataVencimento: p.dataVencimento,
                valorParcela: p.valorParcela,
                paga: existente?.paga ?? false,
                dataPagamento: existente?.dataPagamento ?? null,
                antecipacaoLoteId: existente?.antecipacaoLoteId ?? null,
                antecipada: existente?.antecipada ?? false,
                origemPagamento: existente?.origemPagamento ?? null,
                asaasPaymentId: existente?.asaasPaymentId ?? null,
                baixaPor: existente?.baixaPor ?? null,
                boletoPrudentId: existente?.boletoPrudentId ?? null,
                ...camposDoRh(existente),
              };
            }),
          });
        }
      } catch {
        // Tabela parcelas_vencimento pode não existir em produção antiga
      }
    } else if (limparParcelasSemPayload) {
      // A venda virou pagamento unico (CR-01). Ja foi verificado acima que
      // nenhuma linha esta paga, entao apagar aqui e' seguro e e' o que impede
      // o cabecalho (`parcelas: 1`) de divergir das linhas antigas.
      try {
        await prisma.parcelaVencimento.deleteMany({ where: { vendaId: id } });
      } catch {
        // Tabela parcelas_vencimento pode não existir em produção antiga
      }
    }

    await createAuditLog("venda:update", { vendaId: id, subtotal, lucro: lucroFinal });
    await recalcularConsignadoSeguro(vendaAtualizada.clienteId);
    revalidarVenda();
    return { success: true };
  } catch (err) {
    console.error("Erro ao atualizar venda:", err);
    return { success: false, error: "Erro ao salvar alterações. Tente novamente." };
  }
}

export async function enviarEmailEmpresa(vendaId: number): Promise<{ success: boolean; error?: string }> {
  await requireSessionOrThrow();
  if (!vendaId) return { success: false, error: "ID da venda invalido." };

  try {
    const venda = await prisma.venda.findUnique({
      where: { id: vendaId },
      select: {
        id: true,
        assinatura: { select: { assinaturaStatus: true } },
      },
    });

    if (!venda) return { success: false, error: "Venda não encontrada" };
    if (venda.assinatura?.assinaturaStatus !== "assinado") {
      return { success: false, error: "Termo assinado não encontrado" };
    }

    const resultado = await enviarTermoAssinadoAoRh(vendaId, { origem: "manual" });
    switch (resultado.status) {
      case "enviado":
        return { success: true };
      case "sem_email":
        return { success: false, error: "Empresa sem e-mail de RH" };
      case "erro_dados":
        return { success: false, error: "Termo assinado não encontrado" };
      case "falhou":
        return { success: false, error: "Falha ao enviar termo" };
    }
  } catch (err) {
    console.error("[enviarEmailEmpresa] Erro:", err);
    return { success: false, error: "Erro ao enviar termo" };
  }
}

export async function deleteVenda(formData: FormData): Promise<void> {
  await requireSessionOrThrow();
  const id = Number(formData.get("id") || 0);
  if (!id) return;

  try {
    // O cliente sai da venda junto com ela: guardar antes para recalcular a faixa depois.
    const venda = await prisma.venda.findUnique({ where: { id }, select: { clienteId: true } });

    // Restaurar estoque antes de deletar
    const itens = await prisma.itemVenda.findMany({
      where: { vendaId: id },
      select: { produtoNome: true, quantidade: true },
    });
    for (const item of itens) {
      await prisma.produto.updateMany({
        where: { nome: item.produtoNome },
        data: { qtdEstoque: { increment: item.quantidade } },
      });
    }

    // Deletar registros relacionados que têm ON DELETE RESTRICT
    await prisma.assinatura.deleteMany({ where: { vendaId: id } });
    await prisma.documento.deleteMany({ where: { vendaId: id } });

    await prisma.venda.delete({ where: { id } });
    await createAuditLog("venda:delete", { vendaId: id });
    await recalcularConsignadoSeguro(venda?.clienteId);
    revalidarVenda();
  } catch (err) {
    console.error("Erro ao excluir venda:", err);
    throw new Error("Erro ao excluir venda. Tente novamente.");
  }
}
