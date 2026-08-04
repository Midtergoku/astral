/* ═══════════════════════════════════════════════════════════════════════════
   TROCA DE PAGINA
   ═══════════════════════════════════════════════════════════════════════════
   O CSS correspondente esta em assets/css/base.css.

   POR QUE ESTA VERSAO EXISTE (02/08/2026) -- e vale ler antes de mexer:

   Tentei DUAS VEZES resolver isto com a View Transitions API, que e a solucao
   moderna e elegante. Ela dispara nos meus testes: pageswap e pagereveal
   confirmam "COM transicao". Mesmo assim o Lucas viu corte seco em tres
   rodadas seguidas.

   Nao interessa de quem e a razao tecnica. O que vale e o que ele ve.

   Entao a estrategia mudou: o desvanecer e feito AQUI, por JS, onde eu
   consigo fotografar quadro a quadro e provar que acontece. A API ficou
   desligada no CSS para nao brigar -- duas coisas animando a mesma troca foi
   exatamente o defeito das rodadas anteriores.

   Confiabilidade acima de elegancia.

   ⚠️ SE ALGUEM REATIVAR a View Transitions no base.css, TEM de remover este
   interceptador junto. As duas ao mesmo tempo voltam a brigar.

   COMO FUNCIONA:
   1. clique num link interno -> segura a navegacao
   2. classe no body -> o CSS desliza e apaga o miolo (260ms)
   3. terminada a animacao, navega de verdade
   4. a pagina nova entra com a animacao de chegada, direto do CSS

   O passo 3 espera o EVENTO de fim da animacao, nao um cronometro. Cronometro
   descasa do CSS na primeira vez que alguem mudar a duracao -- e a duracao ja
   mudou quatro vezes esta semana. Ha um limite de seguranca caso o evento nao
   venha (aba em segundo plano suspende animacao).
   ═══════════════════════════════════════════════════════════════════════════ */

const SAIDA_MAX = 700;   // rede de seguranca: nunca prender a navegacao

function interno(href) {
  return href && !href.startsWith('#') && !href.startsWith('http')
      && !href.startsWith('mailto') && !href.startsWith('tel')
      && !href.startsWith('javascript');
}

/* ── BUSCAR ANTES DO CLIQUE (03/08/2026) ────────────────────────────────────
   O Lucas reclamou que trocar de menu demora. A animacao de saida de 260ms
   e deliberada -- ele PEDIU tempo de ver -- entao ela nao foi cortada. O que
   mudou foi o que acontece DURANTE esses 260ms: antes, tempo morto; agora, o
   navegador ja esta baixando a proxima pagina.

   O gatilho e o mouse encostar no link. Entre encostar e clicar passam uns
   200-300ms de gente comum, e nesse intervalo a pagina (24 KB) ja chegou.
   Somado a animacao, a troca vira instantanea sem tirar o movimento.

   Cada endereco e buscado UMA vez -- passar o mouse dez vezes no mesmo menu
   nao gera dez pedidos. E `prefetch` tem prioridade baixa no navegador: nao
   rouba banda de nada que a pagina atual ainda precise. */
const jaBuscados = new Set();

function buscarAntes(href) {
  if (!interno(href) || jaBuscados.has(href)) return;
  jaBuscados.add(href);
  const l = document.createElement('link');
  l.rel = 'prefetch';
  l.href = href;
  l.as = 'document';
  document.head.appendChild(l);
}

function ligarBuscaAntecipada() {
  // Conexao limitada ou modo de economia: nao gastar dados da pessoa.
  const c = navigator.connection;
  if (c && (c.saveData || /2g/.test(c.effectiveType || ''))) return;

  const aoChegarPerto = (e) => {
    const link = e.target.closest && e.target.closest('a[href]');
    if (link) buscarAntes(link.getAttribute('href'));
  };
  document.addEventListener('mouseover', aoChegarPerto, { passive: true });
  document.addEventListener('focusin', aoChegarPerto, { passive: true });
  // no celular nao ha mouse: o toque comeca antes de o dedo sair
  document.addEventListener('touchstart', aoChegarPerto, { passive: true });
}

function ligarTransicao() {
  ligarBuscaAntecipada();   // vale mesmo para quem desligou animacao
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  document.addEventListener('click', (e) => {
    const link = e.target.closest && e.target.closest('a[href]');
    if (!link) return;

    const href = link.getAttribute('href');
    if (!interno(href)) return;
    if (link.target && link.target !== '_self') return;
    if (link.hasAttribute('download')) return;
    // deixa passar quem quer abrir em outra aba
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;

    const miolo = document.querySelector('.main');
    if (!miolo) return;                      // sem miolo nao ha o que animar

    e.preventDefault();
    document.body.classList.add('astral-saindo');

    let foi = false;
    const ir = () => { if (foi) return; foi = true; window.location.href = href; };

    miolo.addEventListener('animationend', ir, { once: true });
    setTimeout(ir, SAIDA_MAX);
  }, true);
}

/* Voltar pelo botao do navegador pode devolver a pagina do cache com a classe
   de saida ainda posta -- e ai o miolo fica invisivel. Limpar no pageshow
   evita a tela em branco no "voltar". */
window.addEventListener('pageshow', () => {
  document.body.classList.remove('astral-saindo');
});

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', ligarTransicao);
} else {
  ligarTransicao();
}
