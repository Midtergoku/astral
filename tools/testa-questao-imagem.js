/* ═══════════════════════════════════════════════════════════════════════════
   TESTA-QUESTAO-IMAGEM -- a questao como IMAGEM do caderno funciona no celular?
   (03/10/2026 -- roadmap 3.4, caminho A)

   O Banco, numa tela de 360 px, com questoes de imagem ESCOLHIDAS (o sorteio de
   verdade e chamado e a resposta trocada pelas escolhidas, no mesmo formato):
     - a imagem carrega de verdade (largura natural > 0)
     - os botoes trazem SO a letra (o texto guardado e o quebrado)
     - tocar na letra do gabarito marca "certa"
     - a pagina nao rola para o lado
   Contra a tela antiga: o enunciado de texto embaralhado aparece e nao ha imagem.

   USO   node tools/testa-questao-imagem.js     (producao; nao gasta credito)
         ASTRAL_RAIZ=pasta  serve outra copia do site
   ═══════════════════════════════════════════════════════════════════════════ */
const { execSync } = require("child_process");
const crypto = require("crypto");
const fs = require("fs");
const http = require("http");
const path = require("path");

const REF = "jjogmcacbdefwiwcyjxp";
const BASE = `https://${REF}.supabase.co`;
const RAIZ = process.env.ASTRAL_RAIZ ? path.resolve(process.env.ASTRAL_RAIZ) : path.resolve(__dirname, "..");
const RAIZ_IMG = path.resolve(__dirname, "..");   // as imagens sao do site atual
const SK = JSON.parse(execSync(`supabase projects api-keys --project-ref ${REF} -o json`, { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] })).find((k) => k.name === "service_role").api_key;
const PUB = (fs.readFileSync(path.join(RAIZ, "assets/js/astral.js"), "utf8").match(/sb_publishable_[A-Za-z0-9_-]+/) || [])[0];
const admin = { apikey: SK, Authorization: `Bearer ${SK}`, "Content-Type": "application/json" };
async function req(c, o = {}) { const r = await fetch(BASE + c, o); const t = await r.text(); let corpo = null; try { corpo = JSON.parse(t); } catch { corpo = t; } return { status: r.status, corpo }; }

let falhas = 0;
const ok = (t, d = "") => console.log(`  OK     ${t.padEnd(58)} ${d}`);
const falha = (t, d = "") => { console.log(`  FALHA  ${t.padEnd(58)} ${d}`); falhas++; };

const tipos = { ".html": "text/html", ".css": "text/css", ".js": "text/javascript", ".mjs": "text/javascript", ".woff2": "font/woff2", ".svg": "image/svg+xml", ".webp": "image/webp" };
const PORTA = 5185;
const servidor = http.createServer((q, r) => {
  const u = decodeURIComponent(q.url.split("?")[0]);
  const base = u.startsWith("/img/questoes/") ? RAIZ_IMG : RAIZ;
  const a = path.join(base, u === "/" ? "index.html" : u);
  if (!fs.existsSync(a) || fs.statSync(a).isDirectory()) { r.writeHead(404); return r.end(); }
  r.writeHead(200, { "Content-Type": tipos[path.extname(a)] || "text/plain" }); r.end(fs.readFileSync(a));
});

(async () => {
  const npx = path.join(process.env.LOCALAPPDATA, "npm-cache", "_npx");
  let pw = null; for (const d of fs.readdirSync(npx)) { const p = path.join(npx, d, "node_modules", "playwright"); if (fs.existsSync(p)) { pw = require(p); break; } }
  if (!pw) { console.log("playwright nao encontrado"); process.exit(0); }

  // 3 questoes de imagem no ar: uma de Matematica, uma de Fisica, uma qualquer
  const escolhidas = [];
  for (const m of ["Matem%C3%A1tica", "F%C3%ADsica", "Inform%C3%A1tica"]) {
    const r = await req(`/rest/v1/questoes?publicada=is.true&imagem=not.is.null&materia=eq.${m}&select=*&order=id&limit=1`, { headers: admin });
    if (Array.isArray(r.corpo) && r.corpo[0]) escolhidas.push(r.corpo[0]);
  }
  console.log(`\nTESTA-QUESTAO-IMAGEM  ${escolhidas.map((q) => "#" + q.id).join(" ")}\n`);
  if (escolhidas.length < 2) { falha("menos de 2 questoes de imagem no ar", String(escolhidas.length)); process.exit(1); }

  const email = `imagem-${Date.now()}@astral-teste.local`;
  const u = await req("/auth/v1/admin/users", { method: "POST", headers: admin, body: JSON.stringify({ email, password: "T!" + crypto.randomUUID(), email_confirm: true }) });
  const link = await req("/auth/v1/admin/generate_link", { method: "POST", headers: admin, body: JSON.stringify({ type: "magiclink", email }) });
  const s = (await req("/auth/v1/verify", { method: "POST", headers: { apikey: PUB, "Content-Type": "application/json" }, body: JSON.stringify({ type: "magiclink", token_hash: link.corpo.hashed_token }) })).corpo;
  await new Promise((r) => servidor.listen(PORTA, r));
  const nav = await pw.chromium.launch();
  try {
    const ctx = await nav.newContext({ viewport: { width: 360, height: 740 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
    await ctx.addInitScript(require("./testes/aceite-de-teste.js").SCRIPT);
    await ctx.addInitScript(`localStorage.setItem("sb-${REF}-auth-token", ${JSON.stringify(JSON.stringify({ access_token: s.access_token, refresh_token: s.refresh_token, token_type: "bearer", expires_at: Math.floor(Date.now() / 1000) + 7200, user: s.user }))});`);
    let campos = null;
    await ctx.route("**/rest/v1/rpc/sortear_questoes**", async (route) => {
      const real = await route.fetch();
      const corpo = await real.json();
      campos = corpo.questoes?.[0] ? Object.keys(corpo.questoes[0]) : null;
      const modelo = campos || Object.keys(escolhidas[0]);
      route.fulfill({ response: real, body: JSON.stringify({ ...corpo, questoes: escolhidas.map((q) => Object.fromEntries(modelo.map((k) => [k, q[k] ?? null]))) }) });
    });
    const pg = await ctx.newPage();
    const erros = []; pg.on("pageerror", (e) => erros.push(e.message));
    await pg.goto(`http://localhost:${PORTA}/banco.html`, { waitUntil: "load" });
    await pg.waitForSelector("#btn-sortear", { timeout: 25000 });
    await pg.waitForTimeout(1000);
    await pg.click("#btn-sortear");
    await pg.waitForSelector(".questao", { timeout: 20000 });
    await pg.waitForTimeout(1500);

    campos && campos.includes("imagem") ? ok("o sorteio do servidor devolve a imagem", "campo imagem") : falha("o sorteio nao devolve o campo imagem", String(campos));
    const r = await pg.evaluate(() => [...document.querySelectorAll(".questao")].map((c) => {
      const img = c.querySelector(".questao-imagem img");
      return { img: !!img, carregou: img ? img.complete && img.naturalWidth > 0 : false,
               texto: !!c.querySelector(".questao-enunciado"), letras: [...c.querySelectorAll(".alt")].map((b) => b.textContent.trim()) };
    }));
    r.every((x) => x.img && x.carregou) ? ok("🎯 a imagem do caderno aparece e carrega", `${r.length} de ${r.length}`) : falha("imagem nao apareceu ou nao carregou", JSON.stringify(r.map((x) => [x.img, x.carregou])));
    r.every((x) => !x.texto) ? ok("o texto embaralhado guardado NÃO aparece") : falha("o enunciado de texto aparece junto", "");
    r.every((x) => x.letras.length >= 4 && x.letras.every((l) => /^[a-e]\)$/.test(l))) ? ok("os botões trazem só a letra", r[0].letras.join(" ")) : falha("botao com texto", JSON.stringify(r[0]?.letras));
    const q0 = escolhidas[0];
    await pg.click(`.alt[data-responder="${q0.id}"][data-letra="${q0.gabarito}"]`);
    await pg.waitForTimeout(800);
    const certa = await pg.evaluate((id) => document.querySelector(`.alt.certa[data-responder="${id}"]`)?.dataset.letra, String(q0.id));
    certa === q0.gabarito ? ok("tocar na letra do gabarito marca a certa", `#${q0.id} ${certa}`) : falha("a certa nao foi marcada", String(certa));
    const largura = await pg.evaluate(() => document.documentElement.scrollWidth);
    largura <= 360 ? ok("sem rolagem para o lado em 360 px", `${largura}px`) : falha("a pagina rola para o lado", `${largura}px`);
    erros.length ? falha("erro de JavaScript", erros[0].slice(0, 80)) : ok("nenhum erro de JavaScript");
  } catch (e) {
    falha("o teste quebrou", e.message.slice(0, 100));
  } finally {
    await nav.close(); servidor.close();
    await req(`/auth/v1/admin/users/${u.corpo.id}`, { method: "DELETE", headers: admin });
    console.log("\n" + "=".repeat(70));
    console.log(falhas === 0 ? "A QUESTÃO COMO IMAGEM FUNCIONA NO CELULAR." : `🔴 ${falhas} FALHA(S).`);
    process.exit(falhas ? 1 : 0);
  }
})();
