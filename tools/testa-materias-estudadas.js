/* ═══════════════════════════════════════════════════════════════════════════
   TESTA-MATERIAS-ESTUDADAS -- a lista das materias do edital diz o que ja foi estudado,
   com os assuntos (submaterias) de cada uma?
   (09/10/2026 -- pedido dele, roadmap 3.27)

   Ele: "uma lista das materias para sinalizar se ja foram estudadas ou nao, talvez no
   dashboard, para indicar o progresso no edital, com as materias e as submaterias dela."

   Uma conta com 3 materias: Portugues (estuda 1 h e responde 1 questao), Matematica
   (nada) e uma materia sem Banco. Confere:
     1. o servidor (materias_estudadas): Portugues estudada, com o assunto da questao
        respondida marcado; Matematica nao estudada, com os assuntos listados; a materia
        sem Banco sem assuntos; e NENHUM gabarito na resposta (3.12)
     2. a pagina Progresso: "1 de 3 materias ja estudadas" e os assuntos ao abrir
     3. o painel: o cartao "Cobertura do edital" diz "1 de 3"

   USO   node tools/testa-materias-estudadas.js                (producao: servidor + telas)
         ASTRAL_DEV=1 node tools/testa-materias-estudadas.js   (astral-dev: so o servidor)
   Nao gasta credito. Cria uma conta de teste e apaga no fim.
   ═══════════════════════════════════════════════════════════════════════════ */
const { execSync } = require("child_process");
const crypto = require("crypto");
const fs = require("fs");
const http = require("http");
const path = require("path");

const NO_DEV = process.env.ASTRAL_DEV === "1";
const REF = NO_DEV ? "vtluuezwfpqgryixaaea" : "jjogmcacbdefwiwcyjxp";
const BASE = `https://${REF}.supabase.co`;
const RAIZ = process.env.ASTRAL_RAIZ ? path.resolve(process.env.ASTRAL_RAIZ) : path.resolve(__dirname, "..");
const CHAVES = JSON.parse(execSync(`supabase projects api-keys --project-ref ${REF} -o json`, { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }));
const SK = CHAVES.find((k) => k.name === "service_role").api_key;
const PUB = NO_DEV ? (CHAVES.find((k) => k.type === "publishable") || CHAVES.find((k) => k.name === "anon")).api_key
  : (fs.readFileSync(path.join(RAIZ, "assets/js/astral.js"), "utf8").match(/sb_publishable_[A-Za-z0-9_-]+/) || [])[0];
const admin = { apikey: SK, Authorization: `Bearer ${SK}`, "Content-Type": "application/json" };
async function req(c, o = {}) { const r = await fetch(BASE + c, o); const t = await r.text(); let corpo = null; try { corpo = JSON.parse(t); } catch { corpo = t; } return { status: r.status, corpo }; }

let falhas = 0;
const ok = (t, d = "") => console.log(`  OK     ${t.padEnd(62)} ${d}`);
const falha = (t, d = "") => { console.log(`  FALHA  ${t.padEnd(62)} ${d}`); falhas++; };
const SEM_BANCO = "Legislação Sem Banco Teste";

(async () => {
  console.log(`\nTESTA-MATERIAS-ESTUDADAS  ${NO_DEV ? "astral-dev" : "producao"}\n`);
  let uid = null;
  try {
    const email = `materias-${Date.now()}@astral-teste.local`;
    uid = (await req("/auth/v1/admin/users", { method: "POST", headers: admin, body: JSON.stringify({ email, password: "T!" + crypto.randomUUID(), email_confirm: true }) })).corpo.id;
    const link = await req("/auth/v1/admin/generate_link", { method: "POST", headers: admin, body: JSON.stringify({ type: "magiclink", email }) });
    const s = (await req("/auth/v1/verify", { method: "POST", headers: { apikey: PUB, "Content-Type": "application/json" }, body: JSON.stringify({ type: "magiclink", token_hash: link.corpo.hashed_token }) })).corpo;
    const cab = { apikey: PUB, Authorization: `Bearer ${s.access_token}`, "Content-Type": "application/json" };
    const rpc = (nome, corpo = {}) => req(`/rest/v1/rpc/${nome}`, { method: "POST", headers: cab, body: JSON.stringify(corpo) });
    const materias = [{ nome: "Português", peso: 40, progresso: 0 }, { nome: "Matemática", peso: 40, progresso: 0 }, { nome: SEM_BANCO, peso: 20, progresso: 0 }];
    await rpc("salvar_progresso", { p_xp: 0, p_streak: 0, p_horas: 0, p_edital: { nome: "Teste Materias", forca: "exercito", patenteInicial: null, hash: "a".repeat(64) },
      p_materias: materias, p_cronograma_hoje: [], p_badges: [], p_tag_escolhida: null });
    await req("/rest/v1/sessoes_estudo", { method: "POST", headers: { ...admin, Prefer: "return=minimal" },
      body: JSON.stringify([{ usuario_id: uid, materia: "Português", segundos: 3600, xp: 120, modo: "livre", criado_em: new Date(Date.now() - 86400000).toISOString() }]) });
    // uma questao de Portugues COM assunto, servida e respondida pela conta
    const sorteio = (await rpc("sortear_questoes", { p_materia: "Português", p_limite: 10 })).corpo;
    const q = (sorteio?.questoes || []).find((x) => x.assunto);
    if (!q) throw new Error("o sorteio nao trouxe questao de Portugues com assunto");
    await rpc("registrar_resposta", { p_origem: "acervo", p_id: q.id, p_letra: "a" });
    await rpc("salvar_progresso", { p_xp: 0, p_streak: 0, p_horas: 0, p_edital: null, p_materias: materias, p_cronograma_hoje: [], p_badges: [], p_tag_escolhida: null });

    // 1. o servidor
    const r = await rpc("materias_estudadas");
    const lista = Array.isArray(r.corpo) ? r.corpo : [];
    const por = (n) => lista.find((m) => m.nome === n) || {};
    const pt = por("Português"), mt = por("Matemática"), lg = por(SEM_BANCO);
    lista.length === 3 ? ok("o servidor devolve as 3 matérias do edital, na ordem", lista.map((m) => m.nome).join(", ")) : falha("lista errada", `HTTP ${r.status} ${JSON.stringify(r.corpo).slice(0, 120)}`);
    pt.minutos === 60 && pt.respondidas >= 1 ? ok("🎯 Português: estudada (1 h e 1 questão)", `${pt.minutos} min, ${pt.respondidas} questão`) : falha("Portugues nao aparece estudada", JSON.stringify(pt).slice(0, 140));
    const aq = (pt.assuntos || []).find((a) => a.nome === q.assunto);
    aq && aq.respondidas === 1 && aq.acervo >= 1 ? ok("🎯 o assunto da questão respondida aparece visto", `${q.assunto}: ${aq.respondidas} de ${aq.acervo}`) : falha("o assunto respondido nao aparece", JSON.stringify(aq));
    (mt.minutos || 0) === 0 && (mt.respondidas || 0) === 0 && (mt.assuntos || []).length > 0 && mt.assuntos.every((a) => a.respondidas === 0)
      ? ok("🎯 Matemática: ainda não estudada, com os assuntos listados", `${mt.assuntos.length} assuntos, nenhum visto`) : falha("Matematica errada", JSON.stringify(mt).slice(0, 140));
    Array.isArray(lg.assuntos) && lg.assuntos.length === 0 ? ok("a matéria sem Banco não inventa assunto") : falha("materia sem Banco com assunto", JSON.stringify(lg).slice(0, 120));
    !/gabarito|explicacao|enunciado/.test(JSON.stringify(r.corpo)) ? ok("🎯 só contagens: nenhum gabarito, enunciado ou explicação") : falha("a lista entrega conteudo de questao");
    const anon = await req("/rest/v1/rpc/materias_estudadas", { method: "POST", headers: { apikey: PUB, "Content-Type": "application/json" }, body: "{}" });
    anon.status >= 400 ? ok("sem login, recusado", `HTTP ${anon.status}`) : falha("anonimo leu a lista", `HTTP ${anon.status}`);

    // 2 e 3. as telas
    if (!NO_DEV) {
      const npx = path.join(process.env.LOCALAPPDATA || "", "npm-cache", "_npx");
      let pw = null; if (fs.existsSync(npx)) for (const x of fs.readdirSync(npx)) { const p = path.join(npx, x, "node_modules", "playwright"); if (fs.existsSync(p)) { pw = require(p); break; } }
      if (!pw) falha("playwright nao encontrado");
      else {
        const tipos = { ".html": "text/html", ".css": "text/css", ".js": "text/javascript", ".woff2": "font/woff2", ".svg": "image/svg+xml", ".png": "image/png", ".ico": "image/x-icon", ".webmanifest": "application/manifest+json" };
        const srv = http.createServer((qq, rr) => { const u = decodeURIComponent(qq.url.split("?")[0]); const f = path.join(RAIZ, u === "/" ? "index.html" : u); if (!fs.existsSync(f) || fs.statSync(f).isDirectory()) { rr.writeHead(404); return rr.end(); } rr.writeHead(200, { "Content-Type": tipos[path.extname(f)] || "text/plain" }); rr.end(fs.readFileSync(f)); });
        await new Promise((res) => srv.listen(5173, res));
        const nav = await pw.chromium.launch();
        try {
          const ctx = await nav.newContext({ viewport: { width: 390, height: 844 } });
          await ctx.addInitScript(require("./testes/aceite-de-teste.js").SCRIPT);
          await ctx.route("**/functions/v1/registrar-erro", (rt) => rt.fulfill({ status: 204, body: "" }));
          await ctx.route("**/functions/v1/buscar-recursos", (rt) => rt.fulfill({ status: 402, contentType: "application/json", body: '{"error":"sem credito (teste)"}' }));
          await ctx.addInitScript(`localStorage.setItem("sb-${REF}-auth-token", ${JSON.stringify(JSON.stringify({ access_token: s.access_token, refresh_token: s.refresh_token, token_type: "bearer", expires_at: Math.floor(Date.now() / 1000) + 3600, user: s.user }))});`);
          const pg = await ctx.newPage();
          const erros = []; pg.on("pageerror", (e) => erros.push(e.message));
          await pg.goto("http://localhost:5173/progresso.html", { waitUntil: "load" });
          await pg.waitForSelector("#g-edital:not([hidden])", { timeout: 25000 }).catch(() => {});
          const txt = (await pg.innerText("#g-edital").catch(() => "")).replace(/\s+/g, " ");
          /1 de 3 matérias já estudadas/.test(txt) ? ok("🎯 Progresso: \"1 de 3 matérias já estudadas\"") : falha("Progresso sem a contagem", txt.slice(0, 100));
          await pg.click("#g-edital details:first-of-type summary").catch(() => {});
          const aberto = (await pg.innerText("#g-edital details[open]").catch(() => "")).replace(/\s+/g, " ");
          aberto.includes(q.assunto) ? ok("abrir Português mostra os assuntos", `"${q.assunto}" visto`) : falha("os assuntos nao aparecem ao abrir", aberto.slice(0, 100));
          const largura = await pg.evaluate(() => document.documentElement.scrollWidth);
          largura <= 390 ? ok("cabe no celular de 390 px", `${largura}px`) : falha("rola para o lado", `${largura}px`);
          await pg.goto("http://localhost:5173/dashboard.html", { waitUntil: "load" });
          await pg.waitForFunction(() => /matérias já estudadas/.test(document.getElementById("progresso-resumo")?.innerText || ""), null, { timeout: 25000 }).catch(() => {});
          const painel = (await pg.innerText("#progresso-resumo").catch(() => "")).replace(/\s+/g, " ");
          /1 de 3 matérias já estudadas/.test(painel) ? ok("🎯 painel: \"1 de 3 matérias já estudadas\"") : falha("o painel nao diz quantas", painel.slice(-90));
          erros.length ? falha("erro de JavaScript", erros[0].slice(0, 100)) : ok("nenhum erro de JavaScript");
        } finally { await nav.close(); srv.close(); }
      }
    }
  } catch (e) {
    falha("o teste quebrou", String(e.message || e).slice(0, 160));
  } finally {
    if (uid) await req(`/auth/v1/admin/users/${uid}`, { method: "DELETE", headers: admin });
    console.log("\n  (conta de teste apagada)");
    console.log("\n" + "=".repeat(70));
    console.log(falhas === 0 ? "A LISTA DO EDITAL DIZ O QUE JÁ FOI ESTUDADO — MATÉRIA E ASSUNTO." : `🔴 ${falhas} FALHA(S).`);
    process.exit(falhas ? 1 : 0);
  }
})();
