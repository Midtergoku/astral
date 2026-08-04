// Procura interpolacao de DADO NAO CONFIAVEL dentro de innerHTML sem escape.
//
// "Nao confiavel" aqui e especifico: o que vem da resposta da IA, do PDF do
// edital, ou do que o usuario digita. Numero calculado e texto fixo nao contam
// -- foi isso que poluiu a primeira varredura e quase me fez ignorar o achado
// de verdade no edital.html.
const fs = require("fs");

// Caminhos de dado que sabidamente vem de fora.
const NAO_CONFIAVEL = [
  /\$\{[^}]*\bedital\.(nome|dataProva|materias|banca|cargo)\b/,
  /\$\{[^}]*\bm\.nome\b/,
  /\$\{[^}]*\bmateria\.nome\b/,
  /\$\{[^}]*\bevento\.(nome|obs)\b/,
  /\$\{[^}]*\bq\.(enunciado|explicacao|alternativas)\b/,
  /\$\{[^}]*\b(prof|professor|material|recurso)\.(nome|canal|titulo|descricao|url|link)\b/,
  /\$\{[^}]*\bconcurso\b/,
  /\$\{[^}]*\bnomeMateria\b/,
];

const ESCAPADO = /\b(esc|att|escJs|urlSegura)\s*\(/;

let achados = 0;
for (const arq of fs.readdirSync(".").filter((f) => f.endsWith(".html"))) {
  const linhas = fs.readFileSync(arq, "utf8").split("\n");
  linhas.forEach((linha, i) => {
    if (!NAO_CONFIAVEL.some((re) => re.test(linha))) return;

    // textContent, innerText e .value NAO interpretam HTML -- sao a forma
    // SEGURA de por texto na tela, e o motivo de o codigo usa-los. Marcar
    // esses como risco e alarme falso, e alarme falso ensina a ignorar alarme.
    //
    // Isto apareceu em 04/08/2026: acrescentei um `innerHTML` de texto
    // CONSTANTE (a ressalva sobre professores) 16 linhas acima de um
    // `textContent`, e a janela de contexto abaixo passou a acusar o
    // textContent. A linha nunca foi perigosa; o vizinho e que mudou.
    if (/\.(textContent|innerText|value)\s*=/.test(linha)) return;

    // Esta dentro de um bloco que vira HTML?
    const ctx = linhas.slice(Math.max(0, i - 20), i + 5).join("\n");
    const viraHtml = /innerHTML|insertAdjacentHTML|outerHTML/.test(ctx);
    if (!viraHtml) return;

    // A propria interpolacao ja escapa?
    if (ESCAPADO.test(linha)) return;

    achados++;
    console.log(`  ${arq}:${i + 1}`);
    console.log(`      ${linha.trim().slice(0, 100)}`);
  });
}

console.log(
  achados === 0
    ? "\nNenhuma interpolacao de dado nao confiavel sem escape."
    : `\n${achados} ponto(s) para corrigir.`,
);
process.exit(achados ? 1 : 0);
