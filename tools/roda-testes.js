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

   09/10/2026 (auditoria COD-02, roadmap 3.15): A BATERIA RODA NO ASTRAL-DEV.
   Antes ela criava e apagava contas na PRODUCAO -- com alunos de verdade, uma
   falha no meio deixaria conta falsa e distorceria o funil. Agora todo teste
   que sabe rodar no dev (usa tools/testes/alvo.js ou le ASTRAL_DEV) recebe
   ASTRAL_DEV=1. Ficam na producao so os que existem para olhar o que esta NO
   AR (SO_NA_PRODUCAO, abaixo). Testes so de tela (sessao falsa, sem banco)
   nao mudam.
   O testa-migrations-do-zero APAGA os dados do dev: roda POR ULTIMO, e em
   seguida a bateria devolve o acervo e as contas f3-* (dev-acervo, dev-semear).
   Regra para o dev servir: migration e funcao vao para o dev ANTES da producao
   (o ritmo de sempre); o do-zero acusa se o dev ficar diferente.

   USO   node tools/roda-testes.js                 todos (no dev, menos os do ar)
         node tools/roda-testes.js tags fatos       so os que tem esses nomes
         node tools/roda-testes.js --producao       todos contra a producao (como antes de 09/10)
         node tools/roda-testes.js --salvar arq.json  guarda o placar (comparar depois)
   ═══════════════════════════════════════════════════════════════════════════ */

const { spawnSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const args = process.argv.slice(2);
const iSalvar = args.indexOf("--salvar");
const salvarEm = iSalvar >= 0 ? args[iSalvar + 1] : null;
// 🔴 Sem --salvar, iSalvar e -1 e "i !== iSalvar + 1" descartava o PRIMEIRO
// filtro (indice 0). Rodei "roda-testes chefe ..." e o chefe nao rodou.
const filtros = args.filter((a, i) => !a.startsWith("--") && !(iSalvar >= 0 && i === iSalvar + 1));

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
  .sort()
  // o do-zero apaga o dev: por ultimo
  .sort((a, b) => (a === "testa-migrations-do-zero.js") - (b === "testa-migrations-do-zero.js"));

// Os que olham o que esta NO AR: o site publicado fala com a producao, e o
// backup que importa e o dos alunos de verdade.
const SO_NA_PRODUCAO = new Set(["testa-site.js", "testa-vitrine.js", "testa-lighthouse.js", "testa-restauracao.js"]);
const NA_PRODUCAO = args.includes("--producao");
const sabeDev = (f) => /require\("\.\/testes\/alvo"\)|ASTRAL_DEV/.test(fs.readFileSync(path.join(__dirname, f), "utf8"));
const ondeRoda = (f) => (!NA_PRODUCAO && !SO_NA_PRODUCAO.has(f) && sabeDev(f) ? "dev" : (sabeDev(f) || SO_NA_PRODUCAO.has(f) ? "prod" : "tela"));

const placar = [];
console.log(`\nRODA-TESTES -- ${todos.length} teste(s), um por vez\n`);
for (const f of todos) {
  const t0 = Date.now();
  const onde = ondeRoda(f);
  const env = { ...process.env };
  if (onde === "dev") env.ASTRAL_DEV = "1"; else delete env.ASTRAL_DEV;
  // 09/10/2026: o Lighthouse passa pelas 24 paginas no ar e ja levava 333 s de 360 -- estourou uma vez.
  const minutos = { "testa-lighthouse.js": 15 }[f] || 6;
  const r = spawnSync("node", [path.join(__dirname, f)], { encoding: "utf8", timeout: minutos * 60 * 1000, env });
  const s = ((Date.now() - t0) / 1000).toFixed(0);
  const saida = (r.stdout || "") + (r.stderr || "");
  const ok = r.status === 0;
  const motivo = ok ? "" : (r.error ? r.error.code : (saida.match(/FALHA.*$/m) || [""])[0].replace(/\s+/g, " ").slice(0, 90));
  placar.push({ teste: f, ok, segundos: +s, motivo, onde });
  console.log(`  ${ok ? "OK   " : "FALHA"}  ${f.padEnd(34)} ${onde.padEnd(4)} ${String(s).padStart(4)} s  ${motivo}`);
}
// o do-zero apagou o dev: devolve o acervo e as contas de auditoria
if (todos.includes("testa-migrations-do-zero.js")) {
  for (const sem of ["dev-acervo.js", "dev-semear.js"]) {
    const r = spawnSync("node", [path.join(__dirname, sem)], { encoding: "utf8", timeout: 6 * 60 * 1000 });
    console.log(`  ${r.status === 0 ? "     " : "FALHA"}  (dev semeado de novo: ${sem}) ${(r.stdout || "").trim().split("\n").pop().slice(0, 70)}`);
  }
}
const nos = (o) => placar.filter((p) => p.onde === o).length;
console.log(`\n  onde rodaram: ${nos("dev")} no astral-dev · ${nos("prod")} na produção · ${nos("tela")} só de tela (sem banco)`);
const falhas = placar.filter((p) => !p.ok);
console.log("\n" + "=".repeat(74));
console.log(falhas.length ? `🔴 ${falhas.length} de ${placar.length} falharam.` : `TODOS OS ${placar.length} PASSARAM.`);
if (salvarEm) fs.writeFileSync(salvarEm, JSON.stringify(placar, null, 1));
process.exit(falhas.length ? 1 : 0);
