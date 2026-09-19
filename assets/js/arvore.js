/* ═══════════════════════════════════════════════════════════════════════════
   O QUADRO DE OPERAÇÕES — a árvore de condecorações  (R15)

   Pedido dele em 20/09/2026, com uma imagem de árvore de talentos de jogo:

     "Quero uma página para uma árvore de conquistas. Isso é só um exemplo do
      que é, mas ela não vai ser dessa maneira -- quero que seja transformada
      da nossa maneira, que tenha nossas cores e alguma relação com a parte do
      militar, que é o nosso foco."

   ── POR QUE "QUADRO DE OPERAÇÕES" E NÃO "ÁRVORE" ──────────────────────────
   Árvore de talentos é forma de RPG de fantasia -- é a imagem que ele mandou
   como exemplo e pediu para NÃO copiar. O equivalente militar de uma árvore é
   o quadro onde se planeja uma campanha: FRENTES que avançam em paralelo, cada
   uma com objetivos em ordem, todas convergindo no comando.

   Mesma estrutura (ramos, degraus, convergência), vocabulário do nosso mundo.

   ── 🔴 A ÁRVORE NÃO É INVENTADA, É REVELADA ───────────────────────────────
   As 74 condecorações já têm correntes dentro delas: 9 degraus de horas
   (1 → 3 → 5 → 10 → 25 → 50 → 100 → 200 → 500), 7 de sequência, 6 de sessões.
   Isso já era uma árvore -- estava escondida numa lista.

   Então aqui não se cria hierarquia nova: agrupa-se por TIPO DE ESFORÇO e
   ordena-se por EXIGÊNCIA. A consequência importante é que o quadro nunca
   desatualiza: condecoração nova entra na frente certa sozinha, pelo tipo da
   condição dela.

   ── O QUE É PRÉ-REQUISITO AQUI ────────────────────────────────────────────
   Numa árvore de talentos o nó de cima EXIGE o de baixo. Aqui não é preciso
   impor nada: quem tem 100 horas necessariamente passou por 50. A ordem já é
   a consequência, não uma regra inventada. Por isso um degrau conquistado com
   o anterior vazio é IMPOSSÍVEL -- e se aparecer, é defeito, e o teste procura.
*/

import { CONDECORACOES, METAIS } from './catalogo.js';

/* ── AS FRENTES ────────────────────────────────────────────────────────────
   Cada uma é um tipo de esforço. A ordem das frentes na tela vai da mais
   simples de entender (tempo) para a mais abstrata (comando).

   `pega` decide se uma condecoração é daquela frente. Recebe a condição. */
/* 🔴 A ORDEM DENTRO DA FRENTE PRECISA DE UMA ESCALA COMUM.
   A primeira versão comparava o número cru de cada condição -- e uma frente
   que mistura "7 dias seguidos" com "1 semana perfeita" ordenava a semana
   ANTES do segundo dia, porque 1 < 2. Escalas diferentes no mesmo eixo.

   Cada frente converte tudo para a sua unidade natural. Alguns fatores são
   JULGAMENTO meu, não medição -- estão marcados, e mudá-los muda só a ordem
   de desenho, nunca o que é preciso fazer para conquistar. */
export const FRENTES = [
  {
    id: 'tempo', nome: 'Tempo de Serviço',
    lema: 'Horas acumuladas. A conta que não mente.',
    pega: (c) => c.tipo === 'horas',
    ordena: (c) => c.min,                                   // unidade: horas
  },
  {
    id: 'marcha', nome: 'Marcha',
    lema: 'Dias seguidos. O que separa quem passa de quem desiste.',
    pega: (c) => c.tipo === 'streak' || c.tipo === 'semanaPerfeita'
      || (c.tipo === 'atributo' && c.chave === 'disciplina'),
    // unidade: DIAS
    ordena: (c) => {
      if (c.tipo === 'streak') return c.min;
      if (c.tipo === 'semanaPerfeita') return c.vezes * 7;   // uma semana = 7 dias
      return c.min * 0.3;                // julgamento: DISCIPLINA 100 ≈ 30 dias
    },
  },
  {
    id: 'presenca', nome: 'Presença',
    lema: 'Dias e meses em que você apareceu para trabalhar.',
    pega: (c) => c.tipo === 'diasEstudados' || c.tipo === 'meses',
    // unidade: DIAS
    ordena: (c) => (c.tipo === 'meses' ? c.min * 30 : c.min),
  },
  {
    id: 'folego', nome: 'Fôlego',
    lema: 'Aguentar sentado é treino como qualquer outro.',
    pega: (c) => c.tipo === 'sessaoUnica' || c.tipo === 'horasNoDia'
      || (c.tipo === 'atributo' && c.chave === 'resistencia'),
    // unidade: MINUTOS
    ordena: (c) => {
      if (c.tipo === 'sessaoUnica') return c.minutosMin;
      if (c.tipo === 'horasNoDia') return c.min * 60;
      return c.min * 0.9;        // RESISTÊNCIA 100 = sessão de 90min, por definição
    },
  },
  {
    id: 'volume', nome: 'Volume de Fogo',
    lema: 'Quantas vezes você sentou e fez.',
    pega: (c) => c.tipo === 'sessoes' || c.tipo === 'sessoesNoDia' || c.tipo === 'modo',
    // unidade: SESSÕES
    ordena: (c) => {
      if (c.tipo === 'sessoes') return c.min;
      if (c.tipo === 'modo') return c.vezes;
      return c.quantas * 12;   // julgamento: N sessões NO MESMO DIA custa muito mais
    },
  },
  {
    id: 'terreno', nome: 'Terreno',
    lema: 'O conteúdo tomado, matéria por matéria.',
    pega: (c) => ['materias', 'dominioMinimo', 'materiaSeguida', 'materiaMenosEstudada', 'materiasNoDia']
      .includes(c.tipo) || (c.tipo === 'atributo' && ['doutrina', 'amplitude'].includes(c.chave)),
    /* unidade: um índice de 0 a ~100 de "quanto do conteúdo está tomado".
       Aqui o julgamento é maior, porque as condições medem coisas de natureza
       diferente -- quantidade de matérias, dias seguidos e porcentagem. */
    ordena: (c) => {
      if (c.tipo === 'materias') return c.quantas * 18;
      if (c.tipo === 'materiasNoDia') return c.quantas * 14;
      if (c.tipo === 'materiaSeguida') return c.dias * 2.5;
      if (c.tipo === 'dominioMinimo') return c.min + 40;      // exige TODAS acima
      if (c.tipo === 'materiaMenosEstudada') return c.dominioMin;
      return c.min;                                          // atributo, 0 a 100
    },
  },
  {
    id: 'vigilia', nome: 'Vigília',
    lema: 'As horas em que quase ninguém está estudando.',
    pega: (c) => ['horario', 'diaSemana', 'retorno'].includes(c.tipo),
    // unidade: número de ocorrências exigidas, com peso por dificuldade
    ordena: (c) => {
      if (c.tipo === 'horario') return c.vezes * 2;    // hora incomum custa mais
      if (c.tipo === 'diaSemana') return c.vezes;
      return c.diasSumidoMin;                          // retorno: quanto sumiu
    },
  },
  {
    id: 'comando', nome: 'Comando',
    lema: 'O que só se alcança tendo alcançado o resto.',
    pega: (c) => ['edital', 'xp', 'atributosTodos', 'todas'].includes(c.tipo),
    ordena: (c) => ({ edital: 1, xp: 2, atributosTodos: 3, todas: 9 })[c.tipo] || 0,
  },
];

/**
 * Monta o quadro a partir das condecorações já conferidas.
 *
 * @param {Array} condecoracoes  a saída de `conferir(fatos).condecoracoes`
 */
export function montarQuadro(condecoracoes = []) {
  const porId = new Map(condecoracoes.map((c) => [c.id, c]));
  const usadas = new Set();

  const frentes = FRENTES.map((f) => {
    const nós = CONDECORACOES
      .filter((c) => !usadas.has(c.id) && f.pega(c.condicao))
      .sort((a, b) => (f.ordena(a.condicao) || 0) - (f.ordena(b.condicao) || 0))
      .map((c, i) => {
        usadas.add(c.id);
        const estado = porId.get(c.id) || {};
        return {
          ...c,
          degrau: i + 1,
          metalInfo: METAIS[c.metal],
          conquistada: !!estado.conquistada,
          progresso: estado.progresso ?? 0,
          /* Secreta não conquistada some o nome. Mas o NÓ continua no quadro:
             ver que existe algo ali, sem saber o quê, é metade da graça --
             e é a correção que ele me deu em 01/08 sobre as secretas. */
          oculta: !!c.secreta && !estado.conquistada,
        };
      });

    const feitos = nós.filter((n) => n.conquistada).length;
    return {
      ...f,
      nós,
      feitos,
      total: nós.length,
      /* O degrau ATUAL é o primeiro não conquistado -- é onde a frente parou,
         e é o que a tela destaca. Frente completa não tem atual. */
      atual: nós.find((n) => !n.conquistada) || null,
      completa: nós.length > 0 && feitos === nós.length,
    };
  }).filter((f) => f.nós.length > 0);

  /* 🔴 Condecoração que não caiu em frente nenhuma seria invisível no quadro
     -- conquistada e sem lugar para aparecer. Devolver a lista deixa o teste
     cobrar isso em vez de o defeito passar calado. */
  const orfas = CONDECORACOES.filter((c) => !usadas.has(c.id)).map((c) => c.id);

  const todos = frentes.flatMap((f) => f.nós);
  return {
    frentes,
    orfas,
    resumo: {
      total: todos.length,
      conquistadas: todos.filter((n) => n.conquistada).length,
      frentesCompletas: frentes.filter((f) => f.completa).length,
      frentes: frentes.length,
      alturaMaxima: Math.max(...frentes.map((f) => f.nós.length)),
    },
  };
}

/**
 * A ligação entre um degrau e o anterior: acesa quando os DOIS estão
 * conquistados. É o que faz o caminho percorrido aparecer como caminho, e não
 * como pontos soltos.
 */
export function ligacaoAcesa(nós, i) {
  return i > 0 && nós[i].conquistada && nós[i - 1].conquistada;
}
