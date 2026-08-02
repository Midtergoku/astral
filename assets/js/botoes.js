/* ═══════════════════════════════════════════════════════════════════════════
   BOTOES — a seta que se revela e o estado de carregando
   ═══════════════════════════════════════════════════════════════════════════
   Peca C1 do roadmap por componente. Referencia escolhida pelo Lucas no
   21st.dev: o "get-started-button" do ozantekin, que revela um chevron ao
   passar o mouse.

   O CSS esta em assets/css/base.css. Este arquivo faz duas coisas:

   1. PREPARA os botoes existentes. Sao 64 espalhados por 10 classes
      diferentes; envolver o texto de cada um na mao seria 64 chances de
      errar, e a proxima pagina nova nasceria sem o efeito. Aqui e uma vez so,
      e vale para o que ainda vai ser escrito.

   2. EXPOE `carregando(botao, true/false)` para as chamadas demoradas.

   ⚠️ POR QUE O ESTADO DE CARREGANDO IMPORTA MAIS QUE O EFEITO BONITO:
   hoje NENHUM botao do site tem esse estado. Quem clica em "Analisar edital"
   -- que chama a IA e leva segundos -- ve o botao parado, exatamente como
   estava. A reacao natural e clicar de novo. E clicar de novo numa chamada de
   IA e gastar credito de novo, pelo mesmo trabalho.
   ═══════════════════════════════════════════════════════════════════════════ */

const SETA =
  '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" ' +
  'stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
  '<polyline points="9 6 15 12 9 18"/></svg>';

/* Quais recebem a seta. Botao de perigo NAO recebe -- "Excluir minha conta"
   com uma setinha simpatica convidando a seguir em frente e o oposto do que
   aquele botao deve comunicar. */
const COM_SETA = '.btn-primary, .btn-roxo, .btn-1, .btn-upload, .btn-acessar';
const SEM_SETA = '.btn-perigo, .btn-logout, .btn-3, .btn-fantasma';

function preparar(raiz = document) {
  raiz.querySelectorAll('button, a.btn, a.btn-primary, a.btn-roxo, a.btn-upload, a.btn-acessar')
    .forEach((b) => {
      if (b.dataset.pronto) return;
      if (b.matches(SEM_SETA)) { b.dataset.pronto = '1'; return; }
      if (b.querySelector('.rotulo')) { b.dataset.pronto = '1'; return; }

      // O conteudo existente vira o rotulo, inteiro -- inclusive icone e
      // marcacao. Reescrever como texto puro apagaria os SVGs que ja estao la.
      const dentro = b.innerHTML.trim();
      if (!dentro) { b.dataset.pronto = '1'; return; }

      b.innerHTML = `<span class="rotulo">${dentro}</span>`;
      if (b.matches(COM_SETA)) {
        b.insertAdjacentHTML('beforeend', `<span class="seta-revela">${SETA}</span>`);
      }
      b.dataset.pronto = '1';
    });
}

/* Liga e desliga o estado de espera.
   Guarda a largura ANTES de trocar o conteudo: sem isso o botao encolhe no
   instante em que o rotulo some, e tudo ao redor pula. */
export function carregando(botao, ligado = true) {
  if (!botao) return;
  if (ligado) {
    const r = botao.getBoundingClientRect();
    botao.style.minWidth = Math.ceil(r.width) + 'px';
    botao.dataset.carregando = 'true';
    botao.setAttribute('aria-busy', 'true');
    if (botao.tagName === 'BUTTON') botao.disabled = true;
  } else {
    delete botao.dataset.carregando;
    botao.removeAttribute('aria-busy');
    botao.style.minWidth = '';
    if (botao.tagName === 'BUTTON') botao.disabled = false;
  }
}

/* Envolve uma acao demorada: liga o estado, roda, e desliga MESMO SE DER
   ERRO. Um botao que fica girando para sempre depois de uma falha e pior que
   nao ter estado nenhum -- a pessoa fica esperando algo que nao vem. */
export async function comEspera(botao, acao) {
  carregando(botao, true);
  try {
    return await acao();
  } finally {
    carregando(botao, false);
  }
}

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => preparar());
  } else {
    preparar();
  }
  // botao criado depois (lista renderizada por JS) tambem recebe o tratamento
  window.astralPrepararBotoes = preparar;
}

export { preparar };
