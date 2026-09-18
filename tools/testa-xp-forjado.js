// TESTA-XP-FORJADO -- da para escrever o XP que eu quiser?
//
// Pergunta do Lucas em 17/09/2026: "nao tem alguma maneira de tornar isso
// invisivel para as pessoas nao conseguirem alterar? Se nao perde a graca."
//
// Antes de responder "da" ou "nao da", MEDIR. Este teste cria um usuario de
// verdade, pega uma sessao VALIDA (sem ela o resultado nao vale nada -- ver
// CLAUDE.md, o teste de invasao que deu "tudo bloqueado" sem autenticar) e
// chama a mesma funcao que o site chama, com numeros absurdos.
//
// O que se quer descobrir, em ordem:
//   1. o servidor aceita um XP que a pessoa nunca estudou?
//   2. se aceitar, da para DESFAZER? (a funcao usa greatest(), que guarda o
//      MAIOR -- entao um numero forjado pode ser permanente)
//   3. da para forjar streak, horas e conquistas junto?
//   4. da para se promover a 'pro' pelo mesmo caminho?
//
// 🔴 Este teste NAO explora nada de terceiros: cria a propria conta, ataca a
// si mesmo e apaga a conta no fim.
const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const REF = "jjogmcacbdefwiwcyjxp";
const BASE = `https://${REF}.supabase.co`;
const RAIZ = path.resolve(__dirname, "..");

const chaves = JSON.parse(execSync(`supabase projects api-keys --project-ref ${REF} -o json`, {
  encoding: "utf8", stdio: ["ignore", "pipe", "ignore"],
}));
const SERVICE = chaves.find((k) => k.name === "service_role").api_key;
const PUB = (fs.readFileSync(path.join(RAIZ, "assets/js/astral.js"), "utf8")
  .match(/sb_publishable_[A-Za-z0-9_-]+/) || [])[0];

let achados = 0;
const vuln = (t, d = "") => { console.log(`  🔴 FURO  ${t.padEnd(44)} ${d}`); achados++; };
const ok = (t, d = "") => console.log(`  OK      ${t.padEnd(44)} ${d}`);

async function req(caminho, opts) {
  const r = await fetch(`${BASE}${caminho}`, opts);
  let corpo = null;
  try { corpo = await r.json(); } catch { /* sem corpo */ }
  return { status: r.status, corpo };
}
const admin = { apikey: SERVICE, Authorization: `Bearer ${SERVICE}`, "Content-Type": "application/json" };

async function criarUsuario() {
  const email = `xp-${Date.now()}@astral-teste.local`;
  const c = await req("/auth/v1/admin/users", {
    method: "POST", headers: admin,
    body: JSON.stringify({ email, password: "T!" + crypto.randomUUID(), email_confirm: true }),
  });
  if (!c.corpo?.id) throw new Error("nao criou usuario: " + JSON.stringify(c.corpo));
  return { id: c.corpo.id, email };
}

async function sessao(email) {
  const link = await req("/auth/v1/admin/generate_link", {
    method: "POST", headers: admin, body: JSON.stringify({ type: "magiclink", email }),
  });
  const s = await req("/auth/v1/verify", {
    method: "POST", headers: { apikey: PUB, "Content-Type": "application/json" },
    body: JSON.stringify({ type: "magiclink", token_hash: link.corpo?.hashed_token }),
  });
  if (!s.corpo?.access_token) throw new Error("nao obteve sessao");
  return s.corpo.access_token;
}

// Chama a MESMA funcao que assets/js/estado.js chama, do mesmo jeito.
async function salvar(token, campos) {
  return req("/rest/v1/rpc/salvar_progresso", {
    method: "POST",
    headers: { apikey: PUB, Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      p_xp: 0, p_streak: 0, p_horas: 0, p_edital: null, p_materias: [],
      p_cronograma_hoje: [], p_badges: [], p_tag_escolhida: null, ...campos,
    }),
  });
}

async function lerProgresso(token) {
  const r = await req("/rest/v1/progresso?select=xp,streak,horas,badges", {
    headers: { apikey: PUB, Authorization: `Bearer ${token}` },
  });
  return Array.isArray(r.corpo) ? r.corpo[0] : null;
}

(async () => {
  let usuario = null;
  try {
    usuario = await criarUsuario();
    const token = await sessao(usuario.email);
    console.log(`\nTESTA-XP-FORJADO  usuario ${usuario.id.slice(0, 8)}  (sessao VALIDA)\n`);

    // ── 1. estudar de verdade: um pouquinho ──────────────────────────────────
    await salvar(token, { p_xp: 120, p_streak: 2, p_horas: 1.5 });
    const honesto = await lerProgresso(token);
    ok("ponto de partida honesto", `xp=${honesto?.xp} streak=${honesto?.streak} horas=${honesto?.horas}`);

    // ── 2. mandar um numero que ninguem estuda ───────────────────────────────
    const ABSURDO = 999_999_999;
    await salvar(token, { p_xp: ABSURDO, p_streak: 4000, p_horas: 99999 });
    const forjado = await lerProgresso(token);
    if (forjado?.xp === ABSURDO) {
      vuln("o servidor ACEITA XP que ninguem estudou", `xp=${forjado.xp}`);
    } else {
      ok("o servidor recusou o XP absurdo", `xp=${forjado?.xp}`);
    }
    if (Number(forjado?.streak) === 4000) vuln("streak forjado aceito", "4000 dias (~11 anos)");
    if (Number(forjado?.horas) >= 99999) vuln("horas forjadas aceitas", `${forjado.horas}h`);

    // ── 3. da para VOLTAR atras? ─────────────────────────────────────────────
    // A funcao usa greatest() para nao perder progresso. O efeito colateral e
    // que o numero forjado nao desce nunca mais -- nem pelo dono da conta.
    await salvar(token, { p_xp: 120, p_streak: 2, p_horas: 1.5 });
    const depois = await lerProgresso(token);
    if (Number(depois?.xp) === ABSURDO) {
      vuln("e PERMANENTE: nem o proprio dono desfaz", "greatest() guarda o maior para sempre");
    } else {
      ok("da para corrigir o valor depois", `xp=${depois?.xp}`);
    }

    // ── 4. conquistas inventadas ─────────────────────────────────────────────
    await salvar(token, { p_badges: ["maratonista", "nivel_5", "conquista_que_nao_existe"] });
    const comBadges = await lerProgresso(token);
    const b = comBadges?.badges || [];
    if (b.includes("maratonista")) vuln("conquista inventada aceita", JSON.stringify(b).slice(0, 60));

    // ── 5. e o plano? esse e o que mexe em dinheiro ──────────────────────────
    const promo = await req(`/rest/v1/perfis?id=eq.${usuario.id}`, {
      method: "PATCH",
      headers: {
        apikey: PUB, Authorization: `Bearer ${token}`,
        "Content-Type": "application/json", Prefer: "return=representation",
      },
      body: JSON.stringify({ plano: "pro" }),
    });
    const virouPro = Array.isArray(promo.corpo) && promo.corpo[0]?.plano === "pro";
    if (virouPro) vuln("🚨 promoveu a propria conta para PRO", "isto seria receita perdida");
    else ok("NAO consegue se promover a pro", `status ${promo.status}`);

  } finally {
    if (usuario) {
      await req(`/auth/v1/admin/users/${usuario.id}`, { method: "DELETE", headers: admin });
      console.log("\n  (usuario de teste apagado)");
    }
  }

  console.log("\n" + "=".repeat(70));
  if (achados === 0) {
    console.log("O XP E CONFIAVEL -- o servidor manda, o navegador so mostra.");
  } else {
    console.log(`${achados} FURO(S). O XP hoje e o que o NAVEGADOR diz que e.`);
    console.log("");
    console.log("Isto e inofensivo enquanto o XP nao vale nada -- e autoengano,");
    console.log("e quem se engana escolheu se enganar. Vira problema de verdade");
    console.log("no dia em que XP destrancar conteudo, raridade ou vantagem:");
    console.log("ai deixa de ser autoengano e passa a ser furar a fila.");
    console.log("");
    console.log("Conserto: o servidor calcula o XP a partir de sessoes_estudo,");
    console.log("que ja grava materia, segundos e horario de cada sessao.");
    console.log("Esconder no navegador NAO resolve -- ver o cabecalho do arquivo.");
  }
  process.exit(0);
})();
