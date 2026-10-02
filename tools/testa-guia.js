/* ═══════════════════════════════════════════════════════════════════════════
   TESTA-GUIA -- o Guia de estudo (era a aba Recursos) dentro do dashboard.

   POR QUE EXISTE (28/09/2026)
   Pedido dele: os professores e os links das aulas a mostra no dashboard,
   gerados uma vez, sem clicar materia por materia, e sem poluir a tela.

   A IA esta sem credito, entao o teste NAO chama a IA: planta o guia direto
   em `recursos_salvos` (o mesmo lugar onde a geracao grava) e confere a tela.
   E planta DOIS ataques, porque o texto vem da IA e e dado nao confiavel:
   um link "javascript:" e um nome com <img onerror>. Os dois tem de morrer.

   USO   node tools/testa-guia.js [--foto arquivo.png]
   ═══════════════════════════════════════════════════════════════════════════ */

const { execSync } = require("child_process");
const fs = require("fs");
const http = require("http");
const path = require("path");

const REF = "jjogmcacbdefwiwcyjxp";
const BASE = `https://${REF}.supabase.co`;
const RAIZ = path.resolve(__dirname, "..");
const PORTA = 8893;
const FOTO = (() => { const i = process.argv.indexOf("--foto"); return i > 0 ? process.argv[i + 1] : null; })();

function acharPlaywright() {
  try { return require("playwright"); } catch { /* segue */ }
  const base = process.env.LOCALAPPDATA ? path.join(process.env.LOCALAPPDATA, "npm-cache", "_npx") : null;
  if (!base || !fs.existsSync(base)) return null;
  for (const d of fs.readdirSync(base)) {
    const alvo = path.join(base, d, "node_modules", "playwright");
    if (fs.existsSync(alvo)) { try { return require(alvo); } catch { /* proximo */ } }
  }
  return null;
}
const pw = acharPlaywright();
if (!pw) { console.log("TESTA-GUIA -- pulado: playwright nao encontrado."); process.exit(0); }

const chaves = JSON.parse(execSync(`supabase projects api-keys --project-ref ${REF} -o json`, { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }));
const SK = chaves.find((k) => k.name === "service_role").api_key;
const PUB = (fs.readFileSync(path.join(RAIZ, "assets/js/astral.js"), "utf8").match(/sb_publishable_[A-Za-z0-9_-]+/) || [])[0];
const admin = { apikey: SK, Authorization: `Bearer ${SK}`, "Content-Type": "application/json" };
const req = async (c, o) => { const r = await fetch(BASE + c, o); const t = await r.text(); try { return JSON.parse(t); } catch { return null; } };

let falhas = 0;
const ok = (t, d = "") => console.log(`  OK     ${t.padEnd(54)} ${d}`);
const falha = (t, d = "") => { console.log(`  FALHA  ${t.padEnd(54)} ${d}`); falhas++; };

const tipos = { ".html": "text/html", ".css": "text/css", ".js": "text/javascript", ".woff2": "font/woff2", ".svg": "image/svg+xml" };
const srv = http.createServer((q, r) => {
  const u = decodeURIComponent(q.url.split("?")[0]); const arq = path.join(RAIZ, u === "/" ? "/index.html" : u);
  if (!path.resolve(arq).startsWith(RAIZ) || !fs.existsSync(arq) || fs.statSync(arq).isDirectory()) { r.writeHead(404); return r.end(); }
  r.writeHead(200, { "Content-Type": tipos[path.extname(arq)] || "text/plain" }); r.end(fs.readFileSync(arq));
});

const CONCURSO = "Teste Bombeiro Guia";
const MATERIAS = [
  { nome: "Física", peso: 12, progresso: 38 }, { nome: "Química", peso: 10, progresso: 30 },
  { nome: "Português", peso: 20, progresso: 72 },
];
const GUIA = {
  dica: "Dica de TESTE: resolva questões antigas depois de cada bloco de teoria.",
  professores: [
    { nome: "Professor de Teste Um", canal: "Canal de Teste", url: "https://www.youtube.com/@teste", descricao: "Descrição de teste." },
    { nome: "Ataque <img src=x onerror=\"window.__xss=1\">", canal: "Canal Mau", url: "javascript:window.__xss=2", descricao: "texto" },
  ],
  materiais_gratuitos: [{ nome: "Apostila de Teste", tipo: "PDF", url: "https://exemplo.com/apostila.pdf", descricao: "Material de teste." }],
  cursos_pagos: [{ nome: "Curso de Teste", plataforma: "Plataforma X", url: "https://exemplo.com/curso", descricao: "Curso de teste." }],
};

(async () => {
  const email = `guia-${Date.now()}@astral-teste.local`;
  const u = await req("/auth/v1/admin/users", { method: "POST", headers: admin, body: JSON.stringify({ email, password: "T!" + crypto.randomUUID(), email_confirm: true }) });
  await new Promise((r) => srv.listen(PORTA, r));
  let nav = null;
  try {
    console.log("\nTESTA-GUIA -- o Guia de estudo no dashboard\n");
    await req("/rest/v1/progresso", { method: "POST", headers: { ...admin, Prefer: "return=minimal" },
      body: JSON.stringify({ usuario_id: u.id, materias: MATERIAS, edital: { nome: CONCURSO },
        rotina: { dias: [0, 1, 2, 3, 4, 5, 6], minutosUtil: 40, minutosFds: 40, bloco: 40 } }) });
    const link = await req("/auth/v1/admin/generate_link", { method: "POST", headers: admin, body: JSON.stringify({ type: "magiclink", email }) });
    const s = await req("/auth/v1/verify", { method: "POST", headers: { apikey: PUB, "Content-Type": "application/json" }, body: JSON.stringify({ type: "magiclink", token_hash: link.hashed_token }) });
    nav = await pw.chromium.launch();
    const ctx = await nav.newContext({ viewport: { width: 1440, height: 1000 } });
    await ctx.addInitScript(require("./testes/aceite-de-teste.js").SCRIPT);   // 02/10/2026: o aceite (LGL-01)
    await ctx.addInitScript(`localStorage.setItem("sb-${REF}-auth-token", ${JSON.stringify(JSON.stringify({ access_token: s.access_token, refresh_token: s.refresh_token, token_type: "bearer", expires_at: Math.floor(Date.now() / 1000) + 3600, user: s.user }))});`);
    const pg = await ctx.newPage();
    const erros = []; pg.on("pageerror", (e) => erros.push(e.message));
    /* A geracao de verdade chamaria a IA (e gastaria). Aqui ela e cortada na
       rede -- o teste e da TELA, nao da busca. */
    await pg.route("**/functions/v1/buscar-recursos", (r) => r.fulfill({ status: 402, contentType: "application/json", body: '{"error":"sem credito (teste)"}' }));
    const abrir = async () => { await pg.goto(`http://localhost:${PORTA}/dashboard.html`, { waitUntil: "load" }); await pg.waitForTimeout(4500); };

    // 1. Sem guia ainda: o cartao explica, em vez de ficar vazio.
    await abrir();
    const vazio = await pg.evaluate(() => ({ visivel: !document.getElementById("guia").hidden, texto: document.getElementById("guia-painel").textContent }));
    vazio.visivel && /ainda não foi montado/.test(vazio.texto)
      ? ok("sem guia: o cartão diz que ainda não foi montado") : falha("estado vazio", JSON.stringify(vazio).slice(0, 90));

    // 2. Com guia para Fisica.
    await req("/rest/v1/recursos_salvos", { method: "POST", headers: { ...admin, Prefer: "return=minimal" },
      body: JSON.stringify({ usuario_id: u.id, materia: "Física", concurso: CONCURSO, dados: GUIA }) });
    await abrir();
    if (FOTO) await pg.screenshot({ path: FOTO, fullPage: true });
    const t = await pg.evaluate(() => ({
      chips: [...document.querySelectorAll(".guia-chip")].map((c) => ({ n: c.dataset.materia, on: !c.disabled, sel: c.getAttribute("aria-selected") })),
      profs: [...document.querySelectorAll(".guia-prof-nome")].map((e) => e.textContent),
      hrefs: [...document.querySelectorAll("#guia a")].map((a) => a.getAttribute("href")),
      xss: window.__xss || 0,
      imgs: document.querySelectorAll("#guia img").length,
      status: document.getElementById("guia-status").textContent,
    }));
    t.chips.length === 3 ? ok("uma aba por matéria do edital", t.chips.map((c) => c.n).join(", ")) : falha("abas", JSON.stringify(t.chips));
    const fis = t.chips.find((c) => c.n === "Física");
    fis?.on && fis.sel === "true" ? ok("a matéria com guia vem escolhida", t.status) : falha("seleção", JSON.stringify(t.chips));
    t.chips.filter((c) => !c.on).length === 2 ? ok("as sem guia aparecem como 'em preparo'") : falha("abas sem guia deveriam estar desligadas");
    t.profs.includes("Professor de Teste Um") ? ok("os professores aparecem, sem clique nenhum") : falha("professores", t.profs.join("|"));
    t.hrefs.some((h) => /youtube\.com\/results\?search_query=/.test(h || ""))
      ? ok("🎯 link de aulas no YouTube que nunca quebra", "é uma busca, não um endereço inventado") : falha("sem link de busca do YouTube");
    !t.hrefs.some((h) => /^javascript:/i.test(h || "")) ? ok("🎯 link javascript: da IA foi barrado") : falha("🚨 link javascript: chegou à tela");
    t.xss === 0 && t.imgs === 0 ? ok("🎯 nome com <img onerror> virou texto, não código") : falha("🚨 XSS executou", `xss=${t.xss} imgs=${t.imgs}`);

    // 3. Guia de OUTRO concurso nao aparece (trocou de edital).
    await req(`/rest/v1/recursos_salvos?usuario_id=eq.${u.id}`, { method: "PATCH", headers: { ...admin, Prefer: "return=minimal" }, body: JSON.stringify({ concurso: "Outro concurso" }) });
    await abrir();
    const velho = await pg.textContent("#guia-painel");
    /ainda não foi montado/.test(velho) ? ok("guia de outro edital não aparece") : falha("mostrou guia de outro concurso");

    erros.length ? falha("erro de JavaScript", erros[0].slice(0, 80)) : ok("nenhum erro de JavaScript");
  } catch (e) {
    falha("erro no teste: " + e.message);
  } finally {
    if (nav) await nav.close();
    srv.close();
    await fetch(`${BASE}/auth/v1/admin/users/${u.id}`, { method: "DELETE", headers: admin });
    console.log("\n  (conta de teste apagada)");
  }
  console.log("\n" + "=".repeat(70));
  console.log(falhas ? `🔴 ${falhas} FALHA(S).` : "O GUIA ESTÁ NO DASHBOARD, À MOSTRA, E O QUE VEM DA IA NÃO VIRA CÓDIGO.");
  process.exit(falhas ? 1 : 0);
})();
