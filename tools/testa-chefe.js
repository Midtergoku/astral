// TESTA-CHEFE -- a prova vira chefe da campanha, sem virar alarme?
//
// Duas camadas: a lógica pura (fases, preparo, ponto fraco) e a tela.
//
// 🔴 A checagem que mais importa não é técnica, é de produto: uma contagem
// regressiva num app de concurso pode fazer mal. Quem presta concurso militar
// já vive com essa data na cabeça. Se a tela só disser "faltam 43 dias", ela
// não informa nada que a pessoa não saiba e mexe com a única coisa que
// atrapalha estudo mais que preguiça: ansiedade.
//
// Por isso o teste exige que TODO estado do chefe traga um conselho concreto
// -- o que fazer, nomeando a matéria. Contagem sem direção é pressão.
const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");
const http = require("http");
const { pathToFileURL } = require("url");

const REF = "jjogmcacbdefwiwcyjxp";
const BASE = `https://${REF}.supabase.co`;
const RAIZ = path.resolve(__dirname, "..");
const PORTA = 8888;

let falhas = 0;
const ok = (t, d = "") => console.log(`  OK     ${t.padEnd(48)} ${d}`);
const falha = (t, d = "") => { console.log(`  FALHA  ${t.padEnd(48)} ${d}`); falhas++; };

const emDias = (n) => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + n);
  const p = (x) => String(x).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};

(async () => {
  const C = await import(pathToFileURL(path.join(RAIZ, "assets", "js", "chefe.js")).href);
  console.log("\nTESTA-CHEFE\n");

  const fatosBase = {
    atributos: { doutrina: { valor: 50 }, amplitude: { valor: 60 } },
    materias: [
      { nome: "Matematica", peso: 3, progresso: 70 },
      { nome: "Fisica", peso: 2, progresso: 20 },      // a mais cara: 2 x 80 = 160
      { nome: "Portugues", peso: 3, progresso: 60 },   // 3 x 40 = 120
    ],
  };

  // ── 1. Sem prova marcada, não há chefe ───────────────────────────────────
  if (C.chefeDe(null, fatosBase) === null) ok("sem prova marcada não há chefe", "a seção some da tela");
  else falha("inventou um chefe sem prova");

  // ── 2. Prova que já passou não cobra mais ────────────────────────────────
  const passada = C.chefeDe({ nome: "EEAR 2025", data: emDias(-3) }, fatosBase);
  if (passada === null) ok("prova que já passou deixa de ser chefe", "não cobra o que já aconteceu");
  else falha("prova passada ainda aparece", JSON.stringify(passada).slice(0, 60));

  // ── 3. As fases, e o tom de cada uma ─────────────────────────────────────
  const fases = [
    [200, "Campanha longa", "calmo"],
    [60,  "Preparação",     "medio"],
    [20,  "Aproximação",    "urgente"],
    [5,   "Reta final",     "urgente"],
    [0,   "O dia chegou",   "agora"],
  ];
  let faseOk = 0;
  for (const [dias, nome, tom] of fases) {
    const c = C.chefeDe({ nome: "EEAR 2026", data: emDias(dias) }, fatosBase);
    if (c?.fase === nome && c?.tom === tom && c?.dias === dias) faseOk++;
    else falha(`fase de ${dias} dias`, `${c?.fase}/${c?.tom}/${c?.dias} (esperado ${nome}/${tom}/${dias})`);
  }
  if (faseOk === fases.length) ok("as cinco fases mudam na hora certa", fases.map((f) => `${f[0]}d=${f[1]}`).join(" · "));

  // ── 4. 🔴 NENHUMA fase é puro alarme ─────────────────────────────────────
  // Toda fase precisa de conselho concreto, e nenhum texto pode ser pânico.
  const PANICO = /desesper|p[âa]nico|voc[êe] vai (perder|falhar)|tarde demais|imposs[íi]vel|acabou/i;
  let semConselho = 0, comPanico = 0;
  for (const [dias] of fases) {
    const c = C.chefeDe({ nome: "EEAR", data: emDias(dias) }, fatosBase);
    if (!c?.conselho || c.conselho.length < 12) semConselho++;
    if (PANICO.test(`${c?.frase} ${c?.conselho}`)) comPanico++;
  }
  if (semConselho === 0) ok("🎯 toda fase diz o que FAZER", "contagem sem direção é só pressão");
  else falha("fase sem conselho", `${semConselho} de ${fases.length}`);
  if (comPanico === 0) ok("nenhum texto é pânico", "motiva, não assusta");
  else falha("texto de pânico", `${comPanico} fases`);

  // ── 5. O ponto fraco é o que CUSTA mais, não o menor número ─────────────
  // Física está em 20% e Português em 60%. Mas Português tem peso 3.
  // Custo: Física 2x80=160, Português 3x40=120. Física ganha -- e é o certo.
  const fraco = C.pontoFraco(fatosBase.materias);
  if (fraco?.nome === "Fisica") ok("o ponto fraco pesa peso × o que falta", `${fraco.nome} (custo ${fraco.custo})`);
  else falha("ponto fraco errado", JSON.stringify(fraco));

  // Se o peso virar, a resposta tem de virar junto.
  const outro = C.pontoFraco([
    { nome: "Matematica", peso: 5, progresso: 50 },   // 5 x 50 = 250
    { nome: "Fisica", peso: 1, progresso: 20 },       // 1 x 80 =  80
  ]);
  if (outro?.nome === "Matematica") ok("peso maior vence porcentagem menor", `${outro.nome} (custo ${outro.custo})`);
  else falha("o peso não está pesando", JSON.stringify(outro));

  if (C.pontoFraco([]) === null) ok("sem matérias não inventa ponto fraco");
  else falha("inventou ponto fraco sem matérias");

  // Tudo em 100% não tem ponto fraco -- e o conselho muda de tom.
  const pleno = C.chefeDe({ nome: "EEAR", data: emDias(40) },
    { ...fatosBase, materias: [{ nome: "Tudo", peso: 3, progresso: 100 }] });
  if (!pleno.fraco && /em dia|mantenha/i.test(pleno.conselho)) ok("quem domina tudo recebe outro conselho", pleno.conselho);
  else falha("conselho errado para quem domina tudo", pleno.conselho);

  // ── 6. O preparo mede CONHECIMENTO, não hábito ───────────────────────────
  // 50 de doutrina e 60 de amplitude -> 0,7x50 + 0,3x60 = 53.
  const p = C.preparoDe(fatosBase);
  if (p === 53) ok("o preparo é 70% doutrina e 30% amplitude", `${p} / 100`);
  else falha("conta do preparo", `${p} (esperado 53)`);

  // 🔴 Disciplina e resistência NÃO podem mexer no preparo: quem estuda todo
  // dia há uma semana tem hábito ótimo e preparo baixo. Misturar faria o
  // número mentir justamente para quem mais precisa da verdade.
  const comHabito = C.preparoDe({
    atributos: {
      doutrina: { valor: 50 }, amplitude: { valor: 60 },
      disciplina: { valor: 100 }, resistencia: { valor: 100 },
    },
  });
  if (comHabito === 53) ok("🎯 hábito não infla o preparo", "disciplina 100 não mudou nada");
  else falha("hábito está inflando o preparo", `${comHabito} (deveria ser 53)`);

  if (C.preparoDe({}) === 0) ok("sem atributos o preparo é 0");
  else falha("preparo inventado do nada", String(C.preparoDe({})));

  // ── 7. A TELA ────────────────────────────────────────────────────────────
  function acharPlaywright() {
    try { return require("playwright"); } catch { /* segue */ }
    const base = process.env.LOCALAPPDATA
      ? path.join(process.env.LOCALAPPDATA, "npm-cache", "_npx")
      : path.join(require("os").homedir(), ".npm", "_npx");
    if (!fs.existsSync(base)) return null;
    for (const d of fs.readdirSync(base)) {
      const alvo = path.join(base, d, "node_modules", "playwright");
      if (fs.existsSync(alvo)) { try { return require(alvo); } catch { /* proximo */ } }
    }
    return null;
  }
  const pw = acharPlaywright();
  if (!pw) {
    console.log("\n  (playwright não encontrado -- a parte de TELA foi pulada)");
  } else {
    const chaves = JSON.parse(execSync(`supabase projects api-keys --project-ref ${REF} -o json`, {
      encoding: "utf8", stdio: ["ignore", "pipe", "ignore"],
    }));
    const SERVICE = chaves.find((k) => k.name === "service_role").api_key;
    const PUB = (fs.readFileSync(path.join(RAIZ, "assets/js/astral.js"), "utf8")
      .match(/sb_publishable_[A-Za-z0-9_-]+/) || [])[0];
    const admin = { apikey: SERVICE, Authorization: `Bearer ${SERVICE}`, "Content-Type": "application/json" };
    const req = async (caminho, opts) => {
      const r = await fetch(`${BASE}${caminho}`, opts);
      let corpo = null; try { corpo = await r.json(); } catch { /* sem corpo */ }
      return { status: r.status, corpo };
    };

    const tipos = { ".html": "text/html", ".css": "text/css", ".js": "text/javascript", ".woff2": "font/woff2" };
    const servidor = http.createServer((q, r) => {
      const u = decodeURIComponent(q.url.split("?")[0]);
      const arq = path.join(RAIZ, u === "/" ? "/index.html" : u);
      if (!path.resolve(arq).startsWith(RAIZ) || !fs.existsSync(arq) || fs.statSync(arq).isDirectory()) {
        r.writeHead(404); return r.end("404");
      }
      r.writeHead(200, { "Content-Type": tipos[path.extname(arq)] || "text/plain" });
      r.end(fs.readFileSync(arq));
    });
    await new Promise((r) => servidor.listen(PORTA, r));
    const nav = await pw.chromium.launch();
    let usuario = null;

    try {
      const email = `chefe-${Date.now()}@astral-teste.local`;
      const c = await req("/auth/v1/admin/users", {
        method: "POST", headers: admin,
        body: JSON.stringify({ email, password: "T!" + crypto.randomUUID(), email_confirm: true }),
      });
      usuario = { id: c.corpo.id, email };
      const link = await req("/auth/v1/admin/generate_link", {
        method: "POST", headers: admin, body: JSON.stringify({ type: "magiclink", email }),
      });
      const s = (await req("/auth/v1/verify", {
        method: "POST", headers: { apikey: PUB, "Content-Type": "application/json" },
        body: JSON.stringify({ type: "magiclink", token_hash: link.corpo?.hashed_token }),
      })).corpo;
      const comoEle = { apikey: PUB, Authorization: `Bearer ${s.access_token}`, "Content-Type": "application/json" };

      await req("/rest/v1/rpc/salvar_progresso", {
        method: "POST", headers: comoEle,
        body: JSON.stringify({
          p_xp: 500, p_streak: 5, p_horas: 8, p_edital: { nome: "EEAR 2026" },
          p_materias: [
            { nome: "Matematica", peso: 3, progresso: 70 },
            { nome: "Fisica", peso: 2, progresso: 20 },
          ],
          p_cronograma_hoje: [], p_badges: [], p_tag_escolhida: null,
        }),
      });

      const ctx = await nav.newContext({ viewport: { width: 1280, height: 1000 } });
      await ctx.addInitScript(`(() => {
        localStorage.setItem("sb-${REF}-auth-token", JSON.stringify({
          access_token: ${JSON.stringify(s.access_token)},
          refresh_token: ${JSON.stringify(s.refresh_token)},
          token_type: "bearer",
          expires_at: Math.floor(Date.now()/1000) + 3600,
          user: ${JSON.stringify(s.user)},
        }));
      })()`);

      const ver = async () => {
        const pg = await ctx.newPage();
        const erros = [];
        pg.on("pageerror", (e) => erros.push(String(e.message)));
        await pg.goto(`http://localhost:${PORTA}/dashboard.html`, { waitUntil: "load" });
        await pg.waitForTimeout(4000);
        const r = await pg.evaluate(() => ({
          visivel: !(document.getElementById("chefe") || {}).hidden,
          dias: (document.getElementById("chefe-dias") || {}).textContent,
          fase: (document.getElementById("chefe-fase") || {}).textContent,
          nome: (document.getElementById("chefe-nome") || {}).textContent,
          preparo: (document.getElementById("chefe-preparo-valor") || {}).textContent,
          conselho: (document.getElementById("chefe-conselho") || {}).textContent,
          cresceu: (() => {
            const b = document.getElementById("chefe-preenche");
            const t = b && getComputedStyle(b).transform;
            return !!t && t !== "none" && !/matrix\(0,/.test(t);
          })(),
        }));
        await pg.close();
        if (erros.length) falha("erro de JavaScript na tela", erros[0].slice(0, 60));
        return r;
      };

      // Sem prova marcada: a seção não aparece.
      const sem = await ver();
      if (!sem.visivel) ok("sem prova marcada a seção nem aparece", "melhor ausência que um traço");
      else falha("o chefe apareceu sem prova marcada");

      // Marca a prova e recarrega.
      await req("/rest/v1/eventos", {
        method: "POST", headers: { ...admin, Prefer: "return=minimal" },
        body: JSON.stringify([{ usuario_id: usuario.id, nome: "EEAR 2026 — prova objetiva", data: emDias(45), categoria: "prova" }]),
      });
      const com = await ver();
      if (com.visivel) ok("com prova marcada o chefe aparece", `${com.fase?.trim()} · ${com.dias?.trim()} dias`);
      else falha("o chefe não apareceu com prova marcada");
      if (com.nome?.includes("EEAR 2026")) ok("mostra o nome da prova", com.nome.trim());
      else falha("nome da prova errado", String(com.nome));
      if (/\d+ \/ 100/.test(com.preparo || "")) ok("o preparo aparece", com.preparo.trim());
      else falha("preparo não apareceu", String(com.preparo));
      if (/f[íi]sica/i.test(com.conselho || "")) ok("🎯 o conselho nomeia a matéria mais cara", com.conselho.trim());
      else falha("conselho sem direção", String(com.conselho));
      if (com.cresceu) ok("a régua do preparo animou");
      else falha("a régua não animou");

      await ctx.close();
    } finally {
      if (usuario) {
        await req(`/auth/v1/admin/users/${usuario.id}`, { method: "DELETE", headers: admin });
        console.log("\n  (usuário de teste apagado)");
      }
      await nav.close();
      servidor.close();
    }
  }

  console.log("\n" + "=".repeat(72));
  console.log(falhas === 0
    ? "O CHEFE TEM DATA — e diz o que fazer, não só quanto falta."
    : `🔴 ${falhas} FALHA(S).`);
  process.exit(falhas === 0 ? 0 : 1);
})();
