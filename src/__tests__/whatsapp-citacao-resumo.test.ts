import { describe, expect, it } from "vitest";
import { resumirMensagem } from "@/lib/whatsapp-citacao-resumo";

const midia = (o: Record<string, unknown> = {}) => ({ id: "u1", tipo: "imagem", status: "salva", voz: false, nomeExibicao: null, legenda: null, ...o });

describe("resumirMensagem", () => {
  it("texto: colapsa espaços e limita o tamanho", () => {
    expect(resumirMensagem({ id: 1, direcao: "out", tipo: "texto", corpo: "oi \n  tudo bem" }).corpoResumo).toBe("oi tudo bem");
    expect(resumirMensagem({ id: 1, direcao: "out", corpo: "x".repeat(500) }).corpoResumo.length).toBeLessThanOrEqual(200);
  });
  it("voz x áudio comum", () => {
    expect(resumirMensagem({ id: 2, direcao: "in", tipo: "audio", corpo: "[Áudio]", midia: midia({ tipo: "audio", voz: true }) })).toMatchObject({ corpoResumo: "Mensagem de voz", midiaId: "u1" });
    expect(resumirMensagem({ id: 2, direcao: "in", tipo: "audio", corpo: "[Áudio]", midia: midia({ tipo: "audio" }) }).corpoResumo).toBe("Áudio");
  });
  it("foto e vídeo: rótulo, legenda e miniatura (só se salva)", () => {
    expect(resumirMensagem({ id: 3, direcao: "in", tipo: "imagem", corpo: "[Foto] x", midia: midia({ legenda: "É essa?" }) })).toMatchObject({ corpoResumo: "Foto", legenda: "É essa?", miniaturaId: "u1" });
    expect(resumirMensagem({ id: 3, direcao: "in", tipo: "video", corpo: "[Vídeo]", midia: midia({ tipo: "video" }) })).toMatchObject({ corpoResumo: "Vídeo", miniaturaId: "u1" });
    expect(resumirMensagem({ id: 3, direcao: "in", tipo: "imagem", corpo: "[Foto]", midia: midia({ status: "pendente" }) }).miniaturaId).toBeUndefined();
  });
  it("figurinha e documento", () => {
    expect(resumirMensagem({ id: 4, direcao: "in", tipo: "figurinha", corpo: "[Figurinha]", midia: midia({ tipo: "figurinha" }) })).toMatchObject({ corpoResumo: "Figurinha", miniaturaId: "u1" });
    expect(resumirMensagem({ id: 5, direcao: "in", tipo: "documento", corpo: "[Documento] a.pdf", midia: midia({ tipo: "documento", nomeExibicao: "contrato.pdf" }) })).toMatchObject({ corpoResumo: "contrato.pdf" });
  });
});
