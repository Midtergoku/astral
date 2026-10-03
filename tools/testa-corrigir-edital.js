/* ═══════════════════════════════════════════════════════════════════════════
   TESTA-CORRIGIR-EDITAL -- o aluno consegue corrigir a leitura do edital?
   (03/10/2026 -- auditoria EDI-02 + EDI-03, roadmap 3.3)

   A auditoria: se a IA errasse uma materia, um peso ou a data, o aluno so
   podia remover ou trocar o edital; subir o mesmo PDF devolvia a mesma
   leitura (guardada); e o rodape dizia "Pesos lidos do edital" tambem quando
   a IA tinha dividido igual por falta de informacao.

   SERVIDOR
     1. renomear leva as horas junto (sessoes e lista do edital)
     2. travas: nome de outra materia, nome de estudo de outra materia,
        materia fora do edital -- e TUDO OU NADA (uma troca ruim desfaz as boas)
     3. "a leitura esta errada": grava, nao duplica, so o dono le, sem login nao
   TELA (navegador de verdade)
     4. o rodape diz de onde veio o peso
     5. corrigir peso, nome, acrescentar materia e mudar a data -- e conferir
        no BANCO o que ficou, inclusive as horas da materia renomeada
     6. nome repetido e recusado na tela, sem gravar nada
     7. o aviso de leitura errada sai pela tela

   USO   node tools/testa-corrigir-edital.js                (producao)
         ASTRAL_DEV=1 node tools/testa-corrigir-edital.js   (astral-dev)
         ASTRAL_RAIZ=pasta  serve outra copia do site (ex.: o commit antigo)
   Nao gasta credito. Cria 2 contas de teste e as apaga no fim.
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
const RAIZ = process.env.ASTRAL_RAIZ ? path.resolve(process.env.ASTRAL_RAIZ) : path.resolve(__dirname, "..");
const CHAVES = JSON.parse(execSync(`supabase projects api-keys --project-ref ${REF} -o json`, { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }));
const SK = CHAVES.find((k) => k.name === "service_role").api_key;
const PUB_PROD = (fs.readFileSync(path.join(RAIZ, "assets/js/astral.js"), "utf8").match(/sb_publishable_[A-Za-z0-9_-]+/) || [])[0];
const PUB = NO_DEV ? (CHAVES.find((k) => k.type === "publishable") || CHAVES.find((k) => k.name === "anon")).api_key : PUB_PROD;
const admin = { apikey: SK, Authorization: `Bearer ${SK}`, "Content-Type": "application/json" };
async function req(c, o = {}) { const r = await fetch(BASE + c, o); const t = await r.text(); let corpo = null; try { corpo = JSON.parse(t); } catch { corpo = t; } return { status: r.status, corpo }; }

let falhas = 0;
const ok = (t, d = "") => console.log(`  OK     ${t.padEnd(64)} ${d}`);
const falha = (t, d = "") => { console.log(`  FALHA  ${t.padEnd(64)} ${d}`); falhas++; };
const espera = (ms) => new Promise((r) => setTimeout(r, ms));

const tipos = { ".html": "text/html", ".css": "text/css", ".js": "text/javascript", ".woff2": "font/woff2", ".svg": "image/svg+xml" };
const PORTA = 5183;
const servidor = http.createServer((q, r) => {
  const u = decodeURIComponent(q.url.split("?")[0]); const a = path.join(RAIZ, u === "/" ? "index.html" : u);
  if (!fs.existsSync(a) || fs.statSync(a).isDirectory()) { r.writeHead(404); return r.end(); }
  let corpo = fs.readFileSync(a);
  if (NO_DEV && /\.(js|html)$/.test(a)) corpo = corpo.toString("utf8").split(PROD).join(REF).split(PUB_PROD).join(PUB);
  r.writeHead(200, { "Content-Type": tipos[path.extname(a)] || "text/plain" }); r.end(corpo);
});

async function conta(prefixo) {
  const email = `${prefixo}-${Date.now()}@astral-teste.local`;
  const u = await req("/auth/v1/admin/users", { method: "POST", headers: admin, body: JSON.stringify({ email, password: "T!" + crypto.randomUUID(), email_confirm: true }) });
  const link = await req("/auth/v1/admin/generate_link", { method: "POST", headers: admin, body: JSON.stringify({ type: "magiclink", email }) });
  const s = (await req("/auth/v1/verify", { method: "POST", headers: { apikey: PUB, "Content-Type": "application/json" }, body: JSON.stringify({ type: "magiclink", token_hash: link.corpo.hashed_token }) })).corpo;
  return { id: u.corpo.id, s, cab: { apikey: PUB, Authorization: `Bearer ${s.access_token}`, "Content-Type": "application/json" } };
}
const HASH = crypto.createHash("sha256").update("edital de teste " + Date.now()).digest("hex");
const dia = (n) => new Date(Date.now() - n * 86400000).toISOString();

(async () => {
  const A = await conta("corrigir-edital");
  const B = await conta("corrigir-edital-b");
  const progresso = async () => (await req(`/rest/v1/progresso?usuario_id=eq.${A.id}&select=edital,materias`, { headers: admin })).corpo[0];
  const sessoes = async () => (await req(`/rest/v1/sessoes_estudo?usuario_id=eq.${A.id}&select=materia,segundos`, { headers: admin })).corpo;
  const renomear = (cab, trocas) => req("/rest/v1/rpc/renomear_materias", { method: "POST", headers: cab, body: JSON.stringify({ p_trocas: trocas }) });
  let nav = null;
  try {
    console.log(`\nTESTA-CORRIGIR-EDITAL  ${NO_DEV ? "astral-dev" : "producao"}  usuario ${A.id.slice(0, 8)}\n`);
    // Um edital lido com pesos DIVIDIDOS IGUAL -- o caso que a tela chamava de "lido"
    await req("/rest/v1/rpc/salvar_progresso", { method: "POST", headers: A.cab, body: JSON.stringify({
      p_xp: 0, p_streak: 0, p_horas: 0,
      p_edital: { nome: "Teste Corrigir Edital", dataProva: "10/11/2027", forca: "exercito", hash: HASH, fontePeso: "igual", materias: 3 },
      p_materias: [{ nome: "Matematica", questoes: 10, peso: 33.3, progresso: 0 }, { nome: "Portugues", questoes: 10, peso: 33.3, progresso: 0 }, { nome: "Fisica", questoes: 10, peso: 33.4, progresso: 0 }],
      p_cronograma_hoje: [], p_badges: [], p_tag_escolhida: null }) });
    await req(`/rest/v1/progresso?usuario_id=eq.${A.id}`, { method: "PATCH", headers: admin, body: JSON.stringify({ rotina: { dias: [0, 1, 2, 3, 4, 5, 6], minutosUtil: 120, minutosFds: 120, bloco: 40 } }) });
    const ins = await req("/rest/v1/sessoes_estudo", { method: "POST", headers: { ...admin, Prefer: "return=minimal" }, body: JSON.stringify([
      { usuario_id: A.id, materia: "Matematica", segundos: 3600, xp: 0, modo: "livre", criado_em: dia(3) },
      { usuario_id: A.id, materia: "Matematica", segundos: 3600, xp: 0, modo: "livre", criado_em: dia(2) },
      { usuario_id: A.id, materia: "Portugues", segundos: 1800, xp: 0, modo: "livre", criado_em: dia(2) },
      { usuario_id: A.id, materia: "Quimica", segundos: 1800, xp: 0, modo: "livre", criado_em: dia(1) }]) });
    if (ins.status >= 300) throw new Error("nao plantou sessoes: " + JSON.stringify(ins.corpo).slice(0, 200));

    // ── 1. renomear leva as horas ──────────────────────────────────────────
    const r1 = await renomear(A.cab, [{ de: "Matematica", para: "Matemática" }]);
    const s1 = await sessoes();
    const p1 = await progresso();
    if (r1.status === 200 && r1.corpo?.sessoes === 2) ok("renomear: as 2 sessões de Matematica foram junto", JSON.stringify(r1.corpo));
    else falha("renomear não levou as sessões", `${r1.status} ${JSON.stringify(r1.corpo).slice(0, 120)}`);
    if (!s1.some((s) => s.materia === "Matematica") && s1.filter((s) => s.materia === "Matemática").length === 2) ok("nenhuma sessão ficou com o nome velho");
    else falha("sobrou sessão com o nome velho", JSON.stringify(s1));
    const mat = (p1?.materias || []).find((m) => m.nome === "Matemática");
    if (mat && !(p1.materias || []).some((m) => m.nome === "Matematica")) ok("a lista do edital trocou o nome", `minutos medidos: ${mat.medida?.minutos ?? "?"}`);
    else falha("a lista do edital não trocou o nome", JSON.stringify((p1?.materias || []).map((m) => m.nome)));
    if (Number(mat?.medida?.minutos) === 120) ok("o domínio da renomeada conta as 2 h estudadas", "120 min");
    else falha("as horas da renomeada não contaram", `medida.minutos = ${mat?.medida?.minutos}`);

    // ── 2. travas ─────────────────────────────────────────────────────────
    const r2 = await renomear(A.cab, [{ de: "Portugues", para: "física" }]);
    if (r2.status >= 400 && /outra materia/.test(r2.corpo?.message || "")) ok("recusa o nome de outra matéria do edital", "física = Fisica");
    else falha("aceitou juntar duas matérias do edital", `${r2.status} ${JSON.stringify(r2.corpo).slice(0, 100)}`);
    const r3 = await renomear(A.cab, [{ de: "Fisica", para: "Química" }]);
    if (r3.status >= 400 && /estudo gravado/.test(r3.corpo?.message || "")) ok("recusa o nome de estudo gravado em outra matéria", "Química = Quimica");
    else falha("aceitou herdar o estudo de outra matéria", `${r3.status} ${JSON.stringify(r3.corpo).slice(0, 100)}`);
    const r4 = await renomear(A.cab, [{ de: "Quimica", para: "Fisica II" }]);
    if (r4.status >= 400 && /nao esta no seu edital/.test(r4.corpo?.message || "")) ok("recusa renomear o que não está no edital", "Quimica (fora)");
    else falha("renomeou matéria fora do edital", `${r4.status} ${JSON.stringify(r4.corpo).slice(0, 100)}`);
    const r5 = await renomear(A.cab, [{ de: "Portugues", para: "Redação" }, { de: "Fisica", para: "Matemática" }]);
    const s5 = await sessoes();
    if (r5.status >= 400 && s5.some((s) => s.materia === "Portugues") && !s5.some((s) => s.materia === "Redação")) ok("tudo ou nada: a troca boa NÃO entrou junto com a ruim");
    else falha("troca parcial gravada", `${r5.status} ${JSON.stringify(s5.map((s) => s.materia))}`);
    const r6 = await req("/rest/v1/rpc/renomear_materias", { method: "POST", headers: { apikey: PUB, "Content-Type": "application/json" }, body: JSON.stringify({ p_trocas: [] }) });
    if (r6.status >= 400) ok("sem login, renomear é recusado", `HTTP ${r6.status}`);
    else falha("🚨 renomear respondeu sem login", `HTTP ${r6.status}`);

    // ── 3. "a leitura está errada" ────────────────────────────────────────
    const rel = (cab, corpo) => req("/rest/v1/editais_reportados", { method: "POST", headers: { ...cab, Prefer: "return=minimal" }, body: JSON.stringify(corpo) });
    const e1 = await rel(B.cab, { edital_hash: HASH, concurso: "Teste", detalhe: "faltou Física" });
    const e2 = await rel(B.cab, { edital_hash: HASH, concurso: "Teste" });
    const e3 = await rel(B.cab, { edital_hash: "nao-e-hash" });
    const e4 = await rel({ apikey: PUB, "Content-Type": "application/json" }, { edital_hash: HASH });
    const e5 = await rel(B.cab, { edital_hash: crypto.createHash("sha256").update("x").digest("hex"), usuario_id: A.id });
    if (e1.status === 201) ok("o aviso de leitura errada é gravado", "HTTP 201"); else falha("o aviso não gravou", `${e1.status} ${JSON.stringify(e1.corpo).slice(0, 100)}`);
    if (e2.status === 409) ok("avisar de novo não duplica", "HTTP 409"); else falha("aviso duplicado", `HTTP ${e2.status}`);
    if (e3.status >= 400) ok("impressão digital inválida é recusada", `HTTP ${e3.status}`); else falha("aceitou hash inválido", `HTTP ${e3.status}`);
    if (e4.status >= 400) ok("sem login, avisar é recusado", `HTTP ${e4.status}`); else falha("🚨 aviso sem login gravou", `HTTP ${e4.status}`);
    if (e5.status >= 400) ok("não dá para avisar em nome de outra pessoa", `HTTP ${e5.status}`); else falha("🚨 aviso gravado em nome de outro", `HTTP ${e5.status}`);
    const leA = (await req(`/rest/v1/editais_reportados?select=id`, { headers: A.cab })).corpo;
    if (Array.isArray(leA) && leA.length === 0) ok("um aluno não lê o aviso de outro", "0 linhas");
    else falha("🚨 aluno leu o aviso de outro", JSON.stringify(leA).slice(0, 80));

    // ── TELA ──────────────────────────────────────────────────────────────
    const npx = path.join(process.env.LOCALAPPDATA, "npm-cache", "_npx");
    let pw = null; for (const d of fs.readdirSync(npx)) { const p = path.join(npx, d, "node_modules", "playwright"); if (fs.existsSync(p)) { pw = require(p); break; } }
    if (!pw) { falha("playwright não encontrado — a tela não foi testada"); return; }
    await new Promise((r) => servidor.listen(PORTA, r));
    nav = await pw.chromium.launch();
    const ctx = await nav.newContext({ viewport: { width: 1280, height: 900 } });
    await ctx.addInitScript(require("./testes/aceite-de-teste.js").SCRIPT);
    await ctx.addInitScript(`localStorage.setItem("sb-${REF}-auth-token", ${JSON.stringify(JSON.stringify({ access_token: A.s.access_token, refresh_token: A.s.refresh_token, token_type: "bearer", expires_at: Math.floor(Date.now() / 1000) + 7200, user: A.s.user }))});`);
    const pg = await ctx.newPage();
    const erros = []; pg.on("pageerror", (e) => erros.push(e.message));
    await pg.goto(`http://localhost:${PORTA}/dashboard.html`, { waitUntil: "load" });
    await pg.waitForSelector("#edital-faixa:not([hidden])", { timeout: 30000 }).catch(() => {});
    await pg.click("#edital-ver").catch(() => {});

    // 4. de onde veio o peso
    const fonte = await pg.textContent("#edital-fonte").catch(() => null);
    if (/não informa os pesos/.test(fonte || "")) ok("o rodapé diz que o peso foi DIVIDIDO IGUAL", fonte.slice(0, 50));
    else falha("o rodapé não diz de onde veio o peso", String(fonte));
    const rep = await pg.isVisible("#edital-reportar").catch(() => false);
    if (rep) ok("o botão \"A leitura está errada\" aparece"); else falha("o botão de leitura errada não apareceu");

    // 6. nome repetido: recusa na tela, nada gravado
    await pg.click("#edital-corrigir");
    await pg.waitForSelector("#edital-form:not([hidden]) .ef-linha", { timeout: 5000 });
    const nomes = pg.locator("#ef-linhas .ef-nome");
    const n0 = await nomes.count();
    if (n0 === 3) ok("a correção abre com as 3 matérias"); else falha("a correção abriu com outra lista", `${n0} linhas`);
    const idx = async (nome) => { for (let i = 0; i < await nomes.count(); i++) if ((await nomes.nth(i).inputValue()) === nome) return i; return -1; };
    const iPort = await idx("Portugues"), iFis = await idx("Fisica");
    await nomes.nth(iPort).fill("FISICA");
    await pg.click(".ef-salvar");
    await pg.waitForTimeout(800);
    const erroTela = await pg.textContent("#ef-erro");
    const depoisRep = await progresso();
    if (/duas matérias/.test(erroTela || "") && depoisRep.materias.some((m) => m.nome === "Portugues")) ok("nome repetido é recusado na tela, nada gravado", erroTela.slice(0, 50));
    else falha("nome repetido passou", `${erroTela} | ${JSON.stringify(depoisRep.materias.map((m) => m.nome))}`);

    // 5. a correção de verdade
    await nomes.nth(iPort).fill("Língua Portuguesa");
    await pg.locator("#ef-linhas .ef-peso").nth(iFis).fill("50");
    await pg.click("#ef-mais");
    await nomes.nth(3).fill("Inglês");
    await pg.locator("#ef-linhas .ef-peso").nth(3).fill("10");
    await pg.fill("#ef-data", "2027-03-20");
    await pg.click(".ef-salvar");
    await pg.waitForSelector("#edital-form[hidden]", { timeout: 15000 }).catch(() => {});
    await pg.waitForTimeout(1500);
    const p5 = await progresso();
    const nomes5 = (p5.materias || []).map((m) => m.nome);
    const soma5 = (p5.materias || []).reduce((s, m) => s + Number(m.peso), 0);
    if (["Matemática", "Língua Portuguesa", "Fisica", "Inglês"].every((x) => nomes5.includes(x)) && nomes5.length === 4) ok("matérias corrigidas no banco", nomes5.join(", "));
    else falha("as matérias não ficaram como corrigido", JSON.stringify(nomes5));
    if (Math.abs(soma5 - 100) <= 0.5) ok("os pesos somam 100 (ajustados na proporção)", (p5.materias || []).map((m) => `${m.nome} ${m.peso}`).join(" · "));
    else falha("os pesos não somam 100", String(soma5));
    const fis = (p5.materias || []).find((m) => m.nome === "Fisica");
    // 50 de 126,6 digitados = 39,5% -- a maior de todas
    if (fis && (p5.materias || []).every((m) => m === fis || Number(m.peso) < Number(fis.peso))) ok("Física virou o maior peso, como corrigido", `${fis.peso}%`);
    else falha("o peso de Física não mudou", JSON.stringify(fis));
    if (p5.edital?.dataProva === "20/03/2027") ok("a data da prova foi corrigida", "20/03/2027"); else falha("a data não mudou", String(p5.edital?.dataProva));
    if (p5.edital?.fontePeso === "aluno" && p5.edital?.fontePesoLido === "igual") ok("o edital guarda que o peso é do aluno, e de onde veio o lido", "aluno / igual");
    else falha("a origem do peso não foi registrada", `${p5.edital?.fontePeso} / ${p5.edital?.fontePesoLido}`);
    if (p5.edital?.hash === HASH && p5.edital?.forca === "exercito") ok("o resto do edital não se perdeu (hash, força)");
    else falha("a correção apagou parte do edital", JSON.stringify(p5.edital).slice(0, 120));
    const s6 = await sessoes();
    const lp = (p5.materias || []).find((m) => m.nome === "Língua Portuguesa");
    if (s6.some((s) => s.materia === "Língua Portuguesa") && !s6.some((s) => s.materia === "Portugues") && Number(lp?.medida?.minutos) === 30) ok("a sessão de Portugues foi junto pela tela", `${lp.medida.minutos} min`);
    else falha("a renomeação pela tela perdeu as horas", `${JSON.stringify(s6.map((s) => s.materia))} minutos=${lp?.medida?.minutos}`);
    const fonte2 = await pg.textContent("#edital-fonte").catch(() => null);
    if (/corrigidos por você/.test(fonte2 || "")) ok("o rodapé passa a dizer \"corrigidos por você\""); else falha("o rodapé não mudou", String(fonte2));
    let prova = null;
    for (let i = 0; i < 10 && !prova; i++) {
      prova = ((await req(`/rest/v1/eventos?usuario_id=eq.${A.id}&categoria=eq.prova&select=data`, { headers: admin })).corpo || []).find((e) => e.data === "2027-03-20");
      if (!prova) await espera(1000);
    }
    if (prova) ok("o calendário acompanhou a data nova", "2027-03-20"); else falha("a prova do calendário não acompanhou a data");

    // 7. o aviso pela tela
    await pg.click("#edital-ver").catch(() => {});
    if (!(await pg.isVisible("#edital-reportar"))) await pg.click("#edital-ver").catch(() => {});
    await pg.click("#edital-reportar");
    await pg.fill("#edital-relato-texto", "a data estava errada");
    await pg.click("#edital-relato button[type=submit]");
    await pg.waitForTimeout(1500);
    const meus = (await req(`/rest/v1/editais_reportados?usuario_id=eq.${A.id}&select=detalhe,edital_hash`, { headers: admin })).corpo;
    if (Array.isArray(meus) && meus[0]?.detalhe === "a data estava errada" && meus[0]?.edital_hash === HASH) ok("o aviso enviado pela tela chegou ao banco");
    else falha("o aviso pela tela não chegou", JSON.stringify(meus).slice(0, 100));
    if (erros.length) falha("erro de JavaScript na página", erros[0].slice(0, 90)); else ok("nenhum erro de JavaScript na página");
  } catch (e) {
    falha("o teste quebrou", e.message.slice(0, 120));
  } finally {
    if (nav) await nav.close();
    servidor.close();
    for (const c of [A, B]) await req(`/auth/v1/admin/users/${c.id}`, { method: "DELETE", headers: admin });
    console.log("\n  (contas de teste apagadas)");
    console.log("\n" + "=".repeat(70));
    console.log(falhas === 0 ? "O ALUNO CORRIGE A LEITURA DO EDITAL — E AS HORAS VÃO JUNTO." : `🔴 ${falhas} FALHA(S).`);
    process.exit(falhas ? 1 : 0);
  }
})();
