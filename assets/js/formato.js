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
