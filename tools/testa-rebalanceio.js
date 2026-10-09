/* ═══════════════════════════════════════════════════════════════════════════
   TESTA-REBALANCEIO -- o rebalanceamento liga, desliga e acontece na hora pedida?
   (09/10/2026 -- pedido dele, roadmap 3.26)

   Ele: "um botao para desativar o rebalanceamento automatico toda segunda e um
   botao para rebalancear manualmente. E para quem nao utilizar esse botao, um
   aviso que toda segunda ele rebalanceia."

   O cronograma usa o RETRATO do dominio (medida.semana). A conta estuda NESTA semana
   uma materia sem Banco (o dominio dela vem do tempo):
     1. automatico (padrao): o retrato e o de segunda -- sem o estudo desta semana
     2. "Rebalancear agora": o retrato passa a ter o estudo desta semana
     3. desligado com o ultimo ajuste ANTES do estudo: o retrato fica congelado nele
     4. data malformada nao quebra nada (vale a segunda)
     5. na tela: o aviso "toda segunda", e a chave grava a escolha

   USO   node tools/testa-rebalanceio.js                (producao: servidor + tela)
         ASTRAL_DEV=1 node tools/testa-rebalanceio.js   (astral-dev: so o servidor)
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
const pular = (t, d = "") => console.log(`  --     ${t.padEnd(62)} ${d}`);

const MAT = "Matéria Sem Banco Rebal";   // sem questoes no acervo: o dominio vem do tempo estudado

(async () => {
  console.log(`\nTESTA-REBALANCEIO  ${NO_DEV ? "astral-dev" : "producao"}\n`);
  // a segunda 00h em Sao Paulo
  const agoraSP = new Date(Date.now() - 3 * 3600000);
  const dow = (agoraSP.getUTCDay() + 6) % 7;   // 0 = segunda
  const segunda = new Date(Date.UTC(agoraSP.getUTCFullYear(), agoraSP.getUTCMonth(), agoraSP.getUTCDate() - dow) + 3 * 3600000);
  if (Date.now() - segunda.getTime() < 3 * 3600000) { pular("o teste precisa de 3 h depois da meia-noite de segunda", "rode mais tarde"); process.exit(0); }

  let uid = null;
  try {
    const email = `rebal-${Date.now()}@astral-teste.local`;
    uid = (await req("/auth/v1/admin/users", { method: "POST", headers: admin, body: JSON.stringify({ email, password: "T!" + crypto.randomUUID(), email_confirm: true }) })).corpo.id;
    const link = await req("/auth/v1/admin/generate_link", { method: "POST", headers: admin, body: JSON.stringify({ type: "magiclink", email }) });
    const s = (await req("/auth/v1/verify", { method: "POST", headers: { apikey: PUB, "Content-Type": "application/json" }, body: JSON.stringify({ type: "magiclink", token_hash: link.corpo.hashed_token }) })).corpo;
    const cab = { apikey: PUB, Authorization: `Bearer ${s.access_token}`, "Content-Type": "application/json" };
    const materias = [{ nome: MAT, peso: 50, progresso: 0 }, { nome: "Outra Sem Banco Rebal", peso: 50, progresso: 0 }];
    await req("/rest/v1/rpc/salvar_progresso", { method: "POST", headers: cab, body: JSON.stringify({ p_xp: 0, p_streak: 0, p_horas: 0,
      p_edital: { nome: "Teste Rebal", forca: "exercito", patenteInicial: null, hash: "e".repeat(64) }, p_materias: materias, p_cronograma_hoje: [], p_badges: [], p_tag_escolhida: null }) });
    // 2 h de estudo NESTA semana (1 h depois da segunda 00h)
    await req("/rest/v1/sessoes_estudo", { method: "POST", headers: { ...admin, Prefer: "return=minimal" },
      body: JSON.stringify([{ usuario_id: uid, materia: MAT, segundos: 7200, xp: 240, modo: "livre", criado_em: new Date(segunda.getTime() + 3 * 3600000).toISOString() }]) });
    // grava a rotina como a tela grava (PATCH na coluna da pessoa) e le o retrato que o servidor fez
    const rotinaBase = { dias: [1, 2, 3, 4, 5, 6], minutosUtil: 120, minutosFds: 120, bloco: 40 };
    const gravarRotina = async (extra) => {
      const r = await req(`/rest/v1/progresso?usuario_id=eq.${uid}`, { method: "PATCH", headers: { ...cab, Prefer: "return=minimal" }, body: JSON.stringify({ rotina: { ...rotinaBase, ...extra } }) });
      if (r.status >= 300) throw new Error("nao gravou a rotina: " + JSON.stringify(r.corpo).slice(0, 120));
      const m = (await req(`/rest/v1/progresso?usuario_id=eq.${uid}&select=materias`, { headers: admin })).corpo[0].materias.find((x) => x.nome === MAT);
      return { agora: Number(m?.progresso), semana: Number(m?.medida?.semana) };
    };

    const a = await gravarRotina({});
    a.agora > 0 && a.semana === 0 ? ok("🎯 automático: o retrato é o de segunda (sem o estudo desta semana)", `domínio agora ${a.agora}, retrato ${a.semana}`)
      : falha("o retrato automatico nao e o de segunda", JSON.stringify(a));
    const b = await gravarRotina({ rebalanceio: { auto: true, em: new Date().toISOString() } });
    b.semana === b.agora && b.semana > 0 ? ok("🎯 \"Rebalancear agora\": o retrato passa a ter esta semana", `retrato ${b.semana} = domínio ${b.agora}`)
      : falha("o \"agora\" nao mudou o retrato", JSON.stringify(b));
    const c = await gravarRotina({ rebalanceio: { auto: false, em: new Date(segunda.getTime() + 3600000).toISOString() } });
    c.semana === 0 ? ok("🎯 desligado: o retrato fica congelado no último ajuste", `ajuste antes do estudo → retrato ${c.semana}`)
      : falha("desligado nao congelou", JSON.stringify(c));
    const d = await gravarRotina({ rebalanceio: { auto: "talvez", em: "não é data" } });
    Number.isFinite(d.semana) && d.semana === 0 ? ok("data malformada não quebra nada (vale a segunda)", `retrato ${d.semana}`) : falha("data malformada quebrou", JSON.stringify(d));
    await gravarRotina({});   // de volta ao padrao para a tela

    if (!NO_DEV) {
      const npx = path.join(process.env.LOCALAPPDATA || "", "npm-cache", "_npx");
      let pw = null; if (fs.existsSync(npx)) for (const x of fs.readdirSync(npx)) { const p = path.join(npx, x, "node_modules", "playwright"); if (fs.existsSync(p)) { pw = require(p); break; } }
      if (!pw) falha("playwright nao encontrado");
      else {
        const tipos = { ".html": "text/html", ".css": "text/css", ".js": "text/javascript", ".woff2": "font/woff2", ".svg": "image/svg+xml", ".png": "image/png", ".ico": "image/x-icon", ".webmanifest": "application/manifest+json" };
        const srv = http.createServer((q, r) => { const u = decodeURIComponent(q.url.split("?")[0]); const f = path.join(RAIZ, u === "/" ? "index.html" : u); if (!fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404); return r.end(); } r.writeHead(200, { "Content-Type": tipos[path.extname(f)] || "text/plain" }); r.end(fs.readFileSync(f)); });
        await new Promise((r) => srv.listen(5173, r));
        const nav = await pw.chromium.launch();
        try {
          const ctx = await nav.newContext({ viewport: { width: 1280, height: 900 } });
          await ctx.addInitScript(require("./testes/aceite-de-teste.js").SCRIPT);
          await ctx.route("**/functions/v1/registrar-erro", (r) => r.fulfill({ status: 204, body: "" }));
          await ctx.addInitScript(`localStorage.setItem("sb-${REF}-auth-token", ${JSON.stringify(JSON.stringify({ access_token: s.access_token, refresh_token: s.refresh_token, token_type: "bearer", expires_at: Math.floor(Date.now() / 1000) + 3600, user: s.user }))});`);
          const pg = await ctx.newPage();
          const erros = []; pg.on("pageerror", (e) => erros.push(e.message));
          await pg.goto("http://localhost:5173/cronograma.html", { waitUntil: "load" });
          await pg.waitForSelector("#rebal-auto", { timeout: 25000 }).catch(() => {});
          const aviso = (await pg.textContent(".rebal").catch(() => "")) || "";
          /Toda segunda o cronograma se rebalanceia/.test(aviso) ? ok("🎯 a tela avisa: \"toda segunda o cronograma se rebalanceia\"") : falha("sem o aviso de segunda", aviso.slice(0, 80));
          await pg.click("#rebal-auto");
          await pg.waitForFunction(() => /desligado/.test(document.querySelector(".rebal")?.textContent || ""), null, { timeout: 15000 }).catch(() => {});
          const rb = (await req(`/rest/v1/progresso?usuario_id=eq.${uid}&select=rotina`, { headers: admin })).corpo[0].rotina?.rebalanceio;
          rb && rb.auto === false && rb.em ? ok("🎯 desligar pela tela grava a escolha", `auto=false, em ${rb.em.slice(0, 16)}`) : falha("a chave nao gravou", JSON.stringify(rb));
          /desligado/.test((await pg.textContent(".rebal")) || "") ? ok("e a tela passa a dizer que está desligado") : falha("o texto nao mudou");
          await pg.click("#rebal-agora");
          await pg.waitForTimeout(3000);
          const rb2 = (await req(`/rest/v1/progresso?usuario_id=eq.${uid}&select=rotina`, { headers: admin })).corpo[0].rotina?.rebalanceio;
          rb2 && rb2.auto === false && rb2.em > rb.em ? ok("\"Rebalancear agora\" pela tela grava um ajuste novo", "e o automático continua desligado") : falha("o botao nao gravou", JSON.stringify(rb2));
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
    console.log(falhas === 0 ? "O REBALANCEAMENTO LIGA, DESLIGA E ACONTECE QUANDO A PESSOA PEDE." : `🔴 ${falhas} FALHA(S).`);
    process.exit(falhas ? 1 : 0);
  }
})();
