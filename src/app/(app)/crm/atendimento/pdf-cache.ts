/** Cache LRU mínimo (Map preserva a ordem de inserção): `get` renova, `set` acima do máximo remove o mais antigo. */
export function criarCacheLru<V>(max: number, aoRemover: (valor: V) => void) {
  const mapa = new Map<string, V>();
  return {
    get(chave: string): V | undefined {
      const v = mapa.get(chave);
      if (v === undefined) return undefined;
      mapa.delete(chave); mapa.set(chave, v);
      return v;
    },
    set(chave: string, valor: V): void {
      mapa.delete(chave); mapa.set(chave, valor);
      while (mapa.size > max) {
        const antigo = mapa.keys().next().value as string;
        const v = mapa.get(antigo) as V;
        mapa.delete(antigo);
        aoRemover(v);
      }
    },
    delete(chave: string): void { mapa.delete(chave); },
    tamanho(): number { return mapa.size; },
  };
}

/**
 * Cache com contagem de referências: quem usa o documento `adquire` e `solta` ao terminar.
 * Só documento sem nenhuma referência pode ser destruído; os ociosos formam um LRU de `max`,
 * os em uso ficam fora da conta do limite (destruí-los quebraria a bolha ou o visualizador aberto).
 */
export function criarCacheComReferencias<V>(max: number, destruir: (valor: V) => void) {
  type Entrada = { valor: V; refs: number };
  const emUso = new Map<string, Entrada>();
  const ociosos = criarCacheLru<Entrada>(max, e => destruir(e.valor));
  return {
    adquirir(chave: string, criar: () => V): { valor: V; soltar: () => void } {
      let e = emUso.get(chave);
      if (!e) {
        e = ociosos.get(chave);
        if (e) ociosos.delete(chave); else e = { valor: criar(), refs: 0 };
        emUso.set(chave, e);
      }
      const entrada = e;
      entrada.refs++;
      let solto = false;
      return {
        valor: entrada.valor,
        soltar() {
          if (solto) return;
          solto = true;
          entrada.refs--;
          if (entrada.refs > 0 || emUso.get(chave) !== entrada) return;
          emUso.delete(chave);
          ociosos.set(chave, entrada);
        },
      };
    },
    /** Falha ao criar: o documento sai do cache sem ser destruído (não chegou a existir). */
    descartar(chave: string): void { emUso.delete(chave); ociosos.delete(chave); },
  };
}
