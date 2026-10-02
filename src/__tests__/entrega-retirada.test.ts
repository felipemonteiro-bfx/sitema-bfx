import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";

describe("migration da coluna entrega", () => {
  it("adiciona so a coluna nullable, sem default nem NOT NULL", () => {
    const sql = readFileSync("prisma/migrations/20261002120000_add_venda_entrega/migration.sql", "utf8");
    expect(sql.includes('ADD COLUMN "entrega" BOOLEAN')).toBe(true);
    expect(sql.toUpperCase().includes("DEFAULT")).toBe(false);
    expect(sql.toUpperCase().includes("NOT NULL")).toBe(false);
  });
  it("o schema Prisma declara Venda.entrega como Boolean?", () => {
    const schema = readFileSync("prisma/schema.prisma", "utf8");
    expect(schema.split("\n").some((l) => l.trim().startsWith("entrega") && l.includes("Boolean?"))).toBe(true);
  });
});
