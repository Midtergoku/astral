// TESTA-SIMULADO -- o simulado (R4) monta do edital, esconde o gabarito, corrige no servidor e relata? (10/10/2026)
//
//   SERVIDOR  questoes so das materias do edital e no PESO de cada uma; sem gabarito ate entregar; NAO gasta a amostra
//             do dia do Banco; outra conta nao entrega; nao se entrega 2 vezes; as respostas entram no dominio e no
//             caderno; em branco mostra o gabarito depois; meus_dados leva os simulados
//   TELA      montar 10, marcar, RECARREGAR sem perder as marcacoes, entregar, relatorio com placar e certas/erradas
//   node tools/testa-simulado.js     (so no astral-dev, com o acervo -- dev-acervo.js; cria e apaga contas)
process.env.ASTRAL_DEV = "1";
const fs = require("fs"), path = require("path"), http = require("http"), crypto = require("crypto");
const R = path.resolve(process.env.ASTRAL_RAIZ || path.join(__dirname, ".."));
const { REF, PUB, reescrever, chavesDoProjeto } = require("./testes/alvo");
const BASE = `https://${REF}.supabase.co`;
const SK = chavesDoProjeto().find((k) => k.name === "service_role").api_key;
const admin = { apikey: SK, Authorization: `Bearer ${SK}`, "Content-Type": "application/json" };
async function req(c, o = {}) { const r = await fetch(BASE + c, o); const t = await r.text(); let corpo = null; try { corpo = JSON.parse(t); } catch { corpo = t; } return { status: r.status, corpo }; }
const tipos = { ".html": "text/html", ".css": "text/css", ".js": "text/javascript", ".woff2": "font/woff2", ".svg": "image/svg+xml", ".png": "image/png", ".webp": "image/webp" };
const PORTA = 8985;
const srv = http.createServer((q, r) => {
  const u = decodeURIComponent(q.url.split("?")[0]); const a = path.join(R, u === "/" ? "index.html" : u);
  if (!path.resolve(a).startsWith(R) || !fs.existsSync(a) || fs.statSync(a).isDirectory()) { r.writeHead(404); return r.end(); }
  r.writeHead(200, { "Content-Type": tipos[path.extname(a)] || "text/plain" }); r.end(reescrever(a, fs.readFileSync(a)));
});
let pw = null; try { pw = require("playwright"); } catch { /* cache do npx */ }
const npx = path.join(process.env.LOCALAPPDATA || "", "npm-cache", "_npx");
if (!pw && fs.existsSync(npx)) for (const d of fs.readdirSync(npx)) { const a = path.join(npx, d, "node_modules", "playwright"); if (fs.existsSync(a)) { pw = require(a); break; } }

let falhas = 0;
const ok = (t, d = "") => console.log(`  OK     ${t.padEnd(64)} ${d}`);
const falha = (t, d = "") => { console.log(`  FALHA  ${t.padEnd(64)} ${d}`); falhas++; };
const conferir = (t, c, d = "") => (c ? ok(t, d) : falha(t, d));
async function conta(n) {
  const email = `sim-${n}-${Date.now()}@astral-teste.local`;
  const id = (await req("/auth/v1/admin/users", { method: "POST", headers: admin, body: JSON.stringify({ email, password: "T!" + crypto.randomUUID() + "a1", email_confirm: true }) })).corpo.id;
  const link = await req("/auth/v1/admin/generate_link", { method: "POST", headers: admin, body: JSON.stringify({ type: "magiclink", email }) });
  const s = (await req("/auth/v1/verify", { method: "POST", headers: { apikey: PUB, "Content-Type": "application/json" }, body: JSON.stringify({ type: "magiclink", token_hash: link.corpo.hashed_token }) })).corpo;
  const cab = { apikey: PUB, Authorization: `Bearer ${s.access_token}`, "Content-Type": "application/json" };
  await req("/rest/v1/rpc/salvar_progresso", { method: "POST", headers: cab, body: JSON.stringify({ p_xp: 0, p_streak: 0, p_horas: 0,
    p_edital: { nome: "EEAR CFS 2027", forca: "aeronautica", dataProva: "20/03/2027" },
    p_materias: [{ nome: "Língua Portuguesa", peso: 50 }, { nome: "Matemática", peso: 30 }, { nome: "Física", peso: 20 }, { nome: "Astronomia", peso: 10 }],
    p_cronograma_hoje: [], p_badges: [], p_tag_escolhida: null }) });
  await req(`/rest/v1/progresso?usuario_id=eq.${id}`, { method: "PATCH", headers: { ...admin, Prefer: "return=minimal" }, body: JSON.stringify({ rotina: { dias: [1, 2, 3, 4, 5, 6], minutosUtil: 120, minutosFds: 120, bloco: 40, respondidoEm: new Date().toISOString() } }) });
  return { id, s, cab };
}
const rpc = (c, n, b = {}) => req(`/rest/v1/rpc/${n}`, { method: "POST", headers: c.cab, body: JSON.stringify(b) });

(async () => {
  console.log("\nTESTA-SIMULADO  astral-dev\n");
  const contas = []; let nav = null;
  try {
    const acervo = (await req("/rest/v1/questoes?publicada=eq.true&select=id&limit=1", { headers: admin })).corpo || [];
    if (!acervo.length) { falha("o dev está sem acervo -- rodar node tools/dev-acervo.js"); throw new Error("sem acervo"); }
    const a = await conta("a"); contas.push(a);
    const b = await conta("b"); contas.push(b);

    console.log("== 1. SERVIDOR ==");
    const m = await rpc(a, "montar_simulado", { p_quantas: 20 });
    const qs = m.corpo?.questoes || [];
    conferir("monta 20 questões", m.status < 300 && qs.length === 20, `HTTP ${m.status}, ${qs.length}`);
    conferir("🎯 nenhuma traz o gabarito antes de entregar", qs.every((q) => !("gabarito" in q) && !("explicacao" in q)));
    const dist = {}; for (const q of qs) dist[q.materia] = (dist[q.materia] || 0) + 1;
    conferir("🎯 no peso do edital (50/30/20 -> 10/6/4)", dist["Português"] === 10 && dist["Matemática"] === 6 && dist["Física"] === 4, JSON.stringify(dist));
    conferir("matéria sem questão no Banco fica de fora", !Object.keys(dist).some((x) => /astronomia/i.test(x)));
    const amostra = await rpc(a, "sortear_questoes", { p_limite: 1 });
    conferir("🎯 não gasta a amostra do dia do Banco", amostra.corpo?.vistas_hoje === 1 && amostra.corpo?.acabou === false, `${amostra.corpo?.vistas_hoje} de ${amostra.corpo?.limite_do_dia}`);
    const resp = {}; qs.slice(0, 15).forEach((q) => { resp[q.id] = q.tipo === "certo_errado" ? "c" : "a"; });
    const alheio = await rpc(b, "entregar_simulado", { p_id: m.corpo.id, p_respostas: resp, p_segundos: 600 });
    conferir("outra conta não entrega o simulado alheio", alheio.status >= 400, `HTTP ${alheio.status}`);
    const e = await rpc(a, "entregar_simulado", { p_id: m.corpo.id, p_respostas: resp, p_segundos: 600 });
    conferir("entregar corrige: 15 respondidas de 20", e.status < 300 && e.corpo?.respondidas === 15 && e.corpo?.total === 20, `${e.corpo?.acertos} acertos`);
    const branco = (e.corpo?.itens || []).find((i) => i.letra === null);
    conferir("em branco: o gabarito aparece depois de entregar", !!branco?.gabarito);
    const soma = Object.values(e.corpo?.por_materia || {}).reduce((s, v) => s + v.total, 0);
    conferir("o relatório por matéria soma 20", soma === 20, JSON.stringify(e.corpo?.por_materia));
    const de2 = await rpc(a, "entregar_simulado", { p_id: m.corpo.id, p_respostas: resp, p_segundos: 600 });
    conferir("não se entrega duas vezes", de2.status >= 400, `HTTP ${de2.status}`);
    const rs = (await req(`/rest/v1/respostas?usuario_id=eq.${a.id}&select=questao_id`, { headers: admin })).corpo || [];
    conferir("🎯 as respostas entram no domínio e no caderno (respostas)", rs.length === 15, `${rs.length}`);
    const md = await rpc(a, "meus_dados");
    conferir("\"baixar meus dados\" leva o simulado", (md.corpo?.simulados || []).length === 1);
    const direto = await req("/rest/v1/simulados", { method: "POST", headers: { ...a.cab, Prefer: "return=minimal" }, body: JSON.stringify({ usuario_id: a.id, questoes: [1] }) });
    conferir("gravar direto na tabela é recusado (só pelas funções)", direto.status >= 400, `HTTP ${direto.status}`);

    console.log("\n== 2. TELA ==");
    if (!pw) throw new Error("playwright nao encontrado");
    await new Promise((r) => srv.listen(PORTA, r));
    nav = await pw.chromium.launch();
    const ctx = await nav.newContext({ viewport: { width: 1280, height: 900 } });
    await ctx.addInitScript(require("./testes/aceite-de-teste.js").SCRIPT);
    await ctx.addInitScript(`localStorage.setItem("sb-${REF}-auth-token", ${JSON.stringify(JSON.stringify({ access_token: b.s.access_token, refresh_token: b.s.refresh_token, token_type: "bearer", expires_at: Math.floor(Date.now() / 1000) + 900, user: b.s.user }))});`);
    const pg = await ctx.newPage();
    const erros = []; pg.on("pageerror", (x) => erros.push(x.message));
    pg.on("dialog", (d) => d.accept());
    await pg.goto(`http://localhost:${PORTA}/simulado.html`, { waitUntil: "load" });
    await pg.waitForSelector("#btn-montar", { timeout: 15000 });
    await pg.check('input[name="quantas"][value="10"]');
    await pg.click("#btn-montar");
    await pg.waitForSelector(".sim-q", { timeout: 20000 });
    const nq = await pg.locator(".sim-q").count();
    conferir("🎯 a prova aparece com 10 questões", nq === 10, `${nq}`);
    // marca a 1a alternativa das 3 primeiras questoes
    for (let i = 0; i < 3; i++) await pg.locator(".sim-q").nth(i).locator(".sim-alt").first().click();
    conferir("a barra conta as respondidas", /3 de 10 respondidas/.test(await pg.textContent("#sim-conta")));
    await pg.reload({ waitUntil: "load" });
    await pg.waitForSelector(".sim-q", { timeout: 15000 });
    const marcadas = await pg.locator('.sim-alt[aria-pressed="true"]').count();
    conferir("🎯 recarregar não perde as marcações", marcadas === 3, `${marcadas}`);
    await pg.click("#btn-entregar");
    await pg.waitForSelector(".sim-placar", { timeout: 20000 });
    const placar = await pg.textContent(".sim-placar");
    conferir("🎯 o relatório mostra o placar (X de 10)", /\d+ de 10/.test(placar || ""), (placar || "").replace(/\s+/g, " ").slice(0, 50));
    const certas = await pg.locator(".sim-alt.certa").count();
    conferir("cada questão mostra a certa depois de entregar", certas === 10, `${certas}`);
    const travadas = await pg.locator(".sim-alt:not([disabled])").count();
    conferir("depois de entregar, nada se muda", travadas === 0);
    conferir("nenhum erro na tela", erros.length === 0, erros.join(" | ").slice(0, 100));
  } catch (e) {
    if (!/sem acervo/.test(e.message)) falha("o teste quebrou", e.message.slice(0, 140));
  } finally {
    if (nav) await nav.close();
    srv.close();
    for (const c of contas) await req(`/auth/v1/admin/users/${c.id}`, { method: "DELETE", headers: admin });
    console.log("\n" + "=".repeat(70));
    console.log(falhas ? `🔴 ${falhas} FALHA(S).` : "O SIMULADO MONTA DO EDITAL, ESCONDE O GABARITO, CORRIGE NO SERVIDOR E RELATA.");
    process.exitCode = falhas ? 1 : 0;
  }
})();
