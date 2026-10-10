// TESTA-ASSUNTOS-EDITAL -- os assuntos de cada materia aparecem MESMO sem questao no Banco, e o aluno marca? (10/10/2026)
//
// Pedido dele, em Progresso > Materias do edital: Quimica e Informatica nao mostravam nenhum assunto (a lista vinha
// so do Banco). "Nao e porque nao tem questao no banco que nao vai ter ali mostrando a submateria (...) e para a
// pessoa se organizar, poder marcar se ela ja estudou ou nao."
//
//   SERVIDOR  marcar_assunto grava e desmarca; recusa materia fora do edital; outra conta nao le; a marca NAO mexe
//             em XP nem dominio (seria o atalho do 3.12); meus_dados leva a tabela; materias_estudadas devolve
//             assuntos_edital e marcados
//   TELA      materia com assuntos do EDITAL mostra os do edital; materia sem eles e sem Banco (Quimica) mostra os
//             COMUNS com o aviso; marcar na tela grava e o resumo "X de Y assuntos estudados" acompanha
//
//   node tools/testa-assuntos-edital.js     (so no astral-dev; cria e apaga 2 contas)
process.env.ASTRAL_DEV = "1";
const fs = require("fs"), path = require("path"), http = require("http"), crypto = require("crypto");
const R = path.resolve(process.env.ASTRAL_RAIZ || path.join(__dirname, ".."));
const { REF, PUB, reescrever, chavesDoProjeto } = require("./testes/alvo");
const BASE = `https://${REF}.supabase.co`;
const SK = chavesDoProjeto().find((k) => k.name === "service_role").api_key;
const admin = { apikey: SK, Authorization: `Bearer ${SK}`, "Content-Type": "application/json" };
async function req(c, o = {}) { const r = await fetch(BASE + c, o); const t = await r.text(); let corpo = null; try { corpo = JSON.parse(t); } catch { corpo = t; } return { status: r.status, corpo }; }
const tipos = { ".html": "text/html", ".css": "text/css", ".js": "text/javascript", ".woff2": "font/woff2", ".svg": "image/svg+xml", ".png": "image/png" };
const PORTA = 8978;
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

async function conta(rotulo) {
  const email = `assuntos-${rotulo}-${Date.now()}@astral-teste.local`;
  const id = (await req("/auth/v1/admin/users", { method: "POST", headers: admin, body: JSON.stringify({ email, password: "T!" + crypto.randomUUID() + "a1", email_confirm: true }) })).corpo.id;
  const link = await req("/auth/v1/admin/generate_link", { method: "POST", headers: admin, body: JSON.stringify({ type: "magiclink", email }) });
  const s = (await req("/auth/v1/verify", { method: "POST", headers: { apikey: PUB, "Content-Type": "application/json" }, body: JSON.stringify({ type: "magiclink", token_hash: link.corpo.hashed_token }) })).corpo;
  return { id, s, cab: { apikey: PUB, Authorization: `Bearer ${s.access_token}`, "Content-Type": "application/json" } };
}
const rpc = (c, nome, corpo = {}) => req(`/rest/v1/rpc/${nome}`, { method: "POST", headers: c.cab, body: JSON.stringify(corpo) });

(async () => {
  console.log("\nTESTA-ASSUNTOS-EDITAL  astral-dev\n");
  const contas = [];
  let nav = null;
  try {
    const a = await conta("a"); contas.push(a);
    const b = await conta("b"); contas.push(b);
    // Portugues com os assuntos do EDITAL; Quimica sem (e sem Banco); Legislacao sem
    const MAT = [
      { nome: "Língua Portuguesa", peso: 30, questoes: 15, progresso: 0, assuntos: ["Leitura e interpretação", "Crase", "Pontuação"] },
      { nome: "Química", peso: 20, questoes: 10, progresso: 0 },
      { nome: "Legislação", peso: 10, questoes: 5, progresso: 0 },
    ];
    for (const c of [a, b]) {
      const g = await rpc(c, "salvar_progresso", { p_xp: 0, p_streak: 0, p_horas: 0, p_edital: { nome: "CBMERJ Soldado 2026", forca: "bombeiros", patenteInicial: null, dataProva: "06/12/2026" }, p_materias: MAT, p_cronograma_hoje: [], p_badges: [], p_tag_escolhida: null });
      if (g.status >= 300) throw new Error("salvar_progresso " + g.status + " " + JSON.stringify(g.corpo).slice(0, 120));
    }
    await req(`/rest/v1/sessoes_estudo`, { method: "POST", headers: { ...admin, Prefer: "return=minimal" }, body: JSON.stringify([{ usuario_id: a.id, materia: "Química", segundos: 2400, xp: 80, modo: "pomodoro", criado_em: new Date(Date.now() - 3600e3).toISOString() }]) });

    console.log("== 1. SERVIDOR ==");
    const antes = (await req(`/rest/v1/progresso?usuario_id=eq.${a.id}&select=xp,materias`, { headers: admin })).corpo[0];
    const m1 = await rpc(a, "marcar_assunto", { p_materia: "Química", p_assunto: "Estequiometria", p_estudado: true });
    conferir("marcar um assunto grava", m1.status < 300 && m1.corpo?.estudado === true, `HTTP ${m1.status}`);
    const lida = (await rpc(a, "materias_estudadas")).corpo || [];
    const quim = lida.find((m) => m.nome === "Química"), port = lida.find((m) => m.nome === "Língua Portuguesa");
    conferir("🎯 materias_estudadas devolve o marcado", JSON.stringify(quim?.marcados) === '["Estequiometria"]', JSON.stringify(quim?.marcados));
    conferir("materias_estudadas devolve os assuntos do edital", JSON.stringify(port?.assuntos_edital) === JSON.stringify(MAT[0].assuntos), JSON.stringify(port?.assuntos_edital));
    const depois = (await req(`/rest/v1/progresso?usuario_id=eq.${a.id}&select=xp,materias`, { headers: admin })).corpo[0];
    const dom = (p) => JSON.stringify((p.materias || []).map((m) => [m.nome, m.progresso]));
    conferir("🎯 marcar NÃO muda XP nem domínio (atalho do 3.12)", antes.xp === depois.xp && dom(antes) === dom(depois), `xp ${antes.xp}->${depois.xp}`);
    const fora = await rpc(a, "marcar_assunto", { p_materia: "Astronomia", p_assunto: "Planetas", p_estudado: true });
    conferir("matéria fora do edital é recusada", fora.status >= 400, `HTTP ${fora.status}`);
    const vazio = await rpc(a, "marcar_assunto", { p_materia: "Química", p_assunto: "   ", p_estudado: true });
    conferir("assunto vazio é recusado", vazio.status >= 400, `HTTP ${vazio.status}`);
    const direto = await req("/rest/v1/assuntos_estudados", { method: "POST", headers: { ...a.cab, Prefer: "return=minimal" }, body: JSON.stringify({ usuario_id: a.id, materia: "Química", assunto: "Direto" }) });
    conferir("gravar direto na tabela é recusado (só pela função)", direto.status >= 400, `HTTP ${direto.status}`);
    const outra = await req(`/rest/v1/assuntos_estudados?usuario_id=eq.${a.id}`, { headers: b.cab });
    conferir("🎯 outra conta não lê as marcas", Array.isArray(outra.corpo) && outra.corpo.length === 0, `${(outra.corpo || []).length} linhas`);
    const anon = await req("/rest/v1/rpc/marcar_assunto", { method: "POST", headers: { apikey: PUB, "Content-Type": "application/json" }, body: JSON.stringify({ p_materia: "Química", p_assunto: "X", p_estudado: true }) });
    conferir("sem login é recusado", anon.status >= 400, `HTTP ${anon.status}`);
    const md = await rpc(a, "meus_dados");
    conferir("\"baixar meus dados\" leva as marcas", (md.corpo?.assuntos_estudados || []).some((x) => x.assunto === "Estequiometria"));
    const des = await rpc(a, "marcar_assunto", { p_materia: "Química", p_assunto: "Estequiometria", p_estudado: false });
    const lida2 = (await rpc(a, "materias_estudadas")).corpo || [];
    conferir("desmarcar apaga", des.status < 300 && JSON.stringify(lida2.find((m) => m.nome === "Química")?.marcados) === "[]");

    console.log("\n== 2. TELA (Progresso) ==");
    if (!pw) { falha("playwright nao encontrado"); throw new Error("sem playwright"); }
    await new Promise((r) => srv.listen(PORTA, r));
    nav = await pw.chromium.launch();
    const ctx = await nav.newContext({ viewport: { width: 1280, height: 900 } });
    await ctx.addInitScript(require("./testes/aceite-de-teste.js").SCRIPT);
    await ctx.addInitScript(`localStorage.setItem("sb-${REF}-auth-token", ${JSON.stringify(JSON.stringify({ access_token: a.s.access_token, refresh_token: a.s.refresh_token, token_type: "bearer", expires_at: Math.floor(Date.now() / 1000) + 900, user: a.s.user }))});`);
    await ctx.route("**/functions/v1/buscar-recursos", (r) => r.fulfill({ status: 402, contentType: "application/json", body: '{"error":"sem credito"}' }));
    const pg = await ctx.newPage();
    const erros = []; pg.on("pageerror", (e) => erros.push(e.message));
    await pg.goto(`http://localhost:${PORTA}/progresso.html`, { waitUntil: "load" });
    await pg.waitForSelector("#g-edital .edital-materia", { timeout: 15000 }).catch(() => {});
    const tela = await pg.evaluate(() => [...document.querySelectorAll("#g-edital .edital-materia")].map((d) => ({
      nome: d.querySelector(".nome")?.textContent, fonte: d.querySelector(".edital-fonte")?.textContent || "",
      assuntos: [...d.querySelectorAll(".edital-assuntos label span")].map((s) => s.textContent),
      caixas: d.querySelectorAll('.edital-assuntos input[type="checkbox"]').length, info: d.querySelector(".info")?.textContent || "" })));
    const tq = tela.find((m) => m.nome === "Química"), tp = tela.find((m) => m.nome === "Língua Portuguesa");
    conferir("🎯 Química (sem Banco, sem assunto no edital) mostra assuntos", (tq?.assuntos.length || 0) >= 8, `${tq?.assuntos.length} assuntos`);
    conferir("e diz que são os COMUNS, não os do edital", /mais cobrados/.test(tq?.fonte || ""), (tq?.fonte || "").slice(0, 60));
    conferir("🎯 Português mostra os assuntos DO EDITAL primeiro", JSON.stringify((tp?.assuntos || []).slice(0, 3)) === JSON.stringify(MAT[0].assuntos), JSON.stringify((tp?.assuntos || []).slice(0, 3)));
    conferir("e diz que vieram do edital", /conteúdo programático do seu edital/.test(tp?.fonte || ""));
    conferir("cada assunto tem uma caixa de marcar", tq && tq.caixas === tq.assuntos.length, `${tq?.caixas} caixas`);
    // marcar na tela
    await pg.click('#g-edital details:has(.nome:text-is("Química")) summary').catch(() => {});
    const cx = pg.locator('#g-edital input[data-materia="Química"]').first();
    const assuntoDaCaixa = await cx.getAttribute("data-assunto");
    await cx.check();
    await pg.waitForTimeout(1500);
    const info = await pg.locator('#g-edital details:has(.nome:text-is("Química")) .info').textContent();
    conferir("o resumo acompanha (1 de N assuntos estudados)", /\b1 de \d+ assuntos estudados/.test(info || ""), info);
    const gravou = (await req(`/rest/v1/assuntos_estudados?usuario_id=eq.${a.id}&select=assunto`, { headers: admin })).corpo || [];
    conferir("🎯 marcar na tela grava no servidor", gravou.some((x) => x.assunto === assuntoDaCaixa), assuntoDaCaixa);
    await pg.reload({ waitUntil: "load" });
    await pg.waitForSelector("#g-edital .edital-materia", { timeout: 15000 }).catch(() => {});
    const marcadoDepois = await pg.locator(`#g-edital input[data-materia="Química"][data-assunto="${assuntoDaCaixa}"]`).isChecked();
    conferir("recarregar mantém marcado", marcadoDepois);
    conferir("nenhum erro na tela", erros.length === 0, erros.join(" | ").slice(0, 100));
  } catch (e) {
    falha("o teste quebrou", e.message.slice(0, 140));
  } finally {
    if (nav) await nav.close();
    srv.close();
    for (const c of contas) await req(`/auth/v1/admin/users/${c.id}`, { method: "DELETE", headers: admin });
    console.log("\n" + "=".repeat(70));
    console.log(falhas ? `🔴 ${falhas} FALHA(S).` : "OS ASSUNTOS DO EDITAL APARECEM, COM OU SEM BANCO, E O ALUNO MARCA O QUE ESTUDOU.");
    process.exitCode = falhas ? 1 : 0;
  }
})();
