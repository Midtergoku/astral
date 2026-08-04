/* ═══════════════════════════════════════════════════════════════════════════
   CEDO — o clique que chegou antes do JavaScript não se perde.

   O PROBLEMA REAL (achado em 04/08/2026 na tabela erros_cliente)
   O botao "Entrar com Google" do login.html chamava onclick="loginGoogle()".
   A funcao nasce dentro de um <script type="module"> -- e modulo o navegador
   SEMPRE adia. Entre a pagina aparecer e o modulo rodar existe uma janela em
   que o botao ja esta na tela, ja parece clicavel, e a funcao ainda nao existe.

   Quem clicava ali recebia "loginGoogle is not defined" e o botao NAO FAZIA
   NADA. Aconteceu 4 vezes com usuarios reais, no botao por onde entram 6 dos 8
   usuarios do Astral. O silencio e o que torna isso grave: nao quebra a tela,
   nao mostra erro -- so nao funciona, e a pessoa acha que o site esta ruim.

   Medido em seguida: o mesmo defeito existia em 39 lugares, em 11 paginas.

   POR QUE ESTA PECA EM VEZ DE 39 CONSERTOS
   Consertar cada botao a mao seria 39 edicoes com argumentos diferentes em 11
   arquivos -- muita superficie para errar, e nada impediria o 40o de nascer
   torto amanha. Isto aqui resolve a classe inteira, num arquivo, e continua
   valendo para o botao que ainda nao foi escrito.

   COMO FUNCIONA
   1. escuta o clique na fase de captura, ANTES de o navegador tentar executar
      o onclick (que e o que estouraria o erro)
   2. se a funcao chamada ainda nao existe, segura o clique
   3. espera a funcao aparecer -- ate 3 segundos
   4. quando aparece, refaz o clique de verdade

   Para a pessoa, o botao simplesmente demora um instante em vez de falhar.

   ⚠️ Este arquivo NAO pode ser type="module": ele precisa rodar ANTES dos
      modulos, que e exatamente o problema que ele existe para cobrir.
   ═══════════════════════════════════════════════════════════════════════════ */

(function () {
  'use strict';

  var LIMITE_MS = 3000;   // desistir e deixar o clique seguir o caminho normal
  var PASSO_MS  = 25;

  var EVENTOS = ['click', 'change', 'submit'];

  /* Le o nome da funcao que o atributo chama: onclick="loginGoogle()" -> loginGoogle */
  function funcaoChamada(el, tipo) {
    var attr = el.getAttribute && el.getAttribute('on' + tipo);
    if (!attr) return null;
    var m = attr.match(/^\s*([A-Za-z_$][\w$]*)\s*\(/);
    return m ? m[1] : null;
  }

  function jaExiste(nome) {
    return typeof window[nome] === 'function';
  }

  function segurar(tipo) {
    document.addEventListener(tipo, function (e) {
      var alvo = e.target;
      if (!alvo || !alvo.closest) return;

      var el = alvo.closest('[on' + tipo + ']');
      if (!el) return;

      var nome = funcaoChamada(el, tipo);
      if (!nome || jaExiste(nome)) return;   // caminho normal, nao mexer

      /* A funcao ainda nao existe: este clique morreria em silencio. */
      e.preventDefault();
      e.stopImmediatePropagation();

      el.setAttribute('data-aguardando-js', '');

      var gasto = 0;
      var relogio = setInterval(function () {
        gasto += PASSO_MS;

        if (jaExiste(nome)) {
          clearInterval(relogio);
          el.removeAttribute('data-aguardando-js');
          /* Refaz o clique agora que da. Para 'click' o proprio .click() do
             elemento resolve; para os outros, dispara o evento equivalente. */
          if (tipo === 'click' && typeof el.click === 'function') el.click();
          else el.dispatchEvent(new Event(tipo, { bubbles: true, cancelable: true }));
          return;
        }

        if (gasto >= LIMITE_MS) {
          clearInterval(relogio);
          el.removeAttribute('data-aguardando-js');
          /* Desistiu. Nao refazer o clique: se em 3s a funcao nao existe, algo
             esta quebrado de verdade e repetir so geraria o mesmo erro. Melhor
             deixar quieto do que fingir que funcionou. */
        }
      }, PASSO_MS);
    }, true);   // true = fase de captura, antes do onclick do proprio elemento
  }

  for (var i = 0; i < EVENTOS.length; i++) segurar(EVENTOS[i]);
})();
