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
    // 09/10/2026 (3.13, decisao 13): 2 por minuto inteiro, igual ao cronometro (era meio por minuto, minimo 10)
    const xpServidor = (min) => Math.floor(min) * 2;
    s.flatMap((d) => d.blocos).every((b) => b.xp === xpServidor(b.minutos))
      ? ok("XP de cada bloco = a regra do servidor", "2 por minuto, igual ao cronômetro") : falha("XP diferente do servidor");
    JSON.stringify(C.montarSemana(MATERIAS, rot)) === JSON.stringify(s) ? ok("mesma rotina, mesma semana", "sem sorteio") : falha("semana muda sozinha");
    const porMin = {}; s.forEach((d) => d.blocos.forEach((b) => (porMin[b.materia] = (porMin[b.materia] || 0) + b.minutos)));
    porMin["Física"] > porMin["História"] ? ok("pesada e fraca ganha mais tempo que a dominada", `Física ${porMin["Física"]}′ × História ${porMin["História"]}′`) : falha("distribuição não segue a necessidade");
    const editada = C.montarSemana(MATERIAS, { ...rot, semana: [[], [{ materia: "Física", minutos: 30 }, { materia: "Matéria que saiu", minutos: 30 }], [], [], [], [], []] });
    editada[1].blocos.length === 1 && editada[1].blocos[0].materia === "Física"
      ? ok("semana editada vale, sem matéria que saiu do edital") : falha("semana editada", JSON.stringify(editada[1]));
  }

  /* 03/10/2026 (auditoria CRO-01, roadmap 2.4): ROTINA CURTA. Com 1 dia de 1 h
     (opcao da tela), Historia, Geografia e Informatica nunca apareciam em 52
     semanas. Agora elas se revezam. A simulacao e a da auditoria: o dominio
     sobe so pelo tempo estudado (o melhor caso para quem ja aparece). */
  console.log("\n== 1b. ROTINA CURTA: AS MATÉRIAS SE REVEZAM ==");
  for (const [rotulo, rot, espera] of [
    ["1 dia de 1h (2 blocos)", { dias: [6], minutosUtil: 60, minutosFds: 60, bloco: 25 }, 5],
    ["2 dias de 1h (2 blocos)", { dias: [3, 6], minutosUtil: 60, minutosFds: 60, bloco: 50 }, 5],
    ["1 dia de 30min (1 bloco)", { dias: [6], minutosUtil: 30, minutosFds: 30, bloco: 30 }, 9],
  ]) {
    const min = Object.fromEntries(MATERIAS.map((m) => [m.nome, 0]));
    const ultima = {}; let pior = 0;
    for (let sem = 1; sem <= 52; sem++) {
      const mats = MATERIAS.map((m) => { const d = Math.round(40 * Math.min(1, min[m.nome] / 600)); return { ...m, progresso: d, medida: { semana: d } }; });
      const nesta = new Set();
      for (const d of C.montarSemana(mats, rot, { semana: 2900 + sem })) for (const b of d.blocos) { min[b.materia] += b.minutos; nesta.add(b.materia); }
      for (const n of nesta) ultima[n] = sem;
      for (const m of MATERIAS) pior = Math.max(pior, sem - (ultima[m.nome] ?? 0));
    }
    pior <= espera ? ok(`🎯 ${rotulo}: toda matéria volta em até ${espera} semanas`, `maior espera ${pior}`)
      : falha(`${rotulo}: matéria some por tempo demais`, `${pior} semanas (limite ${espera})`);
  }
  /* 03/10/2026 (auditoria NUM-04, roadmap 2.7): o CRONOMETRO marca o bloco.
     Antes so a sessao marcada no cronograma pagava o bloco: quem estudava pelo
     cronometro via o bloco aberto, marcava, e o tempo contava duas vezes. */
  console.log("\n== 1c. O CRONÔMETRO MARCA O BLOCO DO DIA ==");
  {
    const semana = [0, 1, 2, 3, 4, 5, 6].map((dia) => ({ dia, estuda: true,
      blocos: [{ materia: "Física", minutos: 40, xp: 20 }, { materia: "Química", minutos: 40, xp: 20 }, { materia: "Física", minutos: 40, xp: 20 }] }));
    const agora = new Date("2026-10-05T15:00:00Z");
    const b1 = C.blocosDeHoje(semana, [{ materia: "Física", modo: "pomodoro", segundos: 40 * 60 }], agora);
    b1[0].feito && !b1[1].feito && !b1[2].feito
      ? ok("🎯 40 min de Física no cronômetro marcam o 1º bloco de Física", "pomodoro conta") : falha("cronômetro não marcou o bloco", JSON.stringify(b1.map((b) => b.feito)));
    const b2 = C.blocosDeHoje(semana, [{ materia: "física", modo: "livre", segundos: 30 * 60 }], agora);
    b2[0].feito ? ok("75% do bloco medido (30 de 40) conta como feito", "sem diferenciar maiúscula") : falha("30 de 40 não marcou", JSON.stringify(b2[0]));
    const b3 = C.blocosDeHoje(semana, [{ materia: "Física", modo: "livre", segundos: 15 * 60 }], agora);
    !b3[0].feito && b3[0].medido === 15 && b3[0].restante === 25
      ? ok("🎯 bloco pela metade mostra o que falta", "15 medidos, faltam 25 -- marcar grava só os 25") : falha("bloco parcial errado", JSON.stringify(b3[0]));
    const b4 = C.blocosDeHoje(semana, [{ materia: "Física", modo: "pomodoro", segundos: 80 * 60 }], agora);
    b4[0].feito && b4[2].feito && !b4[1].feito ? ok("80 min de Física pagam os 2 blocos de Física, não o de Química") : falha("abatimento na ordem errado", JSON.stringify(b4.map((b) => b.feito)));
    const b5 = C.blocosDeHoje(semana, [{ materia: "Física", modo: "cronograma", segundos: 40 * 60 }, { materia: "Física", modo: "livre", segundos: 40 * 60 }], agora);
    b5[0].feito && b5[2].feito ? ok("marcado + cronometrado: cada um paga o seu bloco") : falha("marcado e medido se atrapalharam", JSON.stringify(b5.map((b) => b.feito)));
    const b6 = C.blocosDeHoje(semana, [{ materia: "Geral", modo: "livre", segundos: 120 * 60 }], agora);
    b6.every((b) => !b.feito) ? ok("tempo em 'Geral' não marca bloco de matéria") : falha("'Geral' marcou bloco");
  }
  {
    const rot = { dias: [6], minutosUtil: 60, minutosFds: 60, bloco: 25 };
    JSON.stringify(C.montarSemana(MATERIAS, rot, { semana: 3000 })) === JSON.stringify(C.montarSemana(MATERIAS, rot, { semana: 3000 }))
      ? ok("rotina curta: mesma semana, mesma resposta", "o rodízio anda por semana, não por visita") : falha("rotina curta muda a cada visita");
    const padrao = C.montarSemana(MATERIAS, C.ROTINA_PADRAO, { semana: 1 });
    JSON.stringify(padrao) === JSON.stringify(C.montarSemana(MATERIAS, C.ROTINA_PADRAO, { semana: 2 }))
      ? ok("rotina que cabe todas: o número da semana não muda nada") : falha("rodízio mexeu em rotina que não precisa");
    const seg = new Date("2026-10-05T03:00:00Z"), dom = new Date("2026-10-05T02:59:00Z");   // 00:00 de segunda em SP
    C.numeroDaSemana(seg) === C.numeroDaSemana(dom) + 1 ? ok("a semana vira à meia-noite de segunda, no horário de Brasília")
      : falha("a semana vira na hora errada", `${C.numeroDaSemana(dom)} -> ${C.numeroDaSemana(seg)}`);
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
    await ctx.addInitScript(require("./testes/aceite-de-teste.js").SCRIPT);   // 02/10/2026: o aceite (LGL-01)
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
    // 09/10/2026 (3.14, CRO-04): "Voltar ao automatico" pergunta antes -- o teste confirma
    // (a pergunta em si, e o "cancelar" que nao apaga, sao do testa-prova-no-cronograma)
    pg.once("dialog", (d) => d.accept());
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
