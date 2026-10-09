/* ═══════════════════════════════════════════════════════════════════════════
   TESTA-PRIMEIRO-ACESSO -- a conta nova ve so o envio do edital; o captcha so
   baixa quando precisa; o PDF sobe cru. (09/10/2026 -- auditoria UX-04 e
   UX-05, roadmap 3.19; decisao 18 dele: "Concordo")

   Medido antes (03 e 09/10): conta nova no celular via cartoes zerados e o
   envio do edital comecava ABAIXO do fim da tela (906 px numa de 844); Entrar
   e Criar conta baixavam ~1.050 KB, ~764 KB do hCaptcha, ate para quem entra
   com o Google; o PDF ia em base64 (+33%) com 120 s de limite no aparelho.

     1. PRIMEIRO ACESSO (celular 390x844): so o envio, acima da dobra, com o
        "Primeiro passo"; subir um edital (o guardado -- sem IA) abre o painel;
        quem ja estudou e esta sem edital continua vendo o painel
     2. CAPTCHA: login, criar-conta e lista de espera nao pedem nada ao hCaptcha
        ao abrir; tocar no campo de e-mail pede
     3. ENVIO: o painel manda o PDF cru (application/pdf, do tamanho do
        arquivo); o servidor aceita cru e base64 com a MESMA impressao digital;
        cru acima de 10 MB e recusado; cru que nao e PDF e recusado

   USO   ASTRAL_DEV=1 node tools/testa-primeiro-acesso.js   (o roda-testes ja liga)
   ═══════════════════════════════════════════════════════════════════════════ */
const crypto = require("crypto");
const fs = require("fs");
const http = require("http");
const os = require("os");
const path = require("path");
const { REF, PUB, reescrever, chavesDoProjeto, onde } = require("./testes/alvo");   // 09/10/2026 (COD-02)
const BASE = `https://${REF}.supabase.co`;
const SK = chavesDoProjeto().find((k) => k.name === "service_role").api_key;
const admin = { apikey: SK, Authorization: `Bearer ${SK}`, "Content-Type": "application/json" };
async function req(c, o = {}) { const r = await fetch(BASE + c, o); const t = await r.text(); let corpo = null; try { corpo = JSON.parse(t); } catch { corpo = t; } return { status: r.status, corpo }; }

let falhas = 0;
const ok = (t, d = "") => console.log(`  OK     ${t.padEnd(60)} ${d}`);
const falha = (t, d = "") => { console.log(`  FALHA  ${t.padEnd(60)} ${d}`); falhas++; };
const conferir = (t, c, d = "") => (c ? ok(t, d) : falha(t, d));

const RAIZ = path.resolve(__dirname, "..");
const tipos = { ".html": "text/html", ".css": "text/css", ".js": "text/javascript", ".mjs": "text/javascript", ".woff2": "font/woff2", ".svg": "image/svg+xml", ".png": "image/png", ".ico": "image/x-icon", ".webmanifest": "application/manifest+json" };
const PORTA = 5173;
const servidor = http.createServer((q, r) => {
  const u = decodeURIComponent(q.url.split("?")[0]); const a = path.join(RAIZ, u === "/" ? "index.html" : u);
  if (!path.resolve(a).startsWith(RAIZ) || !fs.existsSync(a) || fs.statSync(a).isDirectory()) { r.writeHead(404); return r.end(); }
  r.writeHead(200, { "Content-Type": tipos[path.extname(a)] || "text/plain" }); r.end(reescrever(a, fs.readFileSync(a)));
});

async function conta(prefixo) {
  const email = `${prefixo}-${Date.now()}@astral-teste.local`;
  const u = await req("/auth/v1/admin/users", { method: "POST", headers: admin, body: JSON.stringify({ email, password: "T!" + crypto.randomUUID() + "a1", email_confirm: true }) });
  const link = await req("/auth/v1/admin/generate_link", { method: "POST", headers: admin, body: JSON.stringify({ type: "magiclink", email }) });
  const s = (await req("/auth/v1/verify", { method: "POST", headers: { apikey: PUB, "Content-Type": "application/json" }, body: JSON.stringify({ type: "magiclink", token_hash: link.corpo.hashed_token }) })).corpo;
  return { id: u.corpo.id, s, cab: { apikey: PUB, Authorization: `Bearer ${s.access_token}` } };
}

(async () => {
  console.log(`\nTESTA-PRIMEIRO-ACESSO  ${onde}\n`);
  const contas = [];
  let nav = null, hash = null;
  const pdf = Buffer.from(`%PDF-1.4\n% primeiro-acesso-${Date.now()}\n1 0 obj << /Type /Pages /Count 2 >> endobj\n%%EOF\n`);
  hash = crypto.createHash("sha256").update(pdf).digest("hex");
  const pdfArq = path.join(os.tmpdir(), `astral-primeiro-${Date.now()}.pdf`);
  fs.writeFileSync(pdfArq, pdf);
  const LEITURA = { concurso: "Teste Primeiro Acesso EsSA", dataProva: null, forca: "exercito", patenteInicial: null,
    materias: [{ nome: "Português", questoes: 20, peso: 50 }, { nome: "Matemática", questoes: 20, peso: 50 }] };
  try {
    await req("/rest/v1/editais_lidos", { method: "POST", headers: { ...admin, Prefer: "return=minimal" }, body: JSON.stringify({ hash, resultado: LEITURA, paginas: 2 }) });
    const npx = path.join(process.env.LOCALAPPDATA, "npm-cache", "_npx");
    let pw = null; for (const d of fs.readdirSync(npx)) { const p = path.join(npx, d, "node_modules", "playwright"); if (fs.existsSync(p)) { pw = require(p); break; } }
    if (!pw) throw new Error("playwright nao encontrado");
    await new Promise((r) => servidor.listen(PORTA, r));
    nav = await pw.chromium.launch();
    const abrir = async (quem, pagina = "dashboard.html") => {
      const ctx = await nav.newContext({ viewport: { width: 390, height: 844 } });
      await ctx.addInitScript(require("./testes/aceite-de-teste.js").SCRIPT);
      if (quem) await ctx.addInitScript(`localStorage.setItem("sb-${REF}-auth-token", ${JSON.stringify(JSON.stringify({ access_token: quem.s.access_token, refresh_token: quem.s.refresh_token, token_type: "bearer", expires_at: Math.floor(Date.now() / 1000) + 900, user: quem.s.user }))});`);
      await ctx.route("**/functions/v1/buscar-recursos", (r) => r.fulfill({ status: 402, contentType: "application/json", body: '{"error":"sem credito (teste)"}' }));
      const pg = await ctx.newPage();
      const erros = []; pg.on("pageerror", (e) => erros.push(e.message));
      const pedidos = []; pg.on("request", (r) => pedidos.push(r));
      await pg.goto(`http://localhost:${PORTA}/${pagina}`, { waitUntil: "load" });
      return { pg, ctx, erros, pedidos };
    };

    console.log("== 1. PRIMEIRO ACESSO (celular) ==");
    const nova = await conta("primeiro"); contas.push(nova.id);
    const a = await abrir(nova);
    await a.pg.waitForSelector("#upload-area", { state: "visible", timeout: 25000 });
    await a.pg.waitForTimeout(2500);
    const tela = await a.pg.evaluate(() => {
      const vis = (s) => { const e = document.querySelector(s); if (!e) return false; const st = getComputedStyle(e); return st.display !== "none" && e.getBoundingClientRect().height > 0; };
      return { topoEnvio: Math.round(document.getElementById("upload-area").getBoundingClientRect().top), cartoes: vis(".grid-3"), painel: vis("#main-content"), passo: vis(".primeiro-passo") };
    });
    conferir("🎯 o envio do edital aparece sem rolar", tela.topoEnvio < 844, `começa em ${tela.topoEnvio} px (tela 844; era 906)`);
    conferir("🎯 os cartões zerados e o painel vazio não aparecem", !tela.cartoes && !tela.painel);
    conferir("o \"Primeiro passo\" diz o que fazer", tela.passo);

    console.log("\n== 3. ENVIO (pelo painel) ==");
    await a.pg.setInputFiles("#file-input", pdfArq);
    const pedido = await a.pg.waitForRequest((r) => r.url().includes("/functions/v1/processar-edital") && r.method() === "POST", { timeout: 20000 }).catch(() => null);
    const cab = pedido ? pedido.headers()["content-type"] || "" : "";
    const tam = pedido ? (pedido.postDataBuffer() || Buffer.alloc(0)).length : -1;
    conferir("🎯 o painel manda o PDF cru, do tamanho do arquivo", cab.startsWith("application/pdf") && tam === pdf.length, `${cab || "sem pedido"} · ${tam} de ${pdf.length} bytes`);
    const abriu = await a.pg.waitForSelector("#main-content", { state: "visible", timeout: 30000 }).then(() => true).catch(() => false);
    conferir("🎯 depois do edital, o painel aparece", abriu && !(await a.pg.evaluate(() => document.body.classList.contains("primeiro-acesso"))));
    a.erros.length ? falha("erro de JavaScript no painel", a.erros[0].slice(0, 80)) : ok("nenhum erro de JavaScript");
    await a.ctx.close();

    console.log("\n== 1b. QUEM JÁ ESTUDOU, SEM EDITAL ==");
    const veterana = await conta("veterana"); contas.push(veterana.id);
    await req("/rest/v1/sessoes_estudo", { method: "POST", headers: { ...admin, Prefer: "return=minimal" },
      body: JSON.stringify([{ usuario_id: veterana.id, materia: "Português", segundos: 3600, xp: 120, modo: "livre", criado_em: new Date(Date.now() - 86400000).toISOString() }]) });
    await req("/rest/v1/rpc/salvar_progresso", { method: "POST", headers: { ...veterana.cab, "Content-Type": "application/json" }, body: JSON.stringify({ p_xp: 0, p_streak: 0, p_horas: 0, p_edital: null, p_materias: [], p_cronograma_hoje: [], p_badges: [], p_tag_escolhida: null }) });
    const v = await abrir(veterana);
    await v.pg.waitForSelector("#upload-area", { state: "visible", timeout: 25000 });
    await v.pg.waitForTimeout(2500);
    conferir("quem já estudou continua vendo o painel", await v.pg.evaluate(() => getComputedStyle(document.getElementById("main-content")).display !== "none"));
    await v.ctx.close();

    console.log("\n== 2. O CAPTCHA SÓ QUANDO PRECISA ==");
    for (const pagina of ["login.html", "criar-conta.html", "cadastro.html"]) {
      const c = await abrir(null, pagina);
      await c.pg.waitForTimeout(2500);
      const antes = c.pedidos.filter((r) => /hcaptcha\.com/.test(r.url())).length;
      await c.pg.focus("input[type=email]");
      await c.pg.waitForTimeout(2500);
      const depois = c.pedidos.filter((r) => /hcaptcha\.com/.test(r.url())).length;
      conferir(`🎯 ${pagina}: nada do captcha ao abrir; tocar no e-mail baixa`, antes === 0 && depois > 0, `ao abrir ${antes} · depois ${depois} pedidos`);
      await c.ctx.close();
    }

    console.log("\n== 3b. ENVIO (direto no servidor) ==");
    const cru = await req("/functions/v1/processar-edital", { method: "POST", headers: { ...nova.cab, "Content-Type": "application/pdf" }, body: pdf });
    const b64 = await req("/functions/v1/processar-edital", { method: "POST", headers: { ...nova.cab, "Content-Type": "application/json" }, body: JSON.stringify({ pdfBase64: pdf.toString("base64") }) });
    conferir("🎯 cru e base64: o mesmo edital guardado (mesma impressão digital)",
      cru.status === 200 && b64.status === 200 && cru.corpo?.data?.guardado === true && b64.corpo?.data?.guardado === true && cru.corpo?.data?.concurso === LEITURA.concurso,
      `cru ${cru.status} · base64 ${b64.status}`);
    const grande = await req("/functions/v1/processar-edital", { method: "POST", headers: { ...nova.cab, "Content-Type": "application/pdf" }, body: Buffer.concat([Buffer.from("%PDF-1.4\n"), Buffer.alloc(11 * 1024 * 1024, 32)]) });
    conferir("cru acima de 10 MB: recusado", grande.status === 413, `HTTP ${grande.status}`);
    const falso = await req("/functions/v1/processar-edital", { method: "POST", headers: { ...nova.cab, "Content-Type": "application/pdf" }, body: Buffer.from("isto nao e um pdf") });
    conferir("cru que não é PDF: recusado com a razão", falso.status === 400 && /não é um PDF/.test(falso.corpo?.error || ""), `HTTP ${falso.status} ${String(falso.corpo?.error || "").slice(0, 40)}`);
  } catch (e) {
    falha("o teste quebrou", e.message.slice(0, 140));
  } finally {
    if (nav) await nav.close();
    servidor.close();
    if (hash) await req(`/rest/v1/editais_lidos?hash=eq.${hash}`, { method: "DELETE", headers: admin });
    for (const id of contas) await req(`/auth/v1/admin/users/${id}`, { method: "DELETE", headers: admin });
    fs.rmSync(pdfArq, { force: true });
    console.log("\n  (contas e edital de teste apagados)");
    console.log("\n" + "=".repeat(70));
    console.log(falhas === 0 ? "O PRIMEIRO ACESSO É SÓ O EDITAL, O CAPTCHA ESPERA, O PDF SOBE CRU." : `🔴 ${falhas} FALHA(S).`);
    process.exitCode = falhas ? 1 : 0;
  }
})();
