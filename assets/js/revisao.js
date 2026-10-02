/* ═══════════════════════════════════════════════════════════════════════════
   A REVISAO ESPACADA  (item 10 da lista de 30/09/2026)

   Pedido dele: "repeticao espacada -- pelo menos um lembrete de revisao ligado
   ao diario". Aprovado no mesmo dia.

   A regra e a classica da curva do esquecimento: o que voce estudou volta
   para revisao 1, 7 e 30 DIAS DEPOIS. Cada volta pega a materia antes de o
   esquecimento derrubar o que foi aprendido, e o intervalo cresce porque
   cada revisao faz a memoria durar mais.

   ── POR QUE NO NAVEGADOR, E SEM TABELA NOVA ────────────────────────────────
   Tudo o que a regra precisa ja existe: `sessoes_estudo` diz QUE materia foi
   estudada em QUE dia (e a mesma leitura do diario). Uma tabela de "revisoes
   agendadas" seria uma segunda verdade para divergir da primeira. E a
   revisao nao da acesso a nada nem XP proprio: ela so aponta o que fazer.
   Revisar e estudar -- a sessao de revisao gera o XP normal, pelas regras do
   servidor.

   Funcao pura: recebe as sessoes e o dia de hoje, devolve as revisoes. Nao
   busca nada, nao grava nada -- e por isso o teste roda sem banco.

   Revisao FEITA = estudou aquela materia hoje (qualquer sessao).
*/

export const INTERVALOS = [1, 7, 30];

/* O dia no fuso de quem estuda (-3h), AAAA-MM-DD -- a MESMA convencao do
   diario.js e das funcoes do servidor. Duas convencoes fariam a revisao e o
   diario discordarem sobre "ontem". */
export function diaDe(iso) {
  if (!iso || typeof iso !== 'string') return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  const local = new Date(d.getTime() - 3 * 3600 * 1000);
  const p = (n) => String(n).padStart(2, '0');
  return `${local.getUTCFullYear()}-${p(local.getUTCMonth() + 1)}-${p(local.getUTCDate())}`;
}

const distancia = (de, ate) => Math.round((new Date(`${ate}T12:00:00Z`) - new Date(`${de}T12:00:00Z`)) / 86400000);

/**
 * As revisoes de hoje.
 * @param sessoes  [{ materia, criado_em }] -- bastam os ultimos 31 dias
 * @param hoje     'AAAA-MM-DD' no fuso de quem estuda (padrao: agora)
 * @returns [{ materia, haDias, estudadaEm, feita }] -- a mais antiga primeiro
 *          (a de 30 dias e a que mais corre risco de ter sido esquecida)
 */
export function revisoesDeHoje(sessoes = [], hoje = diaDe(new Date().toISOString())) {
  const diasPorMateria = new Map();
  for (const s of sessoes || []) {
    // 01/10/2026: o dia vem PRONTO do servidor (fonte unica de estatisticas);
    // o calculo daqui so vale para sessao sem `dia` (testes).
    const dia = (typeof s?.dia === 'string' && s.dia) || diaDe(s?.criado_em);
    const m = typeof s?.materia === 'string' ? s.materia.trim() : '';
    if (!dia || !m) continue;
    if (!diasPorMateria.has(m)) diasPorMateria.set(m, new Set());
    diasPorMateria.get(m).add(dia);
  }
  const revisoes = [];
  for (const [materia, dias] of diasPorMateria) {
    // O maior intervalo que bate vence: quem estudou ha 30 E ha 1 dia esta
    // mais perto de esquecer o de 30.
    const bate = INTERVALOS.filter((n) => [...dias].some((d) => distancia(d, hoje) === n));
    if (!bate.length) continue;
    const haDias = Math.max(...bate);
    const estudadaEm = [...dias].find((d) => distancia(d, hoje) === haDias);
    revisoes.push({ materia, haDias, estudadaEm, feita: dias.has(hoje) });
  }
  return revisoes.sort((a, b) => b.haDias - a.haDias || a.materia.localeCompare(b.materia, 'pt-BR'));
}

/** O texto curto do intervalo, para a tela. */
export function quando(haDias) {
  return haDias === 1 ? 'estudada ontem' : `estudada há ${haDias} dias`;
}
