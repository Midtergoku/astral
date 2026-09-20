// TESTA-HABILIDADES-TELA -- a árvore aparece e dá para escolher de verdade?
//
// A lógica já foi testada sozinha (testa-habilidades, 22 checagens contra o
// banco). Aqui se prova o que ela não alcança: que a página desenha, que
// clicar gasta o ponto e que a tela reflete o que o SERVIDOR gravou -- não o
// que ela própria decidiu.
//
// 🔴 A checagem que mais importa desta camada: depois de escolher, a página
// tem de continuar certa APÓS RECARREGAR. Se a escolha só existisse na tela,
// ninguém perceberia até a pessoa voltar no dia seguinte e ver tudo zerado.
const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");
const http = require("http");

const REF = "jjogmcacbdefwiwcyjxp";
const BASE = `https://${REF}.supabase.co`;
const RAIZ = path.resolve(__dirname, "..");
const PORTA = 8884;

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
if (!pw) { console.log("TESTA-HABILIDADES-TELA -- pulado: playwright nao encontrado."); process.exit(0); }

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

const haDias = (n) => new Date(Date.now() - n * 86400000).toISOString();

(async () => {
  let usuario = null, nav = null, ctx = null;
  await new Promise((r) => servidor.listen(PORTA, r));
  nav = await pw.chromium.launch();

  try {
    const email = `habtela-${Date.now()}@astral-teste.local`;
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

    console.log(`\nTESTA-HABILIDADES-TELA  usuario ${usuario.id.slice(0, 8)}\n`);

    // 30 dias × 100 xp = 3000 base -> 3 pontos (500, 1200, 2500).
    const linhas = [];
    for (let d = 0; d < 30; d++) {
      linhas.push({ usuario_id: usuario.id, materia: "Matemática", segundos: 3600,
                    xp: 100, modo: "livre", criado_em: haDias(d) });
    }
    await req("/rest/v1/sessoes_estudo", {
      method: "POST", headers: { ...admin, Prefer: "return=minimal" }, body: JSON.stringify(linhas),
    });
    await req("/rest/v1/rpc/salvar_progresso", {
      method: "POST", headers: comoEle,
      body: JSON.stringify({
        p_xp: 3000, p_streak: 30, p_horas: 30, p_edital: { nome: "EEAR 2026" },
        p_materias: [{ nome: "Matemática", peso: 3, progresso: 60 }],
        p_cronograma_hoje: [], p_badges: [], p_tag_escolhida: null,
      }),
    });

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

    const abrir = async () => {
      const pg = await ctx.newPage();
      const erros = [];
      pg.on("pageerror", (e) => erros.push(String(e.message)));
      await pg.goto(`http://localhost:${PORTA}/habilidades.html`, { waitUntil: "load" });
      await pg.waitForSelector(".ficha-hab", { timeout: 20000 }).catch(() => {});
      await pg.waitForTimeout(1200);
      if (erros.length) falha("erro de JavaScript na tela", erros[0].slice(0, 60));
      return pg;
    };

    const medir = (pg) => pg.evaluate(() => ({
      fichas: document.querySelectorAll(".ficha-hab").length,
      ramos: document.querySelectorAll(".ramo").length,
      minhas: document.querySelectorAll(".ficha-hab.minha").length,
      disponiveis: document.querySelectorAll(".ficha-hab.disponivel").length,
      trancadas: document.querySelectorAll(".ficha-hab.trancada").length,
      livres: (document.querySelector(".pontos-valor") || {}).textContent?.trim(),
      temEsquecer: !!document.getElementById("btn-esquecer"),
    }));

    // ── 1. A árvore aparece ─────────────────────────────────────────────────
    let pg = await abrir();
    const inicio = await medir(pg);

    if (inicio.fichas === 12) ok("as 12 habilidades aparecem", "3 ramos × 4 degraus");
    else falha("fichas na tela", `${inicio.fichas}`);
    if (inicio.ramos === 3) ok("os três ramos aparecem", "Infantaria · Artilharia · Inteligência");
    else falha("ramos na tela", `${inicio.ramos}`);
    if (inicio.livres === "3") ok("os pontos aparecem", `${inicio.livres} livres com 3000 XP`);
    else falha("pontos na tela", String(inicio.livres));

    // Só o primeiro degrau de cada ramo pode estar disponível.
    if (inicio.disponiveis === 3 && inicio.trancadas === 9) {
      ok("🎯 só o primeiro degrau de cada ramo está aberto", "3 abertos, 9 trancados");
    } else {
      falha("estado inicial errado", `${inicio.disponiveis} abertos, ${inicio.trancadas} trancados`);
    }
    if (!inicio.temEsquecer) ok("sem nada gasto, não oferece recomeçar");
    else falha("ofereceu recomeçar sem nada gasto");

    // ── 2. Clicar gasta o ponto ─────────────────────────────────────────────
    await pg.evaluate(() => document.querySelector('[data-escolher="inf_1"]')?.click());
    await pg.waitForTimeout(2000);
    const depois = await medir(pg);

    if (depois.minhas === 1) ok("🎉 clicar aplica a habilidade", "1 ficha virou sua");
    else falha("o clique não aplicou", `${depois.minhas} minhas`);
    if (depois.livres === "2") ok("o ponto foi gasto", `${inicio.livres} -> ${depois.livres}`);
    else falha("os pontos não baixaram", String(depois.livres));
    if (depois.temEsquecer) ok("com algo gasto, oferece recomeçar");
    else falha("não ofereceu recomeçar");

    // O degrau seguinte do mesmo ramo abriu.
    const abriuProximo = await pg.evaluate(() => !!document.querySelector('[data-escolher="inf_2"]'));
    if (abriuProximo) ok("o degrau seguinte abriu", "inf_2 disponível");
    else falha("o degrau seguinte não abriu");

    await pg.close();

    // ── 3. 🔴 A ESCOLHA SOBREVIVE AO RECARREGAR ────────────────────────────
    // Se ela só existisse na tela, ninguém perceberia até o dia seguinte.
    pg = await abrir();
    const recarregado = await medir(pg);
    if (recarregado.minhas === 1 && recarregado.livres === "2") {
      ok("🎯 a escolha sobrevive ao recarregar", "veio do servidor, não da tela");
    } else {
      falha("a escolha não persistiu", `${recarregado.minhas} minhas, ${recarregado.livres} livres`);
    }

    // ── 4. O XP com bônus subiu ────────────────────────────────────────────
    const sinc = (await req("/rest/v1/rpc/sincronizar_conquistas",
      { method: "POST", headers: comoEle, body: "{}" })).corpo;
    if (sinc.xpValidado > sinc.xpBase) ok("o XP com bônus reflete a escolha", `${sinc.xpBase} -> ${sinc.xpValidado}`);
    else falha("o bônus não chegou ao XP", `${sinc.xpBase} -> ${sinc.xpValidado}`);

    // ── 5. Recomeçar devolve tudo, na tela ─────────────────────────────────
    await pg.evaluate(() => document.getElementById("btn-esquecer")?.click());
    await pg.waitForTimeout(2000);
    const limpo = await medir(pg);
    if (limpo.minhas === 0 && limpo.livres === "3") ok("recomeçar devolve os pontos na tela", `${limpo.livres} livres`);
    else falha("recomeçar não limpou", `${limpo.minhas} minhas, ${limpo.livres} livres`);

    await pg.close();

    // ── 6. A trava dele aparece escrita na página ──────────────────────────
    // "os ramos mudam COMO se joga, nunca O QUE se aprende" -- quem abre a
    // tela precisa saber que nenhuma escolha o prejudica, senão hesita.
    const html = fs.readFileSync(path.join(RAIZ, "habilidades.html"), "utf8");
    if (/Nenhuma habilidade tira nada/i.test(html)) ok("a página diz que nada é tirado", "quem lê não hesita em escolher");
    else falha("a página não explica a trava");

    const hexes = (html.match(/#[0-9a-fA-F]{3,8}\b/g) || []);
    if (!hexes.length) ok("nenhuma cor fora do design system", "só tokens");
    else falha("cor solta na página", hexes.slice(0, 4).join(", "));

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
    ? "A ÁRVORE ESTÁ NA TELA — e a escolha vem do servidor, não da página."
    : `🔴 ${falhas} FALHA(S).`);
  process.exit(falhas === 0 ? 0 : 1);
})();
