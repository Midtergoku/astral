/* ═══════════════════════════════════════════════════════════════════════════
   CRONOGRAMA -- a semana de estudo, montada a partir da ROTINA da pessoa.

   POR QUE EXISTE (28/09/2026)
   Havia DUAS contas para a mesma pergunta, e elas nao se falavam:
   - a pagina Cronograma punha 3 materias em todo dia, girando a lista, com
     XP de "peso x 5" (+100 numa sessao de 40 min);
   - a "Sessao de hoje" do dashboard era montada UMA vez, quando o edital
     chegava, e nunca se renovava -- marcou as tres, ficavam marcadas para
     sempre --, com XP de "meio por minuto" (+20 nos mesmos 40 min).
   Na conta simulada do dono, a segunda-feira dizia Portugues/Matematica/
   Fisica numa tela e Fisica/Quimica/Matematica na outra.

   E nenhuma das duas perguntava a rotina. Ele: "em nenhum momento foi
   perguntado da minha rotina, como vamos montar um cronograma individual".

   Agora e UMA conta, aqui, usada pelas duas telas:
     rotina (dias, minutos, bloco)  +  materias (peso, progresso)
       -> a semana: 7 dias, cada um com seus blocos

   REGRAS
   - So estuda nos dias que a pessoa marcou. O resto e folga.
   - O tempo de cada materia na semana e proporcional a NECESSIDADE
     (peso x o que falta dominar -- plano.js). Materia pesada e fraca ganha
     mais tempo; a ja dominada, menos. E o "rebalancear" acontecendo sozinho.
   - No mesmo dia, a mesma materia nao se repete enquanto houver outra.
   - O XP de cada bloco e a MESMA regra do servidor para sessao declarada
     (migration 20260928100000): meio por minuto, minimo 10. O que a tela
     promete e o que o servidor paga.
     09/10/2026 (GAM-08, decisao 13): 2 por minuto -- igual ao cronometro.
   - Se a pessoa editou a semana a mao, vale a semana dela.

   Deterministico: mesma rotina e mesmas materias, mesma semana. Nada de
   sorteio -- cronograma que muda a cada visita nao e cronograma.
   ═══════════════════════════════════════════════════════════════════════════ */

import { necessidadeDe } from './plano.js';
import { duracao, diaDaSemanaSP, hojeSP, diasEntre } from './formato.js';

export const DIAS = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
export const DIAS_CURTOS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

/* Quem pula o questionario (ou quem ainda nao respondeu) estuda com isto:
   segunda a sabado, 2 h nos dias uteis, 2 h no sabado, blocos de 40 min.
   E o mesmo tamanho de dia que o cronograma antigo usava. */
export const ROTINA_PADRAO = Object.freeze({
  dias: [1, 2, 3, 4, 5, 6],
  minutosUtil: 120,
  minutosFds: 120,
  bloco: 40,
});

const BLOCOS_VALIDOS = [25, 30, 40, 50, 60];

/* 09/10/2026 (auditoria CRO-05, roadmap 3.14): normalizarRotina troca valor
   invalido pelo padrao SEM dizer nada. Pelo questionario nao acontece (ele so
   oferece valores validos), mas uma rotina gravada por versao antiga ou pelo
   console virava outra e a tela mostrava a outra como se fosse a dela.
   Esta diz O QUE foi trocado -- a tela avisa. Lista vazia = nada trocado. */
export function correcoesDaRotina(r) {
  if (!r || typeof r !== 'object' || r.pulou) return [];
  const fora = [];
  const minutosOk = (v) => { const n = Math.round(Number(v)); return Number.isFinite(n) && n >= 0 && n <= 600; };
  if (!Array.isArray(r.dias) || !r.dias.map(Number).some((d) => d >= 0 && d <= 6)) fora.push('dias de estudo');
  if ('minutosUtil' in r && !minutosOk(r.minutosUtil)) fora.push('tempo nos dias úteis');
  if ('minutosFds' in r && !minutosOk(r.minutosFds)) fora.push('tempo no fim de semana');
  if ('bloco' in r && !BLOCOS_VALIDOS.includes(Number(r.bloco))) fora.push('duração da sessão');
  if (r.semana != null && !(Array.isArray(r.semana) && r.semana.length === 7)) fora.push('semana ajustada à mão');
  return fora;
}

/** A rotina, sempre num formato valido -- o que vem do banco pode estar velho. */
export function normalizarRotina(r) {
  const base = { ...ROTINA_PADRAO, semana: null };
  if (!r || typeof r !== 'object') return base;
  const dias = Array.isArray(r.dias)
    ? [...new Set(r.dias.map(Number).filter((d) => d >= 0 && d <= 6))].sort()
    : base.dias;
  const minutos = (v, padrao) => {
    const n = Math.round(Number(v));
    return Number.isFinite(n) && n >= 0 && n <= 600 ? n : padrao;
  };
  return {
    dias: dias.length ? dias : base.dias,
    minutosUtil: minutos(r.minutosUtil, base.minutosUtil),
    minutosFds: minutos(r.minutosFds, base.minutosFds),
    bloco: BLOCOS_VALIDOS.includes(Number(r.bloco)) ? Number(r.bloco) : base.bloco,
    semana: Array.isArray(r.semana) && r.semana.length === 7 ? r.semana : null,
  };
}

/** O XP de um bloco -- a regra do servidor para sessao do cronograma. */
/* 09/10/2026 (auditoria GAM-08, decisao dele na pergunta 13: "a mesma hora vale o mesmo XP,
   cronometrada ou marcada"). Era meio XP por minuto (minimo 10) -- o bloco de 40 min mostrava
   "+20 XP" e os mesmos 40 min no cronometro davam 80. Agora 2 por minuto inteiro, a MESMA regra
   do servidor para as duas (validar_sessao_estudo, migration 20261009110000). */
export function xpDoBloco(minutos) {
  const m = Math.floor(Number(minutos) || 0);
  return m >= 1 ? m * 2 : 0;
}

const ehFimDeSemana = (d) => d === 0 || d === 6;

/** Em quantos blocos um dia se divide, e de quantos minutos cada. */
function blocosDoDia(orcamento, bloco) {
  if (orcamento < 15) return [];
  // Para CIMA: a pessoa disse quanto aguenta sem parar -- bloco nenhum passa disso.
  const n = Math.max(1, Math.ceil(orcamento / bloco));
  const base = Math.floor(orcamento / n / 5) * 5;
  const blocos = Array(n).fill(base);
  // O que sobra da divisao vai, de 5 em 5, para os primeiros blocos.
  let resto = orcamento - base * n;
  for (let i = 0; resto >= 5; i = (i + 1) % n, resto -= 5) blocos[i] += 5;
  return blocos;
}

/** O numero da semana de estudo (comeca na SEGUNDA, no fuso de Sao Paulo).
    Muda uma vez por semana, igual para todas as telas -- e a "vez" do rodizio. */
export function numeroDaSemana(agora = new Date()) {
  const diaSP = Math.floor((agora.getTime() - 3 * 3600e3) / 86400e3);   // SP = UTC-3, sem horario de verao desde 2019
  return Math.floor((diaSP + 3) / 7);                                   // 01/01/1970 foi quinta: +3 alinha na segunda
}

/* 03/10/2026 (auditoria CRO-01, roadmap 2.4): com rotina CURTA -- menos blocos
   na semana do que materias no edital -- a conta por necessidade dava os
   blocos sempre as mesmas: com 1 dia de 1 h, Historia, Geografia e
   Informatica NUNCA apareciam em 52 semanas simuladas. E a materia que nunca
   e estudada continua com 0%, entao nunca ganhava a vez. A tela prometia
   "toda materia aparece pelo menos uma vez".
   Agora, quando falta bloco: METADE dos blocos (para baixo) vai para as de
   maior necessidade; o resto RODA por uma lista fixa (peso, depois nome),
   andando a cada semana. Toda materia aparece pelo menos a cada
   ceil(materias / blocos que rodam) semanas. */
function escolherNaRotinaCurta(vivas, vagas, semanaN) {
  const porNecessidade = vivas.map((m, i) => i)
    .sort((a, b) => necessidadeDe(vivas[b]) - necessidadeDe(vivas[a]) || (Number(vivas[b].peso) || 0) - (Number(vivas[a].peso) || 0));
  const fixas = porNecessidade.slice(0, Math.floor(vagas / 2));
  const giram = vagas - fixas.length;
  const roda = vivas.map((m, i) => i)
    .sort((a, b) => (Number(vivas[b].peso) || 0) - (Number(vivas[a].peso) || 0) || String(vivas[a].nome).localeCompare(String(vivas[b].nome)));
  const escolhidas = new Set(fixas);
  const inicio = ((semanaN * giram) % roda.length + roda.length) % roda.length;
  for (let k = 0; escolhidas.size < vagas && k < roda.length; k++) escolhidas.add(roda[(inicio + k) % roda.length]);
  return escolhidas;
}

/* ── A DATA DA PROVA (09/10/2026, auditoria CRO-03, roadmap 3.14) ─────────
   O cronograma nunca lia a data da prova. Com 5 dias para a prova ele era
   igual ao de quem tem meses, seguia montando blocos DEPOIS da prova, e o
   chefe dizia "nao abra frente nova" ao lado de um plano que abria.
   Agora:
   - o DIA da prova e os dias DEPOIS dela, nesta semana, ficam sem bloco;
   - nos 7 dias antes da prova so entram materias JA ESTUDADAS (dominio > 0) --
     se nenhuma foi estudada ainda, entram todas (nao ha o que reforcar);
   - prova que passou ANTES desta semana nao muda o plano: a tela pergunta
     pelo proximo concurso (ou pela data certa), e o plano segue.
   A data e a do edital (DD/MM/AAAA), a mesma que o aluno corrige no painel. */
function somaDias(iso, n) {
  const [a, m, d] = iso.split('-').map(Number);
  return new Date(Date.UTC(a, m - 1, d + n)).toISOString().slice(0, 10);
}

/** As datas (AAAA-MM-DD, Sao Paulo) da semana de estudo de hoje, por dia (0 = domingo, o ULTIMO). */
export function datasDaSemanaISO(agora = new Date()) {
  const segunda = somaDias(hojeSP(agora), -((diaDaSemanaSP(agora) + 6) % 7));
  return Array.from({ length: 7 }, (_, dia) => somaDias(segunda, (dia + 6) % 7));
}

/** 'DD/MM/AAAA' (o edital) ou 'AAAA-MM-DD' -> 'AAAA-MM-DD', ou null. */
export function provaISO(data) {
  const s = String(data || '');
  let m = s.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (m) return `${m[3]}-${m[2]}-${m[1]}`;
  m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${m[1]}-${m[2]}-${m[3]}` : null;
}

/** Onde a prova cai em relacao a esta semana. null = sem data. */
export function provaNaSemana(dataProva, agora = new Date()) {
  const data = provaISO(dataProva);
  if (!data) return null;
  const datas = datasDaSemanaISO(agora);
  const nestaSemana = data >= datas[1] && data <= datas[0];
  const depois = datas.map((d) => data >= datas[1] && d >= data);          // dia da prova e os seguintes
  const reta = datas.map((d) => { const n = diasEntre(d, data); return n >= 1 && n <= 7; });
  return {
    data,
    datas,
    dias: diasEntre(hojeSP(agora), data),
    nestaSemana,
    passouAntes: data < datas[1],          // acabou antes desta semana: o plano segue, a tela pergunta
    depois,
    reta,
    retaFinal: reta.some(Boolean),
  };
}

/**
 * A semana. Devolve 7 dias (0 = domingo), cada um:
 *   { dia, estuda, blocos: [{ materia, minutos, xp }] }
 * e, quando a prova mexe no dia: prova: 'dia' | 'depois', retaFinal: true.
 * `semana` (opcional) e o numero da semana -- so muda o rodizio da rotina
 * curta. Sem ele, e a semana de hoje. `prova` e a data do edital (DD/MM/AAAA).
 */
export function montarSemana(materias = [], rotinaBruta = null, { agora = new Date(), semana: semanaN = numeroDaSemana(agora), prova = null } = {}) {
  const rotina = normalizarRotina(rotinaBruta);
  const vivas = (materias || []).filter((m) => m && m.nome);
  const nomes = new Set(vivas.map((m) => m.nome));
  const p = provaNaSemana(prova, agora);
  const marcaProva = (d, dia) => {
    if (!p) return d;
    if (p.depois[dia]) return { ...d, estuda: false, blocos: [], prova: p.datas[dia] === p.data ? 'dia' : 'depois' };
    return p.reta[dia] ? { ...d, retaFinal: true } : d;
  };

  // A semana editada a mao manda -- menos materia que saiu do edital.
  if (rotina.semana) {
    return rotina.semana.map((blocos, dia) => {
      const limpos = (Array.isArray(blocos) ? blocos : [])
        .filter((b) => b && nomes.has(b.materia))
        .map((b) => {
          const minutos = Math.min(240, Math.max(5, Math.round(Number(b.minutos) || 0)));
          return { materia: b.materia, minutos, xp: xpDoBloco(minutos) };
        });
      // A data da prova vale tambem aqui: depois da prova nao ha o que estudar PARA ela.
      return marcaProva({ dia, estuda: limpos.length > 0, blocos: limpos, editado: true }, dia);
    });
  }

  const semana = Array.from({ length: 7 }, (_, dia) => {
    const estuda = rotina.dias.includes(dia) && !(p && p.depois[dia]);
    const orcamento = estuda ? (ehFimDeSemana(dia) ? rotina.minutosFds : rotina.minutosUtil) : 0;
    return { dia, estuda: estuda && orcamento > 0, vagas: blocosDoDia(orcamento, rotina.bloco), blocos: [] };
  });
  if (!vivas.length) return semana.map(({ vagas, ...d }) => ({ ...d, estuda: false }));

  // Quanto cada materia "merece" da semana: pela necessidade. Se tudo ja foi
  // dominado (necessidade zero em todas), volta para o peso.
  let peso = vivas.map((m) => necessidadeDe(m));
  if (!peso.some((p) => p > 0)) peso = vivas.map((m) => Number(m.peso) || 1);
  const soma = peso.reduce((a, b) => a + b, 0) || 1;
  const totalMin = semana.reduce((s, d) => s + d.vagas.reduce((a, b) => a + b, 0), 0);
  const vagas = semana.reduce((s, d) => s + d.vagas.length, 0);
  // Piso de UM bloco por semana para toda materia, quando cabe: a ja
  // dominada nao pode sumir -- sem revisao, o dominio vai embora. Foi a
  // mesma reclamacao dele sobre o cronograma antigo (plano.js).
  const piso = vagas >= vivas.length ? totalMin / Math.max(1, vagas) : 0;
  const alvo = peso.map((p) => Math.max((p / soma) * totalMin, piso));
  const dado = vivas.map(() => 0);
  // Rotina curta: so as escolhidas desta semana entram (ver escolherNaRotinaCurta).
  const nestaSemana = vagas > 0 && vagas < vivas.length ? escolherNaRotinaCurta(vivas, vagas, semanaN) : null;

  // Reta final (CRO-03): so o que ja foi estudado -- "nao abra frente nova".
  const estudada = vivas.map((m) => (Number(m.progresso) || 0) > 0);
  const algumaEstudada = estudada.some(Boolean);

  // Segunda primeiro: a semana de estudo comeca na segunda, e o domingo
  // (quando ha) fica com o que sobrou -- revisao do que ficou para tras.
  for (const dia of [1, 2, 3, 4, 5, 6, 0]) {
    const d = semana[dia];
    const hoje = new Set();
    const reta = !!(p && p.reta[dia] && algumaEstudada);
    // Quem pode entrar hoje: na reta final, as estudadas (o rodizio da rotina
    // curta nao vale -- todas as estudadas disputam); fora dela, o rodizio.
    const podem = vivas.map((m, i) => i).filter((i) => reta ? estudada[i] : (!nestaSemana || nestaSemana.has(i)));
    if (p && p.reta[dia]) d.retaFinal = true;
    for (const minutos of d.vagas) {
      let melhor = -1, falta = -Infinity;
      for (const i of podem) {
        if (hoje.has(i) && hoje.size < podem.length) continue;     // nao repete no dia
        const f = alvo[i] - dado[i];
        if (f > falta + 1e-9 || (Math.abs(f - falta) <= 1e-9 && (Number(vivas[i].peso) || 0) > (Number(vivas[melhor]?.peso) || 0))) {
          melhor = i; falta = f;
        }
      }
      if (melhor < 0) break;
      hoje.add(melhor);
      dado[melhor] += minutos;
      d.blocos.push({ materia: vivas[melhor].nome, minutos, xp: xpDoBloco(minutos) });
    }
  }
  return semana.map(({ vagas, ...d }) => marcaProva(d, d.dia));
}

/* 09/10/2026 (auditoria CRO-04, roadmap 3.14): a semana editada a mao nao
   acompanha o edital. Trocou de edital, ou a correcao trouxe materia nova: a
   que entrou NAO aparece (e a que saiu some calada -- de 720 para 240 min no
   teste da auditoria). Esta diz quais materias do edital estao fora da semana
   editada; a tela avisa e oferece incluir. Sem semana editada: lista vazia. */
export function foraDaSemanaEditada(materias = [], rotinaBruta = null) {
  const rotina = normalizarRotina(rotinaBruta);
  if (!rotina.semana) return [];
  const usadas = new Set(rotina.semana.flatMap((b) => (Array.isArray(b) ? b : []).map((x) => x?.materia)));
  return (materias || []).filter((m) => m?.nome && !usadas.has(m.nome)).map((m) => m.nome);
}

/** A semana editada com as materias que faltam: um bloco cada, no dia de estudo mais leve. */
export function incluirNaSemanaEditada(materias = [], rotinaBruta = null) {
  const rotina = normalizarRotina(rotinaBruta);
  if (!rotina.semana) return rotina.semana;
  const nomes = new Set((materias || []).map((m) => m?.nome).filter(Boolean));
  // a que saiu do edital sai tambem da semana gravada -- a tela ja nao a mostrava
  const semana = rotina.semana.map((b) => (Array.isArray(b) ? b : []).filter((x) => x && nomes.has(x.materia)).map((x) => ({ materia: x.materia, minutos: x.minutos })));
  const dias = rotina.dias.length ? rotina.dias : [1, 2, 3, 4, 5, 6];
  for (const nome of foraDaSemanaEditada(materias, rotinaBruta)) {
    const carga = (d) => semana[d].reduce((s, x) => s + (Number(x.minutos) || 0), 0);
    const dia = [...dias].sort((a, b) => carga(a) - carga(b) || ((a + 6) % 7) - ((b + 6) % 7))[0];
    semana[dia].push({ materia: nome, minutos: rotina.bloco });
  }
  return semana;
}

/** Os blocos de hoje, e quais ja foram feitos -- pelas sessoes gravadas HOJE. */
export function blocosDeHoje(semana, sessoesDeHoje = [], agora = new Date()) {
  // 04/10/2026 (NUM-05): o dia da semana de Sao Paulo -- o mesmo "hoje" das
  // sessoes que pagam o bloco. No Acre, as 22h30, eram dias diferentes.
  const dia = semana?.[diaDaSemanaSP(agora)];
  if (!dia) return [];
  // Cada sessao do cronograma de hoje "paga" um bloco da mesma materia, na ordem.
  /* 03/10/2026 (auditoria NUM-04, roadmap 2.7): o TEMPO MEDIDO tambem paga.
     Antes so a sessao marcada no cronograma contava: quem estudava o bloco
     pelo cronometro (que ja vem com a materia do bloco escolhida) via o bloco
     desmarcado, marcava, e o mesmo tempo contava DUAS vezes.
     Agora os minutos medidos (livre/pomodoro) da materia vao abatendo os
     blocos dela, na ordem. Bloco com 75% ou mais medido esta feito; o que
     ficou pela metade mostra o que FALTA -- e marcar grava so o que falta. */
  const chave = (m) => String(m || '').toLowerCase();
  const pagas = {}, medidos = {};
  for (const s of sessoesDeHoje || []) {
    if (!s.materia) continue;
    const k = chave(s.materia);
    if (s.modo === 'cronograma') pagas[k] = (pagas[k] || 0) + 1;
    else if (s.modo === 'livre' || s.modo === 'pomodoro') medidos[k] = (medidos[k] || 0) + (Number(s.segundos) || 0) / 60;
  }
  return dia.blocos.map((b) => {
    const k = chave(b.materia);
    if ((pagas[k] || 0) > 0) { pagas[k]--; return { ...b, feito: true, restante: 0, medido: 0 }; }
    const tem = medidos[k] || 0;
    if (tem >= b.minutos * 0.75) {
      medidos[k] = Math.max(0, tem - b.minutos);
      return { ...b, feito: true, restante: 0, medido: Math.min(b.minutos, Math.round(tem)) };
    }
    medidos[k] = 0;
    const medido = Math.round(tem);
    return { ...b, feito: false, restante: Math.max(5, b.minutos - medido), medido };
  });
}

/** "Seg a Sáb · 2h nos dias úteis · 3h no fim de semana · sessões de até 40 min" */
export function resumoDaRotina(rotinaBruta) {
  const r = normalizarRotina(rotinaBruta);
  if (r.semana) return 'semana ajustada à mão';
  const horas = duracao;                     // 01/10/2026: formato unico (formato.js)
  const d = r.dias;
  const seguidos = d.length > 2 && d.every((x, i) => i === 0 || x === d[i - 1] + 1);
  const dias = seguidos ? `${DIAS_CURTOS[d[0]]} a ${DIAS_CURTOS[d[d.length - 1]]}` : d.map((x) => DIAS_CURTOS[x]).join(', ');
  const temFds = d.some(ehFimDeSemana), temUtil = d.some((x) => !ehFimDeSemana(x));
  const partes = [dias];
  if (temUtil && temFds && r.minutosUtil !== r.minutosFds) {
    partes.push(`${horas(r.minutosUtil)} nos dias úteis`, `${horas(r.minutosFds)} no fim de semana`);
  } else {
    partes.push(`${horas(temUtil ? r.minutosUtil : r.minutosFds)} por dia`);
  }
  partes.push(`sessões de até ${r.bloco} min`);
  return partes.join(' · ');
}
