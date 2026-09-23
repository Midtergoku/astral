// PROVA -- transforma o TEXTO de uma prova militar em questoes estruturadas.
//
// 🔴 POR QUE ISTO E UM MODULO, e nao codigo dentro da ferramenta de terminal:
// desde 21/09/2026 existem DOIS lugares que precisam desta logica -- a
// ferramenta `tools/prova-para-questoes.js`, que eu rodo aqui, e a tela
// `importar.html`, que o Lucas usa sozinho. Duas copias divergiriam, e a
// divergencia so apareceria meses depois, numa questao torta no acervo.
// E exatamente o problema que a checagem 15 do verifica.js existe para pegar.
//
// Este arquivo NAO le PDF. Ele recebe TEXTO ja extraido, porque quem extrai e
// diferente dos dois lados: aqui e `pdftotext`, la e o pdf.js do navegador.
// A extracao e a unica parte que muda; o entendimento da prova e um so.
//
// ── AS QUATRO ARMADILHAS, todas encontradas medindo em 17/09/2026 ───────────
// 1. FORM FEED. O pdftotext separa pagina com 0x0C, e o "^" do modo multilinha
//    do JavaScript NAO casa depois dele. Onze questoes de 96 sumiram caladas.
//    Por isso `limparPagina` existe, e quem chama tem de usa-la.
// 2. DUAS COLUNAS. Quando a pergunta cai no pe de uma coluna e as alternativas
//    no alto da outra, a leitura em fluxo separa as duas. Por isso a funcao
//    recebe uma LISTA de leituras -- fluxo, coluna esquerda, coluna direita --
//    e fica com a melhor versao de cada questao.
// 3. ALTERNATIVA NO MEIO DA LINHA. A banca imprime "a) 16/3 b) 2/5" numa linha
//    so quando cabe. Exigir "a)" no inicio da linha jogava fora questoes boas.
// 4. A ULTIMA ALTERNATIVA VAZA. Ela corre ate o fim do bloco e arrasta
//    cabecalho, rodape e o texto de apoio da questao seguinte.

/** O FORM FEED (0x0C) que o pdftotext poe entre paginas vira quebra de linha. */
export function limparPagina(texto) {
  return String(texto || "").split(String.fromCharCode(12)).join("\n");
}

/* ── De que MATERIA e cada questao ───────────────────────────────────────────
   🔴 ERRO MEU, achado em 19/09/2026 ao testar a segunda prova: eu deduzia a
   materia pela FAIXA DE NUMERO, supondo blocos de 24 na ordem portugues,
   matematica, fisica, ingles. Isso valia para a prova de 2025 e NAO vale em
   geral -- a de 2022 e portugues, INGLES, matematica, fisica. O resultado foi
   limpo demais para ser falta de dicionario: 0% em tres materias de quatro.

   A prova DIZ a ordem, em letra garrafal: "AS QUESTOES DE 25 A 48 REFEREM-SE A
   LINGUA INGLESA". Ler o que esta escrito e melhor que deduzir de um padrao
   observado uma vez. */
/* 🔴 22/09/2026 -- ESTA FUNCAO ESTAVA INVENTANDO MATERIA, e o defeito so
   apareceu ao rodar contra 21 provas de verdade em vez de uma.

   A versao anterior capturava `([^\n]+)` -- tudo ate o fim da LINHA. Numa prova
   de DUAS COLUNAS, a linha fisica continua com o texto da coluna vizinha,
   entao "REFEREM-SE A LINGUA PORTUGUESA" virava materia
   "05 - leia o poema de fernando pessoa". Sairam materias chamadas
   "Underlined sentence in the text" e "Log2x log4x log8x 1 . logo, x = ____",
   com 63 questoes dentro. O filtro da tela ofereceria essas linhas ao usuario.

   Conserto: nao se pega o resto da linha -- PROCURA-SE O NOME DA MATERIA
   dentro do trecho seguinte, contra uma lista conhecida. Prova militar tem um
   punhado de materias, nao infinitas. O que nao casa e DESCARTADO, e as
   questoes daquela faixa ficam sem materia e nao entram no acervo.

   Perder questao e melhor que rotular errado: questao no lugar errado quebra
   a confianca no filtro inteiro, que e a unica coisa que o acervo vende. */
// ⚠️ Sem `\b` no fim de proposito: a banca escreve "LINGUA PORTUGUESA" e
// "LINGUA INGLESA" -- no feminino. Exigir fim de palavra fazia "PORTUGUESA"
// nao casar com "portugues", e a materia sumia calada. Achado rodando contra
// o proprio teste depois de trocar a regra.
// ⚠️ A ORDEM MANDA: o mais especifico vem primeiro. "Direito Penal" tem de ser
// testado antes de "Direito", senao toda prova de policial vira "Direito".
// A lista cresceu em 22/09/2026 a pedido dele: "a pessoa que vai fazer prova
// de oficial dos bombeiros tem quimica", "policial penal, policial rodoviario
// federal -- nao tem essas materias aqui".
const MATERIAS_CONHECIDAS = [
  [/portugu[êe]s/i,                          "Português"],
  [/\bingl[êe]s/i,                           "Inglês"],
  [/\bespanhol/i,                            "Espanhol"],
  [/racioc[íi]nio\s+l[óo]gico(\s+e\s+matem[áa]tico)?/i, "Raciocínio lógico"],
  [/matem[áa]tica/i,                         "Matemática"],
  [/\bf[íi]sica/i,                           "Física"],
  [/\bqu[íi]mica/i,                          "Química"],
  [/\bbiologia/i,                            "Biologia"],
  [/hist[óo]ria\s+e\s+geografia/i,           "História e Geografia"],
  [/hist[óo]ria/i,                           "História"],
  [/geografia/i,                             "Geografia"],
  [/reda[çc][ãa]o/i,                         "Redação"],
  [/inform[áa]tica|noc[õo]es\s+de\s+inform/i, "Informática"],
  // ── Direito, por ramo. Prova de policial, bombeiro e PRF vive disto ──────
  [/direito\s+penal\s+militar/i,             "Direito penal militar"],
  [/direito\s+penal/i,                       "Direito penal"],
  [/direito\s+processual\s+penal/i,          "Direito processual penal"],
  [/direito\s+constitucional/i,              "Direito constitucional"],
  [/direito\s+administrativo/i,              "Direito administrativo"],
  [/direitos?\s+humanos/i,                   "Direitos humanos"],
  [/legisla[çc][ãa]o\s+de\s+tr[âa]nsito|c[óo]digo\s+de\s+tr[âa]nsito/i, "Legislação de trânsito"],
  [/legisla[çc][ãa]o/i,                      "Legislação"],
  [/\bdireito\b/i,                           "Direito"],
  [/atualidades/i,                           "Atualidades"],
  [/[ée]tica(\s+no\s+servi[çc]o\s+p[úu]blico)?/i, "Ética"],
  [/administra[çc][ãa]o\s+p[úu]blica/i,      "Administração pública"],
  [/conhecimentos?\s+espec[íi]ficos?/i,      "Conhecimentos específicos"],
  [/\bfilosofia\b/i,                         "Filosofia"],
  [/\bsociologia\b/i,                        "Sociologia"],
  /* ⚠️ Acrescentadas em 22/09/2026 DEPOIS de medir, nao antes. A prova do
     bombeiro de MG dava "Direitos humanos: 24 questoes" -- numero plausivel
     demais para levantar suspeita. Fui olhar: depois daquele cabecalho vinham
     mais tres blocos que a lista nao conhecia, e todos caiam no anterior.
     Materia desconhecida nao some: ela se DISFARCA da ultima conhecida. */
  [/prote[çc][ãa]o\s+e\s+defesa\s+civil|defesa\s+civil/i, "Proteção e defesa civil"],
  [/ci[êe]ncias\s+naturais/i,                "Ciências naturais"],
  [/ci[êe]ncias\s+humanas/i,                 "Ciências humanas"],
  [/primeiros\s+socorros/i,                  "Primeiros socorros"],
  [/\benfermagem\b/i,                        "Enfermagem"],
  [/contabilidade/i,                         "Contabilidade"],
  [/estat[íi]stica/i,                        "Estatística"],
  [/\beconomia\b/i,                          "Economia"],
  [/arquivologia/i,                          "Arquivologia"],
  [/\bliteratura\b/i,                        "Literatura"],
  [/\bactualidades|conhecimentos\s+gerais/i, "Conhecimentos gerais"],
];

/** Todos os nomes de materia que o leitor sabe produzir. Quem confere o
    acervo usa ESTA lista -- manter uma copia do lado seria duas listas para
    divergir, que e o problema que a checagem 15 do verifica.js existe para
    pegar. */
export const NOMES_DE_MATERIA = [...new Set(MATERIAS_CONHECIDAS.map(([, n]) => n))];

/** O nome da materia, ou NULL se o texto nao contiver nenhuma conhecida. */
export function arrumarNome(n) {
  const s = String(n || "");
  // Ordem importa: "Historia e Geografia" tem de ser testado antes de
  // "Historia" sozinha, senao a materia composta vira so a primeira.
  for (const [re, nome] of MATERIAS_CONHECIDAS) if (re.test(s)) return nome;
  return null;
}

export function faixasDeMateria(texto) {
  const faixas = [];
  const re = /QUEST[ÕO]ES\s+DE\s+(\d+)\s+A\s+(\d+)\s+REFEREM[‐\-]?SE\s+[ÀA]\s+/gi;
  const t = String(texto || "");
  for (const m of t.matchAll(re)) {
    // So os 60 caracteres seguintes. O nome da materia vem logo depois do
    // marcador; o que estiver mais longe e texto de outra coluna.
    const trecho = t.slice(m.index + m[0].length, m.index + m[0].length + 60);
    const materia = arrumarNome(trecho);
    if (!materia) continue;                    // nao inventa: descarta a faixa
    const de = parseInt(m[1], 10), ate = parseInt(m[2], 10);
    if (!(de >= 1 && ate > de && ate <= 300)) continue;
    faixas.push({ de, ate, materia });
  }
  return faixas;
}

/* ── A MATERIA PELO CABECALHO, e nao pela faixa de numeros ──────────────────
   🔴 22/09/2026. As provas de bombeiro, policia e ESA NAO escrevem "AS QUESTOES
   DE 1 A 24 REFEREM-SE A...". Elas poem o nome da materia sozinho numa linha
   ("Língua Portuguesa", "MATEMÁTICA 14 – Questões") e seguem em frente.

   Entao ha dois jeitos de descobrir a materia, e o primeiro que funcionar
   manda: a faixa declarada (Forca Aerea) ou o cabecalho por POSICAO -- toda
   questao que vier depois do cabecalho X e antes do proximo pertence a X.

   A linha tem de ser CURTA para contar como cabecalho. Sem isso, um paragrafo
   que por acaso cite "direito penal" viraria divisor de materia no meio da
   prova. */
export function cabecalhosDeMateria(texto) {
  const t = String(texto || "");
  const achados = [];
  const linhas = t.split("\n");
  let pos = 0;
  for (const linha of linhas) {
    const inicio = pos;
    pos += linha.length + 1;
    const limpa = linha.trim();
    if (limpa.length < 4 || limpa.length > 70) continue;
    // Um cabecalho e quase so o nome da materia. Se a linha tem muito texto
    // alem do nome, e frase, nao titulo.
    const materia = arrumarNome(limpa);
    if (!materia) continue;
    const sobra = limpa.replace(/[^A-Za-zÀ-ú]/g, "").length;
    if (sobra > materia.replace(/[^A-Za-zÀ-ú]/g, "").length + 22) continue;
    if (achados.length && achados[achados.length - 1].materia === materia) continue;
    achados.push({ materia, em: inicio });
  }
  return achados;
}

/** O gabarito e as anuladas, quando a propria prova os traz. */
export function gabaritoDe(texto) {
  const respostas = new Map();
  const anuladas = new Set();

  /* 🔴 22/09/2026 -- UM ACHADO QUE TERIA POSTO RESPOSTA ERRADA NO ACERVO.
     O padrao do gabarito e "numero, espaco, letra" -- e a propria prova contem
     a frase "AS QUESTOES DE 01 A 24 REFEREM-SE A LINGUA PORTUGUESA". Ali,
     "01 A" casa perfeitamente: numero 01 seguido da letra A. So que esse "A"
     e a PREPOSICAO, nao a resposta.

     Na prova em que achei isto, a tabela de verdade vinha antes e venceu por
     sorte (a regra e "o primeiro que casar manda"). Numa prova em que a frase
     viesse primeiro, a questao 1 entraria com gabarito inventado -- e quem
     estudasse aprenderia errado e culparia o site.

     Entao a frase e APAGADA do texto antes de procurar gabarito. */
  const t = String(texto || "")
    .replace(/QUEST[ÕO]ES\s+DE\s+\d+\s+[AÀ]\s+\d+/gi, " ");
  for (const m of t.matchAll(/\b(\d{2})\s+([A-E])\b/g)) {
    const n = parseInt(m[1], 10);
    if (n >= 1 && n <= 200 && !respostas.has(n)) respostas.set(n, m[2].toLowerCase());
  }
  for (const m of t.matchAll(/\b(\d{2})\s+ANULADA/gi)) anuladas.add(parseInt(m[1], 10));
  return { respostas, anuladas };
}

/* ── O GABARITO QUE VEM EM OUTRO ARQUIVO ─────────────────────────────────────
   🔴 22/09/2026. A Forca Aerea publica o caderno JA com o gabarito dentro.
   Bombeiro, policia e ESA NAO: o gabarito e um PDF separado, e sem ele nenhuma
   dessas provas pode ser publicada -- questao sem resposta certa nao serve.

   O formato tipico e uma tabela deitada:

       1  2  3  4  5  ... 20
       D  C  E  A  C  ...  B

   E o pdftotext colapsa o espacamento, entao as letras chegam grudadas
   ("E DCA E B CA"). Contar posicao a posicao seria adivinhacao.

   🔴 A REGRA QUE TORNA ISTO SEGURO: a fileira de numeros diz QUANTAS respostas
   vem a seguir. Extraem-se as letras do trecho, e **so se a quantidade bater
   exatamente** o bloco e aceito. Se sobrar ou faltar uma letra, o bloco
   INTEIRO e descartado.

   Isso troca "talvez esteja certo" por "bate ou nao entra" -- e resposta
   errada e o pior defeito possivel num banco de questoes: a pessoa estuda,
   aprende errado, e culpa o site. */
export function gabaritoDeTabela(texto, { secao = null } = {}) {
  let t = String(texto || "").replace(/\s+/g, " ");

  /* 🔴 UM GABARITO, VARIAS PROVAS. O arquivo do CBMERJ traz QUATRO tabelas --
     "PROVA TIPO 1", "TIPO 2", "TIPO 3", "TIPO 4" -- com respostas DIFERENTES
     para os mesmos numeros de questao, porque cada tipo embaralha a ordem.

     Sem separar, a regra "o primeiro que casar manda" misturaria os quatro: a
     questao 1 ficaria com a resposta do tipo 1 mesmo que o caderno em maos
     fosse o tipo 3. Todas erradas, e sem nenhum sinal de que algo esta errado.

     Entao: se o arquivo tem mais de uma secao e quem chamou nao disse QUAL,
     devolve-se a lista de secoes e NENHUMA resposta. Recusar e a resposta
     certa quando nao da para saber. */
  const marcasSecao = [...t.matchAll(/(?:PROVA\s+)?TIPO\s+([A-Z0-9]{1,2})\b/gi)];
  const secoes = [...new Set(marcasSecao.map((m) => m[1].toUpperCase()))];

  if (secoes.length > 1) {
    if (!secao) return { respostas: new Map(), anuladas: new Set(), secoes,
                         blocosAceitos: 0, blocosRecusados: 0,
                         ambiguo: `este gabarito tem ${secoes.length} tipos de prova (${secoes.join(", ")}) — diga qual` };
    const alvo = String(secao).toUpperCase();
    const i = marcasSecao.findIndex((m) => m[1].toUpperCase() === alvo);
    if (i < 0) return { respostas: new Map(), anuladas: new Set(), secoes,
                        blocosAceitos: 0, blocosRecusados: 0,
                        ambiguo: `nao achei o tipo ${alvo} neste gabarito` };
    // 🔴 Pula o PROPRIO marcador. Cortar em "TIPO 1" deixa o "1" colado na
    // fileira de numeros seguinte, e "1 1 2 3 4..." nao e consecutivo -- o
    // bloco das questoes 1 a 20 era recusado calado, em todos os tipos.
    const ini = marcasSecao[i].index + marcasSecao[i][0].length;
    const fim = i + 1 < marcasSecao.length ? marcasSecao[i + 1].index : t.length;
    t = t.slice(ini, fim);
  }

  /* ⚠️ Cada banca numera do seu jeito na tabela do gabarito. O CBMES escreve
     "Q01 Q02 Q03" e so depois "E B D"; o CBMERJ escreve "1 2 3". Tirar o "Q"
     deixa os dois com a mesma forma, e a regra de contagem vale para ambos.
     Achado medindo o gabarito real do bombeiro do ES em 23/09/2026. */
  t = t.replace(/\bQ(?=\d)/gi, "");

  const respostas = new Map();
  const anuladas = new Set();
  let blocosAceitos = 0, blocosRecusados = 0;

  // Fileiras de numeros consecutivos e crescentes: "1 2 3 ... 20".
  const re = /(?:^|\s)((?:\d{1,3}\s+){2,}\d{1,3})(?=\s)/g;
  let m;
  while ((m = re.exec(t)) !== null) {
    const nums = m[1].trim().split(/\s+/).map(Number);
    let consecutivos = true;
    for (let i = 1; i < nums.length; i++) if (nums[i] !== nums[i - 1] + 1) { consecutivos = false; break; }
    if (!consecutivos) continue;

    // O trecho ate a proxima fileira de numeros.
    const depois = t.slice(re.lastIndex);
    const proxima = depois.search(/(?:\d{1,3}\s+){2,}\d{1,3}\s/);
    const trecho = proxima > 0 ? depois.slice(0, proxima) : depois.slice(0, nums.length * 6);

    /* 🔴 PARAR NA CONTA CERTA, e conferir o que foi atravessado.
       O ultimo bloco de cada secao corria ate o TITULO da secao seguinte
       ("CADETE BM DO 1º ANO DO CURSO DE FORMACAO...") e contava as letras
       daquele titulo: 37 letras para 20 questoes. O bloco era recusado --
       seguro, mas perdia 20 respostas boas em toda prova.

       Agora colhe-se ate completar a conta, e depois se confere que o trecho
       atravessado so tinha letra de resposta: nenhuma minuscula, nenhum
       digito. Se tinha, era texto, e o bloco cai. */
    const semAnulada = trecho.replace(/ANULAD[AO]|ANUL\./gi, " * ");
    const letras = [];
    let ate = 0;
    for (let i = 0; i < semAnulada.length && letras.length < nums.length; i++) {
      const c = semAnulada[i];
      if (/[A-E*]/.test(c)) letras.push(c);
      ate = i + 1;
    }
    /* ⚠️ A PRIMEIRA VERSAO DESTA LINHA NAO PEGAVA O CASO QUE A MOTIVOU.
       Eu recusava quando o trecho tinha MINUSCULA ou digito -- e o texto que
       vazava era "CADETE BM DO 1º ANO DO CURSO...", em MAIUSCULA. As letras
       C, A, D, E de "CADETE" passavam por resposta.

       A regra certa e mais simples e mais forte: resposta so pode ser A, B,
       C, D ou E. Qualquer OUTRA letra no meio -- o T de CADETE, o R de CURSO
       -- prova que aquilo e texto, nao gabarito. */
    const atravessado = semAnulada.slice(0, ate);
    const contaminado = /[F-Zf-zÀ-ɏ\d]/.test(atravessado);

    if (letras.length !== nums.length || contaminado) { blocosRecusados++; continue; }

    blocosAceitos++;
    nums.forEach((n, i) => {
      if (letras[i] === "*") { anuladas.add(n); return; }
      if (!respostas.has(n)) respostas.set(n, letras[i].toLowerCase());
    });
  }
  /* ── SEGUNDA FORMA: o par isolado "Q04 E" ────────────────────────────────
     O MESMO arquivo do bombeiro do ES usa as duas formas. Uma parte vem em
     grupos ("Q01 Q02 Q03" e depois "E B D"), e o resto vem em pares soltos,
     um por linha ("Q04 E"). Isso acontece porque o PDF desenha uma GRADE, e o
     pdftotext le parte por linha e parte por coluna.

     🔴 A TRAVA QUE IMPEDE O DESASTRE: em "Q01 Q02 Q03 E B D", o pedaco
     "Q03 E" tambem casa com "numero seguido de letra" -- so que ali a
     resposta E pertence a questao 01, nao a 03. Ler assim poria a resposta
     certa na questao ERRADA, que e pior que nao ter resposta.

     Entao o par so vale quando NAO vem logo depois de outro "Q<numero>".
     E o prefixo "Q" e o que torna esta leitura segura: sem ele, qualquer
     numero seguido de letra no texto viraria gabarito. */
  const bruto = String(texto || "").replace(/\s+/g, " ");
  for (const m of bruto.matchAll(/Q(\d{1,3})\s+([A-E*])(?![A-Za-z0-9])/gi)) {
    const antes = bruto.slice(Math.max(0, m.index - 8), m.index);
    if (/Q\d{1,3}\s+$/i.test(antes)) continue;      // faz parte de um grupo
    const n = parseInt(m[1], 10);
    if (!(n >= 1 && n <= 300)) continue;
    if (m[2] === "*") { anuladas.add(n); continue; }
    if (!respostas.has(n)) { respostas.set(n, m[2].toLowerCase()); blocosAceitos++; }
  }

  return { respostas, anuladas, secoes, blocosAceitos, blocosRecusados, ambiguo: null };
}

/* ── OS FORMATOS DE PROVA ────────────────────────────────────────────────────
   🔴 ACRESCENTADO EM 22/09/2026, e a razao e um pedido dele: "voce nao
   conseguiu provas dos bombeiros, da policia, da marinha?".

   Nao era falta de provas -- era falta de LEITURA. Cada banca imprime de um
   jeito, e o leitor so entendia o da Forca Aerea. Medido em tres provas reais:

     FAB/EEAR       01 – Enunciado...        a) ...  b) ...     (4 alternativas)
     Bombeiros MG   Questão 01               (A) ... (B) ...    (4)
     Bombeiros ES   1. Enunciado...          A) ...  B) ...     (5)
     ESA            01 Enunciado...          Ⓐ ...   Ⓑ ...      (5)

   O formato nao e escolhido a mao: conta-se quantas questoes cada padrao
   encontra e vence o que achar mais. Assim uma prova nova de banca
   desconhecida cai sozinha no formato certo, ou em nenhum -- e cair em
   nenhum e a resposta honesta.

   ⚠️ NENHUM desses tres formatos novos traz o gabarito dentro do caderno.
   Para eles, a resposta vem de um arquivo separado (ver `gabaritoDeTabela`). */
export const FORMATOS = [
  {
    id: "fab",
    nome: "FAB/EEAR (01 – ... a) b) c) d))",
    // "01 – " ou "01 - " no inicio da linha.
    questao: /^(\d{1,3})\s+[–-]\s+/gm,
    // Aceita no inicio da linha ou no meio (a banca junta quando cabe).
    alternativa: /(^|\s)([a-e])\)\s/g,
    letraDe: (m) => m[2].toLowerCase(),
  },
  {
    id: "questao",
    nome: "Questão NN ... (A) (B) (C) (D)",
    questao: /^Quest[ãa]o\s+(\d{1,3})\b/gim,
    alternativa: /(^|\s)\(([A-Ea-e])\)\s/g,
    letraDe: (m) => m[2].toLowerCase(),
  },
  {
    id: "ponto",
    nome: "NN. ... A) B) C) D) E)",
    questao: /^(\d{1,3})\.\s+(?=[A-ZÀ-Ú“"(])/gm,
    alternativa: /(^|\s)([A-E])\)\s/g,
    letraDe: (m) => m[2].toLowerCase(),
  },
  {
    id: "circulo",
    nome: "NN ... Ⓐ Ⓑ Ⓒ Ⓓ Ⓔ",
    questao: /^(\d{1,3})\s+(?=[A-ZÀ-Ú“"(])/gm,
    // U+24B6 a U+24BA sao as letras A-E dentro de circulo.
    alternativa: /(Ⓐ|Ⓑ|Ⓒ|Ⓓ|Ⓔ)\s*/g,
    letraDe: (m) => "abcde"[m[1].charCodeAt(0) - 0x24B6],
  },
];

/**
 * Qual formato esta prova usa? Vence o que achar mais questoes COM
 * alternativas -- achar marcador de questao sem alternativa nenhuma nao conta,
 * senao "1." de uma lista numerada qualquer venceria.
 */
export function detectarFormato(texto) {
  const t = String(texto || "");
  let melhor = null;
  for (const f of FORMATOS) {
    const marcas = [...t.matchAll(new RegExp(f.questao.source, f.questao.flags))];
    if (marcas.length < 5) continue;         // prova tem dezenas, nao tres
    let comAlternativas = 0;
    for (let i = 0; i < marcas.length; i++) {
      const fim = i + 1 < marcas.length ? marcas[i + 1].index : t.length;
      const bloco = t.slice(marcas[i].index, Math.min(fim, marcas[i].index + 4000));
      if (fatiar(bloco, f)) comAlternativas++;
    }
    if (!melhor || comAlternativas > melhor.quantas) {
      melhor = { formato: f, quantas: comAlternativas, marcas: marcas.length };
    }
  }
  return melhor && melhor.quantas >= 5 ? melhor : null;
}

/** Separa um bloco bruto em enunciado + alternativas. */
export function fatiar(bruto, formato = FORMATOS[0]) {
  if (formato.id !== "fab") return fatiarGenerico(bruto, formato);
  return fatiarFab(bruto);
}

/* O caso geral: acha os marcadores de alternativa, corta entre eles, e o que
   vem antes do primeiro e o enunciado. */
function fatiarGenerico(bruto, formato) {
  const re = new RegExp(formato.alternativa.source, formato.alternativa.flags);
  const marcas = [...bruto.matchAll(re)];
  if (marcas.length < 4) return null;

  // Exige que as quatro primeiras sejam a, b, c, d em ordem -- sem isso um
  // "A)" solto no meio de um texto de apoio viraria alternativa.
  const letras = marcas.map((m) => formato.letraDe(m));
  const primeira = letras.indexOf("a");
  if (primeira < 0) return null;
  if (letras[primeira + 1] !== "b" || letras[primeira + 2] !== "c" || letras[primeira + 3] !== "d") return null;

  const inicio = marcas[primeira].index + (marcas[primeira][1] === undefined ? 0 : 0);
  const enunciado = bruto.slice(0, marcas[primeira].index)
    .replace(/^\s*Quest[ãa]o\s+\d{1,3}\b\s*/i, "")
    .replace(/^\s*\d{1,3}[.\s–-]+/, "")
    .replace(/\s+/g, " ").trim();
  if (!enunciado) return null;

  const alts = {};
  for (let i = primeira; i < marcas.length; i++) {
    const letra = formato.letraDe(marcas[i]);
    if (!letra || alts[letra]) continue;
    const de = marcas[i].index + marcas[i][0].length;
    const ate = i + 1 < marcas.length ? marcas[i + 1].index : bruto.length;
    let v = bruto.slice(de, ate);
    v = v.split(/\n\s*\n/)[0];
    alts[letra] = v.replace(/\s+/g, " ").trim();
  }
  if (inicio < 0) return null;
  return { enunciado, alts };
}

function fatiarFab(bruto) {
  let iA = -1;
  for (const m of bruto.matchAll(/(^|[\s.])a\)\s/gm)) {
    const dep = bruto.slice(m.index);
    if (/[\s.]b\)\s/.test(dep) && /[\s.]c\)\s/.test(dep) && /[\s.]d\)\s/.test(dep)) {
      iA = m.index + (m[1] ? m[1].length : 0);
      break;
    }
  }
  if (iA < 0) return null;
  const enunciado = bruto.slice(0, iA).replace(/^\d{2}\s+[–-]\s+/, "").trim();
  const resto = bruto.slice(iA);
  const alts = {};
  const pedacos = [...resto.matchAll(/(^|\s)([a-e])\)\s/g)];
  for (let i = 0; i < pedacos.length; i++) {
    const letra = pedacos[i][2];
    if (alts[letra]) continue;
    const de = pedacos[i].index + pedacos[i][0].length;
    const ate = i + 1 < pedacos.length ? pedacos[i + 1].index : resto.length;
    let v = resto.slice(de, ate);
    v = v.split(/\n\s*\n/)[0];
    v = v.split(/\n(?=\s*(?:TEXTO|AS QUEST|As quest|[A-ZÀ-Ú][A-ZÀ-Ú\s‐-]{12,}$))/m)[0];
    alts[letra] = v.replace(/\s+/g, " ").trim();
  }
  return { enunciado: enunciado.replace(/\s+/g, " "), alts };
}

// Peneiras finais. Questao que cai numa delas NAO e descartada -- ela sai
// separada e marcada, para a tela de conferencia decidir. Questao truncada e
// PIOR que questao ausente para quem estuda, mas o dono e quem julga.
const PEDE_FIGURA = /figura|gr[áa]fico|imagem|tirinha|charge|na ilustra|conforme (a )?figura|ao lado/i;
const TEM_FORMULA = /√|∫|∑|≤|≥|≠|±|→|∞|\^\d|_\{|π\b/;
const suja = (alts) => Object.values(alts).some(
  (v) => v.length > 300 || /[A-ZÀ-Ú]{5,}\s+[A-ZÀ-Ú]{4,}/.test(v));

/**
 * O trabalho todo. Recebe as leituras do MESMO PDF (fluxo, esquerda, direita)
 * e devolve as questoes prontas, as que pedem revisao, e o que foi medido.
 */
export function montarQuestoes(leituras, { incluirSemGabarito = false } = {}) {
  const lidas = (leituras || []).map(limparPagina).filter((t) => t && t.trim());
  if (!lidas.length) return { prontas: [], revisar: [], total: 0, faixas: [], gabaritos: 0 };

  const { respostas, anuladas } = gabaritoDe(lidas[0]);

  // 🔴 As faixas saem das TRES leituras, nao so da primeira. Numa prova de duas
  // colunas, a leitura em fluxo cola o cabecalho de materia com o texto da
  // coluna vizinha e a materia fica ilegivel -- mas a leitura de uma coluna so
  // costuma trazer a mesma linha limpa. Medido em 22/09/2026: na CFS 2/2024, o
  // fluxo achava 2 de 4 materias e as colunas completavam as outras 2.
  const faixas = [];
  for (const leitura of lidas) {
    for (const f of faixasDeMateria(leitura)) {
      if (!faixas.some((x) => x.de === f.de && x.ate === f.ate)) faixas.push(f);
    }
  }
  faixas.sort((a, b) => a.de - b.de);

  /* Se a prova nao declara faixas, tenta os cabecalhos por posicao.

     🔴 UM CABECALHO POR LEITURA, e isto nao e detalhe. Cada leitura (fluxo,
     coluna esquerda, coluna direita) e um texto DIFERENTE, com posicoes
     diferentes. Na primeira versao eu li os cabecalhos so da leitura em fluxo
     e comparei com a posicao da questao, que vem de QUALQUER uma das tres --
     posicoes de textos diferentes comparadas entre si.

     O resultado passou perto de parecer certo: na prova do bombeiro de MG,
     Portugues ficou com 3 questoes (deviam ser ~10) e "Direitos humanos" com
     24. Numero plausivel o bastante para nao levantar suspeita, que e o pior
     tipo de erro. */
  const cabecalhos = faixas.length ? [] : lidas.map((t) => cabecalhosDeMateria(t));
  const materiaDe = (n, em, leitura) => {
    const porFaixa = (faixas.find((f) => n >= f.de && n <= f.ate) || {}).materia;
    if (porFaixa) return porFaixa;
    const lista = cabecalhos[leitura] || [];
    if (!lista.length || em == null) return null;
    let atual = null;
    for (const c of lista) { if (c.em <= em) atual = c.materia; else break; }
    return atual;
  };

  // A melhor versao de cada questao entre as tres leituras: vence a que
  // conseguiu fechar mais alternativas.
  // 🔴 O FORMATO E DESCOBERTO, nao suposto. Ate 22/09/2026 o leitor so conhecia
  // o da Forca Aerea, e por isso "nao havia" prova de bombeiro -- havia, e eu
  // nao sabia ler. Ver FORMATOS, acima.
  const achado = detectarFormato(lidas[0]) || detectarFormato(lidas.join("\n"));
  const formato = achado ? achado.formato : FORMATOS[0];

  const porNumero = new Map();
  lidas.forEach((leitura, iLeitura) => {
    const marcas = [...leitura.matchAll(new RegExp(formato.questao.source, formato.questao.flags))];
    for (let i = 0; i < marcas.length; i++) {
      const n = parseInt(marcas[i][1], 10);
      if (n < 1 || n > 300) continue;
      const fim = i + 1 < marcas.length ? marcas[i + 1].index : leitura.length;
      const bruto = leitura.slice(marcas[i].index, fim);
      const f = fatiar(bruto, formato);
      const nota = f ? Object.keys(f.alts).length : 0;
      const atual = porNumero.get(n);
      if (!atual || nota > atual.nota) porNumero.set(n, { n, bruto, nota, em: marcas[i].index, leitura: iLeitura });
    }
  });
  const encontradas = [...porNumero.values()].sort((a, b) => a.n - b.n);

  const prontas = [], revisar = [];
  for (const q of encontradas) {
    const f = fatiar(q.bruto, formato);
    const base = {
      numero: q.n,
      materia: materiaDe(q.n, q.em, q.leitura),
      enunciado: f ? f.enunciado : "",
      alternativas: f ? f.alts : {},
      gabarito: respostas.get(q.n) ?? null,
    };
    const parar = (motivo) => revisar.push({ ...base, motivo });

    if (anuladas.has(q.n)) { parar("anulada pela banca"); continue; }
    if (!f || Object.keys(f.alts).length < 4 || !f.enunciado) { parar("alternativas nao fecharam em 4"); continue; }
    if (!respostas.has(q.n) && !incluirSemGabarito) { parar("sem gabarito"); continue; }
    const tudo = f.enunciado + " " + Object.values(f.alts).join(" ");
    if (PEDE_FIGURA.test(tudo)) { parar("depende de figura"); continue; }
    if (TEM_FORMULA.test(tudo)) { parar("tem formula ou simbolo"); continue; }
    if (suja(f.alts)) { parar("lixo colado na alternativa"); continue; }
    if (/Págin|CÓDIGO DA|MINISTÉRIO|COMANDO DA/i.test(tudo)) { parar("cabecalho ou rodape vazou"); continue; }

    prontas.push(base);
  }

  return { prontas, revisar, total: encontradas.length, faixas,
           gabaritos: respostas.size, formato: formato.id };
}
