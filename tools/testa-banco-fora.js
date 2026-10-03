/* ═══════════════════════════════════════════════════════════════════════════
   TESTA-BANCO-FORA -- com o banco fora do ar, a tela mente?
   (03/10/2026 -- auditoria UX-01, roadmap 3.2)

   A auditoria simulou o banco respondendo 503 para uma conta com 45 dias
   seguidos: o painel mostrou "0 dias, Recruta, 0h" como se fosse real, o
   topo dizia "RECRUTA sem tag", e se a pessoa marcasse uma sessao o vazio
   seria SALVO por cima do verdadeiro.

   Aqui:
     1. CONTROLE -- banco no ar: a patente real aparece (prova que o teste
        enxerga a tela; sem isto, "nao vi Recruta" passaria por tela vazia)
     2. banco fora, navegador sem copia: o painel avisa, nao mostra zero
        nem patente inventada, e o topo fica em branco
     3. o progresso tambem avisa, sem materias zeradas
     4. salvarProgresso RECUSA gravar o vazio (nenhum POST sai)

   O banco "fora" e simulado no navegador (rota interceptada, 503). A
   biblioteca do Supabase tenta de novo varias vezes antes de desistir --
   medido: o aviso leva ~10 s para aparecer. Por isso a espera e longa.

   USO   node tools/testa-banco-fora.js     (producao; nao gasta credito)
   ═══════════════════════════════════════════════════════════════════════════ */
const { execSync } = require("child_process");
const fs = require("fs");
const http = require("http");
const path = require("path");

const REF = "jjogmcacbdefwiwcyjxp";
const BASE = `https://${REF}.supabase.co`;
const RAIZ = process.env.ASTRAL_RAIZ ? path.resolve(process.env.ASTRAL_RAIZ) : path.resolve(__dirname, "..");
const SK = JSON.parse(execSync(`supabase projects api-keys --project-ref ${REF} -o json`, { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }))
  .find((k) => k.name === "service_role").api_key;
const PUB = (fs.readFileSync(path.join(RAIZ, "assets/js/astral.js"), "utf8").match(/sb_publishable_[A-Za-z0-9_-]+/) || [])[0];
const admin = { apikey: SK, Authorization: `Bearer ${SK}`, "Content-Type": "application/json" };
async function req(c, o = {}) { const r = await fetch(BASE + c, o); const t = await r.text(); let corpo = null; try { corpo = JSON.parse(t); } catch { corpo = t; } return { status: r.status, corpo }; }

let falhas = 0;
const ok = (t, d = "") => console.log(`  OK     ${t.padEnd(62)} ${d}`);
const falha = (t, d = "") => { console.log(`  FALHA  ${t.padEnd(62)} ${d}`); falhas++; };

const tipos = { ".html": "text/html", ".css": "text/css", ".js": "text/javascript", ".woff2": "font/woff2", ".svg": "image/svg+xml" };
const PORTA = 5181;
const servidor = http.createServer((q, r) => {
  const u = decodeURIComponent(q.url.split("?")[0]); const a = path.join(RAIZ, u === "/" ? "index.html" : u);
  if (!fs.existsSync(a) || fs.statSync(a).isDirectory()) { r.writeHead(404); return r.end(); }
  r.writeHead(200, { "Content-Type": tipos[path.extname(a)] || "text/plain" }); r.end(fs.readFileSync(a));
});

(async () => {
  const npx = path.join(process.env.LOCALAPPDATA, "npm-cache", "_npx");
  let pw = null; for (const d of fs.readdirSync(npx)) { const p = path.join(npx, d, "node_modules", "playwright"); if (fs.existsSync(p)) { pw = require(p); break; } }
  if (!pw) { console.log("playwright nao encontrado"); process.exit(0); }

  const email = `banco-fora-${Date.now()}@astral-teste.local`;
  const u = await req("/auth/v1/admin/users", { method: "POST", headers: admin, body: JSON.stringify({ email, password: "T!" + crypto.randomUUID(), email_confirm: true }) });
  const link = await req("/auth/v1/admin/generate_link", { method: "POST", headers: admin, body: JSON.stringify({ type: "magiclink", email }) });
  const s = (await req("/auth/v1/verify", { method: "POST", headers: { apikey: PUB, "Content-Type": "application/json" }, body: JSON.stringify({ type: "magiclink", token_hash: link.corpo.hashed_token }) })).corpo;
  // O XP e calculado pelo SERVIDOR a partir das sessoes (p_xp e ignorado):
  // a conta e Recruta de verdade. O controle confere que a tela desenha o
  // que existe; o teste com o banco fora confere que ela NAO desenha nada.
  await req("/rest/v1/rpc/salvar_progresso", { method: "POST", headers: { apikey: PUB, Authorization: `Bearer ${s.access_token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ p_xp: 0, p_streak: 0, p_horas: 0, p_edital: { nome: "Teste Banco Fora" }, p_materias: [{ nome: "Física", peso: 2, progresso: 0 }], p_cronograma_hoje: [], p_badges: [], p_tag_escolhida: null }) });

  await new Promise((r) => servidor.listen(PORTA, r));
  const nav = await pw.chromium.launch();

  async function abrir(pagina, { fora }) {
    const ctx = await nav.newContext({ viewport: { width: 1280, height: 900 } });
    await ctx.addInitScript(require("./testes/aceite-de-teste.js").SCRIPT);
    await ctx.addInitScript(`localStorage.setItem("sb-${REF}-auth-token", ${JSON.stringify(JSON.stringify({ access_token: s.access_token, refresh_token: s.refresh_token, token_type: "bearer", expires_at: Math.floor(Date.now() / 1000) + 7200, user: s.user }))});`);
    const gravacoes = [];
    if (fora) {
      await ctx.route(/supabase\.co\/rest\/v1\//, (r) => {
        if (/salvar_progresso/.test(r.request().url())) gravacoes.push(r.request().postData());
        r.fulfill({ status: 503, contentType: "application/json", body: JSON.stringify({ message: "upstream connect error" }) });
      });
    }
    const pg = await ctx.newPage();
    const erros = []; pg.on("pageerror", (e) => erros.push(e.message));
    await pg.goto(`http://localhost:${PORTA}/${pagina}`, { waitUntil: "load" });
    return { ctx, pg, gravacoes, erros };
  }
  const divisa = (pg) => pg.evaluate(() => [...document.querySelectorAll("[data-divisa]")].map((e) => e.textContent.trim()).join(" | "));
  const txt = (pg, id) => pg.evaluate((i) => document.getElementById(i)?.textContent.trim(), id);

  try {
    console.log(`\nTESTA-BANCO-FORA  usuario ${u.corpo.id.slice(0, 8)}\n`);

    // ── 1. CONTROLE ───────────────────────────────────────────────────────
    {
      const { ctx, pg } = await abrir("dashboard.html", { fora: false });
      await pg.waitForFunction(() => document.getElementById("nivel-nome")?.textContent.trim() !== "—", null, { timeout: 30000 }).catch(() => {});
      const nivel = await txt(pg, "nivel-nome");
      await pg.waitForTimeout(1500);
      const topo = await divisa(pg);
      if (nivel && nivel !== "—") ok("controle: banco no ar, a patente real aparece", nivel);
      else falha("controle: a patente real não apareceu", String(nivel));
      if (topo) ok("controle: o topo mostra a divisa real", topo.slice(0, 40));
      else falha("controle: o topo não mostrou a divisa real", topo);
      await ctx.close();
    }

    // ── 2. PAINEL com o banco fora ───────────────────────────────────────
    {
      const { ctx, pg, gravacoes, erros } = await abrir("dashboard.html", { fora: true });
      // enquanto carrega: nada de valor inventado
      await pg.waitForTimeout(1500);
      const cedo = { nivel: await txt(pg, "nivel-nome"), rank: await txt(pg, "proximo-rank"), dias: await txt(pg, "streak-count"), horas: await txt(pg, "horas-total") };
      const inventado = Object.entries(cedo).filter(([, v]) => v && v !== "—");
      if (!inventado.length) ok("carregando: só \"—\", nenhum número inventado", JSON.stringify(cedo));
      else falha("carregando: valor inventado na tela", JSON.stringify(inventado));

      const avisou = await pg.waitForFunction(() => document.getElementById("falha-de-carga")?.hidden === false, null, { timeout: 45000 }).then(() => true).catch(() => false);
      if (avisou) ok("o painel AVISA que não conseguiu carregar");
      else falha("o painel não avisou da falha (45 s)");
      const depois = { nivel: await txt(pg, "nivel-nome"), rank: await txt(pg, "proximo-rank"), dias: await txt(pg, "streak-count"), horas: await txt(pg, "horas-total") };
      const zeros = Object.entries(depois).filter(([, v]) => v && v !== "—");
      if (!zeros.length) ok("com a falha: nenhum \"0 dias / Recruta / 0h\"", JSON.stringify(depois));
      else falha("com a falha: a tela mostrou valor falso", JSON.stringify(zeros));
      const topo = await divisa(pg);
      if (topo === "") ok("o topo fica em branco (não inventa patente)", JSON.stringify(topo));
      else falha("o topo inventou a patente", topo);

      // ── 4. salvar o vazio por cima do verdadeiro ──
      const carimbo = (fs.readFileSync(path.join(RAIZ, "dashboard.html"), "utf8").match(/assets\/js\/estado\.js\?v=[0-9a-f]+/) || [])[0];
      await pg.evaluate(async ([c, uid]) => {
        const m = await import("./" + c);
        await m.salvarProgresso(uid, { xp: 0, streak: 0, horas: 0, materias: [], cronogramaHoje: [], edital: null, badges: [] });
      }, [carimbo, u.corpo.id]);
      await pg.waitForTimeout(1500);
      if (gravacoes.length === 0) ok("salvarProgresso RECUSA gravar o vazio", "0 POST");
      else falha("🚨 o vazio foi mandado gravar", `${gravacoes.length} POST`);
      if (erros.length) falha("erro de JavaScript na página", erros[0].slice(0, 80));
      await ctx.close();
    }

    // ── 3. PROGRESSO com o banco fora ────────────────────────────────────
    {
      const { ctx, pg } = await abrir("progresso.html", { fora: true });
      const avisou = await pg.waitForFunction(() => /Não consegui carregar os seus dados/.test(document.getElementById("content-area")?.textContent || ""), null, { timeout: 45000 }).then(() => true).catch(() => false);
      if (avisou) ok("o progresso AVISA que não conseguiu carregar");
      else falha("o progresso não avisou da falha (45 s)");
      const topo = await divisa(pg);
      if (topo === "") ok("o topo do progresso fica em branco", JSON.stringify(topo));
      else falha("o topo do progresso inventou a patente", topo);
      await ctx.close();
    }
  } finally {
    await nav.close(); servidor.close();
    await req(`/auth/v1/admin/users/${u.corpo.id}`, { method: "DELETE", headers: admin });
    console.log("\n  (usuário de teste apagado)");
    console.log("\n" + "=".repeat(70));
    console.log(falhas === 0 ? "COM O BANCO FORA, A TELA DIZ A VERDADE." : `🔴 ${falhas} FALHA(S).`);
    process.exit(falhas ? 1 : 0);
  }
})();
