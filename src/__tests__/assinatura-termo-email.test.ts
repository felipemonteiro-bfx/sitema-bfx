import { describe, expect, it, vi } from "vitest";
import type { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  prisma: {
    venda: { findUnique: vi.fn() },
    assinatura: { findFirst: vi.fn(), updateMany: vi.fn(), create: vi.fn(), update: vi.fn() },
    documento: { create: vi.fn() },
    notificacao: { create: vi.fn() },
    $transaction: vi.fn(),
  },
  enviarTermoAssinadoAoRh: vi.fn(),
  generateReciboPdf: vi.fn(),
  isMinIOConfigured: vi.fn(),
  uploadToMinIO: vi.fn(),
}));

vi.mock("@/generated/prisma", () => ({
  PrismaClient: class {
    constructor() {
      return mocks.prisma;
    }
  },
}));
vi.mock("@/lib/email", () => ({
  enviarTermoAssinadoAoRh: mocks.enviarTermoAssinadoAoRh,
}));
vi.mock("@/lib/recibo-pdf", () => ({
  generateReciboPdf: mocks.generateReciboPdf,
}));
vi.mock("@/lib/minio", () => ({
  isMinIOConfigured: mocks.isMinIOConfigured,
  uploadToMinIO: mocks.uploadToMinIO,
}));
vi.mock("pdf-lib", () => ({
  PDFDocument: {
    load: vi.fn(async () => ({
      embedPng: vi.fn(async () => ({ width: 100, height: 50 })),
      getPages: () => [{ drawImage: vi.fn() }],
      save: vi.fn(async () => new Uint8Array([1, 2, 3])),
    })),
  },
}));

const { POST } = await import("@/app/api/assinatura/route");

function fakeRequest() {
  return new Request("http://local/api/assinatura", {
    method: "POST",
    body: JSON.stringify({ token: "token-assinatura", signature: "data:image/png;base64,c2ln" }),
  }) as NextRequest;
}

describe("POST /api/assinatura — notificação do termo assinado", () => {
  it("assina e tenta notificar sem falhar quando o email falha", async () => {
    const ordem: string[] = [];
    mocks.prisma.venda.findUnique.mockResolvedValue({ id: 42 });
    mocks.prisma.assinatura.findFirst.mockResolvedValue(null);
    mocks.prisma.documento.create.mockImplementation(async () => {
      ordem.push("documento.create");
    });
    mocks.prisma.assinatura.updateMany.mockResolvedValue({ count: 1 });
    mocks.prisma.$transaction.mockImplementation(async (callback: (tx: typeof mocks.prisma) => Promise<void>) => callback(mocks.prisma));
    mocks.prisma.assinatura.update.mockImplementation(async () => {
      ordem.push("assinatura.update");
    });
    mocks.prisma.notificacao.create.mockResolvedValue({});
    mocks.generateReciboPdf.mockResolvedValue(new Uint8Array([1]));
    mocks.isMinIOConfigured.mockReturnValue(false);
    mocks.enviarTermoAssinadoAoRh.mockImplementation(async () => {
      ordem.push("enviarTermoAssinadoAoRh");
      throw new Error("SMTP indisponível");
    });

    const response = await POST(fakeRequest());

    expect(response.status).toBe(200);
    expect(mocks.enviarTermoAssinadoAoRh).toHaveBeenCalledWith(42);
    expect(ordem).toEqual([
      "documento.create",
      "assinatura.update",
      "enviarTermoAssinadoAoRh",
    ]);
  });

  it("retorna 409 quando outro POST já reivindicou a assinatura", async () => {
    mocks.generateReciboPdf.mockClear();
    mocks.prisma.documento.create.mockClear();
    mocks.enviarTermoAssinadoAoRh.mockClear();
    mocks.prisma.venda.findUnique.mockResolvedValue({ id: 42 });
    mocks.prisma.assinatura.updateMany.mockResolvedValue({ count: 0 });
    mocks.prisma.assinatura.findFirst.mockResolvedValue({ assinaturaStatus: "processando" });

    const response = await POST(fakeRequest());

    expect(response.status).toBe(409);
    expect(mocks.generateReciboPdf).not.toHaveBeenCalled();
    expect(mocks.prisma.documento.create).not.toHaveBeenCalled();
    expect(mocks.enviarTermoAssinadoAoRh).not.toHaveBeenCalled();
  });
});
