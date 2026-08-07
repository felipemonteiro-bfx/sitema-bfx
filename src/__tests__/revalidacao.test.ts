import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import {
  ROTAS_VENDA,
  ROTAS_CLIENTE,
  ROTAS_PRODUTO,
  ROTAS_DESPESA,
  ROTAS_USUARIO,
  ROTAS_FORNECEDOR,
  ROTAS_EMPRESA,
  ROTAS_CONFIG,
  ROTAS_CRM,
} from "@/lib/revalidacao";

// `import.meta.url` em vez de `__dirname`: nao depende do wrapper CJS do runner.
const RAIZ = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const ler = (caminho: string) => readFileSync(join(RAIZ, caminho), "utf8");

const GRUPOS = {
  ROTAS_VENDA,
  ROTAS_CLIENTE,
  ROTAS_PRODUTO,
  ROTAS_DESPESA,
  ROTAS_USUARIO,
  ROTAS_FORNECEDOR,
  ROTAS_EMPRESA,
  ROTAS_CONFIG,
  ROTAS_CRM,
} as const;

describe("grupos de rotas", () => {
  it.each(Object.entries(GRUPOS))("%s tem rotas validas e sem repeticao", (_nome, rotas) => {
    expect(rotas.length).toBeGreaterThan(0);
    for (const rota of rotas) {
      expect(rota.startsWith("/")).toBe(true);
      expect(rota.trim()).toBe(rota);
    }
    expect(new Set(rotas).size).toBe(rotas.length);
  });

  it("venda cobre as telas que antes ficavam desatualizadas", () => {
    // O bug era exatamente este: salvar uma venda atualizava so /historico.
    for (const rota of ["/dashboard", "/financeiro", "/prudent", "/comissoes", "/boletos", "/relatorios"]) {
      expect(ROTAS_VENDA).toContain(rota);
    }
  });

  it("produto cobre a venda rapida — estoque desatualizado gera venda errada", () => {
    expect(ROTAS_PRODUTO).toContain("/venda-rapida");
  });

  it("venda cobre estoque e fidelidade — a venda escreve os dois", () => {
    // criarVendaV2 debita estoque e mexe no saldo de pontos, nao so na venda.
    expect(ROTAS_VENDA).toContain("/cadastros");
    expect(ROTAS_VENDA).toContain("/crm/fidelidade");
  });

  it("usuario cobre comissoes — vendedor novo precisa aparecer la", () => {
    expect(ROTAS_USUARIO).toContain("/comissoes");
  });
});

describe("service worker nao pode cachear payload RSC", () => {
  const sw = ler("public/sw.js");

  it("ignora requests RSC antes de qualquer cache", () => {
    // Sem isto, a navegacao client-side e o router.refresh() recebem a copia
    // velha e a tela so atualiza com F5 ou limpando o cache.
    // Assertar a EXPRESSAO, nao a palavra: so o comentario ja casaria com "RSC".
    expect(sw).toContain("request.headers.get('RSC')");
    expect(sw).toContain("url.searchParams.has('_rsc')");
  });

  it("so faz cache-first de asset de fato estatico", () => {
    expect(sw).toContain("ESTATICOS.includes(request.destination)");
  });
});

describe("gate: quem grava precisa revalidar", () => {
  it.each([
    ["src/app/(app)/venda-rapida/actions.ts", "revalidarVenda"],
    ["src/app/(app)/historico/actions.ts", "revalidarVenda"],
    ["src/app/(app)/prudent/page.tsx", "revalidarVenda"],
    ["src/app/(app)/cadastros/page.tsx", "revalidarCliente"],
    ["src/app/(app)/financeiro/page.tsx", "revalidarDespesa"],
    ["src/app/(app)/gestao-rh/page.tsx", "revalidarUsuario"],
    // ai-actions monta um mapa acao -> funcao; quem e chamado e o despachante.
    ["src/lib/ai-actions.ts", "revalidarAcaoAi"],
    ["src/app/api/clientes/route.ts", "revalidarCliente"],
    ["src/app/api/produtos/route.ts", "revalidarProduto"],
    ["src/app/api/fornecedores/route.ts", "revalidarFornecedor"],
    ["src/app/api/importacao/batch/route.ts", "revalidarVenda"],
    ["src/lib/boleto-actions.ts", "revalidarVenda"],
    ["src/app/(app)/crm/actions.ts", "revalidarCliente"],
    ["src/app/(app)/crm/fidelidade/actions.ts", "revalidarCrm"],
    ["src/app/(app)/crm/campanhas/actions.ts", "revalidarCrm"],
    ["src/app/(app)/crm/importar-leads/actions.ts", "revalidarCliente"],
    ["src/app/(app)/importacao/clientes/actions.ts", "revalidarCliente"],
    ["src/app/(app)/importacao/fornecedores/actions.ts", "revalidarFornecedor"],
    ["src/app/(app)/configuracoes/page.tsx", "revalidarConfig"],
  ])("%s chama %s", (arquivo, funcao) => {
    // `funcao + "("` e nao so o nome: no import e no mapa o nome aparece sem
    // parenteses, entao o teste passaria sem nenhuma chamada existir.
    expect(ler(arquivo)).toContain(`${funcao}(`);
  });
});
