// TESTA-MISSOES -- as missões do dia são estáveis, cumpríveis e honestas?
//
// Função pura, então dá para testar tudo sem banco e sem navegador — inclusive
// o que levaria dias para observar de verdade (a virada do dia, mil usuários
// diferentes, todas as combinações de sorteio).
//
// As três perguntas, em ordem de gravidade:
//
//   1. 🔴 Dá para cumprir alguma SEM ESTUDAR? Ordem dele: nada de cassino.
//      Missão diária é exatamente onde esse vício entra.
//   2. 🔴 O sorteio é ESTÁVEL? Se recarregar a página trocar a missão, alguém
//      a um minuto do fim perde o progresso -- e dá para recarregar até sair a
//      mais fácil.
//   3. As missões viram no dia certo, e são variadas entre pessoas?
const path = require("path");
const { pathToFileURL } = require("url");

(async () => {
  const dir = path.resolve(__dirname, "..", "assets", "js");
  const M = await import(pathToFileURL(path.join(dir, "missoes.js")).href);

  let falhas = 0;
  const ok = (t, d = "") => console.log(`  OK     ${t.padEnd(48)} ${d}`);
  const falha = (t, d = "") => { console.log(`  FALHA  ${t.padEnd(48)} ${d}`); falhas++; };

  const HOJE_ZERO = {
    data: "2026-09-20", sessoes: 0, minutos: 0, materias: 0, materiasNomes: [],
    maiorSessaoMin: 0, antesDas9: 0, depoisDas20: 0, porModo: {},
    semana: { dias: 0, minutos: 0 },
  };
  const hoje = (m) => ({ ...HOJE_ZERO, ...m });

  console.log("\nTESTA-MISSOES\n");

  // ── 1. 🔴 Nada se cumpre sem estudar ──────────────────────────────────────
  // Um dia em que a pessoa ABRIU o site e não estudou nada é exatamente o
  // HOJE_ZERO: nenhuma missão pode estar cumprida nele.
  let cumpridasATôa = 0;
  for (let u = 0; u < 200; u++) {
    const ms = M.missoesDeHoje(`user-${u}`, HOJE_ZERO);
    cumpridasATôa += ms.filter((m) => m.cumprida).length;
  }
  if (cumpridasATôa === 0) ok("🎯 quem não estudou não cumpre nada", "200 usuários, 0 missões cumpridas");
  else falha("🚨 missão cumprida sem estudar", `${cumpridasATôa} em 200 usuários`);

  // Nenhum texto pode falar de aparecer em vez de trabalhar.
  const PROIBIDO = /\blogin\b|\bentre\b|\bentrar\b|\bacesse\b|\bvisite\b|\babra o (app|site|aplicativo)\b/i;
  const textoRuim = [
    ...M.DIARIAS.map((m) => ({ id: m.id, t: `${m.nome} ${m.texto}` })),
    ...M.CAMPANHAS.flatMap((c) => c.etapas.map((e) => ({ id: `${c.id}/${e.id}`, t: e.texto }))),
  ].filter((x) => PROIBIDO.test(x.t));
  if (!textoRuim.length) ok("nenhuma missão pede presença", "só trabalho");
  else falha("missão que premia aparecer", textoRuim.map((x) => x.id).join(", "));

  // Toda diária tem de LER algum número de estudo. Uma que ignore `hoje`
  // estaria cumprida sempre, ou nunca.
  const inertes = M.DIARIAS.filter((m) => {
    const zero = Number(m.de(HOJE_ZERO)) || 0;
    const cheio = Number(m.de(hoje({
      minutos: 999, sessoes: 99, materias: 9, maiorSessaoMin: 999,
      antesDas9: 9, depoisDas20: 9, porModo: { livre: 9, pomodoro: 9, cronograma: 9 },
    }))) || 0;
    return !(cheio > zero);
  });
  if (!inertes.length) ok("toda diária reage ao estudo", `${M.DIARIAS.length} conferidas`);
  else falha("diária que ignora o esforço", inertes.map((m) => m.id).join(", "));

  // ── 2. 🔴 O sorteio é estável ─────────────────────────────────────────────
  const a1 = M.missoesDeHoje("lucas", HOJE_ZERO).map((m) => m.id);
  const a2 = M.missoesDeHoje("lucas", HOJE_ZERO).map((m) => m.id);
  const a3 = M.missoesDeHoje("lucas", hoje({ minutos: 40, sessoes: 2 })).map((m) => m.id);
  if (a1.join() === a2.join() && a1.join() === a3.join()) {
    ok("🔁 recarregar NÃO troca as missões", a1.join(", "));
  } else {
    falha("o sorteio mudou no mesmo dia", `${a1.join()} / ${a2.join()} / ${a3.join()}`);
  }

  // Dia seguinte: tem de mudar, senão a missão diária não é diária.
  const amanha = M.missoesDeHoje("lucas", hoje({ data: "2026-09-21" })).map((m) => m.id);
  if (amanha.join() !== a1.join()) ok("no dia seguinte as missões mudam", amanha.join(", "));
  else falha("as missões não viraram no dia seguinte");

  // Pessoas diferentes no mesmo dia: não podem receber todas o mesmo conjunto.
  const conjuntos = new Set();
  for (let u = 0; u < 60; u++) conjuntos.add(M.missoesDeHoje(`u${u}`, HOJE_ZERO).map((m) => m.id).join());
  if (conjuntos.size > 5) ok("pessoas diferentes recebem missões diferentes", `${conjuntos.size} conjuntos em 60`);
  else falha("pouca variedade entre usuários", `${conjuntos.size} conjuntos`);

  // ── 3. Sempre 3, e sem repetir dentro do dia ─────────────────────────────
  let erradas = 0, repetidas = 0;
  for (let u = 0; u < 300; u++) {
    for (const dia of ["2026-09-20", "2026-11-03", "2027-02-28"]) {
      const ms = M.missoesDeHoje(`p${u}`, hoje({ data: dia }));
      if (ms.length !== 3) erradas++;
      if (new Set(ms.map((m) => m.id)).size !== ms.length) repetidas++;
    }
  }
  if (erradas === 0) ok("sempre três missões", "900 combinações de pessoa e dia");
  else falha("quantidade errada de missões", `${erradas} casos`);
  if (repetidas === 0) ok("nunca repete a mesma no mesmo dia", "900 combinações");
  else falha("missão repetida no mesmo dia", `${repetidas} casos`);

  // Todas as onze precisam poder sair -- uma que nunca sai é código morto.
  const vistas = new Set();
  for (let u = 0; u < 500; u++) {
    for (const m of M.missoesDeHoje(`v${u}`, HOJE_ZERO)) vistas.add(m.id);
  }
  if (vistas.size === M.DIARIAS.length) ok("todas as diárias podem ser sorteadas", `${vistas.size} de ${M.DIARIAS.length}`);
  else falha("diária que nunca sai", M.DIARIAS.filter((m) => !vistas.has(m.id)).map((m) => m.id).join(", "));

  // ── 4. Cumprimento e progresso parcial ───────────────────────────────────
  const cheio = M.missoesDeHoje("lucas", hoje({
    minutos: 200, sessoes: 5, materias: 5, maiorSessaoMin: 200,
    antesDas9: 3, depoisDas20: 3, porModo: { livre: 5, pomodoro: 5, cronograma: 5 },
  }));
  if (cheio.every((m) => m.cumprida)) ok("um dia forte cumpre as três", cheio.map((m) => m.nome).join(" · "));
  else falha("dia forte não cumpriu tudo", cheio.filter((m) => !m.cumprida).map((m) => m.id).join(", "));

  // O parcial tem de aparecer: "18 / 25" puxa, "não cumprida" não.
  const meio = M.missoesDeHoje("lucas", hoje({ minutos: 18, sessoes: 1, materias: 1, maiorSessaoMin: 18 }));
  const temParcial = meio.some((m) => m.progresso > 0 && m.progresso < 1 && m.feito > 0);
  if (temParcial) ok("mostra o quanto já foi feito", meio.map((m) => `${m.feito}/${m.alvo}`).join(" · "));
  else falha("sem progresso parcial", JSON.stringify(meio.map((m) => [m.feito, m.alvo])));

  // Nunca passar de 100%, senão a barra vaza da caixa.
  const estourado = M.missoesDeHoje("lucas", hoje({ minutos: 99999, sessoes: 999, materias: 99, maiorSessaoMin: 9999 }));
  if (estourado.every((m) => m.progresso <= 1 && m.feito <= m.alvo)) ok("progresso nunca passa de 100%");
  else falha("progresso estourou", JSON.stringify(estourado.map((m) => m.progresso)));

  // ── 5. As campanhas ──────────────────────────────────────────────────────
  const FATOS_ZERO = {
    sessoes: 0, horas: 0, streak: 0, diasEstudados: 0, maiorSessaoMin: 0,
    horasNoDiaMax: 0, semanasPerfeitas: 0, temEdital: false, dominioMinimo: 0,
    materias: [], atributos: { disciplina: { valor: 0 }, amplitude: { valor: 0 } },
  };
  const cZero = M.campanhas(FATOS_ZERO);
  if (cZero.every((c) => c.cumpridas === 0 && !c.completa)) ok("campanha começa zerada", `${cZero.length} campanhas`);
  else falha("campanha já começa cumprida", cZero.filter((c) => c.cumpridas).map((c) => c.id).join(", "));

  if (cZero.every((c) => c.atual && c.atual.id === c.etapas[0].id)) ok("a etapa atual é a primeira", cZero.map((c) => c.atual.texto).join(" · "));
  else falha("etapa atual errada no início");

  const FATOS_TUDO = {
    sessoes: 999, horas: 999, streak: 999, diasEstudados: 999, maiorSessaoMin: 999,
    horasNoDiaMax: 24, semanasPerfeitas: 99, temEdital: true, dominioMinimo: 100,
    materias: [{ progresso: 100 }, { progresso: 100 }, { progresso: 100 }, { progresso: 100 }],
    atributos: { disciplina: { valor: 100 }, amplitude: { valor: 100 } },
  };
  const cTudo = M.campanhas(FATOS_TUDO);
  if (cTudo.every((c) => c.completa && c.atual === null)) ok("🏁 quem faz tudo completa as campanhas", `${cTudo.length} completas`);
  else falha("campanha que nunca fecha", cTudo.filter((c) => !c.completa).map((c) => c.id).join(", "));

  // A etapa seguinte só é a atual depois que a anterior fecha.
  const meioDoCaminho = M.campanhas({ ...FATOS_ZERO, temEdital: true, sessoes: 3 });
  const apresentacao = meioDoCaminho.find((c) => c.id === "c_apresentacao");
  if (apresentacao?.cumpridas === 2 && apresentacao.atual?.id === "e_1hora") {
    ok("a campanha avança etapa por etapa", `parou em "${apresentacao.atual.texto}"`);
  } else {
    falha("avanço da campanha errado", `${apresentacao?.cumpridas} etapas, atual ${apresentacao?.atual?.id}`);
  }

  console.log("\n" + "=".repeat(72));
  console.log(falhas === 0
    ? "AS MISSÕES SÃO ESTÁVEIS, CUMPRÍVEIS E SÓ SE GANHAM ESTUDANDO."
    : `🔴 ${falhas} FALHA(S).`);
  process.exit(falhas === 0 ? 0 : 1);
})();
