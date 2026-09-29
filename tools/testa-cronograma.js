/* ═══════════════════════════════════════════════════════════════════════════
   TESTA-CRONOGRAMA -- rotina, semana e a sessao de hoje, de ponta a ponta.

   POR QUE EXISTE (28/09/2026)
   Tres pedidos dele no mesmo dia: o cronograma "fora de simetria", o
   questionario de rotina que nunca existiu, e poder editar a semana a mao.
   E um defeito achado no caminho: a "Sessao de hoje" do dashboard nascia no
   dia do edital e nunca se renovava, e discordava da aba Cronograma.

   1. A CONTA (sem navegador): a semana respeita os dias escolhidos, o tempo
      do dia, nao repete materia no dia, toda materia aparece, e o XP de cada
      bloco e a regra do servidor.
   2. A TELA, com uma conta descartavel: o questionario aparece so na
      primeira vez e grava; a semana tem 7 colunas IGUAIS; a sessao de hoje
      do dashboard e a coluna de hoje do cronograma; editar, salvar,
      recarregar, voltar ao automatico; marcar feito sobrevive ao recarregar.

   USO   node tools/testa-cronograma.js [--fotos pasta]
   ═══════════════════════════════════════════════════════════════════════════ */

const { execSync } = require("child_process");
const fs = require("fs");
const http = require("http");
const path = require("path");
const url = require("url");

const REF = "jjogmcacbdefwiwcyjxp";
const BASE = `https://${REF}.supabase.co`;
const RAIZ = path.resolve(__dirname, "..");
const PORTA = 8892;
const FOTOS = (() => { const i = process.argv.indexOf("--fotos"); return i > 0 ? process.argv[i + 1] : null; })();

let falhas = 0;
const ok = (t, d = "") => console.log(`  OK     ${t.padEnd(56)} ${d}`);
const falha = (t, d = "") => { console.log(`  FALHA  ${t.padEnd(56)} ${d}`); falhas++; };

const MATERIAS = [
  { nome: "Português", peso: 20, progresso: 72, questoes: 20 }, { nome: "Matemática", peso: 15, progresso: 55, questoes: 15 },
  { nome: "Física", peso: 12, progresso: 38, questoes: 12 }, { nome: "Química", peso: 10, progresso: 30, questoes: 10 },
  { nome: "Biologia", peso: 10, progresso: 64, questoes: 10 }, { nome: "Legislação", peso: 10, progresso: 50, questoes: 10 },
  { nome: "História", peso: 8, progresso: 80, questoes: 8 }, { nome: "Geografia", peso: 8, progresso: 45, questoes: 8 },
  { nome: "Informática", peso: 7, progresso: 25, questoes: 7 },
];

function acharPlaywright() {
  try { return require("playwright"); } catch { /* segue */ }
  const base = process.env.LOCALAPPDATA ? path.join(process.env.LOCALAPPDATA, "npm-cache", "_npx") : null;
  if (!base || !fs.existsSync(base)) return null;
  for (const d of fs.readdirSync(base)) {
    const alvo = path.join(base, d, "node_modules", "playwright");
    if (fs.existsSync(alvo)) { try { return require(alvo); } catch { /* proximo */ } }
  }
  return null;
}

(async () => {
  console.log("\nTESTA-CRONOGRAMA\n\n== 1. A CONTA DA SEMANA ==");
  const C = await import(url.pathToFileURL(path.join(RAIZ, "assets/js/cronograma.js")).href);
  {
    const rot = { dias: [1, 3, 5, 6], minutosUtil: 180, minutosFds: 240, bloco: 50 };
    const s = C.montarSemana(MATERIAS, rot);
    const soDias = s.every((d) => (d.blocos.length > 0) === rot.dias.includes(d.dia));
    soDias ? ok("so estuda nos dias escolhidos", "Seg, Qua, Sex, Sáb") : falha("estudou fora dos dias", JSON.stringify(s.map((d) => d.blocos.length)));
    const orcamento = s.every((d) => {
      const m = d.blocos.reduce((a, b) => a + b.minutos, 0);
      const alvo = !rot.dias.includes(d.dia) ? 0 : (d.dia === 0 || d.dia === 6 ? 240 : 180);
      return Math.abs(m - alvo) <= 5;
    });
    orcamento ? ok("cada dia soma o tempo escolhido", "3h nos úteis, 4h no sábado") : falha("tempo do dia errado");
    const semRepetir = s.every((d) => new Set(d.blocos.map((b) => b.materia)).size === d.blocos.length);
    semRepetir ? ok("nenhuma matéria repete no mesmo dia") : falha("matéria repetida no dia");
    const todas = new Set(s.flatMap((d) => d.blocos.map((b) => b.materia)));
    todas.size === MATERIAS.length ? ok("🎯 toda matéria aparece na semana", `${todas.size} de ${MATERIAS.length}`) : falha("matéria sumiu da semana", `${todas.size}`);
    const xpServidor = (min) => Math.max(10, Math.round(min * 60 / 120));
    s.flatMap((d) => d.blocos).every((b) => b.xp === xpServidor(b.minutos))
      ? ok("XP de cada bloco = a regra do servidor", "meio por minuto, mínimo 10") : falha("XP diferente do servidor");
    JSON.stringify(C.montarSemana(MATERIAS, rot)) === JSON.stringify(s) ? ok("mesma rotina, mesma semana", "sem sorteio") : falha("semana muda sozinha");
    const porMin = {}; s.forEach((d) => d.blocos.forEach((b) => (porMin[b.materia] = (porMin[b.materia] || 0) + b.minutos)));
    porMin["Física"] > porMin["História"] ? ok("pesada e fraca ganha mais tempo que a dominada", `Física ${porMin["Física"]}′ × História ${porMin["História"]}′`) : falha("distribuição não segue a necessidade");
    const editada = C.montarSemana(MATERIAS, { ...rot, semana: [[], [{ materia: "Física", minutos: 30 }, { materia: "Matéria que saiu", minutos: 30 }], [], [], [], [], []] });
    editada[1].blocos.length === 1 && editada[1].blocos[0].materia === "Física"
      ? ok("semana editada vale, sem matéria que saiu do edital") : falha("semana editada", JSON.stringify(editada[1]));
  }

  const pw = acharPlaywright();
  if (!pw) { console.log("\n  (playwright não encontrado -- a parte de TELA foi pulada)"); process.exit(falhas ? 1 : 0); }

  const chaves = JSON.parse(execSync(`supabase projects api-keys --project-ref ${REF} -o json`, { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }));
  const SK = chaves.find((k) => k.name === "service_role").api_key;
  const PUB = (fs.readFileSync(path.join(RAIZ, "assets/js/astral.js"), "utf8").match(/sb_publishable_[A-Za-z0-9_-]+/) || [])[0];
  const admin = { apikey: SK, Authorization: `Bearer ${SK}`, "Content-Type": "application/json" };
  const req = async (c, o) => { const r = await fetch(BASE + c, o); const t = await r.text(); try { return JSON.parse(t); } catch { return null; } };
  const tipos = { ".html": "text/html", ".css": "text/css", ".js": "text/javascript", ".woff2": "font/woff2", ".svg": "image/svg+xml" };
  const srv = http.createServer((q, r) => {
    const u = decodeURIComponent(q.url.split("?")[0]); const arq = path.join(RAIZ, u === "/" ? "/index.html" : u);
    if (!path.resolve(arq).startsWith(RAIZ) || !fs.existsSync(arq) || fs.statSync(arq).isDirectory()) { r.writeHead(404); return r.end(); }
    r.writeHead(200, { "Content-Type": tipos[path.extname(arq)] || "text/plain" }); r.end(fs.readFileSync(arq));
  });

  const email = `cronograma-${Date.now()}@astral-teste.local`;
  const u = await req("/auth/v1/admin/users", { method: "POST", headers: admin, body: JSON.stringify({ email, password: "T!" + crypto.randomUUID(), email_confirm: true }) });
  await new Promise((r) => srv.listen(PORTA, r));
  let nav = null;
  try {
    await req("/rest/v1/progresso", { method: "POST", headers: { ...admin, Prefer: "return=minimal" },
      body: JSON.stringify({ usuario_id: u.id, materias: MATERIAS, edital: { nome: "Teste Bombeiro", dataProva: "06/12/2026", forca: "bombeiros" } }) });
    const link = await req("/auth/v1/admin/generate_link", { method: "POST", headers: admin, body: JSON.stringify({ type: "magiclink", email }) });
    const s = await req("/auth/v1/verify", { method: "POST", headers: { apikey: PUB, "Content-Type": "application/json" }, body: JSON.stringify({ type: "magiclink", token_hash: link.hashed_token }) });
    nav = await pw.chromium.launch();
    const ctx = await nav.newContext({ viewport: { width: 1440, height: 950 } });
    await ctx.addInitScript(`localStorage.setItem("sb-${REF}-auth-token", ${JSON.stringify(JSON.stringify({ access_token: s.access_token, refresh_token: s.refresh_token, token_type: "bearer", expires_at: Math.floor(Date.now() / 1000) + 3600, user: s.user }))});`);
    const pg = await ctx.newPage();
    const erros = []; pg.on("pageerror", (e) => erros.push(e.message));
    const abrir = async (pag) => { await pg.goto(`http://localhost:${PORTA}/${pag}`, { waitUntil: "load" }); await pg.waitForTimeout(3000); };
    const rotinaNoBanco = async () => (await req(`/rest/v1/progresso?usuario_id=eq.${u.id}&select=rotina`, { headers: admin }))[0]?.rotina;

    console.log("\n== 2. O QUESTIONÁRIO ==");
    await abrir("dashboard.html");
    const abriu = await pg.$(".rotina-caixa");
    abriu ? ok("🎯 primeira vez: o questionário aparece sozinho") : falha("questionário não apareceu");
    // Escolhe: hoje + mais dois dias, 3h, blocos de 50 min.
    const hojeDia = new Date().getDay();
    const escolhidos = [...new Set([hojeDia, (hojeDia + 2) % 7, (hojeDia + 4) % 7])];
    await pg.evaluate((dias) => {
      document.querySelectorAll(".rotina-caixa [data-dia]").forEach((b) => {
        const quero = dias.includes(Number(b.dataset.dia));
        if ((b.getAttribute("aria-pressed") === "true") !== quero) b.click();
      });
      document.querySelectorAll('.rotina-caixa [data-q="minutosUtil"] [data-valor="180"], .rotina-caixa [data-q="minutosFds"] [data-valor="180"], .rotina-caixa [data-q="bloco"] [data-valor="50"]').forEach((b) => b.click());
    }, escolhidos);
    const previa = await pg.textContent("#rotina-previa");
    await pg.click("#rotina-ok");
    await pg.waitForTimeout(1500);
    const r1 = await rotinaNoBanco();
    r1 && JSON.stringify([...r1.dias].sort()) === JSON.stringify([...escolhidos].sort()) && r1.minutosUtil === 180 && r1.bloco === 50
      ? ok("as respostas foram gravadas na conta", previa.replace(/\s+/g, " ").trim().slice(0, 60)) : falha("rotina não gravou", JSON.stringify(r1));

    await abrir("dashboard.html");
    (await pg.$(".rotina-caixa")) ? falha("o questionário voltou a aparecer") : ok("segunda visita: não pergunta de novo");
    const hojeDash = await pg.$$eval("#today-list .today-materia", (els) => els.map((e) => e.textContent.trim()));

    console.log("\n== 3. A PÁGINA CRONOGRAMA ==");
    await abrir("cronograma.html");
    if (FOTOS) await pg.screenshot({ path: path.join(FOTOS, "cronograma.png"), fullPage: true });
    const grade = await pg.evaluate(() => ({
      larguras: [...document.querySelectorAll(".grade > .dia")].map((d) => Math.round(d.getBoundingClientRect().width)),
      tops: [...document.querySelectorAll(".grade > .dia")].map((d) => Math.round(d.getBoundingClientRect().top)),
      comBloco: [...document.querySelectorAll(".grade > .dia")].map((d) => d.querySelectorAll(".bloco").length),
      folgas: document.querySelectorAll(".grade .folga").length,
      hoje: [...document.querySelectorAll(".grade .dia.hoje .bloco-materia")].map((e) => e.textContent.trim()),
    }));
    grade.larguras.length === 7 && new Set(grade.larguras).size === 1 && new Set(grade.tops).size === 1
      ? ok("🎯 7 colunas, todas da mesma largura, numa linha só", `${grade.larguras[0]}px cada`) : falha("grade fora de simetria", JSON.stringify(grade.larguras) + JSON.stringify(grade.tops));
    grade.folgas === 7 - escolhidos.length ? ok("folga nos dias não escolhidos", `${grade.folgas} folgas`) : falha("folgas erradas", String(grade.folgas));
    JSON.stringify(grade.hoje) === JSON.stringify(hojeDash) && hojeDash.length
      ? ok("🎯 a sessão de hoje do dashboard = a coluna de hoje", hojeDash.join(", ")) : falha("dashboard e cronograma discordam", `${hojeDash} × ${grade.hoje}`);

    console.log("\n== 4. EDITAR A SEMANA ==");
    await pg.click("#editar");
    await pg.waitForTimeout(300);
    const antes = await pg.$$eval(".grade .dia.hoje .bloco", (b) => b.length);
    await pg.click(".grade .dia.hoje [data-tirar]");
    await pg.click(".grade .dia.hoje [data-por]");
    await pg.click(".grade .dia.hoje [data-por]");
    if (FOTOS) await pg.screenshot({ path: path.join(FOTOS, "cronograma-editando.png"), fullPage: true });
    await pg.click("#salvar");
    await pg.waitForTimeout(1500);
    const r2 = await rotinaNoBanco();
    r2?.semana?.[hojeDia]?.length === antes + 1 ? ok("tirar um e pôr dois: salvo na conta", `${antes} → ${antes + 1} blocos hoje`) : falha("semana editada não salvou", JSON.stringify(r2?.semana?.[hojeDia]));
    await abrir("cronograma.html");
    const depois = await pg.$$eval(".grade .dia.hoje .bloco", (b) => b.length);
    depois === antes + 1 ? ok("depois de recarregar, a semana é a editada") : falha("edição sumiu ao recarregar", `${depois}`);
    const painel = await pg.textContent(".painel-rotina");
    /à mão/.test(painel) ? ok("o painel diz que a semana foi ajustada à mão") : falha("painel", painel);
    await pg.click("#editar"); await pg.waitForTimeout(200);
    await pg.click("#automatico"); await pg.waitForTimeout(1500);
    (await rotinaNoBanco())?.semana === null ? ok("voltar ao automático limpa a edição") : falha("automático não limpou");

    console.log("\n== 5. MARCAR FEITO ==");
    await abrir("dashboard.html");
    const materiaFeita = await pg.textContent("#today-list .today-materia");
    await pg.click("#today-list .today-check");
    await pg.waitForTimeout(2000);
    const sess = await req(`/rest/v1/sessoes_estudo?usuario_id=eq.${u.id}&select=materia,modo,xp`, { headers: admin });
    sess.length === 1 && sess[0].modo === "cronograma" && sess[0].materia === materiaFeita.trim()
      ? ok("marcar feito grava a sessão do cronograma", `${sess[0].materia}, ${sess[0].xp} XP`) : falha("sessão não gravou", JSON.stringify(sess));
    await abrir("dashboard.html");
    const marcado = await pg.$eval("#today-list .today-item", (e) => e.classList.contains("done"));
    marcado ? ok("🎯 recarregou e continua feito", "vem do registro do servidor") : falha("o feito sumiu ao recarregar");
    await abrir("cronograma.html");
    const noCrono = await pg.$eval(".grade .dia.hoje .bloco", (e) => e.classList.contains("feito"));
    noCrono ? ok("e o cronograma também mostra feito") : falha("cronograma não mostra o feito");

    if (FOTOS) { await abrir("dashboard.html"); await pg.screenshot({ path: path.join(FOTOS, "dashboard-rotina.png"), fullPage: false }); }
    erros.length ? falha("erro de JavaScript", erros[0].slice(0, 80)) : ok("nenhum erro de JavaScript nas telas");
  } catch (e) {
    falha("erro no teste: " + e.message);
  } finally {
    if (nav) await nav.close();
    srv.close();
    await fetch(`${BASE}/auth/v1/admin/users/${u.id}`, { method: "DELETE", headers: admin });
    console.log("\n  (conta de teste apagada)");
  }
  console.log("\n" + "=".repeat(74));
  console.log(falhas ? `🔴 ${falhas} FALHA(S).` : "O CRONOGRAMA É UM SÓ, NASCE DA ROTINA E ACEITA AJUSTE À MÃO.");
  process.exit(falhas ? 1 : 0);
})();
