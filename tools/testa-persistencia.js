// TESTA-PERSISTENCIA -- o progresso sobrevive a sair e entrar de novo?
// E sobrevive a trocar de APARELHO?
//
// O Lucas relatou ja ter tido problema de progresso que some. Este teste
// separa as duas coisas, que sao diferentes e falham por motivos diferentes:
//
//   1. MESMO NAVEGADOR, sair e entrar    -> o localStorage sobrevive, entao
//                                           isto passa mesmo se o banco falhar
//   2. NAVEGADOR LIMPO, sem localStorage -> so passa se o dado estiver MESMO
//                                           na conta. E este que importa.
//
// O cenario 2 e o que simula "estudei no computador e abri no celular", que
// era exatamente o que se perdia antes de 31/07 (ver rules/paginas.md 8.16).
//
// ⚠️ NAO faz login por senha: o captcha esta ligado desde 31/07. A sessao vem
// de magic link pela API de admin -- mesma abordagem do testa-isolamento.
const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");
const http = require("http");

const REF = "jjogmcacbdefwiwcyjxp";
const BASE = `https://${REF}.supabase.co`;
const RAIZ = path.resolve(__dirname, "..");
const PORTA = 8895;

function acharPlaywright() {
  try { return require("playwright"); } catch { /* segue procurando */ }
  const base = process.env.LOCALAPPDATA
    ? path.join(process.env.LOCALAPPDATA, "npm-cache", "_npx")
    : path.join(require("os").homedir(), ".npm", "_npx");
  if (!fs.existsSync(base)) return null;
  for (const d of fs.readdirSync(base)) {
    const alvo = path.join(base, d, "node_modules", "playwright");
    if (fs.existsSync(alvo)) { try { return require(alvo); } catch { /* tenta o proximo */ } }
  }
  return null;
}
const pw = acharPlaywright();
if (!pw) {
  console.log("TESTA-PERSISTENCIA -- pulado: playwright nao encontrado.");
  console.log("  npx --yes playwright install chromium");
  process.exit(0);
}

const chaves = JSON.parse(execSync(`supabase projects api-keys --project-ref ${REF} -o json`, {
  encoding: "utf8", stdio: ["ignore", "pipe", "ignore"],
}));
const SERVICE = chaves.find((k) => k.name === "service_role").api_key;
const PUB = (fs.readFileSync(path.join(RAIZ, "assets/js/astral.js"), "utf8")
  .match(/sb_publishable_[A-Za-z0-9_-]+/) || [])[0];

let falhas = 0;
const ok = (t, d = "") => console.log(`  OK     ${t.padEnd(46)} ${d}`);
const falha = (t, d = "") => { console.log(`  FALHA  ${t.padEnd(46)} ${d}`); falhas++; };

async function req(caminho, opts) {
  const r = await fetch(`${BASE}${caminho}`, opts);
  let corpo = null;
  try { corpo = await r.json(); } catch { /* sem corpo */ }
  return { status: r.status, corpo };
}
const admin = { apikey: SERVICE, Authorization: `Bearer ${SERVICE}`, "Content-Type": "application/json" };

async function criarUsuario() {
  const email = `persist-${Date.now()}@astral-teste.local`;
  const c = await req("/auth/v1/admin/users", {
    method: "POST", headers: admin,
    body: JSON.stringify({ email, password: "T!" + crypto.randomUUID(), email_confirm: true }),
  });
  const id = c.corpo?.id;
  if (!id) throw new Error("nao criou usuario: " + JSON.stringify(c.corpo));
  return { id, email };
}

async function sessaoNova(email) {
  const link = await req("/auth/v1/admin/generate_link", {
    method: "POST", headers: admin, body: JSON.stringify({ type: "magiclink", email }),
  });
  const hashed = link.corpo?.hashed_token;
  if (!hashed) throw new Error("nao gerou magic link");
  const s = await req("/auth/v1/verify", {
    method: "POST", headers: { apikey: PUB, "Content-Type": "application/json" },
    body: JSON.stringify({ type: "magiclink", token_hash: hashed }),
  });
  if (!s.corpo?.access_token) throw new Error("nao obteve sessao");
  return s.corpo; // tem access_token, refresh_token, user
}

// servidor local do site
const tipos = { ".html": "text/html", ".css": "text/css", ".js": "text/javascript", ".woff2": "font/woff2" };
const servidor = http.createServer((q, r) => {
  const u = decodeURIComponent(q.url.split("?")[0]);
  const a = path.join(RAIZ, u === "/" ? "/index.html" : u);
  if (!path.resolve(a).startsWith(RAIZ) || !fs.existsSync(a) || fs.statSync(a).isDirectory()) {
    r.writeHead(404); return r.end("404");
  }
  r.writeHead(200, { "Content-Type": tipos[path.extname(a)] || "text/plain" });
  r.end(fs.readFileSync(a));
});

// grava a sessao no formato que o supabase-js le
function scriptSessao(sessao) {
  return `(() => {
    localStorage.setItem("sb-${REF}-auth-token", JSON.stringify({
      access_token: ${JSON.stringify(sessao.access_token)},
      refresh_token: ${JSON.stringify(sessao.refresh_token)},
      token_type: "bearer",
      expires_at: Math.floor(Date.now()/1000) + 3600,
      user: ${JSON.stringify(sessao.user)},
    }));
  })()`;
}

const PROGRESSO = { xp: 4242, streak: 9, horas: 33 };

(async () => {
  let usuario = null;
  await new Promise((r) => servidor.listen(PORTA, r));
  const nav = await pw.chromium.launch();

  try {
    usuario = await criarUsuario();
    console.log(`\nTESTA-PERSISTENCIA  usuario ${usuario.id.slice(0, 8)}\n`);

    // ── 1. NAVEGADOR A: entra e estuda ──────────────────────────────────────
    const s1 = await sessaoNova(usuario.email);
    const ctxA = await nav.newContext({ viewport: { width: 1280, height: 900 } });
    const pgA = await ctxA.newPage();
    await pgA.addInitScript(scriptSessao(s1));
    await pgA.goto(`http://localhost:${PORTA}/dashboard.html`, { waitUntil: "load" });
    await pgA.waitForTimeout(1800);

    const gravou = await pgA.evaluate(async (p) => {
      const { salvarProgresso, carregarProgresso } = await import("/assets/js/estado.js");
      const { supabase } = await import("/assets/js/astral.js");
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return { erro: "sem sessao no navegador" };
      const uid = session.user.id;
      const atual = await carregarProgresso(uid);
      atual.xp = p.xp; atual.streak = p.streak; atual.horas = p.horas;
      atual.materias = [{ nome: "Matemática", progresso: 77 }];
      atual.badges = ["primeiro_edital", "madrugador"];
      salvarProgresso(uid, atual, { imediato: true });
      return { uid, xp: atual.xp };
    }, PROGRESSO);

    if (gravou.erro) { falha("navegador A abriu com sessao", gravou.erro); throw new Error(gravou.erro); }
    ok("navegador A: entrou e gravou progresso", `xp=${gravou.xp}`);
    await pgA.waitForTimeout(2500); // deixa o salvamento chegar ao banco

    // ── 2. O BANCO recebeu? ────────────────────────────────────────────────
    const noBanco = await req(`/rest/v1/progresso?usuario_id=eq.${usuario.id}&select=*`, {
      headers: { apikey: SERVICE, Authorization: `Bearer ${SERVICE}` },
    });
    const linha = Array.isArray(noBanco.corpo) ? noBanco.corpo[0] : null;
    if (linha && Number(linha.xp) === PROGRESSO.xp) ok("o progresso chegou ao BANCO", `xp=${linha.xp}`);
    else falha("o progresso chegou ao BANCO", `recebido: ${JSON.stringify(linha).slice(0, 90)}`);

    // ── 3. SAIR e ENTRAR no MESMO navegador ────────────────────────────────
    await pgA.evaluate(async () => {
      const { supabase } = await import("/assets/js/astral.js");
      await supabase.auth.signOut();
    });
    await pgA.waitForTimeout(600);
    const s2 = await sessaoNova(usuario.email);
    await pgA.evaluate((js) => eval(js), scriptSessao(s2));
    await pgA.goto(`http://localhost:${PORTA}/dashboard.html`, { waitUntil: "load" });
    await pgA.waitForTimeout(2200);
    const depoisDeVoltar = await pgA.evaluate(async () => {
      const { carregarProgresso } = await import("/assets/js/estado.js");
      const { supabase } = await import("/assets/js/astral.js");
      const { data: { session } } = await supabase.auth.getSession();
      const p = await carregarProgresso(session.user.id);
      return { xp: p.xp, streak: p.streak, horas: p.horas, materias: p.materias?.length, badges: p.badges?.length };
    });
    if (depoisDeVoltar.xp === PROGRESSO.xp) ok("MESMO navegador: saiu, entrou, progresso intacto", `xp=${depoisDeVoltar.xp}`);
    else falha("MESMO navegador: saiu, entrou, progresso intacto", `xp=${depoisDeVoltar.xp}`);
    await ctxA.close();

    // ── 4. OUTRO APARELHO: navegador limpo, sem localStorage nenhum ────────
    const s3 = await sessaoNova(usuario.email);
    const ctxB = await nav.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
    const pgB = await ctxB.newPage();
    await pgB.addInitScript(scriptSessao(s3));
    await pgB.goto(`http://localhost:${PORTA}/dashboard.html`, { waitUntil: "load" });
    await pgB.waitForTimeout(2500);
    const noOutro = await pgB.evaluate(async () => {
      const { carregarProgresso } = await import("/assets/js/estado.js");
      const { supabase } = await import("/assets/js/astral.js");
      const { data: { session } } = await supabase.auth.getSession();
      const p = await carregarProgresso(session.user.id);
      const chavesLocais = Object.keys(localStorage).filter((k) => k.startsWith("astral_")).length;
      return { xp: p.xp, streak: p.streak, horas: p.horas, materias: p.materias?.length, badges: p.badges?.length, chavesLocais };
    });

    if (noOutro.xp === PROGRESSO.xp) ok("OUTRO APARELHO (celular, sem cache): XP veio", `xp=${noOutro.xp}`);
    else falha("OUTRO APARELHO (celular, sem cache): XP veio", `xp=${noOutro.xp} (esperado ${PROGRESSO.xp})`);

    if (noOutro.streak === PROGRESSO.streak) ok("OUTRO APARELHO: streak veio", `${noOutro.streak}`);
    else falha("OUTRO APARELHO: streak veio", `${noOutro.streak} (esperado ${PROGRESSO.streak})`);

    if (noOutro.horas === PROGRESSO.horas) ok("OUTRO APARELHO: horas vieram", `${noOutro.horas}`);
    else falha("OUTRO APARELHO: horas vieram", `${noOutro.horas} (esperado ${PROGRESSO.horas})`);

    if (noOutro.materias >= 1) ok("OUTRO APARELHO: materias vieram", `${noOutro.materias}`);
    else falha("OUTRO APARELHO: materias vieram", `${noOutro.materias}`);

    if (noOutro.badges >= 2) ok("OUTRO APARELHO: conquistas vieram", `${noOutro.badges}`);
    else falha("OUTRO APARELHO: conquistas vieram", `${noOutro.badges}`);

    // ── 5. o que a TELA mostra, nao so o que a funcao devolve ─────────────
    const naTela = await pgB.evaluate(() => {
      const t = document.body.innerText;
      return { temXp: t.includes("4242") || t.includes("4.242"), trecho: t.replace(/\s+/g, " ").slice(0, 110) };
    });
    if (naTela.temXp) ok("o XP aparece NA TELA do outro aparelho");
    else falha("o XP aparece NA TELA do outro aparelho", naTela.trecho);

    await ctxB.close();
  } catch (e) {
    falha("execucao", String(e.message).slice(0, 100));
  } finally {
    await nav.close();
    servidor.close();
    if (usuario) {
      await req(`/auth/v1/admin/users/${usuario.id}`, { method: "DELETE", headers: admin });
      console.log("\n  (usuario de teste apagado)");
    }
  }

  console.log("\n" + "=".repeat(70));
  console.log(falhas === 0
    ? "O PROGRESSO FICA NA CONTA — sobrevive a sair, entrar e trocar de aparelho."
    : `🔴 ${falhas} FALHA(S) — o progresso NAO esta seguro.`);
  process.exit(falhas === 0 ? 0 : 1);
})();
