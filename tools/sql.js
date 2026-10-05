/* SQL -- roda uma consulta do arquivo no banco, pela API de gerenciamento (04/10/2026).
   Era um script de rascunho da sessao; veio para ca porque toda rodada de roadmap usa.

   USO   node tools/sql.js consulta.sql          (PRODUCAO)
         node tools/sql.js consulta.sql --dev    (astral-dev)

   🔴 Na producao, use para LER. Mudanca de estrutura vai por migration
      (supabase db push); apagar linha e decisao dele (regra 8.1). */
const { execFileSync } = require("child_process");
const fs = require("fs");
const path = require("path");
const REF = process.argv.includes("--dev") ? "vtluuezwfpqgryixaaea" : "jjogmcacbdefwiwcyjxp";
const arq = process.argv.slice(2).find((a) => !a.startsWith("--"));
if (!arq) { console.log("uso: node tools/sql.js consulta.sql [--dev]"); process.exit(1); }
const TOKEN = execFileSync("powershell", ["-NoProfile", "-File", path.join(__dirname, "token-supabase.ps1")],
  { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
(async () => {
  const r = await fetch(`https://api.supabase.com/v1/projects/${REF}/database/query`, {
    method: "POST", headers: { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify({ query: fs.readFileSync(arq, "utf8") }),
  });
  const t = await r.text();
  if (!r.ok) { console.log("HTTP", r.status, t.slice(0, 300)); process.exit(1); }
  console.table(JSON.parse(t));
})();
