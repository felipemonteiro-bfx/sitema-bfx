// Uploads de imagem (produto e logo): o tipo vem dos bytes, não do navegador,
// e o nome do arquivo nunca carrega caminho (2026-09-11, achados HIGH do hook
// de segurança).
import { describe, it, expect } from "vitest";
import {
  corpoGrandeDemais,
  detectarTipoImagem,
  MIMES_LOGO,
  nomeComExtensaoReal,
  TAMANHO_MAXIMO_IMAGEM,
  validarImagem,
} from "@/lib/upload-imagem";

const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0x0d, 0x49, 0x48, 0x44, 0x52]);
const JPEG = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46]);
const WEBP = new Uint8Array([0x52, 0x49, 0x46, 0x46, 0x24, 0, 0, 0, 0x57, 0x45, 0x42, 0x50, 0x56, 0x50, 0x38, 0x20]);
const WAV = new Uint8Array([0x52, 0x49, 0x46, 0x46, 0x24, 0, 0, 0, 0x57, 0x41, 0x56, 0x45, 0x66, 0x6d, 0x74, 0x20]);
const HTML = new TextEncoder().encode("<html><script>alert(1)</script></html>");
const SVG = new TextEncoder().encode('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>');

const TIPO_PNG = { mime: "image/png", extensao: "png" } as const;
const TIPO_JPEG = { mime: "image/jpeg", extensao: "jpg" } as const;

describe("detectarTipoImagem — o tipo vem dos bytes", () => {
  it("reconhece PNG, JPEG e WebP pela assinatura", () => {
    expect(detectarTipoImagem(PNG)).toEqual(TIPO_PNG);
    expect(detectarTipoImagem(JPEG)).toEqual(TIPO_JPEG);
    expect(detectarTipoImagem(WEBP)).toEqual({ mime: "image/webp", extensao: "webp" });
  });

  it("recusa HTML e SVG, que executam script se abertos no navegador", () => {
    expect(detectarTipoImagem(HTML)).toBeNull();
    expect(detectarTipoImagem(SVG)).toBeNull();
  });

  it("RIFF que não é WebP (um WAV) não passa", () => {
    expect(detectarTipoImagem(WAV)).toBeNull();
  });

  it("arquivo curto demais ou vazio não é imagem", () => {
    expect(detectarTipoImagem(new Uint8Array([0x89, 0x50]))).toBeNull();
    expect(detectarTipoImagem(new Uint8Array())).toBeNull();
  });
});

describe("validarImagem — o que a rota responde", () => {
  it("imagem permitida devolve o tipo real", () => {
    expect(validarImagem(JPEG)).toEqual({ ok: true, tipo: TIPO_JPEG });
  });

  it("tipo não permitido: 415", () => {
    expect(validarImagem(HTML)).toMatchObject({ ok: false, status: 415 });
  });

  it("acima do limite: 413, mesmo sendo PNG", () => {
    const grande = new Uint8Array(TAMANHO_MAXIMO_IMAGEM + 1);
    grande.set(PNG);
    expect(validarImagem(grande)).toMatchObject({ ok: false, status: 413 });
  });
});

describe("nomeComExtensaoReal — nome seguro para o disco e para o bucket", () => {
  it("sem barra nem ponto-ponto: nada de sair da pasta", () => {
    const nome = nomeComExtensaoReal("../../etc/passwd.png", TIPO_PNG);
    expect(nome).not.toContain("/");
    expect(nome).not.toContain("..");
    expect(nome).toBe("etc-passwd.png");
  });

  it("contrabarra e espaço também saem", () => {
    expect(nomeComExtensaoReal("C:\\fotos\\minha foto.png", TIPO_PNG)).toBe("C-fotos-minha-foto.png");
  });

  it("a extensão é a do conteúdo, não a do nome", () => {
    expect(nomeComExtensaoReal("foto.html", TIPO_JPEG)).toBe("foto.jpg");
  });

  it("nome vazio ou só símbolos vira 'imagem'", () => {
    expect(nomeComExtensaoReal("../", TIPO_PNG)).toBe("imagem.png");
    expect(nomeComExtensaoReal("", TIPO_PNG)).toBe("imagem.png");
  });

  it("nome gigante é cortado", () => {
    expect(nomeComExtensaoReal(`${"a".repeat(500)}.png`, TIPO_PNG).length).toBeLessThanOrEqual(85);
  });
});

describe("tipos permitidos por rota", () => {
  it("o logo só aceita PNG e JPEG — WebP sumiria do PDF do recibo", () => {
    expect(validarImagem(WEBP, MIMES_LOGO)).toMatchObject({ ok: false, status: 415, erro: "Envie uma imagem PNG ou JPG." });
    expect(validarImagem(PNG, MIMES_LOGO).ok).toBe(true);
    expect(validarImagem(JPEG, MIMES_LOGO).ok).toBe(true);
  });
});

describe("corpoGrandeDemais — recusa antes de ler o formulário inteiro", () => {
  const pedido = (tamanho?: number) =>
    new Request("http://local/upload", {
      method: "POST",
      headers: tamanho === undefined ? {} : { "content-length": String(tamanho) },
    });

  it("Content-Length acima do limite mais a folga do multipart", () => {
    expect(corpoGrandeDemais(pedido(TAMANHO_MAXIMO_IMAGEM + 1024 * 1024))).toBe(true);
  });

  it("dentro do limite, ou sem Content-Length, segue para a validação normal", () => {
    expect(corpoGrandeDemais(pedido(TAMANHO_MAXIMO_IMAGEM))).toBe(false);
    expect(corpoGrandeDemais(pedido())).toBe(false);
  });
});
