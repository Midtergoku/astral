/* ═══════════════════════════════════════════════════════════════════════════
   TESTA-LINKS -- o conferidor de links do guia corta o inventado e poupa o real?

   POR QUE EXISTE (30/09/2026)
   Ele: "o risco da IA inventar professores e links -- valide cada link antes
   de exibir". O conferidor mora em supabase/functions/_shared/links.ts e roda
   no buscar-recursos antes de guardar o guia. Este teste chama o MESMO arquivo
   (o Node 24 le TypeScript direto) contra o YouTube e a internet de verdade.

   ⚠️ Daqui a internet e a de casa. No servidor o YouTube responde diferente --
   foi medido la em 30/09 com uma funcao temporaria (12 de 12), e foi assim que
   se achou o corte em 400 mil caracteres que cegava tudo. Mudou o links.ts?
   Medir de novo NO SERVIDOR, nao so aqui. Ver .claude/rules/backend.md 8.21.

   USO   node tools/testa-links.js      (nao gasta credito nenhum)
   ═══════════════════════════════════════════════════════════════════════════ */

const path = require("path");
const { pathToFileURL } = require("url");

const CASOS = [
  ["canal real por @", "https://www.youtube.com/@professorferretto", "ok"],
  ["canal real por código", "https://www.youtube.com/channel/UCW9_n8p_Byz-4k8wV1tnUBg", "ok"],
  ["canal inventado por @", "https://www.youtube.com/@canalinventado-xyz-astral-9876", "morto"],
  ["canal inventado por código", "https://www.youtube.com/channel/UCxxxxxxxxxxxxxxxxxxxxxx", "morto"],
  ["vídeo real", "https://www.youtube.com/watch?v=dQw4w9WgXcQ", "ok"],
  ["vídeo inventado", "https://www.youtube.com/watch?v=AAAAAAAAAAA", "morto"],
  ["youtube.com puro (não é professor)", "https://youtube.com/", "morto"],
  ["busca no YouTube", "https://www.youtube.com/results?search_query=matematica+eear", "ok"],
  ["site real", "https://pt.khanacademy.org/", "ok"],
  ["página morta de site real", "https://www.estrategiaconcursos.com.br/nao-existe-astral-123", "morto"],
  ["domínio que não existe", "https://www.professor-inventado-astral-xyz.com.br/apostila", "morto"],
];

(async () => {
  const { conferirLinks } = await import(pathToFileURL(path.join(__dirname, "..", "supabase/functions/_shared/links.ts")).href);
  console.log("\nTESTA-LINKS -- o conferidor do guia de professores\n");
  let falhas = 0;
  for (const [nome, url, esperado] of CASOS) {
    const { conta } = await conferirLinks({ x: [{ url }] }, ["x"]);
    const veio = conta.ok ? "ok" : conta.morto ? "morto" : "incerto";
    if (veio === esperado) console.log(`  OK     ${nome.padEnd(38)} ${veio}`);
    else { console.log(`  FALHA  ${nome.padEnd(38)} veio ${veio}, esperado ${esperado}`); falhas++; }
  }
  // O guia inteiro: o inventado sai, o real fica, e a ordem se mantem.
  const { dados, conta } = await conferirLinks({
    dica: "x",
    professores: [
      { nome: "Real", url: "https://www.youtube.com/@professorferretto" },
      { nome: "Inventado", url: "https://www.youtube.com/@canalinventado-xyz-astral-9876" },
    ],
  }, ["professores"]);
  const nomes = dados.professores.map((p) => p.nome).join(",");
  if (nomes === "Real" && dados.dica === "x") console.log(`  OK     ${"guia: o inventado sai, o real fica".padEnd(38)} ${conta.cortados.length} cortado`);
  else { console.log(`  FALHA  guia filtrado errado: ${nomes}`); falhas++; }

  console.log("\n" + "=".repeat(70));
  console.log(falhas ? `🔴 ${falhas} FALHA(S).` : "O CONFERIDOR CORTA O INVENTADO E POUPA O REAL.");
  process.exit(falhas ? 1 : 0);
})();
