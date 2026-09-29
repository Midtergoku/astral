// TESTA-XP-FORJADO -- da para escrever o XP que eu quiser?
//
// 28/09/2026: o conserto entrou (migration 20260928100000). Este teste passou
// a atacar as SESSOES, de onde sai tudo, e a provar que o estudo honesto --
// cronometro e cronograma -- continua valendo.
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
    const comoEle = { apikey: PUB, Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
    console.log(`\nTESTA-XP-FORJADO  usuario ${usuario.id.slice(0, 8)}  (sessao VALIDA)\n`);

    // Grava uma sessao do jeito que o site grava (estado.js registrarSessao).
    const sessaoNova = (campos) => req("/rest/v1/sessoes_estudo", {
      method: "POST", headers: { ...comoEle, Prefer: "return=representation" },
      body: JSON.stringify({ usuario_id: usuario.id, materia: "Matemática", ...campos }),
    });
    const aceita = (r) => r.status < 300 && Array.isArray(r.corpo) && r.corpo[0];

    // ── 28/09/2026: A PARTE QUE O CONSERTO FECHOU -- as sessoes ──────────────
    console.log("== AS SESSOES (de onde sai ficha, patente, pontos e conquistas) ==");

    // 1. Estudo honesto pelo cronograma continua valendo -- e o XP e o do servidor.
    const r1 = await sessaoNova({ segundos: 1800, xp: 999999, modo: "cronograma" });
    const s1 = aceita(r1);
    if (!s1) vuln("🔴 o estudo HONESTO do cronograma foi recusado", `HTTP ${r1.status} ${JSON.stringify(r1.corpo).slice(0, 80)}`);
    else if (s1.xp === 15) ok("cronograma honesto aceito, XP do servidor", "pediu 999999, gravou 15");
    else vuln("XP da sessao e o que o navegador manda", `xp=${s1.xp}`);

    // 2. Sessao "no passado".
    const r2 = await sessaoNova({ segundos: 1200, xp: 10, modo: "cronograma", criado_em: "2020-01-01T12:00:00Z" });
    const s2 = aceita(r2);
    if (s2 && s2.criado_em.startsWith("2020")) vuln("sessao gravada no PASSADO", s2.criado_em);
    else ok("data no passado vira 'agora'", s2 ? s2.criado_em.slice(0, 10) : `HTTP ${r2.status}`);

    // 3. Uma hora de cronometro numa conta criada ha segundos.
    const r3 = await sessaoNova({ segundos: 3600, xp: 120, modo: "livre" });
    if (aceita(r3)) vuln("1 hora de cronometro numa conta de segundos", "o relogio nao teve tempo de correr");
    else ok("cronometro mais longo que o tempo real: recusado", `HTTP ${r3.status}`);

    // 4. Cronometro honesto: espera 65 s de verdade e grava 60 s.
    console.log("  ...   esperando 65 s de relogio de verdade");
    await new Promise((r) => setTimeout(r, 65000));
    const r4 = await sessaoNova({ segundos: 60, xp: 5000, modo: "livre" });
    const s4 = aceita(r4);
    if (!s4) vuln("🔴 o cronometro HONESTO foi recusado", `HTTP ${r4.status} ${JSON.stringify(r4.corpo).slice(0, 80)}`);
    else if (s4.xp === 2) ok("cronometro honesto aceito, 2 XP por minuto", "pediu 5000, gravou 2");
    else vuln("XP do cronometro e o do navegador", `xp=${s4.xp}`);

    // 5. Logo em seguida, mais 10 minutos de cronometro.
    const r5 = await sessaoNova({ segundos: 600, xp: 20, modo: "livre" });
    if (aceita(r5)) vuln("duas sessoes de cronometro sobrepostas", "10 min gravados em 0 s");
    else ok("sessao sobreposta a anterior: recusada", `HTTP ${r5.status}`);

    // 6. Cronograma: 5 h de uma vez, e depois o teto de 12 h no dia.
    const r6 = await sessaoNova({ segundos: 5 * 3600, xp: 150, modo: "cronograma" });
    if (aceita(r6)) vuln("sessao declarada de 5 horas aceita");
    else ok("sessao declarada acima de 4 h: recusada", `HTTP ${r6.status}`);
    const quatro = [];
    for (let i = 0; i < 3; i++) quatro.push(aceita(await sessaoNova({ segundos: 4 * 3600, xp: 120, modo: "cronograma" })));
    const passaram = quatro.filter(Boolean).length;
    if (passaram === 2) ok("teto de 12 h declaradas por dia", "2 de 3 blocos de 4 h entraram");
    else vuln("teto diario do cronograma", `${passaram} de 3 blocos de 4 h entraram`);

    // ── O PROGRESSO: patente do topo, sequencia, horas ───────────────────────
    console.log("\n== O PROGRESSO (o numero que a tela mostra) ==");
    const ABSURDO = 999_999_999;
    await salvar(token, { p_xp: ABSURDO, p_streak: 4000, p_horas: 99999 });
    const p = await lerProgresso(token);
    const sess = (await req(`/rest/v1/sessoes_estudo?usuario_id=eq.${usuario.id}&select=xp,segundos`, { headers: admin })).corpo || [];
    const xpReal = sess.reduce((s, x) => s + x.xp, 0);
    const horasReal = Math.round(sess.reduce((s, x) => s + x.segundos, 0) / 360) / 10;
    if (Number(p?.xp) === ABSURDO) vuln("o servidor ACEITA XP que ninguem estudou", `xp=${p.xp}`);
    else if (Number(p?.xp) === xpReal) ok("XP forjado ignorado: vale o das sessoes", `pediu ${ABSURDO}, ficou ${p.xp}`);
    else vuln("XP guardado nao bate com as sessoes", `${p?.xp} vs ${xpReal}`);
    if (Number(p?.streak) === 4000) vuln("streak forjado aceito", "4000 dias");
    else ok("sequencia forjada ignorada", `pediu 4000, ficou ${p?.streak}`);
    if (Number(p?.horas) >= 99999) vuln("horas forjadas aceitas", `${p.horas}h`);
    else ok("horas forjadas ignoradas", `pediu 99999, ficou ${p?.horas} (sessoes: ${horasReal})`);

    // ── O que continua declarado, por natureza ───────────────────────────────
    await salvar(token, { p_badges: ["maratonista", "nivel_5", "conquista_que_nao_existe"] });
    const b = (await lerProgresso(token))?.badges || [];
    if (b.includes("maratonista")) console.log("  AVISO   missoes antigas do dashboard (badges) seguem declaradas -- cosmetico, nao libera nada");

    // ── E o plano, que mexe em dinheiro ──────────────────────────────────────
    const promo = await req(`/rest/v1/perfis?id=eq.${usuario.id}`, {
      method: "PATCH", headers: { ...comoEle, Prefer: "return=representation" },
      body: JSON.stringify({ tipo_plano: "pro" }),
    });
    const plano = (await req(`/rest/v1/perfis?id=eq.${usuario.id}&select=tipo_plano`, { headers: admin })).corpo?.[0]?.tipo_plano;
    if (plano === "pro") vuln("🚨 promoveu a propria conta para PRO", "isto seria receita perdida");
    else ok("NAO consegue se promover a pro", `continua ${plano} (HTTP ${promo.status})`);

  } finally {
    if (usuario) {
      await req(`/auth/v1/admin/users/${usuario.id}`, { method: "DELETE", headers: admin });
      console.log("\n  (usuario de teste apagado)");
    }
  }

  console.log("\n" + "=".repeat(70));
  if (achados === 0) {
    console.log("O XP E CONFIAVEL -- o servidor calcula, o navegador so mostra.");
    console.log("Quem quiser patente alta tem de passar o tempo estudando.");
  } else {
    console.log(`🔴 ${achados} FURO(S).`);
  }
  process.exit(achados ? 1 : 0);
})();
