// TESTA-TOAST -- o aviso que aparece embaixo da tela ("Salvo", "Nao consegui...") e UM so, e certo?
//
// 10/10/2026 (Lote D, V2). Havia tres toasts: o do astral.js (que pedia a fonte 'Inter', nao carregada
// desde o V1, e o verde/vermelho da paleta antiga), o do painel (no canto, com um "✓" que aparecia ate
// em mensagem de ERRO) e o da conta (6 px a mostra no pe da pagina antes do primeiro aviso). Agora e um.
//
// Confere em painel, conta, login e banco: escondido de verdade antes do 1o aviso; fonte do site;
// centralizado embaixo; borda de erro diferente da de sucesso; o "✓" so no sucesso.
//   ASTRAL_RAIZ=pasta  roda contra outra copia do site (ex.: worktree do commit antigo -- tem de FALHAR)
const path = require("path"), fs = require("fs"), http = require("http");
const R = process.env.ASTRAL_RAIZ ? path.resolve(process.env.ASTRAL_RAIZ) : path.resolve(__dirname, "..");
const FERRAMENTAS = __dirname;
let pw; try { pw = require("playwright"); } catch { /* procura no cache do npx */ }
if (!pw && process.env.LOCALAPPDATA && fs.existsSync(path.join(process.env.LOCALAPPDATA, "npm-cache", "_npx"))) for (const d of fs.readdirSync(path.join(process.env.LOCALAPPDATA, "npm-cache", "_npx"))) { if (pw) break; const a = path.join(process.env.LOCALAPPDATA, "npm-cache", "_npx", d, "node_modules", "playwright"); if (fs.existsSync(a)) { pw = require(a); break; } }
const tipos = { ".html": "text/html", ".css": "text/css", ".js": "text/javascript", ".woff2": "font/woff2", ".svg": "image/svg+xml" };
const srv = http.createServer((q, r) => { const u = decodeURIComponent(q.url.split("?")[0]).replace(/^\/+/, ""); const a = path.join(R, u); if (!fs.existsSync(a) || fs.statSync(a).isDirectory()) { r.writeHead(404); return r.end(); } r.writeHead(200, { "Content-Type": tipos[path.extname(a)] || "text/plain" }); r.end(fs.readFileSync(a)); });
if (!pw) { console.log("TESTA-TOAST -- pulado: playwright nao encontrado (npx --yes playwright install chromium)"); process.exit(0); }
let falhas = 0;
const ok = (c, m) => { console.log(`${c ? "ok   " : "FALHA"} ${m}`); if (!c) falhas++; };
(async () => {
  await new Promise((r) => srv.listen(8951, r));
  const nav = await pw.chromium.launch();
  for (const pagina of ["dashboard", "conta", "login", "banco"]) {
    const ctx = await nav.newContext({ viewport: { width: 1280, height: 800 } });
    const pg = await ctx.newPage();
    await pg.addInitScript(require(path.join(FERRAMENTAS, "testes", "aceite-de-teste.js")).SCRIPT);
    if (pagina !== "login") await pg.addInitScript(`localStorage.setItem("sb-jjogmcacbdefwiwcyjxp-auth-token", JSON.stringify({access_token:"f",refresh_token:"f",token_type:"bearer",expires_at:Math.floor(Date.now()/1000)+7200,user:{id:"00000000-0000-0000-0000-000000000001",email:"t@e.com",user_metadata:{full_name:"Teste Silva"},aud:"authenticated"}}));`);
    await pg.route("**/rest/v1/**", (r) => r.fulfill({ status: 200, contentType: "application/json", body: "[]" }));
    await pg.route("**/functions/v1/**", (r) => r.fulfill({ status: 200, contentType: "application/json", body: '{"success":true,"data":{}}' }));
    await require(path.join(FERRAMENTAS, "testes", "aceite-de-teste.js")).fingirAceite(pg);
    await pg.goto(`http://localhost:8951/${pagina}.html`, { waitUntil: "load" });
    await pg.waitForTimeout(1200);
    const antes = await pg.evaluate(() => { const t = document.getElementById("toast"); if (!t) return null; const b = t.getBoundingClientRect(); return { topo: b.top, alt: innerHeight }; });
    if (antes) ok(antes.topo >= antes.alt, `${pagina}: toast escondido antes do 1o aviso (topo ${Math.round(antes.topo)} >= ${antes.alt})`);
    const medir = (tipo) => pg.evaluate(async (tipo) => {
      const m = await import("/assets/js/astral.js");
      m.toast("Mensagem de teste", tipo);
      await new Promise((r) => setTimeout(r, 450));
      const t = document.getElementById("toast"); const cs = getComputedStyle(t); const b = t.getBoundingClientRect();
      const ic = t.querySelector(".toast-icon");
      return { fonte: cs.fontFamily, centro: Math.round(b.left + b.width / 2), largura: innerWidth, base: Math.round(innerHeight - b.bottom), borda: cs.borderTopColor, icone: ic ? getComputedStyle(ic).display : "sem" };
    }, tipo);
    const s = await medir("success"), e = await medir("error");
    ok(/Source Serif/.test(s.fonte), `${pagina}: fonte ${s.fonte.slice(0, 30)}`);
    ok(Math.abs(s.centro - s.largura / 2) < 3 && s.base > 10 && s.base < 40, `${pagina}: no centro, embaixo (centro ${s.centro}/${s.largura / 2}, ${s.base}px da base)`);
    ok(s.borda !== e.borda, `${pagina}: borda de sucesso != de erro (${s.borda.slice(0, 26)} / ${e.borda.slice(0, 26)})`);
    if (s.icone !== "sem") ok(s.icone !== "none" && e.icone === "none", `${pagina}: icone ✓ no sucesso (${s.icone}) e escondido no erro (${e.icone})`);
    await ctx.close();
  }
  await nav.close(); srv.close();
  console.log(falhas ? `${falhas} FALHA(S)` : "TOAST OK NAS 4");
  process.exit(falhas ? 1 : 0);
})();
