// TESTA-MOTOR -- o motor de condecoracoes concede o que deve, e so o que deve?
//
// O motor e funcao pura, e e por isso que este teste existe neste formato: da
// para inventar o usuario que estudou 100 dias seguidos sem esperar 100 dias.
// Testar isso contra o banco exigiria plantar dado para cada caso; aqui e
// instantaneo e cobre os extremos, que sao justamente onde motor de regra erra.
//
// O que se procura aqui, em ordem de gravidade:
//   1. medalha concedida A TOA (pior que nao conceder -- destroi o valor de
//      todas as outras);
//   2. medalha que NUNCA cai (a pessoa persegue o que nao existe);
//   3. a platina caindo antes da hora;
//   4. condicao desconhecida concedendo por engano.
const path = require("path");
const { pathToFileURL } = require("url");

(async () => {
  const dir = path.resolve(__dirname, "..", "assets", "js");
  const motor = await import(pathToFileURL(path.join(dir, "condecoracoes.js")).href);
  const cat = await import(pathToFileURL(path.join(dir, "catalogo.js")).href);

  let falhas = 0;
  const ok = (t, d = "") => console.log(`  OK     ${t.padEnd(48)} ${d}`);
  const falha = (t, d = "") => { console.log(`  FALHA  ${t.padEnd(48)} ${d}`); falhas++; };

  // Um usuario que nunca fez nada. Todo campo no zero, como o servidor devolve.
  const ZERO = {
    sessoes: 0, horas: 0, xp: 0, xpSessoes: 0, streak: 0, maiorSessaoMin: 0,
    diasEstudados: 0, meses: 0, sessoesNoDiaMax: 0, horasNoDiaMax: 0,
    materiasNoDiaMax: 0, semanasPerfeitas: 0, materiaSeguidaMax: 0,
    maiorRetornoDias: 0, temEdital: false, dominioMinimo: 0,
    dominioMenosEstudada: 0, materias: [], porHora: {}, porDiaSemana: {}, porModo: {},
    atributos: {
      disciplina: { valor: 0 }, resistencia: { valor: 0 },
      amplitude: { valor: 0 }, doutrina: { valor: 0 }, precisao: { valor: null },
    },
  };
  const com = (mudancas) => ({ ...ZERO, ...mudancas });

  console.log("\nTESTA-MOTOR\n");

  // ── 1. 🔴 Usuario zerado nao ganha NADA ───────────────────────────────────
  // E a checagem mais importante do arquivo. Uma medalha que cai sozinha no
  // primeiro acesso desvaloriza as 73 restantes de uma vez.
  const zerado = motor.conferir(ZERO);
  if (zerado.resumo.conquistadas === 0) ok("🎯 quem nunca estudou não ganha nada", "0 de 74");
  else {
    falha("medalha concedida a toa", zerado.condecoracoes.filter((c) => c.conquistada).map((c) => c.id).join(", "));
  }
  if (zerado.resumo.divisasConquistadas === 0) ok("nenhuma divisa a toa");
  else falha("divisa concedida a toa", zerado.divisas.filter((d) => d.conquistada).map((d) => d.id).join(", "));

  // ── 2. A primeira sessao acende o que deve, e so isso ─────────────────────
  const primeira = motor.conferir(com({ sessoes: 1, horas: 0.5, maiorSessaoMin: 30, diasEstudados: 1, meses: 1 }));
  const ganhas1 = primeira.condecoracoes.filter((c) => c.conquistada).map((c) => c.id);
  if (ganhas1.includes("alistamento")) ok("primeira sessão acende Alistamento");
  else falha("Alistamento não acendeu", ganhas1.join(", "));
  if (ganhas1.includes("meia_hora")) ok("30 minutos acendem Sentinela");
  else falha("Sentinela não acendeu com 30 min");
  if (!ganhas1.includes("primeira_hora")) ok("meia hora NÃO acende Primeira Hora", "limiar respeitado");
  else falha("Primeira Hora caiu com só 30 minutos");
  if (!primeira.resumo.platinou) ok("a platina não cai na primeira sessão");
  else falha("🚨 platinou com uma sessão");

  // ── 3. Os limiares sao exatos: um a menos nao cai, o exato cai ────────────
  const casos = [
    ["horas", "primeira_hora", { horas: 0.99 }, { horas: 1 }],
    ["streak", "tres_dias", { streak: 2 }, { streak: 3 }],
    ["streak", "semana_cheia", { streak: 6 }, { streak: 7 }],
    ["sessões", "dez_sessoes", { sessoes: 9 }, { sessoes: 10 }],
    ["sessão única", "hora_cheia", { maiorSessaoMin: 59 }, { maiorSessaoMin: 60 }],
    ["dias estudados", "dez_dias", { diasEstudados: 9 }, { diasEstudados: 10 }],
    ["atributo", "disciplina_total", { atributos: { ...ZERO.atributos, disciplina: { valor: 99 } } },
      { atributos: { ...ZERO.atributos, disciplina: { valor: 100 } } }],
  ];
  let limiaresOk = 0;
  for (const [rotulo, id, abaixo, exato] of casos) {
    const semr = motor.conferir(com(abaixo)).condecoracoes.find((c) => c.id === id);
    const comr = motor.conferir(com(exato)).condecoracoes.find((c) => c.id === id);
    if (!semr?.conquistada && comr?.conquistada) limiaresOk++;
    else falha(`limiar de ${rotulo} (${id})`, `abaixo=${semr?.conquistada} exato=${comr?.conquistada}`);
  }
  if (limiaresOk === casos.length) ok("todo limiar é exato", `${casos.length} conferidos, um a menos não cai`);

  // ── 4. Horario e dia da semana somam a faixa certa ───────────────────────
  // "antes das 6" e 4h e 5h -- a hora 6 ja e "6 da manha", e nao conta.
  const madrugada = motor.conferir(com({ porHora: { 4: 3, 5: 2, 6: 50 } }));
  const vigilia = madrugada.condecoracoes.find((c) => c.id === "madrugador");
  if (vigilia?.conquistada) ok("faixa de horário soma só o intervalo", "4h+5h = 5 sessões, a hora 6 fora");
  else falha("Vigília não caiu com 5 sessões na madrugada", `progresso ${vigilia?.progresso}`);

  const soAsSeis = motor.conferir(com({ porHora: { 6: 50 } }));
  if (!soAsSeis.condecoracoes.find((c) => c.id === "madrugador")?.conquistada) {
    ok("50 sessões às 6h NÃO valem 'antes das 6'", "limite da faixa correto");
  } else falha("🔴 a hora 6 está contando como 'antes das 6'");

  const finde = motor.conferir(com({ porDiaSemana: { 0: 4, 6: 4, 3: 100 } }));
  if (finde.condecoracoes.find((c) => c.id === "fim_de_semana")?.conquistada) {
    ok("dias da semana somam só os pedidos", "sábado+domingo, quarta ignorada");
  } else falha("Sem Folga não caiu");

  // ── 5. Materia por nome, sem acento e sem caixa ──────────────────────────
  for (const nome of ["Português", "portugues", "LÍNGUA PORTUGUESA"]) {
    const r = motor.conferir(com({ materias: [{ nome, progresso: 75 }] }));
    const tag = r.divisas.find((d) => d.id === "orador");
    if (tag?.conquistada) ok(`divisa reconhece "${nome}"`);
    else falha(`divisa NÃO reconheceu "${nome}"`, "nome de matéria vem do edital e varia");
  }
  const raso = motor.conferir(com({ materias: [{ nome: "Português", progresso: 69 }] }));
  if (!raso.divisas.find((d) => d.id === "orador")?.conquistada) ok("69% não dá a divisa", "limiar de domínio exato");
  else falha("divisa caiu com 69%");

  // ── 6. A divisa que depende de condecoracao secreta ──────────────────────
  const tresHoras = motor.conferir(com({ maiorSessaoMin: 180 }));
  const temMedalha = tresHoras.condecoracoes.find((c) => c.id === "maratona")?.conquistada;
  const temTag = tresHoras.divisas.find((d) => d.id === "marcha")?.conquistada;
  if (temMedalha && temTag) ok("a divisa vem junto com a condecoração", "Marcha Forçada");
  else falha("divisa não seguiu a condecoração", `medalha=${temMedalha} tag=${temTag}`);

  // ── 7. 🔴 A PLATINA ──────────────────────────────────────────────────────
  // Um usuario impossivel, que cumpre tudo. Se a platina nao cair aqui, ela
  // nao cai nunca -- e seria uma promessa que o produto nao cumpre.
  const deus = com({
    sessoes: 9999, horas: 9999, xp: 999999, streak: 9999, maiorSessaoMin: 9999,
    diasEstudados: 9999, meses: 9999, sessoesNoDiaMax: 99, horasNoDiaMax: 24,
    materiasNoDiaMax: 99, semanasPerfeitas: 999, materiaSeguidaMax: 999,
    maiorRetornoDias: 999, temEdital: true, dominioMinimo: 100, dominioMenosEstudada: 100,
    /* TODAS as matérias que alguma divisa cita. Na primeira versão deste teste
       eu listei só seis, e ele acusou "divisa que nunca cai" para História,
       Química, Biologia e outras quatro -- alarme falso: elas não caíam porque
       o usuário inventado não tinha a matéria, não porque o motor falhasse.
       ⚠️ Vale registrar o que isso mostra de verdade sobre o produto: como
       nenhum edital real tem as 13 matérias, NENHUMA pessoa vai colecionar
       todas as divisas. E está certo assim -- não se domina matéria que não
       cai na sua prova. Por isso a platina depende só das CONDECORAÇÕES, que
       são as mesmas para todo mundo, e nunca das divisas. */
    materias: [
      "Português", "Matemática", "Física", "Inglês", "Direito", "Geografia",
      "História", "Informática", "Química", "Biologia", "Raciocínio Lógico",
      "Administração", "Legislação",
    ].map((nome) => ({ nome, progresso: 100 })),
    porHora: Object.fromEntries([...Array(24)].map((_, h) => [h, 999])),
    porDiaSemana: Object.fromEntries([...Array(7)].map((_, d) => [d, 999])),
    porModo: { livre: 999, pomodoro: 999, cronograma: 999 },
    atributos: {
      disciplina: { valor: 100 }, resistencia: { valor: 100 },
      amplitude: { valor: 100 }, doutrina: { valor: 100 }, precisao: { valor: null },
    },
  });
  const tudo = motor.conferir(deus);
  const faltaram = tudo.condecoracoes.filter((c) => !c.conquistada).map((c) => c.id);
  if (!faltaram.length) ok("🏆 um usuário que faz tudo ganha TUDO", `${tudo.resumo.conquistadas} de ${tudo.resumo.total}`);
  else falha("condecoração que nunca cai", faltaram.join(", "));
  if (tudo.resumo.platinou) ok("a PLATINA cai quando as 73 caem");
  else falha("🔴 a platina não cai nem no caso perfeito");

  const todasDivisas = tudo.divisas.filter((d) => !d.conquistada).map((d) => d.id);
  if (!todasDivisas.length) ok("todas as divisas são alcançáveis", `${tudo.resumo.divisasConquistadas} de ${tudo.resumo.divisas}`);
  else falha("divisa que nunca cai", todasDivisas.join(", "));

  // ── 8. A platina NAO cai faltando uma ────────────────────────────────────
  // Testa a peca mais delicada: basta uma secreta obscura faltando.
  const quaseTudo = { ...deus, maiorSessaoMin: 179 };   // perde Marcha Forçada e Fôlego de Combate
  const quase = motor.conferir(quaseTudo);
  if (!quase.resumo.platinou) ok("a platina NÃO cai faltando uma", "e são 73");
  else falha("🚨 platinou sem ter tudo");

  // ── 9. Tipo desconhecido falha para o lado seguro ────────────────────────
  // Simula erro de digitacao no catalogo. Tem de resultar em medalha que nao
  // cai -- nunca em medalha que cai para todos.
  const original = cat.CONDECORACOES[0].condicao;
  cat.CONDECORACOES[0].condicao = { tipo: "tipo_que_nao_existe", min: 1 };
  const comErro = motor.conferir(deus);
  const aErrada = comErro.condecoracoes.find((c) => c.id === cat.CONDECORACOES[0].id);
  cat.CONDECORACOES[0].condicao = original;
  if (!aErrada?.conquistada) ok("condição desconhecida NÃO concede", "falha para o lado seguro");
  else falha("🚨 condição desconhecida concedeu a medalha");

  // ── 10. "Falta pouco" ordena pelo mais perto ─────────────────────────────
  const meio = motor.conferir(com({ sessoes: 9, horas: 0.9, diasEstudados: 2 }));
  const perto = motor.quaseLa(meio.condecoracoes, 3);
  const ordenado = perto.every((c, i) => i === 0 || perto[i - 1].progresso >= c.progresso);
  if (perto.length && ordenado && perto.every((c) => !c.secreta)) {
    ok("'falta pouco' ordena e não vaza secreta", perto.map((c) => `${c.nome} ${(c.progresso * 100).toFixed(0)}%`).join(" · "));
  } else {
    falha("'falta pouco' errado", JSON.stringify(perto.map((c) => c.id)));
  }

  console.log("\n" + "=".repeat(72));
  console.log(falhas === 0
    ? "O MOTOR CONCEDE O QUE DEVE, E SÓ O QUE DEVE."
    : `🔴 ${falhas} FALHA(S).`);
  process.exit(falhas === 0 ? 0 : 1);
})();
