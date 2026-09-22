// TESTA-PROVA -- o entendimento da prova continua o mesmo depois de virar
// modulo compartilhado (`assets/js/prova.js`)?
//
// 🔴 A PERGUNTA QUE ESTE TESTE RESPONDE: mudar codigo de lugar nao pode mudar
// resultado. Em 21/09/2026 a logica saiu de `tools/prova-para-questoes.js` para
// um modulo, porque a tela `importar.html` precisa do mesmo entendimento.
//
// ⚠️ E UMA MUDANCA DE COMPORTAMENTO FOI FEITA DE PROPOSITO, entao ela e testada
// em separado: o modulo aceita ate CINCO alternativas (a-e), e a versao antiga
// so aceitava quatro (a-d). Prova militar tem bancas de 5. As de 4 tem de
// continuar saindo exatamente iguais -- e e isso que o caso 4 cobra.
//
// O texto abaixo e INVENTADO, mas cada pedaco reproduz uma armadilha real
// medida em 17/09/2026 contra a prova da EEAR.
const FF = String.fromCharCode(12);

let falhas = 0;
const ok = (t, d = "") => console.log(`  OK     ${t.padEnd(56)} ${d}`);
const falha = (t, d = "") => { console.log(`  FALHA  ${t.padEnd(56)} ${d}`); falhas++; };

// Uma prova de mentira, com os cabecalhos que a banca de verdade usa.
const PROVA = [
  "MINISTERIO DA DEFESA",
  "GABARITO OFICIAL",
  "01 A   02 C   03 B   04 D   05 ANULADA   06 B   07 A",
  "",
  "AS QUESTÕES DE 1 A 3 REFEREM-SE À LÍNGUA PORTUGUESA",
  "",
  "01 – Em qual alternativa o uso da crase está correto?",
  "a) Fui a escola ontem.",
  "b) Refiro-me à aluna nova.",
  "c) Cheguei a as nove horas.",
  "d) Voltei a casa dela.",
  "",
  "02 – Assinale a alternativa correta quanto à colocação dos pronomes oblíquos átonos.",
  "a) Me disseram que sim. b) Disseram-me que sim. c) Se fosse assim. d) Nos falaram disso.",
  "",
  "03 – Observe a figura ao lado e indique o que ela representa.",
  "a) Um gráfico.",
  "b) Uma tabela.",
  "c) Um mapa.",
  "d) Um desenho.",
  FF,  // 🔴 a armadilha numero 1: o FORM FEED entre paginas
  "AS QUESTÕES DE 4 A 6 REFEREM-SE À MATEMÁTICA",
  "",
  "04 – O logaritmo de 1000 na base 10 é igual a:",
  "a) 1",
  "b) 2",
  "c) 10",
  "d) 3",
  "",
  "05 – Questão que a banca anulou.",
  "a) 1",
  "b) 2",
  "c) 3",
  "d) 4",
  "",
  "06 – Quantidade de senhas de 4 dígitos distintos é:",
  "a) 5040",
  "b) 4536",
  "c) 210",
  "d) 24",
  "",
  "07 – Uma questão de cinco alternativas, como algumas bancas usam:",
  "a) primeira",
  "b) segunda",
  "c) terceira",
  "d) quarta",
  "e) quinta",
].join("\n");

(async () => {
  const P = await import("../assets/js/prova.js");
  console.log("\nTESTA-PROVA\n");

  // ── 1. O FORM FEED nao pode comer questao ────────────────────────────────
  console.log("== 1. AS QUATRO ARMADILHAS MEDIDAS EM 17/09 ==");
  {
    const r = P.montarQuestoes([PROVA]);
    const numeros = [...r.prontas, ...r.revisar].map((q) => q.numero).sort((a, b) => a - b);
    // 4, 5, 6 e 7 vem DEPOIS do form feed. Se ele comesse, sumiriam caladas.
    const depois = numeros.filter((n) => n >= 4);
    depois.length === 4
      ? ok("🔴 1. o FORM FEED nao come as questoes da pagina 2", `achou ${depois.join(", ")}`)
      : falha("questoes depois do form feed sumiram", `achou ${depois.join(", ") || "nenhuma"}`);
  }

  // ── 2. Alternativa no meio da linha ──────────────────────────────────────
  {
    const r = P.montarQuestoes([PROVA]);
    const q2 = [...r.prontas, ...r.revisar].find((q) => q.numero === 2);
    const alts = q2 ? Object.keys(q2.alternativas).length : 0;
    alts === 4
      ? ok("🔴 3. alternativa no meio da linha e lida", "a) b) c) d) na mesma linha")
      : falha("alternativa no meio da linha", `fechou ${alts} de 4`);
  }

  // ── 3. Figura e anulada saem SEPARADAS, nao entram como prontas ─────────
  {
    const r = P.montarQuestoes([PROVA]);
    const prontas = r.prontas.map((q) => q.numero);
    const rev = Object.fromEntries(r.revisar.map((q) => [q.numero, q.motivo]));

    !prontas.includes(3) && /figura/.test(rev[3] || "")
      ? ok("questao que depende de FIGURA nao entra como pronta", rev[3])
      : falha("a questao de figura escapou", `prontas: ${prontas.join(", ")}`);

    !prontas.includes(5) && /anulada/.test(rev[5] || "")
      ? ok("questao ANULADA pela banca nao entra", rev[5])
      : falha("a anulada escapou", rev[5] || "(nao foi separada)");
  }

  // ── 4. A materia sai do PROPRIO PDF, nunca do numero ────────────────────
  console.log("\n== 2. A MATERIA VEM DO PAPEL, NAO DE PALPITE ==");
  {
    const r = P.montarQuestoes([PROVA]);
    const todas = [...r.prontas, ...r.revisar];
    const q1 = todas.find((q) => q.numero === 1);
    const q4 = todas.find((q) => q.numero === 4);
    q1?.materia === "Português" && q4?.materia === "Matemática"
      ? ok("🔴 2. le 'AS QUESTOES DE X A Y REFEREM-SE A...'", `1=${q1.materia}, 4=${q4.materia}`)
      : falha("materia errada", `1=${q1?.materia}, 4=${q4?.materia}`);

    r.faixas.length === 2
      ? ok("as duas faixas de materia foram lidas", r.faixas.map((f) => `${f.materia} ${f.de}-${f.ate}`).join(" | "))
      : falha("faixas lidas", String(r.faixas.length));
  }

  // ── 5. O gabarito ────────────────────────────────────────────────────────
  console.log("\n== 3. GABARITO ==");
  {
    const g = P.gabaritoDe(PROVA);
    g.respostas.get(1) === "a" && g.respostas.get(4) === "d"
      ? ok("le o gabarito que vem no proprio PDF", `1=a, 4=d, ${g.respostas.size} no total`)
      : falha("gabarito lido errado", `1=${g.respostas.get(1)}, 4=${g.respostas.get(4)}`);
    g.anuladas.has(5) ? ok("reconhece ANULADA", "questao 5") : falha("nao viu a anulada");

    // 🔴 Sem gabarito, a questao NAO entra -- a nao ser que se peca.
    const semG = "09 – Pergunta sem gabarito nenhum?\na) um\nb) dois\nc) tres\nd) quatro";
    const fechado = P.montarQuestoes([semG]);
    const aberto = P.montarQuestoes([semG], { incluirSemGabarito: true });
    fechado.prontas.length === 0 && aberto.prontas.length === 1
      ? ok("🎯 sem gabarito nao publica, a menos que se peca", "o padrao e o seguro")
      : falha("regra do sem-gabarito", `fechado ${fechado.prontas.length}, aberto ${aberto.prontas.length}`);
  }

  // ── 6. A MUDANCA DELIBERADA: cinco alternativas ─────────────────────────
  console.log("\n== 4. A MUDANCA DE PROPOSITO: ate 5 alternativas ==");
  {
    const r = P.montarQuestoes([PROVA], { incluirSemGabarito: true });
    const q7 = [...r.prontas, ...r.revisar].find((q) => q.numero === 7);
    const letras = q7 ? Object.keys(q7.alternativas).sort().join("") : "";
    letras === "abcde"
      ? ok("questao de 5 alternativas e lida inteira", "a,b,c,d,e")
      : falha("as 5 alternativas nao fecharam", letras || "(questao nao achada)");

    // E a de 4 continua com 4 -- a mudanca nao pode ter inventado um 'e'.
    const q4 = [...r.prontas, ...r.revisar].find((q) => q.numero === 4);
    const l4 = q4 ? Object.keys(q4.alternativas).sort().join("") : "";
    l4 === "abcd"
      ? ok("🎯 questao de 4 continua com 4 -- nao nasceu um 'e' do nada", "abcd")
      : falha("a questao de 4 mudou", l4);
  }

  // ── 7. A melhor de tres leituras ────────────────────────────────────────
  console.log("\n== 5. TRES LEITURAS, FICA A MELHOR ==");
  {
    const quebrada = "08 – Pergunta cortada no pe da coluna?\na) um\nb) dois";
    const inteira  = "08 – Pergunta cortada no pe da coluna?\na) um\nb) dois\nc) tres\nd) quatro";
    const r = P.montarQuestoes([quebrada, inteira], { incluirSemGabarito: true });
    const q = [...r.prontas, ...r.revisar].find((x) => x.numero === 8);
    Object.keys(q?.alternativas || {}).length === 4
      ? ok("🔴 2. a leitura que fechou mais alternativas vence", "2 -> 4")
      : falha("ficou com a versao pior", `${Object.keys(q?.alternativas || {}).length} alternativas`);
  }

  console.log("\n" + "=".repeat(72));
  console.log(falhas === 0
    ? "A PROVA E ENTENDIDA IGUAL — e agora pelo mesmo codigo nos dois lados."
    : `🔴 ${falhas} FALHA(S).`);
  process.exit(falhas === 0 ? 0 : 1);
})();
