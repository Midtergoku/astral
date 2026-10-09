// TESTA-RELOGIO -- o relogio da aba Cronometro funciona, e nao come a sessao?
//
// Pedido dele em 27/09/2026: "muitas pessoas gostam de estudar assim, elas
// so deixam rodando o relogio". Relogio de parede, com ponteiros, e digital
// na tela inteira.
//
// 🔴 A CHECAGEM QUE MAIS IMPORTA: o cronometro tem uma funcao resetar() que
// JOGA FORA o tempo de uma sessao em andamento, e trocar de modo a chama.
// Se o relogio fosse um "modo", quem olhasse a hora no meio do estudo perderia
// a sessao -- calado. Ele e uma VISTA, e este teste prova isso: liga o
// cronometro, abre o relogio, volta, e o tempo tem de ter continuado.
const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");
const http = require("http");

const { REF, reescrever } = require("./testes/alvo");   // 09/10/2026 (COD-02): ASTRAL_DEV=1 -> astral-dev (tools/testes/alvo.js)
const BASE = `https://${REF}.supabase.co`;
const RAIZ = path.resolve(__dirname, "..");
const PORTA = 8895;

function acharPlaywright() {
  try { return require("playwright"); } catch { /* segue */ }
  const base = process.env.LOCALAPPDATA
    ? path.join(process.env.LOCALAPPDATA, "npm-cache", "_npx")
    : path.join(require("os").homedir(), ".npm", "_npx");
  if (!fs.existsSync(base)) return null;
  for (const d of fs.readdirSync(base)) {
    const alvo = path.join(base, d, "node_modules", "playwright");
    if (fs.existsSync(alvo)) { try { return require(alvo); } catch { /* proximo */ } }
  }
  return null;
}
const pw = acharPlaywright();
if (!pw) { console.log("TESTA-RELOGIO -- pulado: playwright nao encontrado."); process.exit(0); }

const chaves = JSON.parse(execSync(`supabase projects api-keys --project-ref ${REF} -o json`,
  { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }));
const SK = chaves.find((k) => k.name === "service_role").api_key;
const PUB = require("./testes/alvo").PUB;
const admin = { apikey: SK, Authorization: `Bearer ${SK}`, "Content-Type": "application/json" };

let falhas = 0;
const ok = (t, d = "") => console.log(`  OK     ${t.padEnd(54)} ${d}`);
const falha = (t, d = "") => { console.log(`  FALHA  ${t.padEnd(54)} ${d}`); falhas++; };
async function req(c, o) { const r = await fetch(BASE + c, o); let corpo = null; try { corpo = await r.json(); } catch {} return { status: r.status, corpo }; }

const tipos = { ".html": "text/html", ".css": "text/css", ".js": "text/javascript", ".mjs": "text/javascript", ".woff2": "font/woff2" };
const servidor = http.createServer((q, r) => {
  const u = decodeURIComponent(q.url.split("?")[0]);
  const arq = path.join(RAIZ, u === "/" ? "/index.html" : u);
  if (!path.resolve(arq).startsWith(RAIZ) || !fs.existsSync(arq) || fs.statSync(arq).isDirectory()) { r.writeHead(404); return r.end("404"); }
  r.writeHead(200, { "Content-Type": tipos[path.extname(arq)] || "text/plain" });
  r.end(reescrever(arq, fs.readFileSync(arq)));
});

(async () => {
  let id = null, nav = null;
  await new Promise((r) => servidor.listen(PORTA, r));
  nav = await pw.chromium.launch();
  try {
    const email = `relogio-${Date.now()}@astral-teste.local`;
    const c = await req("/auth/v1/admin/users", { method: "POST", headers: admin,
      body: JSON.stringify({ email, password: "T!" + crypto.randomUUID(), email_confirm: true }) });
    id = c.corpo.id;
    const link = await req("/auth/v1/admin/generate_link", { method: "POST", headers: admin, body: JSON.stringify({ type: "magiclink", email }) });
    const s = (await req("/auth/v1/verify", { method: "POST", headers: { apikey: PUB, "Content-Type": "application/json" },
      body: JSON.stringify({ type: "magiclink", token_hash: link.corpo?.hashed_token }) })).corpo;

    const ctx = await nav.newContext({ viewport: { width: 1280, height: 950 } });
    await ctx.addInitScript(require("./testes/aceite-de-teste.js").SCRIPT);   // 02/10/2026: o aceite (LGL-01)
    await ctx.addInitScript(`(() => { localStorage.setItem("sb-${REF}-auth-token", JSON.stringify({
      access_token: ${JSON.stringify(s.access_token)}, refresh_token: ${JSON.stringify(s.refresh_token)},
      token_type: "bearer", expires_at: Math.floor(Date.now()/1000)+3600, user: ${JSON.stringify(s.user)} })); })()`);
    const pg = await ctx.newPage();
    const erros = [];
    pg.on("pageerror", (e) => erros.push(String(e.message)));
    await pg.goto(`http://localhost:${PORTA}/cronometro.html`, { waitUntil: "load" });
    await pg.waitForSelector("#btn-relogio", { timeout: 20000 }).catch(() => {});
    await pg.waitForTimeout(800);
    console.log(`\nTESTA-RELOGIO  usuario ${id.slice(0, 8)}\n`);
    if (erros.length) falha("erro de JavaScript na pagina", erros[0].slice(0, 70));

    // ── 1. A terceira aba ────────────────────────────────────────────────
    console.log("== 1. A TERCEIRA ABA ==");
    const abas = await pg.evaluate(() => [...document.querySelectorAll(".modo-btn")].map((b) => b.textContent.trim()));
    abas.length === 3 && /Rel/.test(abas[2])
      ? ok("🎯 a aba Relógio vem depois de Livre e Pomodoro", abas.join(" · "))
      : falha("abas", abas.join(" · "));

    // ── 2. 🔴 A SESSAO NAO SE PERDE ───────────────────────────────────────
    console.log("\n== 2. O CRONOMETRO CONTINUA POR TRAS ==");
    await pg.evaluate(() => window.togglePlay());           // liga o cronometro
    await pg.waitForTimeout(2300);
    const antes = await pg.textContent("#crono-tempo");
    await pg.click("#btn-relogio");                         // olha o relogio
    await pg.waitForTimeout(600);
    const aviso = await pg.textContent("#rel-aviso-sessao");
    /continua contando/.test(aviso)
      ? ok("o relogio avisa que a sessao segue contando", aviso.trim().slice(0, 44))
      : falha("sem aviso da sessao por tras", aviso);
    await pg.waitForTimeout(1500);
    await pg.click("#btn-livre");                           // volta
    await pg.waitForTimeout(600);
    const depois = await pg.textContent("#crono-tempo");
    const seg = (t) => { const [m, s] = String(t).trim().split(":").map(Number); return m * 60 + s; };
    seg(depois) > seg(antes)
      ? ok("🎯 voltar do relógio NÃO zera a sessão", `${antes.trim()} -> ${depois.trim()}, continuou contando`)
      : falha("🔴 olhar o relogio apagou a sessao", `${antes} -> ${depois}`);

    // ── 3. O de parede ───────────────────────────────────────────────────
    console.log("\n== 3. O RELOGIO DE PAREDE ==");
    await pg.click("#btn-relogio");
    await pg.waitForTimeout(700);
    const parede = await pg.evaluate(() => {
      const hms = new Date();
      const trf = (id) => document.getElementById(id)?.style.transform || "";
      const graus = (t) => parseFloat((t.match(/rotate\(([-\d.]+)deg\)/) || [])[1]);
      return {
        visivel: getComputedStyle(document.getElementById("relogio-parede")).display !== "none",
        tracos: document.querySelectorAll("#rel-tracos line").length,
        numeros: document.querySelectorAll("#rel-tracos text").length,
        h: graus(trf("rel-h")), m: graus(trf("rel-m")),
        hEsperado: (hms.getHours() % 12) * 30 + hms.getMinutes() * 0.5,
        mEsperado: hms.getMinutes() * 6 + hms.getSeconds() * 0.1,
      };
    });
    parede.visivel && parede.tracos === 60 && parede.numeros === 12
      ? ok("o mostrador tem 60 tracos e os 12 numeros", "")
      : falha("mostrador incompleto", JSON.stringify(parede));
    Math.abs(parede.h - parede.hEsperado) < 1.5 && Math.abs(parede.m - parede.mEsperado) < 1.5
      ? ok("🎯 os ponteiros marcam a hora CERTA", `hora ${parede.h.toFixed(1)}°, minuto ${parede.m.toFixed(1)}°`)
      : falha("ponteiros na hora errada", `h ${parede.h} vs ${parede.hEsperado}, m ${parede.m} vs ${parede.mEsperado}`);

    // O ponteiro de segundos anda.
    const s1 = await pg.evaluate(() => document.getElementById("rel-s").style.transform);
    await pg.waitForTimeout(1300);
    const s2 = await pg.evaluate(() => document.getElementById("rel-s").style.transform);
    s1 !== s2 ? ok("o ponteiro de segundos anda", `${s1} -> ${s2}`) : falha("segundos parados");

    // ── 4. O digital ─────────────────────────────────────────────────────
    console.log("\n== 4. O DIGITAL ==");
    await pg.click('.relogio-estilo[data-estilo="digital"]');
    await pg.waitForTimeout(500);
    const dig = await pg.evaluate(() => ({
      paredeSome: getComputedStyle(document.getElementById("relogio-parede")).display === "none",
      texto: document.getElementById("rel-digitos").textContent.trim(),
    }));
    dig.paredeSome && /^\d\d:\d\d:\d\d$/.test(dig.texto)
      ? ok("🎯 o digital mostra HH:MM:SS", dig.texto) : falha("digital", JSON.stringify(dig));

    // A escolha fica lembrada.
    await pg.reload({ waitUntil: "load" });
    await pg.waitForSelector("#btn-relogio", { timeout: 20000 });
    await pg.waitForTimeout(600);
    await pg.click("#btn-relogio");
    await pg.waitForTimeout(500);
    const lembrou = await pg.evaluate(() => getComputedStyle(document.getElementById("relogio-digital")).display !== "none");
    lembrou ? ok("e a escolha do estilo fica lembrada") : falha("esqueceu o estilo escolhido");

    // ── 5. No celular ────────────────────────────────────────────────────
    console.log("\n== 5. NO CELULAR ==");
    await pg.setViewportSize({ width: 360, height: 740 });
    await pg.click('.relogio-estilo[data-estilo="parede"]');
    await pg.waitForTimeout(400);
    const cel = await pg.evaluate(() => {
      const r = document.getElementById("relogio-parede").getBoundingClientRect();
      return { w: Math.round(r.width), vaza: document.documentElement.scrollWidth > window.innerWidth };
    });
    cel.w > 200 && !cel.vaza
      ? ok("no Android de 360px o relógio cabe e não vaza", `${cel.w}px de largura`)
      : falha("relogio no celular", JSON.stringify(cel));

    // ── 6. Cor fora do design system ─────────────────────────────────────
    const html = fs.readFileSync(path.join(RAIZ, "cronometro.html"), "utf8");
    const bloco = html.slice(html.indexOf("RELÓGIO ═"), html.indexOf("</style>"));
    const hex = bloco.match(/#[0-9a-fA-F]{3,8}\b/g) || [];
    !hex.length ? ok("o relogio so usa tokens de cor") : falha("cor solta no relogio", hex.join(","));

    await ctx.close();
  } finally {
    if (id) await req(`/auth/v1/admin/users/${id}`, { method: "DELETE", headers: admin });
    if (nav) await nav.close();
    servidor.close();
  }
  console.log("\n" + "=".repeat(72));
  console.log(falhas === 0 ? "O RELOGIO FUNCIONA — e olhar a hora nao apaga o estudo." : `🔴 ${falhas} FALHA(S).`);
  process.exit(falhas === 0 ? 0 : 1);
})();
