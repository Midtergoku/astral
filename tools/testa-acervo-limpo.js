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

const { REF, reescrever } = require("./testes/alvo");   // 09/10/2026 (COD-02): ASTRAL_DEV=1 -> astral-dev (tools/testes/alvo.js)
const BASE = `https://${REF}.supabase.co`;

const chaves = JSON.parse(execSync(`supabase projects api-keys --project-ref ${REF} -o json`,
  { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }));
const SK = chaves.find((k) => k.name === "service_role").api_key;
const admin = { apikey: SK, Authorization: `Bearer ${SK}`, "Content-Type": "application/json" };

// 🔴 A LISTA VEM DO MODULO, nao de uma copia aqui. Em 22/09/2026 eu mantinha
// as duas a mao: acrescentei "Enfermagem" ao leitor e este teste acusou o
// acervo CERTO de ter materia inventada. Duas listas sempre divergem.

let falhas = 0;
const ok = (t, d = "") => console.log(`  OK     ${t.padEnd(52)} ${d}`);
const falha = (t, d = "") => { console.log(`  FALHA  ${t.padEnd(52)} ${d}`); falhas++; };

const chaveDe = (q) => String(q.enunciado).toLowerCase().replace(/\s+/g, " ").trim()
  + "|" + Object.values(q.alternativas || {}).join("|").toLowerCase().replace(/\s+/g, " ");

(async () => {
  const { NOMES_DE_MATERIA } = await import("../assets/js/prova.js");
  const MATERIAS_VALIDAS = new Set(NOMES_DE_MATERIA);

  const todas = [];
  for (let off = 0; off < 40000; off += 1000) {
    const r = await fetch(
      `${BASE}/rest/v1/questoes?select=id,banca,prova,ano,numero,materia,assunto,enunciado,alternativas,gabarito,tipo,texto_apoio,revisao,imagem&publicada=is.true&limit=1000&offset=${off}`,
      { headers: admin });
    const p = await r.json();
    if (!Array.isArray(p)) { console.log("🔴 nao consegui ler o acervo:", JSON.stringify(p).slice(0, 120)); process.exit(1); }
    todas.push(...p);
    if (p.length < 1000) break;
  }

  console.log(`\nTESTA-ACERVO-LIMPO  ${todas.length} questoes no ar\n`);
  /* 03/10/2026 (roadmap 3.4): questao com IMAGEM do caderno e vista pela imagem.
     As checagens de TEXTO (4, 4b) valem para as outras; a com imagem tem a sua (4d). */
  const deTexto = todas.filter((q) => !q.imagem);
  const comImagem = todas.filter((q) => q.imagem);
  if (!todas.length) { console.log("  (acervo vazio -- nada a conferir)"); process.exit(0); }

  // ── 1. Toda questao tem resposta, e a resposta EXISTE ────────────────────
  console.log("== 1. TODA QUESTAO E RESPONDIVEL ==");
  {
    const semGab = todas.filter((q) => !q.gabarito);
    semGab.length === 0 ? ok("todas tem gabarito") : falha("sem gabarito", `${semGab.length}`);

    // Com imagem, a alternativa esta NA IMAGEM: basta a letra existir (#175: a "d" e uma
    // fracao desenhada, o texto guardado dela e vazio -- e a questao esta certa).
    const gabFantasma = todas.filter((q) => q.imagem ? !(q.gabarito in (q.alternativas || {})) : (!q.alternativas || !q.alternativas[q.gabarito]));
    gabFantasma.length === 0
      ? ok("🎯 o gabarito aponta para uma alternativa que existe", "ninguem fica sem resposta certa")
      : falha("gabarito aponta para alternativa inexistente", `${gabFantasma.length}`);

    // Certo/Errado (Cebraspe) tem 2 alternativas por natureza -- e so ele.
    const poucas = todas.filter((q) => {
      const n = Object.keys(q.alternativas || {}).length;
      return q.tipo === "certo_errado" ? n !== 2 : n < 4;
    });
    poucas.length === 0 ? ok("todas tem as alternativas do seu tipo", "4+ ou Certo/Errado") : falha("com menos de 4", `${poucas.length}`);
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
      const c = q.imagem ? "img|" + q.imagem : chaveDe(q);
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
    const curtas = deTexto.filter((q) => String(q.enunciado).trim().split(/\s+/).length < 3);
    curtas.length === 0
      ? ok("nenhum enunciado picado", "todos com 3 palavras ou mais")
      : falha("enunciado picado", curtas.slice(0, 3).map((q) => JSON.stringify(q.enunciado.slice(0, 30))).join(" "));

    const vazias = deTexto.filter((q) => Object.values(q.alternativas || {}).some((t) => !String(t).trim()));
    vazias.length === 0 ? ok("nenhuma alternativa vazia") : falha("alternativa vazia", `${vazias.length}`);

    // Rodape de prova vazando para dentro da questao -- ja aconteceu.
    const sujas = deTexto.filter((q) => /MINIST[ÉE]RIO DA DEFESA|C[ÓO]DIGO DA PROVA/i.test(q.enunciado));
    sujas.length === 0 ? ok("nenhum cabecalho de prova dentro da questao") : falha("rodape vazou", `${sujas.length}`);
  }

  // ── 5. O retrato do acervo ──────────────────────────────────────────────
  /* ── 4b. Os defeitos da auditoria (03/10/2026, BAN-01) ──────────────────
     Itens 6 a 9 de historico/revisao-de-questoes.md. Em 01/10 havia 113
     questoes com simbolo perdido, 113 com alternativas de outra questao, 64
     com outra questao colada e 10 dependendo de figura -- TODAS marcadas
     "revisao ok". O mesmo modulo que o arruma-acervo e o importar.html usam. */
  console.log("\n== 4b. NENHUM DEFEITO DA AUDITORIA NO AR ==");
  {
    const D = await import("../assets/js/defeitos-de-questao.js");
    const conf = (nome, lista) => lista.length === 0 ? ok(nome) : falha(nome, `${lista.length}: #${lista.slice(0, 4).map((q) => q.id).join(" #")}`);
    conf("🎯 nenhum símbolo perdido (quadradinho no lugar de ≠, π…)", deTexto.filter((q) => D.simboloPerdido(q)));
    const repetidas = D.alternativasRepetidas(deTexto);
    conf("🎯 nenhuma questão com as alternativas de outra", deTexto.filter((q) => repetidas.has(q.id)));
    conf("nenhum pedaço de outra questão colado no enunciado", deTexto.filter((q) => D.questaoColada(q)));
    conf("nenhuma questão que depende de figura", deTexto.filter((q) => D.dependeDeFigura(q)));
    const semRegistro = todas.filter((q) => !q.revisao || q.revisao === "ok");
    conf("toda questão diz O QUE foi conferido (não só \"ok\")", semRegistro);
  }


  /* ── 4c. O detector nao mata questao boa (03/10/2026, roadmap 3.4) ───────
     A 1a versao da regra 7 marcava as DUAS questoes de qualquer par com as
     mesmas alternativas -- e tirou do ar V/F, "I e II" e "Somente I esta
     correto" legitimos. Casos inventados, um para cada lado da regra. */
  console.log("\n== 4d. QUESTAO COMO IMAGEM DO CADERNO ==");
  {
    const fs2 = require("fs"), path2 = require("path");
    const raiz = path2.resolve(__dirname, "..");
    const semArquivo = comImagem.filter((q) => !fs2.existsSync(path2.join(raiz, q.imagem)));
    semArquivo.length === 0 ? ok(`🎯 toda imagem existe no site`, `${comImagem.length} com imagem`)
                            : falha("imagem que nao existe no site", semArquivo.slice(0, 4).map((q) => "#" + q.id).join(" "));
    const nomeErrado = comImagem.filter((q) => !String(q.imagem).startsWith(`img/questoes/${q.id}-`));
    nomeErrado.length === 0 ? ok("o arquivo de cada uma é o dela (id no nome)") : falha("imagem de outra questao", nomeErrado.map((q) => "#" + q.id).join(" "));
    const semRev = comImagem.filter((q) => !/imagem/.test(q.revisao || ""));
    semRev.length === 0 ? ok("toda imagem diz que foi conferida por olho") : falha("imagem sem registro de conferencia", `${semRev.length}`);
  }

  console.log("\n== 4c. O DETECTOR NAO MATA QUESTAO BOA ==");
  {
    const D = await import("../assets/js/defeitos-de-questao.js");
    const P = { banca: "T", prova: "P", ano: 2026 };
    const VF = { a: "V - F - F - V", b: "F - V - V - F", c: "V - V - F - F", d: "F - F - V - V" };
    const FRASES = { a: "Era charmosa; tinha olhos castanhos.", b: "Um pedreiro caiu ontem do andaime.", c: "O dinheiro possibilita trocas.", d: "Preciso te contar o que aconteceu." };
    const NUM = { a: "150; 4500", b: "150; 9000", c: "300; 4500", d: "300; 9000" };
    const q = (id, enunciado, alternativas) => ({ id, ...P, enunciado, alternativas, gabarito: "a" });
    const marcadas = (lista) => [...D.alternativasRepetidas(lista).keys()].sort().join(",");
    const caso = (nome, lista, esperado) => {
      const m = marcadas(lista);
      m === esperado ? ok(nome, m || "nenhuma") : falha(nome, `marcou [${m}], esperado [${esperado}]`);
    };
    caso("dois V/F legítimos (com \"( )\") ficam no ar",
      [q(1, "Marque V ou F. ( ) um ( ) dois ( ) tres ( ) quatro", VF), q(2, "Sobre o texto: ( ) a ( ) b ( ) c ( ) d", VF)], "");
    caso("🎯 V/F sem nenhum \"( )\" no enunciado continua acusado",
      [q(3, "Marque V ou F. ( ) um ( ) dois ( ) tres ( ) quatro", VF), q(4, "Complete the sentence: She ____ when the plane landed.", VF)], "4");
    caso("frases iguais em duas questões: as duas acusadas",
      [q(5, "Assinale a correta quanto à pontuação.", FRASES), q(6, "Avalie as afirmações sobre o acento.", FRASES)], "5,6");
    caso("resposta numérica repetida não é molde: as duas acusadas",
      [q(7, "Determine a velocidade e a força na corda.", NUM), q(8, "Qual a indicação da balança?", NUM)], "7,8");
    D.ehMolde("Todas as afirmações estão corretas.") && D.ehMolde("Somente I e II estão corretos.") && !D.ehMolde("comparative.")
      ? ok("\"Somente I…\" e \"Todas as afirmações…\" são molde; palavra comum não")
      : falha("a regra de molde errou um caso básico");
  }

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
