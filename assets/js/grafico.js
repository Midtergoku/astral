/* ═══════════════════════════════════════════════════════════════════════════
   GRAFICO DA SEMANA — sete barras, sem biblioteca
   ═══════════════════════════════════════════════════════════════════════════
   Peca C2 do roadmap. Referencia escolhida pelo Lucas no 21st.dev:
   "activity-chart-card" do ravikatiyar162 -- titulo, total, e barras por dia
   que sobem em cascata.

   POR QUE SEM BIBLIOTECA:
   sao sete barras. Qualquer biblioteca de grafico pesa mais que a pagina
   inteira, e viria de CDN -- a mesma dependencia externa que acabamos de
   tirar do projeto no V3. Altura em porcentagem resolve.
   ═══════════════════════════════════════════════════════════════════════════ */

import { duracaoSeg } from './formato.js';

/* 09/10/2026 (auditoria NUM-12, roadmap 3.20): era uma letra por dia -- "S S D S T Q Q",
   tres S e dois Q, ninguem sabia qual era qual. Tres letras, como no Cronograma. */
const DIAS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

// 01/10/2026: o formato de tempo e um so, para o site inteiro (formato.js).
const formatar = duracaoSeg;

/** Devolve o HTML do cartao. `semana` vem de sessoesDaSemana(). */
export function graficoSemanaHTML(semana = [], titulo = 'Sua semana') {
  const total = semana.reduce((t, d) => t + (d.segundos || 0), 0);
  // o teto e a maior barra, nunca zero -- dividir por zero some com o grafico
  const teto = Math.max(...semana.map((d) => d.segundos || 0), 1);

  const colunas = semana.map((d) => {
    const pct = Math.round(((d.segundos || 0) / teto) * 100);
    const alt = d.segundos ? Math.max(6, pct) : 3;
    const dia = DIAS[d.data.getDay()];
    /* 30/09/2026: a barra mora num TRILHO de altura definida. Sem ele, o % da
       altura se referia a uma linha de grade sem altura e era descartado: o
       dia de 2h saia com 3px e o dia vazio, esticado, com 80px (auditoria
       dele, item 9). */
    return `<div class="gsemana-col${d.hoje ? ' hoje' : ''}">
      <div class="gsemana-trilho"><div class="gsemana-barra${d.segundos ? '' : ' sem-estudo'}${d.hoje ? ' hoje' : ''}"
           style="height:${alt}%"
           title="${dia} · ${formatar(d.segundos)}"></div></div>
      <span class="gsemana-dia">${dia}</span>
    </div>`;
  }).join('');

  return `<div class="gsemana">
    <div class="gsemana-topo">
      <div>
        <span class="gsemana-rotulo">${titulo}</span>
        <div class="gsemana-total">${formatar(total)}</div>
      </div>
    </div>
    <div class="gsemana-barras">${colunas}</div>
  </div>`;
}

/** Preenche todo [data-grafico-semana] da pagina. */
export function aplicarGrafico(semana, titulo) {
  const html = graficoSemanaHTML(semana, titulo);
  document.querySelectorAll('[data-grafico-semana]').forEach((el) => { el.innerHTML = html; });
}
