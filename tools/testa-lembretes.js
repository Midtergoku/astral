// Prova que o lembrete DISPARA quando o gatilho e atingido.
// Um alarme que so foi visto em silencio nao prova que toca.
// Caminho relativo a este arquivo, nunca absoluto -- ver a licao do valida-css.js
// em 15/09, que morreu em silencio quando o projeto mudou de pasta.
const { rodar, LEMBRETES } = require("./lembretes.js");

const r14 = LEMBRETES.find((l) => l.id === "R14");
const medirOriginal = r14.medir;
let falhas = 0;

function capturar(fn) {
  const linhas = [];
  const antigo = console.log;
  console.log = (...a) => linhas.push(a.join(" "));
  return fn().then((d) => { console.log = antigo; return { linhas: linhas.join("\n"), disparou: d }; },
                   (e) => { console.log = antigo; throw e; });
}

(async () => {
  // 1. Abaixo do gatilho: nao dispara.
  r14.medir = async () => r14.gatilho - 1;
  let r = await capturar(() => rodar({ silencioseLonge: true }));
  if (!r.disparou && /199\/200|ainda nao|R14 199\/200/.test(r.linhas)) {
    console.log("  OK     com " + (r14.gatilho - 1) + " nao dispara, e fica numa linha so");
  } else { console.log("  FALHA  disparou cedo demais:", r.linhas); falhas++; }

  // 2. Exatamente no gatilho: dispara.
  r14.medir = async () => r14.gatilho;
  r = await capturar(() => rodar({ silencioseLonge: true }));
  if (r.disparou && /CHEGOU A HORA/.test(r.linhas) && /AVISAR O LUCAS/.test(r.linhas)) {
    console.log("  OK     com " + r14.gatilho + " DISPARA e manda avisar o Lucas");
    console.log("           " + (r.linhas.split("\n").find((l) => /CHEGOU A HORA/.test(l)) || "").trim());
  } else { console.log("  FALHA  nao disparou no gatilho:", r.linhas); falhas++; }

  // 3. Acima do gatilho: continua disparando (nao e evento de uma vez so).
  r14.medir = async () => r14.gatilho + 50;
  r = await capturar(() => rodar({ silencioseLonge: true }));
  if (r.disparou) console.log("  OK     acima do gatilho continua avisando, nao some depois da 1a vez");
  else { console.log("  FALHA  parou de avisar acima do gatilho"); falhas++; }

  // 4. Sem conseguir medir: NUNCA inventa numero.
  r14.medir = async () => { throw new Error("banco fora do ar"); };
  r = await capturar(() => rodar({ silencioseLonge: true }));
  if (!r.disparou && /NAO MEDI/.test(r.linhas) && !/\d+ de 200/.test(r.linhas)) {
    console.log("  OK     🎯 sem medicao diz 'NAO MEDI' — nao inventa numero nem dispara a toa");
  } else { console.log("  FALHA  inventou algo sem medir:", r.linhas); falhas++; }

  r14.medir = medirOriginal;
  console.log(falhas === 0 ? "\n  O LEMBRETE TOCA NA HORA CERTA." : `\n  🔴 ${falhas} FALHA(S).`);
  process.exit(falhas === 0 ? 0 : 1);
})();
