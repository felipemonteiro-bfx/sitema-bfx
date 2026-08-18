// Incidente de 2026-08-14 (relato do cliente as 07:04): "fui subir algumas vendas e ele nao
// contabilizou / na hora de salvar so da erro e nao salva". Quatro dias depois nao deu para
// dizer o que falhou, porque NENHUM caminho de rejeicao de venda deixa rastro no servidor:
// `vendas_id_seq` sem buraco (nenhuma transacao abriu), `criar_venda_falhou` nunca disparou,
// Postgres so com checkpoint de rotina. A rejeicao acontece antes do banco e sai muda.
//
// Este arquivo trava o contrario disso: toda rejeicao anterior a transacao passa por
// `registrarRejeicaoVenda`, e todo call site que rejeita chama esse ponto unico.
//
// Por que a logica mora em `src/lib/` e nao no call site: o vitest roda em `environment: node`
// e so inclui `src/__tests__/**/*.test.ts` — Server Action e componente React nao sao
// executaveis aqui (mesma razao de `src/lib/form-values.ts`). O comportamento e testado no
// modulo; a adocao nos call sites e provada por teste-gate lendo o fonte.
//
// Nota de seguranca (CLAUDE.md): nenhuma execucao de regex com estado neste arquivo.
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { registrarRejeicaoVenda } from "@/lib/venda-observabilidade";

const raiz = process.cwd();
const ler = (rel: string) => readFileSync(join(raiz, rel), "utf8");

describe("registrarRejeicaoVenda — a rejeicao de venda vira linha de log", () => {
  let saida: string[];

  beforeEach(() => {
    saida = [];
    vi.spyOn(console, "log").mockImplementation((linha: unknown) => {
      saida.push(String(linha));
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  function ultimaLinha(): Record<string, unknown> {
    expect(saida.length).toBeGreaterThan(0);
    return JSON.parse(saida[saida.length - 1]);
  }

  it("emite JSON de uma linha com scope 'venda' e evento 'venda_rejeitada'", () => {
    registrarRejeicaoVenda({ origem: "venda-rapida", motivo: "Nenhum produto informado" });

    const evento = ultimaLinha();
    expect(evento.scope).toBe("venda");
    expect(evento.event).toBe("venda_rejeitada");
    expect(evento.origem).toBe("venda-rapida");
    expect(evento.motivo).toBe("Nenhum produto informado");
    expect(typeof evento.ts).toBe("string");
  });

  it("leva junto o contexto que identifica a tentativa (cliente, vendedor, quantidade de itens)", () => {
    registrarRejeicaoVenda({
      origem: "venda-rapida",
      motivo: "Cliente é obrigatório",
      clienteId: 467,
      vendedor: "Jakeline",
      itens: 3,
    });

    const evento = ultimaLinha();
    expect(evento.clienteId).toBe(467);
    expect(evento.vendedor).toBe("Jakeline");
    expect(evento.itens).toBe(3);
  });

  it("omite campo ausente em vez de gravar undefined — a linha fica filtravel", () => {
    registrarRejeicaoVenda({ origem: "importacao", motivo: "Dados inválidos" });

    const evento = ultimaLinha();
    expect("clienteId" in evento).toBe(false);
    expect("vendedor" in evento).toBe(false);
    expect("itens" in evento).toBe(false);
  });

  it("nunca lanca: um log quebrado nao pode derrubar a venda que ja ia ser rejeitada", () => {
    // `motivo` nao-string faz `motivo.trim()` lancar DENTRO da funcao — e o unico jeito de
    // exercitar o catch de verdade. Um objeto ciclico em campo extra nao serve: a funcao so
    // desestrutura os campos que conhece, entao ele nunca chegaria ao JSON.stringify.
    expect(() =>
      registrarRejeicaoVenda({
        origem: "venda-rapida",
        // @ts-expect-error — entrada hostil de proposito: o ponto do teste e nao explodir
        motivo: 42,
      })
    ).not.toThrow();
  });

  it("registra o motivo mesmo quando ele vem vazio, para a linha nunca sumir", () => {
    registrarRejeicaoVenda({ origem: "venda-rapida", motivo: "" });

    const evento = ultimaLinha();
    expect(evento.event).toBe("venda_rejeitada");
    expect(evento.motivo).toBe("(sem motivo)");
  });
});

describe("adocao nos call sites que rejeitam venda antes do banco", () => {
  const actions = ler("src/app/(app)/venda-rapida/actions.ts");
  const importacao = ler("src/app/api/importacao/batch/route.ts");

  it("criarVendaV2 importa o ponto unico de registro", () => {
    expect(actions.includes("registrarRejeicaoVenda")).toBe(true);
    expect(actions.includes('from "@/lib/venda-observabilidade"')).toBe(true);
  });

  it("as 5 rejeicoes anteriores a transacao em criarVendaV2 estao instrumentadas", () => {
    // Sem produto, JSON de produto invalido, JSON de parcela invalido, schema reprovado e
    // subtotal divergente. Os outros 3 `errorResponse` do arquivo vivem dentro do `catch`,
    // que ja e coberto por `logError("venda","criar_venda_falhou")` — nao entram nesta conta.
    const motivos = [
      'motivo: "Nenhum produto informado"',
      'motivo: "Dados de produtos inválidos"',
      'motivo: "Dados de parcelas inválidos"',
    ];
    const faltando = motivos.filter((m) => !actions.includes(m));
    expect(faltando).toEqual([]);

    // Os outros dois motivos (schema reprovado e subtotal divergente) sao expressao, nao
    // literal — travar o texto delas quebraria num rename inocente. A contagem cobre: 5 em
    // criarVendaV2 + 1 na action legada.
    const registros = actions.split("registrarRejeicaoVenda(").length - 1;
    expect(registros).toBeGreaterThanOrEqual(6);
  });

  it("o catch de criarVendaV2 continua registrando a excecao — a instrumentacao soma, nao troca", () => {
    expect(actions.includes('logError("venda", "criar_venda_falhou", error)')).toBe(true);
  });

  it("a action legada criarVenda registra em vez de fazer `return` mudo", () => {
    expect(actions.includes('origem: "venda-rapida-legada"')).toBe(true);
  });

  it("a importacao em lote registra os 400 que saiam em silencio", () => {
    expect(importacao.includes('origem: "importacao"')).toBe(true);
    // As duas rejeicoes da rota, nomeadas — nao uma contagem, que fecharia com qualquer
    // chamada avulsa noutro ponto do arquivo.
    expect(importacao.includes('motivo: "Corpo da importação não é uma lista"')).toBe(true);
    expect(importacao.includes("motivo: msg, itens: raw.length")).toBe(true);
  });
});
