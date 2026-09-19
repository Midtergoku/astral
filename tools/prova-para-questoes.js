// PROVA-PARA-QUESTOES -- transforma o PDF de uma prova militar antiga em
// questoes estruturadas, sem gastar um centavo e sem chamar IA nenhuma.
//
//   node tools/prova-para-questoes.js caminho/da/prova.pdf [saida.json]
//
// NAO grava em banco nenhum e nao mexe no site. E ferramenta de medicao e
// preparo: le, estrutura, AUDITA e escreve um JSON. A decisao de publicar
// qualquer questao continua sendo do Lucas.
//
// ── POR QUE ISTO EXISTE ──────────────────────────────────────────────────────
// Ideia dele em 17/09/2026: banco de questoes de provas antigas de dominio
// publico. A pergunta era "quanto custa o esforco?". Este arquivo e a resposta
// medida, contra a prova REAL da EEAR CFS 2/2025 (96 questoes):
//
//     78 de 96 saem utilizaveis sozinhas (81%)
//     16 pedem revisao -- quase todas porque dependem de FIGURA
//      1 anulada pela banca, descartada automaticamente
//     470 bytes por questao -> 10.000 questoes = 4,5 MB do plano free (500 MB)
//
// ── AS QUATRO ARMADILHAS, todas encontradas medindo ─────────────────────────
// 1. FORM FEED. O pdftotext separa pagina com 0x0C, e o "^" do modo multilinha
//    do JavaScript NAO casa depois dele. Onze questoes de 96 sumiram caladas,
//    e o total (85) parecia plausivel demais para levantar suspeita.
// 2. DUAS COLUNAS. Quando a pergunta cai no pe de uma coluna e as alternativas
//    no alto da outra, a leitura em fluxo separa as duas. Por isso sao TRES
//    leituras do mesmo PDF -- fluxo, coluna esquerda, coluna direita -- e fica
//    a melhor versao de cada questao.
// 3. ALTERNATIVA NO MEIO DA LINHA. A banca imprime "a) 16/3 b) 2/5 c) 6 d) -3"
//    numa linha so quando cabe. Exigir "a)" no inicio da linha jogava fora
//    questoes perfeitas.
// 4. A ULTIMA ALTERNATIVA VAZA. Ela corre ate o fim do bloco e arrasta
//    cabecalho, rodape e o texto de apoio da questao seguinte.
//
// ── E A ARMADILHA QUE NAO TEM CONSERTO AUTOMATICO ───────────────────────────
// Questao que depende de figura, grafico ou tirinha nao existe em texto. Sao
// 11 das 96. Elas saem separadas, marcadas, e nunca entram como se estivessem
// prontas -- questao truncada e PIOR que questao ausente para quem estuda.
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");
const os = require("os");

const pdf = process.argv[2];
if (!pdf || !fs.existsSync(pdf)) {
  console.log("uso: node tools/prova-para-questoes.js <prova.pdf> [saida.json]");
  console.log("     precisa do pdftotext (ja vem com o PortableGit deste projeto)");
  process.exit(pdf ? 1 : 0);
}
const saida = (process.argv[3] && !process.argv[3].startsWith("--"))
  ? process.argv[3]
  : pdf.replace(/\.pdf$/i, "") + "-questoes.json";

/* 🔴 DESCOBERTO EM 19/09/2026, e corrige uma afirmacao minha de 17/09:
   O GABARITO NAO VEM SEMPRE NO MESMO PDF.

   Eu tinha escrito "o gabarito vem no mesmo pdf, nao precisa de segunda fonte"
   depois de medir UMA prova -- a oficial da FAB, que por acaso traz os dois
   juntos. Testei uma segunda prova da MESMA banca, de outro ano, baixada de um
   cursinho: 94 questoes encontradas e ZERO gabarito. O arquivo ate se chama
   "PROVA E GABARITOS", e nao tem gabarito nenhum dentro.

   Ou seja: ter o gabarito junto e propriedade do ARQUIVO, nao da banca. Com
   este sinalizador as questoes saem mesmo sem resposta, marcadas com
   gabarito null, para casar depois com um gabarito de outra fonte. Sem ele,
   questao sem gabarito nao entra -- que continua sendo o certo para publicar. */
const INCLUIR_SEM_GABARITO = process.argv.includes("--sem-gabarito");

// ── Extrair, de tres jeitos ─────────────────────────────────────────────────
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "prova-"));
const extrair = (args, nome) => {
  const alvo = path.join(tmp, nome);
  try {
    execFileSync("pdftotext", ["-enc", "UTF-8", ...args, pdf, alvo], { stdio: "pipe" });
    return fs.readFileSync(alvo, "utf8");
  } catch (e) {
    console.log(`  aviso: pdftotext falhou em ${nome} -- ${String(e.message).split("\n")[0]}`);
    return "";
  }
};
const FF = String.fromCharCode(12);
const limpar = (s) => s.split(FF).join("\n");
const LEITURAS = [
  limpar(extrair([], "fluxo.txt")),
  limpar(extrair(["-marginr", "300"], "esq.txt")),
  limpar(extrair(["-marginl", "295"], "dir.txt")),
].filter(Boolean);

if (!LEITURAS.length) { console.log("🔴 nao consegui extrair texto nenhum do PDF."); process.exit(1); }

// ── Gabarito, que vem no MESMO pdf ──────────────────────────────────────────
// A EEAR publica o caderno JA com o gabarito oficial na frente -- nao e preciso
// segunda fonte. Confirmado lendo a tabela por dois caminhos independentes:
// 95 respostas cada, 0 divergencias.
const gabarito = new Map();
const anuladas = new Set();
for (const m of LEITURAS[0].matchAll(/\b(\d{2})\s+([A-E])\b/g)) {
  const n = parseInt(m[1], 10);
  if (n >= 1 && n <= 200 && !gabarito.has(n)) gabarito.set(n, m[2]);
}
for (const m of LEITURAS[0].matchAll(/\b(\d{2})\s+ANULADA/gi)) anuladas.add(parseInt(m[1], 10));

/* ── De que MATERIA e cada questao ───────────────────────────────────────────
   🔴 ERRO MEU, achado em 19/09/2026 ao testar a segunda prova: eu deduzia a
   materia pela FAIXA DE NUMERO, supondo blocos de 24 na ordem portugues,
   matematica, fisica, ingles. Isso valia para a prova de 2025 e NAO vale em
   geral -- a de 2022 e portugues, INGLES, matematica, fisica. O resultado foi
   limpo demais para ser falta de dicionario: 0% em tres materias de quatro,
   porque toda questao estava sendo comparada com o vocabulario da materia
   errada.

   A prova DIZ a ordem, em letra garrafal: "AS QUESTOES DE 25 A 48 REFEREM-SE A
   LINGUA INGLESA". Ler o que esta escrito e melhor do que deduzir de um
   padrao observado uma vez. */
function faixasDeMateria(texto) {
  const faixas = [];
  const re = /QUEST[ÕO]ES\s+DE\s+(\d+)\s+A\s+(\d+)\s+REFEREM[‐\-]?SE\s+[ÀA]\s+([^\n]+)/gi;
  for (const m of texto.matchAll(re)) {
    const nome = m[3].trim()
      .replace(/^L[ÍI]NGUA\s+/i, "")
      .replace(/\s{2,}.*$/, "")
      .replace(/[.:;]+$/, "");
    faixas.push({ de: parseInt(m[1], 10), ate: parseInt(m[2], 10), materia: arrumarNome(nome) });
  }
  return faixas;
}
function arrumarNome(n) {
  const s = n.toLowerCase();
  if (s.startsWith("portugu")) return "Português";
  if (s.startsWith("ingles") || s.startsWith("inglês")) return "Inglês";
  if (s.startsWith("matem")) return "Matemática";
  if (s.startsWith("f[íi]sica") || s.startsWith("fisica") || s.startsWith("física")) return "Física";
  return n.charAt(0).toUpperCase() + n.slice(1).toLowerCase();
}
const FAIXAS = faixasDeMateria(LEITURAS[0]);
const materiaDe = (n) => (FAIXAS.find((f) => n >= f.de && n <= f.ate) || {}).materia || null;

// ── Fatiar ───────────────────────────────────────────────────────────────────
function fatiar(bruto) {
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
  const pedacos = [...resto.matchAll(/(^|\s)([a-d])\)\s/g)];
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

// ── A melhor versao de cada questao ─────────────────────────────────────────
const porNumero = new Map();
for (const leitura of LEITURAS) {
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
const questoes = [...porNumero.values()].sort((a, b) => a.n - b.n);

// ── Classificar e auditar ───────────────────────────────────────────────────
const PEDE_FIGURA = /figura|gr[áa]fico|imagem|tirinha|charge|na ilustra|conforme (a )?figura|ao lado/i;
const TEM_FORMULA = /√|∫|∑|≤|≥|≠|±|→|∞|\^\d|_\{|π\b/;
const suja = (alts) => Object.values(alts).some(
  (v) => v.length > 300 || /[A-ZÀ-Ú]{5,}\s+[A-ZÀ-Ú]{4,}/.test(v)
);

const prontas = [], revisar = [];
for (const q of questoes) {
  const motivo = (m) => revisar.push({ n: q.n, motivo: m });
  if (anuladas.has(q.n)) { motivo("anulada pela banca"); continue; }
  const f = fatiar(q.bruto);
  if (!f || Object.keys(f.alts).length < 4 || !f.enunciado) { motivo("alternativas nao fecharam em 4"); continue; }
  if (!gabarito.has(q.n) && !INCLUIR_SEM_GABARITO) { motivo("sem gabarito"); continue; }
  const tudo = f.enunciado + " " + Object.values(f.alts).join(" ");
  if (PEDE_FIGURA.test(tudo)) { motivo("depende de figura"); continue; }
  if (TEM_FORMULA.test(tudo)) { motivo("tem formula/simbolo"); continue; }
  if (suja(f.alts)) { motivo("lixo colado na alternativa"); continue; }
  // Ultima peneira: o rodape da prova as vezes vira texto de alternativa.
  if (/Págin|CÓDIGO DA|MINISTÉRIO|COMANDO DA/i.test(tudo)) { motivo("cabecalho/rodape vazou"); continue; }
  prontas.push({
    numero: q.n, materia: materiaDe(q.n), enunciado: f.enunciado,
    a: f.alts.a, b: f.alts.b, c: f.alts.c, d: f.alts.d,
    gabarito: gabarito.get(q.n) ?? null,
  });
}

fs.writeFileSync(saida, JSON.stringify(prontas, null, 2), "utf8");
fs.rmSync(tmp, { recursive: true, force: true });

const total = questoes.length;
const pct = total ? ((prontas.length / total) * 100).toFixed(0) : 0;
console.log(`\nPROVA-PARA-QUESTOES  ${path.basename(pdf)}\n`);
console.log(`  questoes encontradas   ${total}`);
console.log(`  materias lidas do PDF  ${FAIXAS.length
  ? FAIXAS.map((f) => `${f.materia} ${f.de}-${f.ate}`).join(" | ")
  : "🔴 NENHUMA -- este PDF nao traz os cabecalhos de bloco"}`);
console.log(`  PRONTAS                ${prontas.length}  (${pct}%)  -> ${saida}`);
console.log(`  precisam de revisao    ${revisar.length}`);
const porMotivo = {};
for (const x of revisar) (porMotivo[x.motivo] ||= []).push(x.n);
for (const [m, ns] of Object.entries(porMotivo)) console.log(`     ${m.padEnd(30)} ${ns.length}  (${ns.join(", ")})`);
if (prontas.length) {
  const bytes = Math.round(JSON.stringify(prontas).length / prontas.length);
  console.log(`\n  ${bytes} bytes por questao -- 10.000 questoes = ${((bytes * 10000) / 1024 / 1024).toFixed(1)} MB`);
}
console.log("\n  🔴 NADA foi gravado no banco. Isto so le e escreve um JSON.\n");
