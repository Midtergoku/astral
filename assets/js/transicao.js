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

/* ── LUZ QUE SEGUE O MOUSE NOS CARTOES ──────────────────────────────────────
   O brilho fica onde o mouse esta, em vez de acender o cartao inteiro. E a
   diferenca entre "mudou de cor" e "tem volume".

   Escrito com cuidado de desempenho, porque mousemove dispara MUITO:
   - so em aparelho com mouse de verdade (celular nem registra o evento)
   - so enquanto o mouse esta DENTRO do cartao
   - a escrita e agendada para o proximo quadro, nunca no meio do movimento
   - mexe em duas variaveis do proprio elemento, nao do pai: variavel no pai
     obrigaria o navegador a recalcular todos os filhos

   Sem JS, o cartao continua funcionando -- so nao tem a luz. */
(function luzNosCartoes() {
  if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const alvos = document.querySelectorAll('.card, .stat-card, .materia-card');
  alvos.forEach((el) => {
    el.setAttribute('data-luz', '');
    let agendado = false, x = 0, y = 0;

    el.addEventListener('mousemove', (e) => {
      const r = el.getBoundingClientRect();
      x = e.clientX - r.left;
      y = e.clientY - r.top;
      if (agendado) return;
      agendado = true;
      requestAnimationFrame(() => {
        el.style.setProperty('--mx', x + 'px');
        el.style.setProperty('--my', y + 'px');
        agendado = false;
      });
    });
  });
})();

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
