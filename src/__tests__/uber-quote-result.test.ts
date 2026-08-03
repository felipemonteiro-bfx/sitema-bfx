// INT-02 / D-02: `getDeliveryQuote()` devolvia o mesmo valor vazio (`return null`) em TODOS os
// caminhos de erro (`src/lib/uber.ts:114`, `:126`, `:129`). Este arquivo trava a classificacao
// pura de `src/lib/uber-quote-result.ts` — modulo sem imports (ver cabecalho de
// `src/lib/cliente-rapido.ts`), verificavel via `node --input-type=module` nesta maquina onde
// `vitest` nao roda (ver `<environment_constraints>` do plano 09-01).
import { describe, it, expect } from "vitest";
import {
  interpretarRespostaUber,
  interpretarFalhaDeRede,
  mensagemFalhaUber,
  statusHttpParaFalhaUber,
  type MotivoFalhaUber,
} from "@/lib/uber-quote-result";

describe("interpretarRespostaUber", () => {
  it("200 com corpo completo devolve ok:true mapeando os campos", () => {
    const r = interpretarRespostaUber(200, { id: "q1", fee: 1234, duration: 22, currency_type: "BRL" });
    expect(r.ok).toBe(true);
    if (!r.ok) throw new Error("esperava ok:true");
    expect(r.quoteId).toBe("q1");
    expect(r.feeCents).toBe(1234);
    expect(r.fee).toBe(12.34);
    expect(r.duration).toBe(22);
    expect(r.currency).toBe("BRL");
  });

  it("401 devolve erro_upstream (credencial rejeitada != endereco ruim, D-02)", () => {
    const r = interpretarRespostaUber(401, {});
    expect(r.ok).toBe(false);
    if (r.ok) throw new Error("esperava ok:false");
    expect(r.motivo).toBe("erro_upstream");
  });

  it("400 com codigo conhecido devolve endereco_invalido com o codigo como detalhe", () => {
    const r = interpretarRespostaUber(400, { errors: [{ code: "address_undeliverable" }] });
    expect(r.ok).toBe(false);
    if (r.ok) throw new Error("esperava ok:false");
    expect(r.motivo).toBe("endereco_invalido");
    expect(r.detalhe).toBe("address_undeliverable");
  });

  it("200 com corpo incompleto (sem id/fee) devolve erro_upstream com detalhe resposta_incompleta", () => {
    const r = interpretarRespostaUber(200, {});
    expect(r.ok).toBe(false);
    if (r.ok) throw new Error("esperava ok:false");
    expect(r.motivo).toBe("erro_upstream");
    expect(r.detalhe).toBe("resposta_incompleta");
  });

  it("T-09-01: detalhe de um 400 com texto livre no corpo nao carrega esse texto", () => {
    const r = interpretarRespostaUber(400, {
      errors: [{ code: "address_undeliverable", message: "RUA SECRETA 42" }],
    });
    expect(JSON.stringify(r)).not.toContain("RUA SECRETA");
  });
});

describe("interpretarFalhaDeRede", () => {
  it("devolve erro_upstream com detalhe falha_de_rede", () => {
    const r = interpretarFalhaDeRede();
    expect(r.ok).toBe(false);
    if (r.ok) throw new Error("esperava ok:false");
    expect(r.motivo).toBe("erro_upstream");
    expect(r.detalhe).toBe("falha_de_rede");
  });
});

describe("mensagemFalhaUber", () => {
  const motivos: MotivoFalhaUber[] = [
    "sem_credencial",
    "sem_endereco_coleta",
    "endereco_invalido",
    "erro_upstream",
  ];

  it("devolve mensagem propria e distinta para cada motivo, sempre mencionando a saida manual", () => {
    const msgs = motivos.map((m) => mensagemFalhaUber(m));
    expect(new Set(msgs).size).toBe(4);
    for (const msg of msgs) {
      expect(msg.toLocaleLowerCase("pt-BR")).toContain("manual");
    }
  });
});

describe("statusHttpParaFalhaUber", () => {
  it("mapeia cada motivo para o status HTTP correto", () => {
    expect(statusHttpParaFalhaUber("sem_credencial")).toBe(503);
    expect(statusHttpParaFalhaUber("sem_endereco_coleta")).toBe(503);
    expect(statusHttpParaFalhaUber("endereco_invalido")).toBe(422);
    expect(statusHttpParaFalhaUber("erro_upstream")).toBe(502);
  });
});
