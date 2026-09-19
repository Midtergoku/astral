/* ═══════════════════════════════════════════════════════════════════════════
   O MOTOR — quem confere as condecoracoes e as divisas  (R13)

   Uma funcao pura: recebe os FATOS (que vieram do servidor) e o CATALOGO, e
   devolve o que foi conquistado. Nao busca nada, nao grava nada, nao toca na
   tela. Isso e de proposito e tem tres consequencias boas:

     1. da para testar sem banco e sem navegador -- e o `testa-motor.js` roda
        em milissegundos, com dezenas de cenarios inventados;
     2. a mesma resposta sai sempre dos mesmos fatos, entao nao ha estado para
        guardar -- e o que nao se guarda nao se falsifica;
     3. quando o dia chegar de subir a conferencia para o servidor (ver o
        cabecalho de `fatos_do_usuario`), e esta funcao que se traduz, e so ela.

   🔴 A REGRA QUE ESTE ARQUIVO NAO PODE QUEBRAR: condicao de tipo desconhecido
   NAO concede a medalha. Um erro de digitacao no catalogo tem de resultar em
   medalha que nao cai -- nunca em medalha que cai para todo mundo. Falhar para
   o lado seguro, sempre.
*/

/* 🔴 SEM carimbo de versao no import, e a razao nao e estilo.
   A convencao do projeto e: HTML -> modulo leva `?v=`, modulo -> modulo NAO
   (ver .claude/rules/paginas.md, secao 9). Eu tinha escrito `catalogo.js?v=1`
   aqui e o teste pegou na hora: URL diferente e MODULO DIFERENTE, entao o
   navegador carregaria o catalogo DUAS VEZES, e cada metade do sistema falaria
   com uma copia. No teste, a copia que ele alterou nao era a que o motor lia. */
import { CONDECORACOES, DIVISAS, METAIS, RARIDADES } from './catalogo.js';

/* Quanto de uma condicao ja foi cumprido, de 0 a 1.
   Serve para duas coisas: dizer se caiu (>= 1) e desenhar a barra de "falta
   pouco". Barra de progresso e metade da graca do sistema de trofeus -- ver
   um 8/10 puxa mais que um "nao conquistado". */
function progressoDe(cond, f, jaTem) {
  if (!cond || !f) return 0;
  const frac = (atual, alvo) => (alvo > 0 ? Math.min(1, (Number(atual) || 0) / alvo) : 0);
  const conta = (mapa, chaves) => chaves.reduce((s, k) => s + (Number(mapa?.[k]) || 0), 0);

  switch (cond.tipo) {
    case 'sessoes':        return frac(f.sessoes, cond.min);
    case 'horas':          return frac(f.horas, cond.min);
    case 'xp':             return frac(f.xp, cond.min);
    case 'streak':         return frac(f.streak, cond.min);
    case 'sessaoUnica':    return frac(f.maiorSessaoMin, cond.minutosMin);
    case 'sessoesNoDia':   return frac(f.sessoesNoDiaMax, cond.quantas);
    case 'horasNoDia':     return frac(f.horasNoDiaMax, cond.min);
    case 'materiasNoDia':  return frac(f.materiasNoDiaMax, cond.quantas);
    case 'diasEstudados':  return frac(f.diasEstudados, cond.min);
    case 'meses':          return frac(f.meses, cond.min);
    case 'semanaPerfeita': return frac(f.semanasPerfeitas, cond.vezes);
    case 'materiaSeguida': return frac(f.materiaSeguidaMax, cond.dias);
    case 'retorno':        return frac(f.maiorRetornoDias, cond.diasSumidoMin);
    case 'edital':         return f.temEdital ? 1 : 0;

    case 'atributo':
      return frac(f.atributos?.[cond.chave]?.valor, cond.min);

    case 'atributosTodos': {
      // Todos ao mesmo tempo -- o progresso e o do PIOR deles, senao a barra
      // mentiria dizendo "quase la" com um atributo zerado.
      const partes = (cond.chaves || []).map((k) => frac(f.atributos?.[k]?.valor, cond.min));
      return partes.length ? Math.min(...partes) : 0;
    }

    case 'materias': {
      const quantas = (f.materias || [])
        .filter((m) => Number(m?.progresso) >= cond.dominioMin).length;
      return frac(quantas, cond.quantas);
    }

    case 'dominioMinimo':  return frac(f.dominioMinimo, cond.min);
    case 'materiaMenosEstudada': return frac(f.dominioMenosEstudada, cond.dominioMin);

    case 'materiaDominada': {
      // O nome da materia vem do edital, entao varia: "Português", "Língua
      // Portuguesa", "portugues". Compara sem acento e sem caixa.
      const alvo = (cond.materias || []).map(semAcento);
      const bate = (f.materias || []).some((m) =>
        alvo.includes(semAcento(m?.nome || '')) && Number(m?.progresso) >= cond.dominioMin);
      return bate ? 1 : 0;
    }

    case 'horario': {
      const horas = [];
      for (let h = cond.deHora; h < cond.ateHora; h++) horas.push(String(h));
      return frac(conta(f.porHora, horas), cond.vezes);
    }

    case 'diaSemana':
      return frac(conta(f.porDiaSemana, (cond.dias || []).map(String)), cond.vezes);

    case 'modo':
      return frac(f.porModo?.[cond.modo], cond.vezes);

    case 'condecoracao':
      return jaTem?.has(cond.id) ? 1 : 0;

    case 'todas': {
      // A platina. O denominador exclui ela propria, senao nunca chegaria a 1.
      const fora = new Set(cond.exceto || []);
      const alvos = CONDECORACOES.filter((c) => !fora.has(c.id));
      const tem = alvos.filter((c) => jaTem?.has(c.id)).length;
      return frac(tem, alvos.length);
    }

    default:
      // 🔴 Tipo desconhecido = nao concede. Ver o cabecalho.
      return 0;
  }
}

function semAcento(s) {
  return String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
}

/**
 * Confere tudo contra os fatos.
 *
 * Devolve `{ condecoracoes, divisas, resumo }`, cada item com `conquistada` e
 * `progresso` (0 a 1). NAO filtra as secretas -- quem decide o que mostrar e a
 * tela, porque a mesma lista serve para o painel (esconde) e para o momento da
 * descoberta (revela).
 */
export function conferir(fatos) {
  const jaTem = new Set();

  /* Duas passadas, e a ordem importa: "condecoracao" e "todas" dependem do que
     ja caiu. Uma passada so daria resultado diferente conforme a ordem da lista
     no arquivo -- bug silencioso e chato de achar. A primeira resolve tudo que
     nao depende de ninguem; a segunda resolve os dependentes. */
  const diretas = CONDECORACOES.filter((c) => !['condecoracao', 'todas'].includes(c.condicao?.tipo));
  const dependentes = CONDECORACOES.filter((c) => ['condecoracao', 'todas'].includes(c.condicao?.tipo));

  const avaliadas = new Map();
  for (const c of diretas) {
    const p = progressoDe(c.condicao, fatos, jaTem);
    if (p >= 1) jaTem.add(c.id);
    avaliadas.set(c.id, p);
  }
  for (const c of dependentes) {
    const p = progressoDe(c.condicao, fatos, jaTem);
    if (p >= 1) jaTem.add(c.id);
    avaliadas.set(c.id, p);
  }

  const condecoracoes = CONDECORACOES.map((c) => ({
    ...c,
    metalInfo: METAIS[c.metal],
    progresso: avaliadas.get(c.id) ?? 0,
    conquistada: jaTem.has(c.id),
  }));

  const divisas = DIVISAS.map((d) => {
    const p = progressoDe(d.condicao, fatos, jaTem);
    return {
      ...d,
      raridadeInfo: RARIDADES[d.raridade],
      progresso: p,
      conquistada: p >= 1,
    };
  });

  const ganhas = condecoracoes.filter((c) => c.conquistada);
  const resumo = {
    total: condecoracoes.length,
    conquistadas: ganhas.length,
    porMetal: Object.fromEntries(Object.keys(METAIS).map((m) => [
      m,
      {
        total: condecoracoes.filter((c) => c.metal === m).length,
        conquistadas: ganhas.filter((c) => c.metal === m).length,
      },
    ])),
    divisas: divisas.length,
    divisasConquistadas: divisas.filter((d) => d.conquistada).length,
    platinou: jaTem.has('platina'),
  };

  return { condecoracoes, divisas, resumo };
}

/**
 * As que estao mais perto de cair, para a tela poder dizer "falta pouco".
 * Ignora as que ja cairam e as que nem comecaram -- 0% nao motiva ninguem, e
 * o que puxa e justamente o quase.
 */
export function quaseLa(condecoracoes, quantas = 3) {
  return condecoracoes
    .filter((c) => !c.conquistada && !c.secreta && c.progresso > 0)
    .sort((a, b) => b.progresso - a.progresso)
    .slice(0, quantas);
}
