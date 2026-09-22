// TESTA-FORMATOS -- o leitor entende prova de outras bancas, e nao so da FAB?
//
// 🔴 POR QUE ISTO EXISTE: em 22/09/2026 ele perguntou "voce nao conseguiu
// provas dos bombeiros, da policia, da marinha?". Nao era falta de PROVA --
// era falta de LEITURA. Cada banca imprime de um jeito, e o leitor so conhecia
// o da Forca Aerea.
//
// Os textos aqui sao inventados, mas cada um reproduz o formato REAL de uma
// prova que eu baixei e medi: bombeiro de MG, bombeiro do ES, ESA.
//
// ⚠️ E a parte mais perigosa deste arquivo nao e ler a prova -- e ler o
// GABARITO. Resposta errada e pior que prova ausente: a pessoa estuda, aprende
// errado, e culpa o site. Por isso metade das checagens abaixo exige que o
// leitor RECUSE em vez de adivinhar.

let falhas = 0;
const ok = (t, d = "") => console.log(`  OK     ${t.padEnd(56)} ${d}`);
const falha = (t, d = "") => { console.log(`  FALHA  ${t.padEnd(56)} ${d}`); falhas++; };

// ── Uma prova no formato "Questão NN" + "(A)" (bombeiro de MG) ─────────────
const MG = [
  "Língua Portuguesa",
  "",
  "Questão 01",
  "Assinale a alternativa em que o uso da crase esta correto no periodo.",
  "(A) Fui a escola ontem de manha, bem cedo.",
  "(B) Refiro-me a aluna nova que chegou esta semana.",
  "(C) Cheguei a as nove horas da manha de ontem.",
  "(D) Voltei a casa dela depois do almoco de domingo.",
  "",
  "Questão 02",
  "O pronome em destaque no periodo acima desempenha papel de que natureza?",
  "(A) exoforico e direto. (B) anaforico e indireto.",
  "(C) cataforico e pleno. (D) deitico e circunstancial.",
  "",
  "Proteção e Defesa Civil",
  "",
  "Questão 03",
  "Sobre o sistema nacional de protecao e defesa civil, assinale a correta.",
  "(A) Compete apenas a Uniao a gestao dos riscos de desastre.",
  "(B) O municipio e o primeiro a responder a um desastre local.",
  "(C) Estados nao participam das acoes de resposta a desastres.",
  "(D) A defesa civil atua somente depois do desastre ocorrido.",
  "",
  "Questão 04",
    "Enunciado da questao 4 sobre protecao e defesa civil, com tamanho suficiente para valer.",
    "(A) Primeira alternativa da questao 4, com texto de verdade.",
    "(B) Segunda alternativa da questao 4, com texto de verdade.",
    "(C) Terceira alternativa da questao 4, com texto de verdade.",
    "(D) Quarta alternativa da questao 4, com texto de verdade.",
    "",
  "Questão 05",
    "Enunciado da questao 5 sobre protecao e defesa civil, com tamanho suficiente para valer.",
    "(A) Primeira alternativa da questao 5, com texto de verdade.",
    "(B) Segunda alternativa da questao 5, com texto de verdade.",
    "(C) Terceira alternativa da questao 5, com texto de verdade.",
    "(D) Quarta alternativa da questao 5, com texto de verdade.",
    "",
  "Questão 06",
    "Enunciado da questao 6 sobre protecao e defesa civil, com tamanho suficiente para valer.",
    "(A) Primeira alternativa da questao 6, com texto de verdade.",
    "(B) Segunda alternativa da questao 6, com texto de verdade.",
    "(C) Terceira alternativa da questao 6, com texto de verdade.",
    "(D) Quarta alternativa da questao 6, com texto de verdade.",
    "",
  "Questão 07",
    "Enunciado da questao 7 sobre protecao e defesa civil, com tamanho suficiente para valer.",
    "(A) Primeira alternativa da questao 7, com texto de verdade.",
    "(B) Segunda alternativa da questao 7, com texto de verdade.",
    "(C) Terceira alternativa da questao 7, com texto de verdade.",
    "(D) Quarta alternativa da questao 7, com texto de verdade.",
    "",
  "Questão 08",
    "Enunciado da questao 8 sobre protecao e defesa civil, com tamanho suficiente para valer.",
    "(A) Primeira alternativa da questao 8, com texto de verdade.",
    "(B) Segunda alternativa da questao 8, com texto de verdade.",
    "(C) Terceira alternativa da questao 8, com texto de verdade.",
    "(D) Quarta alternativa da questao 8, com texto de verdade.",
    "",
].join("\n");

// ── Uma prova no formato "NN." + "A)" com CINCO alternativas (bombeiro ES) ──
const ES = [
  "LÍNGUA PORTUGUESA",
  "",
  "1. Ha trecho que comprova que o coronel era homem pouco cerimonioso em:",
  "A) “...o triplo das pessoas convidadas para o sarau daquela noite...”",
  "B) “... gostava sobretudo do triplo das pessoas.”",
  "C) “... conversavam com as velhas, estando entre as moças ...”",
  "D) “O coronel foi ter com ele e o levou para onde estava a mulher ...”",
  "E) “... convidar apenas as pessoas mais intimas e familiares.”",
  "",
  "QUÍMICA",
  "",
  "2. A massa molar do acido sulfurico, em gramas por mol, vale aproximadamente:",
  "A) 98 gramas por mol, considerando os valores usuais.",
  "B) 80 gramas por mol, considerando os valores usuais.",
  "C) 64 gramas por mol, considerando os valores usuais.",
  "D) 49 gramas por mol, considerando os valores usuais.",
  "E) 32 gramas por mol, considerando os valores usuais.",
  "",
  "3. Enunciado da questao 3 sobre quimica geral, com tamanho suficiente.",
    "A) Primeira alternativa da questao 3, com texto de verdade.",
    "B) Segunda alternativa da questao 3, com texto de verdade.",
    "C) Terceira alternativa da questao 3, com texto de verdade.",
    "D) Quarta alternativa da questao 3, com texto de verdade.",
    "E) Quinta alternativa da questao 3, com texto de verdade.",
    "",
  "4. Enunciado da questao 4 sobre quimica geral, com tamanho suficiente.",
    "A) Primeira alternativa da questao 4, com texto de verdade.",
    "B) Segunda alternativa da questao 4, com texto de verdade.",
    "C) Terceira alternativa da questao 4, com texto de verdade.",
    "D) Quarta alternativa da questao 4, com texto de verdade.",
    "E) Quinta alternativa da questao 4, com texto de verdade.",
    "",
  "5. Enunciado da questao 5 sobre quimica geral, com tamanho suficiente.",
    "A) Primeira alternativa da questao 5, com texto de verdade.",
    "B) Segunda alternativa da questao 5, com texto de verdade.",
    "C) Terceira alternativa da questao 5, com texto de verdade.",
    "D) Quarta alternativa da questao 5, com texto de verdade.",
    "E) Quinta alternativa da questao 5, com texto de verdade.",
    "",
  "6. Enunciado da questao 6 sobre quimica geral, com tamanho suficiente.",
    "A) Primeira alternativa da questao 6, com texto de verdade.",
    "B) Segunda alternativa da questao 6, com texto de verdade.",
    "C) Terceira alternativa da questao 6, com texto de verdade.",
    "D) Quarta alternativa da questao 6, com texto de verdade.",
    "E) Quinta alternativa da questao 6, com texto de verdade.",
    "",
  "7. Enunciado da questao 7 sobre quimica geral, com tamanho suficiente.",
    "A) Primeira alternativa da questao 7, com texto de verdade.",
    "B) Segunda alternativa da questao 7, com texto de verdade.",
    "C) Terceira alternativa da questao 7, com texto de verdade.",
    "D) Quarta alternativa da questao 7, com texto de verdade.",
    "E) Quinta alternativa da questao 7, com texto de verdade.",
    "",
].join("\n");

// ── Um gabarito em tabela deitada, com dois tipos de prova ─────────────────
const GABARITO_DOIS_TIPOS = [
  "CURSO DE FORMACAO DE OFICIAIS - PROVA TIPO 1",
  "1 2 3 4 5 6 7 8 9 10",
  "D C E A C D B B B D",
  "CURSO DE FORMACAO DE OFICIAIS - PROVA TIPO 2",
  "1 2 3 4 5 6 7 8 9 10",
  "C D B B B D C E A D",
].join("\n");

const GABARITO_UM_TIPO = [
  "GABARITO OFICIAL",
  "1 2 3 4 5 6 7 8 9 10",
  "B A C D E A B C D E",
].join("\n");

(async () => {
  const P = await import("../assets/js/prova.js");
  console.log("\nTESTA-FORMATOS\n");

  // ── 1. O formato e DESCOBERTO ─────────────────────────────────────────
  console.log("== 1. O LEITOR DESCOBRE O FORMATO SOZINHO ==");
  {
    const rMG = P.montarQuestoes([MG], { incluirSemGabarito: true });
    rMG.formato === "questao"
      ? ok("🎯 reconhece 'Questão NN' + '(A)'", "bombeiro de MG")
      : falha("formato errado para MG", String(rMG.formato));
    rMG.prontas.length === 8
      ? ok("e le as 8 questoes inteiras", "com 4 alternativas cada")
      : falha("questoes lidas no formato MG", `${rMG.prontas.length} de 8`);

    const rES = P.montarQuestoes([ES], { incluirSemGabarito: true });
    rES.formato === "ponto"
      ? ok("🎯 reconhece 'NN.' + 'A)'", "bombeiro do ES")
      : falha("formato errado para ES", String(rES.formato));
    const cinco = rES.prontas.find((q) => Object.keys(q.alternativas).length === 5);
    cinco ? ok("e le as CINCO alternativas", "a,b,c,d,e") : falha("nao fechou 5 alternativas");
  }

  // ── 2. A MATERIA vem do cabecalho, nao da faixa ───────────────────────
  console.log("\n== 2. A MATERIA, QUANDO A PROVA NAO DECLARA FAIXA ==");
  {
    const rMG = P.montarQuestoes([MG], { incluirSemGabarito: true });
    const q1 = rMG.prontas.find((q) => q.numero === 1);
    const q3 = rMG.prontas.find((q) => q.numero === 3);
    q1?.materia === "Português" && q3?.materia === "Proteção e defesa civil"
      ? ok("🎯 cada questao pega o cabecalho acima dela", `1=${q1.materia}, 3=${q3.materia}`)
      : falha("materia pelo cabecalho", `1=${q1?.materia}, 3=${q3?.materia}`);

    const rES = P.montarQuestoes([ES], { incluirSemGabarito: true });
    const quim = rES.prontas.find((q) => q.numero === 2);
    quim?.materia === "Química"
      ? ok("🎯 Química existe agora", "era o pedido dele: 'bombeiro tem quimica'")
      : falha("Quimica nao foi reconhecida", String(quim?.materia));
  }

  // ── 3. O GABARITO DE ARQUIVO SEPARADO ─────────────────────────────────
  console.log("\n== 3. O GABARITO QUE VEM EM OUTRO ARQUIVO ==");
  {
    const um = P.gabaritoDeTabela(GABARITO_UM_TIPO);
    um.respostas.size === 10 && um.respostas.get(1) === "b" && um.respostas.get(10) === "e"
      ? ok("le a tabela deitada", `${um.respostas.size} respostas, 1=b, 10=e`)
      : falha("tabela deitada", `${um.respostas.size} respostas, 1=${um.respostas.get(1)}`);

    // 🔴 A checagem que evita o pior defeito possivel.
    const semDizer = P.gabaritoDeTabela(GABARITO_DOIS_TIPOS);
    semDizer.respostas.size === 0 && semDizer.ambiguo
      ? ok("🎯 com 2 tipos e sem dizer qual, NAO responde nada", semDizer.ambiguo.slice(0, 44))
      : falha("🔴 misturou tipos de prova diferentes", `${semDizer.respostas.size} respostas`);

    const t1 = P.gabaritoDeTabela(GABARITO_DOIS_TIPOS, { secao: "1" });
    const t2 = P.gabaritoDeTabela(GABARITO_DOIS_TIPOS, { secao: "2" });
    t1.respostas.get(1) === "d" && t2.respostas.get(1) === "c"
      ? ok("🎯 dizendo o tipo, cada um da a SUA resposta", "tipo 1 -> d, tipo 2 -> c")
      : falha("as secoes nao foram separadas", `t1=${t1.respostas.get(1)}, t2=${t2.respostas.get(1)}`);

    const inexistente = P.gabaritoDeTabela(GABARITO_DOIS_TIPOS, { secao: "9" });
    inexistente.respostas.size === 0 && inexistente.ambiguo
      ? ok("pedir um tipo que nao existe nao devolve chute", inexistente.ambiguo.slice(0, 40))
      : falha("inventou respostas para um tipo inexistente");
  }

  // ── 4. CONTA ERRADA = BLOCO INTEIRO FORA ──────────────────────────────
  console.log("\n== 4. BATE OU NAO ENTRA ==");
  {
    // 10 numeros, 9 letras: falta uma. Nao da para saber QUAL faltou.
    const faltando = "1 2 3 4 5 6 7 8 9 10\nB A C D E A B C D";
    const r = P.gabaritoDeTabela(faltando);
    r.respostas.size === 0 && r.blocosRecusados === 1
      ? ok("🎯 falta uma letra: o bloco INTEIRO e recusado", "nao se desloca a resposta")
      : falha("aceitou bloco incompleto", `${r.respostas.size} respostas`);

    // Texto no meio das letras -- e titulo vazando, nao gabarito.
    const sujo = "1 2 3 4 5 6 7 8 9 10\nB A C D E CADETE do curso A B C D E";
    const rs = P.gabaritoDeTabela(sujo);
    rs.respostas.size === 0
      ? ok("texto no meio das respostas derruba o bloco", "titulo da secao seguinte nao vira resposta")
      : falha("aceitou bloco contaminado", `${rs.respostas.size} respostas`);

    // Numeros nao consecutivos nao sao fileira de gabarito.
    const naoEhTabela = "12 45 7 99 3 21\nA B C D E A";
    P.gabaritoDeTabela(naoEhTabela).respostas.size === 0
      ? ok("numeros soltos nao viram gabarito", "fileira tem de ser consecutiva")
      : falha("leu gabarito de numeros soltos");
  }

  console.log("\n" + "=".repeat(72));
  console.log(falhas === 0
    ? "O LEITOR ENTENDE OUTRAS BANCAS — e recusa o gabarito que nao da para provar."
    : `🔴 ${falhas} FALHA(S).`);
  process.exit(falhas === 0 ? 0 : 1);
})();
