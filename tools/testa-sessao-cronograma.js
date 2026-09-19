// TESTA-SESSAO-CRONOGRAMA -- marcar a sessao do dia deixa rastro no banco?
//
// Ate 19/09/2026 NAO deixava. Das cinco acoes que dao XP no Astral, so o
// cronometro gravava em `sessoes_estudo`. Marcar a sessao do cronograma --
// que e o caminho principal de quem usa o produto -- subia o XP e sumia.
//
// O Lucas apontou: "o cronometro do site e apenas para ajudar a contabilizar o
// tempo estudado". Quem estuda pelo cronograma nunca abre o cronometro, e
// portanto era invisivel para o banco.
//
// Isso deixou de ser detalhe quando a ficha (R1) e o calculo de XP no servidor
// (R0) passaram a derivar tudo de `sessoes_estudo`: sem o registro, essas
// pessoas teriam ficha ZERADA, e o conserto do XP apagaria o progresso delas.
//
// Este teste abre o dashboard num navegador de verdade, com usuario de verdade,
// clica em "marcar como feito" e confere NO BANCO que a linha apareceu -- com
// materia, duracao e o modo 'cronograma', que distingue tempo declarado de
// tempo medido pelo relogio.
const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");
const http = require("http");

const REF = "jjogmcacbdefwiwcyjxp";
const BASE = `https://${REF}.supabase.co`;
const RAIZ = path.resolve(__dirname, "..");
const PORTA = 8894;

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
if (!pw) {
  console.log("TESTA-SESSAO-CRONOGRAMA -- pulado: playwright nao encontrado.");
  process.exit(0);
}

const chaves = JSON.parse(execSync(`supabase projects api-keys --project-ref ${REF} -o json`, {
  encoding: "utf8", stdio: ["ignore", "pipe", "ignore"],
}));
const SERVICE = chaves.find((k) => k.name === "service_role").api_key;
const PUB = (fs.readFileSync(path.join(RAIZ, "assets/js/astral.js"), "utf8")
  .match(/sb_publishable_[A-Za-z0-9_-]+/) || [])[0];

let falhas = 0;
const ok = (t, d = "") => console.log(`  OK     ${t.padEnd(44)} ${d}`);
const falha = (t, d = "") => { console.log(`  FALHA  ${t.padEnd(44)} ${d}`); falhas++; };

async function req(caminho, opts) {
  const r = await fetch(`${BASE}${caminho}`, opts);
  let corpo = null;
  try { corpo = await r.json(); } catch { /* sem corpo */ }
  return { status: r.status, corpo };
}
const admin = { apikey: SERVICE, Authorization: `Bearer ${SERVICE}`, "Content-Type": "application/json" };

async function criarUsuario() {
  const email = `crono-${Date.now()}@astral-teste.local`;
  const c = await req("/auth/v1/admin/users", {
    method: "POST", headers: admin,
    body: JSON.stringify({ email, password: "T!" + crypto.randomUUID(), email_confirm: true }),
  });
  if (!c.corpo?.id) throw new Error("nao criou usuario: " + JSON.stringify(c.corpo));
  return { id: c.corpo.id, email };
}

async function sessaoNova(email) {
  const link = await req("/auth/v1/admin/generate_link", {
    method: "POST", headers: admin, body: JSON.stringify({ type: "magiclink", email }),
  });
  const s = await req("/auth/v1/verify", {
    method: "POST", headers: { apikey: PUB, "Content-Type": "application/json" },
    body: JSON.stringify({ type: "magiclink", token_hash: link.corpo?.hashed_token }),
  });
  if (!s.corpo?.access_token) throw new Error("nao obteve sessao");
  return s.corpo;
}

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

function scriptSessao(s) {
  return `(() => {
    localStorage.setItem("sb-${REF}-auth-token", JSON.stringify({
      access_token: ${JSON.stringify(s.access_token)},
      refresh_token: ${JSON.stringify(s.refresh_token)},
      token_type: "bearer",
      expires_at: Math.floor(Date.now()/1000) + 3600,
      user: ${JSON.stringify(s.user)},
    }));
  })()`;
}

// Um cronograma pronto, para a tela ter o que marcar.
const MATERIA = "Matematica de Teste";
const MINUTOS = 45;

(async () => {
  let usuario = null;
  await new Promise((r) => servidor.listen(PORTA, r));
  const nav = await pw.chromium.launch();

  try {
    usuario = await criarUsuario();
    const s = await sessaoNova(usuario.email);
    console.log(`\nTESTA-SESSAO-CRONOGRAMA  usuario ${usuario.id.slice(0, 8)}\n`);

    // Semeia um cronograma do dia direto no banco, como se o edital ja tivesse
    // sido processado -- assim o teste nao depende de chamada paga de IA.
    await req("/rest/v1/rpc/salvar_progresso", {
      method: "POST",
      headers: { apikey: PUB, Authorization: `Bearer ${s.access_token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        p_xp: 0, p_streak: 0, p_horas: 0, p_edital: null,
        p_materias: [{ nome: MATERIA, peso: 3, progresso: 10 }],
        p_cronograma_hoje: [{ materia: MATERIA, tempo: MINUTOS, xp: 23, feito: false }],
        p_badges: [], p_tag_escolhida: null,
      }),
    });
    ok("cronograma do dia semeado", `${MATERIA}, ${MINUTOS} min`);

    // Quantas sessoes existem ANTES -- o controle.
    const antes = await req(`/rest/v1/sessoes_estudo?usuario_id=eq.${usuario.id}&select=id`, {
      headers: { apikey: PUB, Authorization: `Bearer ${s.access_token}` },
    });
    const qtdAntes = Array.isArray(antes.corpo) ? antes.corpo.length : -1;
    ok("sessoes antes de marcar", String(qtdAntes));

    const ctx = await nav.newContext({ viewport: { width: 1280, height: 900 } });
    const pg = await ctx.newPage();
    await pg.addInitScript(scriptSessao(s));
    const errosDeTela = [];
    pg.on("pageerror", (e) => errosDeTela.push(String(e.message)));
    await pg.goto(`http://localhost:${PORTA}/dashboard.html`, { waitUntil: "load" });
    await pg.waitForTimeout(2500);

    /* ESPERAR a lista aparecer, em vez de dormir um tanto e torcer.
       Na primeira execucao deste teste o botao ainda nao existia: o caminho
       alternativo chamou window.marcarFeito(0) e estourou, porque o estado da
       pagina tambem nao estava pronto. Teste que depende de tempo de relogio
       falha sozinho um dia -- e ai ninguem sabe se quebrou o site ou o teste. */
    await pg.waitForFunction(
      () => !!document.querySelector('[onclick*="marcarFeito"]'),
      { timeout: 15000 },
    ).catch(() => { /* cai na verificacao abaixo, com mensagem melhor */ });

    const pronto = await pg.$('[onclick*="marcarFeito"]');
    if (!pronto) { falha("a lista do cronograma nao desenhou", "sem botao de marcar na tela"); }
    else ok("a lista do cronograma desenhou");

    // Acha o botao de marcar como feito e clica.
    const clicou = await pg.evaluate(() => {
      const alvo = [...document.querySelectorAll('[onclick*="marcarFeito"], button, [role="button"]')]
        .find((e) => /marcarFeito/.test(e.getAttribute("onclick") || "")
          || /marcar|feito|conclu/i.test((e.textContent || "").trim()));
      if (!alvo) return false;
      alvo.click();
      return true;
    });
    if (!clicou) {
      // Caminho alternativo: chamar a funcao global, que e o que o botao faz.
      const viaFuncao = await pg.evaluate(() => {
        if (typeof window.marcarFeito !== "function") return false;
        window.marcarFeito(0);
        return true;
      });
      if (viaFuncao) ok("marcou a sessao como feita", "via window.marcarFeito(0)");
      else falha("nao achei como marcar a sessao na tela");
    } else {
      ok("marcou a sessao como feita", "clique no botao da tela");
    }

    await pg.waitForTimeout(3000);

    if (errosDeTela.length) falha("a tela deu erro de JavaScript", errosDeTela[0].slice(0, 70));
    else ok("nenhum erro de JavaScript na tela");

    // 🔴 A checagem que importa: a linha chegou ao BANCO?
    const depois = await req(
      `/rest/v1/sessoes_estudo?usuario_id=eq.${usuario.id}&select=materia,segundos,xp,modo&order=criado_em.desc`,
      { headers: { apikey: PUB, Authorization: `Bearer ${s.access_token}` } },
    );
    const linhas = Array.isArray(depois.corpo) ? depois.corpo : [];
    if (linhas.length > qtdAntes) ok("🎯 a sessao APARECEU no banco", `${linhas.length} linha(s)`);
    else falha("🔴 a sessao NAO foi gravada", `continua em ${linhas.length}`);

    const nova = linhas[0];
    if (nova) {
      if (nova.materia === MATERIA) ok("gravou a materia certa", nova.materia);
      else falha("materia errada", String(nova.materia));

      if (Number(nova.segundos) === MINUTOS * 60) ok("gravou a duracao certa", `${nova.segundos}s = ${MINUTOS} min`);
      else falha("duracao errada", `${nova.segundos}s (esperado ${MINUTOS * 60})`);

      if (nova.modo === "cronograma") ok("modo 'cronograma' (tempo DECLARADO)", nova.modo);
      else falha("modo errado", `${nova.modo} -- perde a distincao declarado x medido`);
    }

    await ctx.close();
  } finally {
    if (usuario) {
      await req(`/auth/v1/admin/users/${usuario.id}`, { method: "DELETE", headers: admin });
      console.log("\n  (usuario de teste apagado)");
    }
    await nav.close();
    servidor.close();
  }

  console.log("\n" + "=".repeat(70));
  console.log(falhas === 0
    ? "ESTUDAR PELO CRONOGRAMA AGORA DEIXA RASTRO -- a ficha vai enxergar."
    : `🔴 ${falhas} FALHA(S).`);
  process.exit(falhas === 0 ? 0 : 1);
})();
