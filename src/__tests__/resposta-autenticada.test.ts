// O 401 que quebrava a venda em silencio.
//
// O middleware so cobre `/api/*` (src/middleware.ts) e o JWT de sessao dura 7 dias sem
// renovacao (src/lib/session.ts). Quando ele expira, a PAGINA continua na tela e apenas as
// chamadas de API morrem com 401 e corpo `{error:"Sessão inválida ou expirada."}`.
//
// O formulario de venda rapida fazia:
//
//     const data = await res.json();
//     setClienteSuggestions(data || []);      // <- objeto de erro entrando como "lista"
//
// e, no autocomplete de produto, `data?.find(...)` — `.find` nao existe em objeto, entao o
// TypeError era engolido pelo `.catch(console.error)` do browser. Resultado visto pelo usuario:
// o cliente nunca aparece para ser selecionado e o submit morre em "Preencha os campos
// obrigatorios: Cliente". Nada disso chega ao servidor.
//
// `lerListaDaResposta` fecha esse buraco: checa `res.ok`, separa sessao expirada de outra
// falha, e garante que so array chega ao estado.
//
// Nota de seguranca (CLAUDE.md): nenhuma execucao de regex com estado neste arquivo.
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { lerListaDaResposta, MENSAGEM_SESSAO_EXPIRADA } from "@/lib/resposta-autenticada";

const raiz = process.cwd();
const ler = (rel: string) => readFileSync(join(raiz, rel), "utf8");

function resposta(status: number, corpo: unknown): Response {
  return new Response(JSON.stringify(corpo), {
    status,
    headers: { "content-type": "application/json" },
  });
}

describe("lerListaDaResposta — resposta autenticada nunca vira lista por engano", () => {
  it("200 com array devolve a lista", async () => {
    const r = await lerListaDaResposta(resposta(200, [{ id: 1, nome: "Maria" }]));

    expect(r.ok).toBe(true);
    expect(r.lista).toEqual([{ id: 1, nome: "Maria" }]);
    expect(r.sessaoExpirada).toBe(false);
  });

  it("401 marca sessao expirada e devolve lista vazia — o corpo de erro nao entra no estado", async () => {
    const r = await lerListaDaResposta(resposta(401, { error: "Sessão inválida ou expirada." }));

    expect(r.ok).toBe(false);
    expect(r.sessaoExpirada).toBe(true);
    expect(r.lista).toEqual([]);
    expect(r.mensagem).toBe(MENSAGEM_SESSAO_EXPIRADA);
  });

  it("500 e falha, mas nao e sessao expirada — a mensagem ao usuario tem que ser outra", async () => {
    const r = await lerListaDaResposta(resposta(500, { error: "boom" }));

    expect(r.ok).toBe(false);
    expect(r.sessaoExpirada).toBe(false);
    expect(r.lista).toEqual([]);
    expect(r.mensagem).not.toBe(MENSAGEM_SESSAO_EXPIRADA);
    expect(typeof r.mensagem).toBe("string");
  });

  it("200 com objeto no lugar de array devolve lista vazia — era exatamente o bug", async () => {
    const r = await lerListaDaResposta(resposta(200, { error: "Sessão inválida ou expirada." }));

    expect(r.ok).toBe(false);
    expect(r.lista).toEqual([]);
  });

  it("200 com corpo que nao e JSON nao lanca", async () => {
    const naoJson = new Response("<!doctype html><html>login</html>", {
      status: 200,
      headers: { "content-type": "text/html" },
    });

    const r = await lerListaDaResposta(naoJson);

    expect(r.ok).toBe(false);
    expect(r.lista).toEqual([]);
  });

  it("204 sem corpo devolve lista vazia sem lancar", async () => {
    const r = await lerListaDaResposta(new Response(null, { status: 204 }));

    expect(r.lista).toEqual([]);
  });

  it("a lista devolvida e sempre array, para `.find`/`.map` no call site nunca estourarem", async () => {
    const casos = [
      resposta(200, null),
      resposta(200, "texto"),
      resposta(200, 42),
      resposta(403, { error: "sem permissao" }),
    ];

    for (const caso of casos) {
      const r = await lerListaDaResposta(caso);
      expect(Array.isArray(r.lista)).toBe(true);
    }
  });
});

describe("adocao no formulario de venda rapida", () => {
  const form = ler("src/components/venda-rapida-form-v2.tsx");

  it("o formulario usa o leitor em vez de `res.json()` cru", () => {
    expect(form.includes("lerListaDaResposta")).toBe(true);
    expect(form.includes('from "@/lib/resposta-autenticada"')).toBe(true);
  });

  it("nao sobrou o padrao que deixava corpo de erro virar sugestao de cliente", () => {
    expect(form.includes("setClienteSuggestions(data || [])")).toBe(false);
  });

  it("os autocompletes de produto nao chamam `.find` direto no corpo da resposta", () => {
    expect(form.includes("data?.find(")).toBe(false);
  });

  it("sessao expirada vira aviso na tela, nao silencio", () => {
    // `includes("sessaoExpirada")` sozinho seria satisfeito so pelo nome do ref de controle.
    // O que prova o aviso e a chamada com a mensagem vinda da leitura.
    expect(form.includes("avisarSessaoExpirada(leitura.mensagem)")).toBe(true);
    expect(form.includes("MENSAGEM_SESSAO_EXPIRADA")).toBe(true);
  });

  it("uma leitura que falhou nao deixa o produto entrar no carrinho com custo zero", () => {
    // Regressao pega no review: sem o corte, `leitura.lista` vazia fazia
    // `produtoCompleto?.custoPadrao` virar 0 e a venda era aceita com lucro inflado,
    // ainda exibindo "adicionado!" junto com o aviso de sessao expirada.
    expect(form.includes("if (!leitura.ok) {")).toBe(true);
  });
});
