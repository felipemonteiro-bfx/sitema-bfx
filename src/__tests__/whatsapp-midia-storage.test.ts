import { describe, it, expect, vi, beforeEach } from "vitest";

// Cliente S3 falso: registra cada comando enviado e responde conforme o nome do comando.
const enviados: { nome: string; input: Record<string, unknown> }[] = [];
let respostas: Record<string, unknown | (() => unknown)> = {};

const clienteFalso = {
  send: vi.fn(async (cmd: { constructor: { name: string }; input: Record<string, unknown> }) => {
    const nome = cmd.constructor.name;
    enviados.push({ nome, input: cmd.input });
    const r = respostas[nome];
    const v = typeof r === "function" ? (r as () => unknown)() : r;
    if (v instanceof Error) throw v;
    return v ?? {};
  }),
};
const criarClienteS3 = vi.fn(() => clienteFalso);

vi.mock("@/lib/minio", () => ({ criarClienteS3: (...a: unknown[]) => (criarClienteS3 as (...x: unknown[]) => unknown)(...a) }));

import {
  chaveNova,
  validarChave,
  verificarBucketPrivado,
  gravar,
  ler,
  remover,
  lerConfigWhatsApp,
  MidiaStorageError,
  _resetarCacheParaTeste,
} from "@/lib/whatsapp-midia-storage";

const ENV: Record<string, string | undefined> = {
  MINIO_ENDPOINT: "http://geral:9000",
  MINIO_ACCESS_KEY: "AKGERAL",
  MINIO_SECRET_KEY: "SEGREDO-GERAL",
  MINIO_BUCKET: "produtos",
};

function erroS3(name: string, status: number) {
  return Object.assign(new Error(name), { name, $metadata: { httpStatusCode: status } });
}
function politicaPublica(principal: unknown = "*", action: unknown = "s3:GetObject") {
  return { Policy: JSON.stringify({ Statement: [{ Effect: "Allow", Principal: principal, Action: action, Resource: "arn:aws:s3:::whatsapp-midias/*" }] }) };
}
const nomes = () => enviados.map((e) => e.nome);

beforeEach(() => {
  vi.unstubAllEnvs();
  enviados.length = 0;
  respostas = { HeadBucketCommand: {}, GetBucketPolicyCommand: erroS3("NoSuchBucketPolicy", 404) };
  criarClienteS3.mockClear();
  _resetarCacheParaTeste();
  Object.assign(process.env, ENV as Record<string, string>);
  delete process.env.MINIO_WHATSAPP_BUCKET;
  delete process.env.MINIO_WHATSAPP_ENDPOINT;
  delete process.env.MINIO_WHATSAPP_ACCESS_KEY;
  delete process.env.MINIO_WHATSAPP_SECRET_KEY;
});

describe("config", () => {
  it("usa whatsapp-midias por padrão, não o bucket produtos", () => {
    expect(lerConfigWhatsApp(ENV).bucket).toBe("whatsapp-midias");
  });
  it("variáveis próprias vencem as gerais; ausentes caem nas gerais", () => {
    const c = lerConfigWhatsApp({ ...ENV, MINIO_WHATSAPP_ACCESS_KEY: "AKPROPRIA", MINIO_WHATSAPP_SECRET_KEY: "SPROPRIO" });
    expect(c.accessKey).toBe("AKPROPRIA");
    expect(c.endpoint).toBe("http://geral:9000");
  });
  it("recusa bucket configurado igual ao público produtos", () => {
    expect(() => lerConfigWhatsApp({ ...ENV, MINIO_WHATSAPP_BUCKET: "produtos" })).toThrowError(/bucket_publico|produtos/);
  });
  it("sem credencial dá erro nao_configurado sem vazar segredo", () => {
    try {
      lerConfigWhatsApp({ MINIO_WHATSAPP_ENDPOINT: "http://x:9000" });
      throw new Error("deveria falhar");
    } catch (e) {
      expect(e).toBeInstanceOf(MidiaStorageError);
      expect((e as MidiaStorageError).code).toBe("nao_configurado");
    }
  });
});

describe("verificarBucketPrivado", () => {
  it("bucket sem política: ok, e nunca cria bucket nem aplica política", async () => {
    await verificarBucketPrivado();
    expect(nomes()).toEqual(["HeadBucketCommand", "GetBucketPolicyCommand"]);
    expect(nomes()).not.toContain("PutBucketPolicyCommand");
    expect(nomes()).not.toContain("CreateBucketCommand");
    expect(enviados[0].input.Bucket).toBe("whatsapp-midias");
  });
  it("bucket inexistente: erro bucket_ausente e NÃO cria", async () => {
    respostas.HeadBucketCommand = erroS3("NotFound", 404);
    await expect(verificarBucketPrivado()).rejects.toMatchObject({ code: "bucket_ausente" });
    expect(nomes()).not.toContain("CreateBucketCommand");
    expect(nomes()).not.toContain("PutBucketPolicyCommand");
  });
  it.each([
    ["Principal *", "*", "s3:GetObject"],
    ["Principal AWS *", { AWS: "*" }, "s3:GetObject"],
    ["Principal AWS [*]", { AWS: ["*"] }, ["s3:GetObject"]],
    ["Action s3:*", "*", "s3:*"],
    ["Action *", "*", "*"],
    ["Action s3:getobject minúsculo", "*", "s3:getobject"],
    ["Action s3:GetObjectVersion", "*", "s3:GetObjectVersion"],
    ["Action s3:GetObjectAcl em lista", { AWS: "*" }, ["s3:PutObject", "s3:GetObjectAcl"]],
    ["Action s3:GET* maiúsculo", "*", "S3:GET*"],
  ])("política anônima (%s): recusa", async (_n, principal, action) => {
    respostas.GetBucketPolicyCommand = politicaPublica(principal, action);
    await expect(verificarBucketPrivado()).rejects.toMatchObject({ code: "bucket_publico" });
  });
  it("política anônima existente: gravar recusa e nenhum PutObject é enviado", async () => {
    respostas.GetBucketPolicyCommand = politicaPublica();
    await expect(gravar(chaveNova(), Buffer.from("x"), "image/png")).rejects.toMatchObject({ code: "bucket_publico" });
    expect(nomes()).not.toContain("PutObjectCommand");
  });
  it("política restrita a principal específico não é pública", async () => {
    respostas.GetBucketPolicyCommand = politicaPublica({ AWS: "arn:aws:iam::1:user/app" });
    await expect(verificarBucketPrivado()).resolves.toBeUndefined();
  });
  it("falha inesperada ao ler a política fecha por segurança", async () => {
    respostas.GetBucketPolicyCommand = erroS3("InternalError", 500);
    await expect(verificarBucketPrivado()).rejects.toMatchObject({ code: "verificacao_falhou" });
  });
  it("falha na verificação não fica em cache: a próxima tentativa refaz", async () => {
    respostas.GetBucketPolicyCommand = erroS3("InternalError", 500);
    await expect(verificarBucketPrivado()).rejects.toMatchObject({ code: "verificacao_falhou" });
    respostas.GetBucketPolicyCommand = erroS3("NoSuchBucketPolicy", 404);
    await expect(verificarBucketPrivado()).resolves.toBeUndefined();
  });
  it("o resultado 'privado' vale 10 min e depois é revalidado (política pode ter virado pública)", async () => {
    vi.useFakeTimers();
    try {
      await verificarBucketPrivado();
      const antes = enviados.length;
      vi.advanceTimersByTime(9 * 60_000);
      await verificarBucketPrivado();
      expect(enviados.length).toBe(antes); // ainda em cache
      respostas.GetBucketPolicyCommand = politicaPublica();
      vi.advanceTimersByTime(2 * 60_000);
      await expect(verificarBucketPrivado()).rejects.toMatchObject({ code: "bucket_publico" });
    } finally {
      vi.useRealTimers();
    }
  });
  it("erro não contém credencial", async () => {
    respostas.HeadBucketCommand = erroS3("AccessDenied AKGERAL SEGREDO-GERAL", 403);
    try {
      await verificarBucketPrivado();
      throw new Error("deveria falhar");
    } catch (e) {
      const t = String((e as Error).message) + JSON.stringify(e);
      expect(t).not.toContain("SEGREDO-GERAL");
      expect(t).not.toContain("AKGERAL");
    }
  });
});

describe("chaves", () => {
  it("chaveNova segue midias/aaaa/mm/<uuid> e é única", () => {
    const a = chaveNova(new Date("2026-03-09T12:00:00Z"));
    expect(a).toMatch(/^midias\/2026\/03\/[0-9a-f-]{36}$/);
    expect(chaveNova()).not.toBe(chaveNova());
    expect(validarChave(a)).toBe(a);
  });
  it.each([
    "midias/2026/03/../../x",
    "midias/2026/03/abc/def",
    "midias/2026/03/foto.png",
    "../midias/2026/03/11111111-1111-1111-1111-111111111111",
    "/midias/2026/03/11111111-1111-1111-1111-111111111111",
    "midias/2026/13/11111111-1111-1111-1111-111111111111",
    "produtos/x.png",
    "",
    "midias/2026/03/11111111-1111-1111-1111-111111111111/",
  ])("recusa %j", (k) => {
    expect(() => validarChave(k)).toThrowError(MidiaStorageError);
  });
  it("gravar/ler/remover validam a chave antes de falar com o S3", async () => {
    await expect(gravar("../x", Buffer.from("a"), "image/png")).rejects.toMatchObject({ code: "chave_invalida" });
    await expect(ler("a/b")).rejects.toMatchObject({ code: "chave_invalida" });
    await expect(remover("a/b")).rejects.toMatchObject({ code: "chave_invalida" });
    expect(enviados).toHaveLength(0);
  });
});

describe("gravar / ler / remover", () => {
  const K = "midias/2026/03/11111111-1111-1111-1111-111111111111";
  it("gravar usa o bucket privado e o mime informado", async () => {
    await gravar(K, Buffer.from("abc"), "image/png");
    const put = enviados.find((e) => e.nome === "PutObjectCommand")!;
    expect(put.input).toMatchObject({ Bucket: "whatsapp-midias", Key: K, ContentType: "image/png" });
  });
  it("ler sem Range devolve total", async () => {
    respostas.GetObjectCommand = { Body: { transformToWebStream: () => "STREAM" }, ContentLength: 100, ContentType: "image/png" };
    const r = await ler(K);
    expect(r).toMatchObject({ tamanhoTotal: 100, status: 200, contentRange: null, contentType: "image/png" });
    expect(enviados.find((e) => e.nome === "GetObjectCommand")!.input.Range).toBeUndefined();
  });
  it.each(["bytes=0-9", "bytes=10-", "bytes=-5"])("repassa Range %s ao GetObject", async (range) => {
    respostas.GetObjectCommand = { Body: { transformToWebStream: () => "S" }, ContentLength: 10, ContentRange: "bytes 0-9/100" };
    const r = await ler(K, range);
    expect(enviados.find((e) => e.nome === "GetObjectCommand")!.input.Range).toBe(range);
    expect(r).toMatchObject({ status: 206, tamanhoTotal: 100, contentRange: "bytes 0-9/100", contentLength: 10 });
  });
  it("Range pedido mas storage sem ContentRange: 200 com o corpo inteiro, sem Content-Range", async () => {
    respostas.GetObjectCommand = { Body: { transformToWebStream: () => "S" }, ContentLength: 100 };
    const r = await ler(K, "bytes=0-9");
    expect(r).toMatchObject({ status: 200, contentRange: null, contentLength: 100, tamanhoTotal: 100 });
  });
  it.each(["bytes=", "bytes=-", "bytes=a-b", "bytes=0-9,20-30", "items=0-1", "bytes=9-1"])("recusa Range inválido %j", async (range) => {
    await expect(ler(K, range)).rejects.toMatchObject({ code: "range_invalido" });
    expect(nomes()).not.toContain("GetObjectCommand");
  });
  it("chave inexistente devolve null", async () => {
    respostas.GetObjectCommand = erroS3("NoSuchKey", 404);
    expect(await ler(K)).toBeNull();
  });
  it("remover envia DeleteObject no bucket privado", async () => {
    await remover(K);
    expect(enviados.find((e) => e.nome === "DeleteObjectCommand")!.input).toMatchObject({ Bucket: "whatsapp-midias", Key: K });
  });
});

describe('privacidade no Garage de produção', () => {
 it('confere website desativado, em vez da API de políticas ausente no Garage', async () => {
  vi.stubEnv('MINIO_WHATSAPP_STORAGE_DRIVER','garage');
  respostas.GetBucketWebsiteCommand={};
  await expect(verificarBucketPrivado()).resolves.toBeUndefined();
  expect(nomes()).toContain('GetBucketWebsiteCommand');
  expect(nomes()).not.toContain('GetBucketPolicyCommand');
 });
 it('recusa bucket Garage exposto como website', async () => {
  vi.stubEnv('MINIO_WHATSAPP_STORAGE_DRIVER','garage');
  respostas.GetBucketWebsiteCommand={IndexDocument:{Suffix:'index.html'}};
  await expect(verificarBucketPrivado()).rejects.toMatchObject({code:'bucket_publico'});
 });
});
