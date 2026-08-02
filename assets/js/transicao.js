/* Transicao entre paginas.
   O CSS correspondente esta em assets/css/base.css (@view-transition).

   POR QUE MUDOU, em 02/08/2026 -- o motivo importa:
   A versao antiga interceptava TODO clique, punha a classe .saindo, esperava
   230ms e so entao navegava. Isso era ATRASO seguido de CORTE: a pessoa
   clicava, ficava 230ms olhando nada acontecer, e ai o navegador descarregava
   a pagina inteira e montava a nova do zero, com piscada no meio.
   O Lucas descreveu isso tres vezes como "seco". Encurtar o atraso nao
   resolvia, porque o corte estava DEPOIS dele.

   Agora quem faz a transicao e a View Transitions API do proprio navegador:
   ela fotografa a pagina velha, carrega a nova por baixo e faz a passagem.
   A barra lateral nem se mexe -- ela leva view-transition-name e o navegador
   entende que e o MESMO elemento nas duas paginas. Sem atraso, sem piscada.

   O interceptador antigo so roda em navegador que nao suporta. Ali um fade
   curto ainda e melhor que corte cru. */

const suportaViewTransition =
  'startViewTransition' in document &&
  CSS.supports('view-transition-name: none');

if (!suportaViewTransition) {
  document.querySelectorAll('a[href]').forEach((link) => {
    const href = link.getAttribute('href');
    if (!href || href.startsWith('#') || href.startsWith('http') ||
        href.startsWith('mailto') || href.startsWith('javascript')) return;

    link.addEventListener('click', function (e) {
      // nao sequestrar quem quer abrir em outra aba
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
      e.preventDefault();
      document.body.classList.add('saindo');
      setTimeout(() => { window.location.href = href; }, 150);
    });
  });
}
