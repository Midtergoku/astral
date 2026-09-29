/* ═══════════════════════════════════════════════════════════════════════════
   TRIA-PROVAS -- o que tem na pasta de chegada, e o que cada PDF e.

   POR QUE EXISTE (29/09/2026)
   Proposta dele: "eu baixo, coloco numa outra pasta tudo, e voce entra nos
   arquivos, ve, renomeia da maneira certa e joga na pasta certa". Ele nao
   precisa acertar nome nenhum -- download sai "prova (3).pdf", "GAB_DEF.pdf".

   Para cada PDF em ../ASTRAL-provas/_chegada, abre e diz:
     - se parece CADERNO (questoes) ou GABARITO (tabela de letras)
     - banca/orgao, ano e tipo (A, B, 1, 2...) lidos no proprio texto
     - um nome sugerido no padrao do importa-provas
   NAO move nem renomeia nada: so mostra. Quem decide e confere sou eu, e a
   prova do casamento (prova x gabarito) continua sendo resolver questoes na
   mao antes de gravar -- ver historico/roadmap-ate-a-primeira-assinatura.md, 3b.

   USO   node tools/tria-provas.js [pasta]
   ═══════════════════════════════════════════════════════════════════════════ */

const { execFileSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const RAIZ = path.resolve(__dirname, "..");
const PASTA = process.argv[2] || path.resolve(RAIZ, "..", "ASTRAL-provas", "_chegada");

const ORGAOS = [
  [/EEAR|ESCOLA DE ESPECIALISTAS DE AERON|CFS\s*\d\/\d{4}|EAGS/i, "EEAR"],
  [/EPCAR|CPCAR/i, "EPCAR"],
  [/\bAFA\b|ACADEMIA DA FOR[ÇC]A A[ÉE]REA|CFOAV/i, "AFA"],
  [/ESCOLA DE SARGENTOS DAS ARMAS|\bESA\b|CFGS/i, "ESA"],
  [/ESPCEX|ESCOLA PREPARAT[ÓO]RIA DE CADETES DO EX/i, "EsPCEx"],
  [/COL[ÉE]GIO NAVAL|CPACN/i, "ColegioNaval"],
  [/APRENDIZES.?MARINHEIROS|CPAEAM|\bEAM\b/i, "EAM"],
  [/ESCOLA NAVAL|CPAEN/i, "EscolaNaval"],
  [/CBMERJ|BOMBEIROS? MILITAR DO ESTADO DO RIO/i, "CBMERJ"],
  [/CBMMG|BOMBEIROS? MILITAR DE MINAS/i, "CBMMG"],
  [/CBMES|BOMBEIROS? MILITAR DO ESP[ÍI]RITO SANTO/i, "CBMES"],
  [/CBMDF|BOMBEIROS? MILITAR DO DISTRITO FEDERAL/i, "CBMDF"],
  [/POL[ÍI]CIA RODOVI[ÁA]RIA FEDERAL|\bPRF\b/i, "PRF"],
  [/POL[ÍI]CIA MILITAR/i, "PM"],
];
const BANCAS = [[/CEBRASPE|CESPE/i, "Cebraspe"], [/\bFGV\b|GET[ÚU]LIO VARGAS/i, "FGV"],
  [/VUNESP/i, "Vunesp"], [/AOCP/i, "AOCP"], [/IBFC/i, "IBFC"], [/IDECAN/i, "Idecan"]];

function ler(pdf) {
  try { return execFileSync("pdftotext", ["-enc", "UTF-8", pdf, "-"], { encoding: "utf8", maxBuffer: 64 << 20 }); }
  catch { return ""; }
}

if (!fs.existsSync(PASTA)) {
  fs.mkdirSync(PASTA, { recursive: true });
  console.log(`Pasta criada: ${PASTA}\n(vazia -- e aqui que os PDFs baixados chegam)`);
  process.exit(0);
}
const pdfs = fs.readdirSync(PASTA).filter((f) => /\.pdf$/i.test(f));
console.log(`\nTRIA-PROVAS  ${PASTA}\n${pdfs.length} PDF(s)\n`);
for (const f of pdfs) {
  const t = ler(path.join(PASTA, f));
  const paginas = Math.max(1, t.split("\f").length - 1);
  const inicio = t.slice(0, 4000).replace(/\s+/g, " ");
  const plano = t.replace(/\s+/g, " ");
  const orgao = (ORGAOS.find(([re]) => re.test(inicio)) || [, "?"])[1];
  const banca = (BANCAS.find(([re]) => re.test(inicio)) || [, ""])[1];
  const ano = (inicio.match(/\b(20[0-3]\d)\b/) || [])[1] || "?";
  const tipo = (inicio.match(/\b(?:TIPO|PROVA|MODELO)\s*[:\-]?\s*([A-H1-9])\b/i) || [])[1] || "";
  /* Gabarito ou caderno: pelo TAMANHO. A primeira versao olhava letra solta e a
     palavra "gabarito" -- e o caderno tem as duas (as alternativas "A)" e as
     instrucoes da folha de respostas). Medido nos arquivos reais: gabarito tem
     1 a 4 paginas; caderno, 15 ou mais. */
  const semTexto = t.trim().length < 200;
  const tipoDoc = semTexto ? "SEM TEXTO (imagem -- precisa de outra leitura)"
    : paginas <= 4 ? "GABARITO" : "CADERNO";
  const sugestao = `${orgao}_${ano}_${[banca, tipo ? `TIPO-${tipo}` : ""].filter(Boolean).join("_") || "prova"}`
    + (tipoDoc === "GABARITO" ? "_gabarito" : "") + ".pdf";
  console.log(`• ${f}`);
  console.log(`    ${tipoDoc} · ${paginas} pág. · órgão ${orgao}${banca ? ` · banca ${banca}` : ""} · ano ${ano}${tipo ? ` · tipo ${tipo}` : ""}`);
  console.log(`    sugestão: ${sugestao}`);
  console.log(`    começo: ${inicio.slice(0, 150)}\n`);
}
