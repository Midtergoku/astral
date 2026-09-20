// Prova que a checagem 16 PEGA o defeito -- nao basta ela dar verde no codigo certo.
// Licao dos 3 dias de 2026: teste que nunca reproduziu o defeito nao prova conserto.
// Estraga arvore.html de proposito, roda o verifica, e devolve o arquivo ao original.
const fs = require("fs");
const { execFileSync } = require("child_process");
// Raiz por __dirname, nunca escrita a mao: em 15/09 o valida-css.js tinha
// "c:/Users/Lucas/Desktop/ASTRAL" digitado dentro e morreu em silencio quando o
// projeto mudou de pasta. Ferramenta que so roda num computador nao e ferramenta.
const RAIZ = require("path").resolve(__dirname, "..");
const alvo = RAIZ + "/arvore.html";

const original = fs.readFileSync(alvo, "utf8");
const cenarios = [
  {
    nome: "marca no link errado (o defeito que ele achou)",
    quebrar: (t) => t
      .replace('<a class="nav-link active" href="arvore.html">', '<a class="nav-link" href="arvore.html">')
      .replace('<a class="nav-link" href="tags.html">', '<a class="nav-link active" href="tags.html">'),
  },
  {
    nome: "nenhum link aceso",
    quebrar: (t) => t.replace('<a class="nav-link active" href="arvore.html">', '<a class="nav-link" href="arvore.html">'),
  },
  {
    nome: "dois links acesos ao mesmo tempo",
    quebrar: (t) => t.replace('<a class="nav-link" href="tags.html">', '<a class="nav-link active" href="tags.html">'),
  },
];

function rodaVerifica() {
  try {
    execFileSync(process.execPath, [RAIZ + "/tools/verifica.js"], { stdio: "pipe", encoding: "utf8" });
    return { saiu: 0, saida: "" };
  } catch (e) {
    return { saiu: e.status, saida: String(e.stdout || "") };
  }
}

let falhas = 0;
try {
  for (const c of cenarios) {
    const quebrado = c.quebrar(original);
    if (quebrado === original) { console.log("  FALHA  " + c.nome + " -- nao consegui quebrar"); falhas++; continue; }
    fs.writeFileSync(alvo, quebrado, "utf8");
    const r = rodaVerifica();
    const pegou = r.saiu !== 0 && /Barra lateral acendendo a pagina errada/.test(r.saida);
    if (pegou) {
      const linha = (r.saida.split("\n").find((l) => l.includes("arvore.html:")) || "").trim();
      console.log("  OK     pegou: " + c.nome);
      console.log("           " + linha);
    } else {
      console.log("  FALHA  NAO pegou: " + c.nome + " (saiu " + r.saiu + ")");
      falhas++;
    }
  }
} finally {
  fs.writeFileSync(alvo, original, "utf8");
}

// Devolvido ao original? Conferir, nao supor.
const agora = fs.readFileSync(alvo, "utf8");
if (agora !== original) { console.error("\n  FALHA GRAVE: arvore.html NAO voltou ao original"); process.exit(1); }
console.log("\n  arvore.html devolvido ao original (conferido byte a byte)");

const r = rodaVerifica();
if (r.saiu !== 0) { console.error("  FALHA: o verifica nao ficou limpo depois de devolver"); process.exit(1); }
console.log("  e o verifica voltou a ficar limpo");

process.exit(falhas === 0 ? 0 : 1);
