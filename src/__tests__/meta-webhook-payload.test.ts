import { describe, it, expect } from "vitest";
import { extrairMensagens, extrairStatuses } from "@/lib/meta-webhook-payload";

const payloadMensagem = {
  entry: [
    {
      changes: [
        {
          value: {
            contacts: [{ wa_id: "5592999999999", profile: { name: "João" } }],
            messages: [
              { from: "5592999999999", id: "wamid.A", type: "text", text: { body: "oi" } },
            ],
          },
        },
      ],
    },
  ],
};

const payloadStatus = {
  entry: [
    {
      changes: [
        {
          value: {
            statuses: [
              { id: "wamid.A", status: "delivered", timestamp: "1700000000" },
              {
                id: "wamid.B",
                status: "failed",
                errors: [{ code: 131047, title: "Re-engagement message" }],
              },
            ],
          },
        },
      ],
    },
  ],
};

describe("extrairMensagens", () => {
  it("extrai telefone, texto, nome e waMessageId", () => {
    expect(extrairMensagens(payloadMensagem)).toEqual([
      { telefone: "5592999999999", texto: "oi", nome: "João", waMessageId: "wamid.A" },
    ]);
  });

  it("ignora mensagens que não são texto", () => {
    const p = {
      entry: [
        { changes: [{ value: { messages: [{ from: "559299", id: "x", type: "image" }] } }] },
      ],
    };
    expect(extrairMensagens(p)).toEqual([]);
  });

  it("tolera payload malformado", () => {
    expect(extrairMensagens(null)).toEqual([]);
    expect(extrairMensagens({})).toEqual([]);
    expect(extrairMensagens({ entry: "nao-array" })).toEqual([]);
  });
});

describe("extrairStatuses", () => {
  it("mapeia os status da Meta para os internos", () => {
    const out = extrairStatuses(payloadStatus);
    expect(out[0]).toEqual({ waMessageId: "wamid.A", status: "entregue" });
    expect(out[1]).toMatchObject({
      waMessageId: "wamid.B",
      status: "falhou",
      erroCodigo: 131047,
    });
  });

  it("mapeia sent e read", () => {
    const p = {
      entry: [
        {
          changes: [
            { value: { statuses: [{ id: "1", status: "sent" }, { id: "2", status: "read" }] } },
          ],
        },
      ],
    };
    const out = extrairStatuses(p);
    expect(out[0]!.status).toBe("enviado");
    expect(out[1]!.status).toBe("lido");
  });

  it("ignora status desconhecido", () => {
    const p = { entry: [{ changes: [{ value: { statuses: [{ id: "1", status: "xpto" }] } }] }] };
    expect(extrairStatuses(p)).toEqual([]);
  });

  it("tolera payload malformado", () => {
    expect(extrairStatuses(null)).toEqual([]);
    expect(extrairStatuses({ entry: [{}] })).toEqual([]);
  });
});
