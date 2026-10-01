/* ═══════════════════════════════════════════════════════════════════════════
   O TAF -- as provas, o indice e a situacao de cada uma  (item 10, 30/09/2026)

   Funcoes puras: a pagina taf.html desenha, o servidor guarda e calcula o XP
   (migration 20260930140000). Os limites de cada prova sao os MESMOS do
   gatilho `validar_taf` -- a tela confere antes, o servidor confere de novo
   (regra 3 do CLAUDE.md).

   ── DE ONDE VEM O INDICE, nesta ordem ─────────────────────────────────────
   1. o que a pessoa digitou (`cfg.metas[prova]`) -- ela pode corrigir a leitura
   2. o que a IA leu do edital (`edital.taf.provas[]`), pela tabela do sexo dela
   3. nenhum. NUNCA um indice inventado: sem indice, a prova mostra so as marcas.
*/

export const PROVAS = {
  corrida_12min: { nome: 'Corrida de 12 minutos', sufixo: 'metros',     curto: 'm',   min: 200, max: 5000 },
  barra:         { nome: 'Barra fixa',            sufixo: 'repetições', curto: 'rep', min: 1,   max: 60 },
  flexao:        { nome: 'Flexão de braço',       sufixo: 'repetições', curto: 'rep', min: 1,   max: 150 },
  abdominal:     { nome: 'Abdominal',             sufixo: 'repetições', curto: 'rep', min: 1,   max: 150 },
  corrida_50m:   { nome: 'Corrida de 50 metros',  sufixo: 'segundos',   curto: 's',   min: 4,   max: 30,  menorMelhor: true, decimal: true },
  natacao_50m:   { nome: 'Natação 50 metros',     sufixo: 'segundos',   curto: 's',   min: 15,  max: 300, menorMelhor: true, decimal: true },
};

const PADRAO = ['corrida_12min', 'barra', 'flexao', 'abdominal'];

/** As provas que aparecem: as do edital; senao as que a pessoa marcou; senao as 4 classicas. */
export function provasDoTreino(cfg = {}, taf = null) {
  const doEdital = (taf?.provas || []).map((p) => p?.prova).filter((p) => p in PROVAS);
  if (doEdital.length) return [...new Set(doEdital)];
  const escolhidas = (cfg?.provas || []).filter((p) => p in PROVAS);
  return escolhidas.length ? escolhidas : PADRAO.slice();
}

/** O indice da prova para esta pessoa, ou null. */
export function metaDe(prova, cfg = {}, taf = null) {
  const p = PROVAS[prova];
  if (!p) return null;
  const valido = (v) => { const n = Number(v); return Number.isFinite(n) && n >= p.min && n <= p.max ? n : null; };
  const digitado = valido(cfg?.metas?.[prova]);
  if (digitado != null) return digitado;
  if (!cfg?.sexo) return null;                       // sem saber o sexo, a tabela do edital nao se aplica
  const lida = (taf?.provas || []).find((x) => x?.prova === prova);
  return lida ? valido(cfg.sexo === 'f' ? lida.feminino : lida.masculino) : null;
}

/** Quanto do indice a melhor marca cobre. Prova de tempo: menor e melhor. */
export function situacao(prova, melhor, meta) {
  const p = PROVAS[prova];
  const m = Number(melhor), alvo = Number(meta);
  if (!p || !Number.isFinite(m) || !(alvo > 0)) return { apta: false, pct: 0 };
  const apta = p.menorMelhor ? m <= alvo : m >= alvo;
  const pct = Math.round(Math.min(1, p.menorMelhor ? alvo / m : m / alvo) * 100);
  return { apta, pct };
}

/** "2.400 m", "12 rep", "7,8 s" */
export function formatar(prova, valor) {
  const p = PROVAS[prova];
  const n = Number(valor);
  if (!p || !Number.isFinite(n)) return '—';
  return `${n.toLocaleString('pt-BR', { maximumFractionDigits: p.decimal ? 1 : 0 })} ${p.curto}`;
}
