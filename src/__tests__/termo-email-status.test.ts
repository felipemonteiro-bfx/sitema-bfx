import { describe, expect, it } from "vitest";
import { Prisma } from "@/generated/prisma";

const TERMO_EMAIL_STATUS_VALUES = ["pendente", "enviado", "falhou", "sem_email", "erro_dados"] as const;

describe("contrato do envio de termo por e-mail", () => {
  it("expõe os campos nullable de status no modelo Venda", () => {
    const venda = Prisma.dmmf.datamodel.models.find((model) => model.name === "Venda");
    const fields = new Map(venda?.fields.map((field) => [field.name, field]));

    expect(fields.get("termoEmailStatus")).toMatchObject({ type: "String", isRequired: false });
    expect(fields.get("termoEmailEnviadoEm")).toMatchObject({ type: "DateTime", isRequired: false });
    expect(fields.get("termoEmailErro")).toMatchObject({ type: "String", isRequired: false });
  });

  it("mantém os valores de status definidos para o serviço", () => {
    expect(TERMO_EMAIL_STATUS_VALUES).toEqual(["pendente", "enviado", "falhou", "sem_email", "erro_dados"]);
  });
});
