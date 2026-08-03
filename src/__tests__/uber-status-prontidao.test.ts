// INT-02 / D-02: `GET /api/frete/uber/status` devolvia `{ enabled: false }` seco e engolia em
// silencio o JSON invalido do endereco de coleta (`catch { // ignore }`), as vezes mentindo
// `enabled: true` sem endereco. Este arquivo trava `classificarProntidaoUber`
// (`src/lib/uber-quote-result.ts`), que recebe os valores por parametro — nunca le
// `process.env` por dentro — para que a decisao continue verificavel sem mock nesta maquina
// (ver `<environment_constraints>` do plano 09-01).
import { describe, it, expect } from "vitest";
import { classificarProntidaoUber } from "@/lib/uber-quote-result";

const ENDERECO_VALIDO = JSON.stringify({
  street_address: ["Rua Exemplo, 123"],
  city: "Manaus",
  state: "AM",
  zip_code: "69000000",
  country: "BR",
});

describe("classificarProntidaoUber", () => {
  it("sem customerId (ou sem token), mesmo com endereco de coleta valido, devolve sem_credencial", () => {
    const semCustomerId = classificarProntidaoUber({ customerId: "", token: "t", pickupAddressJson: ENDERECO_VALIDO });
    expect(semCustomerId.pronto).toBe(false);
    expect(semCustomerId.motivo).toBe("sem_credencial");

    const semToken = classificarProntidaoUber({ customerId: "c", token: "", pickupAddressJson: ENDERECO_VALIDO });
    expect(semToken.pronto).toBe(false);
    expect(semToken.motivo).toBe("sem_credencial");
  });

  it("com credencial e sem pickupAddressJson devolve sem_endereco_coleta", () => {
    const r = classificarProntidaoUber({ customerId: "c", token: "t", pickupAddressJson: null });
    expect(r.pronto).toBe(false);
    expect(r.motivo).toBe("sem_endereco_coleta");
  });

  it("com credencial e JSON invalido devolve sem_endereco_coleta em vez de estourar excecao", () => {
    expect(() =>
      classificarProntidaoUber({ customerId: "c", token: "t", pickupAddressJson: "{nao e json" })
    ).not.toThrow();
    const r = classificarProntidaoUber({ customerId: "c", token: "t", pickupAddressJson: "{nao e json" });
    expect(r.pronto).toBe(false);
    expect(r.motivo).toBe("sem_endereco_coleta");
  });

  it("com credencial e JSON valido porem sem street_address devolve sem_endereco_coleta", () => {
    const r = classificarProntidaoUber({ customerId: "c", token: "t", pickupAddressJson: "{}" });
    expect(r.pronto).toBe(false);
    expect(r.motivo).toBe("sem_endereco_coleta");
  });

  it("tudo presente e valido devolve pronto:true com o pickupAddress parseado", () => {
    const r = classificarProntidaoUber({ customerId: "c", token: "t", pickupAddressJson: ENDERECO_VALIDO });
    expect(r.pronto).toBe(true);
    expect(r.motivo).toBeNull();
    if (!r.pronto) throw new Error("esperava pronto:true");
    expect(r.pickupAddress.city).toBe("Manaus");
  });

  it("T-09-02: um token de valor conhecido nao aparece no JSON de saida", () => {
    const r = classificarProntidaoUber({
      customerId: "cust-abc",
      token: "segredo-super-secreto",
      pickupAddressJson: ENDERECO_VALIDO,
    });
    const serializado = JSON.stringify(r);
    expect(serializado).not.toContain("segredo-super-secreto");
    expect(serializado).not.toContain("cust-abc");
  });

  it("espacos em branco em customerId/token contam como ausencia", () => {
    const r = classificarProntidaoUber({ customerId: "   ", token: "   ", pickupAddressJson: ENDERECO_VALIDO });
    expect(r.motivo).toBe("sem_credencial");
  });
});
