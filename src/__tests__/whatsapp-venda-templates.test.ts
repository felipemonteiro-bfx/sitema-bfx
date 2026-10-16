import { describe, expect, it } from "vitest";
import { montarMensagensDocumentosVenda } from "@/lib/whatsapp-venda-templates";

describe("documentos da venda nos templates aprovados", () => {
  it("usa boleto e inclui seu link quando só boleto está habilitado", () => {
    const mensagens = montarMensagensDocumentosVenda({ nome: "Ana", autoRecibo: false, autoBoleto: true, reciboUrl: "https://bfx.test/recibo", boletoUrl: "https://bfx.test/boleto" });
    expect(mensagens).toHaveLength(1);
    expect(mensagens[0]).toMatchObject({ name: "bfx_boleto", bodyParams: ["Ana", "https://bfx.test/boleto"] });
  });
  it("preserva ambos os documentos como templates separados", () => {
    const mensagens = montarMensagensDocumentosVenda({ nome: "Ana", autoRecibo: true, autoBoleto: true, reciboUrl: "https://bfx.test/recibo", boletoUrl: "https://bfx.test/boleto" });
    expect(mensagens.map(m => [m.name, m.bodyParams])).toEqual([["bfx_recibo", ["Ana", "https://bfx.test/recibo"]], ["bfx_boleto", ["Ana", "https://bfx.test/boleto"]]]);
  });
  it("não chama assinatura de comprovante e não inventa template aprovado", () => {
    const [mensagem] = montarMensagensDocumentosVenda({ nome: "Ana", autoRecibo: true, autoBoleto: false, assinaturaUrl: "https://bfx.test/assinatura" });
    expect(mensagem.name).toBe("");
    expect(mensagem.fallbackText).toContain("autorização de desconto em folha");
  });
  it("não envia documentos com flags desligadas ou sem link", () => {
    expect(montarMensagensDocumentosVenda({ nome: "Ana", autoRecibo: false, autoBoleto: false, reciboUrl: "https://bfx.test/recibo" })).toEqual([]);
    expect(montarMensagensDocumentosVenda({ nome: "Ana", autoRecibo: true, autoBoleto: true })).toEqual([]);
  });
});
