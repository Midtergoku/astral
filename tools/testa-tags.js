// TESTA-TAGS -- a vitrine mostra o catálogo, com raridade, e vestir funciona?
//
// O R5 tem tres riscos, e o terceiro e o que quebra confianca:
//
//   1. a vitrine nao mostrar o catalogo (ficaria so com as tags de materia,
//      como era antes -- e as 20 divisas de habito e de condecoracao sumiriam)
//   2. a raridade nao aparecer (era o pedido dele: "um campo em cor")
//   3. 🔴 SECRETA vazar na lista de trancadas -- bastaria abrir a tela de tags
//      para ver o nome de tudo que era para ser descoberto
//
// E o teste de vestir e o mais importante do conjunto: se a pessoa escolhe uma
// divisa de HABITO e a barra superior mostra outra coisa, o sistema inteiro
// parece quebrado. Era assim ate hoje.
const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");
const http = require("http");

const REF = "jjogmcacbdefwiwcyjxp";
const BASE = `https://${REF}.supabase.co`;
const RAIZ = path.resolve(__dirname, "..");
const PORTA = 8889;

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
if (!pw) { console.log("TESTA-TAGS -- pulado: playwright nao encontrado."); process.exit(0); }

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

const instante = (d, h) => {
  const b = new Date(Date.now() - d * 86400000);
  const p = (n) => String(n).padStart(2, "0");
  return `${b.getUTCFullYear()}-${p(b.getUTCMonth() + 1)}-${p(b.getUTCDate())}T${p(h)}:30:00-03:00`;
};

(async () => {
  let usuario = null, nav = null, ctx = null;
  await new Promise((r) => servidor.listen(PORTA, r));
  nav = await pw.chromium.launch();

  try {
    const email = `tags-${Date.now()}@astral-teste.local`;
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

    console.log(`\nTESTA-TAGS  usuario ${usuario.id.slice(0, 8)}\n`);

    /* Um histórico que ganha uma tag de MATÉRIA (Português 75%) e uma de
       HÁBITO (DISCIPLINA acima de 60, via 14 dias estudados) -- é o par que
       prova que a vitrine deixou de ser só matéria. */
    const linhas = [];
    for (let d = 0; d < 14; d++) {
      linhas.push({ materia: "Portugues", segundos: 2400, xp: 25, modo: "livre", criado_em: instante(d, 14) });
    }
    await req("/rest/v1/sessoes_estudo", {
      method: "POST", headers: { ...admin, Prefer: "return=minimal" },
      body: JSON.stringify(linhas.map((l) => ({ usuario_id: usuario.id, ...l }))),
    });
    await req("/rest/v1/rpc/salvar_progresso", {
      method: "POST", headers: comoEle,
      body: JSON.stringify({
        p_xp: 900, p_streak: 14, p_horas: 9, p_edital: { nome: "EEAR 2026" },
        p_materias: [{ nome: "Portugues", peso: 3, progresso: 75 }, { nome: "Matematica", peso: 3, progresso: 30 }],
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
    await pg.goto(`http://localhost:${PORTA}/tags.html`, { waitUntil: "load" });
    await pg.waitForSelector(".peca", { timeout: 20000 }).catch(() => {});
    await pg.waitForTimeout(2500);        // o catálogo chega depois do 1º desenho

    const m = await pg.evaluate(() => ({
      total: document.querySelectorAll(".peca").length,
      abertas: document.querySelectorAll(".peca:not(.trancada)").length,
      trancadas: document.querySelectorAll(".peca.trancada").length,
      raridades: [...new Set([...document.querySelectorAll(".peca-raridade")].map((e) => e.textContent.trim()))].filter(Boolean),
      comCor: [...document.querySelectorAll(".peca:not(.trancada)")].filter((p) => {
        const t = p.querySelector(".divisa .tag");
        return t && getComputedStyle(t).color !== getComputedStyle(document.body).color;
      }).length,
      nomes: [...document.querySelectorAll(".peca:not(.trancada) .divisa .tag")].map((e) => e.textContent.trim()),
      html: document.documentElement.innerHTML,
    }));

    if (erros.length) falha("erro de JavaScript na tela", erros[0].slice(0, 60));
    else ok("nenhum erro de JavaScript na tela");

    if (m.total > 15) ok("a vitrine mostra o catálogo", `${m.total} divisas (${m.abertas} abertas, ${m.trancadas} trancadas)`);
    else falha("a vitrine ficou só com as de matéria", `${m.total} divisas`);

    if (m.raridades.length >= 2) ok("a raridade aparece", m.raridades.join(" · "));
    else falha("raridade não apareceu", JSON.stringify(m.raridades));

    if (m.comCor > 0) ok("a cor da raridade está no nome", `${m.comCor} com cor própria`);
    else falha("as divisas não têm cor");

    // ── 🔴 Secreta não pode aparecer nem entre as trancadas ────────────────
    const vazou = ["Marcha Forçada", "Ferro em Brasa", "Travessia", "Um Ano de Farda", "Sem Brecha"]
      .filter((n) => m.html.includes(n));
    if (!vazou.length) ok("🎯 nenhuma secreta vazou na vitrine", "continuam para ser descobertas");
    else falha("🚨 secreta visível na tela de tags", vazou.join(", "));

    // ── Ganhou as duas famílias? ──────────────────────────────────────────
    const temMateria = m.nomes.includes("Orador de Guerra");
    const temHabito = m.nomes.some((n) => ["Sentinela", "Sapador", "Batedor"].includes(n));
    if (temMateria) ok("a divisa de MATÉRIA está lá", "Orador de Guerra");
    else falha("faltou a divisa de matéria", m.nomes.join(", "));
    if (temHabito) ok("a divisa de HÁBITO está lá", m.nomes.filter((n) => ["Sentinela", "Sapador", "Batedor"].includes(n)).join(", "));
    else falha("faltou a divisa de hábito", m.nomes.join(", "));

    // ── 🔴 Vestir uma de HÁBITO e conferir a barra superior ────────────────
    // Era exatamente aqui que o sistema parecia quebrado: escolher "Sentinela"
    // e a divisa mostrar "Orador de Guerra", porque a validação só conhecia
    // tags derivadas de matéria.
    const alvo = m.nomes.find((n) => ["Sentinela", "Sapador", "Batedor"].includes(n));
    if (alvo) {
      await pg.evaluate((nome) => {
        const b = [...document.querySelectorAll(".peca:not(.trancada)")]
          .find((p) => p.querySelector(".divisa .tag")?.textContent.trim() === nome);
        b?.click();
      }, alvo);
      await pg.waitForTimeout(2500);

      const naDivisa = await pg.evaluate(() =>
        (document.querySelector("[data-divisa] .tag") || {}).textContent?.trim());
      if (naDivisa === alvo) ok(`vestir uma divisa de hábito funciona`, `a barra mostra "${naDivisa}"`);
      else falha("vestiu uma e a barra mostra outra", `escolheu ${alvo}, mostra ${naDivisa}`);

      // E sobrevive a recarregar -- prova que foi ao banco, não só à tela.
      const pg2 = await ctx.newPage();
      await pg2.goto(`http://localhost:${PORTA}/dashboard.html`, { waitUntil: "load" });
      await pg2.waitForTimeout(3000);
      const noDash = await pg2.evaluate(() =>
        (document.querySelector("[data-divisa] .tag") || {}).textContent?.trim());
      await pg2.close();
      if (noDash === alvo) ok("a escolha vale em OUTRA página", `dashboard mostra "${noDash}"`);
      else falha("a escolha não atravessou para outra página", `dashboard mostra ${noDash}`);
    } else {
      falha("não havia divisa de hábito para vestir");
    }

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
    ? "A VITRINE MOSTRA O CATÁLOGO COM RARIDADE — e vestir funciona em qualquer página."
    : `🔴 ${falhas} FALHA(S).`);
  process.exit(falhas === 0 ? 0 : 1);
})();
