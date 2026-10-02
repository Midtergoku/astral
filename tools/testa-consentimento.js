/* ═══════════════════════════════════════════════════════════════════════════
   TESTA-CONSENTIMENTO -- ninguem usa o Astral sem o aceite GRAVADO?

   POR QUE EXISTE (02/10/2026)
   Auditoria pre-lancamento, achado LGL-01 (S0): o aceite dos Termos e da
   Politica nao ficava gravado em lugar nenhum, e "Cadastrar com Google" nem
   olhava a caixa. Migration 20261002100000 + assets/js/consentimento.js.

   NO SERVIDOR
     1. a versao dos documentos (data do topo de termos.html e privacidade.html)
        e a mesma de versoes_vigentes() -- mudou o texto sem mudar a versao, falha
     2. conta nova: nao aceitou; aceite com versao VELHA e recusado; com a
        vigente, grava quando e por onde; repetir nao duplica
     3. ninguem le o aceite de outro; ninguem grava direto na tabela; anonimo nao
   NO NAVEGADOR (Playwright)
     4. quem nao aceitou ve a tela de aceite; "Aceitar" so libera com a caixa;
        aceitar grava e a tela some; na proxima pagina nao volta
     5. "Cadastrar com Google" sem a caixa marcada nao sai da pagina
     6. o aceite marcado no cadastro e gravado ao entrar (origem certa), e o de
        OUTRA conta no mesmo navegador nao vale
     7. "Sair" na tela de aceite sai da conta

   USO   node tools/testa-consentimento.js              (producao)
         ASTRAL_DEV=1 node tools/testa-consentimento.js (astral-dev)
   ═══════════════════════════════════════════════════════════════════════════ */

const { execSync } = require("child_process");
const crypto = require("crypto");
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

const MESES = { janeiro: 1, fevereiro: 2, "março": 3, abril: 4, maio: 5, junho: 6, julho: 7, agosto: 8, setembro: 9, outubro: 10, novembro: 11, dezembro: 12 };
function versaoDoDocumento(arquivo) {
  const t = fs.readFileSync(path.join(RAIZ, arquivo), "utf8");
  const m = t.match(/Última atualização:\s*(\d{1,2}) de ([a-zç]+) de (\d{4})/i);
  if (!m) return null;
  return `${m[3]}-${String(MESES[m[2].toLowerCase()]).padStart(2, "0")}-${m[1].padStart(2, "0")}`;
}

// Servidor local das paginas (as do disco), apontando para o projeto testado.
const tipos = { ".html": "text/html", ".css": "text/css", ".js": "text/javascript", ".woff2": "font/woff2", ".svg": "image/svg+xml" };
const PORTA = 5173;
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
    const email = `aceite-${p}-${Date.now()}@astral-teste.local`;
    const c = await req("/auth/v1/admin/users", { method: "POST", headers: admin, body: JSON.stringify({ email, password: "T!" + crypto.randomUUID(), email_confirm: true }) });
    contas.push(c.corpo.id);
    const link = await req("/auth/v1/admin/generate_link", { method: "POST", headers: admin, body: JSON.stringify({ type: "magiclink", email }) });
    const s = (await req("/auth/v1/verify", { method: "POST", headers: { apikey: PUB, "Content-Type": "application/json" }, body: JSON.stringify({ type: "magiclink", token_hash: link.corpo.hashed_token }) })).corpo;
    return { id: c.corpo.id, email, sessao: s, cab: { apikey: PUB, Authorization: `Bearer ${s.access_token}`, "Content-Type": "application/json" } };
  };
  const rpc = (c, f, corpo = {}) => req(`/rest/v1/rpc/${f}`, { method: "POST", headers: c.cab, body: JSON.stringify(corpo) });
  const aceites = async (id) => (await req(`/rest/v1/consentimentos?usuario_id=eq.${id}&select=origem,versao_termos,versao_politica,aceito_em`, { headers: admin })).corpo || [];

  let nav = null;
  try {
    console.log(`\nTESTA-CONSENTIMENTO -- o aceite e gravado?  [${NO_DEV ? "DESENVOLVIMENTO" : "PRODUCAO"}]\n`);

    console.log("== 1. A VERSAO DOS DOCUMENTOS E UMA SO ==");
    const a = await criar("a");
    const est = (await rpc(a, "meu_consentimento")).corpo || {};
    const v = est.vigentes || {};
    const vt = versaoDoDocumento("termos.html"), vp = versaoDoDocumento("privacidade.html");
    vt === v.termos && vp === v.politica ? ok("termos.html e privacidade.html = versoes_vigentes()", `${vt} · ${vp}`)
      : falha("documento e banco com versoes diferentes", `html ${vt}/${vp} x banco ${v.termos}/${v.politica} -- mudou o texto? mude a data nos dois`);

    console.log("\n== 2. GRAVAR O ACEITE ==");
    est.aceito === false ? ok("conta nova: ainda nao aceitou") : falha("conta nova apareceu como aceita", JSON.stringify(est).slice(0, 80));
    const velho = await rpc(a, "registrar_consentimento", { p_versao_termos: "2020-01-01", p_versao_politica: v.politica, p_origem: "tela_de_aceite" });
    velho.status >= 400 ? ok("aceite de versao VELHA e recusado", `HTTP ${velho.status}`) : falha("aceitou versao velha", JSON.stringify(velho.corpo).slice(0, 80));
    const bom = await rpc(a, "registrar_consentimento", { p_versao_termos: v.termos, p_versao_politica: v.politica, p_origem: "tela_de_aceite" });
    await rpc(a, "registrar_consentimento", { p_versao_termos: v.termos, p_versao_politica: v.politica, p_origem: "tela_de_aceite" });
    const la = await aceites(a.id);
    bom.corpo?.aceito === true && la.length === 1 && la[0].origem === "tela_de_aceite"
      ? ok("aceite vigente gravado: quem, quando, versao e por onde; repetir nao duplica", la[0].aceito_em.slice(0, 19))
      : falha("o aceite nao foi gravado direito", `${JSON.stringify(bom.corpo).slice(0, 60)} linhas=${la.length}`);

    console.log("\n== 3. NINGUEM MEXE NO ACEITE DOS OUTROS ==");
    const b = await criar("b");
    const leuDeA = await req(`/rest/v1/consentimentos?usuario_id=eq.${a.id}&select=id`, { headers: b.cab });
    (leuDeA.corpo || []).length === 0 ? ok("B nao le o aceite de A", "0 linhas") : falha("B leu o aceite de A", JSON.stringify(leuDeA.corpo));
    const direto = await req("/rest/v1/consentimentos", { method: "POST", headers: { ...b.cab, Prefer: "return=minimal" },
      body: JSON.stringify({ usuario_id: b.id, versao_termos: v.termos, versao_politica: v.politica, origem: "google" }) });
    const apagar = await req(`/rest/v1/consentimentos?usuario_id=eq.${a.id}`, { method: "DELETE", headers: { ...b.cab, Prefer: "return=representation" } });
    direto.status >= 400 && (await aceites(b.id)).length === 0 && (await aceites(a.id)).length === 1
      ? ok("ninguem grava nem apaga direto na tabela", `insert ${direto.status}, delete ${apagar.status} sem efeito`)
      : falha("deu para gravar ou apagar direto", `insert ${direto.status} delete ${apagar.status}`);
    const anon = await req("/rest/v1/rpc/registrar_consentimento", { method: "POST", headers: { apikey: PUB, "Content-Type": "application/json" },
      body: JSON.stringify({ p_versao_termos: v.termos, p_versao_politica: v.politica, p_origem: "google" }) });
    anon.status === 401 || anon.status === 403 ? ok("anonimo nao grava aceite", `HTTP ${anon.status}`) : falha("anonimo gravou aceite", `HTTP ${anon.status}`);

    console.log("\n== 4 a 7. NO NAVEGADOR ==");
    const npx = path.join(process.env.LOCALAPPDATA, "npm-cache", "_npx");
    let pw = null; for (const d of fs.readdirSync(npx)) { const p = path.join(npx, d, "node_modules", "playwright"); if (fs.existsSync(p)) { pw = require(p); break; } }
    if (!pw) { falha("playwright nao encontrado no cache do npx"); return; }
    await new Promise((r) => servidor.listen(PORTA, r));
    nav = await pw.chromium.launch();
    const contexto = async (conta, pendente = null) => {
      const ctx = await nav.newContext({ viewport: { width: 390, height: 844 } });
      const t = conta.sessao;
      // A sessao entra UMA vez por aba: senao, depois de "Sair", a tela de login
      // ganharia a sessao de volta e mandaria para o painel (o teste mentiria).
      await ctx.addInitScript(`if (!sessionStorage.getItem('sessao-posta')) { localStorage.setItem("sb-${REF}-auth-token", ${JSON.stringify(JSON.stringify({ access_token: t.access_token, refresh_token: t.refresh_token, token_type: "bearer", expires_at: Math.floor(Date.now() / 1000) + 3600, user: t.user }))}); sessionStorage.setItem('sessao-posta','1'); }`
        + (pendente ? `if (!sessionStorage.getItem('pendente-posto')) { localStorage.setItem('astral_aceite_pendente', ${JSON.stringify(JSON.stringify(pendente))}); sessionStorage.setItem('pendente-posto','1'); }` : ""));
      await ctx.route("**/functions/v1/**", (r) => r.fulfill({ status: 402, body: "{}" }));
      return ctx;
    };
    const temTela = (pg) => pg.evaluate(() => !!document.querySelector(".aceite-fundo"));

    // 4. tela de aceite
    const c = await criar("c");
    let ctx = await contexto(c);
    let pg = await ctx.newPage();
    await pg.goto(`http://localhost:${PORTA}/dashboard.html`); await pg.waitForTimeout(5000);
    const apareceu = await temTela(pg);
    const travado = await pg.evaluate(() => document.getElementById("aceite-ok")?.disabled);
    apareceu && travado ? ok("sem aceite: a tela de aceite aparece, e 'Aceitar' comeca travado") : falha("a tela de aceite nao apareceu (ou nao travou)", `tela=${apareceu} travado=${travado}`);
    if (apareceu) {
      await pg.check("#aceite-caixa"); await pg.click("#aceite-ok"); await pg.waitForTimeout(2500);
      const lc = await aceites(c.id);
      !(await temTela(pg)) && lc.length === 1 && lc[0].origem === "tela_de_aceite" ? ok("aceitar grava no servidor e a tela some", lc[0].aceito_em.slice(0, 19)) : falha("aceitar nao gravou", `linhas=${lc.length}`);
      await pg.goto(`http://localhost:${PORTA}/progresso.html`); await pg.waitForTimeout(4000);
      !(await temTela(pg)) ? ok("na proxima pagina, nao pergunta de novo") : falha("perguntou de novo depois de aceitar");
    }
    await ctx.close();

    // 5. Google sem a caixa
    ctx = await nav.newContext({ viewport: { width: 390, height: 844 } });
    let saiu = false;
    await ctx.route(/\/auth\/v1\/authorize/, (r) => { saiu = true; r.abort(); });
    pg = await ctx.newPage();
    await pg.goto(`http://localhost:${PORTA}/criar-conta.html`); await pg.waitForTimeout(2500);
    await pg.evaluate(() => window.cadastroGoogle());
    await pg.waitForTimeout(1500);
    const erroTxt = await pg.evaluate(() => document.getElementById("error-msg")?.innerText || "");
    const pend1 = await pg.evaluate(() => localStorage.getItem("astral_aceite_pendente"));
    !saiu && /Li e aceito/.test(erroTxt) && !pend1 ? ok("Google sem a caixa: nao sai da pagina e pede o aceite", erroTxt.slice(0, 45)) : falha("Google criou conta sem a caixa", `saiu=${saiu} erro="${erroTxt}"`);
    await pg.check("#consentimento");
    await pg.evaluate(() => window.cadastroGoogle()).catch(() => { /* a pagina saiu para o Google: e o esperado */ });
    await pg.waitForTimeout(1500);
    // A aba foi para o Google; o pendente fica no armazenamento do site -- le por outra aba.
    const outra = await ctx.newPage();
    await outra.goto(`http://localhost:${PORTA}/termos.html`);
    const pend2 = JSON.parse(await outra.evaluate(() => localStorage.getItem("astral_aceite_pendente")) || "null");
    saiu && pend2?.origem === "google" ? ok("com a caixa: segue para o Google com o aceite pendente marcado") : falha("com a caixa marcada nao seguiu", `saiu=${saiu} pendente=${JSON.stringify(pend2)}`);
    await ctx.close();

    // 6. pendente do cadastro: gravado na conta certa; o de outra conta nao vale
    const d = await criar("d");
    ctx = await contexto(d, { origem: "google", email: null, em: Date.now() });
    pg = await ctx.newPage(); await pg.goto(`http://localhost:${PORTA}/dashboard.html`); await pg.waitForTimeout(5000);
    const ld = await aceites(d.id);
    !(await temTela(pg)) && ld.length === 1 && ld[0].origem === "google" ? ok("aceite marcado no cadastro (Google) gravado ao entrar, sem perguntar", "origem google") : falha("o pendente do cadastro nao foi gravado", `tela=${await temTela(pg)} linhas=${ld.length}`);
    await ctx.close();
    const e = await criar("e");
    ctx = await contexto(e, { origem: "cadastro_email", email: "outra.pessoa@exemplo.com", em: Date.now() });
    pg = await ctx.newPage(); await pg.goto(`http://localhost:${PORTA}/dashboard.html`); await pg.waitForTimeout(5000);
    (await temTela(pg)) && (await aceites(e.id)).length === 0 ? ok("aceite marcado por OUTRA conta no mesmo navegador nao vale", "tela de aceite aparece") : falha("a conta herdou o aceite de outra", `linhas=${(await aceites(e.id)).length}`);

    // 7. Sair
    if (await temTela(pg)) {
      await pg.click("#aceite-sair"); await pg.waitForTimeout(3000);
      /login\.html/.test(pg.url()) ? ok("'Sair' na tela de aceite sai da conta", "foi para login.html") : falha("'Sair' nao saiu", pg.url());
    }
    await ctx.close();
  } catch (e) {
    falha("o teste quebrou", e.message.slice(0, 120));
  } finally {
    if (nav) await nav.close();
    servidor.close();
    for (const id of contas) await req(`/auth/v1/admin/users/${id}`, { method: "DELETE", headers: admin });
    console.log(`\n  (${contas.length} contas de teste apagadas)`);
    console.log("\n" + "=".repeat(76));
    console.log(falhas ? `${falhas} FALHA(S).` : "O ACEITE E GRAVADO -- por e-mail, por Google e na tela de aceite.");
    process.exitCode = falhas ? 1 : 0;
  }
})();
