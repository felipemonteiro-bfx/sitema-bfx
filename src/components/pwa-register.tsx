'use client';

import { useEffect } from 'react';

/**
 * Registra o service worker e garante que uma versao nova do app assuma sozinha.
 *
 * O registro sozinho nao bastava: o navegador so busca o /sw.js novo em alguns
 * momentos, entao depois de um deploy a aba aberta continuava com o JS antigo ate
 * alguem recarregar na mao ("deployei e nao atualizou").
 *
 * O recarregamento e adiado de proposito. Este componente vive no layout raiz, ou
 * seja, esta em toda tela — inclusive na venda rapida, onde um vendedor pode estar
 * no meio de um formulario longo. Recarregar com a aba em foco apagaria o que ele
 * digitou, sem aviso. Entao:
 *
 *  - ao voltar para a aba, pergunta ao navegador se ha versao nova (`update()`);
 *  - quando o SW novo assume, apenas MARCA que precisa recarregar;
 *  - o reload acontece quando a aba sai de foco — na proxima vez que a pessoa
 *    voltar, ja esta na versao nova, e nada do que ela digitou se perdeu.
 */
export function PWARegister() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    // Na primeira visita o SW assume sem que houvesse controller antes, e isso
    // tambem dispara `controllerchange` — recarregar ali daria um reload gratuito
    // logo no primeiro acesso.
    const jaTinhaControlador = Boolean(navigator.serviceWorker.controller);

    let precisaRecarregar = false;
    let recarregando = false;

    const marcarParaRecarregar = () => {
      if (!jaTinhaControlador) return;
      precisaRecarregar = true;
    };

    const aoTrocarVisibilidade = () => {
      if (document.visibilityState === 'visible') {
        // Momento em que a pessoa volta para olhar os numeros: checa se ha deploy novo.
        navigator.serviceWorker.getRegistration().then((reg) => reg?.update()).catch(() => {});
        return;
      }
      // Aba saiu de foco: hora segura de trocar de versao.
      if (precisaRecarregar && !recarregando) {
        recarregando = true;
        window.location.reload();
      }
    };

    navigator.serviceWorker.addEventListener('controllerchange', marcarParaRecarregar);
    document.addEventListener('visibilitychange', aoTrocarVisibilidade);

    navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch(() => {});

    return () => {
      navigator.serviceWorker.removeEventListener('controllerchange', marcarParaRecarregar);
      document.removeEventListener('visibilitychange', aoTrocarVisibilidade);
    };
  }, []);

  return null;
}
