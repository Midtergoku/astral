/* ═══════════════════════════════════════════════════════════════════════════
   FORMATO — um jeito so de escrever tempo de estudo

   01/10/2026, parte da fonte unica de estatisticas. A auditoria (NUM-09) achou
   NOVE formatos de hora no site, alguns na mesma tela: "0.5h" (ponto, a
   inglesa) ao lado de "0,5 h"; "2h0m" no cronometro; "90h00" no Progresso;
   "30min" e "30 min". Agora todos passam por aqui:

     menos de 1 hora   "45 min"
     hora cheia        "2h"   "90h"
     o resto           "2h05" "12h12"

   Sem dependencias: modulos importam `./formato.js` (sem carimbo); paginas,
   com o carimbo de versao. Funcao pura -- duas copias nao fazem mal.
   ═══════════════════════════════════════════════════════════════════════════ */

/** Minutos -> texto. Aceita fracao (arredonda para o minuto). */
export function duracao(minutos) {
  const total = Math.max(0, Math.round(Number(minutos) || 0));
  if (total < 60) return `${total} min`;
  const h = Math.floor(total / 60);
  const m = total % 60;
  return m ? `${h}h${String(m).padStart(2, '0')}` : `${h}h`;
}

/** Segundos -> texto. */
export function duracaoSeg(segundos) {
  return duracao((Number(segundos) || 0) / 60);
}

/** Horas (como `progresso.horas`, com uma casa) -> texto. */
export function duracaoHoras(horas) {
  return duracao((Number(horas) || 0) * 60);
}

/* ── O "hoje" do site (04/10/2026, auditoria NUM-05, roadmap 3.9) ──────────
   Um "hoje" so: o de Sao Paulo (UTC-3 fixo, sem horario de verao desde 2019),
   o MESMO das funcoes do servidor, do diario.js e do revisao.js. Antes o
   cronograma e a contagem ate a prova usavam o relogio do aparelho: no Acre,
   as 22h30, o servidor ja estava no dia seguinte e o celular nao -- o bloco de
   "hoje" era o de ontem e a prova ficava um dia mais longe. */
const FUSO_SP = 3 * 3600 * 1000;

/** 'AAAA-MM-DD' de hoje (ou de `agora`) em Sao Paulo. */
export function hojeSP(agora = new Date()) {
  return new Date(agora.getTime() - FUSO_SP).toISOString().slice(0, 10);
}

/** Dia da semana em Sao Paulo: 0 = domingo ... 6 = sabado. */
export function diaDaSemanaSP(agora = new Date()) {
  return new Date(agora.getTime() - FUSO_SP).getUTCDay();
}

/** Quantos dias de `de` ate `ate` (ambos 'AAAA-MM-DD'). Datas invalidas: null. */
export function diasEntre(de, ate) {
  const a = new Date(`${String(de).slice(0, 10)}T12:00:00Z`);
  const b = new Date(`${String(ate).slice(0, 10)}T12:00:00Z`);
  if (Number.isNaN(a.getTime()) || Number.isNaN(b.getTime())) return null;
  return Math.round((b - a) / 86400000);
}
