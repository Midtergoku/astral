// ASSUNTOS -- descobrir o assunto de cada questao por palavra-chave.
//
// Pedido do Lucas em 18/09/2026: filtrar questao por BANCA, por MATERIA e --
// a parte que faz diferenca -- pelo ASSUNTO DENTRO da materia. "As vezes ela
// quer estudar matematica, mas ela quer estudar sobre funcoes ou porcentagem."
//
// 🔴 POR PALAVRA-CHAVE, e nao por IA. Ordem dele em 19/09: "n quero gastar
// nada com esse filtro". Custa R$ 0 e roda em milissegundos.
//
// 🔴 O NUMERO HONESTO E 71%, nao 83%. Medido em 19/09/2026: 83% de cobertura
// na prova em que o dicionario foi ajustado, e 71% numa prova as cegas, de
// outro ano. O segundo numero e o que vale -- o primeiro mede o dicionario
// contra si mesmo. Os que nao classificam saem com assunto NULO, e nulo e
// resposta honesta: inventar assunto faria o filtro mentir, que e pior que o
// filtro nao ter tudo.
//
// 🔴 POR QUE E UM MODULO: desde 21/09/2026 duas pontas usam isto -- a
// ferramenta de terminal e a tela importar.html, que o Lucas usa sozinho.
// Duas copias divergiriam em silencio.

// ── O dicionario ─────────────────────────────────────────────────────────────
// Cada assunto tem termos que so aparecem quando a questao e daquilo. A ordem
// importa: o primeiro que casar vence, entao o mais especifico vem primeiro.
// "funcao do 2o grau" tem de ser testado antes de "funcao".
const ASSUNTOS = [
  // ── MATEMATICA ──
  ["Matemática", "Logaritmo",            [/\blogaritm/i, /\blog\s*[₂-₉(]/i, /\blog_?\d/i]],
  ["Matemática", "Trigonometria",        [/\bsen\s*\(|\bseno\b|\bcosseno\b|\bcos\s*\(|\btangente\b|\btg\s*\(/i, /trigonom/i, /\bradianos?\b/i]],
  ["Matemática", "Progressões",          [/progress[ãa]o (aritm|geom)/i, /\bP\.?A\.?\b|\bP\.?G\.?\b/, /raz[ãa]o da progress/i]],
  ["Matemática", "Matrizes e determinantes", [/\bmatriz/i, /determinante/i]],
  // "quantas senhas/placas/anagramas/maneiras" e o jeito que a banca escreve
  // combinatoria sem usar a palavra. Achado lendo a questao 26 da EEAR.
  ["Matemática", "Análise combinatória",  [/combina[çc][ãa]o|arranjo|permuta[çc]/i, /fatorial|\d!\b/i, /an[áa]lise combinat/i,
                                           /quanti(dade|as)\s+(de\s+)?(senhas?|placas?|anagramas?|maneiras?|formas?|modos?)/i,
                                           /\bd[íi]gitos? distintos?|algarismos? distintos?/i, /de quantas (maneiras|formas)/i]],
  ["Matemática", "Probabilidade",         [/probabilidade/i, /\bdado[s]? (honesto|n[ãa]o viciado)/i, /ao acaso|aleatoriamente/i]],
  // 🔴 A ORDEM AQUI NAO E ARBITRARIA, e errar a ordem erra a classificacao.
  // Medido em 19/09: "Dada a circunferencia de equacao (x-1)²+(y-3)²=9 e a reta
  // r: 3x+4y=0" caiu em GEOMETRIA PLANA, porque essa regra vinha antes e a
  // palavra "circunferencia" casou. A questao e de geometria ANALITICA -- o que
  // a define nao e a figura, e o fato de ela estar descrita por EQUACAO.
  // Regra geral: o assunto mais ESPECIFICO vem primeiro, e "tem equacao" e
  // mais especifico que "tem circunferencia".
  // Argand-Gauss e "afixo" sao complexos, nao analitica -- os dois falam de
  // plano e ponto, e por isso a ordem importa aqui tambem (medido: a questao 45
  // caiu em analitica ate esta linha subir).
  ["Matemática", "Números complexos",     [/n[úu]mero[s]? complexo/i, /\bunidade imagin[áa]ria|\bi\s*²\s*=/i, /afixo|argand/i]],
  ["Matemática", "Estatística",           [/m[ée]dia (aritm[ée]tica|ponderada)|\bmediana\b|\bmoda\b/i,
                                           /frequ[êe]ncia (acumulada|relativa|absoluta)|distribui[çc][ãa]o de frequ/i,
                                           /pol[íi]gono de frequ[êe]ncia|histograma|desvio padr[ãa]o/i]],
  ["Matemática", "Geometria analítica",   [/\bplano cartesiano|coordenadas? d[oe] ponto/i, /equa[çc][ãa]o d[ae] (reta|circunfer)/i,
                                           /\bde equa[çc][ãa]o\b|retas? de equa[çc]/i, /y\s*=\s*-?\d*\s*x\s*[+-]/i,
                                           /[âa]ngulo (agudo )?entre (as )?retas/i, /\breta r\s*:/i]],
  ["Matemática", "Geometria espacial",    [/\b(cubo|cilindro|cone|esfera|prisma|pir[âa]mide|tronco)\b/i, /volume d[oea]/i, /\bpoliedro/i],],
  ["Matemática", "Geometria plana",       [/\b(tri[âa]ngulo|quadrado|ret[âa]ngulo|circunfer[êe]ncia|losango|trap[ée]zio|pol[íi]gono)\b/i, /[áa]rea d[oea]/i, /\bhipotenusa|cateto/i, /\bdi[âa]metro|per[íi]metro/i]],
  ["Matemática", "Função do 2º grau",     [/fun[çc][ãa]o (do|de) (2|segundo)/i, /\bpar[áa]bola|v[ée]rtice d[ae] par/i, /ax\s*²|x\s*²\s*[+-]/],],
  ["Matemática", "Função do 1º grau",     [/fun[çc][ãa]o (do|de) (1|primeiro)/i, /fun[çc][ãa]o afim|fun[çc][ãa]o linear/i]],
  ["Matemática", "Funções",               [/\bfun[çc][ãa]o\b|\bf\s*\(\s*x\s*\)/i, /dom[íi]nio (d[ae]|de uma) fun|imagem d[ae] fun/i]],
  ["Matemática", "Porcentagem",           [/porcentagem|percentual|\d\s*%/i, /desconto|acr[ée]scimo|aumento de \d/i, /juros?/i]],
  ["Matemática", "Equações e sistemas",   [/equa[çc][ãa]o|sistema (linear|de equa)/i, /\bra[íi]zes? d[aeo]/i, /inequa[çc]/i]],
  ["Matemática", "Conjuntos",             [/\bconjunto[s]?\b/i, /\buni[ãa]o\b.*\bintersec|intersec[çc][ãa]o/i]],
  ["Matemática", "Polinômios",            [/polin[ôo]mi/i, /\bgrau do polin/i]],

  // ── FISICA ──
  // Vetores, gravitacao e eletrostatica faltavam e sozinhas respondiam por 5
  // das 7 questoes sem assunto na primeira medicao (19/09).
  ["Física", "Vetores",                   [/\bvetor(es)?\b/i, /m[óo]dulo d[oe] vetor|soma vetorial|resultante vetorial/i]],
  ["Física", "Gravitação",                [/gravita[çc][ãa]o universal|\bkepler\b/i, /[óo]rbitas? planet|corpos celestes|movimento dos planetas/i]],
  ["Física", "Eletrostática",             [/eletrost[áa]tica|eletriza[çc][ãa]o|\bcoulomb\b/i, /cargas? el[ée]tricas?\b.*(atra[çc]|repuls)|corpos eletrizados/i]],
  ["Física", "Termologia",                [/calor (espec[íi]fico|sens[íi]vel|latente)|capacidade t[ée]rmica/i, /\btemperatura\b.*\b(graus|°C|kelvin)/i, /dilata[çc][ãa]o t[ée]rmica|termodin/i, /escalas? termom[ée]tricas?/i]],
  ["Física", "Cinemática",                [/velocidade (m[ée]dia|inicial|escalar)/i, /acelera[çc][ãa]o/i, /\bMRU\b|\bMRUV\b|movimento (uniforme|retil)/i]],
  ["Física", "Dinâmica",                  [/\bfor[çc]a (resultante|de atrito|peso|normal)/i, /leis? de newton/i, /\batrito\b/i]],
  ["Física", "Eletricidade",              [/corrente el[ée]trica|resist[êe]ncia el[ée]trica|\bohm/i, /\bcircuito\b/i, /tens[ãa]o el[ée]trica|\bvolt|\bamp[èe]re/i]],
  ["Física", "Óptica",                    [/\b(espelho|lente|refra[çc][ãa]o|reflex[ãa]o d[ae] luz)/i, /\b[íi]ndice de refra|foco d[oa] (espelho|lente)/i]],
  ["Física", "Ondulatória",               [/\bonda[s]?\b/i, /frequ[êe]ncia|comprimento de onda|\bhertz/i, /\bac[úu]stica|som\b/i]],
  ["Física", "Hidrostática",              [/press[ãa]o (hidrost|atmosf)|empuxo|\bdensidade\b/i, /princ[íi]pio de (pascal|arquimedes)/i]],
  ["Física", "Energia e trabalho",        [/energia (cin[ée]tica|potencial|mec[âa]nica)/i, /\btrabalho d[ae] (uma )?for[çc]a|pot[êe]ncia\b/i]],

  // ── PORTUGUES ──
  ["Português", "Crase",                  [/\bcrase\b/i, /\b[àÀ]s? (vezes|aquele|aquela)/]],
  ["Português", "Concordância",           [/concord[âa]ncia/i]],
  ["Português", "Discurso e vozes",       [/discurso (direto|indireto|indireto livre)/i, /voz (ativa|passiva)/i]],
  ["Português", "Regência",               [/reg[êe]ncia (verbal|nominal)/i]],
  // "colocacao DOS PRONOMES obliquos" nao casava com "colocacao pronominal", e
  // caia em Morfologia por causa da palavra "pronome". A banca escreve das duas
  // formas -- o dicionario tem de aceitar as duas.
  ["Português", "Colocação pronominal",   [/coloca[çc][ãa]o pronominal|pr[óo]clise|[êe]nclise|mes[óo]clise/i,
                                           /coloca[çc][ãa]o d[oe]s? pronomes?|pronomes? obl[íi]quos?/i]],
  ["Português", "Pontuação",              [/pontua[çc][ãa]o|\bv[íi]rgulas?\b|ponto e v[íi]rgula/i, /quantas v[íi]rgulas/i]],
  ["Português", "Morfologia",             [/\b(substantivo|adjetivo|adv[ée]rbio|pronome|numeral|interjei)/i, /processo[s]? de forma[çc][ãa]o|deriva[çc][ãa]o (prefixal|sufixal|parassint)/i, /classe[s]? gramatical/i]],
  ["Português", "Sintaxe",                [/\b(sujeito|predicado|predicativo|aposto|vocativo|objeto (direto|indireto)|adjunto)\b/i,
                                           /ora[çc][ãa]o (subordinada|coordenada)|per[íi]odo composto/i,
                                           /analise sintaticamente|fun[çc][ãa]o sint[áa]tica|sintaticamente/i,
                                           /conjun[çc][õo]es? (subordinativas?|coordenativas?)|conectivos?/i]],
  ["Português", "Verbos",                 [/\bverbo[s]?\b|locu[çc][ãa]o verbal|conjuga[çc][ãa]o/i, /\b(infinitivo|ger[úu]ndio|partic[íi]pio)\b/i]],
  ["Português", "Figuras de linguagem",   [/figura[s]? de linguagem|met[áa]fora|meton[íi]mia|hip[ée]rbole|iron[ia]|antitese|eufemismo/i]],
  ["Português", "Interpretação de texto", [/\bde acordo com o texto|com rela[çc][ãa]o ao texto|segundo o texto|no texto\b/i, /pode-se inferir|depreende-se|o autor (afirma|defende|sugere)/i]],
  ["Português", "Ortografia e acentuação",[/acentua[çc][ãa]o|acento (gr[áa]fico|agudo|circunflexo)/i, /ortografia|grafad[ao]/i]],

  // ── INGLES ──
  ["Inglês", "Verb tenses",               [/\b(present|past|future) (perfect|continuous|simple)\b/i, /\bsimple (past|present)\b/i]],
  ["Inglês", "Modal verbs",               [/\bmodal verb|\b(can|could|must|should|might|may)\b.*\balternative/i]],
  ["Inglês", "Adjectives",                [/\b-?(ing|ed) (adjectives|form)/i, /\bcomparative|superlative\b/i]],
  ["Inglês", "Prepositions",              [/\bpreposition/i]],
  // A banca quase nunca escreve o nome do assunto em ingles -- ela escreve o
  // COMANDO. "Another way of saying" e vocabulario; "Choose the correct word
  // to complete" e cloze. Foi assim que 17 das 22 ficaram sem assunto na
  // primeira medicao (19/09): eu procurava o nome do topico, e o que existe
  // no papel e a instrucao.
  ["Inglês", "Conditionals",              [/conditional sentence|\bif clause/i, /\b(first|second|third) conditional/i]],
  ["Inglês", "Vocabulary",                [/\bthe word\b.*\bmeans\b|\bsynonym|\bantonym/i, /closest in meaning/i,
                                           /another way of saying/i, /\bmeans that\b/i,
                                           /replace the underlined|without changing the meaning/i]],
  ["Inglês", "Cloze (completar texto)",   [/choose the correct (word|alternative|option) to complete/i, /complete the (text|sentence|paragraph)/i, /fill in the (blank|gap)/i]],
  ["Inglês", "Reading comprehension",     [/according to the text|based on the text|the text (says|states|suggests)/i, /\bread the (text|paragraph|passage)/i, /\bin the text\b/i]],
];

/* 🔴 A CORRECAO QUE MAIS MUDOU O RESULTADO, achada lendo as 31 primeiras em
   19/09/2026: procurar no texto inteiro faz o termo casar dentro do TEXTO
   CITADO, e nao na pergunta.

   A questao 1 pergunta sobre interpretacao de uma tirinha da Mafalda -- e foi
   classificada como "Figuras de linguagem" porque a palavra "ironia" aparecia
   DENTRO da tirinha. O assunto da questao e o que ela PEDE, nao o que o texto
   de apoio por acaso menciona.

   Entao a busca e em dois passos: primeiro so no COMANDO (o comeco do
   enunciado, ate as aspas ou os dois-pontos que abrem a citacao), e so se nao
   achar nada ali e que o texto inteiro entra. Assim o comando manda, e a
   citacao vira desempate em vez de mandar. */
function comandoDa(enunciado) {
  // O comando termina onde comeca a citacao: aspas curvas, dois-pontos
  // seguidos de maiuscula, ou simplesmente os primeiros 180 caracteres.
  const corte = enunciado.search(/[“"]|\:\s+[A-ZÀ-Ú]/);
  return (corte > 25 ? enunciado.slice(0, corte) : enunciado).slice(0, 180);
}

function classificar(q) {
  const materia = q.materia || null;
  if (!materia) return { materia: null, assunto: null, termo: null, por: null };
  const comando = comandoDa(q.enunciado || "");
  const tudo = [q.enunciado, q.a, q.b, q.c, q.d].filter(Boolean).join(" ");

  for (const onde of [comando, tudo]) {
    for (const [mat, assunto, termos] of ASSUNTOS) {
      if (mat !== materia) continue;               // nao deixa "funcao" de fisica virar matematica
      for (const t of termos) {
        if (t.test(onde)) {
          return { materia, assunto, termo: String(t), por: onde === comando ? "comando" : "texto" };
        }
      }
    }
  }
  return { materia, assunto: null, termo: null, por: null };
}

/** Classifica uma lista inteira e ja conta a cobertura. */
export function classificarLista(questoes) {
  const resultado = (questoes || []).map((q) => ({ ...q, ...classificar(q) }));
  const comAssunto = resultado.filter((r) => r.assunto).length;
  return {
    questoes: resultado,
    comAssunto,
    sem: resultado.length - comAssunto,
    cobertura: resultado.length ? Math.round((comAssunto / resultado.length) * 100) : 0,
  };
}

/** Todos os assuntos que o dicionario conhece, por materia -- para a tela. */
export function assuntosConhecidos() {
  const por = {};
  for (const [mat, assunto] of ASSUNTOS) (por[mat] ||= new Set()).add(assunto);
  return Object.fromEntries(Object.entries(por).map(([m, s]) => [m, [...s].sort()]));
}

export { ASSUNTOS, classificar, comandoDa };
