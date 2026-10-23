import { describe, it, expect, vi, beforeEach } from "vitest";

// Regra de permissao definida pelo Andre em 2026-08-05:
// "vendedor pode add e editar cliente e produto".
// Logo, por exclusao, fornecedor e empresa sao de admin.
//
// A trava aqui nao e' so "lanca erro": e' que NENHUMA escrita do Prisma pode
// acontecer quando a guarda rejeita. Uma action que valida depois de gravar
// passa no teste ingenuo e vaza o efeito colateral.

const dbMock = {
  cliente: { create: vi.fn(), update: vi.fn(), deleteMany: vi.fn(), findMany: vi.fn() },
  produto: { create: vi.fn(), update: vi.fn(), delete: vi.fn(), findMany: vi.fn(), findUnique: vi.fn() },
  fornecedor: { create: vi.fn(), update: vi.fn(), updateMany: vi.fn(), findMany: vi.fn(), findUnique: vi.fn() },
  empresaParceira: { create: vi.fn(), update: vi.fn(), deleteMany: vi.fn(), findMany: vi.fn() },
  empresaVinculo: { deleteMany: vi.fn(), createMany: vi.fn() },
};
const guardsMock = {
  requireAdminOrThrow: vi.fn(),
  requireSessionOrThrow: vi.fn(),
};

vi.mock("@/lib/db", () => ({ prisma: dbMock }));
vi.mock("@/lib/guards", () => guardsMock);
vi.mock("@/lib/consignado-db",()=>({recalcularConsignadoSeguro:vi.fn(),recalcularConsignadoPendentes:vi.fn()}));
vi.mock("@/lib/audit", () => ({ createAuditLog: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect: vi.fn() }));
vi.mock("@/lib/db-search", () => ({ fuzzyFindProdutos: vi.fn(), unaccentFindClienteIds: vi.fn() }));

const acoes = await import("@/app/(app)/cadastros/page");

const ERRO_ADMIN = new Error("Acesso negado. Requer perfil admin.");
const ERRO_SESSAO = new Error("Nao autenticado.");

function escritasDoPrisma() {
  const chamadas: string[] = [];
  for (const [modelo, metodos] of Object.entries(dbMock)) {
    for (const [metodo, fn] of Object.entries(metodos)) {
      if ((fn as ReturnType<typeof vi.fn>).mock.calls.length > 0) {
        chamadas.push(`${modelo}.${metodo}`);
      }
    }
  }
  return chamadas;
}

function formPreenchido() {
  const fd = new FormData();
  fd.set("id", "1");
  fd.set("nome", "TESTE");
  fd.set("telefone", "11999999999");
  return fd;
}

beforeEach(() => {
  vi.clearAllMocks();
  // Estado neutro: as duas guardas passam, salvo quando o teste disser o contrario.
  guardsMock.requireAdminOrThrow.mockResolvedValue({ id: 1, username: "admin", role: "admin" });
  guardsMock.requireSessionOrThrow.mockResolvedValue({ id: 2, username: "jakeline", role: "vendedor" });
  dbMock.fornecedor.findMany.mockResolvedValue([]);
  dbMock.cliente.create.mockResolvedValue({ id: 1 });
  dbMock.cliente.update.mockResolvedValue({ id: 1 });
  dbMock.produto.create.mockResolvedValue({ id: 1 });
  dbMock.produto.update.mockResolvedValue({ id: 1 });
  dbMock.fornecedor.create.mockResolvedValue({ id: 1 });
  dbMock.empresaParceira.create.mockResolvedValue({ id: 1 });
});

describe("vendedor PODE cadastrar e editar cliente e produto", () => {
  const permitidas = ["addCliente", "updateCliente", "addProduto", "updateProduto"] as const;

  for (const nome of permitidas) {
    it(`${nome} usa requireSessionOrThrow, nao requireAdminOrThrow`, async () => {
      const fn = acoes[nome] as (fd: FormData) => Promise<void>;
      await fn(formPreenchido());
      expect(guardsMock.requireSessionOrThrow).toHaveBeenCalled();
      // Se exigisse admin, o vendedor perderia a operacao do dia a dia.
      expect(guardsMock.requireAdminOrThrow).not.toHaveBeenCalled();
    });

    it(`${nome} nao grava nada sem sessao`, async () => {
      guardsMock.requireSessionOrThrow.mockRejectedValue(ERRO_SESSAO);
      const fn = acoes[nome] as (fd: FormData) => Promise<void>;
      await expect(fn(formPreenchido())).rejects.toThrow("Nao autenticado");
      expect(escritasDoPrisma()).toEqual([]);
    });
  }
});

describe("vendedor NAO pode mexer em fornecedor nem empresa", () => {
  const restritas = ["addFornecedor", "updateFornecedor", "addEmpresa", "updateEmpresa"] as const;

  for (const nome of restritas) {
    it(`${nome} rejeita vendedor e nao grava nada`, async () => {
      guardsMock.requireAdminOrThrow.mockRejectedValue(ERRO_ADMIN);
      const fn = acoes[nome] as (fd: FormData) => Promise<void>;
      await expect(fn(formPreenchido())).rejects.toThrow("Acesso negado");
      expect(escritasDoPrisma()).toEqual([]);
    });

    it(`${nome} passa para admin`, async () => {
      const fn = acoes[nome] as (fd: FormData) => Promise<void>;
      await fn(formPreenchido());
      expect(guardsMock.requireAdminOrThrow).toHaveBeenCalled();
    });
  }
});


describe("edição confirma sem redirect capturado como erro",()=>{
 for(const nome of ["updateCliente","updateFornecedor","updateEmpresa"] as const){
  it(`${nome} retorna normalmente após persistir`,async()=>{
   const {redirect}=await import("next/navigation");
   vi.mocked(redirect).mockImplementation(()=>{throw new Error("NEXT_REDIRECT");});
   await expect(acoes[nome](formPreenchido())).resolves.toBeUndefined();
   expect(redirect).not.toHaveBeenCalled();
   vi.mocked(redirect).mockReset();
  });
 }
});
