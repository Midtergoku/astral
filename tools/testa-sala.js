// TESTA-SALA -- as condecoracoes aparecem na tela, e as secretas continuam
// secretas?
//
// O motor ja foi testado sozinho (testa-motor) e os fatos contra o banco
// (testa-fatos). Falta o que nenhum dos dois ve: a TELA. Em 04/08 o dashboard
// inteiro deixou de desenhar por um erro que nenhum teste de API teria pego.
//
// E ha uma checagem aqui que so faz sentido nesta camada: 🔴 a secreta nao
// conquistada NAO pode ter o nome no HTML. Se estiver la, basta abrir o codigo
// da pagina para estragar a surpresa -- e a surpresa e o mecanismo inteiro,
// segundo a correcao que o Lucas me deu em 01/08.
const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");
const http = require("http");

const REF = "jjogmcacbdefwiwcyjxp";
const BASE = `https://${REF}.supabase.co`;
const RAIZ = path.resolve(__dirname, "..");
const PORTA = 8892;

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
if (!pw) { console.log("TESTA-SALA -- pulado: playwright nao encontrado."); process.exit(0); }

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

const instante = (d, h) => {
  const b = new Date(Date.now() - d * 86400000);
  const p = (n) => String(n).padStart(2, "0");
  return `${b.getUTCFullYear()}-${p(b.getUTCMonth() + 1)}-${p(b.getUTCDate())}T${p(h)}:30:00-03:00`;
};

(async () => {
  let usuario = null, nav = null;
  await new Promise((r) => servidor.listen(PORTA, r));
  nav = await pw.chromium.launch();

  try {
    const email = `sala-${Date.now()}@astral-teste.local`;
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

    console.log(`\nTESTA-SALA  usuario ${usuario.id.slice(0, 8)}\n`);

    // Um historico que ganha algumas e DISPARA UMA SECRETA (5 na madrugada),
    // para o teste poder conferir os dois estados de secreta na mesma tela.
    const linhas = [];
    for (let d = 0; d < 12; d++) {
      linhas.push({ materia: "Matematica", segundos: d === 3 ? 3900 : 1800, xp: 25,
                    modo: "livre", criado_em: instante(d, 14) });
    }
    for (let i = 0; i < 5; i++) {
      linhas.push({ materia: "Portugues", segundos: 900, xp: 10, modo: "livre", criado_em: instante(20 + i, 5) });
    }
    await req("/rest/v1/sessoes_estudo", {
      method: "POST", headers: { ...admin, Prefer: "return=minimal" },
      body: JSON.stringify(linhas.map((l) => ({ usuario_id: usuario.id, ...l }))),
    });
    await req("/rest/v1/rpc/salvar_progresso", {
      method: "POST",
      headers: { apikey: PUB, Authorization: `Bearer ${s.access_token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        p_xp: 400, p_streak: 12, p_horas: 7, p_edital: { nome: "EEAR 2026" },
        p_materias: [{ nome: "Matematica", peso: 3, progresso: 75 }, { nome: "Portugues", peso: 2, progresso: 30 }],
        p_cronograma_hoje: [], p_badges: [], p_tag_escolhida: null,
      }),
    });

    const ctx = await nav.newContext({ viewport: { width: 1280, height: 1000 } });
    const pg = await ctx.newPage();
    const erros = [];
    pg.on("pageerror", (e) => erros.push(String(e.message)));
    await pg.addInitScript(`(() => {
      localStorage.setItem("sb-${REF}-auth-token", JSON.stringify({
        access_token: ${JSON.stringify(s.access_token)},
        refresh_token: ${JSON.stringify(s.refresh_token)},
        token_type: "bearer",
        expires_at: Math.floor(Date.now()/1000) + 3600,
        user: ${JSON.stringify(s.user)},
      }));
    })()`);
    await pg.goto(`http://localhost:${PORTA}/conquistas.html`, { waitUntil: "load" });
    await pg.waitForSelector(".medalha", { timeout: 20000 }).catch(() => {});
    await pg.waitForTimeout(1500);

    if (erros.length) falha("a tela deu erro de JavaScript", erros[0].slice(0, 70));
    else ok("nenhum erro de JavaScript na tela");

    const m = await pg.evaluate(() => {
      const cartoes = [...document.querySelectorAll(".medalha")];
      return {
        total: cartoes.length,
        conquistadas: cartoes.filter((c) => !c.classList.contains("trancada")).length,
        secretasOcultas: cartoes.filter((c) => (c.querySelector(".medalha-nome") || {}).textContent === "???").length,
        contagem: (document.getElementById("sala-contagem") || {}).textContent,
        quaseVisivel: !(document.getElementById("quase-la") || {}).hidden,
        quantosQuase: document.querySelectorAll(".quase-item").length,
        reguasCresceram: [...document.querySelectorAll(".medalha-preenche")]
          .filter((e) => { const t = getComputedStyle(e).transform; return t && t !== "none" && !/matrix\(0,/.test(t); }).length,
        htmlInteiro: document.documentElement.innerHTML,
      };
    });
    await ctx.close();

    if (m.total === 74) ok("as 74 condecorações apareceram", `${m.total} cartões`);
    else falha("número de cartões na tela", `${m.total} (esperado 74)`);

    if (m.conquistadas > 0 && m.conquistadas < 74) ok("algumas conquistadas, outras não", `${m.conquistadas} acesas`);
    else falha("estado das medalhas na tela", `${m.conquistadas} acesas de 74`);

    if (/\d+\s*\/\s*74/.test(String(m.contagem).replace(/\s+/g, " "))) ok("o placar aparece", String(m.contagem).trim());
    else falha("placar não apareceu", String(m.contagem));

    // 🔴 A checagem que só esta camada faz.
    if (m.secretasOcultas > 0) ok("secretas não conquistadas viram ???", `${m.secretasOcultas} ocultas`);
    else falha("nenhuma secreta oculta na tela", "ou todas caíram, ou o nome vazou");

    // O nome de uma secreta NÃO conquistada não pode estar no HTML. "Um Ano de
    // Farda" exige 12 meses -- impossível para este usuário de 25 dias.
    if (!m.htmlInteiro.includes("Um Ano de Farda")) {
      ok("🎯 o nome da secreta não está no HTML", "não dá para estragar a surpresa vendo o código");
    } else {
      falha("🚨 o nome de uma secreta VAZOU no HTML", "abrir o código estraga a descoberta");
    }

    // A secreta que ESTA disparada tem de aparecer com nome -- senão a
    // descoberta não acontece nunca.
    if (m.htmlInteiro.includes("Vigília")) ok("a secreta disparada aparece com nome", "5 sessões na madrugada");
    else falha("a secreta disparada não apareceu", "Vigília deveria ter caído");

    if (m.quaseVisivel && m.quantosQuase > 0) ok("'falta pouco' aparece", `${m.quantosQuase} item(ns)`);
    else falha("'falta pouco' não apareceu", `visivel=${m.quaseVisivel} itens=${m.quantosQuase}`);

    if (m.reguasCresceram > 0) ok("as réguas animaram", `${m.reguasCresceram} com transform`);
    else falha("nenhuma régua animou");

  } finally {
    if (usuario) {
      await req(`/auth/v1/admin/users/${usuario.id}`, { method: "DELETE", headers: admin });
      console.log("\n  (usuário de teste apagado)");
    }
    await nav.close();
    servidor.close();
  }

  console.log("\n" + "=".repeat(70));
  console.log(falhas === 0
    ? "A SALA DE CONDECORAÇÕES ESTÁ NA TELA — e as secretas continuam secretas."
    : `🔴 ${falhas} FALHA(S).`);
  process.exit(falhas === 0 ? 0 : 1);
})();
