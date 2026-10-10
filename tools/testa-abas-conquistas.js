/* ═══════════════════════════════════════════════════════════════════════════
   TESTA-ABAS-CONQUISTAS -- o Quadro e uma aba de Conquistas, nada se esconde
   no gratis, e o celular nao tem o botao do menu por cima do conteudo
   (09/10/2026 -- auditoria RED-02 e UX-09, roadmap 3.21; decisao P11: "Concordo")

     1. MENU: nenhuma pagina tem mais o item "Quadro" (um item a menos); no
        Quadro, quem acende e Conquistas
     2. ABAS: Condecoracoes | Quadro de operacoes nas duas paginas, com a atual
        marcada; a aba do navegador de Conquistas diz "Conquistas" (dizia "Missoes")
     3. GRATIS (P11): uma conta gratis ve no Quadro TODAS as condecoracoes do
        catalogo (as secretas aparecem como "???" -- isso e o jogo, nao trava)
     4. CELULAR: rolando para baixo, o botao do menu sai da frente; rolando
        para cima, volta
     5. TOPO: depois de subir o edital, a patente do topo muda sem recarregar

   USO   ASTRAL_DEV=1 node tools/testa-abas-conquistas.js   (o roda-testes ja liga)
   ═══════════════════════════════════════════════════════════════════════════ */
const crypto = require("crypto");
const fs = require("fs");
const http = require("http");
const os = require("os");
const path = require("path");
const { pathToFileURL } = require("url");
const { REF, PUB, reescrever, chavesDoProjeto, onde } = require("./testes/alvo");   // 09/10/2026 (COD-02)
const BASE = `https://${REF}.supabase.co`;
const SK = chavesDoProjeto().find((k) => k.name === "service_role").api_key;
const admin = { apikey: SK, Authorization: `Bearer ${SK}`, "Content-Type": "application/json" };
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

(async () => {
  console.log(`\nTESTA-ABAS-CONQUISTAS  ${onde}\n`);
  let nav = null, uid = null, hash = null;
  const pdfArq = path.join(os.tmpdir(), `astral-abas-${Date.now()}.pdf`);
  try {
    console.log("== 1. MENU ==");
    const paginas = fs.readdirSync(RAIZ).filter((f) => f.endsWith(".html") && /class="sidebar/.test(fs.readFileSync(path.join(RAIZ, f), "utf8")));
    const comQuadro = paginas.filter((f) => /<a class="nav-link[^"]*" href="arvore\.html">/.test(fs.readFileSync(path.join(RAIZ, f), "utf8")));
    conferir("🎯 nenhum menu tem mais o item \"Quadro\"", comQuadro.length === 0, comQuadro.length ? comQuadro.join(", ") : `${paginas.length} páginas`);
    const arv = fs.readFileSync(path.join(RAIZ, "arvore.html"), "utf8");
    conferir("no Quadro, quem acende no menu é Conquistas", /<a class="nav-link active" href="conquistas\.html">/.test(arv));

    console.log("\n== 2. ABAS ==");
    const conq = fs.readFileSync(path.join(RAIZ, "conquistas.html"), "utf8");
    conferir("🎯 as duas páginas têm as abas, com a atual marcada",
      /href="conquistas\.html" aria-current="page">Condecorações/.test(conq) && /href="arvore\.html">Quadro de operações/.test(conq)
      && /href="arvore\.html" aria-current="page">Quadro de operações/.test(arv) && /href="conquistas\.html">Condecorações/.test(arv));
    conferir("a aba do navegador diz \"Conquistas\" (dizia \"Missões\")", /<title>Astral — Conquistas<\/title>/.test(conq));

    // conta gratis, com edital guardado
    const email = `abas-${Date.now()}@astral-teste.local`;
    uid = (await req("/auth/v1/admin/users", { method: "POST", headers: admin, body: JSON.stringify({ email, password: "T!" + crypto.randomUUID() + "a1", email_confirm: true }) })).corpo.id;
    const link = await req("/auth/v1/admin/generate_link", { method: "POST", headers: admin, body: JSON.stringify({ type: "magiclink", email }) });
    const s = (await req("/auth/v1/verify", { method: "POST", headers: { apikey: PUB, "Content-Type": "application/json" }, body: JSON.stringify({ type: "magiclink", token_hash: link.corpo.hashed_token }) })).corpo;
    const npx = path.join(process.env.LOCALAPPDATA, "npm-cache", "_npx");
    let pw = null; for (const d of fs.readdirSync(npx)) { const p = path.join(npx, d, "node_modules", "playwright"); if (fs.existsSync(p)) { pw = require(p); break; } }
    if (!pw) throw new Error("playwright nao encontrado");
    await new Promise((r) => servidor.listen(PORTA, r));
    nav = await pw.chromium.launch();
    const abrir = async (pagina, largura = 1280) => {
      const ctx = await nav.newContext({ viewport: { width: largura, height: 844 } });
      await ctx.addInitScript(require("./testes/aceite-de-teste.js").SCRIPT);
      await ctx.addInitScript(`localStorage.setItem("sb-${REF}-auth-token", ${JSON.stringify(JSON.stringify({ access_token: s.access_token, refresh_token: s.refresh_token, token_type: "bearer", expires_at: Math.floor(Date.now() / 1000) + 900, user: s.user }))});`);
      await ctx.route("**/functions/v1/buscar-recursos", (r) => r.fulfill({ status: 402, contentType: "application/json", body: '{"error":"sem credito (teste)"}' }));
      const pg = await ctx.newPage();
      const erros = []; pg.on("pageerror", (e) => erros.push(e.message));
      await pg.goto(`http://localhost:${PORTA}/${pagina}`, { waitUntil: "load" });
      return { pg, ctx, erros };
    };

    console.log("\n== 3. NADA ESCONDIDO NO GRÁTIS (P11) ==");
    const plano = (await req(`/rest/v1/perfis?id=eq.${uid}&select=tipo_plano`, { headers: admin })).corpo?.[0]?.tipo_plano;
    const { CONDECORACOES } = await import(pathToFileURL(path.join(RAIZ, "assets/js/catalogo.js")).href);
    const q = await abrir("arvore.html");
    await q.pg.waitForSelector(".no", { timeout: 25000 }).catch(() => null);
    await q.pg.waitForTimeout(1500);
    const nos = await q.pg.$$eval(".no", (els) => els.length);
    conferir("🎯 conta grátis vê no Quadro todas as condecorações", plano === "free" && nos === CONDECORACOES.length, `plano ${plano} · ${nos} de ${CONDECORACOES.length}`);
    q.erros.length ? falha("erro de JavaScript no Quadro", q.erros[0].slice(0, 80)) : ok("nenhum erro de JavaScript no Quadro");
    await q.ctx.close();

    console.log("\n== 4. CELULAR: O BOTÃO DO MENU SAI DA FRENTE ==");
    const c = await abrir("conquistas.html", 390);
    await c.pg.waitForTimeout(2500);
    const visivel = () => c.pg.evaluate(() => { const b = document.getElementById("astral-menu-btn"); return !!b && !b.classList.contains("astral-menu-some"); });
    const noTopo = await visivel();
    await c.pg.evaluate(() => window.scrollTo(0, 600)); await c.pg.waitForTimeout(400);
    const descendo = await visivel();
    await c.pg.evaluate(() => window.scrollTo(0, 300)); await c.pg.waitForTimeout(400);
    const subindo = await visivel();
    conferir("🎯 rolando para baixo some; para cima volta", noTopo && !descendo && subindo, `topo ${noTopo} · descendo ${descendo} · subindo ${subindo}`);
    await c.ctx.close();

    console.log("\n== 5. O TOPO DEPOIS DO EDITAL ==");
    const pdf = Buffer.from(`%PDF-1.4\n% abas-${Date.now()}\n%%EOF\n`);
    hash = crypto.createHash("sha256").update(pdf).digest("hex");
    fs.writeFileSync(pdfArq, pdf);
    await req("/rest/v1/editais_lidos", { method: "POST", headers: { ...admin, Prefer: "return=minimal" }, body: JSON.stringify({ hash, paginas: 1,
      resultado: { concurso: "Teste Abas CBMERJ", dataProva: null, forca: "bombeiros", patenteInicial: "Soldado BM", materias: [{ nome: "Português", questoes: 20, peso: 100 }] } }) });
    const d = await abrir("dashboard.html", 1280);
    await d.pg.waitForSelector("#upload-area", { state: "visible", timeout: 25000 });
    await d.pg.waitForTimeout(1500);
    const antes = (await d.pg.textContent(".divisa-topo .nivel").catch(() => "")) || "";
    await d.pg.setInputFiles("#file-input", pdfArq);
    await d.pg.waitForSelector("#main-content", { state: "visible", timeout: 30000 }).catch(() => null);
    await d.pg.waitForTimeout(1500);
    const depois = (await d.pg.textContent(".divisa-topo .nivel").catch(() => "")) || "";
    conferir("🎯 a patente do topo muda sem recarregar", /BM/.test(depois) && depois !== antes, `${antes.trim() || "—"} → ${depois.trim() || "—"}`);
    await d.ctx.close();
  } catch (e) {
    falha("o teste quebrou", e.message.slice(0, 140));
  } finally {
    if (nav) await nav.close();
    servidor.close();
    if (hash) await req(`/rest/v1/editais_lidos?hash=eq.${hash}`, { method: "DELETE", headers: admin });
    if (uid) await req(`/auth/v1/admin/users/${uid}`, { method: "DELETE", headers: admin });
    fs.rmSync(pdfArq, { force: true });
    console.log("\n" + "=".repeat(70));
    console.log(falhas === 0 ? "O QUADRO É UMA ABA, NADA SE ESCONDE, O MENU SAI DA FRENTE." : `🔴 ${falhas} FALHA(S).`);
    process.exitCode = falhas ? 1 : 0;
  }
})();
