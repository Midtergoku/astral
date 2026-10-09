/* ═══════════════════════════════════════════════════════════════════════════
   TESTA-PAINEL -- o painel do negocio conta certo, so o dono ve, e nao vaza
   nome nem e-mail? (09/10/2026 -- auditoria NEG-04, roadmap 3.17)

     1. FECHADO: visitante e aluno comum sao recusados por painel_de_negocio()
     2. (dev) CONTA CERTO: um administrador de teste le o retrato; uma conta
        "de verdade" nova (dominio que nao e de teste) aumenta contas, novas,
        cadastro e edital em 1; as @astral-teste.local NAO contam
     3. (dev) SO NUMEROS: a resposta nao tem e-mail nem id de aluno
     4. (dev) A TELA: o administrador ve os numeros; a origem maliciosa
        (<img onerror>) aparece como TEXTO; o aluno comum ve "nao e para voce"
   Na producao so a parte 1 (nao ha como ser o Lucas aqui -- e nem se deve).

   USO   node tools/testa-painel.js                 producao (parte 1)
         ASTRAL_DEV=1 node tools/testa-painel.js    astral-dev (1 a 4)
   ═══════════════════════════════════════════════════════════════════════════ */
const { execFileSync } = require("child_process");
const crypto = require("crypto");
const fs = require("fs");
const http = require("http");
const path = require("path");
const { REF, PUB, NO_DEV, chavesDoProjeto, reescrever, onde } = require("./testes/alvo");   // 09/10/2026 (COD-02)
const BASE = `https://${REF}.supabase.co`;
const SK = chavesDoProjeto().find((k) => k.name === "service_role").api_key;
const admin = { apikey: SK, Authorization: `Bearer ${SK}`, "Content-Type": "application/json" };
const TOKEN = execFileSync("powershell", ["-NoProfile", "-File", path.join(__dirname, "token-supabase.ps1")], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
async function sql(query) {
  const r = await fetch(`https://api.supabase.com/v1/projects/${REF}/database/query`, { method: "POST", headers: { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json" }, body: JSON.stringify({ query }) });
  const t = await r.text(); if (!r.ok) throw new Error(`SQL HTTP ${r.status}: ${t.slice(0, 160)}`); return JSON.parse(t);
}
async function req(c, o = {}) { const r = await fetch(BASE + c, o); const t = await r.text(); let corpo = null; try { corpo = JSON.parse(t); } catch { corpo = t; } return { status: r.status, corpo }; }

let falhas = 0;
const ok = (t, d = "") => console.log(`  OK     ${t.padEnd(58)} ${d}`);
const falha = (t, d = "") => { console.log(`  FALHA  ${t.padEnd(58)} ${d}`); falhas++; };
const conferir = (t, c, d = "") => (c ? ok(t, d) : falha(t, d));

const RAIZ = path.resolve(__dirname, "..");
const tipos = { ".html": "text/html", ".css": "text/css", ".js": "text/javascript", ".mjs": "text/javascript", ".woff2": "font/woff2", ".svg": "image/svg+xml", ".png": "image/png", ".ico": "image/x-icon", ".webmanifest": "application/manifest+json" };
const PORTA = 5173;
const servidor = http.createServer((q, r) => {
  const u = decodeURIComponent(q.url.split("?")[0]); const a = path.join(RAIZ, u === "/" ? "index.html" : u);
  if (!path.resolve(a).startsWith(RAIZ) || !fs.existsSync(a) || fs.statSync(a).isDirectory()) { r.writeHead(404); return r.end(); }
  r.writeHead(200, { "Content-Type": tipos[path.extname(a)] || "text/plain" }); r.end(reescrever(a, fs.readFileSync(a)));
});

async function conta(email) {
  const u = await req("/auth/v1/admin/users", { method: "POST", headers: admin, body: JSON.stringify({ email, password: "T!" + crypto.randomUUID() + "a1", email_confirm: true }) });
  const link = await req("/auth/v1/admin/generate_link", { method: "POST", headers: admin, body: JSON.stringify({ type: "magiclink", email }) });
  const s = (await req("/auth/v1/verify", { method: "POST", headers: { apikey: PUB, "Content-Type": "application/json" }, body: JSON.stringify({ type: "magiclink", token_hash: link.corpo.hashed_token }) })).corpo;
  return { id: u.corpo.id, s, cab: { apikey: PUB, Authorization: `Bearer ${s.access_token}`, "Content-Type": "application/json" } };
}
const painel = (cab, dias = 30) => req("/rest/v1/rpc/painel_de_negocio", { method: "POST", headers: cab, body: JSON.stringify({ p_dias: dias }) });

(async () => {
  console.log(`\nTESTA-PAINEL  ${onde}\n`);
  const criadas = [];
  let nav = null, adminId = null;
  try {
    console.log("== 1. FECHADO ==");
    const r1 = await painel({ apikey: PUB, "Content-Type": "application/json" });
    conferir("visitante não lê o painel", r1.status >= 400 && !r1.corpo?.contas, `HTTP ${r1.status}`);
    const aluno = await conta(`painel-aluno-${Date.now()}@astral-teste.local`); criadas.push(aluno.id);
    const r2 = await painel(aluno.cab);
    conferir("🎯 aluno comum é recusado", r2.status >= 400 && !r2.corpo?.contas, `HTTP ${r2.status} ${String(r2.corpo?.message || "").slice(0, 50)}`);
    if (!NO_DEV) { console.log("\n  (partes 2 a 4 só no dev: aqui não se finge ser o dono)"); return; }

    console.log("\n== 2. CONTA CERTO (dev) ==");
    const dono = await conta(`painel-dono-${Date.now()}@astral-teste.local`); criadas.push(dono.id); adminId = dono.id;
    await sql(`insert into public.administradores (usuario_id) values ('${dono.id}') on conflict do nothing`);
    const antes = (await painel(dono.cab)).corpo;
    conferir("o administrador lê o retrato", antes && typeof antes.contas === "number" && antes.funil && Array.isArray(antes.cadastros_por_dia),
      antes ? `contas ${antes.contas} · novas ${antes.novas}` : "nada");
    // uma conta "de verdade" (dominio que nao e de teste), so no dev
    const real = await conta(`painel-real-${Date.now()}@exemplo-astral.dev`); criadas.push(real.id);
    const XSS = '<img src=x onerror="window.__xss=1">';
    await sql(`update public.funil set origem = '${JSON.stringify({ utm_source: XSS }).replace(/'/g, "''")}'::jsonb where usuario_id = '${real.id}' and etapa = 'cadastro'`);
    await sql(`select public.funil_marcar('${real.id}', 'edital')`);
    const depois = (await painel(dono.cab)).corpo;
    conferir("🎯 conta real nova: contas +1 e novas +1", depois.contas === antes.contas + 1 && depois.novas === antes.novas + 1, `${antes.contas}→${depois.contas} · ${antes.novas}→${depois.novas}`);
    conferir("🎯 o funil conta o cadastro e o edital dela", (depois.funil.cadastro || 0) === (antes.funil.cadastro || 0) + 1 && (depois.funil.edital || 0) === (antes.funil.edital || 0) + 1,
      `cadastro ${antes.funil.cadastro || 0}→${depois.funil.cadastro} · edital ${antes.funil.edital || 0}→${depois.funil.edital}`);
    conferir("a origem dela aparece", (depois.origens || []).some((o) => o.origem === XSS));
    conferir("as contas @astral-teste.local NÃO contam", depois.contas === antes.contas + 1, "3 contas de teste criadas, +1 só");

    console.log("\n== 3. SÓ NÚMEROS (dev) ==");
    const txt = JSON.stringify(depois);
    conferir("🎯 nenhum e-mail na resposta", !/@[a-z0-9-]+\.[a-z]/i.test(txt));
    conferir("nenhum id de aluno na resposta", !txt.includes(real.id) && !txt.includes(dono.id) && !txt.includes(aluno.id));

    console.log("\n== 4. A TELA (dev) ==");
    const npx = path.join(process.env.LOCALAPPDATA, "npm-cache", "_npx");
    let pw = null; for (const d of fs.readdirSync(npx)) { const p = path.join(npx, d, "node_modules", "playwright"); if (fs.existsSync(p)) { pw = require(p); break; } }
    if (!pw) throw new Error("playwright nao encontrado");
    await new Promise((r) => servidor.listen(PORTA, r));
    nav = await pw.chromium.launch();
    const abrir = async (quem, largura = 1280) => {
      const ctx = await nav.newContext({ viewport: { width: largura, height: 900 } });
      await ctx.addInitScript(require("./testes/aceite-de-teste.js").SCRIPT);
      await ctx.addInitScript(`localStorage.setItem("sb-${REF}-auth-token", ${JSON.stringify(JSON.stringify({ access_token: quem.s.access_token, refresh_token: quem.s.refresh_token, token_type: "bearer", expires_at: Math.floor(Date.now() / 1000) + 900, user: quem.s.user }))});`);
      const pg = await ctx.newPage();
      const erros = []; pg.on("pageerror", (e) => erros.push(e.message));
      await pg.goto(`http://localhost:${PORTA}/painel.html`, { waitUntil: "load" });
      return { pg, erros, ctx };
    };
    const d = await abrir(dono);
    const viu = await d.pg.waitForSelector(".numeros", { timeout: 25000 }).then(() => true).catch(() => false);
    const texto = viu ? (await d.pg.textContent("#conteudo")).replace(/\s+/g, " ") : "";
    conferir("🎯 o dono vê os números", viu && texto.includes("Contas") && texto.includes(String(depois.contas)), texto.slice(0, 80));
    conferir("🎯 a origem maliciosa aparece como texto", texto.includes("<img src=x") && (await d.pg.evaluate(() => !document.querySelector('img[src="x"]') && !window.__xss)));
    await d.pg.click('[data-dias="7"]'); await d.pg.waitForTimeout(1500);
    conferir("trocar o período funciona", /últimos 7 dias/.test(await d.pg.textContent("#conteudo")));
    d.erros.length ? falha("erro de JavaScript na tela do dono", d.erros[0].slice(0, 80)) : ok("nenhum erro de JavaScript");
    const m = await abrir(dono, 375);
    await m.pg.waitForSelector(".numeros", { timeout: 25000 }).catch(() => null);
    const larg = await m.pg.evaluate(() => document.documentElement.scrollWidth);
    conferir("cabe no celular de 375 px", larg <= 375, `${larg}px`);
    const a = await abrir(aluno);
    const negado = await a.pg.waitForSelector(".negado", { timeout: 25000 }).then(() => true).catch(() => false);
    conferir("🎯 o aluno comum vê \"não é para você\"", negado && !(await a.pg.$(".numeros")));
  } catch (e) {
    falha("o teste quebrou", e.message.slice(0, 140));
  } finally {
    if (nav) await nav.close();
    servidor.close();
    if (adminId) await sql(`delete from public.administradores where usuario_id = '${adminId}'`).catch(() => {});
    for (const id of criadas) await req(`/auth/v1/admin/users/${id}`, { method: "DELETE", headers: admin });
    console.log("\n  (contas de teste apagadas; o administrador de teste saiu)");
    console.log("\n" + "=".repeat(70));
    console.log(falhas === 0 ? "O PAINEL CONTA CERTO, SÓ O DONO VÊ, E SÓ MOSTRA NÚMEROS." : `🔴 ${falhas} FALHA(S).`);
    process.exitCode = falhas ? 1 : 0;
  }
})();
