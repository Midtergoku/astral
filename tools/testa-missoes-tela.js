// TESTA-MISSOES-TELA -- as missões aparecem, e reagem ao estudo de verdade?
//
// O motor já foi testado sozinho (testa-missoes, 16 checagens sobre a função
// pura). O que falta é o que ele não alcança:
//
//   1. a tela desenha? (em 04/08 o dashboard inteiro parou por um erro que
//      nenhum teste de lógica teria visto)
//   2. `fatos_de_hoje` conta o dia CERTO? A função pura recebe o dia pronto;
//      quem pode errar o fuso é o SQL, e só este teste exercita ele.
//   3. estudar de verdade move a barra? É a única prova de que as duas pontas
//      estão ligadas.
const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");
const http = require("http");

const REF = "jjogmcacbdefwiwcyjxp";
const BASE = `https://${REF}.supabase.co`;
const RAIZ = path.resolve(__dirname, "..");
const PORTA = 8890;

function acharPlaywright() {
  try { return require("playwright"); } catch { /* segue procurando */ }
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
if (!pw) { console.log("TESTA-MISSOES-TELA -- pulado: playwright nao encontrado."); process.exit(0); }

const chaves = JSON.parse(execSync(`supabase projects api-keys --project-ref ${REF} -o json`, {
  encoding: "utf8", stdio: ["ignore", "pipe", "ignore"],
}));
const SERVICE = chaves.find((k) => k.name === "service_role").api_key;
const PUB = (fs.readFileSync(path.join(RAIZ, "assets/js/astral.js"), "utf8")
  .match(/sb_publishable_[A-Za-z0-9_-]+/) || [])[0];

let falhas = 0;
const ok = (t, d = "") => console.log(`  OK     ${t.padEnd(48)} ${d}`);
const falha = (t, d = "") => { console.log(`  FALHA  ${t.padEnd(48)} ${d}`); falhas++; };

async function req(caminho, opts) {
  const r = await fetch(`${BASE}${caminho}`, opts);
  let corpo = null;
  try { corpo = await r.json(); } catch { /* sem corpo */ }
  return { status: r.status, corpo };
}
const admin = { apikey: SERVICE, Authorization: `Bearer ${SERVICE}`, "Content-Type": "application/json" };

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

(async () => {
  let usuario = null, nav = null, ctx = null;
  await new Promise((r) => servidor.listen(PORTA, r));
  nav = await pw.chromium.launch();

  try {
    const email = `miss-${Date.now()}@astral-teste.local`;
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

    console.log(`\nTESTA-MISSOES-TELA  usuario ${usuario.id.slice(0, 8)}\n`);

    await req("/rest/v1/rpc/salvar_progresso", {
      method: "POST", headers: comoEle,
      body: JSON.stringify({
        p_xp: 0, p_streak: 0, p_horas: 0, p_edital: { nome: "EEAR 2026" },
        p_materias: [{ nome: "Matematica", peso: 3, progresso: 10 }, { nome: "Portugues", peso: 2, progresso: 5 }],
        p_cronograma_hoje: [], p_badges: [], p_tag_escolhida: null,
      }),
    });

    // ── 1. fatos_de_hoje começa zerado, e a data é a de hoje ────────────────
    const h0 = (await req("/rest/v1/rpc/fatos_de_hoje", { method: "POST", headers: comoEle, body: "{}" })).corpo;
    if (h0 && h0.sessoes === 0 && h0.minutos === 0) ok("o dia começa zerado", `data ${h0.data}`);
    else falha("fatos_de_hoje já veio com dados", JSON.stringify(h0).slice(0, 80));

    // A data tem de ser a de hoje no fuso de São Paulo -- não a de UTC.
    const hojeSP = new Date(Date.now() - 3 * 3600 * 1000).toISOString().slice(0, 10);
    if (h0?.data === hojeSP) ok("a data é a de hoje no fuso certo", h0.data);
    else falha("data errada", `${h0?.data} (esperado ${hojeSP})`);

    ctx = await nav.newContext({ viewport: { width: 1280, height: 1000 } });
    await ctx.addInitScript(`(() => {
      localStorage.setItem("sb-${REF}-auth-token", JSON.stringify({
        access_token: ${JSON.stringify(s.access_token)},
        refresh_token: ${JSON.stringify(s.refresh_token)},
        token_type: "bearer",
        expires_at: Math.floor(Date.now()/1000) + 3600,
        user: ${JSON.stringify(s.user)},
      }));
    })()`);

    async function ler() {
      const pg = await ctx.newPage();
      const erros = [];
      pg.on("pageerror", (e) => erros.push(String(e.message)));
      await pg.goto(`http://localhost:${PORTA}/dashboard.html`, { waitUntil: "load" });
      await pg.waitForSelector(".missao", { timeout: 20000 }).catch(() => {});
      await pg.waitForTimeout(1500);
      const r = await pg.evaluate(() => ({
        quantas: document.querySelectorAll(".missao").length,
        textos: [...document.querySelectorAll(".missao-texto")].map((e) => e.textContent.trim()),
        contas: [...document.querySelectorAll(".missao-conta")].map((e) => e.textContent.trim()),
        feitas: document.querySelectorAll(".missao.feita").length,
        placar: (document.getElementById("missoes-placar") || {}).textContent,
        campanha: (document.getElementById("campanha-etapa") || {}).textContent,
        passos: document.querySelectorAll(".campanha-passo").length,
        passosFeitos: document.querySelectorAll(".campanha-passo.feito").length,
      }));
      await pg.close();
      if (erros.length) falha("erro de JavaScript na tela", erros[0].slice(0, 60));
      return r;
    }

    // ── 2. Aparece, com três missões e nenhuma cumprida ────────────────────
    const antes = await ler();
    if (antes.quantas === 3) ok("as três missões aparecem na tela", antes.textos.join(" · "));
    else falha("quantidade de missões na tela", `${antes.quantas}`);
    if (antes.feitas === 0) ok("nenhuma cumprida antes de estudar", antes.placar?.trim());
    else falha("missão já cumprida sem estudar", `${antes.feitas}`);

    // ── 3. A campanha aponta o próximo passo ───────────────────────────────
    // O edital já foi subido, então a primeira etapa fechou e a atual é a 2ª.
    if (antes.passos === 4 && antes.passosFeitos === 1) ok("a trilha da campanha mostra onde você está", `${antes.passosFeitos} de ${antes.passos}`);
    else falha("trilha da campanha", `${antes.passosFeitos} de ${antes.passos}`);
    if (/registre a primeira sess/i.test(antes.campanha || "")) ok("a campanha aponta o próximo passo", antes.campanha.trim());
    else falha("etapa atual errada", String(antes.campanha).slice(0, 60));

    // ── 4. 🔴 Estudar de verdade move a barra ──────────────────────────────
    // Duas sessões AGORA, de 30 min cada, em matérias diferentes: cobre
    // minutos, número de sessões e matérias distintas de uma vez.
    await req("/rest/v1/sessoes_estudo", {
      method: "POST", headers: { ...admin, Prefer: "return=minimal" },
      body: JSON.stringify([
        { usuario_id: usuario.id, materia: "Matematica", segundos: 1800, xp: 25, modo: "livre" },
        { usuario_id: usuario.id, materia: "Portugues", segundos: 1800, xp: 25, modo: "cronograma" },
      ]),
    });

    const depois = await ler();
    if (depois.textos.join() === antes.textos.join()) ok("🔁 as missões do dia NÃO mudaram", "mesmo dia, mesmo sorteio");
    else falha("as missões trocaram no mesmo dia", `${antes.textos.join()} -> ${depois.textos.join()}`);

    if (depois.feitas > 0) ok("🎯 estudar de verdade cumpre missão", `${depois.placar?.trim()} — ${depois.contas.join(" · ")}`);
    else falha("estudou e nenhuma missão avançou", depois.contas.join(" · "));

    const avancou = depois.contas.some((c, i) => c !== antes.contas[i]);
    if (avancou) ok("as contagens avançaram", `${antes.contas.join(" · ")}  ->  ${depois.contas.join(" · ")}`);
    else falha("nenhuma contagem mudou");

    if (depois.passosFeitos > antes.passosFeitos) ok("a campanha avançou junto", `${antes.passosFeitos} -> ${depois.passosFeitos} etapas`);
    else falha("campanha não avançou", `${depois.passosFeitos}`);

    // ── 5. Deslogado não lê ────────────────────────────────────────────────
    const anon = await req("/rest/v1/rpc/fatos_de_hoje", {
      method: "POST", headers: { apikey: PUB, "Content-Type": "application/json" }, body: "{}",
    });
    if (anon.status >= 400) ok("sem login a função recusa", `status ${anon.status}`);
    else falha("🚨 respondeu sem login", `status ${anon.status}`);

  } finally {
    if (ctx) await ctx.close();
    if (usuario) {
      await req(`/auth/v1/admin/users/${usuario.id}`, { method: "DELETE", headers: admin });
      console.log("\n  (usuário de teste apagado)");
    }
    if (nav) await nav.close();
    servidor.close();
  }

  console.log("\n" + "=".repeat(72));
  console.log(falhas === 0
    ? "AS MISSÕES ESTÃO NA TELA E REAGEM AO ESTUDO."
    : `🔴 ${falhas} FALHA(S).`);
  process.exit(falhas === 0 ? 0 : 1);
})();
