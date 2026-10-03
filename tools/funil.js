/* ═══════════════════════════════════════════════════════════════════════════
   FUNIL -- de onde vieram os alunos e ate onde chegaram (03/10/2026, NEG-01)

   Le a tabela `funil` (migration 20261003160000) com a chave de servico e
   mostra: quantos fizeram cada etapa (cadastro -> edital -> rotina -> 1a
   sessao), quanto se perde de uma para a outra, e o mesmo por origem.

   USO   node tools/funil.js            (producao; ignora as contas de teste)
         node tools/funil.js --dias 30  (so quem se cadastrou nos ultimos 30 dias)
   So le. Nao gasta nada.
   ═══════════════════════════════════════════════════════════════════════════ */
const { execSync } = require("child_process");
const REF = "jjogmcacbdefwiwcyjxp";
const BASE = `https://${REF}.supabase.co`;
const SK = JSON.parse(execSync(`supabase projects api-keys --project-ref ${REF} -o json`, { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }))
  .find((k) => k.name === "service_role").api_key;
const admin = { apikey: SK, Authorization: `Bearer ${SK}` };
const i = process.argv.indexOf("--dias");
const DIAS = i > 0 ? Number(process.argv[i + 1]) : null;
const ETAPAS = ["cadastro", "edital", "rotina", "primeira_sessao"];
const NOMES = { cadastro: "cadastrou", edital: "subiu o edital", rotina: "respondeu a rotina", primeira_sessao: "1ª sessão de estudo" };

(async () => {
  const linhas = await (await fetch(`${BASE}/rest/v1/funil?select=usuario_id,etapa,criado_em,origem&limit=10000`, { headers: admin })).json();
  const contas = (await (await fetch(`${BASE}/auth/v1/admin/users?per_page=1000`, { headers: admin })).json()).users || [];
  const teste = new Set(contas.filter((u) => /@astral-teste\.local$/i.test(u.email || "")).map((u) => u.id));
  const desde = DIAS ? Date.now() - DIAS * 864e5 : 0;
  const porPessoa = new Map();
  for (const l of linhas) {
    if (teste.has(l.usuario_id)) continue;
    if (!porPessoa.has(l.usuario_id)) porPessoa.set(l.usuario_id, {});
    porPessoa.get(l.usuario_id)[l.etapa] = l;
  }
  const pessoas = [...porPessoa.values()].filter((p) => p.cadastro && Date.parse(p.cadastro.criado_em) >= desde);
  const origemDe = (p) => {
    const o = p.cadastro?.origem || {};
    if (o.antes_do_funil) return "(antes do funil)";
    return o.utm_source || o.ref || (o.direto ? "direto" : "(sem origem)");
  };
  const tabela = (grupo, titulo) => {
    console.log(`\n${titulo} — ${grupo.length} pessoa(s)`);
    let anterior = null;
    for (const e of ETAPAS) {
      const n = grupo.filter((p) => p[e]).length;
      const perda = anterior ? `  (${anterior ? Math.round((n / anterior) * 100) : 0}% da etapa anterior)` : "";
      console.log(`   ${NOMES[e].padEnd(22)} ${String(n).padStart(4)}${perda}`);
      anterior = n || anterior;
    }
  };
  console.log(`\nFUNIL DO ASTRAL${DIAS ? ` — cadastros dos últimos ${DIAS} dias` : ""} (contas de teste fora)`);
  tabela(pessoas, "TODOS");
  const origens = [...new Set(pessoas.map(origemDe))].sort();
  for (const o of origens) tabela(pessoas.filter((p) => origemDe(p) === o), `origem: ${o}`);
})();
