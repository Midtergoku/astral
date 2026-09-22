// CLASSIFICA-ASSUNTO -- descobrir o assunto de cada questao por palavra-chave.
//
//   node tools/classifica-assunto.js <questoes.json> [--listar]
//
// Pedido do Lucas em 18/09/2026: filtrar questao por BANCA, por MATERIA e --
// a parte que faz diferenca -- pelo ASSUNTO DENTRO da materia. "As vezes ela
// quer estudar matematica, mas ela quer estudar sobre funcoes ou porcentagem."
//
// 🔴 EM 21/09/2026 O DICIONARIO SAIU DAQUI. Ele mora em `assets/js/assuntos.js`,
// porque a tela `importar.html` precisa da MESMA classificacao e o Lucas nao
// roda terminal. Duas copias divergiriam em silencio -- e uma questao
// classificada de um jeito aqui e de outro la so apareceria meses depois.
// Esta ferramenta virou o que ela sempre deveria ter sido: um RELATORIO.
//
// Ele mede COBERTURA sozinho -- quantas questoes recebem algum assunto. Isso e
// verificavel por programa. Ele NAO mede ACERTO: para saber se "funcoes" esta
// certo e preciso ler a questao. Medido em 19/09: 83% na prova em que o
// dicionario foi ajustado, 71% numa prova as cegas. 🔴 O 71% e o numero
// honesto -- o outro mede o dicionario contra si mesmo.
const fs = require("fs");
const path = require("path");

const arquivo = process.argv[2];
if (!arquivo || !fs.existsSync(arquivo)) {
  console.log("uso: node tools/classifica-assunto.js <questoes.json> [--listar]");
  process.exit(arquivo ? 1 : 0);
}
const listar = process.argv.includes("--listar");

(async () => {
  const { classificarLista, assuntosConhecidos } =
    await import("../assets/js/assuntos.js");

  const questoes = JSON.parse(fs.readFileSync(arquivo, "utf8"));
  const semMateria = questoes.filter((q) => !q.materia).length;
  if (semMateria) {
    console.log(`\n  ⚠️  ${semMateria} questao(oes) sem o campo \`materia\`.`);
    console.log("     A materia vem do PROPRIO PDF, e sem ela nao da para classificar:");
    console.log("     cada questao seria comparada com o vocabulario da materia errada.");
    console.log("     Gere de novo com o prova-para-questoes atual.");
  }

  const r = classificarLista(questoes);

  console.log(`\nCLASSIFICA-ASSUNTO  ${path.basename(arquivo)}\n`);
  console.log(`  questoes            ${questoes.length}`);
  console.log(`  com assunto         ${r.comAssunto}  (${r.cobertura}%)`);
  console.log(`  sem assunto         ${r.sem}`);

  const porMateria = {};
  for (const q of r.questoes) {
    const m = q.materia || "(sem materia)";
    (porMateria[m] ||= { total: 0, com: 0, assuntos: {} }).total++;
    if (q.assunto) {
      porMateria[m].com++;
      porMateria[m].assuntos[q.assunto] = (porMateria[m].assuntos[q.assunto] || 0) + 1;
    }
  }
  console.log("\n  POR MATERIA");
  for (const [m, d] of Object.entries(porMateria)) {
    const pct = d.total ? Math.round((d.com / d.total) * 100) : 0;
    console.log(`     ${m.padEnd(14)} ${String(d.com).padStart(3)}/${String(d.total).padEnd(3)} (${pct}%)`);
    const tops = Object.entries(d.assuntos).sort((a, b) => b[1] - a[1]);
    for (const [a, n] of tops) console.log(`        ${String(n).padStart(3)}  ${a}`);
  }

  if (listar) {
    console.log("\n  AS QUE NAO CLASSIFICARAM (assunto fica NULO, de proposito)");
    for (const q of r.questoes.filter((x) => !x.assunto)) {
      console.log(`     ${String(q.numero).padStart(3)} ${q.materia || "?"} — ${String(q.enunciado).slice(0, 70)}...`);
    }
  }

  const conhecidos = assuntosConhecidos();
  const totalRegras = Object.values(conhecidos).flat().length;
  console.log(`\n  o dicionario conhece ${totalRegras} assuntos em ${Object.keys(conhecidos).length} materias`);
  console.log("  🔴 cobertura NAO e acerto: para saber se o assunto esta certo, tem de ler a questao.\n");
})();
