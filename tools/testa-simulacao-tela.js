/* ═══════════════════════════════════════════════════════════════════════════
   TESTA-SIMULACAO-TELA -- as paginas aguentam uma conta ADIANTADA?

   POR QUE EXISTE (27/09/2026)
   Todo teste de tela do projeto comeca de uma conta zerada. Mas a conta que
   importa -- a de quem estuda ha dois meses -- nunca tinha sido aberta por um
   teste: 112 sessoes, 48 conquistas, patente alta, pontos para gastar.
   Nasceu no dia em que a conta do dono recebeu o `simula-edital.js`: antes
   de dizer "esta pronto para testar", abrir cada pagina com uma conta igual.

   Cria uma conta descartavel, aplica a MESMA simulacao (tools/simula-edital.js),
   abre as paginas do app e procura: erro de JavaScript, pagina que nao
   desenha, e o que a conta deveria mostrar. No fim reverte e apaga a conta.

   USO   node tools/testa-simulacao-tela.js
   ═══════════════════════════════════════════════════════════════════════════ */

const { execSync, execFileSync } = require("child_process");
const fs = require("fs");
const http = require("http");
const path = require("path");

const REF = "jjogmcacbdefwiwcyjxp";
const BASE = `https://${REF}.supabase.co`;
const RAIZ = path.resolve(__dirname, "..");
const PORTA = 8889;

function acharPlaywright() {
  try { return require("playwright"); } catch { /* segue procurando */ }
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
if (!pw) { console.log("TESTA-SIMULACAO-TELA -- pulado: playwright nao encontrado."); process.exit(0); }

const chaves = JSON.parse(execSync(`supabase projects api-keys --project-ref ${REF} -o json`,
  { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }));
const SK = chaves.find((k) => k.name === "service_role").api_key;
const PUB = (fs.readFileSync(path.join(RAIZ, "assets/js/astral.js"), "utf8").match(/sb_publishable_[A-Za-z0-9_-]+/) || [])[0];
const admin = { apikey: SK, Authorization: `Bearer ${SK}`, "Content-Type": "application/json" };
async function req(c, o) { const r = await fetch(BASE + c, o); const t = await r.text(); try { return JSON.parse(t); } catch { return null; } }

let falhas = 0;
const ok = (t, d = "") => console.log(`  OK     ${t.padEnd(52)} ${d}`);
const falha = (t, d = "") => { console.log(`  FALHA  ${t.padEnd(52)} ${d}`); falhas++; };

const tipos = { ".html": "text/html", ".css": "text/css", ".js": "text/javascript", ".mjs": "text/javascript", ".woff2": "font/woff2", ".svg": "image/svg+xml" };
const servidor = http.createServer((q, r) => {
  const u = decodeURIComponent(q.url.split("?")[0]);
  const arq = path.join(RAIZ, u === "/" ? "/index.html" : u);
  if (!path.resolve(arq).startsWith(RAIZ) || !fs.existsSync(arq) || fs.statSync(arq).isDirectory()) { r.writeHead(404); return r.end("404"); }
  r.writeHead(200, { "Content-Type": tipos[path.extname(arq)] || "text/plain" });
  r.end(fs.readFileSync(arq));
});

// O que cada pagina tem de mostrar para uma conta adiantada de bombeiro.
const PAGINAS = [
  ["dashboard.html",   /Sargento BM/,               "a patente de bombeiro"],
  ["edital.html",      /SIMULA[ÇC][ÃA]O/,           "o edital simulado"],
  ["cronograma.html",  /Portugu[êe]s|Matem[áa]tica/, "as materias do edital"],
  ["calendario.html",  null, null],
  ["progresso.html",   /Legisla[çc][ãa]o/,          "as 9 materias"],
  ["cronometro.html",  null, null],
  ["conquistas.html",  null, null],
  ["arvore.html",      null, null],
  ["habilidades.html", /\b5\b/,                     "os 5 pontos para gastar"],
  ["tags.html",        null, null],
  ["banco.html",       null, null],
  ["conta.html",       null, null],
];

(async () => {
  const email = `simula-tela-${Date.now()}@astral-teste.local`;
  const u = await req("/auth/v1/admin/users", { method: "POST", headers: admin,
    body: JSON.stringify({ email, password: "T!" + crypto.randomUUID(), email_confirm: true }) });
  const uid = u.id;
  const ferramenta = (...a) => execFileSync("node", [path.join(__dirname, "simula-edital.js"), "--email", email, ...a], { encoding: "utf8" });
  let nav = null;
  await new Promise((r) => servidor.listen(PORTA, r));
  try {
    console.log("\nTESTA-SIMULACAO-TELA -- uma conta adiantada de bombeiro, pagina por pagina\n");
    ferramenta("--aplicar");
    const link = await req("/auth/v1/admin/generate_link", { method: "POST", headers: admin, body: JSON.stringify({ type: "magiclink", email }) });
    const s = await req("/auth/v1/verify", { method: "POST", headers: { apikey: PUB, "Content-Type": "application/json" },
      body: JSON.stringify({ type: "magiclink", token_hash: link.hashed_token }) });

    nav = await pw.chromium.launch();
    const ctx = await nav.newContext({ viewport: { width: 1280, height: 1000 } });
    await ctx.addInitScript(`localStorage.setItem("sb-${REF}-auth-token", ${JSON.stringify(JSON.stringify({
      access_token: s.access_token, refresh_token: s.refresh_token, token_type: "bearer",
      expires_at: Math.floor(Date.now() / 1000) + 3600, user: s.user }))});`);

    for (const [pagina, espera, oque] of PAGINAS) {
      const pg = await ctx.newPage();
      const erros = [];
      pg.on("pageerror", (e) => erros.push(String(e.message)));
      await pg.goto(`http://localhost:${PORTA}/${pagina}`, { waitUntil: "load" });
      await pg.waitForTimeout(3500);                       // as consultas ao servidor terminam
      const texto = (await pg.textContent("main").catch(() => "")) || (await pg.textContent("body")) || "";
      const foiParaLogin = /login\.html/.test(pg.url());
      if (foiParaLogin) falha(`${pagina} mandou para o login`);
      else if (erros.length) falha(`${pagina} deu erro de JavaScript`, erros[0].slice(0, 70));
      else if (espera && !espera.test(texto)) falha(`${pagina} nao mostrou ${oque}`, texto.replace(/\s+/g, " ").slice(0, 70));
      else ok(`${pagina}`, espera ? `mostra ${oque}` : "abre sem erro");
      await pg.close();
    }
  } catch (e) {
    falha("erro no teste: " + e.message);
  } finally {
    if (nav) await nav.close();
    servidor.close();
    try { ferramenta("--reverter"); } catch { /* a conta vai ser apagada de qualquer jeito */ }
    await fetch(`${BASE}/auth/v1/admin/users/${uid}`, { method: "DELETE", headers: admin });
    const pasta = path.resolve(RAIZ, "..", "ASTRAL-BACKUPS", "simulacao");
    if (fs.existsSync(pasta)) for (const f of fs.readdirSync(pasta)) if (f.startsWith(uid)) fs.unlinkSync(path.join(pasta, f));
    console.log("\n  (conta descartavel revertida e apagada)");
  }
  console.log("\n" + "=".repeat(70));
  console.log(falhas ? `🔴 ${falhas} FALHA(S).` : "AS PAGINAS AGUENTAM UMA CONTA ADIANTADA — nenhuma quebrou.");
  process.exit(falhas ? 1 : 0);
})();
