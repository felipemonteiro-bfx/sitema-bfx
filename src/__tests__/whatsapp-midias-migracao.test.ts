import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const raiz = process.cwd();
const sql = readFileSync(join(raiz, "prisma/migrations/20261017120000_whatsapp_midias/migration.sql"), "utf8");
const schema = readFileSync(join(raiz, "prisma/schema.prisma"), "utf8");

describe("migração whatsapp_midias", () => {
  it("é aditiva: sem DROP nem ALTER TYPE nem RENAME", () => {
    expect(sql).not.toMatch(/\bDROP\b/i);
    expect(sql).not.toMatch(/ALTER\s+COLUMN[^;]*TYPE/i);
    expect(sql).not.toMatch(/\bRENAME\b/i);
    expect(sql).not.toMatch(/\bTRUNCATE\b|\bDELETE\s+FROM\b/i);
  });

  it("adiciona tipo à mensagem com DEFAULT 'texto' (não reescreve a tabela)", () => {
    expect(sql).toMatch(/ALTER TABLE "whatsapp_mensagens" ADD COLUMN\s+"tipo" TEXT NOT NULL DEFAULT 'texto'/);
  });

  it("cria a tabela whatsapp_midias com as colunas combinadas", () => {
    expect(sql).toContain('CREATE TABLE "whatsapp_midias"');
    for (const col of [
      "mensagem_id", "tipo", "meta_media_id", "upload_media_id", "upload_em", "mime", "sha256",
      "tamanho", "nome_exibicao", "legenda", "voz", "animada", "chave_storage", "status",
      "tentativas", "erro", "criado_em", "atualizado_em",
    ]) expect(sql).toContain(`"${col}"`);
    expect(sql).toMatch(/"status" TEXT NOT NULL DEFAULT 'pendente'/);
    expect(sql).toMatch(/"tentativas" INTEGER NOT NULL DEFAULT 0/);
  });

  it("1:1 por mensagem (índice único) e índice por status + atualizado_em", () => {
    expect(sql).toMatch(/CREATE UNIQUE INDEX "whatsapp_midias_mensagem_id_key" ON "whatsapp_midias"\("mensagem_id"\)/);
    expect(sql).toMatch(/CREATE INDEX "whatsapp_midias_status_atualizado_em_idx" ON "whatsapp_midias"\("status", "atualizado_em"\)/);
  });

  it("FK com ON DELETE CASCADE para a mensagem", () => {
    expect(sql).toMatch(/FOREIGN KEY \("mensagem_id"\) REFERENCES "whatsapp_mensagens"\("id"\) ON DELETE CASCADE/);
  });

  it("CHECKs de tipo (mensagem e mídia), status e sha256 hex de 64", () => {
    expect(sql).toMatch(/CHECK \("tipo" IN \('texto', 'audio', 'imagem', 'video', 'figurinha', 'documento'\)\)/);
    expect(sql).toMatch(/CHECK \("tipo" IN \('audio', 'imagem', 'video', 'figurinha', 'documento'\)\)/);
    expect(sql).toMatch(/CHECK \("status" IN \('pendente', 'baixando', 'salva', 'falhou', 'indisponivel'\)\)/);
    expect(sql).toMatch(/"sha256" ~ '\^\[0-9a-f\]\{64\}\$'/);
  });

  it("schema.prisma declara tipo e o model WhatsAppMidia", () => {
    expect(schema).toMatch(/tipo\s+String\s+@default\("texto"\)/);
    expect(schema).toContain("model WhatsAppMidia");
    expect(schema).toMatch(/onDelete: Cascade/);
    expect(schema).toContain('@@map("whatsapp_midias")');
  });
});
