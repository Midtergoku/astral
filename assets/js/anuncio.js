/* ═══════════════════════════════════════════════════════════════════════════
   O INSTANTE DA DESCOBERTA  (R8)

   O problema, medido: hoje a condecoracao cai em SILENCIO. A pessoa so
   descobre se por acaso abrir a pagina de conquistas -- e pode levar semanas.

   Isso mata justamente o que o Lucas descreveu em 01/08, defendendo as
   conquistas secretas contra mim:

     "ela foi feita pra ser secreta, então só vou descobrir ela por acaso,
      então vai ser um pico de dopamina sim. 'Oh meu Deus, descobri uma!'"

   O pico mora no INSTANTE, nao na lista. Uma medalha encontrada tres semanas
   depois, numa tabela, e uma linha de tabela.

   ── COMO SE SABE QUE E NOVA, SE NADA E GRAVADO ─────────────────────────────
   As condecoracoes sao funcao pura dos fatos (ver `condecoracoes.js`): nao ha
   "conquistado em". Entao "nova" aqui NAO significa "recem-conquistada" --
   significa "ainda nao te MOSTREI esta".

   E uma pergunta de interface, nao de verdade sobre o mundo, e por isso a
   resposta mora no navegador: `astral_vistas_<uid>` no localStorage.

   🔴 A ARMADILHA, e ela e obvia depois de escrita: num aparelho novo o
   conjunto esta vazio, e alguem com 30 medalhas levaria 30 anuncios seguidos
   na cara. Por isso a PRIMEIRA carga em cada aparelho SEMEIA em silencio --
   grava tudo como visto e nao anuncia nada. So o que cair depois disso
   aparece.

   O preco honesto: quem ganha a medalha no celular e depois abre o computador
   ve o anuncio de novo. E repeticao, nao invencao -- e melhor que o contrario,
   que seria a pessoa nunca ver.
*/

const CHAVE = (uid) => `astral_vistas_${uid}`;

/* localStorage falha em aba anonima com cookies bloqueados. Nenhuma das duas
   funcoes abaixo pode derrubar a pagina por causa disso: sem memoria, o pior
   que acontece e nao anunciar. */
function lerVistas(uid) {
  try {
    const cru = localStorage.getItem(CHAVE(uid));
    return cru ? new Set(JSON.parse(cru)) : null;   // null = nunca semeado
  } catch { return null; }
}

function gravarVistas(uid, conjunto) {
  try { localStorage.setItem(CHAVE(uid), JSON.stringify([...conjunto])); }
  catch { /* sem memoria: anuncia de novo na proxima. Nao quebra nada. */ }
}

// ── O CSS, injetado uma vez ────────────────────────────────────────────────
// Primeiro filho do <head>, mesmo padrao do toast() em astral.js: assim o CSS
// da pagina vem depois e vence em caso de empate, e nenhuma pagina quebra.
function garantirEstilo() {
  if (document.getElementById('estilo-anuncio')) return;
  const css = document.createElement('style');
  css.id = 'estilo-anuncio';
  css.textContent = `
    .anuncio-medalha {
      position: fixed; left: 50%; top: 22%;
      transform: translate(-50%, -12px);
      z-index: 400;
      min-width: 17rem; max-width: min(92vw, 25rem);
      background: var(--casco-2, #1E2B39);
      border: 1px solid var(--linha, #2A3947);
      border-top: 3px solid var(--metal, var(--latao, #C08A2E));
      border-radius: var(--r-g, 6px);
      padding: 1.1rem 1.25rem 1rem;
      text-align: center;
      box-shadow: 0 24px 60px -24px rgba(0,0,0,.85);
      opacity: 0;
      animation: anuncioEntra 320ms cubic-bezier(.16,.84,.44,1) forwards,
                 anuncioSai 260ms ease 3.4s forwards;
    }
    .anuncio-rotulo {
      font-family: var(--dado, monospace); font-size: .62rem;
      letter-spacing: .18em; text-transform: uppercase;
      color: var(--metal, var(--latao-c, #E0AE55)); margin-bottom: .45rem;
    }
    .anuncio-nome {
      font-family: var(--display, sans-serif); font-weight: 800;
      font-size: 1.15rem; color: var(--texto, #DDE4EA); line-height: 1.15;
      margin-bottom: .3rem;
    }
    .anuncio-desc {
      font-size: .8rem; color: var(--texto-2, #8FA0AE); line-height: 1.4;
    }
    .anuncio-divisa {
      margin-top: .7rem; padding-top: .7rem;
      border-top: 1px solid var(--linha, #2A3947);
      font-family: var(--dado, monospace); font-size: .7rem;
      letter-spacing: .1em; text-transform: uppercase;
      color: var(--texto-3, #5F7183);
    }
    .anuncio-divisa b { color: var(--latao-c, #E0AE55); font-weight: 700; }

    @keyframes anuncioEntra {
      from { opacity: 0; transform: translate(-50%, -12px); }
      to   { opacity: 1; transform: translate(-50%, 0); }
    }
    @keyframes anuncioSai {
      to { opacity: 0; transform: translate(-50%, -8px); }
    }

    .anuncio-confete {
      position: fixed; z-index: 399; pointer-events: none; top: -12px;
      animation: anuncioCai var(--t, 2s) ease-in forwards;
    }
    @keyframes anuncioCai {
      to { transform: translateY(105vh) rotate(540deg); opacity: 0; }
    }

    /* Quem pediu menos movimento recebe o anúncio, não a chuva. A informação
       é a mesma; o que muda é o espetáculo. */
    @media (prefers-reduced-motion: reduce) {
      .anuncio-medalha { animation: none; opacity: 1; transform: translate(-50%, 0); }
      .anuncio-confete { display: none; }
    }
  `;
  document.head.insertBefore(css, document.head.firstChild);
}

function chuvaDeConfete(cor) {
  if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
  const cores = [cor, 'var(--latao-c)', 'var(--oliva-c)', 'var(--papel)'];
  for (let i = 0; i < 44; i++) {
    setTimeout(() => {
      const el = document.createElement('i');
      el.className = 'anuncio-confete';
      const t = 1.6 + Math.random() * 1.4;
      const lado = 5 + Math.random() * 7;
      el.style.cssText = `background:${cores[i % cores.length]};left:${Math.random() * 100}vw;`
        + `--t:${t}s;width:${lado}px;height:${lado}px;`
        + `border-radius:${i % 3 === 0 ? '50%' : '1px'};`;
      document.body.appendChild(el);
      setTimeout(() => el.remove(), t * 1000 + 120);
    }, Math.random() * 350);
  }
}

/* Uma fila, e nao varios banners empilhados: duas medalhas ao mesmo tempo
   viram duas comemoracoes seguidas, cada uma com o seu momento. Empilhado,
   nenhuma seria lida. */
let fila = Promise.resolve();

function anunciarUma(medalha, divisa) {
  garantirEstilo();
  return new Promise((pronto) => {
    const cor = medalha.metalInfo?.cor || 'var(--latao)';
    const el = document.createElement('div');
    el.className = 'anuncio-medalha';
    el.setAttribute('role', 'status');
    el.setAttribute('aria-live', 'polite');
    el.style.setProperty('--metal', cor);
    el.innerHTML = `
      <div class="anuncio-rotulo">${medalha.secreta ? 'Condecoração secreta' : 'Condecoração'} · ${esc(medalha.metalInfo?.nome || '')}</div>
      <div class="anuncio-nome">${esc(medalha.nome)}</div>
      <div class="anuncio-desc">${esc(medalha.descricao)}</div>
      ${divisa ? `<div class="anuncio-divisa">Nova divisa: <b>${esc(divisa.nome)}</b></div>` : ''}`;
    document.body.appendChild(el);
    chuvaDeConfete(cor);
    setTimeout(() => { el.remove(); pronto(); }, 3900);
  });
}

// Copia local do escape -- este modulo nao importa astral.js de proposito, para
// poder ser usado de qualquer pagina sem arrastar o cliente do banco junto.
function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
}

/**
 * Anuncia o que ainda nao foi mostrado a esta pessoa neste aparelho.
 *
 * @param {string} uid            quem e
 * @param {object} conferido      a saida de `conferir()`
 * @param {object} [opcoes]
 * @param {number} [opcoes.maximo]  teto de anuncios por vez (padrao 3)
 * @returns {Promise<string[]>}   os ids anunciados
 */
export async function anunciarNovidades(uid, conferido, { maximo = 3 } = {}) {
  if (!uid || !conferido?.condecoracoes) return [];

  const ganhas = conferido.condecoracoes.filter((c) => c.conquistada);
  const vistas = lerVistas(uid);

  // PRIMEIRA vez neste aparelho: semeia calado. Ver o cabecalho.
  if (vistas === null) {
    gravarVistas(uid, new Set(ganhas.map((c) => c.id)));
    return [];
  }

  const novas = ganhas.filter((c) => !vistas.has(c.id));
  if (!novas.length) return [];

  /* 🔴 ESCOLHER e ORDENAR sao duas coisas, e eu tinha misturado as duas numa
     linha so. A primeira versao ordenava do bronze ao ouro e depois cortava os
     3 PRIMEIROS -- o que jogava fora justamente as medalhas mais valiosas.
     O teste mostrou o estrago: cairam cinco, entre elas a "Marcha Forçada" de
     ouro e secreta, e o anuncio mostrou tres de prata.

     Agora sao dois passos:
       ESCOLHER  as mais valiosas (ordem decrescente, corta)
       ORDENAR   para exibir em ordem crescente, para a ultima imagem que fica
                 ser a do metal mais alto. Platina no meio seria anticlimax. */
  const ordem = { bronze: 1, prata: 2, ouro: 3, platina: 4 };
  const valor = (c) => (ordem[c.metal] || 0) + (c.secreta ? 0.5 : 0);   // secreta desempata para cima

  const mostrar = [...novas]
    .sort((a, b) => valor(b) - valor(a))     // as melhores primeiro, para escolher
    .slice(0, maximo)
    .sort((a, b) => valor(a) - valor(b));    // e crescente, para exibir

  // Todas entram no conjunto de vistas, inclusive as que passaram do teto --
  // senao voltariam a aparecer na proxima carga, e a pessoa levaria a mesma
  // enxurrada em parcelas.
  gravarVistas(uid, new Set([...vistas, ...novas.map((c) => c.id)]));

  for (const medalha of mostrar) {
    const divisa = (conferido.divisas || []).find(
      (d) => d.conquistada && d.condicao?.tipo === 'condecoracao' && d.condicao.id === medalha.id,
    );
    fila = fila.then(() => anunciarUma(medalha, divisa));
  }
  await fila;
  return mostrar.map((c) => c.id);
}

/** Esquece o que foi mostrado. Só para teste -- não há botão para isto. */
export function esquecerVistas(uid) {
  try { localStorage.removeItem(CHAVE(uid)); } catch { /* nada a fazer */ }
}
