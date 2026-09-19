// TESTA-DIARIO -- o diário conta a verdade sobre o passado?
//
// Função pura, e o risco aqui é diferente de todos os outros testes: um diário
// que erra não trava nada, não some da tela e não dá erro. Ele simplesmente
// CONTA UMA HISTÓRIA ERRADA, com ar de autoridade, e ninguém tem como
// desconfiar -- porque quem lê não se lembra do dia 34.
//
// Os marcos são o ponto mais delicado: "seu dia mais longo até então" só é
// verdade se for calculado contra o que veio ANTES. Um dia de 3 horas é
// recorde em janeiro e rotina em junho. Se o cálculo olhar a história inteira,
// o diário dirá "recorde" no dia errado -- e estará mentindo com confiança.
const path = require("path");
const { pathToFileURL } = require("url");

(async () => {
  const D = await import(pathToFileURL(
    path.resolve(__dirname, "..", "assets", "js", "diario.js")).href);

  let falhas = 0;
  const ok = (t, d = "") => console.log(`  OK     ${t.padEnd(48)} ${d}`);
  const falha = (t, d = "") => { console.log(`  FALHA  ${t.padEnd(48)} ${d}`); falhas++; };

  // Constrói uma sessão num dia e hora conhecidos, no fuso de São Paulo.
  const sessao = (dia, hora, materia, minutos, modo = "livre") => ({
    materia, segundos: minutos * 60, modo,
    criado_em: `${dia}T${String(hora).padStart(2, "0")}:00:00-03:00`,
  });

  console.log("\nTESTA-DIARIO\n");

  // ── 1. Sem sessões, sem diário ────────────────────────────────────────────
  if (D.montarDiario([]).length === 0) ok("sem sessões o diário fica vazio", "não inventa passado");
  else falha("inventou dias do nada");
  if (D.resumoDoDiario([]) === null) ok("resumo vazio quando não há nada");
  else falha("resumo inventado");

  // ── 2. Agrupa por DIA, não por sessão ────────────────────────────────────
  const umDia = D.montarDiario([
    sessao("2026-03-10", 9,  "Matematica", 40),
    sessao("2026-03-10", 14, "Matematica", 30),
    sessao("2026-03-10", 20, "Fisica", 50),
  ]);
  if (umDia.length === 1) ok("três sessões no mesmo dia viram UM dia", umDia[0].titulo);
  else falha("agrupamento por dia errado", `${umDia.length} dias`);
  if (umDia[0].minutos === 120 && umDia[0].sessoes === 3) ok("soma o tempo do dia", umDia[0].linha);
  else falha("soma do dia errada", `${umDia[0].minutos}min / ${umDia[0].sessoes} sessões`);

  // A matéria de mais tempo vem primeiro -- é o que a pessoa fez de verdade.
  if (umDia[0].listaMaterias[0].nome === "Matematica" && umDia[0].listaMaterias[0].minutos === 70) {
    ok("as matérias vêm ordenadas por tempo", umDia[0].resumo);
  } else {
    falha("ordem das matérias", JSON.stringify(umDia[0].listaMaterias));
  }

  // ── 3. A SEQUÊNCIA é recontada dia a dia ─────────────────────────────────
  const seguidos = D.montarDiario([
    sessao("2026-03-01", 10, "Mat", 30), sessao("2026-03-02", 10, "Mat", 30),
    sessao("2026-03-03", 10, "Mat", 30), sessao("2026-03-04", 10, "Mat", 30),
  ]);
  // Vem do mais recente para o mais antigo: 4, 3, 2, 1.
  if (seguidos.map((d) => d.sequencia).join() === "4,3,2,1") ok("a sequência cresce dia a dia", "4,3,2,1");
  else falha("sequência errada", seguidos.map((d) => d.sequencia).join());

  // Com buraco, a sequência REINICIA -- e não continua de onde parou.
  const comBuraco = D.montarDiario([
    sessao("2026-03-01", 10, "Mat", 30), sessao("2026-03-02", 10, "Mat", 30),
    sessao("2026-03-20", 10, "Mat", 30), sessao("2026-03-21", 10, "Mat", 30),
  ]);
  if (comBuraco.map((d) => d.sequencia).join() === "2,1,2,1") ok("buraco reinicia a sequência", "2,1,2,1");
  else falha("a sequência atravessou o buraco", comBuraco.map((d) => d.sequencia).join());

  // ── 4. 🔴 O RECORDE é contra o PASSADO, não contra a história toda ───────
  // Dia 1: 60min. Dia 2: 30min. Dia 3: 90min.
  // Só o dia 3 é recorde. Se o cálculo olhasse a história inteira, o dia 1
  // também apareceria como recorde -- e seria mentira, porque 60 < 90.
  const recordes = D.montarDiario([
    sessao("2026-04-01", 10, "Mat", 60),
    sessao("2026-04-02", 10, "Mat", 30),
    sessao("2026-04-03", 10, "Mat", 90),
  ]);
  const comRecorde = recordes.filter((d) => d.marcos.some((m) => m.tipo === "recorde")).map((d) => d.dia);
  if (comRecorde.length === 1 && comRecorde[0] === "2026-04-03") {
    ok("🎯 o recorde é do dia certo", "só o 3º, e não o 1º");
  } else {
    falha("recorde no dia errado", comRecorde.join(", ") || "nenhum");
  }

  // O primeiro dia NÃO é recorde -- não havia contra o que comparar.
  const primeiro = recordes.find((d) => d.dia === "2026-04-01");
  if (!primeiro.marcos.some((m) => m.tipo === "recorde")) ok("o primeiro dia não é 'recorde'", "não havia antes");
  else falha("o primeiro dia virou recorde");
  if (primeiro.marcos.some((m) => m.tipo === "inicio")) ok("o primeiro dia é marcado como início", primeiro.marcos[0].texto);
  else falha("faltou o marco de início");

  // ── 5. Primeira vez em cada matéria, na ordem certa ──────────────────────
  const materias = D.montarDiario([
    sessao("2026-05-01", 10, "Matematica", 30),
    sessao("2026-05-02", 10, "Matematica", 30),
    sessao("2026-05-03", 10, "Fisica", 30),
    sessao("2026-05-04", 10, "Matematica", 30),
  ]);
  const estreias = materias.filter((d) => d.marcos.some((m) => m.tipo === "materia")).map((d) => d.dia);
  if (estreias.length === 1 && estreias[0] === "2026-05-03") {
    ok("'primeira vez' aparece uma vez por matéria", "Física no dia 3");
  } else {
    falha("estreias erradas", estreias.join(", ") || "nenhuma");
  }

  // ── 6. Retorno depois de sumir ───────────────────────────────────────────
  const voltou = D.montarDiario([
    sessao("2026-06-01", 10, "Mat", 30),
    sessao("2026-06-20", 10, "Mat", 30),   // 18 dias fora
  ]);
  const oRetorno = voltou.find((d) => d.dia === "2026-06-20");
  const marco = oRetorno.marcos.find((m) => m.tipo === "retorno");
  if (marco && /18 dias/.test(marco.texto)) ok("conta certo os dias fora", marco.texto);
  else falha("marco de retorno errado", JSON.stringify(oRetorno.marcos));

  // Um dia de folga não é "sumiço" -- senão o diário viraria cobrança.
  const folga = D.montarDiario([
    sessao("2026-06-01", 10, "Mat", 30),
    sessao("2026-06-03", 10, "Mat", 30),
  ]);
  if (!folga.some((d) => d.marcos.some((m) => m.tipo === "retorno"))) {
    ok("um dia de folga não vira 'retorno'", "o diário não cobra");
  } else {
    falha("marcou retorno por um dia de folga");
  }

  // ── 7. As horas acumuladas marcam no dia em que a linha foi cruzada ──────
  // 9 dias de 60min = 9h. O décimo dia cruza as 10 horas.
  const horas = [];
  for (let i = 1; i <= 10; i++) horas.push(sessao(`2026-07-${String(i).padStart(2, "0")}`, 10, "Mat", 60));
  const comHoras = D.montarDiario(horas);
  const cruzou = comHoras.filter((d) => d.marcos.some((m) => m.tipo === "total")).map((d) => d.dia);
  if (cruzou.length === 1 && cruzou[0] === "2026-07-10") ok("🎯 o marco de horas cai no dia exato", "10h no 10º dia");
  else falha("marco de horas no dia errado", cruzou.join(", ") || "nenhum");

  /* ── 8. Ordem e limite ────────────────────────────────────────────────────
     ⚠️ A primeira versão deste bloco montava "2026-08-01" até "2026-08-40" --
     e 32 de agosto não existe. O diário engolia as datas inválidas e criava
     dias `NaN-NaN-NaN`, e a checagem de ordem PASSOU mesmo assim, porque
     comparava texto e "N" vem depois de "2".

     Teste que passa pelo motivo errado é pior que teste que falha: ele dá
     confiança sem dar cobertura. Agora as datas são válidas, e a comparação é
     de DATA de verdade, não de texto. */
  const muitos = [];
  for (let i = 0; i < 40; i++) {
    const d = new Date(Date.UTC(2026, 6, 1 + i));       // 1º de julho + i dias
    muitos.push(sessao(d.toISOString().slice(0, 10), 10, "Mat", 30));
  }
  const cortado = D.montarDiario(muitos, 10);
  if (cortado.length === 10) ok("respeita o limite de dias", "10 de 40");
  else falha("limite ignorado", `${cortado.length}`);

  const datasValidas = cortado.every((d) => /^\d{4}-\d{2}-\d{2}$/.test(d.dia));
  if (datasValidas) ok("nenhum dia inválido no diário", `${cortado[0].dia} … ${cortado[9].dia}`);
  else falha("🚨 dia inválido no diário", cortado.map((d) => d.dia).join(", "));

  const decrescente = cortado.every((d, i) =>
    i === 0 || new Date(cortado[i - 1].dia) > new Date(d.dia));
  if (decrescente) ok("o mais recente vem primeiro", `${cortado[0].dia} … ${cortado[9].dia}`);
  else falha("ordem invertida", cortado.map((d) => d.dia).join(", "));

  // E a data ilegível é DESCARTADA, não vira um dia de lixo.
  const comLixo = D.montarDiario([
    sessao("2026-09-01", 10, "Mat", 30),
    { materia: "Mat", segundos: 1800, modo: "livre", criado_em: "nao-e-data" },
    { materia: "Mat", segundos: 1800, modo: "livre", criado_em: null },
  ]);
  if (comLixo.length === 1 && comLixo[0].dia === "2026-09-01") {
    ok("🎯 data ilegível é descartada", "o resto do diário continua correto");
  } else {
    falha("data ilegível virou dia", comLixo.map((d) => d.dia).join(", "));
  }

  // ── 9. 🔴 NENHUMA frase fala de domínio ──────────────────────────────────
  // A ideia original pedia "Domínio 58% → 61%" -- e isso é INCONFERÍVEL: o
  // projeto não guarda histórico de domínio. Se um dia alguém acrescentar uma
  // frase dessas por cima, este teste derruba na hora.
  const todoTexto = D.montarDiario(recordes.length ? horas : [])
    .flatMap((d) => [d.linha, d.resumo, ...d.marcos.map((m) => m.texto)]).join(" ");
  if (!/dom[íi]nio|\d+%\s*→|\d+%\s*->/i.test(todoTexto)) {
    ok("🎯 o diário não fala de domínio", "não temos histórico dele — inventar seria mentir");
  } else {
    falha("🚨 o diário afirma algo sobre domínio", "o banco não guarda esse histórico");
  }

  // ── 10. O resumo bate com os dias ────────────────────────────────────────
  const r = D.resumoDoDiario(comHoras);
  if (r.dias === 10 && r.horas === 10 && r.maiorSequencia === 10) ok("o resumo confere com o diário", `${r.dias} dias · ${r.horas}h · sequência ${r.maiorSequencia}`);
  else falha("resumo não bate", JSON.stringify(r));

  console.log("\n" + "=".repeat(72));
  console.log(falhas === 0
    ? "O DIÁRIO CONTA A VERDADE — e os marcos são do dia certo."
    : `🔴 ${falhas} FALHA(S).`);
  process.exit(falhas === 0 ? 0 : 1);
})();
