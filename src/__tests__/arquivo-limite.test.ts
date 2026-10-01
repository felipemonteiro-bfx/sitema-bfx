// Limite de arquivo conferido no cliente antes de enviar (achado da revisao da Fase 4): o Next
// recusa o corpo da action acima de 10 MB antes de ela rodar, e a tela caia no error boundary.
import { describe, it, expect } from "vitest";
import { TAMANHO_MAXIMO_ARQUIVO, arquivoGrandeDemais } from "@/lib/arquivo-limite";

const arquivo = (bytes: number, nome = "a.pdf") => new File([new Uint8Array(bytes) as BlobPart], nome);

describe("arquivoGrandeDemais", () => {
  it("devolve a mensagem quando algum arquivo do formulario passa do limite", () => {
    const fd = new FormData();
    fd.set("pdf", arquivo(TAMANHO_MAXIMO_ARQUIVO + 1, "boleto.pdf"));
    expect(arquivoGrandeDemais(fd)).toBe("O arquivo boleto.pdf passa de 10 MB.");
  });

  it("arquivo no limite, campo vazio e texto passam", () => {
    const fd = new FormData();
    fd.set("pdf", arquivo(TAMANHO_MAXIMO_ARQUIVO));
    fd.set("vazio", arquivo(0));
    fd.set("linhaDigitavel", "123");
    expect(arquivoGrandeDemais(fd)).toBeNull();
  });
});
