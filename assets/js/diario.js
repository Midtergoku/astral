/* ═══════════════════════════════════════════════════════════════════════════
   O DIÁRIO DE CAMPANHA  (R7)

   Ideia aprovada por ele em 18/09: o histórico vira log narrado.

   ── 🔴 O QUE EU **NÃO** POSSO ESCREVER AQUI, E POR QUÊ ─────────────────────
   A ideia original dizia:

     "Dia 34 — 2h20 em Matemática. Domínio 58% → 61%. Desbloqueado: Calculista."

   A parte do meio é **impossível hoje**, e é importante dizer em vez de
   inventar: o projeto guarda o domínio ATUAL de cada matéria, nunca o
   histórico dele. Não existe "58%" em lugar nenhum do banco — existe o valor
   de agora, e só.

   Escrever "58% → 61%" aqui exigiria ou gravar histórico novo (mudança de
   banco, fora do que posso fazer sozinho) ou **inventar o número**. Inventar
   seria o pior defeito possível num diário: um diário que mente sobre o
   passado não vale nada, e ninguém teria como perceber.

   Então o diário conta o que o banco SABE, e conta bem:

     tempo, matérias e sessões de cada dia  -> direto de `sessoes_estudo`
     a sequência de dias naquele momento    -> recontada dia a dia
     os marcos (primeira vez, recordes)     -> calculados REPRODUZINDO a
                                               história em ordem, não chutados

   ── POR QUE OS MARCOS SÃO CALCULADOS POR REPRODUÇÃO ───────────────────────
   "Seu dia mais longo até então" só faz sentido contra o que veio antes. Um
   dia de 3 horas é recorde em janeiro e rotina em junho. Percorrer a história
   em ordem, guardando o máximo até ali, é a única forma de o marco ser
   verdadeiro na data em que aparece -- e não um rótulo aplicado por cima com
   o número de hoje.
*/

const MS_DIA = 86400000;

/* A data no fuso de quem estuda, no formato AAAA-MM-DD.
   Devolve `null` se a data não der para ler.

   🔴 O `null` importa, e foi o teste que mostrou por quê: sem ele, uma data
   inválida virava o dia `NaN-NaN-NaN` -- e o diário mostrava esse dia na tela,
   com tempo somado e tudo, como se fosse um dia de verdade. Errar alto é
   aceitável; errar em silêncio, num arquivo cujo trabalho é contar o passado,
   não é. Sessão com data ilegível é DESCARTADA, e o resto do diário continua
   correto. */
function diaDe(iso) {
  /* `new Date(null)` NÃO é inválido -- é 1º de janeiro de 1970, e passaria
     direto pela checagem de NaN, colocando um dia de 1969 no topo do diário.
     Foi o que o teste pegou. Entrada vazia é barrada antes. */
  if (!iso || typeof iso !== 'string') return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  // -3h: o mesmo fuso que as funções do servidor usam. Duas convenções
  // diferentes fariam o diário discordar da ficha sobre em que dia algo foi.
  const local = new Date(d.getTime() - 3 * 3600 * 1000);
  const p = (n) => String(n).padStart(2, '0');
  return `${local.getUTCFullYear()}-${p(local.getUTCMonth() + 1)}-${p(local.getUTCDate())}`;
}

function humano(dia) {
  const d = new Date(dia + 'T12:00:00');
  return d.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long' });
}

function duracao(min) {
  if (min < 60) return `${min}min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `${h}h${String(m).padStart(2, '0')}` : `${h}h`;
}

/**
 * Transforma a lista crua de sessões em dias narrados, do mais recente para o
 * mais antigo.
 *
 * @param {Array} sessoes  `{ materia, segundos, modo, criado_em }`
 * @param {number} [limite]  quantos dias devolver
 */
export function montarDiario(sessoes = [], limite = 30) {
  if (!sessoes.length) return [];

  // ── Agrupa por dia ────────────────────────────────────────────────────────
  const porDia = new Map();
  for (const s of sessoes) {
    const dia = diaDe(s.criado_em);
    if (!dia) continue;                       // data ilegível: fora, em silêncio
    if (!porDia.has(dia)) porDia.set(dia, { dia, minutos: 0, sessoes: 0, materias: new Map(), modos: new Set() });
    const d = porDia.get(dia);
    const min = Math.round((Number(s.segundos) || 0) / 60);
    d.minutos += min;
    d.sessoes += 1;
    if (s.modo) d.modos.add(s.modo);
    if (s.materia) d.materias.set(s.materia, (d.materias.get(s.materia) || 0) + min);
  }

  /* ── Reproduz a história EM ORDEM, do começo ──────────────────────────────
     É aqui que os marcos nascem verdadeiros: a cada dia, só se sabe o que
     aconteceu até ali. */
  const ordem = [...porDia.values()].sort((a, b) => a.dia.localeCompare(b.dia));

  let recordeMin = 0;
  let sequencia = 0;
  let anterior = null;
  const jaVistas = new Set();
  let totalMin = 0;

  for (const d of ordem) {
    totalMin += d.minutos;

    // Sequência: continua se o dia anterior foi ontem; senão recomeça.
    if (anterior && (new Date(d.dia + 'T12:00:00') - new Date(anterior + 'T12:00:00')) <= MS_DIA * 1.5) {
      sequencia += 1;
    } else {
      sequencia = 1;
    }
    d.sequencia = sequencia;

    // Quantos dias sumido antes deste -- vira o marco de retorno.
    d.sumido = anterior
      ? Math.round((new Date(d.dia + 'T12:00:00') - new Date(anterior + 'T12:00:00')) / MS_DIA) - 1
      : 0;

    const marcos = [];
    if (!anterior) marcos.push({ tipo: 'inicio', texto: 'O primeiro dia. A campanha começou aqui.' });

    // Matéria nova: só é "primeira vez" se nunca apareceu antes NA ORDEM.
    for (const nome of d.materias.keys()) {
      if (!jaVistas.has(nome)) {
        jaVistas.add(nome);
        if (anterior) marcos.push({ tipo: 'materia', texto: `Primeira vez em ${nome}.` });
      }
    }

    if (d.minutos > recordeMin && anterior) {
      marcos.push({ tipo: 'recorde', texto: `Seu dia mais longo até então — ${duracao(d.minutos)}.` });
    }
    recordeMin = Math.max(recordeMin, d.minutos);

    if (d.sumido >= 7) {
      marcos.push({ tipo: 'retorno', texto: `Voltou depois de ${d.sumido} dias fora.` });
    }
    if (d.sequencia === 7)  marcos.push({ tipo: 'sequencia', texto: 'Sete dias seguidos.' });
    if (d.sequencia === 30) marcos.push({ tipo: 'sequencia', texto: 'Trinta dias seguidos.' });
    if (d.sequencia === 100) marcos.push({ tipo: 'sequencia', texto: 'Cem dias seguidos.' });

    // Marcos de hora acumulada, no dia em que a linha foi cruzada.
    for (const alvo of [10, 50, 100, 200, 500]) {
      if (totalMin >= alvo * 60 && (totalMin - d.minutos) < alvo * 60) {
        marcos.push({ tipo: 'total', texto: `${alvo} horas de estudo acumuladas.` });
      }
    }

    d.marcos = marcos;
    d.totalMinAte = totalMin;
    anterior = d.dia;
  }

  // ── A frase de cada dia ──────────────────────────────────────────────────
  for (const d of ordem) {
    const mats = [...d.materias.entries()].sort((a, b) => b[1] - a[1]);
    d.listaMaterias = mats.map(([nome, min]) => ({ nome, minutos: min }));
    d.titulo = humano(d.dia);
    d.resumo = mats.length
      ? mats.map(([nome, min]) => `${nome} (${duracao(min)})`).join(' · ')
      : `${duracao(d.minutos)} de estudo`;
    d.linha = `${duracao(d.minutos)} · ${d.sessoes} ${d.sessoes === 1 ? 'sessão' : 'sessões'}`
      + (d.sequencia > 1 ? ` · ${d.sequencia}º dia seguido` : '');
  }

  return ordem.reverse().slice(0, limite);
}

/** Um resumo curto para o cabeçalho do diário. */
export function resumoDoDiario(dias = []) {
  if (!dias.length) return null;
  const minutos = dias.reduce((s, d) => s + d.minutos, 0);
  const marcos = dias.reduce((s, d) => s + (d.marcos?.length || 0), 0);
  return {
    dias: dias.length,
    minutos,
    horas: Math.round((minutos / 60) * 10) / 10,
    marcos,
    maiorSequencia: Math.max(...dias.map((d) => d.sequencia || 0)),
  };
}
