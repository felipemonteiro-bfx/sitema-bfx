import type { CSSProperties } from "react";
import { LayoutGrid } from "lucide-react";

// Painel de marca da tela de login.
//
// PURAMENTE DECORATIVO. A página de login é pública, então este arquivo não
// importa nada de `@/lib/finance`, `@/lib/db` ou de qualquer módulo que leia
// dados: as alturas abaixo são fixas no código e não representam valor algum.
// Todo o painel é `aria-hidden` — leitor de tela vai direto ao formulário.

// Pares [topo verde, base hachurada] em px. Inventados de propósito, só para
// desenhar uma silhueta de crescimento; não correspondem a nenhum mês real.
const BARRAS: ReadonlyArray<readonly [number, number]> = [
  [8, 22],
  [22, 46],
  [38, 74],
  [60, 56],
  [30, 40],
  [14, 18],
];

export function LoginPainelMarca() {
  return (
    <section
      data-painel-marca="true"
      aria-hidden="true"
      className="flex min-h-0 flex-[1_1_32.5rem] flex-col justify-between gap-10 overflow-hidden rounded-shell bg-card p-6 sm:min-h-[22.5rem] sm:p-10 lg:p-12"
    >
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-controle bg-primary text-primary-foreground">
          <LayoutGrid className="h-5 w-5" />
        </div>
        <span className="font-display text-xl font-semibold text-card-foreground">BFX Manager</span>
      </div>

      <div className="flex flex-col gap-7">
        <h2 className="max-w-[14ch] font-display text-3xl font-semibold leading-hero tracking-tight text-card-foreground sm:text-4xl lg:text-5xl">
          Vendas, parcelas e antecipação num lugar só.
        </h2>

        <div className="max-w-lg rounded-painel bg-poco p-5">
          {/* Grade de pontos ao fundo; as colunas crescem de baixo para cima. */}
          <div className="flex h-36 items-end gap-3.5 bg-grade-pontos-fina">
            {BARRAS.map(([topo, base], i) => (
              <div
                key={i}
                className="flex flex-1 flex-col gap-0.75"
                style={{ "--i": i } as CSSProperties}
              >
                <span
                  className="anim-barra block h-(--h) rounded bg-primary"
                  style={{ "--h": topo } as CSSProperties}
                />
                <span
                  className="anim-barra block h-(--h) rounded bg-hachura"
                  style={{ "--h": base } as CSSProperties}
                />
              </div>
            ))}
          </div>
        </div>
      </div>

    </section>
  );
}
