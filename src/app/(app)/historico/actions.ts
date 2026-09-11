"use server";

import { prisma } from "@/lib/db";
import { checkboxLigado } from "@/lib/form-values";
import { revalidarVenda } from "@/lib/revalidacao";
import { createAuditLog } from "@/lib/audit";
import { sendVendaNotification } from "@/lib/email";
import {
  formaFromLegacyFlags,
  isFormaPagamento,
  legacyFlagsFromForma,
  type FormaPagamento,
} from "@/lib/forma-pagamento";
import { custoAntecipacaoVenda, lucroLiquidoComAntecipacao } from "@/lib/antecipacao-custo";

export async function updateVenda(formData: FormData): Promise<{ success: boolean; error?: string }> {
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

  const valorLegado = itens.length > 0 ? 0 : Number(formData.get("valor") || 0);
  const quantidadeLegado = itens.length > 0 ? 0 : Number(formData.get("quantidade") || 1);
  const custoLegado = itens.length > 0 ? 0 : Number(formData.get("custo_prod") || 0);

  if (!id || !data) return { success: false, error: "Dados inválidos." };

  const subtotal = itens.length > 0
    ? itens.reduce((s, i) => s + i.subtotal, 0)
    : valorLegado * quantidadeLegado;
  const totalCusto = itens.length > 0
    ? itens.reduce((s, i) => s + i.custoProduto * i.quantidade, 0)
    : custoLegado * quantidadeLegado;
  const valorDescontoNota = temNota ? (subtotal * taxaNota) / 100 : 0;
  const total = subtotal + frete - desconto;
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
    };
    let parcelasExistentes: ParcelaExistente[] = [];
    // Ligado quando a venda vira pagamento unico sem payload de parcelas (CR-01).
    let limparParcelasSemPayload = false;
    try {
      parcelasExistentes = await prisma.parcelaVencimento.findMany({
        where: { vendaId: id },
        select: { numeroParcela: true, paga: true, dataPagamento: true, dataVencimento: true, valorParcela: true, antecipada: true },
      });
    } catch {
      // Tabela parcelas_vencimento pode não existir em produção antiga
    }
    // As linhas sao apagadas e recriadas no save: o que precisa sobreviver a
    // edicao (pagamento e antecipacao na Prudent) sai daqui, pelo numero da parcela.
    const pagasMap = new Map(
      parcelasExistentes.map((p) => [
        p.numeroParcela,
        { paga: p.paga, dataPagamento: p.dataPagamento, antecipada: p.antecipada },
      ])
    );

    if (parcelasForm.length > 0) {
      // T-ddr-01: nunca apagar em silencio uma parcela ja marcada como paga. O
      // payload vem do cliente (hidden parcelasVencimento) — o servidor confia nele
      // para apagar e recriar todas as linhas de parcelas_vencimento, entao a guarda
      // precisa estar aqui, ANTES de qualquer escrita (cabecalho ainda intacto).
      const numerosNoPayload = new Set(parcelasForm.map((p) => p.numeroParcela));
      // Antecipada conta como paga: a linha e o unico registro de que o dinheiro ja
      // veio da Prudent, e apaga-la faria a parcela sumir do "ja antecipado".
      const travadasDescartadas = parcelasExistentes.filter(
        (p) => (p.paga || p.antecipada) && !numerosNoPayload.has(p.numeroParcela)
      );
      if (travadasDescartadas.length > 0) {
        const numeros = travadasDescartadas.map((p) => p.numeroParcela).join(", ");
        return {
          success: false,
          error: `Nao e possivel salvar: a(s) parcela(s) ${numeros} ja esta(o) paga(s) ou antecipada(s) e seria(m) apagada(s).`,
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
      const travadasExistentes = parcelasExistentes.filter((p) => p.paga || p.antecipada);
      if (travadasExistentes.length > 0) {
        const numeros = travadasExistentes.map((p) => p.numeroParcela).join(", ");
        return {
          success: false,
          error: `Nao e possivel mudar para ${parcelasNum} parcela(s): a(s) parcela(s) ${numeros} ja esta(o) paga(s) ou antecipada(s).`,
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
    const numerosFinais = limparParcelasSemPayload
      ? []
      : parcelasForm.length > 0
        ? parcelasForm.map((p) => p.numeroParcela)
        : parcelasExistentes.map((p) => p.numeroParcela);
    const antecipadasAposSalvar = numerosFinais.filter((n) => pagasMap.get(n)?.antecipada).length;
    const novoStatusAntecipacao =
      antecipadasAposSalvar === 0 ? undefined : antecipadasAposSalvar === numerosFinais.length ? 1 : 3;

    await prisma.venda.update({
      where: { id },
      data: {
        ...(novoStatusAntecipacao !== undefined ? { antecipada: novoStatusAntecipacao } : {}),
        dataVenda: new Date(data),
        vendedor: vendedorTexto,
        vendedorId: vendedorUser?.id ?? undefined,
        produtoNome: itens.length > 0 ? (itens[0].produtoNome || "") : String(formData.get("produto") || ""),
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
        await prisma.parcelaVencimento.createMany({
          data: parcelasForm.map((p) => {
            const existente = pagasMap.get(p.numeroParcela);
            return {
              vendaId: id,
              numeroParcela: p.numeroParcela,
              dataVencimento: new Date(p.dataVencimento),
              valorParcela: p.valorParcela,
              paga: existente?.paga ?? false,
              dataPagamento: existente?.dataPagamento ?? null,
              // Sem isto a parcela ja antecipada na Prudent voltava a "a antecipar"
              // a cada edicao da venda, e a fila deixava antecipa-la de novo.
              antecipada: existente?.antecipada ?? false,
            };
          }),
        });
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
    revalidarVenda();
    return { success: true };
  } catch (err) {
    console.error("Erro ao atualizar venda:", err);
    return { success: false, error: "Erro ao salvar alterações. Tente novamente." };
  }
}

export async function enviarEmailEmpresa(vendaId: number): Promise<{ success: boolean; error?: string }> {
  if (!vendaId) return { success: false, error: "ID da venda invalido." };

  try {
    const venda = await prisma.venda.findUnique({
      where: { id: vendaId },
      include: {
        cliente: { select: { nome: true, matricula: true, empresa: true, empresaParceiraId: true } },
        itens: { select: { produtoNome: true, quantidade: true, subtotal: true } },
      },
    });

    if (!venda) return { success: false, error: "Venda nao encontrada." };
    if (!venda.cliente?.empresaParceiraId && !venda.cliente?.empresa) {
      return { success: false, error: "Cliente nao vinculado a nenhuma empresa." };
    }

    const sent = await sendVendaNotification({
      ...venda,
      cliente: venda.cliente ?? undefined,
    });

    if (!sent) {
      return { success: false, error: "Empresa nao encontrada ou sem contato configurado." };
    }

    return { success: true };
  } catch (err) {
    console.error("[enviarEmailEmpresa] Erro:", err);
    return { success: false, error: "Erro ao enviar email." };
  }
}

export async function deleteVenda(formData: FormData): Promise<void> {
  const id = Number(formData.get("id") || 0);
  if (!id) return;

  try {
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
    revalidarVenda();
  } catch (err) {
    console.error("Erro ao excluir venda:", err);
    throw new Error("Erro ao excluir venda. Tente novamente.");
  }
}
