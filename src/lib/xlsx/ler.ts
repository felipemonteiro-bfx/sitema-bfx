import { inflateRawSync } from "node:zlib";
import { crc32 } from "./zip";

/** Lê um zip (xlsx) e devolve nome → texto UTF-8. */
export function lerZip(bytes: Uint8Array): Map<string, string> {
  return new Map([...lerZipBinario(bytes)].map(([nome, dados]) => [nome, dados.toString("utf8")]));
}

export function lerZipBinario(bytes: Uint8Array): Map<string, Buffer> {
  const b = Buffer.from(bytes);
  let fim = b.length - 22;
  while (fim >= 0 && b.readUInt32LE(fim) !== 0x06054b50) fim--;
  if (fim < 0) throw new Error("zip sem o registro de fim do diretório central");

  const total = b.readUInt16LE(fim + 10);
  let pos = b.readUInt32LE(fim + 16);
  const arquivos = new Map<string, Buffer>();
  for (let i = 0; i < total; i++) {
    if (b.readUInt32LE(pos) !== 0x02014b50) throw new Error("entrada inválida no diretório central");
    const metodo = b.readUInt16LE(pos + 10);
    const crc = b.readUInt32LE(pos + 16);
    const tamanho = b.readUInt32LE(pos + 20);
    const nomeLen = b.readUInt16LE(pos + 28);
    const extraLen = b.readUInt16LE(pos + 30);
    const comentarioLen = b.readUInt16LE(pos + 32);
    const local = b.readUInt32LE(pos + 42);
    const nome = b.toString("utf8", pos + 46, pos + 46 + nomeLen);

    if (b.readUInt32LE(local) !== 0x04034b50) throw new Error(`cabeçalho local inválido em ${nome}`);
    const inicio = local + 30 + b.readUInt16LE(local + 26) + b.readUInt16LE(local + 28);
    const bruto = b.subarray(inicio, inicio + tamanho);
    const dados = metodo === 8 ? inflateRawSync(bruto) : bruto;
    if (crc32(dados) !== crc) throw new Error(`CRC-32 não bate em ${nome}`);

    arquivos.set(nome, Buffer.from(dados));
    pos += 46 + nomeLen + extraLen + comentarioLen;
  }
  return arquivos;
}
