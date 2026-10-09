/* ═══════════════════════════════════════════════════════════════════════════
   TESTA-PROVA-NO-CRONOGRAMA -- o cronograma usa a data da prova? a semana
   editada a mao avisa? a falha do edital diz o que houve?
   (09/10/2026 -- roadmap 3.14: auditoria CRO-03, CRO-04, CRO-05, EDI-04)

   O que a auditoria achou, e o que este teste cobra:
     CRO-03  com 5 dias para a prova o plano era igual ao de quem tem meses,
             seguia DEPOIS da prova, e o chefe dizia "nao abra frente nova" ao
             lado de "Revise Portugues" (0%, nunca estudado). Prova passada:
             nada perguntava o que vem agora.
     CRO-04  semana editada a mao: materia nova do edital nao entrava, sem
             aviso; "Voltar ao automatico" apagava sem confirmar.
     CRO-05  rotina invalida virava o padrao calada.
     EDI-04  falha do edital: "Nao foi possivel completar a operacao", sem
             acento e sem dizer se era o arquivo, a internet ou o servico; e o
             questionario de rotina abria por cima.

   Tres partes:
     1. as REGRAS, com relogio fixo (chamam as funcoes de verdade do site);
     2. a TELA, num navegador, com uma conta de teste na producao;
     3. o SERVIDOR de verdade: a mensagem do arquivo recusado (antes da IA --
        nao gasta credito).

   USO   node tools/testa-prova-no-cronograma.js
         ASTRAL_RAIZ=pasta  roda as partes 1 e 2 contra outra copia do site
                            (ex.: um worktree do commit antigo -- tem de FALHAR)
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
const RAIZ = process.env.ASTRAL_RAIZ ? path.resolve(process.env.ASTRAL_RAIZ) : path.resolve(__dirname, "..");
const SK = JSON.parse(execSync(`supabase projects api-keys --project-ref ${REF} -o json`, { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] })).find((k) => k.name === "service_role").api_key;
const PUB = (fs.readFileSync(path.join(RAIZ, "assets/js/astral.js"), "utf8").match(/sb_publishable_[A-Za-z0-9_-]+/) || [])[0];
const admin = { apikey: SK, Authorization: `Bearer ${SK}`, "Content-Type": "application/json" };
async function req(c, o = {}) { const r = await fetch(BASE + c, o); const t = await r.text(); let corpo = null; try { corpo = JSON.parse(t); } catch { corpo = t; } return { status: r.status, corpo }; }

let falhas = 0;
const ok = (t, d = "") => console.log(`  OK     ${t.padEnd(60)} ${d}`);
const falha = (t, d = "") => { console.log(`  FALHA  ${t.padEnd(60)} ${d}`); falhas++; };
const conferir = (t, cond, d = "") => (cond ? ok(t, d) : falha(t, d));

const tipos = { ".html": "text/html", ".css": "text/css", ".js": "text/javascript", ".mjs": "text/javascript", ".woff2": "font/woff2", ".svg": "image/svg+xml", ".png": "image/png" };
// 5173: uma das duas portas locais que as funcoes aceitam (CORS, _shared/comum.ts)
const PORTA = 5173;
const servidor = http.createServer((q, r) => {
  const u = decodeURIComponent(q.url.split("?")[0]); const a = path.join(RAIZ, u === "/" ? "index.html" : u);
  if (!fs.existsSync(a) || fs.statSync(a).isDirectory()) { r.writeHead(404); return r.end(); }
  r.writeHead(200, { "Content-Type": tipos[path.extname(a)] || "text/plain" }); r.end(fs.readFileSync(a));
});

// Datas em Sao Paulo (UTC-3), como o site
const hojeSP = () => new Date(Date.now() - 3 * 3600e3).toISOString().slice(0, 10);
const somaDias = (iso, n) => { const [a, m, d] = iso.split("-").map(Number); return new Date(Date.UTC(a, m - 1, d + n)).toISOString().slice(0, 10); };
const br = (iso) => iso.split("-").reverse().join("/");

const MATERIAS = [
  { nome: "Português", peso: 3, progresso: 40 },
  { nome: "Matemática", peso: 3, progresso: 0 },
  { nome: "Física", peso: 2, progresso: 20 },
  { nome: "História", peso: 1, progresso: 0 },
];
const NUNCA = new Set(["Matemática", "História"]);

async function regras() {
  console.log("\n== 1. AS REGRAS (relógio fixo: quinta, 15/10/2026) ==");
  let c, ch;
  try {
    c = await import(pathToFileURL(path.join(RAIZ, "assets/js/cronograma.js")).href);
    ch = await import(pathToFileURL(path.join(RAIZ, "assets/js/chefe.js")).href);
  } catch (e) { return falha("os modulos nao carregaram", e.message.slice(0, 80)); }
  const faltam = ["provaNaSemana", "foraDaSemanaEditada", "incluirNaSemanaEditada", "correcoesDaRotina"].filter((f) => typeof c[f] !== "function");
  if (faltam.length) return falha("cronograma.js sem as funcoes do 3.14", faltam.join(", "));
  const agora = new Date("2026-10-15T15:00:00Z");
  const semProva = c.montarSemana(MATERIAS, null, { agora });

  // prova no sabado 17/10: sabado e o dia, domingo e depois
  const s = c.montarSemana(MATERIAS, null, { agora, prova: "17/10/2026" });
  conferir("🎯 dia da prova sem sessão", s[6].prova === "dia" && s[6].blocos.length === 0, `sáb: ${s[6].prova || "-"} · ${s[6].blocos.length} blocos`);
  conferir("🎯 depois da prova sem sessão", s[0].prova === "depois" && s[0].blocos.length === 0, `dom: ${s[0].prova || "-"} · ${s[0].blocos.length} blocos`);
  const novas = s.flatMap((d) => d.blocos).filter((b) => NUNCA.has(b.materia));
  conferir("🎯 reta final: só matéria já estudada", novas.length === 0 && s.flatMap((d) => d.blocos).length > 0,
    novas.length ? `abriu frente nova: ${novas.map((b) => b.materia).join(", ")}` : "Português e Física");
  conferir("reta final marcada nos dias antes da prova", [1, 2, 3, 4, 5].every((d) => s[d].retaFinal));

  // nada estudado: nao ha o que reforcar -- entram todas
  const zerado = c.montarSemana(MATERIAS.map((m) => ({ ...m, progresso: 0 })), null, { agora, prova: "17/10/2026" });
  conferir("nada estudado: a reta final segue com todas", zerado.flatMap((d) => d.blocos).some((b) => b.materia === "Matemática"));

  // prova longe, ou que passou ANTES desta semana: o plano nao muda
  conferir("prova longe: plano igual ao sem prova", JSON.stringify(c.montarSemana(MATERIAS, null, { agora, prova: "30/12/2026" })) === JSON.stringify(semProva));
  const passou = c.montarSemana(MATERIAS, null, { agora, prova: "01/10/2026" });
  conferir("prova passada antes da semana: o plano segue", JSON.stringify(passou) === JSON.stringify(semProva) && c.provaNaSemana("01/10/2026", agora).passouAntes === true);

  // semana editada a mao: a data vale tambem; a materia nova aparece no aviso e entra pelo "Incluir"
  const manual = { dias: [1, 2, 3, 6], minutosUtil: 120, minutosFds: 120, bloco: 40,
    semana: [[], [{ materia: "Português", minutos: 40 }, { materia: "Química", minutos: 40 }], [{ materia: "Física", minutos: 40 }], [], [], [], [{ materia: "Português", minutos: 50 }]] };
  const sm = c.montarSemana(MATERIAS, manual, { agora, prova: "17/10/2026" });
  conferir("semana editada: sem sessão no dia da prova", sm[6].blocos.length === 0 && sm[6].prova === "dia");
  const fora = c.foraDaSemanaEditada(MATERIAS, manual);
  conferir("🎯 semana editada: diz quais matérias do edital faltam", fora.join(",") === "Matemática,História", fora.join(", "));
  const incl = c.incluirNaSemanaEditada(MATERIAS, manual);
  const nomes = new Set(incl.flat().map((b) => b.materia));
  conferir("\"Incluir\" põe as que faltam e tira a que saiu do edital", MATERIAS.every((m) => nomes.has(m.nome)) && !nomes.has("Química"), [...nomes].join(", "));
  conferir("sem semana editada: nada a avisar", c.foraDaSemanaEditada(MATERIAS, { dias: [1], minutosUtil: 60, minutosFds: 0, bloco: 40 }).length === 0);

  // rotina invalida: diz o que trocou
  const corr = c.correcoesDaRotina({ dias: [], minutosUtil: 900, minutosFds: 60, bloco: 33 });
  conferir("🎯 rotina inválida: diz o que foi trocado", corr.length === 3, corr.join(", "));
  conferir("rotina válida: nada a dizer", c.correcoesDaRotina({ dias: [1, 3], minutosUtil: 60, minutosFds: 0, bloco: 25 }).length === 0);

  // o chefe: na reta final, o ponto fraco e do que JA foi estudado
  const fatos = { atributos: {}, materias: [{ nome: "Português", peso: 5, progresso: 0 }, { nome: "Física", peso: 1, progresso: 30 }] };
  const em5 = ch.chefeDe({ nome: "Prova", data: somaDias(hojeSP(), 5) }, fatos);
  conferir("🎯 chefe na reta final não manda revisar o que nunca viu", em5 && /Física/.test(em5.conselho) && !/Português/.test(em5.conselho), em5?.conselho);
  const em20 = ch.chefeDe({ nome: "Prova", data: somaDias(hojeSP(), 20) }, fatos);
  conferir("chefe a 20 dias: 0% é \"Comece\", não \"Revise\"", em20 && /^Comece Português/.test(em20.conselho), em20?.conselho);
  conferir("prova passada: o cartão do que vem agora", typeof ch.provaPassadaDe === "function"
    && ch.provaPassadaDe({ data: somaDias(hojeSP(), -10) })?.diasDepois === 10 && ch.provaPassadaDe({ data: somaDias(hojeSP(), 3) }) === null);
}

async function servidorDeVerdade(cab) {
  console.log("\n== 3. O SERVIDOR (antes da IA: não gasta crédito) ==");
  const r = await req("/functions/v1/processar-edital", { method: "GET", headers: { apikey: PUB } });
  conferir("método errado: mensagem com acento", r.status === 405 && /Método não suportado/.test(r.corpo?.error || ""), `${r.status} ${r.corpo?.error || ""}`);
  if (!cab) return falha("sem sessao de teste para o envio do arquivo");
  // arquivo que nao e PDF: recusado na conferencia, ANTES da IA (nao conta na cota, nao custa)
  const a = await req("/functions/v1/processar-edital", { method: "POST", headers: cab, body: JSON.stringify({ pdfBase64: "!!!!nao-e-pdf" }) });
  conferir("🎯 arquivo inválido: diz que é o ARQUIVO, com acento", a.status === 400 && /não abriu como PDF/.test(a.corpo?.error || ""), `${a.status} ${String(a.corpo?.error || "").slice(0, 50)}`);
}

(async () => {
  await regras();

  let uid = null, nav = null, cabTeste = null;
  const pdfArq = path.join(os.tmpdir(), `astral-falha-${Date.now()}.pdf`);
  fs.writeFileSync(pdfArq, Buffer.from(`%PDF-1.4\n% falha-${Date.now()}\n%%EOF\n`));
  await new Promise((r) => servidor.listen(PORTA, r));
  try {
    console.log("\n== 2. A TELA (conta de teste na produção) ==");
    const npx = path.join(process.env.LOCALAPPDATA, "npm-cache", "_npx");
    let pw = null; for (const d of fs.readdirSync(npx)) { const p = path.join(npx, d, "node_modules", "playwright"); if (fs.existsSync(p)) { pw = require(p); break; } }
    if (!pw) throw new Error("playwright nao encontrado");

    const email = `prova-crono-${Date.now()}@astral-teste.local`;
    const u = await req("/auth/v1/admin/users", { method: "POST", headers: admin, body: JSON.stringify({ email, password: "T!" + crypto.randomUUID(), email_confirm: true }) });
    uid = u.corpo.id;
    const link = await req("/auth/v1/admin/generate_link", { method: "POST", headers: admin, body: JSON.stringify({ type: "magiclink", email }) });
    const s = (await req("/auth/v1/verify", { method: "POST", headers: { apikey: PUB, "Content-Type": "application/json" }, body: JSON.stringify({ type: "magiclink", token_hash: link.corpo.hashed_token }) })).corpo;
    const cab = { apikey: PUB, Authorization: `Bearer ${s.access_token}`, "Content-Type": "application/json" };
    cabTeste = cab;

    nav = await pw.chromium.launch();
    const ctx = await nav.newContext({ viewport: { width: 1280, height: 900 } });
    await ctx.addInitScript(require("./testes/aceite-de-teste.js").SCRIPT);
    await ctx.addInitScript(`localStorage.setItem("sb-${REF}-auth-token", ${JSON.stringify(JSON.stringify({ access_token: s.access_token, refresh_token: s.refresh_token, token_type: "bearer", expires_at: Math.floor(Date.now() / 1000) + 3600, user: s.user }))});`);
    await ctx.route("**/functions/v1/buscar-recursos", (r) => r.fulfill({ status: 402, contentType: "application/json", body: '{"error":"sem credito (teste)"}' }));
    const pg = await ctx.newPage();
    const erros = []; pg.on("pageerror", (e) => erros.push(e.message));
    let dialogo = null, aceitar = false;
    pg.on("dialog", async (d) => { dialogo = d.message(); aceitar ? await d.accept() : await d.dismiss(); });

    // ── EDI-04: conta nova, sem edital e sem rotina; a leitura falha ──
    let servico = 503;
    await pg.route("**/functions/v1/processar-edital", (r) => servico === 0 ? r.abort("internetdisconnected")
      : r.fulfill({ status: servico, contentType: "application/json", body: JSON.stringify({ error: "O serviço de IA está indisponível no momento — o problema é do nosso lado, não do seu arquivo nem da sua internet. Tente de novo mais tarde; nada foi descontado de você." }) }));
    await pg.goto(`http://localhost:${PORTA}/dashboard.html`, { waitUntil: "load" });
    await pg.waitForSelector("#upload-area", { state: "visible", timeout: 25000 });
    await pg.waitForTimeout(1500);
    conferir("sem edital: o questionário de rotina NÃO abre ao entrar", (await pg.$(".rotina-fundo")) === null);
    await pg.setInputFiles("#file-input", pdfArq);
    const escrito = await pg.waitForSelector("#upload-falha:not([hidden])", { timeout: 15000 }).then((e) => e.textContent()).catch(() => null);
    conferir("🎯 falha do serviço: a razão fica escrita na área de envio", !!escrito && /do nosso lado/.test(escrito), (escrito || "nada escrito").slice(0, 60));
    conferir("e o questionário de rotina não abre por cima", (await pg.$(".rotina-fundo")) === null);
    servico = 0;
    await pg.setInputFiles("#file-input", pdfArq);
    await pg.waitForTimeout(2500);
    const semNet = await pg.textContent("#upload-falha").catch(() => "");
    conferir("🎯 sem internet: diz que é a conexão, com acento", /Sem conexão com o servidor/.test(semNet), semNet.slice(0, 60));

    // ── A conta com edital: Portugues e Fisica estudados ha 10 dias ──
    const dezDias = new Date(Date.now() - 10 * 86400000).toISOString();
    await req("/rest/v1/sessoes_estudo", { method: "POST", headers: { ...admin, Prefer: "return=minimal" },
      body: JSON.stringify([{ usuario_id: uid, materia: "Português", segundos: 7200, xp: 240, modo: "livre", criado_em: dezDias },
                            { usuario_id: uid, materia: "Física", segundos: 7200, xp: 240, modo: "livre", criado_em: dezDias }]) });
    const salvar = (dataProva) => req("/rest/v1/rpc/salvar_progresso", { method: "POST", headers: cab, body: JSON.stringify({ p_xp: 0, p_streak: 0, p_horas: 0,
      p_edital: { nome: "Teste Prova no Cronograma", forca: "exercito", patenteInicial: null, dataProva },
      p_materias: MATERIAS.map(({ nome, peso }) => ({ nome, peso, progresso: 0 })), p_cronograma_hoje: [], p_badges: [], p_tag_escolhida: null }) });
    const rotina = (r) => req(`/rest/v1/progresso?usuario_id=eq.${uid}`, { method: "PATCH", headers: admin, body: JSON.stringify({ rotina: r }) });
    const ROTINA = { dias: [0, 1, 2, 3, 4, 5, 6], minutosUtil: 120, minutosFds: 120, bloco: 40, respondidoEm: new Date().toISOString() };

    // prova AMANHA: todo dia desta semana antes dela esta a 7 dias ou menos
    const amanha = somaDias(hojeSP(), 1);
    await salvar(br(amanha));
    await rotina(ROTINA);
    const mats = (await req(`/rest/v1/progresso?usuario_id=eq.${uid}&select=materias`, { headers: admin })).corpo?.[0]?.materias || [];
    const estudadas = mats.filter((m) => Number(m.progresso) > 0).map((m) => m.nome);
    conferir("preparo: o servidor mediu Português e Física", estudadas.includes("Português") && estudadas.includes("Física") && !estudadas.includes("Matemática"), estudadas.join(", ") || "nenhuma");

    await pg.goto(`http://localhost:${PORTA}/cronograma.html`, { waitUntil: "load" });
    await pg.waitForSelector(".grade", { timeout: 25000 });
    const aviso = await pg.textContent(".card").catch(() => "");
    conferir("🎯 cronograma avisa a reta final, com a data", /Reta final/.test(aviso) && aviso.includes(br(amanha)), br(amanha));
    const naGrade = await pg.$$eval(".grade .bloco-materia", (els) => els.map((e) => e.textContent.trim()));
    const abriu = naGrade.filter((n) => NUNCA.has(n));
    conferir("🎯 a semana não abre frente nova", naGrade.length > 0 && abriu.length === 0, abriu.length ? `apareceu: ${[...new Set(abriu)].join(", ")}` : `${naGrade.length} blocos`);
    const domingo = new Date(Date.now() - 3 * 3600e3).getUTCDay() === 0;
    if (domingo) ok("dia da prova cai na semana que vem", "(hoje é domingo: não se confere a marca)");
    else conferir("o dia da prova aparece marcado", (await pg.$$eval(".folga.prova", (els) => els.map((e) => e.textContent))).some((t) => /dia da prova/.test(t)));

    // ── CRO-04: semana editada a mao sem Matematica/Historia ──
    await rotina({ ...ROTINA, semana: [[], [{ materia: "Português", minutos: 40 }], [{ materia: "Física", minutos: 40 }], [], [], [], []] });
    await salvar(null);
    await pg.reload({ waitUntil: "load" }); await pg.waitForSelector(".grade", { timeout: 25000 });
    const avisoManual = await pg.textContent(".aviso-crono.alerta").catch(() => "");
    conferir("🎯 semana editada avisa as matérias que faltam", /Matemática/.test(avisoManual) && /História/.test(avisoManual), avisoManual.replace(/\s+/g, " ").slice(0, 70));
    await pg.click("#incluir-faltando"); await pg.waitForTimeout(2500);
    const semanaGravada = (await req(`/rest/v1/progresso?usuario_id=eq.${uid}&select=rotina`, { headers: admin })).corpo?.[0]?.rotina?.semana || [];
    const gravadas = new Set(semanaGravada.flat().map((b) => b.materia));
    conferir("\"Incluir na semana\" grava as que faltavam", MATERIAS.every((m) => gravadas.has(m.nome)), [...gravadas].join(", "));

    // "Voltar ao automatico" pergunta antes
    await pg.click("#editar"); await pg.click("#automatico"); await pg.waitForTimeout(1500);
    const aindaManual = (await req(`/rest/v1/progresso?usuario_id=eq.${uid}&select=rotina`, { headers: admin })).corpo?.[0]?.rotina?.semana;
    conferir("🎯 \"Voltar ao automático\" pede confirmação", !!dialogo && Array.isArray(aindaManual), dialogo ? "cancelado: a semana ficou" : "apagou sem perguntar");
    aceitar = true; dialogo = null;
    await pg.click("#automatico"); await pg.waitForTimeout(2500);
    const depois = (await req(`/rest/v1/progresso?usuario_id=eq.${uid}&select=rotina`, { headers: admin })).corpo?.[0]?.rotina?.semana;
    conferir("confirmado: volta ao automático", !!dialogo && depois == null);

    // ── CRO-05: rotina gravada com valor invalido ──
    await rotina({ ...ROTINA, minutosUtil: 900 });
    await pg.reload({ waitUntil: "load" }); await pg.waitForSelector(".grade", { timeout: 25000 });
    const avisoRotina = await pg.$$eval(".aviso-crono", (els) => els.map((e) => e.textContent).join(" ")).catch(() => "");
    conferir("🎯 rotina inválida: a tela avisa o que trocou", /tempo nos dias úteis/.test(avisoRotina), avisoRotina.replace(/\s+/g, " ").slice(0, 70));
    await rotina(ROTINA);

    // ── CRO-03: prova que ja passou -- o painel pergunta o que vem agora ──
    const passou = somaDias(hojeSP(), -12);
    await salvar(br(passou));
    await pg.goto(`http://localhost:${PORTA}/dashboard.html`, { waitUntil: "load" });
    const cartao = await pg.waitForSelector("#prova-passada:not([hidden])", { timeout: 25000 }).then((e) => e.textContent()).catch(() => null);
    conferir("🎯 prova passada: o painel pergunta pelo próximo concurso", !!cartao && cartao.includes(br(passou)) && /outro concurso/.test(cartao), (cartao || "não apareceu").replace(/\s+/g, " ").slice(0, 60));
    conferir("e oferece corrigir a data", !!(await pg.$("#prova-corrigir")));
    await pg.goto(`http://localhost:${PORTA}/cronograma.html`, { waitUntil: "load" });
    await pg.waitForSelector(".grade", { timeout: 25000 });
    const avisoPassou = await pg.$$eval(".aviso-crono", (els) => els.map((e) => e.textContent).join(" ")).catch(() => "");
    conferir("o cronograma também pergunta", avisoPassou.includes(br(passou)) && /outro concurso/.test(avisoPassou));

    erros.length ? falha("erro de JavaScript", erros[0].slice(0, 80)) : ok("nenhum erro de JavaScript");
  } catch (e) {
    falha("o teste quebrou", e.message.slice(0, 140));
  } finally {
    if (nav) await nav.close();
    servidor.close();
    try { await servidorDeVerdade(cabTeste); } catch (e) { falha("servidor", e.message.slice(0, 80)); }
    if (uid) await req(`/auth/v1/admin/users/${uid}`, { method: "DELETE", headers: admin });
    fs.rmSync(pdfArq, { force: true });
    console.log("\n  (conta de teste apagada)");
    console.log("\n" + "=".repeat(70));
    console.log(falhas === 0 ? "O CRONOGRAMA USA A DATA DA PROVA, E A TELA DIZ O QUE ACONTECEU." : `🔴 ${falhas} FALHA(S).`);
    process.exit(falhas ? 1 : 0);
  }
})();
