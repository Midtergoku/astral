// TESTA-DIARIO-TELA -- o diário aparece, e conta a história certa?
//
// A lógica já foi testada sozinha (testa-diario, 20 checagens). Aqui se prova
// o que ela não alcança: que a página desenha, que o fuso do NAVEGADOR
// concorda com o do servidor, e que os marcos chegam à tela.
//
// O fuso é o risco específico desta camada: `diario.js` roda no navegador e
// converte para o horário de São Paulo na mão. Se essa conversão discordar da
// que o Postgres faz nas outras funções, o diário dirá que a pessoa estudou
// num dia e a ficha dirá que foi noutro -- e as duas telas se contradizem.
const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");
const http = require("http");

const REF = "jjogmcacbdefwiwcyjxp";
const BASE = `https://${REF}.supabase.co`;
const RAIZ = path.resolve(__dirname, "..");
const PORTA = 8887;

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
if (!pw) { console.log("TESTA-DIARIO-TELA -- pulado: playwright nao encontrado."); process.exit(0); }

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

// Um instante no fuso de São Paulo, N dias atrás.
const quando = (diasAtras, hora) => {
  const b = new Date(Date.now() - diasAtras * 86400000);
  const p = (n) => String(n).padStart(2, "0");
  return `${b.getUTCFullYear()}-${p(b.getUTCMonth() + 1)}-${p(b.getUTCDate())}T${p(hora)}:30:00-03:00`;
};

(async () => {
  let usuario = null, nav = null, ctx = null;
  await new Promise((r) => servidor.listen(PORTA, r));
  nav = await pw.chromium.launch();

  try {
    const email = `diario-${Date.now()}@astral-teste.local`;
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

    console.log(`\nTESTA-DIARIO-TELA  usuario ${usuario.id.slice(0, 8)}\n`);

    /* Uma história com marcos plantados de propósito:
         dia 40        primeiro dia (marco de início)
         dia 39..38    dois dias seguidos
         dia 20        volta depois de 17 dias fora (marco de retorno)
         dia 19        estreia de Física (marco de matéria nova)
         dia 5         3 horas -- o dia mais longo (marco de recorde)
       E uma sessão às 22h, que em UTC já é o dia seguinte: é o teste do fuso. */
    const linhas = [
      { materia: "Matematica", segundos: 1800, modo: "livre", criado_em: quando(40, 10) },
      { materia: "Matematica", segundos: 1800, modo: "livre", criado_em: quando(39, 10) },
      { materia: "Matematica", segundos: 1800, modo: "livre", criado_em: quando(38, 10) },
      { materia: "Matematica", segundos: 1800, modo: "livre", criado_em: quando(20, 10) },
      { materia: "Fisica",     segundos: 1800, modo: "livre", criado_em: quando(19, 10) },
      { materia: "Matematica", segundos: 10800, modo: "livre", criado_em: quando(5, 10) },
      { materia: "Matematica", segundos: 1800, modo: "livre", criado_em: quando(2, 22) },  // 22h!
    ];
    await req("/rest/v1/sessoes_estudo", {
      method: "POST", headers: { ...admin, Prefer: "return=minimal" },
      body: JSON.stringify(linhas.map((l) => ({ usuario_id: usuario.id, ...l }))),
    });
    await req("/rest/v1/rpc/salvar_progresso", {
      method: "POST", headers: comoEle,
      body: JSON.stringify({
        p_xp: 400, p_streak: 1, p_horas: 6, p_edital: { nome: "EEAR 2026" },
        p_materias: [{ nome: "Matematica", peso: 3, progresso: 55 }, { nome: "Fisica", peso: 2, progresso: 25 }],
        p_cronograma_hoje: [], p_badges: [], p_tag_escolhida: null,
      }),
    });

    ctx = await nav.newContext({ viewport: { width: 1280, height: 1100 } });
    await ctx.addInitScript(`(() => {
      localStorage.setItem("sb-${REF}-auth-token", JSON.stringify({
        access_token: ${JSON.stringify(s.access_token)},
        refresh_token: ${JSON.stringify(s.refresh_token)},
        token_type: "bearer",
        expires_at: Math.floor(Date.now()/1000) + 3600,
        user: ${JSON.stringify(s.user)},
      }));
    })()`);

    const pg = await ctx.newPage();
    const erros = [];
    pg.on("pageerror", (e) => erros.push(String(e.message)));
    await pg.goto(`http://localhost:${PORTA}/progresso.html`, { waitUntil: "load" });
    await pg.waitForSelector(".diario-dia", { timeout: 20000 }).catch(() => {});
    await pg.waitForTimeout(1500);

    const m = await pg.evaluate(() => ({
      dias: document.querySelectorAll(".diario-dia").length,
      marcados: document.querySelectorAll(".diario-dia.marcado").length,
      marcos: [...document.querySelectorAll(".diario-marco")].map((e) => e.textContent.trim()),
      datas: [...document.querySelectorAll(".diario-data")].map((e) => e.textContent.trim()),
      linhas: [...document.querySelectorAll(".diario-linha")].map((e) => e.textContent.trim()),
      sub: (document.getElementById("diario-sub") || {}).textContent,
      html: document.documentElement.innerHTML,
    }));

    if (erros.length) falha("erro de JavaScript na tela", erros[0].slice(0, 60));
    else ok("nenhum erro de JavaScript na tela");

    // 7 sessões em 7 dias distintos.
    if (m.dias === 7) ok("os 7 dias aparecem", m.datas.join(" · "));
    else falha("quantidade de dias", `${m.dias} (esperado 7)`);

    if (m.sub && /7 dias registrados/.test(m.sub)) ok("o resumo aparece", m.sub.trim());
    else falha("resumo errado", String(m.sub));

    // ── Os marcos plantados ────────────────────────────────────────────────
    const tem = (re) => m.marcos.some((t) => re.test(t));
    if (tem(/primeiro dia/i)) ok("marca o primeiro dia", m.marcos.find((t) => /primeiro dia/i.test(t)));
    else falha("faltou o marco de início", m.marcos.join(" | "));

    /* Há DOIS retornos plantados (17 e 13 dias), e a lista vem do mais recente
       para o mais antigo. Mostrar `find` genérico exibiria o de 13 ao lado de
       uma afirmação sobre o de 17 -- evidência que não bate com a afirmação é
       o que este projeto inteiro tenta não fazer. */
    const oDe17 = m.marcos.find((t) => /voltou depois de 17 dias/i.test(t));
    if (oDe17) ok("🎯 conta certo os dias fora", `${oDe17} (e também o de 13)`);
    else falha("marco de retorno errado", m.marcos.filter((t) => /voltou/i.test(t)).join(" | ") || "nenhum");

    if (tem(/primeira vez em Fisica/i)) ok("marca a estreia da matéria", "Física");
    else falha("faltou a estreia de Física", m.marcos.join(" | "));

    if (tem(/dia mais longo.*3h/i)) ok("marca o dia mais longo", m.marcos.find((t) => /mais longo/i.test(t)));
    else falha("marco de recorde errado", m.marcos.filter((t) => /longo/i.test(t)).join(" | ") || "nenhum");

    if (m.marcados >= 4) ok("os dias com marco têm o ponto destacado", `${m.marcados} de ${m.dias}`);
    else falha("poucos dias marcados", `${m.marcados}`);

    // ── 🔴 O FUSO: a sessão das 22h é do dia dela, não do seguinte ─────────
    // Em UTC, 22h em São Paulo já é 01h do dia seguinte. Se a conversão
    // estivesse errada, essa sessão apareceria num dia a mais.
    const esperado = new Date(Date.now() - 2 * 86400000);
    const diaEsperado = esperado.toLocaleDateString("pt-BR", { day: "numeric", month: "long" });
    if (m.datas.includes(diaEsperado)) ok("🎯 a sessão das 22h caiu no dia certo", diaEsperado);
    else falha("o fuso jogou a sessão para outro dia", `esperava ${diaEsperado}, tem ${m.datas.join(", ")}`);

    // ── 🔴 Nada sobre domínio ──────────────────────────────────────────────
    const trecho = m.marcos.join(" ") + m.linhas.join(" ");
    if (!/dom[íi]nio|\d+%\s*(→|->)/i.test(trecho)) ok("🎯 o diário não afirma nada sobre domínio", "não temos esse histórico");
    else falha("🚨 o diário falou de domínio", trecho.slice(0, 80));

    await pg.close();

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
    ? "O DIÁRIO ESTÁ NA TELA — com os marcos no dia certo."
    : `🔴 ${falhas} FALHA(S).`);
  process.exit(falhas === 0 ? 0 : 1);
})();
