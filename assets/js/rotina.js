/* ═══════════════════════════════════════════════════════════════════════════
   ROTINA -- o questionario que monta o cronograma individual.

   Pedido dele em 28/09/2026: "quero algo simples e objetivo e so e feito
   quando uma pessoa entra pela primeira vez, mas e possivel alterar depois".

   - aparece SOZINHO uma vez, no dashboard, para quem nunca respondeu
     (progresso.rotina nulo) -- e depois so quando a pessoa pede, no Cronograma
   - quatro perguntas de toque, nenhuma de digitar: dias, tempo nos dias
     uteis, tempo no fim de semana (so se marcou sabado ou domingo), e o
     tamanho da sessao
   - a previa ("fica assim: 18 sessoes, 12h por semana") responde na hora,
     para a pessoa ver o que esta combinando antes de combinar

   Devolve a rotina escolhida, ou null se a pessoa fechou sem responder.
   Nao grava nada: quem chama grava (estado.js salvarRotina).
   ═══════════════════════════════════════════════════════════════════════════ */

import { DIAS, DIAS_CURTOS, normalizarRotina } from './cronograma.js';

const TEMPOS = [60, 90, 120, 180, 240, 300];
const BLOCOS = [[25, '25 min', 'pomodoro'], [40, '40 min', ''], [50, '50 min', '']];

const horas = (m) => (m % 60 ? `${Math.floor(m / 60)}h${String(m % 60).padStart(2, '0')}` : `${m / 60}h`);

const CSS = `
.rotina-fundo {
  position: fixed; inset: 0; z-index: 900;
  background: color-mix(in srgb, var(--breu) 82%, transparent);
  display: grid; place-items: center; padding: var(--e3);
  animation: rotina-fundo var(--d-painel) var(--saida);
}
.rotina-caixa {
  width: min(36rem, 100%); max-height: calc(100vh - 2rem); overflow: auto;
  background: var(--casco); border: 1px solid var(--linha); border-top: 3px solid var(--latao);
  border-radius: var(--r-g); padding: var(--e4) var(--e5);
  box-shadow: 0 30px 60px -30px rgba(0,0,0,.9);
  animation: rotina-entra var(--d-painel) var(--saida);
}
@keyframes rotina-fundo { from { opacity: 0; } to { opacity: 1; } }
@keyframes rotina-entra { from { opacity: 0; transform: translateY(8px) scale(.98); } to { opacity: 1; transform: none; } }
.rotina-rotulo { font-family: var(--dado); font-size: var(--t-xs); letter-spacing: .14em; text-transform: uppercase; color: var(--latao-c); }
.rotina-titulo { font-family: var(--display); font-size: var(--t-xl); font-weight: 800; color: var(--papel); margin: .2rem 0 .35rem; line-height: 1.15; }
.rotina-sub { font-size: var(--t-sm); color: var(--texto-2); line-height: 1.5; margin: 0; }
.rotina-q { margin-top: var(--e4); }
.rotina-q[hidden] { display: none; }
.rotina-pergunta { font-family: var(--display); font-weight: 700; font-size: .95rem; color: var(--texto); margin-bottom: var(--e2); }
.rotina-opcoes { display: flex; flex-wrap: wrap; gap: .4rem; }
.rotina-opcoes.dias { display: grid; grid-template-columns: repeat(7, minmax(0, 1fr)); }
.rotina-op {
  background: var(--breu); border: 1px solid var(--linha); color: var(--texto-2);
  border-radius: var(--r-p); padding: .6rem .8rem; cursor: pointer;
  font-family: var(--dado); font-size: var(--t-sm); font-variant-numeric: tabular-nums;
  transition: border-color var(--d-toque) var(--saida), color var(--d-toque) var(--saida), background-color var(--d-toque) var(--saida);
}
.rotina-opcoes.dias .rotina-op { padding: .7rem 0; text-align: center; }
.rotina-op small { display: block; font-size: .62rem; color: var(--texto-3); margin-top: .1rem; letter-spacing: .06em; }
.rotina-op[aria-pressed="true"] {
  border-color: var(--latao); color: var(--papel);
  background: color-mix(in srgb, var(--latao) 16%, var(--breu));
}
.rotina-op[aria-pressed="true"] small { color: var(--latao-c); }
@media (hover: hover) and (pointer: fine) {
  .rotina-op:hover { border-color: color-mix(in srgb, var(--latao) 60%, var(--linha)); color: var(--texto); }
}
.rotina-previa {
  margin-top: var(--e4); padding: .8rem 1rem; border-radius: var(--r-p);
  background: var(--breu); border: 1px dashed var(--linha);
  font-family: var(--dado); font-size: var(--t-sm); color: var(--texto-2);
}
.rotina-previa b { color: var(--latao-c); font-weight: 700; }
.rotina-aviso { margin-top: var(--e2); font-size: var(--t-xs); color: var(--brasa-c); }
.rotina-pe { display: flex; justify-content: space-between; align-items: center; gap: var(--e3); margin-top: var(--e4); flex-wrap: wrap; }
.rotina-pular { background: none; border: none; color: var(--texto-3); font-family: var(--corpo); font-size: var(--t-sm); cursor: pointer; padding: .4rem 0; }
@media (hover: hover) and (pointer: fine) { .rotina-pular:hover { color: var(--texto); text-decoration: underline; } }
.rotina-ok {
  background: var(--latao); color: var(--breu); border: none; border-radius: var(--r-p);
  padding: .8rem 1.3rem; font-family: var(--display); font-weight: 800; font-size: .92rem; cursor: pointer;
  transition: transform var(--d-toque) var(--saida), opacity var(--d-toque) var(--saida);
}
.rotina-ok:active { transform: scale(.97); }
.rotina-ok:disabled { opacity: .45; cursor: not-allowed; }
@media (max-width: 560px) {
  .rotina-caixa { padding: var(--e4) var(--e3); }
  .rotina-opcoes.dias { gap: .25rem; }
  .rotina-opcoes.dias .rotina-op { font-size: .78rem; }
}
@media (prefers-reduced-motion: reduce) {
  .rotina-fundo, .rotina-caixa { animation: none; }
}`;

function injetarCss() {
  if (document.getElementById('rotina-css')) return;
  const st = document.createElement('style');
  st.id = 'rotina-css';
  st.textContent = CSS;
  document.head.appendChild(st);
}

/**
 * Abre o questionario. `atual` preenche as respostas (para editar).
 * `podePular`: na primeira vez, "agora nao" usa a rotina padrao.
 * Devolve a rotina, { pulou: true } se pulou, ou null se fechou editando.
 */
export function perguntarRotina({ atual = null, podePular = false } = {}) {
  injetarCss();
  const r = normalizarRotina(atual);
  const escolha = { dias: new Set(r.dias), minutosUtil: r.minutosUtil, minutosFds: r.minutosFds, bloco: r.bloco };
  const tinhaSemanaEditada = !!r.semana;

  return new Promise((resolver) => {
    const fundo = document.createElement('div');
    fundo.className = 'rotina-fundo';
    fundo.innerHTML = `
      <div class="rotina-caixa" role="dialog" aria-modal="true" aria-labelledby="rotina-titulo">
        <div class="rotina-rotulo">Antes do cronograma</div>
        <h2 class="rotina-titulo" id="rotina-titulo">Como é a sua semana?</h2>
        <p class="rotina-sub">O Astral monta o seu cronograma em cima destas respostas. Dá para mudar quando quiser, na aba Cronograma.</p>

        <div class="rotina-q">
          <div class="rotina-pergunta">Em quais dias você consegue estudar?</div>
          <div class="rotina-opcoes dias" data-q="dias">
            ${[1, 2, 3, 4, 5, 6, 0].map((d) => `<button type="button" class="rotina-op" data-dia="${d}" title="${DIAS[d]}">${DIAS_CURTOS[d]}</button>`).join('')}
          </div>
        </div>

        <div class="rotina-q" data-bloco="util">
          <div class="rotina-pergunta">Quanto tempo por dia, de segunda a sexta?</div>
          <div class="rotina-opcoes" data-q="minutosUtil">
            ${TEMPOS.map((t) => `<button type="button" class="rotina-op" data-valor="${t}">${t >= 300 ? '5h+' : horas(t)}</button>`).join('')}
          </div>
        </div>

        <div class="rotina-q" data-bloco="fds">
          <div class="rotina-pergunta">E no fim de semana?</div>
          <div class="rotina-opcoes" data-q="minutosFds">
            ${TEMPOS.map((t) => `<button type="button" class="rotina-op" data-valor="${t}">${t >= 300 ? '5h+' : horas(t)}</button>`).join('')}
          </div>
        </div>

        <div class="rotina-q">
          <div class="rotina-pergunta">Quanto dura uma sessão sua, sem parar?</div>
          <div class="rotina-opcoes" data-q="bloco">
            ${BLOCOS.map(([v, t, s]) => `<button type="button" class="rotina-op" data-valor="${v}">${t}${s ? `<small>${s}</small>` : ''}</button>`).join('')}
          </div>
        </div>

        <div class="rotina-previa" id="rotina-previa" aria-live="polite"></div>
        ${tinhaSemanaEditada ? '<div class="rotina-aviso">Você tinha ajustado a semana à mão. Com estas respostas, ela é montada de novo.</div>' : ''}

        <div class="rotina-pe">
          <button type="button" class="rotina-pular" id="rotina-pular">${podePular ? 'Agora não — usar o padrão' : 'Cancelar'}</button>
          <button type="button" class="rotina-ok" id="rotina-ok">Montar meu cronograma</button>
        </div>
      </div>`;
    document.body.appendChild(fundo);

    const $ = (sel) => fundo.querySelector(sel);
    const temUtil = () => [...escolha.dias].some((d) => d >= 1 && d <= 5);
    const temFds = () => escolha.dias.has(0) || escolha.dias.has(6);

    function pintar() {
      fundo.querySelectorAll('[data-dia]').forEach((b) =>
        b.setAttribute('aria-pressed', String(escolha.dias.has(Number(b.dataset.dia)))));
      for (const q of ['minutosUtil', 'minutosFds', 'bloco']) {
        fundo.querySelectorAll(`[data-q="${q}"] [data-valor]`).forEach((b) =>
          b.setAttribute('aria-pressed', String(Number(b.dataset.valor) === escolha[q])));
      }
      $('[data-bloco="util"]').hidden = !temUtil();
      $('[data-bloco="fds"]').hidden = !temFds();

      const semanaMin = [...escolha.dias].reduce((s, d) => s + (d === 0 || d === 6 ? escolha.minutosFds : escolha.minutosUtil), 0);
      const sessoes = [...escolha.dias].reduce((s, d) =>
        s + Math.max(1, Math.ceil((d === 0 || d === 6 ? escolha.minutosFds : escolha.minutosUtil) / escolha.bloco)), 0);
      $('#rotina-ok').disabled = escolha.dias.size === 0;
      $('#rotina-previa').innerHTML = escolha.dias.size
        ? `Fica assim: <b>${escolha.dias.size} dia${escolha.dias.size > 1 ? 's' : ''}</b>, <b>${sessoes} sessões</b> e <b>${horas(semanaMin)}</b> de estudo por semana.`
        : 'Marque pelo menos um dia.';
    }

    fundo.querySelectorAll('[data-dia]').forEach((b) => b.addEventListener('click', () => {
      const d = Number(b.dataset.dia);
      escolha.dias.has(d) ? escolha.dias.delete(d) : escolha.dias.add(d);
      pintar();
    }));
    for (const q of ['minutosUtil', 'minutosFds', 'bloco']) {
      fundo.querySelectorAll(`[data-q="${q}"] [data-valor]`).forEach((b) => b.addEventListener('click', () => {
        escolha[q] = Number(b.dataset.valor);
        pintar();
      }));
    }

    function fechar(valor) {
      document.removeEventListener('keydown', teclado);
      fundo.remove();
      resolver(valor);
    }
    function teclado(e) { if (e.key === 'Escape') fechar(podePular ? { pulou: true } : null); }
    document.addEventListener('keydown', teclado);

    $('#rotina-pular').addEventListener('click', () => fechar(podePular ? { pulou: true } : null));
    $('#rotina-ok').addEventListener('click', () => fechar({
      dias: [...escolha.dias].sort(),
      minutosUtil: escolha.minutosUtil,
      minutosFds: escolha.minutosFds,
      bloco: escolha.bloco,
      semana: null,
      respondidoEm: new Date().toISOString(),
    }));

    pintar();
    fundo.querySelector('.rotina-op')?.focus();
  });
}
