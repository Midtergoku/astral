/* ═══════════════════════════════════════════════════════════════════════════
   O CHEFE  (R3)

   Ordem dele em 18/09: a prova vira o chefe da campanha, com contagem
   regressiva. "Achei maneiríssimo."

   ── POR QUE ISTO NAO E SO UM CONTADOR ──────────────────────────────────────
   A contagem ja existia -- em `calendario.html`, num cartao chamado "Dias ate
   a prova". O problema nao era falta de numero: era o numero estar numa pagina
   que quase ninguem abre, e nao dizer nada alem do numero.

   🔴 E CONTAGEM REGRESSIVA SOZINHA E PERIGOSA NESTE PRODUTO. Quem presta
   concurso militar ja vive com essa data na cabeca. Um numero vermelho
   piscando "faltam 43 dias" nao informa nada que a pessoa nao saiba, e mexe
   com a unica coisa que atrapalha estudo mais que preguica: ansiedade.
   Concurseiro assustado estuda MENOS, nao mais.

   Entao o chefe tem tres partes, e a terceira e a que justifica a primeira:

     QUANTO FALTA   os dias -- o que ja existia
     COMO VOCE ESTA o preparo, derivado da ficha -- o que faltava
     O QUE FAZER    a materia mais fraca, nomeada -- o que transforma a
                    contagem em direcao em vez de pressao

   Sem a terceira, isto seria um relogio de ansiedade com tema militar.
*/

import { hojeSP, diasEntre } from './formato.js';

/* Dias ate a data. Mesma conta de `calendario.html` de proposito -- duas contas
   diferentes dariam dois numeros diferentes na mesma tela, e ninguem saberia
   qual acreditar. (O calendario agora IMPORTA esta, desde 04/10.)
   04/10/2026 (NUM-05, roadmap 3.9): "hoje" e o de Sao Paulo, nao o do aparelho. */
export function diasAte(dataStr, agora = new Date()) {
  if (!dataStr) return null;
  return diasEntre(hojeSP(agora), dataStr);
}

/* As fases da campanha. O tom muda com o tempo, mas NUNCA vira panico:
   a fase mais apertada fala de foco, nao de desespero. E quando o tempo e
   curto, o conselho muda de "amplie" para "reforce o que ja sabe" -- que e o
   que de fato rende numa reta final. */
const FASES = [
  { ate: 0,   nome: 'O dia chegou',   tom: 'agora',  frase: 'É hoje. Você se preparou para isto.' },
  { ate: 7,   nome: 'Reta final',     tom: 'urgente', frase: 'Última semana. Reforce o que você já domina — não abra frente nova.' },
  { ate: 30,  nome: 'Aproximação',    tom: 'urgente', frase: 'Menos de um mês. É hora de revisar mais do que aprender.' },
  // 30/09/2026 (auditoria, item 14): a frase dizia "Tres meses" para a faixa
  // inteira de 31 a 90 dias -- com 67 dias, nao sao tres meses.
  { ate: 90,  nome: 'Preparação',     tom: 'medio',   frase: 'Menos de três meses: tempo de consolidar. Ataque as matérias mais fracas agora.' },
  { ate: 999, nome: 'Campanha longa', tom: 'calmo',   frase: 'Tempo de sobra para construir base. Constância vale mais que intensidade.' },
];

function faseDe(dias) {
  return FASES.find((f) => dias <= f.ate) || FASES[FASES.length - 1];
}

/* O PREPARO, de 0 a 100.

   Nao e chute: sao dois atributos da ficha, que ja vem calculados pelo
   servidor a partir das sessoes reais.

     DOUTRINA   70%  quanto voce domina -- e o que a prova cobra
     AMPLITUDE  30%  se nenhuma materia ficou para tras

   O peso maior e da doutrina porque prova cobra conteudo, nao habito. A
   amplitude entra porque zerar uma materia inteira derruba a nota mesmo com
   as outras altas -- e o proprio produto ja sabe disso: e o mesmo raciocinio
   do balanceamento do cronograma.

   DISCIPLINA e RESISTENCIA ficam DE FORA de proposito: elas dizem como voce
   estuda, nao o quanto voce sabe. Quem estuda todo dia ha uma semana tem
   disciplina alta e preparo baixo, e misturar as duas faria o numero mentir
   justamente para quem mais precisa de verdade. */
export function preparoDe(fatos) {
  const d = Number(fatos?.atributos?.doutrina?.valor) || 0;
  const a = Number(fatos?.atributos?.amplitude?.valor) || 0;
  return Math.round(d * 0.7 + a * 0.3);
}

/* A materia mais fraca com PESO -- a que mais custa caro deixar como esta.
   Peso vezes o que falta: uma materia de peso 3 em 40% custa mais que uma de
   peso 1 em 20%, e e nela que vale gastar a proxima hora. */
/* 09/10/2026 (auditoria CRO-03, roadmap 3.14): `soEstudadas` -- na reta final
   o chefe dizia "nao abra frente nova" e logo abaixo "Revise Portugues", uma
   materia com 0% que o aluno nunca tinha estudado. Na reta final o ponto fraco
   e o mais fraco DO QUE JA FOI ESTUDADO (a mesma regra do cronograma). */
export function pontoFraco(materias = [], { soEstudadas = false } = {}) {
  const vivas = (materias || []).filter((m) => m?.nome && (!soEstudadas || (Number(m.progresso) || 0) > 0));
  if (!vivas.length) return null;
  const pior = vivas
    .map((m) => ({
      nome: m.nome,
      progresso: Math.max(0, Math.min(100, Number(m.progresso) || 0)),
      peso: Math.max(1, Number(m.peso) || 1),
    }))
    .map((m) => ({ ...m, custo: m.peso * (100 - m.progresso) }))
    .sort((a, b) => b.custo - a.custo)[0];
  return pior && pior.progresso < 100 ? pior : null;
}

/**
 * Monta o chefe a partir do evento de prova e dos fatos.
 * Devolve `null` quando nao ha prova marcada -- a tela decide o que dizer.
 */
export function chefeDe(eventoProva, fatos) {
  if (!eventoProva?.data) return null;
  const dias = diasAte(eventoProva.data);
  if (dias === null) return null;

  // Prova que ja passou nao e mais chefe. Continua no calendario como
  // historico, mas nao ocupa o dashboard cobrando algo que ja aconteceu.
  if (dias < 0) return null;

  const preparo = preparoDe(fatos);
  const fase = faseDe(dias);
  const retaFinal = dias >= 1 && dias <= 7;
  const fraco = pontoFraco(fatos?.materias, { soEstudadas: retaFinal });

  return {
    nome: eventoProva.nome || 'Sua prova',
    data: eventoProva.data,
    dias,
    fase: fase.nome,
    tom: fase.tom,
    frase: fase.frase,
    preparo,
    fraco,
    /* O conselho concreto. Vem por ultimo de proposito: e a unica parte que
       diz o que FAZER, e sem ela o resto e so pressao. */
    conselho: conselhoDe(dias, retaFinal, fraco, fatos?.materias),
  };
}

function conselhoDe(dias, retaFinal, fraco, materias) {
  if (dias === 0) return 'Durma bem, chegue cedo e leve o documento. O estudo já está feito.';
  if (retaFinal) {
    if (fraco) return `Revise ${fraco.nome} — das que você já estudou, é onde mais perde ponto.`;
    // nada estudado ainda: nao ha o que reforcar, e mandar "revisar" seria mentir
    if (!(materias || []).some((m) => (Number(m?.progresso) || 0) > 0) && (materias || []).length) {
      return 'Faça questões das matérias de maior peso — na última semana, questão rende mais que teoria nova.';
    }
    return 'Todas as matérias estão em dia. Mantenha o ritmo.';
  }
  if (!fraco) return 'Todas as matérias estão em dia. Mantenha o ritmo.';
  if (dias <= 30) {
    // "Revise" o que nunca foi estudado nao faz sentido -- e o caso do 0%
    return fraco.progresso > 0
      ? `Revise ${fraco.nome} — é onde você mais perde ponto.`
      : `Comece ${fraco.nome}: peso ${fraco.peso} e nada estudado ainda — é onde você mais perde ponto.`;
  }
  return `Ataque ${fraco.nome}: peso ${fraco.peso} e ${fraco.progresso}% de domínio.`;
}

/* 09/10/2026 (CRO-03): a prova PASSOU. O chefe some (cobrar algo que ja
   aconteceu nao faz sentido), mas antes nada perguntava o que vem agora --
   a semana seguia igual, para uma prova que ja tinha sido feita. Este e o
   texto do cartao que fica no lugar dele. null = a prova nao passou. */
export function provaPassadaDe(eventoProva, agora = new Date()) {
  if (!eventoProva?.data) return null;
  const dias = diasAte(eventoProva.data, agora);
  if (dias === null || dias >= 0) return null;
  const [a, m, d] = String(eventoProva.data).slice(0, 10).split('-');
  return {
    nome: eventoProva.nome || 'Sua prova',
    data: `${d}/${m}/${a}`,
    diasDepois: -dias,
  };
}
