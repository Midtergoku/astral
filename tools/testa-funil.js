/* ═══════════════════════════════════════════════════════════════════════════
   TESTA-FUNIL -- o funil marca cada etapa uma vez, e a origem chega certa?
   (03/10/2026 -- auditoria NEG-01, roadmap 2.14)

   Cria uma conta, entra pela pagina inicial com ?utm_source=..., e confere no
   banco: cadastro -> origem -> edital -> rotina -> 1a sessao, cada uma UMA vez;
   ninguem le nem grava o funil de ninguem; a origem so aceita as chaves
   conhecidas e vale a PRIMEIRA.

   USO   node tools/testa-funil.js                (producao)
         ASTRAL_DEV=1 node tools/testa-funil.js   (astral-dev)
   Nao gasta credito. Cria 2 contas de teste e as apaga no fim.
   ═══════════════════════════════════════════════════════════════════════════ */
const { execSync } = require("child_process");
const fs = require("fs");
const http = require("http");
const path = require("path");

const NO_DEV = process.env.ASTRAL_DEV === "1";
const PROD = "jjogmcacbdefwiwcyjxp";
const REF = NO_DEV ? "vtluuezwfpqgryixaaea" : PROD;
const BASE = `https://${REF}.supabase.co`;
const RAIZ = path.resolve(__dirname, "..");
const CHAVES = JSON.parse(execSync(`supabase projects api-keys --project-ref ${REF} -o json`, { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }));
const SK = CHAVES.find((k) => k.name === "service_role").api_key;
const PUB_PROD = (fs.readFileSync(path.join(RAIZ, "assets/js/astral.js"), "utf8").match(/sb_publishable_[A-Za-z0-9_-]+/) || [])[0];
const PUB = NO_DEV ? (CHAVES.find((k) => k.type === "publishable") || CHAVES.find((k) => k.name === "anon")).api_key : PUB_PROD;
const admin = { apikey: SK, Authorization: `Bearer ${SK}`, "Content-Type": "application/json" };
async function req(c, o = {}) { const r = await fetch(BASE + c, o); const t = await r.text(); let corpo = null; try { corpo = JSON.parse(t); } catch { corpo = t; } return { status: r.status, corpo }; }

let falhas = 0;
const ok = (t, d = "") => console.log(`  OK     ${t.padEnd(62)} ${d}`);
const falha = (t, d = "") => { console.log(`  FALHA  ${t.padEnd(62)} ${d}`); falhas++; };

const tipos = { ".html": "text/html", ".css": "text/css", ".js": "text/javascript", ".woff2": "font/woff2", ".svg": "image/svg+xml" };
const PORTA = 5177;
const servidor = http.createServer((q, r) => {
  const u = decodeURIComponent(q.url.split("?")[0]); const a = path.join(RAIZ, u === "/" ? "index.html" : u);
  if (!fs.existsSync(a) || fs.statSync(a).isDirectory()) { r.writeHead(404); return r.end(); }
  let corpo = fs.readFileSync(a);
  if (NO_DEV && /\.(js|html)$/.test(a)) corpo = corpo.toString("utf8").split(PROD).join(REF).split(PUB_PROD).join(PUB);
  r.writeHead(200, { "Content-Type": tipos[path.extname(a)] || "text/plain" }); r.end(corpo);
});

(async () => {
  const contas = [];
  const criar = async (p) => {
    const email = `funil-${p}-${Date.now()}@astral-teste.local`;
    const c = await req("/auth/v1/admin/users", { method: "POST", headers: admin, body: JSON.stringify({ email, password: "T!" + crypto.randomUUID(), email_confirm: true }) });
    contas.push(c.corpo.id);
    const link = await req("/auth/v1/admin/generate_link", { method: "POST", headers: admin, body: JSON.stringify({ type: "magiclink", email }) });
    const s = (await req("/auth/v1/verify", { method: "POST", headers: { apikey: PUB, "Content-Type": "application/json" }, body: JSON.stringify({ type: "magiclink", token_hash: link.corpo.hashed_token }) })).corpo;
    return { id: c.corpo.id, sessao: s, cab: { apikey: PUB, Authorization: `Bearer ${s.access_token}`, "Content-Type": "application/json" } };
  };
  const etapas = async (id) => (await req(`/rest/v1/funil?usuario_id=eq.${id}&select=etapa,origem`, { headers: admin })).corpo || [];
  let nav = null;
  try {
    console.log(`\nTESTA-FUNIL  [${NO_DEV ? "DESENVOLVIMENTO" : "PRODUCAO"}]\n`);
    const a = await criar("a");

    console.log("== 1. AS ETAPAS, UMA VEZ CADA ==");
    let e = await etapas(a.id);
    e.length === 1 && e[0].etapa === "cadastro" ? ok("🎯 conta nova: etapa 'cadastro' marcada pelo servidor") : falha("cadastro não marcado", JSON.stringify(e));

    console.log("\n== 2. A ORIGEM, PELO NAVEGADOR DE VERDADE ==");
    const npx = path.join(process.env.LOCALAPPDATA, "npm-cache", "_npx");
    let pw = null; for (const d of fs.readdirSync(npx)) { const p = path.join(npx, d, "node_modules", "playwright"); if (fs.existsSync(p)) { pw = require(p); break; } }
    if (!pw) falha("playwright não encontrado");
    else {
      await new Promise((r) => servidor.listen(PORTA, r));
      nav = await pw.chromium.launch();
      const ctx = await nav.newContext();
      await ctx.addInitScript(require("./testes/aceite-de-teste.js").SCRIPT);
      const pg = await ctx.newPage();
      // 1a visita: pagina inicial com UTM (sem conta ainda)
      await pg.goto(`http://localhost:${PORTA}/index.html?utm_source=teste-funil&utm_medium=story&utm_campaign=lancamento`, { waitUntil: "load" });
      await pg.waitForTimeout(1500);
      // 2a visita, outra campanha: NAO pode trocar o primeiro contato
      await pg.goto(`http://localhost:${PORTA}/index.html?utm_source=outra-coisa`, { waitUntil: "load" });
      await pg.waitForTimeout(800);
      // entra na conta
      const t = a.sessao;
      await pg.evaluate(([k, v]) => localStorage.setItem(k, v), [`sb-${REF}-auth-token`, JSON.stringify({ access_token: t.access_token, refresh_token: t.refresh_token, token_type: "bearer", expires_at: Math.floor(Date.now() / 1000) + 3600, user: t.user })]);
      await pg.goto(`http://localhost:${PORTA}/dashboard.html`, { waitUntil: "load" });
      await pg.waitForTimeout(6000);
      e = await etapas(a.id);
      const o = e.find((x) => x.etapa === "cadastro")?.origem || {};
      o.utm_source === "teste-funil" && o.utm_campaign === "lancamento" && o.pagina === "/index.html"
        ? ok("🎯 a origem da 1ª visita chegou ao funil", `${o.utm_source} · ${o.utm_medium} · ${o.utm_campaign}`)
        : falha("a origem não chegou (ou foi a da 2ª visita)", JSON.stringify(o));
    }
    const segunda = await req("/rest/v1/rpc/registrar_origem", { method: "POST", headers: a.cab, body: JSON.stringify({ p_origem: { utm_source: "trocada" } }) });
    e = await etapas(a.id);
    segunda.corpo === false && e.find((x) => x.etapa === "cadastro")?.origem?.utm_source === "teste-funil"
      ? ok("a origem vale UMA vez: a 2ª chamada não troca") : falha("a origem foi trocada", JSON.stringify(e));

    console.log("\n== 3. EDITAL, ROTINA E 1ª SESSÃO ==");
    await req("/rest/v1/rpc/salvar_progresso", { method: "POST", headers: a.cab, body: JSON.stringify({ p_xp: 0, p_streak: 0, p_horas: 0,
      p_edital: { nome: "Teste Funil", dataProva: "10/10/2027" }, p_materias: [{ nome: "Física", peso: 2, progresso: 0 }], p_cronograma_hoje: [], p_badges: [], p_tag_escolhida: null }) });
    await req(`/rest/v1/progresso?usuario_id=eq.${a.id}`, { method: "PATCH", headers: { ...a.cab, Prefer: "return=minimal" }, body: JSON.stringify({ rotina: { dias: [1, 2, 3], minutosUtil: 60, minutosFds: 60, bloco: 30 } }) });
    for (let i = 0; i < 2; i++) await req("/rest/v1/sessoes_estudo", { method: "POST", headers: { ...admin, Prefer: "return=minimal" },
      body: JSON.stringify({ usuario_id: a.id, materia: "Física", segundos: 1200, xp: 0, modo: "livre" }) });
    e = await etapas(a.id);
    const nomes = e.map((x) => x.etapa).sort();
    JSON.stringify(nomes) === JSON.stringify(["cadastro", "edital", "primeira_sessao", "rotina"])
      ? ok("🎯 as 4 etapas, cada uma UMA vez", "2 sessões = 1 'primeira_sessao'") : falha("etapas erradas", JSON.stringify(nomes));

    console.log("\n== 4. NINGUÉM MEXE NO FUNIL DE NINGUÉM ==");
    const b = await criar("b");
    const leu = await req(`/rest/v1/funil?select=etapa`, { headers: b.cab });
    const gravou = await req("/rest/v1/funil", { method: "POST", headers: { ...b.cab, Prefer: "return=minimal" }, body: JSON.stringify({ usuario_id: a.id, etapa: "edital" }) });
    leu.status >= 400 || (Array.isArray(leu.corpo) && leu.corpo.length === 0)
      ? ok("um aluno não lê o funil (nem o dele, direto)", `HTTP ${leu.status}`) : falha("aluno leu o funil", JSON.stringify(leu.corpo).slice(0, 80));
    gravou.status >= 400 ? ok("um aluno não grava no funil", `HTTP ${gravou.status}`) : falha("aluno gravou no funil", `HTTP ${gravou.status}`);
    const anon = await req("/rest/v1/rpc/registrar_origem", { method: "POST", headers: { apikey: PUB, "Content-Type": "application/json" }, body: JSON.stringify({ p_origem: { utm_source: "x" } }) });
    anon.status >= 400 ? ok("anônimo não registra origem", `HTTP ${anon.status}`) : falha("anônimo registrou origem", `HTTP ${anon.status}`);
    await req("/rest/v1/rpc/registrar_origem", { method: "POST", headers: b.cab, body: JSON.stringify({ p_origem: { utm_source: "s".repeat(500), lixo: "<script>", utm_medium: "ok" } }) });
    const ob = (await etapas(b.id)).find((x) => x.etapa === "cadastro")?.origem || {};
    !("lixo" in ob) && !("utm_source" in ob) && ob.utm_medium === "ok"
      ? ok("a origem só aceita as chaves conhecidas, texto curto", JSON.stringify(ob)) : falha("a origem aceitou lixo", JSON.stringify(ob));
  } catch (err) {
    falha("o teste quebrou", err.message.slice(0, 160));
  } finally {
    if (nav) await nav.close();
    servidor.close();
    for (const id of contas) await req(`/auth/v1/admin/users/${id}`, { method: "DELETE", headers: admin });
    console.log(`\n  (${contas.length} conta(s) de teste apagada(s))`);
    console.log("\n" + "=".repeat(78));
    console.log(falhas ? `${falhas} FALHA(S).` : "O FUNIL MARCA CADA ETAPA UMA VEZ, E A ORIGEM CHEGA CERTA.");
    process.exit(falhas ? 1 : 0);
  }
})();
