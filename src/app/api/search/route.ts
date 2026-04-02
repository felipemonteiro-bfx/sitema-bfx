import { NextResponse } from "next/server";
import { fuzzyFindClientes, fuzzyFindProdutos, fuzzyFindUsuarios, fuzzyFindVendas } from "@/lib/db-search";
import { produtosTexto } from "@/lib/venda-utils";
import { formatDateBR } from "@/lib/utils";

const MAX_LIMIT = 50;

function formatDateBRSafe(d: Date | string): string {
  try {
    return formatDateBR(d);
  } catch {
    return String(d).slice(0, 10);
  }
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const type = (searchParams.get("type") || "").toLowerCase();
  const q = (searchParams.get("q") || "").trim();
  const limit = Math.min(Number(searchParams.get("limit") || 20) || 20, MAX_LIMIT);

  if (!type) {
    return NextResponse.json({ error: "Missing type." }, { status: 400 });
  }
  if (!q) {
    return NextResponse.json({ options: [] });
  }

  if (type === "clientes") {
    const clientes = await fuzzyFindClientes(q, limit);
    return NextResponse.json({
      options: clientes.map((c) => ({ value: String(c.id), label: c.nome })),
    });
  }

  if (type === "produtos") {
    const produtos = await fuzzyFindProdutos(q, limit);
    return NextResponse.json({
      options: produtos.map((p) => ({ value: p.nome, label: p.nome })),
    });
  }

  if (type === "usuarios") {
    const usuarios = await fuzzyFindUsuarios(q, limit);
    return NextResponse.json({
      options: usuarios.map((u) => ({
        value: String(u.nomeExibicao || u.username),
        label: String(u.nomeExibicao || u.username),
      })),
    });
  }

  if (type === "vendas") {
    const vendas = await fuzzyFindVendas(q, limit);
    return NextResponse.json({
      options: vendas.map((v) => {
        const clienteNome = v.cliente?.nome || "N/D";
        const produtos = produtosTexto(v);
        const data = formatDateBRSafe(v.dataVenda);
        return {
          value: String(v.id),
          label: `${clienteNome} — ${produtos} — ${data}`,
        };
      }),
    });
  }

  return NextResponse.json({ error: "Invalid type." }, { status: 400 });
}
