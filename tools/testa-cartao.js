/* ═══════════════════════════════════════════════════════════════════════════
   TESTA-CARTAO -- o cartao da divisa para os stories sai certo?

   POR QUE EXISTE (30/09/2026)
   Item 10 dele: "um cartao compartilhavel da divisa/patente para stories".
   O cartao e desenhado num <canvas> (assets/js/cartao.js). Este teste usa uma
   conta ADIANTADA (a mesma simulacao do simula-edital.js), clica no botao do
   painel e confere: a imagem tem o tamanho do story (1080x1920), a previa
   abre, e nada quebra -- no computador e no celular. A imagem fica salva no
   scratch do sistema para olhar.

   USO   node tools/testa-cartao.js      (nao gasta credito)
   ═══════════════════════════════════════════════════════════════════════════ */

const { execSync, execFileSync } = require("child_process");
const crypto = require("crypto");
const fs = require("fs");
const http = require("http");
const os = require("os");
const path = require("path");

const REF = "jjogmcacbdefwiwcyjxp";
const BASE = `https://${REF}.supabase.co`;
const RAIZ = path.resolve(__dirname, "..");
const PORTA = 8895;
const SK = JSON.parse(execSync(`supabase projects api-keys --project-ref ${REF} -o json`, { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }))
  .find((k) => k.name === "service_role").api_key;
const PUB = (fs.readFileSync(path.join(RAIZ, "assets/js/astral.js"), "utf8").match(/sb_publishable_[A-Za-z0-9_-]+/) || [])[0];
const admin = { apikey: SK, Authorization: `Bearer ${SK}`, "Content-Type": "application/json" };
async function req(c, o) { const r = await fetch(BASE + c, o); const t = await r.text(); try { return JSON.parse(t); } catch { return null; } }

let falhas = 0;
const ok = (t, d = "") => console.log(`  OK     ${t.padEnd(56)} ${d}`);
const falha = (t, d = "") => { console.log(`  FALHA  ${t.padEnd(56)} ${d}`); falhas++; };

function acharPlaywright() {
  try { return require("playwright"); } catch { /* segue procurando */ }
  const base = path.join(process.env.LOCALAPPDATA || os.homedir(), "npm-cache", "_npx");
  if (!fs.existsSync(base)) return null;
  for (const d of fs.readdirSync(base)) {
    const alvo = path.join(base, d, "node_modules", "playwright");
    if (fs.existsSync(alvo)) { try { return require(alvo); } catch { /* proximo */ } }
  }
  return null;
}
const pw = acharPlaywright();
if (!pw) { console.log("TESTA-CARTAO -- pulado: playwright nao encontrado."); process.exit(0); }

const tipos = { ".html": "text/html", ".css": "text/css", ".js": "text/javascript", ".woff2": "font/woff2", ".svg": "image/svg+xml" };
const servidor = http.createServer((q, r) => {
  const u = decodeURIComponent(q.url.split("?")[0]);
  const arq = path.join(RAIZ, u === "/" ? "/index.html" : u);
  if (!path.resolve(arq).startsWith(RAIZ) || !fs.existsSync(arq) || fs.statSync(arq).isDirectory()) { r.writeHead(404); return r.end("404"); }
  r.writeHead(200, { "Content-Type": tipos[path.extname(arq)] || "text/plain" });
  r.end(fs.readFileSync(arq));
});

(async () => {
  const email = `cartao-${Date.now()}@astral-teste.local`;
  const u = await req("/auth/v1/admin/users", { method: "POST", headers: admin, body: JSON.stringify({ email, password: "T!" + crypto.randomUUID(), email_confirm: true }) });
  const ferramenta = (...a) => execFileSync("node", [path.join(__dirname, "simula-edital.js"), "--email", email, ...a], { encoding: "utf8" });
  let nav = null;
  await new Promise((r) => servidor.listen(PORTA, r));
  try {
    console.log("\nTESTA-CARTAO -- a divisa vira imagem de story\n");
    ferramenta("--aplicar");
    // A rotina respondida, para o questionario da 1a vez nao cobrir o painel.
    await req(`/rest/v1/progresso?usuario_id=eq.${u.id}`, { method: "PATCH", headers: { ...admin, Prefer: "return=minimal" },
      body: JSON.stringify({ rotina: { dias: [1, 2, 3, 4, 5, 6], minutosUtil: 120, minutosFds: 120, bloco: 40, respondidoEm: new Date().toISOString() } }) });
    const link = await req("/auth/v1/admin/generate_link", { method: "POST", headers: admin, body: JSON.stringify({ type: "magiclink", email }) });
    const s = await req("/auth/v1/verify", { method: "POST", headers: { apikey: PUB, "Content-Type": "application/json" }, body: JSON.stringify({ type: "magiclink", token_hash: link.hashed_token }) });
    nav = await pw.chromium.launch();

    for (const [largura, altura] of [[1280, 1000], [390, 844]]) {
      const ctx = await nav.newContext({ viewport: { width: largura, height: altura } });
      await ctx.addInitScript(require("./testes/aceite-de-teste.js").SCRIPT);   // 02/10/2026: o aceite (LGL-01)
      await ctx.addInitScript(`localStorage.setItem("sb-${REF}-auth-token", ${JSON.stringify(JSON.stringify({ access_token: s.access_token, refresh_token: s.refresh_token, token_type: "bearer", expires_at: Math.floor(Date.now() / 1000) + 3600, user: s.user }))});`);
      await ctx.route("**/functions/v1/**", (r) => r.fulfill({ status: 402, contentType: "application/json", body: '{"error":"bloqueado no teste"}' }));
      const pg = await ctx.newPage(); const erros = [];
      pg.on("pageerror", (e) => erros.push(e.message));
      await pg.goto(`http://localhost:${PORTA}/dashboard.html`, { waitUntil: "load" });
      await pg.waitForTimeout(5000);                       // o RPG (condecoracoes) chega
      await pg.click("#btn-cartao");
      await pg.waitForSelector(".cartao-img", { timeout: 15000 });
      await pg.waitForTimeout(800);
      const img = await pg.evaluate(async () => {
        const el = document.querySelector(".cartao-img");
        const b = await (await fetch(el.src)).blob();
        const buf = new Uint8Array(await b.arrayBuffer());
        let bin = ""; for (const x of buf) bin += String.fromCharCode(x);
        return { w: el.naturalWidth, h: el.naturalHeight, tipo: b.type, b64: btoa(bin),
                 botoes: [...document.querySelectorAll(".cartao-btn")].map((x) => x.textContent.trim()) };
      });
      console.log(`== ${largura}px ==`);
      img.w === 1080 && img.h === 1920 ? ok("🎯 a imagem tem o tamanho do story", "1080 × 1920") : falha("tamanho", `${img.w} × ${img.h}`);
      img.tipo === "image/png" ? ok("é um PNG", `${Math.round(img.b64.length * 0.75 / 1024)} KB`) : falha("tipo", img.tipo);
      img.botoes.includes("Baixar imagem") && img.botoes.includes("Fechar") ? ok("a prévia oferece baixar e fechar", img.botoes.join(" · ")) : falha("botoes", img.botoes.join(","));
      fs.writeFileSync(path.join(os.tmpdir(), "cartao-divisa.png"), Buffer.from(img.b64, "base64"));
      await pg.screenshot({ path: path.join(os.tmpdir(), `cartao-previa-${largura}.png`) });
      await pg.keyboard.press("Escape");
      await pg.waitForTimeout(300);
      (await pg.$(".cartao-fundo")) ? falha("Esc não fechou a prévia") : ok("Esc fecha a prévia");
      erros.length ? falha("erro de JavaScript", erros[0].slice(0, 80)) : ok("nenhum erro de JavaScript");
      await ctx.close();
    }
  } catch (e) {
    falha("erro no teste: " + e.message);
  } finally {
    if (nav) await nav.close();
    servidor.close();
    try { ferramenta("--reverter"); } catch { /* a conta vai embora */ }
    await fetch(`${BASE}/auth/v1/admin/users/${u.id}`, { method: "DELETE", headers: admin });
    const pasta = path.resolve(RAIZ, "..", "ASTRAL-BACKUPS", "simulacao");
    if (fs.existsSync(pasta)) for (const f of fs.readdirSync(pasta)) if (f.startsWith(u.id)) fs.unlinkSync(path.join(pasta, f));
    console.log(`\n  (conta descartavel revertida e apagada · imagem em ${path.join(os.tmpdir(), "cartao-divisa.png")})`);
  }
  console.log("\n" + "=".repeat(70));
  console.log(falhas ? `🔴 ${falhas} FALHA(S).` : "O CARTAO SAI NO TAMANHO DO STORY, COM PREVIA ANTES DE COMPARTILHAR.");
  process.exitCode = falhas ? 1 : 0;
})();
