import { describe, it, expect } from "vitest";
import {
  normalizarNomeCliente,
  montarPayloadClienteRapido,
  mensagemClienteDuplicado,
  deveConsultarSimilares,
} from "@/lib/cliente-rapido";

describe("cliente-rapido — modulo puro de cadastro rapido pelo PDV (D-04, D-05, PDV-15)", () => {
  it("Teste 1: normalizarNomeCliente colapsa espacos internos e converte para caixa alta pt-BR", () => {
    expect(normalizarNomeCliente("  ana   maria  ")).toBe("ANA MARIA");
  });

  it("Teste 2: normalizarNomeCliente nunca lanca excecao — null/undefined viram string vazia", () => {
    expect(normalizarNomeCliente(null)).toBe("");
    expect(normalizarNomeCliente(undefined)).toBe("");
    expect(normalizarNomeCliente("   ")).toBe("");
  });

  it("Teste 3: montarPayloadClienteRapido recusa nome vazio com mensagem legivel", () => {
    const resultado = montarPayloadClienteRapido({ nome: "   " });
    expect(resultado.ok).toBe(false);
    if (!resultado.ok) {
      expect(resultado.erro).toBe("Informe o nome do cliente.");
    }
  });

  it("Teste 4: montarPayloadClienteRapido normaliza campos opcionais em branco para null", () => {
    const resultado = montarPayloadClienteRapido({ nome: "Joao", telefone: "  ", cpf: "" });
    expect(resultado.ok).toBe(true);
    if (resultado.ok) {
      expect(resultado.dados.telefone).toBeNull();
      expect(resultado.dados.cpf).toBeNull();
    }
  });

  it("Teste 5: montarPayloadClienteRapido aceita empresaParceiraId numerico ou string numerica, e recusa zero/negativo/invalido", () => {
    const numerico = montarPayloadClienteRapido({ nome: "A", empresaParceiraId: 3 });
    const textoNumerico = montarPayloadClienteRapido({ nome: "B", empresaParceiraId: "5" });
    const zero = montarPayloadClienteRapido({ nome: "C", empresaParceiraId: 0 });
    const negativo = montarPayloadClienteRapido({ nome: "D", empresaParceiraId: -1 });
    const invalido = montarPayloadClienteRapido({ nome: "E", empresaParceiraId: "abc" });
    const ausente = montarPayloadClienteRapido({ nome: "F" });

    expect(numerico.ok && numerico.dados.empresaParceiraId).toBe(3);
    expect(textoNumerico.ok && textoNumerico.dados.empresaParceiraId).toBe(5);
    expect(zero.ok && zero.dados.empresaParceiraId).toBeNull();
    expect(negativo.ok && negativo.dados.empresaParceiraId).toBeNull();
    expect(invalido.ok && invalido.dados.empresaParceiraId).toBeNull();
    expect(ausente.ok && ausente.dados.empresaParceiraId).toBeNull();
  });

  it("Teste 6: mensagemClienteDuplicado cita o nome informado, sem vazar detalhes tecnicos", () => {
    const mensagem = mensagemClienteDuplicado("JOAO SILVA");
    expect(mensagem).toContain("JOAO SILVA");
    expect(mensagem.toUpperCase()).not.toContain("P2002");
  });

  it("Teste 7: deveConsultarSimilares so libera a partir de 3 caracteres uteis (D-05)", () => {
    expect(deveConsultarSimilares("an")).toBe(false);
    expect(deveConsultarSimilares("ana")).toBe(true);
    expect(deveConsultarSimilares("   ")).toBe(false);
    expect(deveConsultarSimilares(null)).toBe(false);
    expect(deveConsultarSimilares(undefined)).toBe(false);
  });
});
