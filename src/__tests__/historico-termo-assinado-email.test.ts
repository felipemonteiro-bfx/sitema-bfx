import { beforeEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { EnviarEmailEmpresaButton } from "@/components/enviar-email-empresa-button";

const mocks = vi.hoisted(() => ({
  prisma: { venda: { findUnique: vi.fn() } },
  enviarTermoAssinadoAoRh: vi.fn(),
  sendVendaNotification: vi.fn(),
  requireSessionOrThrow: vi.fn(async () => ({ id: 1, role: "admin" })),
}));

vi.mock("@/lib/db", () => ({ prisma: mocks.prisma }));
vi.mock("@/lib/email", () => ({
  enviarTermoAssinadoAoRh: mocks.enviarTermoAssinadoAoRh,
  sendVendaNotification: mocks.sendVendaNotification,
}));
vi.mock("@/lib/guards", () => ({ requireSessionOrThrow: mocks.requireSessionOrThrow }));

const { enviarEmailEmpresa } = await import("@/app/(app)/historico/actions");

const venda = (assinaturaStatus: string | null = "assinado") => ({
  id: 42,
  assinatura: assinaturaStatus ? { assinaturaStatus } : null,
});

beforeEach(() => {
  vi.clearAllMocks();
  mocks.prisma.venda.findUnique.mockResolvedValue(venda());
  mocks.enviarTermoAssinadoAoRh.mockResolvedValue({ status: "enviado" });
});

describe("enviarEmailEmpresa no histórico", () => {
  it("recusa venda não assinada sem chamar o serviço do termo", async () => {
    mocks.prisma.venda.findUnique.mockResolvedValue(venda("pendente"));

    await expect(enviarEmailEmpresa(42)).resolves.toEqual({
      success: false,
      error: "Termo assinado não encontrado",
    });
    expect(mocks.enviarTermoAssinadoAoRh).not.toHaveBeenCalled();
  });

  it("envia o termo de venda assinada pelo serviço dedicado", async () => {
    await expect(enviarEmailEmpresa(42)).resolves.toEqual({ success: true });
    expect(mocks.enviarTermoAssinadoAoRh).toHaveBeenCalledWith(42);
    expect(mocks.sendVendaNotification).not.toHaveBeenCalled();
  });

  it.each([
    ["falhou", "Falha ao enviar termo"],
    ["sem_email", "Empresa sem e-mail de RH"],
    ["erro_dados", "Termo assinado não encontrado"],
  ] as const)("traduz o status %s em uma mensagem útil", async (status, error) => {
    mocks.enviarTermoAssinadoAoRh.mockResolvedValue({ status });

    await expect(enviarEmailEmpresa(42)).resolves.toEqual({ success: false, error });
  });
});

describe("histórico — reenvio do termo", () => {
  const page = () => readFileSync("src/app/(app)/historico/page.tsx", "utf8");

  it("consulta o status persistido do email do termo", () => {
    const source = page();
    expect(source).toContain("termoEmailStatus: true");
    expect(source).toContain("termoEmailEnviadoEm: true");
    expect(source).toContain("termoEmailErro: true");
  });

  it("renderiza o botão real com o contexto do termo ao RH", () => {
    const markup = renderToStaticMarkup(React.createElement(EnviarEmailEmpresaButton, {
      vendaId: 42,
      onSend: async () => ({ success: true }),
      label: "Reenviar termo ao RH",
    }));

    expect(markup).toContain("Reenviar termo ao RH");
    expect(markup).not.toContain("Empresa</button>");
  });

  it("mantém a condição de assinatura e os status persistidos no histórico", () => {
    const source = page();
    expect(source).toContain('v.assinatura?.assinaturaStatus === "assinado"');
    expect(source).toContain('v.termoEmailStatus === "enviado"');
    expect(source).toContain('v.termoEmailStatus === "falhou"');
    expect(source).toContain('v.termoEmailStatus === "sem_email"');
  });
});
