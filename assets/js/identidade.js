/* ═══════════════════════════════════════════════════════════════════════════
   IDENTIDADE — quem esta logado, escrito na tela ANTES da primeira pintura.

   POR QUE ESTE ARQUIVO EXISTE (03/08/2026)
   O Lucas viu: "clico em cronograma e o simbolo da minha foto fica com
   interrogacao". Nao era impressao. O "?" estava escrito no HTML das 11
   paginas como espaco reservado, e ficava na tela ate o JavaScript trocar.
   MEDIDO: o "?" aparecia na PRIMEIRA pintura e so virava "L" 13ms depois --
   e isso num servidor local. Na rede de verdade e bem mais.

   A causa e de estrutura, nao de estilo: `divisa.js` e um modulo, e modulo e
   sempre adiado (`defer`). Ele so roda DEPOIS que a pagina foi desenhada.
   Entao qualquer coisa escrita no HTML aparece antes, inclusive um "?" errado.

   ESTE arquivo e script classico, colocado logo abaixo dos elementos. Ele roda
   na hora, no meio da montagem da pagina, antes de pintar. E nao precisa de
   rede: o nome ja esta no navegador, dentro da sessao do Supabase.

   ⚠️ FONTE UNICA DO NOME -- e a razao de ser tao explicito aqui.
   Em 02/08/2026 mediu-se que as 10 paginas resolviam o nome de CINCO jeitos
   diferentes, e uma delas trazia o bug do "Luca" que custou tres dias. Este
   arquivo passou a ser o unico lugar que decide "qual e o primeiro nome".
   `divisa.js` chama a funcao daqui em vez de ter a sua propria. Se algum dia
   voce precisar do primeiro nome noutro lugar: chame `Astral.primeiroNome`,
   nao escreva um `split` novo.
   ═══════════════════════════════════════════════════════════════════════════ */

(function () {
  'use strict';

  var REF = 'jjogmcacbdefwiwcyjxp';   // o projeto no Supabase

  /* 🔴 A BARRA INVERTIDA ABAIXO E O BUG DE TRES DIAS.
     Estava /s+/ -- a LETRA "s" -- onde tinha de ser /\s+/ -- ESPACO.
     "Lucas".split(/s+/)[0] devolve "Luca". Alessandra vira "Ale".
     Nunca escrever esta linha por `node -e` no shell: o bash come a barra. */
  function primeiroNome(completo) {
    return String(completo == null ? '' : completo).trim().split(/\s+/)[0] || '';
  }

  /* A cadeia de nome, num lugar so. O que o usuario preencheu vale mais que
     o e-mail; o e-mail vale mais que nada. "Concurseiro" e o ultimo recurso e
     e proposital: melhor um tratamento generico que um espaco vazio. */
  function nomeDoUsuario(u) {
    if (!u) return '';
    var meta = u.user_metadata || {};
    if (meta.full_name) return meta.full_name;
    if (meta.name) return meta.name;
    if (u.email) return String(u.email).split('@')[0];
    return 'Concurseiro';
  }

  /* Le a sessao direto do localStorage, SEM esperar o supabase-js carregar.
     E o mesmo dado que ele leria -- so que agora, e nao daqui a 300ms.

     Tolerante de proposito: se o formato mudar numa versao futura da
     biblioteca, isto devolve null e a pagina simplesmente volta a se comportar
     como antes (o divisa.js preenche depois). Nunca pode estourar. */
  function sessaoGuardada() {
    try {
      var bruto = localStorage.getItem('sb-' + REF + '-auth-token');

      // versoes recentes quebram a sessao em pedacos quando ela e grande
      if (!bruto) {
        var pedacos = [], i = 0, p;
        while ((p = localStorage.getItem('sb-' + REF + '-auth-token.' + i)) !== null) {
          pedacos.push(p); i++;
        }
        if (!pedacos.length) return null;
        bruto = pedacos.join('');
      }

      // algumas versoes guardam com prefixo "base64-"
      if (bruto.indexOf('base64-') === 0) {
        bruto = decodeURIComponent(escape(atob(bruto.slice(7))));
      }

      var s = JSON.parse(bruto);
      return (s && s.user) ? s.user : null;
    } catch (e) {
      return null;
    }
  }

  function saudacaoDaHora() {
    var h = new Date().getHours();
    return h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite';
  }

  /* Escreve na tela. Aceita o usuario de qualquer origem -- do localStorage
     (agora) ou da sessao confirmada pelo supabase-js (depois). Idempotente:
     chamar duas vezes com o mesmo valor nao muda nada. */
  function aplicar(u) {
    var nome = primeiroNome(nomeDoUsuario(u));
    if (!nome) return false;

    var elNome = document.getElementById('user-name');
    if (elNome && elNome.textContent !== nome) elNome.textContent = nome;

    var elAvatar = document.getElementById('user-avatar');
    if (elAvatar) {
      var letra = nome.charAt(0).toUpperCase();
      if (elAvatar.textContent !== letra) elAvatar.textContent = letra;
      elAvatar.removeAttribute('data-esperando');
    }

    var elOi = document.getElementById('greeting');
    if (elOi) {
      var texto = saudacaoDaHora() + ', ' + nome + '.';
      if (elOi.textContent !== texto) elOi.textContent = texto;
      elOi.removeAttribute('data-esperando');
    }
    return true;
  }

  /* Exposto para o divisa.js -- que roda depois, com a sessao ja confirmada
     pelo servidor -- reaproveitar a MESMA logica em vez de ter a sua. */
  window.Astral = window.Astral || {};
  window.Astral.primeiroNome = primeiroNome;
  window.Astral.nomeDoUsuario = nomeDoUsuario;
  window.Astral.aplicarIdentidade = aplicar;

  /* Tentativa 1: agora, no meio da montagem da pagina. Pega o avatar e o nome,
     que ficam na barra lateral, acima deste script. */
  var u = sessaoGuardada();
  if (u) aplicar(u);

  /* Tentativa 2: o que ainda nao existe quando este script roda.
     A saudacao do dashboard mora la embaixo, no conteudo -- quando a linha
     acima executa, ela ainda nem foi lida pelo navegador.

     Esperar o DOMContentLoaded funcionaria, mas MEDIDO: ele chegou 2ms DEPOIS
     da primeira pintura, e o objetivo aqui e justamente nao perder a pintura.
     Um observador pega o elemento no instante em que ele nasce, ainda durante
     a montagem da pagina.

     Ele se desliga sozinho de tres jeitos, para nao ficar vigiando a toa numa
     tela que a pessoa vai usar por meia hora. */
  if (u) {
    var achouTudo = function () {
      return !document.querySelector('[data-esperando]');
    };

    if (!achouTudo() && typeof MutationObserver === 'function') {
      var vigia = new MutationObserver(function () {
        aplicar(u);
        if (achouTudo()) vigia.disconnect();
      });
      vigia.observe(document.documentElement, { childList: true, subtree: true });

      // rede de seguranca: pagina montada, ou 5s -- o que vier primeiro
      document.addEventListener('DOMContentLoaded', function () {
        aplicar(u);
        if (achouTudo()) vigia.disconnect();
      });
      setTimeout(function () { vigia.disconnect(); }, 5000);
    } else if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', function () { aplicar(u); });
    }
  }
})();
