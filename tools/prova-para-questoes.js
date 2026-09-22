// PROVA-PARA-QUESTOES -- transforma o PDF de uma prova militar antiga em
// questoes estruturadas, sem gastar um centavo e sem chamar IA nenhuma.
//
//   node tools/prova-para-questoes.js caminho/da/prova.pdf [saida.json]
//
// NAO grava em banco nenhum e nao mexe no site. E ferramenta de medicao e
// preparo: le, estrutura, AUDITA e escreve um JSON. A decisao de publicar
// qualquer questao continua sendo do Lucas -- e agora ele faz isso sozinho,
// na tela `importar.html`, sem precisar de mim na frente.
//
// 🔴 EM 21/09/2026 O ENTENDIMENTO DA PROVA SAIU DAQUI. Ele mora em
// `assets/js/prova.js`, porque a tela de importacao precisa do MESMO
// entendimento e o Lucas nao roda terminal. O que ficou aqui e a unica parte
// que os dois lados fazem diferente: EXTRAIR O TEXTO. Aqui e o `pdftotext`;
// la e o pdf.js do navegador.
//
// ── POR QUE ISTO EXISTE ──────────────────────────────────────────────────────
// Ideia dele em 17/09/2026: banco de questoes de provas antigas de dominio
// publico. A pergunta era "quanto custa o esforco?". Esta e a resposta medida,
// contra a prova REAL da EEAR CFS 2/2025 (96 questoes):
//
//     78 de 96 saem utilizaveis sozinhas (81%)
//     16 pedem revisao -- quase todas porque dependem de FIGURA
//      1 anulada pela banca, separada automaticamente
//     470 bytes por questao -> 10.000 questoes = 4,5 MB do plano free (500 MB)
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

   Ou seja: ter o gabarito junto e propriedade do ARQUIVO, nao da banca. */
const INCLUIR_SEM_GABARITO = process.argv.includes("--sem-gabarito");

// ── A UNICA PARTE QUE E SO DAQUI: extrair texto, de tres jeitos ─────────────
// Tres leituras do mesmo PDF porque quando a pergunta cai no pe de uma coluna
// e as alternativas no alto da outra, a leitura em fluxo separa as duas.
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

(async () => {
  const { montarQuestoes } = await import("../assets/js/prova.js");

  const leituras = [
    extrair([], "fluxo.txt"),
    extrair(["-marginr", "300"], "esq.txt"),
    extrair(["-marginl", "295"], "dir.txt"),
  ].filter(Boolean);
  fs.rmSync(tmp, { recursive: true, force: true });

  if (!leituras.length) { console.log("🔴 nao consegui extrair texto nenhum do PDF."); process.exit(1); }

  const r = montarQuestoes(leituras, { incluirSemGabarito: INCLUIR_SEM_GABARITO });

  fs.writeFileSync(saida, JSON.stringify(r.prontas, null, 2), "utf8");

  const pct = r.total ? ((r.prontas.length / r.total) * 100).toFixed(0) : 0;
  console.log(`\nPROVA-PARA-QUESTOES  ${path.basename(pdf)}\n`);
  console.log(`  questoes encontradas   ${r.total}`);
  console.log(`  gabaritos no proprio PDF ${r.gabaritos}${r.gabaritos ? "" : "  🔴 NENHUM -- use --sem-gabarito e case com outra fonte"}`);
  console.log(`  materias lidas do PDF  ${r.faixas.length
    ? r.faixas.map((f) => `${f.materia} ${f.de}-${f.ate}`).join(" | ")
    : "🔴 NENHUMA -- este PDF nao traz os cabecalhos de bloco"}`);
  console.log(`  PRONTAS                ${r.prontas.length}  (${pct}%)  -> ${saida}`);
  console.log(`  precisam de revisao    ${r.revisar.length}`);

  const porMotivo = {};
  for (const x of r.revisar) (porMotivo[x.motivo] ||= []).push(x.numero);
  for (const [m, ns] of Object.entries(porMotivo)) {
    console.log(`     ${m.padEnd(32)} ${String(ns.length).padStart(3)}  (${ns.join(", ")})`);
  }

  if (r.prontas.length) {
    const bytes = Math.round(JSON.stringify(r.prontas).length / r.prontas.length);
    console.log(`\n  ${bytes} bytes por questao -- 10.000 questoes = ${((bytes * 10000) / 1024 / 1024).toFixed(1)} MB`);
  }
  console.log("\n  🔴 NADA foi gravado no banco. Isto so le e escreve um JSON.");
  console.log("     Para publicar de verdade, o Lucas usa a tela /importar.html.\n");
})();
