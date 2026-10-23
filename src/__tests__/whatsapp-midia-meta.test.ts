import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createHash } from "node:crypto";

const h = vi.hoisted(() => ({ config: null as Record<string, unknown> | null, janela: true, pinados: [] as unknown[], dns: [{ address: "157.240.1.1", family: 4 }] as Array<{ address: string; family: number }> }));
vi.mock("node:dns/promises", () => ({ lookup: async () => h.dns }));
vi.mock("@/lib/rede-publica", async (orig) => ({ ...(await orig<typeof import("@/lib/rede-publica")>()), fetchComIpPinado: (url: string, init: RequestInit, ip: unknown) => { h.pinados.push(ip); return globalThis.fetch(url, init); } }));
vi.mock("@/lib/db", () => ({ prisma: { config: { findFirst: async () => h.config } } }));
vi.mock("@/lib/whatsapp-mensagem", () => ({ dentroDaJanela24h: async () => h.janela }));

import {
  ErroMidiaMeta,
  baixarConteudo,
  credenciaisMeta,
  enviarMidia,
  ipNaoPublico,
  obterInfoMidia,
  subirMidiaParaMeta,
  type InfoMidia,
} from "@/lib/whatsapp-midia-meta";

const TOKEN = "EAAG-token-super-secreto";
const URL_CDN = "https://lookaside.fbsbx.com/whatsapp_business/attachments/?mid=123&ext=1&hash=SEGREDO-DO-HASH";
const sha = (b: Uint8Array) => createHash("sha256").update(b).digest("hex");
const conteudo = new TextEncoder().encode("conteudo-da-midia");

const info = (extra: Partial<InfoMidia> = {}): InfoMidia => ({
  mediaId: "123",
  url: URL_CDN,
  mime: "image/jpeg",
  sha256: sha(conteudo),
  tamanho: conteudo.length,
  ...extra,
});
const json = (corpo: unknown, status = 200) =>
  new Response(JSON.stringify(corpo), { status, headers: { "content-type": "application/json" } });
const binario = (b: Uint8Array, status = 200) => new Response(b as BodyInit, { status });
const redirect = (para: string, status = 302) => new Response(null, { status, headers: { location: para } });

/** Corpo em pedaços de 1 MB; `lidos.n` conta quantos pedaços foram puxados. */
function fluxoGrande(pedacos: number) {
  const lidos = { n: 0 };
  const corpo = new ReadableStream<Uint8Array>({
    pull(c) {
      if (lidos.n >= pedacos) return c.close();
      lidos.n++;
      c.enqueue(new Uint8Array(1024 * 1024));
    },
  });
  return { lidos, res: new Response(corpo, { status: 200 }) };
}

let fetchMock: ReturnType<typeof vi.fn>;
const chamadas = () => fetchMock.mock.calls.map((c) => String(c[0]));
const mensagemDoErro = async (p: Promise<unknown>) => {
  try {
    await p;
  } catch (e) {
    return e as Error;
  }
  throw new Error("era para falhar");
};

beforeEach(() => {
  h.pinados = [];
  h.config = { metaWhatsappToken: TOKEN, metaWhatsappPhoneNumberId: "999", metaWhatsappApiVersion: "v21.0", whatsappAutoEnabled: 0 };
  h.janela = true;
  h.dns = [{ address: "157.240.1.1", family: 4 }];
  fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);
  vi.spyOn(console, "error").mockImplementation(() => {});
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

describe("credenciaisMeta", () => {
  it("lê Config mesmo com o envio automático desligado", async () => {
    expect(await credenciaisMeta()).toEqual({ token: TOKEN, phoneNumberId: "999", apiVersion: "v21.0" });
  });

  it("cai para o env e devolve null sem token", async () => {
    h.config = null;
    vi.stubEnv("META_WHATSAPP_TOKEN", "T-ENV");
    vi.stubEnv("META_WHATSAPP_PHONE_NUMBER_ID", "55");
    expect(await credenciaisMeta()).toEqual({ token: "T-ENV", phoneNumberId: "55", apiVersion: "v21.0" });
    vi.stubEnv("META_WHATSAPP_TOKEN", "");
    expect(await credenciaisMeta()).toBeNull();
  });
});

describe("obterInfoMidia", () => {
  it("GET no Graph com phone_number_id e Bearer; normaliza o sha256", async () => {
    fetchMock.mockResolvedValue(json({ url: URL_CDN, mime_type: "image/jpeg", sha256: sha(conteudo).toUpperCase(), file_size: 17, id: "123" }));
    const r = await obterInfoMidia("123");
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe("https://graph.facebook.com/v21.0/123?phone_number_id=999");
    expect((init as RequestInit).headers).toMatchObject({ Authorization: `Bearer ${TOKEN}` });
    expect(r).toEqual({ mediaId: "123", url: URL_CDN, mime: "image/jpeg", sha256: sha(conteudo), tamanho: 17 });
  });

  it("mediaId que não é só dígitos falha sem fazer fetch", async () => {
    for (const ruim of ["12a", "../x", "1/2", "", "1?x=2", " 12"]) {
      const e = await mensagemDoErro(obterInfoMidia(ruim));
      expect(e).toBeInstanceOf(ErroMidiaMeta);
      expect((e as ErroMidiaMeta).codigo).toBe("media_id_invalido");
    }
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("404 do id é midia_indisponivel; sem credenciais é sem_credenciais", async () => {
    fetchMock.mockResolvedValue(json({ error: { message: `vazou ${TOKEN}` } }, 404));
    expect(((await mensagemDoErro(obterInfoMidia("123"))) as ErroMidiaMeta).codigo).toBe("midia_indisponivel");
    h.config = null;
    expect(((await mensagemDoErro(obterInfoMidia("123"))) as ErroMidiaMeta).codigo).toBe("sem_credenciais");
  });

  it("outros erros HTTP e resposta sem url viram erros próprios, sem o corpo da Meta", async () => {
    fetchMock.mockResolvedValueOnce(json({ error: { message: `corpo cru ${TOKEN}` } }, 500));
    const e1 = (await mensagemDoErro(obterInfoMidia("123"))) as ErroMidiaMeta;
    expect(e1.codigo).toBe("falha_http");
    expect(e1.message).not.toContain("corpo cru");
    fetchMock.mockResolvedValueOnce(json({ id: "123" }));
    expect(((await mensagemDoErro(obterInfoMidia("123"))) as ErroMidiaMeta).codigo).toBe("resposta_invalida");
  });
});

describe("baixarConteudo", () => {
  it("baixa, confere o sha256 e devolve os bytes", async () => {
    fetchMock.mockResolvedValue(binario(conteudo));
    const r = await baixarConteudo(info(), { tipo: "imagem" });
    expect(Array.from(r.bytes)).toEqual(Array.from(conteudo));
    expect(r.sha256).toBe(sha(conteudo));
    const [, init] = fetchMock.mock.calls[0]!;
    expect((init as RequestInit).redirect).toBe("manual");
    expect((init as RequestInit).headers).toMatchObject({ Authorization: `Bearer ${TOKEN}` });
    // Uma resolução só: a conexão usa o IP que passou na checagem pública.
    expect(h.pinados).toEqual([{ address: "157.240.1.1", family: 4 }]);
  });

  it("host fora da lista não gera nenhum fetch (inclusive subdomínio parecido e porta)", async () => {
    const ruins = [
      "https://evil.example.com/x",
      "https://lookaside.fbsbx.com.evil.com/x",
      "https://x.lookaside.fbsbx.com/x",
      "https://scontent.fbsbx.com/x",
      "https://user:pw@lookaside.fbsbx.com/x",
      "https://lookaside.fbsbx.com:8443/x",
      "http://lookaside.fbsbx.com/x",
      "https://169.254.169.254/latest",
      "ftp://lookaside.fbsbx.com/x",
      "nao-e-url",
    ];
    for (const url of ruins) {
      const e = (await mensagemDoErro(baixarConteudo(info({ url }), { tipo: "imagem" }))) as ErroMidiaMeta;
      expect(e.codigo).toBe("url_invalida");
    }
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("redirect para outro host é recusado e não gera segundo fetch", async () => {
    fetchMock.mockResolvedValue(redirect("https://evil.example.com/roubo"));
    const e = (await mensagemDoErro(baixarConteudo(info(), { tipo: "imagem" }))) as ErroMidiaMeta;
    expect(e.codigo).toBe("redirect_invalido");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("um salto dentro do mesmo host é seguido; dois saltos não", async () => {
    fetchMock.mockResolvedValueOnce(redirect("https://lookaside.fbsbx.com/outra?x=1")).mockResolvedValueOnce(binario(conteudo));
    const r = await baixarConteudo(info(), { tipo: "imagem" });
    expect(r.bytes.length).toBe(conteudo.length);
    expect(chamadas()[1]).toBe("https://lookaside.fbsbx.com/outra?x=1");
    expect((fetchMock.mock.calls[1]![1] as RequestInit).redirect).toBe("manual");

    fetchMock.mockReset();
    fetchMock
      .mockResolvedValueOnce(redirect("/a"))
      .mockResolvedValueOnce(redirect("/b"))
      .mockResolvedValueOnce(binario(conteudo));
    const e = (await mensagemDoErro(baixarConteudo(info(), { tipo: "imagem" }))) as ErroMidiaMeta;
    expect(e.codigo).toBe("redirect_invalido");
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("redirect sem Location ou para http é recusado", async () => {
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 302 }));
    expect(((await mensagemDoErro(baixarConteudo(info(), { tipo: "imagem" }))) as ErroMidiaMeta).codigo).toBe("redirect_invalido");
    fetchMock.mockResolvedValueOnce(redirect("http://lookaside.fbsbx.com/x"));
    expect(((await mensagemDoErro(baixarConteudo(info(), { tipo: "imagem" }))) as ErroMidiaMeta).codigo).toBe("redirect_invalido");
  });

  it("arquivo grande aborta a leitura no limite do tipo (não lê tudo)", async () => {
    const { lidos, res } = fluxoGrande(50);
    fetchMock.mockResolvedValue(res);
    const e = (await mensagemDoErro(baixarConteudo(info({ sha256: undefined, tamanho: undefined }), { tipo: "imagem" }))) as ErroMidiaMeta;
    expect(e.codigo).toBe("tamanho_excedido");
    expect(lidos.n).toBeLessThanOrEqual(8); // limite de imagem = 5 MB
  });

  it("tamanho informado acima do limite do tipo falha antes de qualquer fetch", async () => {
    const e = (await mensagemDoErro(baixarConteudo(info({ tamanho: 6 * 1024 * 1024 }), { tipo: "imagem" }))) as ErroMidiaMeta;
    expect(e.codigo).toBe("tamanho_excedido");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("sha256 divergente é rejeitado", async () => {
    fetchMock.mockResolvedValue(binario(new TextEncoder().encode("outro conteudo")));
    const e = (await mensagemDoErro(baixarConteudo(info(), { tipo: "imagem" }))) as ErroMidiaMeta;
    expect(e.codigo).toBe("sha_divergente");
  });

  it("sem sha256 informado não há o que conferir, mas o hash calculado volta", async () => {
    fetchMock.mockResolvedValue(binario(conteudo));
    const r = await baixarConteudo(info({ sha256: undefined }), { tipo: "imagem" });
    expect(r.sha256).toBe(sha(conteudo));
  });

  it("404 da URL é url_expirada, diferente do 404 do id", async () => {
    fetchMock.mockResolvedValue(new Response("nada", { status: 404 }));
    const urlExp = (await mensagemDoErro(baixarConteudo(info(), { tipo: "imagem" }))) as ErroMidiaMeta;
    fetchMock.mockResolvedValue(json({}, 404));
    const idMorto = (await mensagemDoErro(obterInfoMidia("123"))) as ErroMidiaMeta;
    expect(urlExp.codigo).toBe("url_expirada");
    expect(idMorto.codigo).toBe("midia_indisponivel");
    expect(urlExp.codigo).not.toBe(idMorto.codigo);
  });

  it("timeout vira erro próprio", async () => {
    fetchMock.mockImplementation(
      (_u: string, init: RequestInit) =>
        new Promise((_, rej) => init.signal?.addEventListener("abort", () => rej(Object.assign(new Error("aborted"), { name: "AbortError" })))),
    );
    const e = (await mensagemDoErro(baixarConteudo(info(), { tipo: "imagem", inatividadeMs: 20 }))) as ErroMidiaMeta;
    expect(e.codigo).toBe("timeout");
  });

  it("erro de rede não carrega a causa (que pode ter URL e token)", async () => {
    fetchMock.mockRejectedValue(new Error(`connect falhou em ${URL_CDN} com ${TOKEN}`));
    const e = (await mensagemDoErro(baixarConteudo(info(), { tipo: "imagem" }))) as ErroMidiaMeta;
    expect(e.codigo).toBe("rede");
    expect(e.message).not.toContain(TOKEN);
    expect(e.message).not.toContain("lookaside");
    expect(e.cause).toBeUndefined();
  });
});

describe("segredos e hosts", () => {
  it("nenhum Error.message de nenhum caminho contém token, URL do lookaside ou hash", async () => {
    const cenarios: Array<() => Promise<unknown>> = [
      async () => {
        fetchMock.mockResolvedValue(json({ error: { message: `${TOKEN} ${URL_CDN}` } }, 500));
        return obterInfoMidia("123");
      },
      async () => {
        fetchMock.mockResolvedValue(new Response(`${TOKEN} ${URL_CDN}`, { status: 403 }));
        return baixarConteudo(info(), { tipo: "imagem" });
      },
      async () => {
        fetchMock.mockResolvedValue(redirect(`https://evil.com/?t=${TOKEN}`));
        return baixarConteudo(info(), { tipo: "imagem" });
      },
      async () => baixarConteudo(info({ url: `https://evil.com/${TOKEN}` }), { tipo: "imagem" }),
      async () => {
        fetchMock.mockResolvedValue(json({ error: { message: TOKEN } }, 400));
        return subirMidiaParaMeta(conteudo, "image/jpeg", "a.jpg");
      },
      async () => {
        fetchMock.mockRejectedValue(new Error(`${TOKEN} ${URL_CDN}`));
        return baixarConteudo(info(), { tipo: "imagem" });
      },
    ];
    for (const c of cenarios) {
      const e = await mensagemDoErro(c());
      for (const proibido of [TOKEN, "SEGREDO-DO-HASH", "lookaside", "evil.com", "Bearer"]) {
        expect(e.message).not.toContain(proibido);
      }
    }
    expect(JSON.stringify(vi.mocked(console.error).mock.calls)).not.toContain(TOKEN);
  });

  it("todo fetch do módulo vai só para graph.facebook.com ou lookaside.fbsbx.com", async () => {
    fetchMock
      .mockResolvedValueOnce(json({ url: URL_CDN, mime_type: "image/jpeg", sha256: sha(conteudo), file_size: 17 }))
      .mockResolvedValueOnce(redirect("https://lookaside.fbsbx.com/y"))
      .mockResolvedValueOnce(binario(conteudo))
      .mockResolvedValueOnce(json({ id: "up1" }))
      .mockResolvedValueOnce(json({ messages: [{ id: "wamid.1" }] }));
    const i = await obterInfoMidia("123");
    await baixarConteudo(i, { tipo: "imagem" });
    await subirMidiaParaMeta(conteudo, "image/jpeg", "a.jpg");
    await enviarMidia({ para: "5592999999999", tipo: "imagem", mediaId: "up1" });
    const hosts = new Set(chamadas().map((u) => new URL(u).host));
    expect([...hosts].sort()).toEqual(["graph.facebook.com", "lookaside.fbsbx.com"]);
  });
});

describe("subirMidiaParaMeta", () => {
  it("multipart em /media com messaging_product e type, devolve o id", async () => {
    fetchMock.mockResolvedValue(json({ id: "up42" }));
    const id = await subirMidiaParaMeta(conteudo, "application/pdf", "../../Relatório.pdf");
    expect(id).toBe("up42");
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe("https://graph.facebook.com/v21.0/999/media");
    const req = init as RequestInit;
    expect(req.method).toBe("POST");
    expect(req.headers).toEqual({ Authorization: `Bearer ${TOKEN}` }); // sem Content-Type: o boundary é do FormData
    const form = req.body as FormData;
    expect(form.get("messaging_product")).toBe("whatsapp");
    expect(form.get("type")).toBe("application/pdf");
    expect((form.get("file") as File).name).toBe("Relatório.pdf");
  });

  it("resposta sem id é upload_falhou", async () => {
    fetchMock.mockResolvedValue(json({}));
    expect(((await mensagemDoErro(subirMidiaParaMeta(conteudo, "image/jpeg", "a.jpg"))) as ErroMidiaMeta).codigo).toBe("upload_falhou");
  });
});

describe("enviarMidia (via post() do MetaProvider)", () => {
  it("imagem com legenda", async () => {
    fetchMock.mockResolvedValue(json({ messages: [{ id: "wamid.9" }] }));
    const r = await enviarMidia({ para: "5592999999999", tipo: "imagem", mediaId: "up1", legenda: "olha" });
    expect(r).toMatchObject({ ok: true, messageId: "wamid.9", provider: "meta_cloud" });
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe("https://graph.facebook.com/v21.0/999/messages");
    expect(JSON.parse((init as RequestInit).body as string)).toEqual({
      messaging_product: "whatsapp",
      to: "5592999999999",
      type: "image",
      image: { id: "up1", caption: "olha" },
    });
  });

  it("legenda só onde cabe; figurinha e áudio sem legenda; documento com filename", async () => {
    fetchMock.mockResolvedValue(json({ messages: [{ id: "w" }] }));
    const corpo = async (a: Parameters<typeof enviarMidia>[0]) => {
      fetchMock.mockClear();
      await enviarMidia(a);
      return JSON.parse((fetchMock.mock.calls[0]![1] as RequestInit).body as string);
    };
    const base = { para: "5592999999999", mediaId: "m", legenda: "L" };
    expect((await corpo({ ...base, tipo: "figurinha" })).sticker).toEqual({ id: "m" });
    expect((await corpo({ ...base, tipo: "audio" })).audio).toEqual({ id: "m" });
    expect((await corpo({ ...base, tipo: "video" })).video).toEqual({ id: "m", caption: "L" });
    expect((await corpo({ ...base, tipo: "documento", nomeArquivo: "../x/a.pdf" })).document).toEqual({ id: "m", caption: "L", filename: "a.pdf" });
  });

  it("respeita a janela de 24 h (freeServiceOnly): fechada, nenhum fetch", async () => {
    h.janela = false;
    const r = await enviarMidia({ para: "5592999999999", tipo: "imagem", mediaId: "up1" });
    expect(r).toMatchObject({ ok: false, error: "janela_gratuita_indisponivel" });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("sem credenciais devolve erro sem fetch", async () => {
    h.config = null;
    const r = await enviarMidia({ para: "5592999999999", tipo: "imagem", mediaId: "up1" });
    expect(r).toMatchObject({ ok: false, error: "sem_credenciais" });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("timeout por inatividade", () => {
  /** Corpo que entrega `n` pedaços de 1 byte, um a cada `intervaloMs`, e então fecha (ou trava). */
  function gotejando(n: number, intervaloMs: number, travar = false) {
    let i = 0;
    return new Response(new ReadableStream<Uint8Array>({
      async pull(c) {
        if (i >= n) {
          if (travar) return new Promise(() => {});
          return c.close();
        }
        await new Promise((r) => setTimeout(r, intervaloMs));
        i++;
        c.enqueue(new Uint8Array([97]));
      },
    }), { status: 200 });
  }

  it("download lento mas com bytes chegando NÃO estoura, mesmo passando do tempo de inatividade no total", async () => {
    fetchMock.mockResolvedValue(gotejando(8, 15));
    const r = await baixarConteudo(info({ sha256: undefined, tamanho: undefined }), { tipo: "imagem", inatividadeMs: 60, tetoMs: 5_000 });
    expect(r.bytes.length).toBe(8);
  });

  it("sem bytes por mais que a inatividade, aborta como timeout", async () => {
    fetchMock.mockResolvedValue(gotejando(2, 5, true));
    const e = (await mensagemDoErro(baixarConteudo(info({ sha256: undefined, tamanho: undefined }), { tipo: "imagem", inatividadeMs: 40, tetoMs: 5_000 }))) as ErroMidiaMeta;
    expect(e.codigo).toBe("timeout");
  });

  it("o teto total também vale, e cresce com o tamanho", async () => {
    fetchMock.mockResolvedValue(gotejando(50, 10));
    const e = (await mensagemDoErro(baixarConteudo(info({ sha256: undefined, tamanho: undefined }), { tipo: "imagem", inatividadeMs: 200, tetoMs: 60 }))) as ErroMidiaMeta;
    expect(e.codigo).toBe("timeout");
  });
});

describe("obterInfoMidia e subirMidiaParaMeta: timeout e redirect", () => {
  const aborto = () => Object.assign(new Error("t"), { name: "TimeoutError" });

  it("obterInfoMidia passa signal e redirect manual, e o timeout vira erro próprio", async () => {
    fetchMock.mockResolvedValue(json({ url: URL_CDN }));
    await obterInfoMidia("123");
    const init = fetchMock.mock.calls[0]![1] as RequestInit;
    expect(init.signal).toBeInstanceOf(AbortSignal);
    expect(init.redirect).toBe("manual");
    fetchMock.mockRejectedValue(aborto());
    expect(((await mensagemDoErro(obterInfoMidia("123"))) as ErroMidiaMeta).codigo).toBe("timeout");
  });

  it("obterInfoMidia recusa redirect para outro host e segue um salto no mesmo host", async () => {
    fetchMock.mockResolvedValue(redirect("https://evil.example.com/x"));
    expect(((await mensagemDoErro(obterInfoMidia("123"))) as ErroMidiaMeta).codigo).toBe("redirect_invalido");
    fetchMock.mockReset();
    fetchMock.mockResolvedValueOnce(redirect("https://graph.facebook.com/v21.0/outro")).mockResolvedValueOnce(json({ url: URL_CDN }));
    expect((await obterInfoMidia("123")).url).toBe(URL_CDN);
  });

  it("subirMidiaParaMeta passa signal e mapeia o timeout", async () => {
    fetchMock.mockResolvedValue(json({ id: "up1" }));
    await subirMidiaParaMeta(conteudo, "image/jpeg", "a.jpg");
    expect((fetchMock.mock.calls[0]![1] as RequestInit).signal).toBeInstanceOf(AbortSignal);
    fetchMock.mockRejectedValue(aborto());
    expect(((await mensagemDoErro(subirMidiaParaMeta(conteudo, "image/jpeg", "a.jpg"))) as ErroMidiaMeta).codigo).toBe("timeout");
  });
});

describe("DNS do CDN: recusa IP não público", () => {
  it.each(["127.0.0.1", "10.1.2.3", "172.16.0.5", "172.31.255.1", "192.168.1.1", "169.254.169.254", "0.0.0.0", "100.64.0.1", "::1", "fe80::1", "fd00::1", "::ffff:10.0.0.1", "224.0.0.1"])(
    "%s é não público", (ip) => expect(ipNaoPublico(ip)).toBe(true));
  it.each(["157.240.1.1", "172.32.0.1", "8.8.8.8", "2a03:2880::1"])("%s é público", (ip) => expect(ipNaoPublico(ip)).toBe(false));

  it("host do CDN resolvendo para IP privado: nenhum fetch", async () => {
    h.dns = [{ address: "169.254.169.254", family: 4 }];
    const e = (await mensagemDoErro(baixarConteudo(info(), { tipo: "imagem" }))) as ErroMidiaMeta;
    expect(e.codigo).toBe("url_invalida");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("basta UM endereço privado entre os resolvidos", async () => {
    h.dns = [{ address: "157.240.1.1", family: 4 }, { address: "127.0.0.1", family: 4 }];
    expect(((await mensagemDoErro(baixarConteudo(info(), { tipo: "imagem" }))) as ErroMidiaMeta).codigo).toBe("url_invalida");
  });
});
