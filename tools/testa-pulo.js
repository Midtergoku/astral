// TESTA-PULO -- a tela "pula" ao abrir? (10/10/2026)
//
// Ele: "de Minhas tags ate Questoes as paginas dao esse pulo; de Cronograma ate o Dashboard e liso".
// Medido com conta real: Conquistas pulava 0,31 (a sala de condecoracoes aparecia pronta ACIMA das
// habilidades e as empurrava para fora da tela), o painel 0,09, e em quase toda tela o pe do menu descia
// 42px quando o botao de recolher chegava. E 6 telas sem o transicao.js (corte seco -- o verifica pega).
//
// Aqui: cada tela com barra lateral, com conta real no astral-dev (edital, sessoes, rotina), mede o
// deslocamento (CLS) da 2a visita -- a de quem ja esta navegando. REPROVA acima de 0,05 (o Google
// considera "bom" ate 0,1; aqui a regua e mais dura porque o objetivo e "nao se mexe").
//   node tools/testa-pulo.js [paginas]     (so no astral-dev; cria e apaga a conta)
process.env.ASTRAL_DEV = "1";
const fs = require("fs"), path = require("path"), http = require("http"), crypto = require("crypto");
const R = path.resolve(__dirname, "..");
const { REF, PUB, reescrever, chavesDoProjeto } = require("./testes/alvo");
const BASE = `https://${REF}.supabase.co`;
const SK = chavesDoProjeto().find((k) => k.name === "service_role").api_key;
const admin = { apikey: SK, Authorization: `Bearer ${SK}`, "Content-Type": "application/json" };
async function req(c, o = {}) { const r = await fetch(BASE + c, o); const t = await r.text(); let corpo = null; try { corpo = JSON.parse(t); } catch { corpo = t; } return { status: r.status, corpo }; }
const tipos = { ".html": "text/html", ".css": "text/css", ".js": "text/javascript", ".mjs": "text/javascript", ".woff2": "font/woff2", ".svg": "image/svg+xml", ".png": "image/png", ".ico": "image/x-icon", ".webmanifest": "application/manifest+json" };
const PORTA = 8977;
const srv = http.createServer((q, r) => {
  const u = decodeURIComponent(q.url.split("?")[0]); const a = path.join(R, u === "/" ? "index.html" : u);
  if (!path.resolve(a).startsWith(R) || !fs.existsSync(a) || fs.statSync(a).isDirectory()) { r.writeHead(404); return r.end(); }
  r.writeHead(200, { "Content-Type": tipos[path.extname(a)] || "text/plain" }); r.end(reescrever(a, fs.readFileSync(a)));
});
let pw = null; try { pw = require("playwright"); } catch { /* cache do npx */ }
const npx = path.join(process.env.LOCALAPPDATA || "", "npm-cache", "_npx");
if (!pw && fs.existsSync(npx)) for (const d of fs.readdirSync(npx)) { const a = path.join(npx, d, "node_modules", "playwright"); if (fs.existsSync(a)) { pw = require(a); break; } }
const PAGINAS = process.argv.slice(2).length ? process.argv.slice(2).map((p) => p.replace(/\.html$/, ""))
  : fs.readdirSync(R).filter((f) => f.endsWith(".html") && /class="sidebar/.test(fs.readFileSync(path.join(R, f), "utf8"))).map((f) => f.replace(".html", "")).sort();
const LIMITE = 0.05;
let falhas = 0;

(async () => {
  console.log(`\nTESTA-PULO  astral-dev, ${PAGINAS.length} telas, limite ${LIMITE}\n`);
  let uid = null, nav = null;
  try {
    if (!pw) throw new Error("playwright nao encontrado (npx --yes playwright install chromium)");
    const email = `pulo-${Date.now()}@astral-teste.local`;
    uid = (await req("/auth/v1/admin/users", { method: "POST", headers: admin, body: JSON.stringify({ email, password: "T!" + crypto.randomUUID() + "a1", email_confirm: true }) })).corpo.id;
    const link = await req("/auth/v1/admin/generate_link", { method: "POST", headers: admin, body: JSON.stringify({ type: "magiclink", email }) });
    const s = (await req("/auth/v1/verify", { method: "POST", headers: { apikey: PUB, "Content-Type": "application/json" }, body: JSON.stringify({ type: "magiclink", token_hash: link.corpo.hashed_token }) })).corpo;
    const cab = { apikey: PUB, Authorization: `Bearer ${s.access_token}`, "Content-Type": "application/json" };
    const MAT = [["Português", 20], ["Matemática", 15], ["Física", 12], ["Química", 10]].map(([nome, peso]) => ({ nome, peso, questoes: peso, progresso: 0 }));
    await req("/rest/v1/sessoes_estudo", { method: "POST", headers: { ...admin, Prefer: "return=minimal" }, body: JSON.stringify([0, 1, 2].map((d) => ({ usuario_id: uid, materia: "Português", segundos: 2400, xp: 80, modo: "pomodoro", criado_em: new Date(Date.now() - d * 86400e3 - 3600e3).toISOString() }))) });
    await req("/rest/v1/rpc/salvar_progresso", { method: "POST", headers: cab, body: JSON.stringify({ p_xp: 0, p_streak: 0, p_horas: 0, p_edital: { nome: "CBMERJ Soldado 2026", forca: "bombeiros", patenteInicial: null, dataProva: "06/12/2026" }, p_materias: MAT, p_cronograma_hoje: [], p_badges: [], p_tag_escolhida: null }) });
    await req(`/rest/v1/progresso?usuario_id=eq.${uid}`, { method: "PATCH", headers: { ...admin, Prefer: "return=minimal" }, body: JSON.stringify({ rotina: { dias: [1, 2, 3, 4, 5, 6], minutosUtil: 120, minutosFds: 120, bloco: 40, respondidoEm: new Date().toISOString() } }) });
    await req("/rest/v1/rpc/sincronizar_conquistas", { method: "POST", headers: cab, body: "{}" });
    await new Promise((r) => srv.listen(PORTA, r));
    nav = await pw.chromium.launch();
    const ctx = await nav.newContext({ viewport: { width: 1280, height: 800 } });
    await ctx.addInitScript(require("./testes/aceite-de-teste.js").SCRIPT);
    await ctx.addInitScript(`localStorage.setItem("sb-${REF}-auth-token", ${JSON.stringify(JSON.stringify({ access_token: s.access_token, refresh_token: s.refresh_token, token_type: "bearer", expires_at: Math.floor(Date.now() / 1000) + 900, user: s.user }))});`);
    await ctx.addInitScript(() => {
      window.__cls = 0; window.__quem = {};
      new PerformanceObserver((l) => {
        for (const e of l.getEntries()) {
          if (e.hadRecentInput) continue;
          window.__cls += e.value;
          for (const src of e.sources || []) {
            const cad = [];
            for (let el = src.node; el && el !== document.body && cad.length < 4; el = el.parentElement) cad.push(el.id ? "#" + el.id : el.tagName.toLowerCase() + (el.className ? "." + String(el.className).split(" ")[0] : ""));
            const nome = `${cad.reverse().join(">") || "?"} [${Math.round(src.previousRect.y)}->${Math.round(src.currentRect.y)}]`;
            window.__quem[nome] = (window.__quem[nome] || 0) + e.value;
          }
        }
      }).observe({ type: "layout-shift", buffered: true });
    });
    // o guia de professores e IA paga: responde "sem credito" antes de sair do navegador
    await ctx.route("**/functions/v1/buscar-recursos", (r) => r.fulfill({ status: 402, contentType: "application/json", body: '{"error":"sem credito"}' }));
    const pg = await ctx.newPage();
    for (const p of PAGINAS) {
      // 1a visita aquece o cache; a 2a e a medida -- como quem ja esta navegando pelo menu
      await pg.goto(`http://localhost:${PORTA}/${p}.html`, { waitUntil: "load" }); await pg.waitForTimeout(1500);
      await pg.goto(`http://localhost:${PORTA}/${p}.html`, { waitUntil: "load" }); await pg.waitForTimeout(3500);
      const m = await pg.evaluate(() => ({ cls: window.__cls, quem: Object.entries(window.__quem).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([k, v]) => `${k} ${v.toFixed(3)}`).join(", ") }));
      const ruim = m.cls > LIMITE; if (ruim) falhas++;
      console.log(`  ${ruim ? "FALHA" : "OK   "}  ${p.padEnd(14)} ${m.cls.toFixed(3)}  ${ruim ? m.quem : ""}`);
    }
  } catch (e) {
    console.log("  FALHA  o teste quebrou:", e.message.slice(0, 160)); falhas++;
  } finally {
    if (nav) await nav.close();
    srv.close();
    if (uid) await req(`/auth/v1/admin/users/${uid}`, { method: "DELETE", headers: admin });
    console.log("\n" + "=".repeat(70));
    console.log(falhas ? `🔴 ${falhas} TELA(S) PULAM AO ABRIR.` : "NENHUMA TELA PULA AO ABRIR.");
    process.exitCode = falhas ? 1 : 0;
  }
})();
