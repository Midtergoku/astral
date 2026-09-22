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
const MATERIAS_CONHECIDAS = [
  [/portugu[êe]s/i,                    "Português"],
  [/\bingl[êe]s/i,                     "Inglês"],
  [/\bespanhol/i,                      "Espanhol"],
  [/matem[áa]tica/i,                   "Matemática"],
  [/\bf[íi]sica/i,                     "Física"],
  [/\bqu[íi]mica/i,                    "Química"],
  [/\bbiologia/i,                      "Biologia"],
  [/hist[óo]ria\s+e\s+geografia/i,     "História e Geografia"],
  [/hist[óo]ria/i,                     "História"],
  [/geografia/i,                       "Geografia"],
  [/reda[çc][ãa]o/i,                   "Redação"],
  [/inform[áa]tica/i,                  "Informática"],
  [/\bdireito\b/i,                     "Direito"],
];

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

/** Separa um bloco bruto em enunciado + alternativas. */
export function fatiar(bruto) {
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
  const materiaDe = (n) => (faixas.find((f) => n >= f.de && n <= f.ate) || {}).materia || null;

  // A melhor versao de cada questao entre as tres leituras: vence a que
  // conseguiu fechar mais alternativas.
  const porNumero = new Map();
  for (const leitura of lidas) {
    const marcas = [...leitura.matchAll(/^(\d{2})\s+[–-]\s+/gm)];
    for (let i = 0; i < marcas.length; i++) {
      const n = parseInt(marcas[i][1], 10);
      if (n < 1 || n > 200) continue;
      const fim = i + 1 < marcas.length ? marcas[i + 1].index : leitura.length;
      const bruto = leitura.slice(marcas[i].index, fim);
      const f = fatiar(bruto);
      const nota = f ? Object.keys(f.alts).length : 0;
      const atual = porNumero.get(n);
      if (!atual || nota > atual.nota) porNumero.set(n, { n, bruto, nota });
    }
  }
  const encontradas = [...porNumero.values()].sort((a, b) => a.n - b.n);

  const prontas = [], revisar = [];
  for (const q of encontradas) {
    const f = fatiar(q.bruto);
    const base = {
      numero: q.n,
      materia: materiaDe(q.n),
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

  return { prontas, revisar, total: encontradas.length, faixas, gabaritos: respostas.size };
}
