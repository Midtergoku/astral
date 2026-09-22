// TESTA-ACERVO-LIMPO -- o que esta NO AR e digno de quem vai estudar nele?
//
// Os outros testes provam que o portao funciona e que a tela desenha. Este
// olha o CONTEUDO: 1.500 questoes certas valem mais que 4.000 com repetida,
// resposta faltando ou enunciado picado. E o unico teste que roda contra o
// acervo REAL, e por isso ele nao cria nada -- so mede o que existe.
//
// 🔴 CADA CHECAGEM AQUI NASCEU DE UM DEFEITO MEDIDO EM 22/09/2026:
//   - materia inventada ("Underlined sentence in the text"), porque a regra
//     capturava o resto da linha numa prova de duas colunas
//   - gabarito inventado, porque "AS QUESTOES DE 01 A 24" casa com o padrao
//     numero+letra e aquele "A" e preposicao
//   - a MESMA questao dezenas de vezes, porque as 24 especialidades do EAGS
//     repetem o bloco de Portugues
const { execSync } = require("child_process");

const REF = "jjogmcacbdefwiwcyjxp";
const BASE = `https://${REF}.supabase.co`;

const chaves = JSON.parse(execSync(`supabase projects api-keys --project-ref ${REF} -o json`,
  { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }));
const SK = chaves.find((k) => k.name === "service_role").api_key;
const admin = { apikey: SK, Authorization: `Bearer ${SK}`, "Content-Type": "application/json" };

// As materias que uma prova militar realmente tem. Qualquer coisa fora desta
// lista e sinal de que a leitura inventou -- foi exatamente o que aconteceu.
const MATERIAS_VALIDAS = new Set([
  "Português", "Inglês", "Espanhol", "Matemática", "Física", "Química",
  "Biologia", "História", "Geografia", "História e Geografia", "Redação",
  "Informática", "Direito",
]);

let falhas = 0;
const ok = (t, d = "") => console.log(`  OK     ${t.padEnd(52)} ${d}`);
const falha = (t, d = "") => { console.log(`  FALHA  ${t.padEnd(52)} ${d}`); falhas++; };

const chaveDe = (q) => String(q.enunciado).toLowerCase().replace(/\s+/g, " ").trim()
  + "|" + Object.values(q.alternativas || {}).join("|").toLowerCase().replace(/\s+/g, " ");

(async () => {
  const todas = [];
  for (let off = 0; off < 40000; off += 1000) {
    const r = await fetch(
      `${BASE}/rest/v1/questoes?select=id,banca,prova,ano,numero,materia,assunto,enunciado,alternativas,gabarito&publicada=is.true&limit=1000&offset=${off}`,
      { headers: admin });
    const p = await r.json();
    if (!Array.isArray(p)) { console.log("🔴 nao consegui ler o acervo:", JSON.stringify(p).slice(0, 120)); process.exit(1); }
    todas.push(...p);
    if (p.length < 1000) break;
  }

  console.log(`\nTESTA-ACERVO-LIMPO  ${todas.length} questoes no ar\n`);
  if (!todas.length) { console.log("  (acervo vazio -- nada a conferir)"); process.exit(0); }

  // ── 1. Toda questao tem resposta, e a resposta EXISTE ────────────────────
  console.log("== 1. TODA QUESTAO E RESPONDIVEL ==");
  {
    const semGab = todas.filter((q) => !q.gabarito);
    semGab.length === 0 ? ok("todas tem gabarito") : falha("sem gabarito", `${semGab.length}`);

    const gabFantasma = todas.filter((q) => !q.alternativas || !q.alternativas[q.gabarito]);
    gabFantasma.length === 0
      ? ok("🎯 o gabarito aponta para uma alternativa que existe", "ninguem fica sem resposta certa")
      : falha("gabarito aponta para alternativa inexistente", `${gabFantasma.length}`);

    const poucas = todas.filter((q) => Object.keys(q.alternativas || {}).length < 4);
    poucas.length === 0 ? ok("todas tem 4 alternativas ou mais") : falha("com menos de 4", `${poucas.length}`);
  }

  // ── 2. Nenhuma materia inventada ────────────────────────────────────────
  console.log("\n== 2. A MATERIA E MATERIA MESMO ==");
  {
    const materias = [...new Set(todas.map((q) => q.materia))];
    const estranhas = materias.filter((m) => !MATERIAS_VALIDAS.has(m));
    estranhas.length === 0
      ? ok("🎯 nenhuma materia inventada", materias.sort().join(", "))
      : falha("materia que nao e materia", estranhas.slice(0, 3).map((m) => JSON.stringify(m)).join(" "));

    const semMat = todas.filter((q) => !q.materia);
    semMat.length === 0 ? ok("nenhuma sem materia") : falha("sem materia", `${semMat.length}`);
  }

  // ── 3. Nenhuma repetida ─────────────────────────────────────────────────
  console.log("\n== 3. NINGUEM VE A MESMA QUESTAO DUAS VEZES ==");
  {
    const por = new Map();
    for (const q of todas) {
      const c = chaveDe(q);
      if (!por.has(c)) por.set(c, []);
      por.get(c).push(q);
    }
    const dup = [...por.values()].filter((v) => v.length > 1);
    dup.length === 0
      ? ok("🎯 nenhuma questao repetida", `${por.size} distintas de ${todas.length}`)
      : falha("questao repetida no acervo",
              `${dup.length} grupos, ate ${Math.max(...dup.map((d) => d.length))} copias`);
  }

  // ── 4. O texto nao esta picado ──────────────────────────────────────────
  console.log("\n== 4. O TEXTO CHEGOU INTEIRO ==");
  {
    const curtas = todas.filter((q) => String(q.enunciado).trim().split(/\s+/).length < 3);
    curtas.length === 0
      ? ok("nenhum enunciado picado", "todos com 3 palavras ou mais")
      : falha("enunciado picado", curtas.slice(0, 3).map((q) => JSON.stringify(q.enunciado.slice(0, 30))).join(" "));

    const vazias = todas.filter((q) => Object.values(q.alternativas || {}).some((t) => !String(t).trim()));
    vazias.length === 0 ? ok("nenhuma alternativa vazia") : falha("alternativa vazia", `${vazias.length}`);

    // Rodape de prova vazando para dentro da questao -- ja aconteceu.
    const sujas = todas.filter((q) => /MINIST[ÉE]RIO DA DEFESA|C[ÓO]DIGO DA PROVA/i.test(q.enunciado));
    sujas.length === 0 ? ok("nenhum cabecalho de prova dentro da questao") : falha("rodape vazou", `${sujas.length}`);
  }

  // ── 5. O retrato do acervo ──────────────────────────────────────────────
  console.log("\n== 5. O QUE TEM LA DENTRO ==");
  {
    const porMat = {};
    for (const q of todas) {
      (porMat[q.materia] ||= { n: 0, assuntos: new Set() }).n++;
      if (q.assunto) porMat[q.materia].assuntos.add(q.assunto);
    }
    for (const [m, d] of Object.entries(porMat).sort((a, b) => b[1].n - a[1].n)) {
      console.log(`     ${m.padEnd(14)} ${String(d.n).padStart(5)} questoes, ${d.assuntos.size} assuntos`);
    }
    const anos = [...new Set(todas.map((q) => q.ano))].sort();
    const provas = new Set(todas.map((q) => `${q.banca} ${q.prova}`));
    console.log(`     ${"anos".padEnd(14)} ${anos.join(", ")}`);
    console.log(`     ${"provas".padEnd(14)} ${provas.size}`);

    const comAssunto = todas.filter((q) => q.assunto).length;
    console.log(`     ${"com assunto".padEnd(14)} ${comAssunto} (${Math.round((comAssunto / todas.length) * 100)}%)`);
  }

  console.log("\n" + "=".repeat(70));
  console.log(falhas === 0
    ? `O ACERVO ESTA LIMPO — ${todas.length} questoes, nenhuma repetida, todas respondiveis.`
    : `🔴 ${falhas} FALHA(S) no acervo.`);
  process.exit(falhas === 0 ? 0 : 1);
})();
