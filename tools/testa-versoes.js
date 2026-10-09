/* ═══════════════════════════════════════════════════════════════════════════
   TESTA-VERSOES -- as bibliotecas tem versao EXATA e nenhuma falha conhecida?
   (09/10/2026 -- auditoria SEG-07, roadmap 3.16)

   O servidor importava "jsr:@supabase/supabase-js@2" -- a versao 2 MAIS NOVA
   no dia de cada publicacao. Uma versao nova com defeito entraria no ar sem
   ninguem decidir. Nao ha package.json (nao ha build), entao `npm audit` nao
   se aplica: este teste faz o papel dele.

     1. toda importacao das funcoes (jsr:, npm:) tem versao EXATA (x.y.z)
     2. a lista de versoes (funcoes + as copias no site: supabase-X.js,
        pdf-X.min.mjs) vai ao banco de vulnerabilidades do npm
     3. CONTROLE: a mesma consulta com o pdf.js 4.1.392 (CVE-2024-4367) TEM de
        voltar com alerta -- senao a consulta esta cega e o "nada" nao vale

   Atualizar uma biblioteca: trocar a versao no import, publicar no dev, rodar a
   bateria, e so entao a producao. O SDK da Anthropic (0.27.0) fica para o dia
   do credito, testado com a "IA de mentira" (backend.md 8.24).

   USO   node tools/testa-versoes.js     (nao usa banco nem credito)
   ═══════════════════════════════════════════════════════════════════════════ */
const fs = require("fs");
const path = require("path");
const RAIZ = path.resolve(__dirname, "..");
const FUN = path.join(RAIZ, "supabase", "functions");

let falhas = 0;
const ok = (t, d = "") => console.log(`  OK     ${t.padEnd(56)} ${d}`);
const falha = (t, d = "") => { console.log(`  FALHA  ${t.padEnd(56)} ${d}`); falhas++; };

async function avisos(pacotes) {
  const r = await fetch("https://registry.npmjs.org/-/npm/v1/security/advisories/bulk", {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(pacotes) });
  if (!r.ok) throw new Error(`registro do npm respondeu ${r.status}`);
  return r.json();
}

(async () => {
  console.log("\nTESTA-VERSOES -- versoes exatas e sem falha conhecida\n");
  // 1. versoes exatas
  const usados = {};
  const soltas = [];
  for (const d of fs.readdirSync(FUN)) {
    const p = path.join(FUN, d);
    if (!fs.statSync(p).isDirectory()) continue;
    for (const f of fs.readdirSync(p).filter((x) => /\.(ts|json)$/.test(x))) {
      const t = fs.readFileSync(path.join(p, f), "utf8");
      for (const m of t.matchAll(/["'](jsr|npm):(@?[^@"'\s]+)@([^"'\s/]+)/g)) {
        const [, , nome, versao] = m;
        if (!/^\d+\.\d+\.\d+$/.test(versao)) soltas.push(`${d}/${f}: ${nome}@${versao}`);
        else (usados[nome] ||= new Set()).add(versao);
      }
    }
  }
  soltas.length ? falha("🎯 importação com versão solta no servidor", soltas.slice(0, 4).join(" · "))
    : ok("🎯 toda importação do servidor tem versão exata", `${Object.keys(usados).length} bibliotecas`);

  // as copias no site
  const js = fs.readdirSync(path.join(RAIZ, "assets", "js"));
  for (const f of js) {
    let m = f.match(/^supabase-(\d+\.\d+\.\d+)\.js$/);
    if (m) (usados["@supabase/supabase-js"] ||= new Set()).add(m[1]);
    m = f.match(/^pdf-(\d+\.\d+\.\d+)\.min\.mjs$/);
    if (m) (usados["pdfjs-dist"] ||= new Set()).add(m[1]);
  }
  const pacotes = Object.fromEntries(Object.entries(usados).map(([k, v]) => [k, [...v]]));
  console.log("  versões em uso:", Object.entries(pacotes).map(([k, v]) => `${k} ${v.join("/")}`).join(" · "));

  // 3. controle antes da resposta de verdade
  try {
    const controle = await avisos({ "pdfjs-dist": ["4.1.392"] });
    if (!(controle["pdfjs-dist"] || []).length) { falha("a consulta de vulnerabilidades está cega", "o pdf.js 4.1.392 (CVE-2024-4367) voltou sem alerta"); }
    else {
      ok("controle: a consulta enxerga falha conhecida", "pdf.js 4.1.392 → alerta");
      // 2. as versoes em uso
      const r = await avisos(pacotes);
      const achados = Object.entries(r).flatMap(([p, l]) => l.map((a) => `${p}: ${a.severity} ${a.title} (${a.vulnerable_versions})`));
      achados.length ? achados.forEach((a) => falha("🎯 falha conhecida numa versão em uso", a))
        : ok("🎯 nenhuma falha conhecida nas versões em uso", `${Object.keys(pacotes).length} bibliotecas`);
    }
  } catch (e) { falha("não consegui consultar o registro do npm", e.message.slice(0, 80)); }

  console.log("\n" + "=".repeat(70));
  console.log(falhas === 0 ? "AS BIBLIOTECAS TÊM VERSÃO EXATA E NENHUMA FALHA CONHECIDA." : `🔴 ${falhas} FALHA(S).`);
  // exitCode, nao exit(): com a conexao do fetch ainda fechando, o exit() no Windows dispara um "Assertion failed" do libuv
  process.exitCode = falhas ? 1 : 0;
})();
