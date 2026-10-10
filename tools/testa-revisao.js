/* ═══════════════════════════════════════════════════════════════════════════
   TESTA-REVISAO -- a revisao espacada pega o dia certo?

   POR QUE EXISTE (30/09/2026)
   O item 10 dele: "repeticao espacada, pelo menos um lembrete de revisao
   ligado ao diario". A regra mora em assets/js/revisao.js (funcao pura, curva
   de 1, 7 e 30 dias). Este teste roda a funcao sem banco nem navegador, com
   datas montadas, e cobre o que costuma dar errado em conta de dia: fuso,
   virada de mes, intervalo que nao bate e o "ja revisei hoje".

   USO   node tools/testa-revisao.js
   ═══════════════════════════════════════════════════════════════════════════ */

const path = require("path");
const { pathToFileURL } = require("url");

let falhas = 0;
const ok = (t, d = "") => console.log(`  OK     ${t.padEnd(56)} ${d}`);
const falha = (t, d = "") => { console.log(`  FALHA  ${t.padEnd(56)} ${d}`); falhas++; };

// Uma sessao as 20h de Brasilia (23h UTC) do dia dado.
const s = (materia, dia, hora = "23:00") => ({ materia, criado_em: `${dia}T${hora}:00Z` });

(async () => {
  const { revisoesDeHoje, quando } = await import(pathToFileURL(path.join(__dirname, "..", "assets/js/revisao.js")).href);
  console.log("\nTESTA-REVISAO -- a curva de 1, 7 e 30 dias\n");
  const HOJE = "2026-10-15";

  // 1. Os tres intervalos batem; os outros nao.
  let r = revisoesDeHoje([s("Física", "2026-10-14"), s("Química", "2026-10-08"), s("História", "2026-09-15"), s("Biologia", "2026-10-12")], HOJE);
  const nomes = r.map((x) => `${x.materia}:${x.haDias}`).join(",");
  nomes === "História:30,Química:7,Física:1" ? ok("1, 7 e 30 dias voltam; 3 dias não", nomes) : falha("intervalos", nomes);

  // 2. Virada de mes: 30 dias antes de 15/10 e 15/09.
  r = revisoesDeHoje([s("Geografia", "2026-09-15")], HOJE);
  r[0]?.haDias === 30 && r[0]?.estudadaEm === "2026-09-15" ? ok("atravessa a virada do mês", "15/09 -> 15/10") : falha("virada de mes", JSON.stringify(r));

  // 3. Fuso: 01h30 UTC do dia 15 ainda e dia 14 em Brasilia (22h30).
  r = revisoesDeHoje([{ materia: "Português", criado_em: "2026-10-15T01:30:00Z" }], HOJE);
  r[0]?.haDias === 1 ? ok("🎯 sessão às 22h30 de Brasília conta para o dia certo", "UTC já era o dia seguinte") : falha("fuso", JSON.stringify(r));

  // 4. Estudou de novo hoje: revisao feita.
  r = revisoesDeHoje([s("Física", "2026-10-08"), s("Física", HOJE, "15:00")], HOJE);
  r[0]?.feita === true ? ok("estudou a matéria hoje: revisão marcada como feita") : falha("feita", JSON.stringify(r));

  // 5. Estudou ha 30 E ha 1: vale o mais antigo (mais perto de esquecer).
  r = revisoesDeHoje([s("Matemática", "2026-09-15"), s("Matemática", "2026-10-14")], HOJE);
  r.length === 1 && r[0].haDias === 30 ? ok("mesma matéria em dois intervalos: aparece uma vez, a de 30") : falha("duplicada", JSON.stringify(r));

  // 6. Lixo nao quebra: data ilegivel, materia vazia, nulos.
  r = revisoesDeHoje([null, { materia: "", criado_em: "2026-10-14T23:00:00Z" }, { materia: "X", criado_em: "lixo" }, s("Informática", "2026-10-14")], HOJE);
  r.length === 1 && r[0].materia === "Informática" ? ok("sessão com data ilegível ou sem matéria é ignorada") : falha("lixo", JSON.stringify(r));

  // 7. O texto da tela.
  quando(1) === "estudada ontem" && quando(7) === "estudada há 7 dias" ? ok("o texto: 'estudada ontem' / 'estudada há 7 dias'") : falha("texto", quando(1));

  // 8. 09/10/2026 (NUM-11, roadmap 3.20): estudou ha 30 E ha 3 -- a tela dizia "estudada ha 30 dias"
  r = revisoesDeHoje([s("Geografia", "2026-09-15"), s("Geografia", "2026-10-12")], HOJE);
  const frase = r[0] ? quando(r[0].haDias, r[0].recente) : "";
  frase === "revisão de 30 dias · último estudo há 3 dias"
    ? ok("🎯 30 e 3 dias: diz a revisão E o último estudo", frase) : falha("a frase esconde o estudo recente", frase);

  console.log("\n" + "=".repeat(70));
  console.log(falhas ? `🔴 ${falhas} FALHA(S).` : "A REVISÃO ESPAÇADA PEGA O DIA CERTO.");
  process.exit(falhas ? 1 : 0);
})();
