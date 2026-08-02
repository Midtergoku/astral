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

const DIAS = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];

function formatar(seg) {
  const h = Math.floor(seg / 3600);
  const m = Math.round((seg % 3600) / 60);
  if (!h && !m) return '0min';
  if (!h) return `${m}min`;
  return m ? `${h}h${String(m).padStart(2, '0')}` : `${h}h`;
}

/** Devolve o HTML do cartao. `semana` vem de sessoesDaSemana(). */
export function graficoSemanaHTML(semana = [], titulo = 'Sua semana') {
  const total = semana.reduce((t, d) => t + (d.segundos || 0), 0);
  // o teto e a maior barra, nunca zero -- dividir por zero some com o grafico
  const teto = Math.max(...semana.map((d) => d.segundos || 0), 1);

  const colunas = semana.map((d) => {
    const pct = Math.round(((d.segundos || 0) / teto) * 100);
    const alt = d.segundos ? Math.max(6, pct) : 3;
    const dia = DIAS[d.data.getDay()];
    return `<div class="gsemana-col${d.hoje ? ' hoje' : ''}">
      <div class="gsemana-barra${d.segundos ? '' : ' vazio'}${d.hoje ? ' hoje' : ''}"
           style="height:${alt}%"
           title="${dia} · ${formatar(d.segundos)}"></div>
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
