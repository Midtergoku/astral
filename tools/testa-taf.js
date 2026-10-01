/* ═══════════════════════════════════════════════════════════════════════════
   TESTA-TAF -- o modulo de teste fisico, das regras a tela.

   POR QUE EXISTE (30/09/2026)
   Item 10 dele: "TAF: registrar corrida, barra e flexao com XP proprio;
   adaptar ao edital e a masculino/feminino; tratar concurso sem TAF".

     1. regras puras (assets/js/taf.js): indice por sexo, o digitado vence o
        lido, prova de tempo (menor e melhor), nunca indice inventado
     2. servidor: marca impossivel recusada, XP 10 por prova POR DIA (repetir
        no mesmo dia nao soma), ninguem le a marca de outra pessoa
     3. a tela: escolhe o sexo, digita o indice, registra, ve o XP e o
        "no indice"; e o concurso SEM TAF mostra o aviso

   USO   node tools/testa-taf.js      (nao gasta credito)
   ═══════════════════════════════════════════════════════════════════════════ */

const { execSync } = require("child_process");
const crypto = require("crypto");
const fs = require("fs");
const http = require("http");
const os = require("os");
const path = require("path");
const { pathToFileURL } = require("url");

const REF = "jjogmcacbdefwiwcyjxp";
const BASE = `https://${REF}.supabase.co`;
const RAIZ = path.resolve(__dirname, "..");
const PORTA = 8894;
const SK = JSON.parse(execSync(`supabase projects api-keys --project-ref ${REF} -o json`, { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }))
  .find((k) => k.name === "service_role").api_key;
const PUB = (fs.readFileSync(path.join(RAIZ, "assets/js/astral.js"), "utf8").match(/sb_publishable_[A-Za-z0-9_-]+/) || [])[0];
const admin = { apikey: SK, Authorization: `Bearer ${SK}`, "Content-Type": "application/json" };
async function req(c, o = {}) { const r = await fetch(BASE + c, o); const t = await r.text(); let corpo = null; try { corpo = JSON.parse(t); } catch { corpo = t; } return { status: r.status, corpo }; }

let falhas = 0;
const ok = (t, d = "") => console.log(`  OK     ${t.padEnd(58)} ${d}`);
const falha = (t, d = "") => { console.log(`  FALHA  ${t.padEnd(58)} ${d}`); falhas++; };

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
const tipos = { ".html": "text/html", ".css": "text/css", ".js": "text/javascript", ".woff2": "font/woff2", ".svg": "image/svg+xml", ".mjs": "text/javascript" };
const servidor = http.createServer((q, r) => {
  const u = decodeURIComponent(q.url.split("?")[0]);
  const arq = path.join(RAIZ, u === "/" ? "/index.html" : u);
  if (!path.resolve(arq).startsWith(RAIZ) || !fs.existsSync(arq) || fs.statSync(arq).isDirectory()) { r.writeHead(404); return r.end("404"); }
  r.writeHead(200, { "Content-Type": tipos[path.extname(arq)] || "text/plain" });
  r.end(fs.readFileSync(arq));
});

(async () => {
  const contas = [];
  const criar = async (p) => {
    const email = `taf-${p}-${Date.now()}@astral-teste.local`;
    const c = await req("/auth/v1/admin/users", { method: "POST", headers: admin, body: JSON.stringify({ email, password: "T!" + crypto.randomUUID(), email_confirm: true }) });
    contas.push(c.corpo.id);
    const link = await req("/auth/v1/admin/generate_link", { method: "POST", headers: admin, body: JSON.stringify({ type: "magiclink", email }) });
    const s = (await req("/auth/v1/verify", { method: "POST", headers: { apikey: PUB, "Content-Type": "application/json" }, body: JSON.stringify({ type: "magiclink", token_hash: link.corpo.hashed_token }) })).corpo;
    return { id: c.corpo.id, s, cab: { apikey: PUB, Authorization: `Bearer ${s.access_token}`, "Content-Type": "application/json" } };
  };
  let nav = null;
  try {
    console.log("\nTESTA-TAF -- o teste de aptidao fisica\n");

    console.log("== 1. AS REGRAS (assets/js/taf.js) ==");
    const T = await import(pathToFileURL(path.join(RAIZ, "assets/js/taf.js")).href);
    const taf = { existe: true, provas: [{ prova: "corrida_12min", masculino: 2400, feminino: 2000 }, { prova: "corrida_50m", masculino: 7.5, feminino: 8.5 }, { prova: "outra", masculino: 3 }] };
    T.metaDe("corrida_12min", { sexo: "f" }, taf) === 2000 && T.metaDe("corrida_12min", { sexo: "m" }, taf) === 2400
      ? ok("🎯 o índice segue o sexo", "F 2000 m · M 2400 m") : falha("indice por sexo");
    T.metaDe("corrida_12min", {}, taf) === null ? ok("sem saber o sexo, nenhum índice do edital é aplicado") : falha("aplicou indice sem sexo");
    T.metaDe("corrida_12min", { sexo: "m", metas: { corrida_12min: 2600 } }, taf) === 2600 ? ok("o índice digitado pela pessoa vence o lido") : falha("override");
    T.metaDe("barra", { sexo: "m" }, taf) === null ? ok("🎯 prova sem índice no edital: null, nunca inventado") : falha("inventou indice");
    T.situacao("corrida_50m", 7.2, 7.5).apta && !T.situacao("corrida_50m", 8, 7.5).apta ? ok("prova de tempo: menor é melhor", "7,2 s passa · 8 s não") : falha("tempo");
    JSON.stringify(T.provasDoTreino({}, taf)) === JSON.stringify(["corrida_12min", "corrida_50m"]) ? ok("as provas vêm do edital (a 'outra' fica de fora)") : falha("provas do edital", JSON.stringify(T.provasDoTreino({}, taf)));
    T.provasDoTreino({}, null).length === 4 ? ok("sem TAF no edital: as 4 clássicas") : falha("padrao");

    console.log("\n== 2. O SERVIDOR ==");
    const ana = await criar("ana"), beto = await criar("beto");
    const marcar = (c, prova, valor) => req("/rest/v1/taf_registros", { method: "POST", headers: { ...c.cab, Prefer: "return=minimal" }, body: JSON.stringify({ prova, valor }) });
    const r1 = await marcar(ana, "barra", 8);
    r1.status < 300 ? ok("marca válida registrada", `HTTP ${r1.status}`) : falha("registrar", `HTTP ${r1.status} ${JSON.stringify(r1.corpo).slice(0, 80)}`);
    const r2 = await marcar(ana, "corrida_12min", 50000);
    r2.status >= 400 ? ok("🎯 marca impossível recusada no servidor", "50 km em 12 minutos") : falha("aceitou marca impossivel");
    await marcar(ana, "barra", 9);
    await marcar(ana, "flexao", 30);
    const m = (await req("/rest/v1/rpc/meu_taf", { method: "POST", headers: ana.cab, body: "{}" })).corpo;
    m?.xp === 20 && m?.provas?.barra?.melhor === 9 && m?.provas?.barra?.registros === 2
      ? ok("🎯 XP 10 por prova por dia: barra 2x + flexão = 20", `melhor barra ${m.provas.barra.melhor}`)
      : falha("xp do taf", JSON.stringify(m).slice(0, 120));
    const r3 = await req("/rest/v1/taf_registros", { method: "POST", headers: { ...ana.cab, Prefer: "return=minimal" },
      body: JSON.stringify({ prova: "barra", valor: 5, usuario_id: beto.id }) });
    r3.status >= 400 ? ok("🎯 gravar marca em nome de outra pessoa é recusado", `HTTP ${r3.status}`) : falha("🚨 gravou no nome de outro");
    const lido = (await req("/rest/v1/taf_registros?select=*", { headers: beto.cab })).corpo;
    Array.isArray(lido) && lido.length === 0 ? ok("🎯 uma pessoa não lê as marcas de outra") : falha("🚨 vazou", JSON.stringify(lido).slice(0, 80));
    const xpEstudo = (await req(`/rest/v1/progresso?usuario_id=eq.${ana.id}&select=xp`, { headers: admin })).corpo?.[0]?.xp ?? 0;
    xpEstudo === 0 ? ok("o XP do TAF não mexe no XP de estudo (patente)") : falha("taf mexeu no xp de estudo", String(xpEstudo));

    console.log("\n== 3. A TELA ==");
    const pw = acharPlaywright();
    if (!pw) { console.log("  (playwright nao encontrado -- tela pulada)"); }
    else {
      await new Promise((r) => servidor.listen(PORTA, r));
      nav = await pw.chromium.launch();
      const abrir = async (c, largura = 1280) => {
        const ctx = await nav.newContext({ viewport: { width: largura, height: 900 } });
        await ctx.addInitScript(`localStorage.setItem("sb-${REF}-auth-token", ${JSON.stringify(JSON.stringify({ access_token: c.s.access_token, refresh_token: c.s.refresh_token, token_type: "bearer", expires_at: Math.floor(Date.now() / 1000) + 3600, user: c.s.user }))});`);
        const pg = await ctx.newPage(); const erros = [];
        pg.on("pageerror", (e) => erros.push(e.message));
        await pg.goto(`http://localhost:${PORTA}/taf.html`, { waitUntil: "load" });
        await pg.waitForTimeout(2500);
        return { pg, erros, ctx };
      };
      const { pg, erros, ctx } = await abrir(beto);
      await pg.check('input[name="sexo"][value="m"]');
      await pg.waitForTimeout(1500);
      await pg.click('[data-meta="barra"]');
      await pg.fill('[data-meta-form="barra"] input', "6");
      await pg.click('[data-meta-form="barra"] button');
      await pg.waitForTimeout(1500);
      await pg.fill('[data-registrar="barra"] input', "7");
      await pg.click('[data-registrar="barra"] button');
      await pg.waitForTimeout(2500);
      const texto = (await pg.textContent("#conteudo")).replace(/\s+/g, " ");
      /10 XP de preparo f/i.test(texto) || /\b10\b XP de preparo/i.test(texto) || /^.*?10.*XP de preparo/i.test(texto)
        ? ok("🎯 registrou pela tela e o XP físico apareceu", "10 XP") : falha("xp na tela", texto.slice(0, 120));
      /no índice/i.test(await pg.textContent('[data-prova="barra"]')) ? ok("🎯 7 barras contra índice 6: 'no índice'") : falha("selo no indice");
      const cfg = (await req(`/rest/v1/progresso?usuario_id=eq.${beto.id}&select=taf`, { headers: admin })).corpo?.[0]?.taf;
      cfg?.sexo === "m" && cfg?.metas?.barra === 6 ? ok("sexo e índice ficaram salvos na conta", JSON.stringify(cfg)) : falha("cfg nao salva", JSON.stringify(cfg));
      await pg.screenshot({ path: path.join(os.tmpdir(), "taf-1280.png"), fullPage: true });
      erros.length ? falha("erro de JavaScript", erros[0].slice(0, 80)) : ok("nenhum erro de JavaScript");
      await ctx.close();

      // Concurso sem TAF
      await req(`/rest/v1/progresso?usuario_id=eq.${ana.id}`, { method: "POST", headers: { ...admin, Prefer: "resolution=merge-duplicates,return=minimal" },
        body: JSON.stringify({ usuario_id: ana.id, edital: { nome: "Concurso Teste Sem TAF", taf: { existe: false, provas: [] } } }) });
      const sem = await abrir(ana, 390);
      const t2 = (await sem.pg.textContent("#conteudo")).replace(/\s+/g, " ");
      /não prevê TAF/i.test(t2) ? ok("🎯 concurso sem TAF: avisa, e oferece treinar mesmo assim") : falha("sem taf", t2.slice(0, 100));
      await sem.pg.screenshot({ path: path.join(os.tmpdir(), "taf-390-sem.png"), fullPage: true });
      const larg = await sem.pg.evaluate(() => document.documentElement.scrollWidth);
      larg <= 390 ? ok("no celular não vaza para o lado", `${larg}px`) : falha("vazou no celular", `${larg}px`);
      await sem.ctx.close();
    }
  } catch (e) {
    falha("erro no teste: " + e.message);
  } finally {
    if (nav) await nav.close();
    servidor.close();
    for (const id of contas) await req(`/auth/v1/admin/users/${id}`, { method: "DELETE", headers: admin });
    console.log(`\n  (${contas.length} contas descartaveis apagadas · fotos em ${os.tmpdir()})`);
  }
  console.log("\n" + "=".repeat(74));
  console.log(falhas ? `🔴 ${falhas} FALHA(S).` : "O TAF FUNCIONA: indice do edital por sexo, XP proprio, marca so de quem e.");
  process.exitCode = falhas ? 1 : 0;
})();
