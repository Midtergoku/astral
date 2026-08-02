/* ═══════════════════════════════════════════════════════════════════════════
   MOVIMENTO — substitui a biblioteca `motion@10.16.4` que vinha de CDN
   ═══════════════════════════════════════════════════════════════════════════
   Bloco V3 do design, 02/08/2026.

   POR QUE TIRAR A BIBLIOTECA:
   1. Ela vinha do jsdelivr a cada carregamento. Se aquele servidor cair ou
      demorar, a animacao nao roda -- e pior, o codigo da pagina QUEBRA. Medido
      com navegador de verdade: 9 das nossas paginas lancavam
      "Cannot destructure property 'animate' of 'window.Motion'" quando ela
      nao carregava.
   2. E superficie de supply chain: codigo de terceiro executando no site, com
      acesso a tudo. A auditoria de 29/07 ja tinha marcado isso como risco.
   3. Sao 30 KB baixados para fazer o que o navegador ja sabe fazer sozinho.

   O QUE ISTO E:
   Uma ponte de ~20 linhas sobre a Web Animations API, que e NATIVA e existe em
   todo navegador atual. Expoe `animate` e `stagger` com a MESMA assinatura da
   biblioteca -- entao as 8 paginas continuam chamando exatamente como antes e
   nenhuma linha delas precisou mudar.

   Anima em transform e opacity, que rodam fora da thread principal: nao perdem
   quadro enquanto a pagina ainda esta carregando, que era justamente quando a
   biblioteca engasgava.
   ═══════════════════════════════════════════════════════════════════════════ */

/* ⚠️ ESTE ARQUIVO E SCRIPT CLASSICO, NAO MODULO -- e isso e deliberado.
   As 8 paginas leem `window.Motion` de dentro de <script> comum. Modulo e
   sempre adiado ate o fim da analise do HTML, entao se este fosse modulo ele
   rodaria DEPOIS de quem o usa, e `window.Motion` estaria indefinido.
   Eu cometi exatamente esse erro na primeira tentativa e o teste pegou.
   Script classico roda na hora, na ordem em que aparece -- igual a biblioteca
   antiga fazia. */
(function () {

/* Escalona o inicio de cada elemento de uma lista.
   stagger(0.06) -> o 1o comeca em 0s, o 2o em 0.06s, o 3o em 0.12s...
   `start` empurra a fila inteira para frente. */
function stagger(intervalo = 0.05, { start = 0 } = {}) {
  return (i) => start + i * intervalo;
}

/* Mesma assinatura da biblioteca: animate(alvo, quadros, opcoes).
   `quadros` no formato { opacity: [0, 1], transform: ['translateY(24px)', 'none'] }
   `opcoes`  { duration (s), delay (s ou funcao), easing } */
/* Aceita as mesmas formas que a biblioteca antiga aceitava: elemento, lista de
   elementos, ou SELETOR EM TEXTO ('.card'). Faltou o texto na primeira versao
   e o teste acusou: "Failed to execute 'observe' on 'IntersectionObserver'",
   porque chegava uma string onde o navegador esperava um elemento.
   Filtra o que nao for elemento -- e melhor ignorar do que derrubar a pagina. */
function paraLista(alvo) {
  if (alvo == null) return [];
  if (typeof alvo === 'string') return Array.from(document.querySelectorAll(alvo));
  if (alvo instanceof Element) return [alvo];
  if (typeof alvo.length === 'number') return Array.from(alvo).filter((e) => e instanceof Element);
  return [];
}

function animate(alvo, quadros, opcoes = {}) {
  const lista = paraLista(alvo);
  if (!lista.length) return { finished: Promise.resolve() };

  // quem pediu menos movimento no aparelho recebe o resultado final direto
  const menos = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const { duration = 0.4, delay = 0, easing = 'cubic-bezier(.23,1,.32,1)' } = opcoes;

  const animacoes = lista.map((el, i) => {
    const atraso = typeof delay === 'function' ? delay(i) : delay;

    if (menos) {
      // aplica o estado final sem animar, para nada ficar invisivel
      for (const [prop, vals] of Object.entries(quadros)) {
        el.style[prop] = Array.isArray(vals) ? vals[vals.length - 1] : vals;
      }
      return null;
    }

    return el.animate(quadros, {
      duration: duration * 1000,
      delay: atraso * 1000,
      easing,
      fill: 'both',          // segura o estado final; sem isto o elemento volta a sumir
    });
  }).filter(Boolean);

  return {
    finished: Promise.all(animacoes.map((a) => a.finished)).catch(() => {}),
  };
}

/* `inView(alvo, callback)` -- dispara quando o elemento entra na tela.
   A biblioteca antiga tinha isto e a index usava; a primeira versao da minha
   ponte nao tinha, e o teste acusou "inView is not a function".
   O nativo para isso e o IntersectionObserver.

   Devolve uma funcao que cancela a observacao, igual a biblioteca fazia. */
function inView(alvo, callback, opcoes = {}) {
  const lista = paraLista(alvo);
  if (!lista.length || typeof IntersectionObserver === 'undefined') {
    lista.forEach((el) => callback(el));   // sem suporte: mostra tudo de uma vez
    return () => {};
  }

  const obs = new IntersectionObserver((entradas) => {
    entradas.forEach((e) => {
      if (!e.isIntersecting) return;
      const sair = callback(e.target);
      // a biblioteca permitia devolver uma funcao de "saiu da tela"; aqui, se
      // nada for devolvido, a observacao encerra -- anima uma vez e pronto
      if (typeof sair !== 'function') obs.unobserve(e.target);
    });
  }, { rootMargin: opcoes.margin || '0px', threshold: opcoes.amount ?? 0.1 });

  lista.forEach((el) => obs.observe(el));
  return () => obs.disconnect();
}

/* A biblioteca antiga era lida como `window.Motion`. Publicar com o mesmo nome
   e a mesma assinatura e o que permitiu trocar a dependencia inteira sem
   editar uma unica linha das 8 paginas. */
window.Motion = { animate, stagger, inView };

})();
