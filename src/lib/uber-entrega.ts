/**
 * Cliente do Get Delivery Status da Uber Direct (custo REAL de uma entrega,
 * nao a cotacao — `src/lib/uber.ts` so cota) e persistencia do custo na
 * venda correspondente.
 *
 * QK-F21-01: o custo aterrissa em `Venda.custoEnvio`, NUNCA em `Despesa` —
 * `src/lib/finance.ts:81` ja soma `freteReal` (de `custoEnvio`) junto de
 * `variaveis` (de `Despesa`); gravar nos dois lugares contaria o mesmo
 * frete duas vezes no DRE.
 */
import { prisma } from "@/lib/db";
import { obterTokenUber, limparEntradaCacheTokenUber } from "@/lib/uber-auth";
import type { UberDirectConfig } from "@/lib/uber";
import { revalidarVenda } from "@/lib/revalidacao";
import {
  interpretarCustoEntregaUber,
  deliveryIdValido,
  decidirGravacaoCustoEnvio,
  statusHttpParaFalhaCustoUber,
  mensagemFalhaCustoUber,
  type ResultadoCustoEntregaUber,
  type LinhaCustoUber,
} from "@/lib/uber-custo-entrega";

/**
 * Endpoint do Get Delivery Status, isolado nesta unica constante para que um
 * 404 em producao (endpoint errado) seja correcao de uma linha.
 */
export const URL_BASE_CUSTO_ENTREGA_UBER = "https://api.uber.com/v1/eats/deliveries/orders";

/** Resolve o bearer a usar: token estatico (legado) ou access_token OAuth (mesmo padrao de src/lib/uber.ts). */
async function resolveUberBearerToken(config: UberDirectConfig): Promise<string> {
  if (config.source === "static_token") return config.token;
  return obterTokenUber(config.clientId, config.clientSecret, "eats.deliveries");
}

/**
 * Busca o custo real de uma entrega ja concluida ou em curso na Uber (Get
 * Delivery Status). Valida o delivery id antes de montar a URL e usa
 * `encodeURIComponent`. Em 401 com config oauth, limpa o cache do token e
 * re-tenta UMA vez (mesmo padrao de `getDeliveryQuote`).
 */
export async function buscarCustoEntregaUber(
  config: UberDirectConfig,
  deliveryId: string
): Promise<ResultadoCustoEntregaUber> {
  if (!deliveryIdValido(deliveryId)) {
    return { ok: false, motivo: "delivery_id_invalido", detalhe: "formato_invalido" };
  }

  const url = `${URL_BASE_CUSTO_ENTREGA_UBER}/${encodeURIComponent(deliveryId)}`;

  const chamarUberComToken = async (token: string) =>
    fetch(url, {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
    });

  try {
    const token = await resolveUberBearerToken(config);
    let res = await chamarUberComToken(token);
    let data = await res.json();

    // Token OAuth rejeitado: limpa a entrada e tenta UMA vez com token novo, mesma
    // razao e mesmo limite (100 req/h no endpoint de token) de getDeliveryQuote.
    if (!res.ok && res.status === 401 && config.source === "oauth") {
      limparEntradaCacheTokenUber(config.clientId, "eats.deliveries");
      const tokenNovo = await resolveUberBearerToken(config);
      res = await chamarUberComToken(tokenNovo);
      data = await res.json();
    }

    if (!res.ok) {
      // Corpo cru da Uber so aparece aqui (servidor) — nunca na resposta ao navegador (T-F21-07).
      // Nunca logar `config` — client_secret/access_token nao podem cruzar para o log (T-F21-08).
      console.error("Uber Direct delivery status error:", res.status, data);
    }

    return interpretarCustoEntregaUber(res.status, data);
  } catch (err) {
    console.error("Uber Direct delivery status API error:", err);
    return { ok: false, motivo: "erro_upstream", detalhe: "falha_de_rede" };
  }
}

export type ResultadoRegistrarCustoUber =
  | {
      gravado: true;
      vendaId: number;
      deliveryId: string;
      custoEnvio: number;
      moeda: string;
      linhas: LinhaCustoUber[];
    }
  | { gravado: false; motivo: string; mensagem: string; httpStatus: number };

/**
 * Mensagens para os motivos de nao-gravacao que vem da decisao provisorio x
 * definitivo e do conflito de unicidade — nao fazem parte do vocabulario
 * fechado de `MotivoFalhaCustoUber` (esses vem de decidirGravacaoCustoEnvio /
 * do banco, nao da interpretacao da resposta da Uber).
 */
function mensagemMotivoGravacao(motivo: string): string {
  switch (motivo) {
    case "custo_manual_preservado":
      return "Esta venda ja tem um custo de frete digitado manualmente. Ele nao foi sobrescrito.";
    case "custo_final_ja_gravado":
      return "O custo desta entrega ja foi confirmado como definitivo. O valor provisorio recebido foi descartado.";
    case "entrega_ja_lancada":
      return "Este delivery id ja foi lancado como custo em outra venda.";
    case "venda_nao_encontrada":
      return "Venda nao encontrada.";
    case "venda_inativa":
      return "Esta venda esta cancelada ou estornada. O custo nao foi lancado.";
    case "conflito_concorrente":
      return "O custo desta venda mudou durante a operacao. Tente novamente.";
    default:
      return mensagemFalhaCustoUber(motivo as Parameters<typeof mensagemFalhaCustoUber>[0]);
  }
}

function ehConflitoDeUnicidade(err: unknown): boolean {
  return !!err && typeof err === "object" && (err as { code?: unknown }).code === "P2002";
}

/**
 * Busca o custo real da entrega e, em sucesso, grava `custoEnvio` na venda
 * (junto de `uberDeliveryId` e `custoEnvioFonte`) e revalida as telas
 * afetadas. NUNCA cria `Despesa` (QK-F21-01). Um custo digitado a mao ou ja
 * definitivo nunca e sobrescrito por um valor provisorio (T-F21-04); o
 * mesmo delivery id nunca e lancado em duas vendas (T-F21-05).
 */
export async function registrarCustoEntregaUber(params: {
  config: UberDirectConfig;
  vendaId: number;
  deliveryId: string;
}): Promise<ResultadoRegistrarCustoUber> {
  const { config, vendaId, deliveryId } = params;
  const resultado = await buscarCustoEntregaUber(config, deliveryId);

  if (!resultado.ok) {
    return {
      gravado: false,
      motivo: resultado.motivo,
      mensagem: mensagemFalhaCustoUber(resultado.motivo),
      httpStatus: statusHttpParaFalhaCustoUber(resultado.motivo),
    };
  }

  const vendaAtual = await prisma.venda.findUnique({
    where: { id: vendaId },
    select: { custoEnvio: true, custoEnvioFonte: true, status: true },
  });

  if (!vendaAtual) {
    return {
      gravado: false,
      motivo: "venda_nao_encontrada",
      mensagem: mensagemMotivoGravacao("venda_nao_encontrada"),
      httpStatus: 404,
    };
  }

  // Venda cancelada/estornada nao recebe custo: alem de sujar o resultado, gastaria
  // o delivery id — que e unico — numa venda que nao vale mais.
  if (vendaAtual.status !== "ativa") {
    return {
      gravado: false,
      motivo: "venda_inativa",
      mensagem: mensagemMotivoGravacao("venda_inativa"),
      httpStatus: 409,
    };
  }

  const decisao = decidirGravacaoCustoEnvio({
    custoEnvioAtual: vendaAtual.custoEnvio,
    fonteAtual: vendaAtual.custoEnvioFonte,
    novoCusto: resultado.total,
    novoDefinitivo: resultado.definitivo,
  });

  if (!decisao.gravar) {
    return {
      gravado: false,
      motivo: decisao.motivo,
      mensagem: mensagemMotivoGravacao(decisao.motivo),
      httpStatus: decisao.httpStatus,
    };
  }

  try {
    // Update CONDICIONAL: so grava se a fonte continuar a que embasou a decisao.
    // Entre o findUnique e este update outra requisicao pode ter gravado um custo
    // definitivo, e um update incondicional o rebaixaria para provisorio.
    const { count } = await prisma.venda.updateMany({
      where: { id: vendaId, custoEnvioFonte: vendaAtual.custoEnvioFonte },
      data: {
        custoEnvio: resultado.total,
        // O id vem do parametro ja validado, nao do corpo da resposta: e ele que
        // identifica a entrega que o operador mandou lancar.
        uberDeliveryId: deliveryId,
        custoEnvioFonte: decisao.fonteResultante,
      },
    });

    if (count === 0) {
      return {
        gravado: false,
        motivo: "conflito_concorrente",
        mensagem: mensagemMotivoGravacao("conflito_concorrente"),
        httpStatus: 409,
      };
    }
  } catch (err) {
    if (ehConflitoDeUnicidade(err)) {
      return {
        gravado: false,
        motivo: "entrega_ja_lancada",
        mensagem: mensagemMotivoGravacao("entrega_ja_lancada"),
        httpStatus: 409,
      };
    }
    throw err;
  }

  revalidarVenda();

  return {
    gravado: true,
    vendaId,
    deliveryId: resultado.deliveryId,
    custoEnvio: resultado.total,
    moeda: resultado.moeda,
    linhas: resultado.linhas,
  };
}
