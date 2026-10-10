// TESTA-GUIA-XP -- quem ainda nao ganhou XP ve COMO ganhar? (10/10/2026, pedido dele)
//
// Ele: "as vezes a pessoa nao vai nem se ligar do cronometro (...) e depois ela vai perceber que nao esta upando".
// Confere, com conta real no astral-dev:
//   - conta com edital e SEM XP: o guia "Como ganhar XP" vem ABERTO no painel, diz os 2 XP por minuto e leva ao cronometro
//   - conta COM XP: o guia vem recolhido (nao atrapalha quem ja sabe)
//   - o botao "Iniciar estudo" leva ao cronometro; o cronometro diz o caminho (▶ e Finalizar)
//   node tools/testa-guia-xp.js     (so no astral-dev; cria e apaga 2 contas)
process.env.ASTRAL_DEV = "1";
const fs = require("fs"), path = require("path"), http = require("http"), crypto = require("crypto");
const R = path.resolve(process.env.ASTRAL_RAIZ || path.join(__dirname, ".."));
const { REF, PUB, reescrever, chavesDoProjeto } = require("./testes/alvo");
const BASE = `https://${REF}.supabase.co`;
const SK = chavesDoProjeto().find((k) => k.name === "service_role").api_key;
const admin = { apikey: SK, Authorization: `Bearer ${SK}`, "Content-Type": "application/json" };
async function req(c, o = {}) { const r = await fetch(BASE + c, o); const t = await r.text(); let corpo = null; try { corpo = JSON.parse(t); } catch { corpo = t; } return { status: r.status, corpo }; }
const tipos = { ".html": "text/html", ".css": "text/css", ".js": "text/javascript", ".woff2": "font/woff2", ".svg": "image/svg+xml", ".png": "image/png" };
const PORTA = 8979;
const srv = http.createServer((q, r) => {
  const u = decodeURIComponent(q.url.split("?")[0]); const a = path.join(R, u === "/" ? "index.html" : u);
  if (!path.resolve(a).startsWith(R) || !fs.existsSync(a) || fs.statSync(a).isDirectory()) { r.writeHead(404); return r.end(); }
  r.writeHead(200, { "Content-Type": tipos[path.extname(a)] || "text/plain" }); r.end(reescrever(a, fs.readFileSync(a)));
});
let pw = null; try { pw = require("playwright"); } catch { /* cache do npx */ }
const npx = path.join(process.env.LOCALAPPDATA || "", "npm-cache", "_npx");
if (!pw && fs.existsSync(npx)) for (const d of fs.readdirSync(npx)) { const a = path.join(npx, d, "node_modules", "playwright"); if (fs.existsSync(a)) { pw = require(a); break; } }

let falhas = 0;
const ok = (t, d = "") => console.log(`  OK     ${t.padEnd(62)} ${d}`);
const falha = (t, d = "") => { console.log(`  FALHA  ${t.padEnd(62)} ${d}`); falhas++; };
const conferir = (t, c, d = "") => (c ? ok(t, d) : falha(t, d));

async function conta(rotulo, comSessoes) {
  const email = `guiaxp-${rotulo}-${Date.now()}@astral-teste.local`;
  const id = (await req("/auth/v1/admin/users", { method: "POST", headers: admin, body: JSON.stringify({ email, password: "T!" + crypto.randomUUID() + "a1", email_confirm: true }) })).corpo.id;
  const link = await req("/auth/v1/admin/generate_link", { method: "POST", headers: admin, body: JSON.stringify({ type: "magiclink", email }) });
  const s = (await req("/auth/v1/verify", { method: "POST", headers: { apikey: PUB, "Content-Type": "application/json" }, body: JSON.stringify({ type: "magiclink", token_hash: link.corpo.hashed_token }) })).corpo;
  const cab = { apikey: PUB, Authorization: `Bearer ${s.access_token}`, "Content-Type": "application/json" };
  if (comSessoes) await req("/rest/v1/sessoes_estudo", { method: "POST", headers: { ...admin, Prefer: "return=minimal" }, body: JSON.stringify([{ usuario_id: id, materia: "Português", segundos: 2400, xp: 80, modo: "livre", criado_em: new Date(Date.now() - 2 * 3600e3).toISOString() }]) });
  await req("/rest/v1/rpc/salvar_progresso", { method: "POST", headers: cab, body: JSON.stringify({ p_xp: 0, p_streak: 0, p_horas: 0, p_edital: { nome: "CBMERJ Soldado 2026", forca: "bombeiros", patenteInicial: null, dataProva: "06/12/2026" }, p_materias: [{ nome: "Português", peso: 50, questoes: 10, progresso: 0 }, { nome: "Matemática", peso: 50, questoes: 10, progresso: 0 }], p_cronograma_hoje: [], p_badges: [], p_tag_escolhida: null }) });
  await req(`/rest/v1/progresso?usuario_id=eq.${id}`, { method: "PATCH", headers: { ...admin, Prefer: "return=minimal" }, body: JSON.stringify({ rotina: { dias: [0, 1, 2, 3, 4, 5, 6], minutosUtil: 120, minutosFds: 120, bloco: 40, respondidoEm: new Date().toISOString() } }) });
  return { id, s };
}

(async () => {
  console.log("\nTESTA-GUIA-XP  astral-dev\n");
  const contas = []; let nav = null;
  try {
    if (!pw) throw new Error("playwright nao encontrado");
    const nova = await conta("nova", false); contas.push(nova);
    const veterana = await conta("vet", true); contas.push(veterana);
    await new Promise((r) => srv.listen(PORTA, r));
    nav = await pw.chromium.launch();
    const abrir = async (c, pagina) => {
      const ctx = await nav.newContext({ viewport: { width: 1280, height: 900 } });
      await ctx.addInitScript(require("./testes/aceite-de-teste.js").SCRIPT);
      await ctx.addInitScript(`localStorage.setItem("sb-${REF}-auth-token", ${JSON.stringify(JSON.stringify({ access_token: c.s.access_token, refresh_token: c.s.refresh_token, token_type: "bearer", expires_at: Math.floor(Date.now() / 1000) + 900, user: c.s.user }))});`);
      await ctx.route("**/functions/v1/buscar-recursos", (r) => r.fulfill({ status: 402, contentType: "application/json", body: '{"error":"sem credito"}' }));
      const pg = await ctx.newPage();
      await pg.goto(`http://localhost:${PORTA}/${pagina}`, { waitUntil: "load" });
      // o painel so aparece depois de ler o progresso: esperar o que se quer ver, nao um tempo fixo
      const alvo = pagina === "dashboard.html" ? "#btn-iniciar-estudo" : "#crono-dica";
      await pg.waitForFunction((sel) => document.querySelector(sel)?.offsetParent != null, alvo, { timeout: 15000 }).catch(() => {});
      await pg.waitForTimeout(800);
      return { ctx, pg };
    };
    const ler = (pg) => pg.evaluate(() => {
      const g = document.getElementById("guia-xp"), b = document.getElementById("btn-iniciar-estudo");
      return { existe: !!g, aberto: !!g?.open, visivel: !!g && g.offsetParent !== null, texto: g?.innerText || "",
        botao: b?.getAttribute("href"), botaoVisivel: !!b && b.offsetParent !== null };
    });

    console.log("== conta NOVA (edital, nenhum XP) ==");
    let { ctx, pg } = await abrir(nova, "dashboard.html");
    let r = await ler(pg);
    conferir("🎯 o guia \"Como ganhar XP\" aparece ABERTO", r.existe && r.visivel && r.aberto);
    conferir("ele diz quanto vale (2 XP por minuto) e como (Finalizar)", /2 XP/.test(r.texto) && /Finalizar sessão/.test(r.texto));
    conferir("não promete XP por questão (questão mede domínio)", /questões do Banco não dão XP/.test(r.texto));
    conferir("🎯 o botão \"Iniciar estudo\" leva ao cronômetro", r.botaoVisivel && r.botao === "cronometro.html", r.botao);
    await ctx.close();

    console.log("\n== conta com XP ==");
    ({ ctx, pg } = await abrir(veterana, "dashboard.html"));
    r = await ler(pg);
    conferir("o guia vem RECOLHIDO para quem já ganhou XP", r.existe && r.visivel && !r.aberto);
    await ctx.close();

    console.log("\n== cronômetro ==");
    ({ ctx, pg } = await abrir(nova, "cronometro.html"));
    const dica = await pg.evaluate(() => document.getElementById("crono-dica")?.innerText || "");
    conferir("🎯 o cronômetro diz o caminho (▶, Finalizar, 2 XP)", /▶/.test(dica) && /Finalizar sessão/.test(dica) && /2 XP/.test(dica), dica.slice(0, 60));
    await ctx.close();
  } catch (e) {
    falha("o teste quebrou", e.message.slice(0, 140));
  } finally {
    if (nav) await nav.close();
    srv.close();
    for (const c of contas) await req(`/auth/v1/admin/users/${c.id}`, { method: "DELETE", headers: admin });
    console.log("\n" + "=".repeat(70));
    console.log(falhas ? `🔴 ${falhas} FALHA(S).` : "QUEM AINDA NÃO GANHOU XP VÊ COMO GANHAR — E O BOTÃO LEVA AO CRONÔMETRO.");
    process.exitCode = falhas ? 1 : 0;
  }
})();
