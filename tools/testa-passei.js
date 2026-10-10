/* ═══════════════════════════════════════════════════════════════════════════
   TESTA-PASSEI -- o fim da jornada: "Passei!", comemoracao, depoimento PRIVADO,
   e o proximo concurso (10/10/2026 -- jornada 7 da auditoria, roadmap 3.22;
   decisao 17 dele: "Concordo")

     1. A TELA: com a prova no passado, o cartao "Prova realizada" tem o botao
        "Passei!"; ele abre a comemoracao; guardar grava a aprovacao; o cartao
        vira "Aprovado"; "Vou prestar outro concurso" leva a troca de edital
     2. PRIVADO: o depoimento grava com pode_publicar FALSO se a caixa nao for
        marcada; outro aluno NAO le a aprovacao de ninguem; visitante tambem nao
     3. LGPD: a aprovacao entra no "baixar meus dados"
     4. O DONO: o painel do negocio conta aprovados e depoimentos autorizados

   USO   ASTRAL_DEV=1 node tools/testa-passei.js   (o roda-testes ja liga)
   ═══════════════════════════════════════════════════════════════════════════ */
const { execFileSync } = require("child_process");
const crypto = require("crypto");
const fs = require("fs");
const http = require("http");
const path = require("path");
const { REF, PUB, NO_DEV, reescrever, chavesDoProjeto, onde } = require("./testes/alvo");   // 10/10/2026 (COD-02)
const BASE = `https://${REF}.supabase.co`;
const SK = chavesDoProjeto().find((k) => k.name === "service_role").api_key;
const admin = { apikey: SK, Authorization: `Bearer ${SK}`, "Content-Type": "application/json" };
const TOKEN = execFileSync("powershell", ["-NoProfile", "-File", path.join(__dirname, "token-supabase.ps1")], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
async function sql(query) {
  const r = await fetch(`https://api.supabase.com/v1/projects/${REF}/database/query`, { method: "POST", headers: { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json" }, body: JSON.stringify({ query }) });
  const t = await r.text(); if (!r.ok) throw new Error(`SQL HTTP ${r.status}: ${t.slice(0, 160)}`); return JSON.parse(t);
}
async function req(c, o = {}) { const r = await fetch(BASE + c, o); const t = await r.text(); let corpo = null; try { corpo = JSON.parse(t); } catch { corpo = t; } return { status: r.status, corpo }; }

let falhas = 0;
const ok = (t, d = "") => console.log(`  OK     ${t.padEnd(58)} ${d}`);
const falha = (t, d = "") => { console.log(`  FALHA  ${t.padEnd(58)} ${d}`); falhas++; };
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
  return { id: u.corpo.id, s, cab: { apikey: PUB, Authorization: `Bearer ${s.access_token}`, "Content-Type": "application/json" } };
}

(async () => {
  console.log(`\nTESTA-PASSEI  ${onde}\n`);
  if (!NO_DEV) { console.log("  (só no dev: cria aprovação de teste e um administrador de teste)"); return; }
  const contas = [];
  let nav = null, adminId = null;
  try {
    const aluno = await conta("passei"); contas.push(aluno.id);
    // edital com a prova ha 15 dias
    const d = new Date(Date.now() - 3 * 3600e3 - 15 * 86400000).toISOString().slice(0, 10).split("-").reverse().join("/");
    await req("/rest/v1/rpc/salvar_progresso", { method: "POST", headers: aluno.cab, body: JSON.stringify({ p_xp: 0, p_streak: 0, p_horas: 0,
      p_edital: { nome: "Teste Passei EsSA 2026", forca: "exercito", dataProva: d }, p_materias: [{ nome: "Português", peso: 50, progresso: 0 }, { nome: "Matemática", peso: 50, progresso: 0 }],
      p_cronograma_hoje: [], p_badges: [], p_tag_escolhida: null }) });
    // quem chega na prova ja respondeu a rotina -- sem ela, o questionario (3.19) abre por cima de tudo
    await req(`/rest/v1/progresso?usuario_id=eq.${aluno.id}`, { method: "PATCH", headers: { ...admin, Prefer: "return=minimal" },
      body: JSON.stringify({ rotina: { dias: [1, 2, 3, 4, 5, 6], minutosUtil: 120, minutosFds: 120, bloco: 40, respondidoEm: new Date().toISOString() } }) });

    console.log("== 1. A TELA ==");
    const npx = path.join(process.env.LOCALAPPDATA, "npm-cache", "_npx");
    let pw = null; for (const x of fs.readdirSync(npx)) { const p = path.join(npx, x, "node_modules", "playwright"); if (fs.existsSync(p)) { pw = require(p); break; } }
    if (!pw) throw new Error("playwright nao encontrado");
    await new Promise((r) => servidor.listen(PORTA, r));
    nav = await pw.chromium.launch();
    const ctx = await nav.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: "reduce" });
    await ctx.addInitScript(require("./testes/aceite-de-teste.js").SCRIPT);
    await ctx.addInitScript(`localStorage.setItem("sb-${REF}-auth-token", ${JSON.stringify(JSON.stringify({ access_token: aluno.s.access_token, refresh_token: aluno.s.refresh_token, token_type: "bearer", expires_at: Math.floor(Date.now() / 1000) + 900, user: aluno.s.user }))});`);
    await ctx.route("**/functions/v1/buscar-recursos", (r) => r.fulfill({ status: 402, contentType: "application/json", body: '{"error":"sem credito (teste)"}' }));
    const pg = await ctx.newPage();
    const erros = []; pg.on("pageerror", (e) => erros.push(e.message));
    await pg.goto(`http://localhost:${PORTA}/dashboard.html`, { waitUntil: "load" });
    const botao = await pg.waitForSelector("#prova-passei", { state: "visible", timeout: 25000 }).then(() => true).catch(() => false);
    conferir("🎯 prova no passado: o cartão tem o botão \"Passei!\"", botao);
    if (botao) {
      await pg.click("#prova-passei");
      const abriu = await pg.waitForSelector("dialog.passei[open]", { timeout: 5000 }).then(() => true).catch(() => false);
      conferir("🎯 \"Passei!\" abre a comemoração", abriu);
      const XSS = '<img src=x onerror="window.__xss=1">Valeu muito!';
      await pg.fill("#passei-depoimento", XSS);
      await pg.click("#passei-guardar");
      await pg.waitForSelector("#passei-proximo", { timeout: 8000 }).catch(() => null);
      const linhas = (await req(`/rest/v1/aprovacoes?usuario_id=eq.${aluno.id}&select=concurso,depoimento,pode_publicar`, { headers: admin })).corpo || [];
      conferir("🎯 guardar grava a aprovação", linhas.length === 1 && linhas[0].concurso === "Teste Passei EsSA 2026", JSON.stringify(linhas).slice(0, 90));
      conferir("🎯 sem marcar a caixa, o depoimento NÃO pode ser publicado", linhas[0]?.pode_publicar === false && linhas[0]?.depoimento === XSS);
      conferir("o \"E agora?\" mostra o concurso como texto", await pg.evaluate(() => !document.querySelector('dialog.passei img') && !window.__xss));
      await pg.click("#passei-fim").catch(() => {});
      await pg.waitForTimeout(800);
      const cartao = (await pg.textContent("#prova-passada").catch(() => "")).replace(/\s+/g, " ");
      conferir("🎯 o cartão vira \"Aprovado\"", /Aprovado/.test(cartao) && /Você passou em Teste Passei EsSA 2026/.test(cartao) && !(await pg.isVisible("#prova-passei")), cartao.slice(0, 70));
      // recarregar: continua aprovado (vem do banco)
      await pg.reload({ waitUntil: "load" });
      const continua = await pg.waitForFunction(() => /Aprovado/.test(document.querySelector("#prova-passada")?.textContent || ""), { timeout: 25000 }).then(() => true).catch(() => false);
      conferir("recarregou e continua aprovado", continua);
    }
    erros.length ? falha("erro de JavaScript", erros[0].slice(0, 80)) : ok("nenhum erro de JavaScript");
    await ctx.close();

    console.log("\n== 2. PRIVADO ==");
    const outro = await conta("passei-outro"); contas.push(outro.id);
    const r1 = await req(`/rest/v1/aprovacoes?select=*`, { headers: outro.cab });
    conferir("🎯 outro aluno não lê a aprovação de ninguém", Array.isArray(r1.corpo) && r1.corpo.length === 0, `HTTP ${r1.status} · ${Array.isArray(r1.corpo) ? r1.corpo.length : "?"} linha(s)`);
    const r2 = await req(`/rest/v1/aprovacoes?select=*`, { headers: { apikey: PUB } });
    conferir("visitante não lê", r2.status >= 400 || (Array.isArray(r2.corpo) && r2.corpo.length === 0), `HTTP ${r2.status}`);
    const r3 = await req(`/rest/v1/aprovacoes`, { method: "POST", headers: { ...outro.cab, Prefer: "return=minimal" }, body: JSON.stringify({ usuario_id: aluno.id, concurso: "forjado" }) });
    conferir("ninguém grava aprovação no nome de outro", r3.status >= 400, `HTTP ${r3.status}`);

    console.log("\n== 3. LGPD ==");
    const dados = (await req("/rest/v1/rpc/meus_dados", { method: "POST", headers: aluno.cab, body: "{}" })).corpo;
    conferir("🎯 a aprovação entra no \"baixar meus dados\"", Array.isArray(dados?.aprovacoes) && dados.aprovacoes.length === 1);

    console.log("\n== 4. O DONO ==");
    const dono = await conta("passei-dono"); contas.push(dono.id); adminId = dono.id;
    await sql(`insert into public.administradores (usuario_id) values ('${dono.id}') on conflict do nothing`);
    // uma aprovacao de conta "real" (dominio que nao e de teste), com depoimento autorizado
    const realEmail = `passei-real-${Date.now()}@exemplo-astral.dev`;
    const ru = await req("/auth/v1/admin/users", { method: "POST", headers: admin, body: JSON.stringify({ email: realEmail, password: "T!" + crypto.randomUUID() + "a1", email_confirm: true }) });
    contas.push(ru.corpo.id);
    const antes = (await req("/rest/v1/rpc/painel_de_negocio", { method: "POST", headers: dono.cab, body: JSON.stringify({ p_dias: 30 }) })).corpo;
    await req("/rest/v1/aprovacoes", { method: "POST", headers: { ...admin, Prefer: "return=minimal" }, body: JSON.stringify({ usuario_id: ru.corpo.id, concurso: "Real", depoimento: "Ajudou demais.", pode_publicar: true }) });
    const depois = (await req("/rest/v1/rpc/painel_de_negocio", { method: "POST", headers: dono.cab, body: JSON.stringify({ p_dias: 30 }) })).corpo;
    conferir("🎯 o painel conta aprovados e depoimentos autorizados (só contas reais)",
      depois?.aprovados === (antes?.aprovados || 0) + 1 && depois?.depoimentos_autorizados === (antes?.depoimentos_autorizados || 0) + 1,
      `aprovados ${antes?.aprovados}→${depois?.aprovados} · autorizados ${antes?.depoimentos_autorizados}→${depois?.depoimentos_autorizados}`);
  } catch (e) {
    falha("o teste quebrou", e.message.slice(0, 140));
  } finally {
    if (nav) await nav.close();
    servidor.close();
    if (adminId) await sql(`delete from public.administradores where usuario_id = '${adminId}'`).catch(() => {});
    for (const id of contas) await req(`/auth/v1/admin/users/${id}`, { method: "DELETE", headers: admin });
    console.log("\n  (contas de teste apagadas -- as aprovações saem junto, em cascata)");
    console.log("\n" + "=".repeat(70));
    console.log(falhas === 0 ? "QUEM PASSA COMEMORA, O DEPOIMENTO É DELE, E A CONTA SEGUE." : `🔴 ${falhas} FALHA(S).`);
    process.exitCode = falhas ? 1 : 0;
  }
})();
