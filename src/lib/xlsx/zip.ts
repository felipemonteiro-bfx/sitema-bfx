/**
 * Zip mínimo para o .xlsx (2026-09-11): o projeto não tem biblioteca de
 * planilha e o `npm install` não roda aqui. Compressão com o `zlib` do Node
 * (deflate) e CRC-32 à mão. Sem zip64: a planilha de controle inteira fica na
 * casa das centenas de KB.
 */
import { deflateRawSync } from "node:zlib";

const TABELA_CRC = (() => {
  const tabela = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    tabela[n] = c >>> 0;
  }
  return tabela;
})();

export function crc32(dados: Uint8Array): number {
  let c = 0xffffffff;
  for (let i = 0; i < dados.length; i++) c = TABELA_CRC[(c ^ dados[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

export interface ArquivoZip {
  nome: string;
  dados: Uint8Array | string;
}

// Data fixa (01/01/2026 00:00, formato DOS): o mesmo conteúdo gera o mesmo arquivo.
const HORA_DOS = 0;
const DATA_DOS = ((2026 - 1980) << 9) | (1 << 5) | 1;
const UTF8 = 0x0800;
const DEFLATE = 8;

export function criarZip(arquivos: ArquivoZip[]): Uint8Array<ArrayBuffer> {
  const partes: Buffer[] = [];
  const central: Buffer[] = [];
  let deslocamento = 0;

  for (const arquivo of arquivos) {
    const nome = Buffer.from(arquivo.nome, "utf8");
    const dados = typeof arquivo.dados === "string" ? Buffer.from(arquivo.dados, "utf8") : Buffer.from(arquivo.dados);
    const comprimido = deflateRawSync(dados);
    const crc = crc32(dados);

    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(UTF8, 6);
    local.writeUInt16LE(DEFLATE, 8);
    local.writeUInt16LE(HORA_DOS, 10);
    local.writeUInt16LE(DATA_DOS, 12);
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(comprimido.length, 18);
    local.writeUInt32LE(dados.length, 22);
    local.writeUInt16LE(nome.length, 26);
    partes.push(local, nome, comprimido);

    const entrada = Buffer.alloc(46);
    entrada.writeUInt32LE(0x02014b50, 0);
    entrada.writeUInt16LE(20, 4);
    entrada.writeUInt16LE(20, 6);
    entrada.writeUInt16LE(UTF8, 8);
    entrada.writeUInt16LE(DEFLATE, 10);
    entrada.writeUInt16LE(HORA_DOS, 12);
    entrada.writeUInt16LE(DATA_DOS, 14);
    entrada.writeUInt32LE(crc, 16);
    entrada.writeUInt32LE(comprimido.length, 20);
    entrada.writeUInt32LE(dados.length, 24);
    entrada.writeUInt16LE(nome.length, 28);
    entrada.writeUInt32LE(deslocamento, 42);
    central.push(entrada, nome);

    deslocamento += local.length + nome.length + comprimido.length;
  }

  const tamanhoCentral = central.reduce((soma, b) => soma + b.length, 0);
  const fim = Buffer.alloc(22);
  fim.writeUInt32LE(0x06054b50, 0);
  fim.writeUInt16LE(arquivos.length, 8);
  fim.writeUInt16LE(arquivos.length, 10);
  fim.writeUInt32LE(tamanhoCentral, 12);
  fim.writeUInt32LE(deslocamento, 16);

  const tudo = Buffer.concat([...partes, ...central, fim]);
  const saida = new Uint8Array(tudo.length);
  saida.set(tudo);
  return saida;
}
