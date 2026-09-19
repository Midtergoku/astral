// TESTA-CATALOGO -- o catalogo de condecoracoes e divisas esta coerente?
//
// Catalogo e DADO, e dado errado nao estoura: ele concede a medalha errada em
// silencio, ou cria uma tag que ninguem ganha nunca porque aponta para uma
// condecoracao que nao existe. Nenhuma das duas coisas aparece olhando a tela.
//
// Tambem confere a promessa que o Lucas fez para si mesmo: 🔴 NADA SE CUMPRE
// SEM ESTUDAR. Se alguma condicao puder ser satisfeita so por aparecer, ela
// falha aqui -- e essa checagem existe porque e exatamente o tipo de coisa que
// entra sem querer quando o catalogo cresce.
const path = require("path");
const { pathToFileURL } = require("url");

(async () => {
  const arquivo = path.resolve(__dirname, "..", "assets", "js", "catalogo.js");
  const cat = await import(pathToFileURL(arquivo).href);

  let falhas = 0;
  const ok = (t, d = "") => console.log(`  OK     ${t.padEnd(46)} ${d}`);
  const falha = (t, d = "") => { console.log(`  FALHA  ${t.padEnd(46)} ${d}`); falhas++; };

  console.log(`\nTESTA-CATALOGO\n`);
  console.log(`  ${cat.RESUMO.condecoracoes} condecorações (${cat.RESUMO.secretas} secretas)`);
  console.log(`  ${cat.RESUMO.divisas} divisas (${cat.RESUMO.divisasSecretas} secretas)\n`);

  // ── 1. As conferencias que o proprio catalogo faz ──────────────────────────
  const problemas = cat.conferirCatalogo();
  if (!problemas.length) ok("id único, metal e raridade válidos, cor por token");
  else { falha(`${problemas.length} problema(s) de coerência`); for (const p of problemas) console.log(`           ${p}`); falhas--; falhas++; }

  // ── 2. 🔴 Nada se cumpre sem estudar ──────────────────────────────────────
  // A lista branca de tipos que EXIGEM esforco medido. Tipo novo que nao
  // estiver aqui derruba o teste de proposito: obriga a decisao consciente.
  const EXIGEM_ESTUDO = new Set([
    "sessoes", "horas", "streak", "sessaoUnica", "materias", "atributo",
    "horario", "diaSemana", "retorno", "edital", "todas",
    "materiaDominada", "condecoracao", "viradaMateria",
  ]);
  const suspeitas = [...cat.CONDECORACOES, ...cat.DIVISAS]
    .filter((x) => !EXIGEM_ESTUDO.has(x.condicao?.tipo))
    .map((x) => `${x.id} (${x.condicao?.tipo})`);
  if (!suspeitas.length) ok("🎯 toda condição exige estudo de verdade", "nenhuma por login ou presença");
  else falha("condição que talvez não exija estudo", suspeitas.join(", "));

  // Nenhum nome pode sugerir presenca em vez de trabalho.
  const PALAVRAS_PROIBIDAS = /\blogin\b|\bentrar\b|\bvisita|\bacess(ar|o) (o|ao) (site|app)|\bpresen[çc]a\b/i;
  const nomesRuins = [...cat.CONDECORACOES, ...cat.DIVISAS]
    .filter((x) => PALAVRAS_PROIBIDAS.test(`${x.nome} ${x.descricao || ""} ${x.comoGanha || ""}`))
    .map((x) => x.id);
  if (!nomesRuins.length) ok("nenhuma recompensa por aparecer", "sem cassino");
  else falha("recompensa por presença", nomesRuins.join(", "));

  // ── 3. A platina depende de TODAS as outras ───────────────────────────────
  const platina = cat.CONDECORACOES.find((c) => c.metal === "platina");
  if (!platina) falha("não existe condecoração de platina");
  else if (platina.condicao?.tipo !== "todas") falha("a platina não depende das outras", platina.condicao?.tipo);
  else ok("a platina exige todas as outras", `${cat.RESUMO.condecoracoes - 1} para platinar`);

  // ── 4. Ha secretas de verdade, e elas nao sao a maioria ───────────────────
  // Secreta demais e catalogo vazio na tela: a pessoa abre e nao ve o que
  // perseguir. Pouca demais e nao ha surpresa nenhuma.
  const pctSecretas = (cat.RESUMO.secretas / cat.RESUMO.condecoracoes) * 100;
  if (cat.RESUMO.secretas >= 5 && pctSecretas <= 45) {
    ok("mistura de visíveis e secretas", `${cat.RESUMO.secretas} secretas (${pctSecretas.toFixed(0)}%)`);
  } else {
    falha("proporção de secretas fora da conta", `${pctSecretas.toFixed(0)}%`);
  }

  // ── 5. Os quatro metais existem e estao povoados ──────────────────────────
  for (const metal of Object.keys(cat.METAIS)) {
    const n = cat.CONDECORACOES.filter((c) => c.metal === metal).length;
    if (n > 0) ok(`metal ${metal} povoado`, `${n} condecoração(ões)`);
    else falha(`metal ${metal} vazio`);
  }

  // ── 6. Atributo citado existe mesmo na ficha ──────────────────────────────
  // Se alguem escrever chave: 'foco' e a ficha nao tiver 'foco', a condecoracao
  // nunca dispara e ninguem descobre.
  const DA_FICHA = new Set(["disciplina", "resistencia", "amplitude", "doutrina", "precisao"]);
  const chavesRuins = [...cat.CONDECORACOES, ...cat.DIVISAS]
    .filter((x) => x.condicao?.tipo === "atributo" && !DA_FICHA.has(x.condicao.chave))
    .map((x) => `${x.id} -> ${x.condicao.chave}`);
  if (!chavesRuins.length) ok("todo atributo citado existe na ficha");
  else falha("atributo que a ficha não calcula", chavesRuins.join(", "));

  // 🔴 PRECISAO ainda volta null. Condecoracao amarrada a ela nunca cairia.
  const presasNaPrecisao = [...cat.CONDECORACOES, ...cat.DIVISAS]
    .filter((x) => x.condicao?.tipo === "atributo" && x.condicao.chave === "precisao")
    .map((x) => x.id);
  if (!presasNaPrecisao.length) ok("nada depende de PRECISÃO ainda", "ela só existe com o banco de questões");
  else falha("depende de PRECISÃO, que volta null", presasNaPrecisao.join(", "));

  console.log("\n" + "=".repeat(70));
  console.log(falhas === 0
    ? `CATÁLOGO COERENTE — ${cat.RESUMO.condecoracoes} condecorações e ${cat.RESUMO.divisas} divisas, tudo conquistável estudando.`
    : `🔴 ${falhas} FALHA(S).`);
  process.exit(falhas === 0 ? 0 : 1);
})();
