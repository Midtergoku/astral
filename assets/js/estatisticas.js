/* ═══════════════════════════════════════════════════════════════════════════
   ESTATISTICAS — a fonte unica do que as telas mostram sobre o estudo

   A recomendacao estrutural da auditoria (o "user_stats"), feita em 01/10/2026
   a pedido dele. Uma chamada ao servidor, `estatisticas_do_usuario()`
   (migration 20261001110000), traz:

     fatos    ficha, dominio, sequencia, contadores (fatos_do_usuario)
     hoje     o que aconteceu hoje + `dia` (fatos_de_hoje), no fuso de SP
     plano    as regras do plano (meu_plano)
     sessoes  as sessoes dos ultimos 400 dias, cada uma com `dia` JA CALCULADO
              no servidor, no fuso de Sao Paulo

   🔴 A REGRA DESTE ARQUIVO: nenhuma tela calcula "que dia e hoje" nem "de que
   dia e esta sessao". Le `est.hoje.dia` e `sessao.dia`. Antes, o painel e o
   cronometro usavam o relogio do aparelho, o diario fazia -3 h por conta
   propria, e o servidor usava Sao Paulo -- tres convencoes que so batiam para
   quem esta em Brasilia (auditoria NUM-05).

   Uma chamada por pagina: o resultado fica guardado ate alguem gravar uma
   sessao (`invalidarEstatisticas`) ou pedir `fresco`.
   ═══════════════════════════════════════════════════════════════════════════ */

import { supabase } from './astral.js';

let _guardado = null;

/** Tudo, numa chamada. `fresco: true` ignora o que esta guardado. */
export function carregarEstatisticas({ fresco = false } = {}) {
  if (!_guardado || fresco) {
    _guardado = supabase.rpc('estatisticas_do_usuario').then(({ data, error }) => {
      if (error) { _guardado = null; throw error; }
      return data;
    });
  }
  return _guardado;
}

/** Depois de gravar uma sessao: a proxima leitura vai ao servidor. */
export function invalidarEstatisticas() { _guardado = null; }

/** 'AAAA-MM-DD' somado de n dias, sem fuso nenhum (conta de calendario). */
export function somarDias(dia, n) {
  const d = new Date(`${dia}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/** Um Date para DESENHAR um dia (dia da semana, "01/10"): meio-dia local, para
 *  nenhum fuso empurrar a data para o dia vizinho. Nunca para calcular. */
export function dataDoDia(dia) { return new Date(`${dia}T12:00:00`); }

/** As sessoes de um dia ('AAAA-MM-DD'), da mais nova para a mais antiga. */
export function sessoesDoDia(est, dia) {
  return (est?.sessoes || []).filter((s) => s.dia === dia).reverse();
}

/** Os ultimos n dias ate hoje, somados: [{ dia, data, segundos, hoje }]. */
export function ultimosDias(est, n = 7) {
  const hoje = est?.hoje?.dia;
  if (!hoje) return [];
  const dias = Array.from({ length: n }, (_, i) => {
    const dia = somarDias(hoje, i - (n - 1));
    return { dia, data: dataDoDia(dia), segundos: 0, hoje: i === n - 1 };
  });
  const porDia = new Map(dias.map((d) => [d.dia, d]));
  for (const s of est.sessoes || []) {
    const alvo = porDia.get(s.dia);
    if (alvo) alvo.segundos += Number(s.segundos) || 0;
  }
  return dias;
}

/** As ultimas n semanas (segunda a domingo) ate a atual: [{ ini, inicio, seg, n }]. */
export function ultimasSemanas(est, n = 8) {
  const hoje = est?.hoje?.dia;
  if (!hoje) return [];
  const dow = (new Date(`${hoje}T12:00:00Z`).getUTCDay() + 6) % 7;   // 0 = segunda
  const segunda = somarDias(hoje, -dow);
  const semanas = Array.from({ length: n }, (_, k) => {
    const inicio = somarDias(segunda, -(n - 1 - k) * 7);
    return { inicio, ini: dataDoDia(inicio), fim: somarDias(inicio, 7), seg: 0, n: 0 };
  });
  for (const s of est.sessoes || []) {
    const w = semanas.find((x) => s.dia >= x.inicio && s.dia < x.fim);
    if (w) { w.seg += Number(s.segundos) || 0; w.n++; }
  }
  return semanas;
}
