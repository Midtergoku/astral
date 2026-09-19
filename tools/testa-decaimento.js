// TESTA-DECAIMENTO -- a habilidade enferruja na hora certa? (R9)
//
// 🔴 O DEFEITO QUE ISTO GUARDA, achado em 19/09/2026:
// `conquistas.html` decidia o estado da habilidade por `materia.ultimoEstudo`
// -- um campo LIDO numa linha e ESCRITO EM NENHUMA. Nunca existiu. Então
// `diasSemEstudar` caía sempre em 999 e TODA habilidade desbloqueada aparecia
// como SUSPENSA, inclusive a de quem tinha estudado cinco minutos antes.
//
// O sistema de decaimento -- que a própria tela promete e que ele defendeu em
// 01/08 -- nunca funcionou uma vez.
//
// Este teste planta três matérias com últimas sessões em datas diferentes e
// exige os três estados na mesma tela. Se alguém reintroduzir o defeito, as
// três voltam a aparecer suspensas e o teste cai.
const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");
const http = require("http");

const REF = "jjogmcacbdefwiwcyjxp";
const BASE = `https://${REF}.supabase.co`;
const RAIZ = path.resolve(__dirname, "..");
const PORTA = 8886;

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
if (!pw) { console.log("TESTA-DECAIMENTO -- pulado: playwright nao encontrado."); process.exit(0); }

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
    const email = `decai-${Date.now()}@astral-teste.local`;
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

    console.log(`\nTESTA-DECAIMENTO  usuario ${usuario.id.slice(0, 8)}\n`);

    /* Três matérias, todas acima de 70% (ou seja, desbloqueadas), com a última
       sessão em datas que caem em cada faixa:
         Português  hoje      -> ATIVA
         Matemática há 9 dias -> ENFERRUJADA (7 a 13)
         Física     há 25 dias-> FORA DE SERVIÇO (14+)
       Antes do conserto, as TRÊS apareciam suspensas. */
    await req("/rest/v1/sessoes_estudo", {
      method: "POST", headers: { ...admin, Prefer: "return=minimal" },
      body: JSON.stringify([
        { usuario_id: usuario.id, materia: "Português",  segundos: 1800, xp: 20, modo: "livre", criado_em: haDias(0) },
        { usuario_id: usuario.id, materia: "Matemática", segundos: 1800, xp: 20, modo: "livre", criado_em: haDias(9) },
        { usuario_id: usuario.id, materia: "Física",     segundos: 1800, xp: 20, modo: "livre", criado_em: haDias(25) },
      ]),
    });
    await req("/rest/v1/rpc/salvar_progresso", {
      method: "POST", headers: comoEle,
      body: JSON.stringify({
        p_xp: 600, p_streak: 1, p_horas: 2, p_edital: { nome: "EEAR 2026" },
        p_materias: [
          { nome: "Português",  peso: 3, progresso: 80 },
          { nome: "Matemática", peso: 3, progresso: 85 },
          { nome: "Física",     peso: 2, progresso: 75 },
          { nome: "Inglês",     peso: 1, progresso: 40 },   // abaixo de 70: BLOQUEADA
        ],
        p_cronograma_hoje: [], p_badges: [], p_tag_escolhida: null,
      }),
    });

    // ── O servidor devolve a última vez de cada matéria? ────────────────────
    const fatos = (await req("/rest/v1/rpc/fatos_do_usuario", {
      method: "POST", headers: comoEle, body: "{}",
    })).corpo;
    const ult = fatos?.ultimoEstudoPorMateria || {};
    if (Object.keys(ult).length === 3) ok("o servidor devolve a última vez de cada matéria", Object.keys(ult).join(", "));
    else falha("ultimoEstudoPorMateria errado", JSON.stringify(ult).slice(0, 80));

    // As chaves vêm em minúsculas -- o nome vem do edital e varia de caixa.
    if (ult["português"] && ult["matemática"]) ok("as chaves vêm em minúsculas", "o nome do edital varia de caixa");
    else falha("chaves fora do padrão", Object.keys(ult).join(", "));

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
    await pg.goto(`http://localhost:${PORTA}/conquistas.html`, { waitUntil: "load" });
    await pg.waitForSelector(".habilidade-card", { timeout: 20000 }).catch(() => {});
    await pg.waitForTimeout(3000);   // a sala chega depois e redesenha

    const m = await pg.evaluate(() => {
      const cartoes = [...document.querySelectorAll(".habilidade-card")];
      return {
        total: cartoes.length,
        estados: cartoes.map((c) => ({
          classe: [...c.classList].find((x) => ["ativa", "enferrujada", "suspensa", "bloqueada"].includes(x)),
          texto: (c.querySelector(".habilidade-status") || {}).textContent?.trim(),
          retorno: (c.querySelector(".retorno-acao") || {}).textContent?.trim() || null,
          tempo: (c.querySelector(".retorno-tempo") || {}).textContent?.trim() || null,
        })),
        suspensas: cartoes.filter((c) => c.classList.contains("suspensa")).length,
        ativas: cartoes.filter((c) => c.classList.contains("ativa")).length,
        enferrujadas: cartoes.filter((c) => c.classList.contains("enferrujada")).length,
      };
    });
    await pg.close();

    if (erros.length) falha("erro de JavaScript na tela", erros[0].slice(0, 60));
    else ok("nenhum erro de JavaScript na tela");

    // ── 🔴 A CHECAGEM QUE GUARDA O DEFEITO ─────────────────────────────────
    // Antes do conserto: 3 suspensas, 0 ativas, 0 enferrujadas.
    if (m.ativas === 1 && m.enferrujadas === 1 && m.suspensas === 1) {
      ok("🎯 os três estados aparecem, cada um no seu", "ativa · enferrujada · fora de serviço");
    } else {
      falha("🔴 o decaimento voltou a errar",
        `${m.ativas} ativas, ${m.enferrujadas} enferrujadas, ${m.suspensas} suspensas (esperado 1/1/1)`);
    }

    // A que foi estudada HOJE não pode estar suspensa -- era o coração do bug.
    const hoje = m.estados.find((e) => /ativa/i.test(e.texto || ""));
    if (hoje) ok("quem estudou hoje aparece ATIVA", "o defeito antigo suspendia até essa");
    else falha("🚨 nenhuma habilidade ativa", m.estados.map((e) => e.texto).join(" | "));

    // ── R9: o retorno narrado ──────────────────────────────────────────────
    const comRetorno = m.estados.filter((e) => e.retorno);
    if (comRetorno.length === 2) ok("as duas em decaimento dizem como voltar", comRetorno.map((e) => e.retorno).join(" · "));
    else falha("retorno narrado ausente", `${comRetorno.length} de 2`);

    const temTempo = m.estados.some((e) => e.tempo && /\d+ dias/.test(e.tempo));
    if (temTempo) ok("o cartão diz há quanto tempo", m.estados.find((e) => e.tempo)?.tempo);
    else falha("não diz o tempo", JSON.stringify(m.estados.map((e) => e.tempo)));

    // "Fora de serviço" no lugar de "Suspensa" -- linguagem de campanha.
    const foraDeServico = m.estados.some((e) => /fora de servi/i.test(e.texto || ""));
    if (foraDeServico) ok("o estado virou 'Fora de serviço'", "linguagem de campanha, não de punição");
    else falha("ainda diz 'Suspensa'", m.estados.map((e) => e.texto).join(" | "));

    // 🔴 O pedido de volta tem de ser PEQUENO. Quem sumiu 25 dias não volta
    // para uma maratona -- volta para um primeiro passo.
    const pedidoGrande = comRetorno.some((e) => /\b(\d{2,})\s*(sess|hora|dia)/i.test(e.retorno || ""));
    if (!pedidoGrande) ok("🎯 o pedido de volta é pequeno", "uma sessão, não uma maratona");
    else falha("o retorno pede demais", comRetorno.map((e) => e.retorno).join(" | "));

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
    ? "O DECAIMENTO FUNCIONA — e o castigo virou convite de volta."
    : `🔴 ${falhas} FALHA(S).`);
  process.exit(falhas === 0 ? 0 : 1);
})();
