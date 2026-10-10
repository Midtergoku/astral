// FOTO-TELA -- fotografa as telas do app como um aluno de verdade as ve, com dado de verdade.
//
// 10/10/2026 (Lote D, V6). Para olhar o design de uma tela e preciso dado: com o banco fingido
// (lista vazia) a ficha, o grafico, as condecoracoes e a Instrucao so dizem "carregando" ou
// "nao consegui". Aqui uma conta NOVA no astral-dev estuda 30 dias (sessoes, respostas no Banco,
// edital de bombeiro, rotina), a tela abre logada, a foto sai, e a conta e APAGADA no fim.
//
// SO NO DEV -- recusa a producao (cria e apaga conta).
//   node tools/foto-tela.js                         todas as telas com barra lateral, 1280 e 375
//   node tools/foto-tela.js dashboard conquistas    so essas
//   ... --pasta C:\saida   (padrao: %TEMP%\astral-fotos)   --so 375 | --so 1280
//
// Nao gasta credito: a busca do guia (IA) e respondida "sem credito" antes de sair do navegador.
process.env.ASTRAL_DEV = "1";
const fs = require("fs");
const os = require("os");
const path = require("path");
const http = require("http");
const crypto = require("crypto");
const { REF, PUB, DEV, reescrever, chavesDoProjeto } = require("./testes/alvo");
if (REF !== DEV) { console.log("FOTO-TELA -- so roda no astral-dev."); process.exit(1); }

const args = process.argv.slice(2);
const opcao = (n) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : null; };
const PASTA = opcao("--pasta") || path.join(os.tmpdir(), "astral-fotos");
const SO = opcao("--so");
const RAIZ = path.resolve(__dirname, "..");
const pedidas = args.filter((a, i) => !a.startsWith("--") && !(i > 0 && args[i - 1].startsWith("--")));
const PAGINAS = (pedidas.length ? pedidas.map((p) => p.replace(/\.html$/, "") + ".html")
  : fs.readdirSync(RAIZ).filter((f) => f.endsWith(".html") && /class="sidebar/.test(fs.readFileSync(path.join(RAIZ, f), "utf8")))).sort();
const LARGURAS = [1280, 375].filter((l) => !SO || String(l) === SO);

const BASE = `https://${REF}.supabase.co`;
const SK = chavesDoProjeto().find((k) => k.name === "service_role").api_key;
const admin = { apikey: SK, Authorization: `Bearer ${SK}`, "Content-Type": "application/json" };
async function req(c, o = {}) { const r = await fetch(BASE + c, o); const t = await r.text(); let corpo = null; try { corpo = JSON.parse(t); } catch { corpo = t; } return { status: r.status, corpo }; }

const tipos = { ".html": "text/html", ".css": "text/css", ".js": "text/javascript", ".mjs": "text/javascript", ".woff2": "font/woff2", ".svg": "image/svg+xml", ".png": "image/png", ".ico": "image/x-icon", ".webmanifest": "application/manifest+json" };
const PORTA = 8975;   // fora das portas da bateria (5173 e outras), para rodar junto
const servidor = http.createServer((q, r) => {
  const u = decodeURIComponent(q.url.split("?")[0]); const a = path.join(RAIZ, u === "/" ? "index.html" : u);
  if (!path.resolve(a).startsWith(RAIZ) || !fs.existsSync(a) || fs.statSync(a).isDirectory()) { r.writeHead(404); return r.end(); }
  r.writeHead(200, { "Content-Type": tipos[path.extname(a)] || "text/plain" }); r.end(reescrever(a, fs.readFileSync(a)));
});

// o aluno: bombeiro, 30 dias de estudo (com buracos), dominio desigual entre as materias
const hojeSP = new Date(Date.now() - 3 * 3600e3).toISOString().slice(0, 10);
const instante = (delta, hhmm) => { const d = new Date(hojeSP + "T12:00:00Z"); d.setUTCDate(d.getUTCDate() + delta); return new Date(`${d.toISOString().slice(0, 10)}T${hhmm}:00-03:00`).toISOString(); };
const MATERIAS = [["Português", 20], ["Matemática", 15], ["Física", 12], ["Química", 10], ["Biologia", 10], ["Legislação", 10], ["História", 8], ["Geografia", 8], ["Informática", 7]]
  .map(([nome, peso]) => ({ nome, peso, questoes: peso, progresso: 0 }));
const EDITAL = { nome: "CBMERJ Soldado 2026", forca: "bombeiros", patenteInicial: null, dataProva: "06/12/2026" };
const ROTINA = { dias: [1, 2, 3, 4, 5, 6], minutosUtil: 120, minutosFds: 120, bloco: 40, respondidoEm: new Date().toISOString() };
const RESPOSTAS = [["Português", 30, 24], ["Matemática", 20, 11], ["Legislação", 15, 13], ["Física", 10, 4]];

(async () => {
  let nav = null, uid = null;
  fs.mkdirSync(PASTA, { recursive: true });
  try {
    const email = `foto-${Date.now()}@astral-teste.local`;
    uid = (await req("/auth/v1/admin/users", { method: "POST", headers: admin, body: JSON.stringify({ email, password: "T!" + crypto.randomUUID() + "a1", email_confirm: true, user_metadata: { full_name: "Aluno Exemplo" } }) })).corpo.id;
    const link = await req("/auth/v1/admin/generate_link", { method: "POST", headers: admin, body: JSON.stringify({ type: "magiclink", email }) });
    const s = (await req("/auth/v1/verify", { method: "POST", headers: { apikey: PUB, "Content-Type": "application/json" }, body: JSON.stringify({ type: "magiclink", token_hash: link.corpo.hashed_token }) })).corpo;
    const cab = { apikey: PUB, Authorization: `Bearer ${s.access_token}`, "Content-Type": "application/json" };

    const sessoes = []; let k = 0;
    for (let d = -29; d <= 0; d++) {
      if (d % 7 === -3 || d === -12 || d === -13) continue;   // folgas e um buraco de 2 dias
      for (const h of ["19:00", "19:45"]) sessoes.push({ usuario_id: uid, materia: MATERIAS[k++ % 9].nome, segundos: 40 * 60, xp: 80, modo: "pomodoro", criado_em: instante(d, h) });
    }
    await req("/rest/v1/sessoes_estudo", { method: "POST", headers: { ...admin, Prefer: "return=minimal" }, body: JSON.stringify(sessoes) });
    for (const [mat, n, certas] of RESPOSTAS) {
      const qs = (await req(`/rest/v1/questoes?materia=eq.${encodeURIComponent(mat)}&publicada=eq.true&select=id&order=id&limit=${n}`, { headers: admin })).corpo || [];
      const linhas = qs.map((q, i) => ({ usuario_id: uid, questao_id: q.id, letra: "a", acertou: i < certas, vezes_errou: i < certas ? 0 : 1, vezes_acertou: i < certas ? 1 : 0 }));
      if (linhas.length) await req("/rest/v1/respostas", { method: "POST", headers: { ...admin, Prefer: "return=minimal" }, body: JSON.stringify(linhas) });
    }
    const gravou = await req("/rest/v1/rpc/salvar_progresso", { method: "POST", headers: cab, body: JSON.stringify({ p_xp: 0, p_streak: 0, p_horas: 0, p_edital: EDITAL, p_materias: MATERIAS, p_cronograma_hoje: [], p_badges: [], p_tag_escolhida: null }) });
    if (gravou.status >= 300) throw new Error("salvar_progresso " + gravou.status + " " + JSON.stringify(gravou.corpo).slice(0, 160));
    await req(`/rest/v1/progresso?usuario_id=eq.${uid}`, { method: "PATCH", headers: { ...admin, Prefer: "return=minimal" }, body: JSON.stringify({ rotina: ROTINA }) });
    await req("/rest/v1/rpc/sincronizar_conquistas", { method: "POST", headers: cab, body: "{}" });
    console.log(`conta de foto no astral-dev: ${sessoes.length} sessões em 30 dias, ${RESPOSTAS.length} matérias com respostas`);

    const npx = path.join(process.env.LOCALAPPDATA || "", "npm-cache", "_npx");
    let pw = null; try { pw = require("playwright"); } catch { /* cache do npx */ }
    if (!pw && fs.existsSync(npx)) for (const d of fs.readdirSync(npx)) { const p = path.join(npx, d, "node_modules", "playwright"); if (fs.existsSync(p)) { pw = require(p); break; } }
    if (!pw) throw new Error("playwright nao encontrado (npx --yes playwright install chromium)");
    await new Promise((r) => servidor.listen(PORTA, r));
    nav = await pw.chromium.launch();
    for (const pagina of PAGINAS) for (const largura of LARGURAS) {
      const movel = largura < 600;
      const ctx = await nav.newContext({ viewport: { width: largura, height: movel ? 812 : 900 }, isMobile: movel, hasTouch: movel, reducedMotion: "reduce" });
      await ctx.addInitScript(require("./testes/aceite-de-teste.js").SCRIPT);
      await ctx.addInitScript(`localStorage.setItem("sb-${REF}-auth-token", ${JSON.stringify(JSON.stringify({ access_token: s.access_token, refresh_token: s.refresh_token, token_type: "bearer", expires_at: Math.floor(Date.now() / 1000) + 900, user: s.user }))});`);
      await ctx.route("**/functions/v1/buscar-recursos", (r) => r.fulfill({ status: 402, contentType: "application/json", body: '{"error":"sem credito (foto)"}' }));
      const pg = await ctx.newPage();
      const erros = []; pg.on("pageerror", (e) => erros.push(e.message));
      await pg.goto(`http://localhost:${PORTA}/${pagina}`, { waitUntil: "load" });
      await pg.waitForTimeout(3500);
      const arq = path.join(PASTA, `${pagina.replace(".html", "")}-${largura}.png`);
      await pg.screenshot({ path: arq, fullPage: true });
      console.log(`  ${arq}${erros.length ? "   ERRO NA TELA: " + erros.join(" | ").slice(0, 160) : ""}`);
      await ctx.close();
    }
  } catch (e) {
    console.log("FOTO-TELA quebrou:", e.message.slice(0, 200));
    process.exitCode = 1;
  } finally {
    if (nav) await nav.close();
    servidor.close();
    if (uid) await req(`/auth/v1/admin/users/${uid}`, { method: "DELETE", headers: admin });
    console.log("(conta de foto apagada)");
  }
})();
