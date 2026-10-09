/* ═══════════════════════════════════════════════════════════════════════════
   TESTA-VIGIA -- o alerta da operacao funciona, e so o servidor o ve?
   (09/10/2026 -- auditoria OPS-03, roadmap 3.15)

   1. FECHADO: aluno e visitante nao leem saude_operacao nem falhas_servidor;
      a funcao vigia recusa quem nao tem o segredo.
   2. LIGADO: o despertador (cron 'astral-vigia') existe e o cofre esta
      preenchido (so a CONTAGEM dos nomes -- o segredo nunca e lido aqui).
   3. (so no dev) A FALHA E ANOTADA: uma leitura de edital que falha de
      verdade (o dev nao tem chave da IA -- custo zero) vira linha em
      falhas_servidor; 5 falhas viram o alerta "funcoes"; o despertador chama
      o vigia e ele responde com o alerta (no dev, sem e-mail, de proposito).
      Na producao a parte 3 NAO roda: plantaria falha falsa e mandaria e-mail.

   USO   node tools/testa-vigia.js              producao (partes 1 e 2)
         ASTRAL_DEV=1 node tools/testa-vigia.js astral-dev (1, 2 e 3)
   ═══════════════════════════════════════════════════════════════════════════ */
const { execSync, execFileSync } = require("child_process");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

const NO_DEV = process.env.ASTRAL_DEV === "1";
const REF = NO_DEV ? "vtluuezwfpqgryixaaea" : "jjogmcacbdefwiwcyjxp";
const BASE = `https://${REF}.supabase.co`;
const CHAVES = JSON.parse(execSync(`supabase projects api-keys --project-ref ${REF} -o json`, { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }));
const SK = CHAVES.find((k) => k.name === "service_role").api_key;
const PUB = NO_DEV ? (CHAVES.find((k) => k.type === "publishable") || CHAVES.find((k) => k.name === "anon")).api_key
  : (fs.readFileSync(path.join(__dirname, "..", "assets/js/astral.js"), "utf8").match(/sb_publishable_[A-Za-z0-9_-]+/) || [])[0];
const admin = { apikey: SK, Authorization: `Bearer ${SK}`, "Content-Type": "application/json" };
const TOKEN = execFileSync("powershell", ["-NoProfile", "-File", path.join(__dirname, "token-supabase.ps1")], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
async function sql(query) {
  const r = await fetch(`https://api.supabase.com/v1/projects/${REF}/database/query`, { method: "POST", headers: { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json" }, body: JSON.stringify({ query }) });
  const t = await r.text(); if (!r.ok) throw new Error(`SQL HTTP ${r.status}: ${t.slice(0, 160)}`); return JSON.parse(t);
}
async function req(c, o = {}) { const r = await fetch(BASE + c, o); const t = await r.text(); let corpo = null; try { corpo = JSON.parse(t); } catch { corpo = t; } return { status: r.status, corpo }; }
const espera = (ms) => new Promise((r) => setTimeout(r, ms));

let falhas = 0;
const ok = (t, d = "") => console.log(`  OK     ${t.padEnd(58)} ${d}`);
const falha = (t, d = "") => { console.log(`  FALHA  ${t.padEnd(58)} ${d}`); falhas++; };
const conferir = (t, c, d = "") => (c ? ok(t, d) : falha(t, d));

(async () => {
  let uid = null;
  const plantadas = [];
  console.log(`\nTESTA-VIGIA  ${NO_DEV ? "astral-dev" : "producao"}\n`);
  try {
    console.log("== 1. FECHADO ==");
    const anon = { apikey: PUB, "Content-Type": "application/json" };
    const r1 = await req("/rest/v1/rpc/saude_operacao", { method: "POST", headers: anon, body: "{}" });
    conferir("visitante não lê saude_operacao", r1.status >= 400 && !r1.corpo?.alertas, `HTTP ${r1.status}`);
    const r2 = await req("/rest/v1/falhas_servidor?select=*", { headers: anon });
    conferir("visitante não lê falhas_servidor", r2.status >= 400 || (Array.isArray(r2.corpo) && r2.corpo.length === 0), `HTTP ${r2.status}`);

    // um aluno de verdade tambem nao
    const email = `vigia-${Date.now()}@astral-teste.local`;
    const u = await req("/auth/v1/admin/users", { method: "POST", headers: admin, body: JSON.stringify({ email, password: "T!" + crypto.randomUUID(), email_confirm: true }) });
    uid = u.corpo.id;
    const link = await req("/auth/v1/admin/generate_link", { method: "POST", headers: admin, body: JSON.stringify({ type: "magiclink", email }) });
    const s = (await req("/auth/v1/verify", { method: "POST", headers: { apikey: PUB, "Content-Type": "application/json" }, body: JSON.stringify({ type: "magiclink", token_hash: link.corpo.hashed_token }) })).corpo;
    const aluno = { apikey: PUB, Authorization: `Bearer ${s.access_token}`, "Content-Type": "application/json" };
    const r3 = await req("/rest/v1/rpc/saude_operacao", { method: "POST", headers: aluno, body: "{}" });
    conferir("aluno logado não lê saude_operacao", r3.status >= 400 && !r3.corpo?.alertas, `HTTP ${r3.status}`);
    const r3b = await req("/rest/v1/rpc/chamar_vigia", { method: "POST", headers: aluno, body: "{}" });
    conferir("aluno logado não aciona o vigia", r3b.status >= 400, `HTTP ${r3b.status}`);
    const r4 = await req("/functions/v1/vigia", { method: "POST", headers: { "Content-Type": "application/json", "x-astral-vigia": "chute" }, body: "{}" });
    conferir("🎯 a função vigia recusa quem não tem o segredo", r4.status === 401 && !r4.corpo?.alertas, `HTTP ${r4.status}`);

    console.log("\n== 2. LIGADO ==");
    const cron = await sql("select schedule, active from cron.job where jobname = 'astral-vigia'");
    conferir("🎯 o despertador de hora em hora existe e está ativo", cron.length === 1 && cron[0].active, cron[0] ? cron[0].schedule : "não existe");
    const cofre = await sql("select count(*)::int n from vault.secrets where name in ('astral_vigia_url', 'astral_vigia_segredo')");
    conferir("o cofre tem o endereço e o segredo", cofre[0].n === 2, `${cofre[0].n} de 2 (rode tools/liga-vigia.js --projeto ${REF})`);
    const saude = (await req("/rest/v1/rpc/saude_operacao", { method: "POST", headers: admin, body: "{}" })).corpo;
    conferir("saude_operacao responde os números", saude && typeof saude.banco_mb === "number" && Array.isArray(saude.alertas) && saude.ia,
      saude ? `banco ${saude.banco_mb} MB · ${saude.alertas.length} alerta(s)` : "nada");

    if (!NO_DEV) { console.log("\n  (parte 3 só no dev: plantaria falha falsa e mandaria e-mail de verdade)"); return; }

    console.log("\n== 3. A FALHA É ANOTADA, E VIRA ALERTA (dev) ==");
    const antes = (await sql("select count(*)::int n from public.falhas_servidor where funcao = 'processar-edital'"))[0].n;
    // PDF minimo e valido: passa nas conferencias e chega na IA -- que no dev nao tem chave
    const pdf = Buffer.from(`%PDF-1.4\n% vigia-${Date.now()}\n1 0 obj << /Type /Pages /Count 1 >> endobj\n%%EOF\n`).toString("base64");
    const r5 = await req("/functions/v1/processar-edital", { method: "POST", headers: aluno, body: JSON.stringify({ pdfBase64: pdf }) });
    const depois = (await sql("select count(*)::int n from public.falhas_servidor where funcao = 'processar-edital'"))[0].n;
    conferir("🎯 a leitura que falhou foi anotada para o vigia", r5.status >= 500 && depois === antes + 1, `HTTP ${r5.status} · ${antes} → ${depois}`);
    const semPessoal = await sql("select count(*)::int n from information_schema.columns where table_name = 'falhas_servidor' and column_name in ('usuario_id', 'mensagem', 'ip')");
    conferir("a anotação não guarda quem nem o quê (sem dado pessoal)", semPessoal[0].n === 0);

    // 5 falhas -> alerta "funcoes" (as de teste sao apagadas no fim)
    const ids = await sql("insert into public.falhas_servidor (funcao, status, tipo) select 'teste-vigia', 500, 'erro' from generate_series(1, 5) returning id");
    plantadas.push(...ids.map((x) => x.id));
    const s2 = (await req("/rest/v1/rpc/saude_operacao", { method: "POST", headers: admin, body: "{}" })).corpo;
    conferir("🎯 5 falhas em 24 h viram o alerta", (s2.alertas || []).some((a) => a.tipo === "funcoes"), (s2.alertas || []).map((a) => a.tipo).join(", "));
    await sql("delete from public.vigia_alertas where tipo = 'funcoes'");
    const [{ id }] = await sql("select public.chamar_vigia() as id");
    let resp = null;
    for (let k = 0; k < 20 && !resp; k++) { await espera(1500); const r = await sql(`select status_code, content::text c from net._http_response where id = ${Number(id)}`); if (r.length) resp = r[0]; }
    const corpo = resp ? JSON.parse(resp.c || "{}") : {};
    conferir("🎯 o despertador chama o vigia e ele vê o alerta", resp?.status_code === 200 && (corpo.tipos || []).includes("funcoes"),
      resp ? `HTTP ${resp.status_code} ${resp.c.slice(0, 80)}` : "sem resposta");
  } catch (e) {
    falha("o teste quebrou", e.message.slice(0, 140));
  } finally {
    if (plantadas.length) await sql(`delete from public.falhas_servidor where id in (${plantadas.map(Number).join(",")})`).catch(() => {});
    if (NO_DEV) await sql("delete from public.vigia_alertas where tipo = 'funcoes'").catch(() => {});
    if (uid) await req(`/auth/v1/admin/users/${uid}`, { method: "DELETE", headers: admin });
    console.log("\n  (conta de teste e falhas plantadas apagadas)");
    console.log("\n" + "=".repeat(70));
    console.log(falhas === 0 ? "O VIGIA VÊ GASTO, BANCO E FALHAS — E SÓ O SERVIDOR VÊ O VIGIA." : `🔴 ${falhas} FALHA(S).`);
    process.exit(falhas ? 1 : 0);
  }
})();
