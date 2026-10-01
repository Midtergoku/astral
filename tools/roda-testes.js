/* ═══════════════════════════════════════════════════════════════════════════
   RODA-TESTES -- a bateria inteira, um teste por vez, com o placar no fim.

   POR QUE EXISTE (30/09/2026)
   Sao 50+ testes em tools/ e nao havia como rodar todos. Antes de mudar algo
   que mexe na economia inteira (o dominio passou a ser do servidor), era
   preciso a FOTO DE ANTES: quais passavam, para saber o que a mudanca quebrou
   e o que ja estava quebrado.

   Um por vez, de proposito: varios abrem navegador, sobem servidor local em
   porta fixa e criam contas descartaveis. Em paralelo, um pisaria no outro.

   Nenhum teste da bateria gasta credito de IA (as funcoes de IA ou estao
   desligadas, ou sao bloqueadas na rede pelo proprio teste).

   USO   node tools/roda-testes.js                 todos
         node tools/roda-testes.js tags fatos       so os que tem esses nomes
         node tools/roda-testes.js --salvar arq.json  guarda o placar (comparar depois)
   ═══════════════════════════════════════════════════════════════════════════ */

const { spawnSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const args = process.argv.slice(2);
const iSalvar = args.indexOf("--salvar");
const salvarEm = iSalvar >= 0 ? args[iSalvar + 1] : null;
const filtros = args.filter((a, i) => !a.startsWith("--") && i !== iSalvar + 1);

/* 🔴 Teste que GASTA CREDITO nunca entra na bateria. Na 1a execucao (30/09)
   o testa-edital-real entrou -- e so nao gastou porque saiu na hora, sem o
   PDF que ele exige. Agora o arquivo se declara ("GASTA CREDITO") e fica de
   fora sozinho, sem lista escrita a mao para envelhecer. */
// "nao gasta credito" (a maioria diz isso no cabecalho) NAO e pago: dai o lookbehind.
const pago = (f) => /(?<!N[ÃA]O )GASTA CR[ÉE]DITO/i.test(fs.readFileSync(path.join(__dirname, f), "utf8").slice(0, 3000));

const todos = fs.readdirSync(__dirname)
  .filter((f) => /^testa-.*\.js$/.test(f))
  .filter((f) => { if (pago(f)) { console.log(`  (pulado: ${f} gasta credito de verdade)`); return false; } return true; })
  .filter((f) => !filtros.length || filtros.some((x) => f.includes(x)))
  .sort();

const placar = [];
console.log(`\nRODA-TESTES -- ${todos.length} teste(s), um por vez\n`);
for (const f of todos) {
  const t0 = Date.now();
  const r = spawnSync("node", [path.join(__dirname, f)], { encoding: "utf8", timeout: 6 * 60 * 1000 });
  const s = ((Date.now() - t0) / 1000).toFixed(0);
  const saida = (r.stdout || "") + (r.stderr || "");
  const ok = r.status === 0;
  const motivo = ok ? "" : (r.error ? r.error.code : (saida.match(/FALHA.*$/m) || [""])[0].replace(/\s+/g, " ").slice(0, 90));
  placar.push({ teste: f, ok, segundos: +s, motivo });
  console.log(`  ${ok ? "OK   " : "FALHA"}  ${f.padEnd(34)} ${String(s).padStart(4)} s  ${motivo}`);
}
const falhas = placar.filter((p) => !p.ok);
console.log("\n" + "=".repeat(74));
console.log(falhas.length ? `🔴 ${falhas.length} de ${placar.length} falharam.` : `TODOS OS ${placar.length} PASSARAM.`);
if (salvarEm) fs.writeFileSync(salvarEm, JSON.stringify(placar, null, 1));
process.exit(falhas.length ? 1 : 0);
