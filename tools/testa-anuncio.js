// TESTA-ANUNCIO -- a medalha se anuncia na hora, e nao enche o saco?
//
// O R8 tem duas falhas possiveis, e a SEGUNDA e a que estraga o produto:
//
//   1. nao anunciar quando devia  -> a pessoa nunca descobre, e a conquista
//      secreta vira linha de tabela (era o estado ate hoje)
//   2. anunciar DEMAIS            -> aparelho novo, 30 medalhas antigas, 30
//      comemoracoes seguidas na cara de quem so queria estudar
//
// A 2 e pior porque a 1 e so ausencia, e a 2 e incomodo ativo -- e uma vez que
// a pessoa aprende a fechar o anuncio sem ler, nenhum anuncio funciona mais.
//
// Por isso o teste roda a mesma pagina TRES vezes no mesmo navegador:
//   carga 1  aparelho novo, ja com medalhas    -> NAO pode anunciar (semeia)
//   carga 2  nada mudou                        -> NAO pode anunciar
//   carga 3  depois de estudar mais            -> anuncia SO a nova
const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");
const http = require("http");

const REF = "jjogmcacbdefwiwcyjxp";
const BASE = `https://${REF}.supabase.co`;
const RAIZ = path.resolve(__dirname, "..");
const PORTA = 8891;

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
if (!pw) { console.log("TESTA-ANUNCIO -- pulado: playwright nao encontrado."); process.exit(0); }

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
    const email = `anuncio-${Date.now()}@astral-teste.local`;
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

    console.log(`\nTESTA-ANUNCIO  usuario ${usuario.id.slice(0, 8)}\n`);

    const plantar = (linhas) => req("/rest/v1/sessoes_estudo", {
      method: "POST", headers: { ...admin, Prefer: "return=minimal" },
      body: JSON.stringify(linhas.map((l) => ({ usuario_id: usuario.id, ...l }))),
    });
    const salvar = (corpo) => req("/rest/v1/rpc/salvar_progresso", {
      method: "POST",
      headers: { apikey: PUB, Authorization: `Bearer ${s.access_token}`, "Content-Type": "application/json" },
      body: JSON.stringify(corpo),
    });

    // Historico que ja vale VARIAS medalhas -- e o cenario do aparelho novo.
    const antes = [];
    for (let d = 2; d < 14; d++) {
      antes.push({ materia: "Matematica", segundos: 1800, xp: 25, modo: "livre", criado_em: instante(d, 14) });
    }
    await plantar(antes);
    await salvar({
      p_xp: 400, p_streak: 12, p_horas: 6, p_edital: { nome: "EEAR" },
      p_materias: [{ nome: "Matematica", peso: 3, progresso: 40 }],
      p_cronograma_hoje: [], p_badges: [], p_tag_escolhida: null,
    });

    // UM navegador, tres cargas -- o localStorage sobrevive entre elas, que e
    // exatamente o que se quer testar.
    ctx = await nav.newContext({ viewport: { width: 1280, height: 950 } });
    await ctx.addInitScript(`(() => {
      localStorage.setItem("sb-${REF}-auth-token", JSON.stringify({
        access_token: ${JSON.stringify(s.access_token)},
        refresh_token: ${JSON.stringify(s.refresh_token)},
        token_type: "bearer",
        expires_at: Math.floor(Date.now()/1000) + 3600,
        user: ${JSON.stringify(s.user)},
      }));
    })()`);

    /* 🔴 MEDIR COM OBSERVADOR, e nao com uma foto.
       A primeira versao deste teste contava `querySelectorAll` depois de 5
       segundos -- e os anuncios sao uma FILA, cada um durando 3,9s. A foto
       pegava um so, e o teste acusou "a secreta nao foi anunciada" com o
       sistema funcionando: a secreta tinha passado antes, ou passaria depois.

       Teste que olha um instante de um processo que dura mais que o instante
       mede a hora errada. O observador registra TUDO que apareceu. */
    async function carregar(rotulo) {
      const pg = await ctx.newPage();
      const erros = [];
      pg.on("pageerror", (e) => erros.push(String(e.message)));
      await pg.addInitScript(() => {
        window.__anunciados = [];
        new MutationObserver((muts) => {
          for (const m of muts) {
            for (const no of m.addedNodes) {
              if (no.nodeType !== 1) continue;
              const alvo = no.classList?.contains('anuncio-medalha')
                ? no : no.querySelector?.('.anuncio-medalha');
              if (alvo) {
                window.__anunciados.push(
                  (alvo.querySelector('.anuncio-nome') || {}).textContent || '?');
              }
            }
          }
          // `document`, e não `document.documentElement`: este script roda
          // antes de a página existir, e ali o elemento raiz ainda é null.
        }).observe(document, { childList: true, subtree: true });
      });
      await pg.goto(`http://localhost:${PORTA}/dashboard.html`, { waitUntil: "load" });
      await pg.waitForTimeout(14000);         // 3 anúncios de 3,9s + folga
      const r = await pg.evaluate(() => ({
        anuncios: window.__anunciados.length,
        textos: window.__anunciados.slice(),
        vistas: (() => {
          try {
            const k = Object.keys(localStorage).find((x) => x.startsWith("astral_vistas_"));
            return k ? JSON.parse(localStorage.getItem(k)).length : -1;
          } catch { return -2; }
        })(),
      }));
      await pg.close();
      if (erros.length) falha(`${rotulo}: erro de JavaScript`, erros[0].slice(0, 60));
      return r;
    }

    // ── Carga 1: aparelho NOVO, com medalhas antigas ────────────────────────
    const um = await carregar("carga 1");
    if (um.anuncios === 0) ok("🎯 aparelho novo NÃO anuncia o passado", `semeou ${um.vistas} medalhas em silêncio`);
    else falha("🔴 enxurrada no aparelho novo", `${um.anuncios} anúncios: ${um.textos.join(", ")}`);
    if (um.vistas > 0) ok("semeou o que já estava conquistado", `${um.vistas} marcadas como vistas`);
    else falha("não semeou nada", String(um.vistas));

    // ── Carga 2: nada mudou ────────────────────────────────────────────────
    const dois = await carregar("carga 2");
    if (dois.anuncios === 0) ok("recarregar sem novidade NÃO anuncia", "não vira alarme repetido");
    else falha("anunciou de novo sem nada ter mudado", dois.textos.join(", "));

    // ── Carga 3: estudou mais, e cruzou um limiar ──────────────────────────
    // Uma sessão de 3 horas: dispara "Marcha Forçada", que é SECRETA e de ouro,
    // e traz a divisa junto. É o caso mais completo que existe.
    await plantar([{ materia: "Matematica", segundos: 10800, xp: 90, modo: "livre", criado_em: instante(0, 10) }]);
    const tres = await carregar("carga 3");
    if (tres.anuncios > 0) ok("🎉 a medalha nova SE ANUNCIA na hora", tres.textos.join(", "));
    else falha("🔴 conquistou e não anunciou", `vistas=${tres.vistas}`);

    const anunciouMarcha = tres.textos.some((t) => /Marcha Forçada/i.test(t));
    if (anunciouMarcha) ok("a SECRETA aparece no instante em que cai", "Marcha Forçada");
    else falha("a secreta não foi anunciada", tres.textos.join(", "));

    // A divisa que vem junto tem de ser citada -- senão a pessoa ganha uma tag
    // e não fica sabendo.
    const pg = await ctx.newPage();
    await pg.goto(`http://localhost:${PORTA}/conquistas.html`, { waitUntil: "load" });
    await pg.waitForSelector(".medalha", { timeout: 20000 }).catch(() => {});
    await pg.waitForTimeout(1200);
    const naSala = await pg.evaluate(() => ({
      placar: (document.getElementById("sala-contagem") || {}).textContent,
      anunciosAqui: document.querySelectorAll(".anuncio-medalha").length,
    }));
    await pg.close();
    if (naSala.anunciosAqui === 0) ok("a sala não repete o que o dashboard já mostrou", "memória compartilhada");
    else falha("anunciou de novo na sala", String(naSala.anunciosAqui));
    if (/\d+\s*\/\s*74/.test(String(naSala.placar).replace(/\s+/g, " "))) ok("a sala continua certa", String(naSala.placar).trim());
    else falha("placar da sala", String(naSala.placar));

    // ── Teto: não enche a tela nem no caso absurdo ─────────────────────────
    const teto = await ctx.newPage();
    await teto.goto(`http://localhost:${PORTA}/dashboard.html`, { waitUntil: "load" });
    const limite = await teto.evaluate(async () => {
      const { anunciarNovidades, esquecerVistas } = await import("./assets/js/anuncio.js");
      const falso = {
        condecoracoes: [...Array(20)].map((_, i) => ({
          id: `x${i}`, nome: `Medalha ${i}`, descricao: "teste", metal: "bronze",
          metalInfo: { nome: "Bronze", cor: "var(--brasa)" }, conquistada: true,
        })),
        divisas: [],
      };
      esquecerVistas("u-teto");
      await anunciarNovidades("u-teto", falso);          // semeia calado
      esquecerVistas("u-teto");
      await anunciarNovidades("u-teto", { condecoracoes: [], divisas: [] });  // semeia vazio
      const p = anunciarNovidades("u-teto", falso);      // agora 20 são novas
      await new Promise((r) => setTimeout(r, 600));
      const vistos = document.querySelectorAll(".anuncio-medalha").length;
      await p;
      return vistos;
    });
    await teto.close();
    if (limite <= 1) ok("nunca dois banners ao mesmo tempo", `${limite} na tela, os outros na fila`);
    else falha("banners empilhados", `${limite} simultâneos`);

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
    ? "A MEDALHA SE ANUNCIA NO INSTANTE — e só uma vez."
    : `🔴 ${falhas} FALHA(S).`);
  process.exit(falhas === 0 ? 0 : 1);
})();
