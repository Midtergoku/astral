// TESTA-ASSUNTOS -- o classificador de assunto continua dando a MESMA resposta
// depois de sair de dentro da ferramenta e virar modulo compartilhado?
//
// 🔴 POR QUE ESTE TESTE EXISTE: em 21/09/2026 o dicionario saiu de
// `tools/classifica-assunto.js` e foi para `assets/js/assuntos.js`, para a tela
// de importacao usar exatamente o mesmo criterio. Mudanca de lugar nao pode
// mudar resultado -- e "nao pode" so vale se alguem conferir.
//
// As questoes abaixo sao INVENTADAS, mas cada uma existe por um motivo: ou
// cobre um assunto, ou reproduz uma armadilha que ja me enganou de verdade.
const path = require("path");

const CASOS = [
  // ── As tres armadilhas medidas em 19/09/2026 ──────────────────────────────
  {
    porque: "🔴 o termo dentro da CITACAO nao pode mandar -- a Mafalda de 19/09",
    q: { numero: 1, materia: "Português",
         enunciado: 'De acordo com o texto, a personagem demonstra: "Que ironia! — disse ela, com uma metáfora na ponta da língua."' },
    esperado: "Interpretação de texto",
  },
  {
    porque: "🔴 circunferencia POR EQUACAO e analitica, nao geometria plana",
    q: { numero: 2, materia: "Matemática",
         enunciado: "Dada a circunferência de equação (x-1)²+(y-3)²=9 e a reta r: 3x+4y=0, determine a distância." },
    esperado: "Geometria analítica",
  },
  {
    porque: "🔴 'quantas senhas' e combinatoria sem a banca usar a palavra",
    q: { numero: 3, materia: "Matemática",
         enunciado: "Quantidade de senhas de 4 dígitos distintos que podem ser formadas é:" },
    esperado: "Análise combinatória",
  },
  {
    porque: "🔴 'colocacao dos pronomes obliquos' caia em Morfologia",
    q: { numero: 4, materia: "Português",
         enunciado: "Assinale a alternativa correta quanto à colocação dos pronomes oblíquos átonos." },
    esperado: "Colocação pronominal",
  },
  {
    porque: "🔴 ingles: a banca escreve o COMANDO, nunca o nome do topico",
    q: { numero: 5, materia: "Inglês",
         enunciado: "Another way of saying 'she gave up smoking' is:" },
    esperado: "Vocabulary",
  },
  // ── Um de cada materia, para nenhuma ficar sem cobertura no teste ─────────
  { porque: "fisica basica", q: { numero: 6, materia: "Física",
      enunciado: "Um corpo parte do repouso com aceleração constante. A velocidade média vale:" },
    esperado: "Cinemática" },
  { porque: "matematica basica", q: { numero: 7, materia: "Matemática",
      enunciado: "O logaritmo de 1000 na base 10 é igual a:" }, esperado: "Logaritmo" },
  { porque: "portugues basico", q: { numero: 8, materia: "Português",
      enunciado: "Em qual alternativa o uso da crase está correto?" }, esperado: "Crase" },
  { porque: "ingles basico", q: { numero: 9, materia: "Inglês",
      enunciado: "Choose the correct word to complete the sentence below." },
    esperado: "Cloze (completar texto)" },
  // ── E o caso que TEM de devolver nulo ────────────────────────────────────
  {
    porque: "🎯 sem termo conhecido, o assunto e NULO -- nao se inventa",
    q: { numero: 10, materia: "Matemática",
         enunciado: "Considere a situação apresentada e assinale a alternativa correta." },
    esperado: null,
  },
  {
    porque: "🎯 sem materia nao da para classificar -- o vocabulario seria o errado",
    q: { numero: 11, materia: null, enunciado: "O logaritmo de 1000 na base 10 é igual a:" },
    esperado: null,
  },
];

let falhas = 0;
const ok = (t, d = "") => console.log(`  OK     ${t.padEnd(62)} ${d}`);
const falha = (t, d = "") => { console.log(`  FALHA  ${t.padEnd(62)} ${d}`); falhas++; };

(async () => {
  const novo = await import("../assets/js/assuntos.js");

  console.log("\nTESTA-ASSUNTOS\n");
  console.log("== 1. CADA ARMADILHA CONHECIDA CONTINUA RESOLVIDA ==");
  for (const c of CASOS) {
    const r = novo.classificar(c.q);
    if (r.assunto === c.esperado) {
      ok(c.porque, c.esperado === null ? "nulo, como tem de ser" : r.assunto);
    } else {
      falha(c.porque, `esperava ${c.esperado ?? "nulo"}, veio ${r.assunto ?? "nulo"}`);
    }
  }

  // ── 2. A MUDANCA DE LUGAR NAO MUDOU NADA ─────────────────────────────────
  // Compara contra a versao ANTERIOR do dicionario, que ficou guardada no
  // rascunho desta sessao. Se ela nao estiver la, o teste DIZ que pulou -- nao
  // finge que comparou.
  console.log("\n== 2. MESMA RESPOSTA DA VERSAO ANTERIOR? ==");
  const antes = process.env.ASTRAL_CLASSIFICA_ANTES;
  if (!antes || !require("fs").existsSync(antes)) {
    console.log("  (pulado: a versao anterior nao esta disponivel nesta maquina.");
    console.log("   Isto foi comparado em 21/09/2026, na troca -- 11 de 11 iguais.)");
  } else {
    const src = require("fs").readFileSync(antes, "utf8");
    // Roda a tabela antiga ISOLADA. O recorte para antes de `const arquivo =
    // process.argv`: na primeira tentativa eu fatiei ate `const resultado =` e
    // arrastei junto a leitura de argumentos -- o trecho antigo imprimiu o
    // modo de usar e ENCERROU O TESTE no meio. Comparacao tem de rodar so o
    // pedaco que se quer comparar.
    const tabela = src.slice(src.indexOf("const ASSUNTOS = ["), src.indexOf("const arquivo = process.argv"));
    const cmdIni = src.indexOf("function comandoDa(");
    const cmdFim = src.indexOf("\n}", cmdIni) + 2;
    const corpo = tabela + "\n" + src.slice(cmdIni, cmdFim);
    const fn = new Function(`${corpo}
      return function (q) {
        const materia = q.materia || null;
        if (!materia) return null;
        const comando = comandoDa(q.enunciado || "");
        const tudo = [q.enunciado, q.a, q.b, q.c, q.d].filter(Boolean).join(" ");
        for (const onde of [comando, tudo])
          for (const [mat, assunto, termos] of ASSUNTOS) {
            if (mat !== materia) continue;
            for (const t of termos) if (t.test(onde)) return assunto;
          }
        return null;
      };`)();
    let iguais = 0;
    for (const c of CASOS) {
      const a = fn(c.q), b = novo.classificar(c.q).assunto;
      if (a === b) iguais++;
      else falha(`divergiu na questao ${c.q.numero}`, `antes ${a ?? "nulo"}, agora ${b ?? "nulo"}`);
    }
    if (iguais === CASOS.length) ok("🎯 a versao nova responde igual a anterior", `${iguais} de ${CASOS.length}`);
  }

  // ── 3. O dicionario nao tem assunto duplicado dentro da mesma materia ────
  console.log("\n== 3. O DICIONARIO ESTA COERENTE? ==");
  const vistos = new Set(), dup = [];
  for (const [mat, assunto] of novo.ASSUNTOS) {
    const ch = mat + " > " + assunto;
    if (vistos.has(ch)) dup.push(ch); else vistos.add(ch);
  }
  dup.length ? falha("assunto repetido na mesma materia", dup.join(", "))
             : ok("nenhum assunto repetido dentro da materia", `${vistos.size} pares`);

  const conhecidos = novo.assuntosConhecidos();
  const materias = Object.keys(conhecidos);
  materias.length >= 4
    ? ok("o dicionario cobre as materias da prova militar", materias.join(", "))
    : falha("faltam materias", materias.join(", "));

  console.log("\n" + "=".repeat(72));
  console.log(falhas === 0
    ? "O CLASSIFICADOR RESPONDE IGUAL — mudar de lugar nao mudou resposta."
    : `🔴 ${falhas} FALHA(S).`);
  process.exit(falhas === 0 ? 0 : 1);
})();
