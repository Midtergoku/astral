/* ═══════════════════════════════════════════════════════════════════════════
   TESTA-TRANSFERENCIA -- trocar de edital mostra a Transferencia, e so a verdade?
   (03/10/2026 -- roadmap 3.7b, decisao dele: "nao vamos zerar a patente (...)
   mostra uma tela de transferencia")

   Uma conta no concurso da ESA (Exercito), com XP, troca para um edital da EEAR
   (Aeronautica) ja guardado -- sem IA, sem credito. A tela tem de dizer:
     - "transferido para Aeronautica como <patente equivalente>" (nao Recruta)
     - o XP de verdade, que FICA
     - as materias em comum (Portugues, Matematica) e as que comecam agora
   E subir o MESMO PDF de novo nao e transferencia nenhuma.

   USO   node tools/testa-transferencia.js     (producao; nao gasta credito)
   ═══════════════════════════════════════════════════════════════════════════ */
const { execSync } = require("child_process");
const crypto = require("crypto");
const fs = require("fs");
const http = require("http");
const os = require("os");
const path = require("path");

const REF = "jjogmcacbdefwiwcyjxp";
const BASE = `https://${REF}.supabase.co`;
const RAIZ = process.env.ASTRAL_RAIZ ? path.resolve(process.env.ASTRAL_RAIZ) : path.resolve(__dirname, "..");
const SK = JSON.parse(execSync(`supabase projects api-keys --project-ref ${REF} -o json`, { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] })).find((k) => k.name === "service_role").api_key;
const PUB = (fs.readFileSync(path.join(RAIZ, "assets/js/astral.js"), "utf8").match(/sb_publishable_[A-Za-z0-9_-]+/) || [])[0];
const admin = { apikey: SK, Authorization: `Bearer ${SK}`, "Content-Type": "application/json" };
async function req(c, o = {}) { const r = await fetch(BASE + c, o); const t = await r.text(); let corpo = null; try { corpo = JSON.parse(t); } catch { corpo = t; } return { status: r.status, corpo }; }

let falhas = 0;
const ok = (t, d = "") => console.log(`  OK     ${t.padEnd(58)} ${d}`);
const falha = (t, d = "") => { console.log(`  FALHA  ${t.padEnd(58)} ${d}`); falhas++; };

const tipos = { ".html": "text/html", ".css": "text/css", ".js": "text/javascript", ".mjs": "text/javascript", ".woff2": "font/woff2", ".svg": "image/svg+xml" };
// 5173: uma das duas portas locais que as funcoes aceitam (CORS, _shared/comum.ts)
const PORTA = 5173;
const servidor = http.createServer((q, r) => {
  const u = decodeURIComponent(q.url.split("?")[0]); const a = path.join(RAIZ, u === "/" ? "index.html" : u);
  if (!fs.existsSync(a) || fs.statSync(a).isDirectory()) { r.writeHead(404); return r.end(); }
  r.writeHead(200, { "Content-Type": tipos[path.extname(a)] || "text/plain" }); r.end(fs.readFileSync(a));
});
const dia = (n) => new Date(Date.now() - n * 86400000).toISOString();

(async () => {
  const pdf = Buffer.from(`%PDF-1.4\n% transferencia-${Date.now()}\n1 0 obj << /Type /Pages /Count 3 >> endobj\n%%EOF\n`);
  const hash = crypto.createHash("sha256").update(pdf).digest("hex");
  const pdfArq = path.join(os.tmpdir(), `astral-transferencia-${Date.now()}.pdf`);
  fs.writeFileSync(pdfArq, pdf);
  const EEAR = { concurso: "Teste Transferencia EEAR CFS", dataProva: null, forca: "aeronautica", patenteInicial: null,
    materias: [{ nome: "Língua Portuguesa", questoes: 24, peso: 25 }, { nome: "Matemática", questoes: 24, peso: 25 },
               { nome: "Física", questoes: 24, peso: 25 }, { nome: "Inglês", questoes: 24, peso: 25 }] };
  let uid = null, nav = null;
  await new Promise((r) => servidor.listen(PORTA, r));
  try {
    await req("/rest/v1/editais_lidos", { method: "POST", headers: { ...admin, Prefer: "return=minimal" }, body: JSON.stringify({ hash, resultado: EEAR, paginas: 3 }) });
    const npx = path.join(process.env.LOCALAPPDATA, "npm-cache", "_npx");
    let pw = null; for (const d of fs.readdirSync(npx)) { const p = path.join(npx, d, "node_modules", "playwright"); if (fs.existsSync(p)) { pw = require(p); break; } }
    if (!pw) throw new Error("playwright nao encontrado");

    const email = `transferencia-${Date.now()}@astral-teste.local`;
    const u = await req("/auth/v1/admin/users", { method: "POST", headers: admin, body: JSON.stringify({ email, password: "T!" + crypto.randomUUID(), email_confirm: true }) });
    uid = u.corpo.id;
    const link = await req("/auth/v1/admin/generate_link", { method: "POST", headers: admin, body: JSON.stringify({ type: "magiclink", email }) });
    const s = (await req("/auth/v1/verify", { method: "POST", headers: { apikey: PUB, "Content-Type": "application/json" }, body: JSON.stringify({ type: "magiclink", token_hash: link.corpo.hashed_token }) })).corpo;
    const cab = { apikey: PUB, Authorization: `Bearer ${s.access_token}`, "Content-Type": "application/json" };
    // Ja no concurso da ESA (Exercito), com 30 dias de estudo
    await req("/rest/v1/rpc/salvar_progresso", { method: "POST", headers: cab, body: JSON.stringify({ p_xp: 0, p_streak: 0, p_horas: 0,
      p_edital: { nome: "Teste Transferencia ESA", forca: "exercito", patenteInicial: null, hash: "a".repeat(64) },
      p_materias: [{ nome: "Português", peso: 40, progresso: 0 }, { nome: "Matemática", peso: 40, progresso: 0 }, { nome: "História", peso: 20, progresso: 0 }],
      p_cronograma_hoje: [], p_badges: [], p_tag_escolhida: null }) });
    await req(`/rest/v1/progresso?usuario_id=eq.${uid}`, { method: "PATCH", headers: admin, body: JSON.stringify({ rotina: { dias: [1, 2, 3, 4, 5, 6], minutosUtil: 120, minutosFds: 120, bloco: 40 } }) });
    await req("/rest/v1/sessoes_estudo", { method: "POST", headers: { ...admin, Prefer: "return=minimal" },
      body: JSON.stringify(Array.from({ length: 30 }, (_, i) => ({ usuario_id: uid, materia: "Matemática", segundos: 3600, xp: 120, modo: "livre", criado_em: dia(40 - i) }))) });
    // o servidor recalcula o XP ao gravar o progresso
    await req("/rest/v1/rpc/salvar_progresso", { method: "POST", headers: cab, body: JSON.stringify({ p_xp: 0, p_streak: 0, p_horas: 0, p_edital: { nome: "Teste Transferencia ESA", forca: "exercito", patenteInicial: null, hash: "a".repeat(64) },
      // a lista de novo: a mescla do servidor le "sem lista" como "sem materias"
      p_materias: [{ nome: "Português", peso: 40, progresso: 0 }, { nome: "Matemática", peso: 40, progresso: 0 }, { nome: "História", peso: 20, progresso: 0 }],
      p_cronograma_hoje: [], p_badges: [], p_tag_escolhida: null }) });
    const xpServidor = (await req(`/rest/v1/progresso?usuario_id=eq.${uid}&select=xp`, { headers: admin })).corpo?.[0]?.xp;

    nav = await pw.chromium.launch();
    const ctx = await nav.newContext({ viewport: { width: 390, height: 844 } });
    await ctx.addInitScript(require("./testes/aceite-de-teste.js").SCRIPT);
    await ctx.addInitScript(`localStorage.setItem("sb-${REF}-auth-token", ${JSON.stringify(JSON.stringify({ access_token: s.access_token, refresh_token: s.refresh_token, token_type: "bearer", expires_at: Math.floor(Date.now() / 1000) + 3600, user: s.user }))});`);
    await ctx.route("**/functions/v1/buscar-recursos", (r) => r.fulfill({ status: 402, contentType: "application/json", body: '{"error":"sem credito (teste)"}' }));
    const pg = await ctx.newPage();
    const erros = []; pg.on("pageerror", (e) => erros.push(e.message));
    await pg.goto(`http://localhost:${PORTA}/dashboard.html`, { waitUntil: "load" });
    await pg.waitForSelector("#edital-faixa:not([hidden])", { timeout: 25000 });
    await pg.waitForTimeout(1500);
    const patenteAntes = (await pg.textContent("#nivel-nome")).trim();
    console.log(`\nTESTA-TRANSFERENCIA  ${xpServidor} XP · antes: ${patenteAntes} (Exército)\n`);

    // 1. a troca
    await pg.setInputFiles("#file-input", pdfArq);
    const apareceu = await pg.waitForSelector("dialog.transferencia[open]", { timeout: 30000 }).then(() => true).catch(() => false);
    apareceu ? ok("🎯 trocar de edital mostra a tela de Transferência") : falha("a tela de Transferencia nao apareceu");
    if (apareceu) {
      const txt = (await pg.textContent("dialog.transferencia")).replace(/\s+/g, " ");
      /transferido para Aeronáutica como/.test(txt) ? ok("diz para onde: \"transferido para Aeronáutica\"", txt.match(/como [^.]+/)?.[0]) : falha("nao diz a forca nova", txt.slice(0, 120));
      const patenteNova = (txt.match(/como (.+?)\./) || [])[1] || "";
      patenteNova && !/recruta|soldado recruta/i.test(patenteNova) ? ok("a patente NÃO zera: degrau equivalente", patenteNova) : falha("a patente zerou ou nao apareceu", patenteNova);
      txt.includes(Number(xpServidor).toLocaleString("pt-BR") + " XP") ? ok("o XP que fica é o de verdade", `${Number(xpServidor).toLocaleString("pt-BR")} XP`) : falha("o XP da tela nao bate com o servidor", `${xpServidor} | ${txt.slice(0, 160)}`);
      /Língua Portuguesa/.test(txt) && /Matemática/.test(txt) && /O que os dois concursos têm/.test(txt) ? ok("matérias em comum reconhecidas (Português = Língua Portuguesa)") : falha("materias em comum nao reconhecidas", txt.slice(0, 200));
      /O que começa agora/.test(txt) && /Física/.test(txt) && /Inglês/.test(txt) && !/começa agora[^.]*Matemática/.test(txt) ? ok("o que começa agora: só as matérias novas", "Física, Inglês") : falha("lista do que comeca agora errada", txt.slice(0, 220));
      await pg.click(".transferencia-ok"); await pg.waitForTimeout(500);
      (await pg.$("dialog.transferencia")) === null ? ok("\"Entendi\" fecha a tela") : falha("a tela nao fechou");
      const largura = await pg.evaluate(() => document.documentElement.scrollWidth);
      largura <= 390 ? ok("cabe no celular de 390 px", `${largura}px`) : falha("rola para o lado", `${largura}px`);
    }

    // 2. o mesmo PDF de novo: nada de Transferencia
    await pg.setInputFiles("#file-input", pdfArq);
    await pg.waitForTimeout(9000);
    (await pg.$("dialog.transferencia")) === null ? ok("o mesmo PDF de novo não mostra Transferência") : falha("mostrou Transferencia para o mesmo edital");
    erros.length ? falha("erro de JavaScript", erros[0].slice(0, 80)) : ok("nenhum erro de JavaScript");
  } catch (e) {
    falha("o teste quebrou", e.message.slice(0, 140));
  } finally {
    if (nav) await nav.close();
    servidor.close();
    await req(`/rest/v1/editais_lidos?hash=eq.${hash}`, { method: "DELETE", headers: admin });
    if (uid) await req(`/auth/v1/admin/users/${uid}`, { method: "DELETE", headers: admin });
    fs.rmSync(pdfArq, { force: true });
    console.log("\n  (conta e edital de teste apagados)");
    console.log("\n" + "=".repeat(70));
    console.log(falhas === 0 ? "TROCAR DE EDITAL É UMA TRANSFERÊNCIA — NADA DO QUE FOI GANHO SE PERDE." : `🔴 ${falhas} FALHA(S).`);
    process.exit(falhas ? 1 : 0);
  }
})();
