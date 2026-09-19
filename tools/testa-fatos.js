// TESTA-FATOS -- a funcao do servidor conta certo?
//
// `fatos_do_usuario()` e a peca mais delicada do R13: sao onze consultas com
// janela, fuso e agrupamento por ilha. Erro ali nao estoura -- devolve um
// numero plausivel e errado, e a medalha cai na hora errada para sempre.
//
// Entao aqui NAO se confere "respondeu": planta-se um historico CONSTRUIDO, com
// cada numero conhecido de antemao, e confere-se fato a fato.
//
// O historico plantado, de proposito cheio de armadilhas:
//   - 9 dias seguidos de estudo, depois um buraco de 20 dias, depois 3 dias
//     (testa maior retorno = 20, e que a sequencia antiga nao vira streak)
//   - um dia com 3 sessoes e 2 materias distintas
//   - uma sessao de 95 minutos (a maior)
//   - 5 sessoes na madrugada e 4 no fim de semana
//   - a mesma materia 6 dias seguidos
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

let falhas = 0;
const ok = (t, d = "") => console.log(`  OK     ${t.padEnd(44)} ${d}`);
const falha = (t, d = "") => { console.log(`  FALHA  ${t.padEnd(44)} ${d}`); falhas++; };
const conf = (rotulo, obtido, esperado) => {
  if (Number(obtido) === Number(esperado)) ok(rotulo, String(obtido));
  else falha(rotulo, `${obtido} (esperado ${esperado})`);
};

async function req(caminho, opts) {
  const r = await fetch(`${BASE}${caminho}`, opts);
  let corpo = null;
  try { corpo = await r.json(); } catch { /* sem corpo */ }
  return { status: r.status, corpo };
}
const admin = { apikey: SERVICE, Authorization: `Bearer ${SERVICE}`, "Content-Type": "application/json" };

async function criarUsuario() {
  const email = `fatos-${Date.now()}@astral-teste.local`;
  const c = await req("/auth/v1/admin/users", {
    method: "POST", headers: admin,
    body: JSON.stringify({ email, password: "T!" + crypto.randomUUID(), email_confirm: true }),
  });
  if (!c.corpo?.id) throw new Error("nao criou usuario");
  return { id: c.corpo.id, email };
}
async function token(email) {
  const link = await req("/auth/v1/admin/generate_link", {
    method: "POST", headers: admin, body: JSON.stringify({ type: "magiclink", email }),
  });
  const s = await req("/auth/v1/verify", {
    method: "POST", headers: { apikey: PUB, "Content-Type": "application/json" },
    body: JSON.stringify({ type: "magiclink", token_hash: link.corpo?.hashed_token }),
  });
  return s.corpo.access_token;
}

/* Monta um instante no fuso de Sao Paulo, que e o fuso que a funcao usa.
   Fazer isso com `new Date(...)` local daria resultado diferente conforme a
   maquina -- e o teste passaria aqui e falharia no servidor de integracao. */
function instante(diasAtras, hora) {
  const base = new Date(Date.now() - diasAtras * 86400000);
  const ano = base.getUTCFullYear(), mes = base.getUTCMonth() + 1, dia = base.getUTCDate();
  const p = (n) => String(n).padStart(2, "0");
  return `${ano}-${p(mes)}-${p(dia)}T${p(hora)}:30:00-03:00`;
}

(async () => {
  let usuario = null;
  try {
    usuario = await criarUsuario();
    const t = await token(usuario.email);
    console.log(`\nTESTA-FATOS  usuario ${usuario.id.slice(0, 8)}\n`);

    const linhas = [];
    // Bloco recente: 3 dias seguidos (dias 0,1,2), a mesma materia
    for (let d = 0; d <= 2; d++) {
      linhas.push({ materia: "Matematica", segundos: 1800, xp: 20, modo: "livre", criado_em: instante(d, 14) });
    }
    // Buraco de 20 dias -> o maior retorno tem de dar 20
    // Bloco antigo: 9 dias seguidos (dias 22..30), Matematica nos 6 primeiros
    for (let d = 22; d <= 30; d++) {
      linhas.push({
        materia: d <= 27 ? "Matematica" : "Portugues",
        segundos: d === 25 ? 5700 : 1800,             // 95 min no dia 25
        xp: 20, modo: "livre", criado_em: instante(d, 14),
      });
    }
    // Um dia com 3 sessoes e 2 materias (dia 40)
    linhas.push({ materia: "Fisica",    segundos: 3600, xp: 30, modo: "pomodoro", criado_em: instante(40, 9) });
    linhas.push({ materia: "Fisica",    segundos: 3600, xp: 30, modo: "pomodoro", criado_em: instante(40, 15) });
    linhas.push({ materia: "Portugues", segundos: 1800, xp: 20, modo: "cronograma", criado_em: instante(40, 20) });
    // 5 na madrugada (4h e 5h), em dias distintos
    for (let i = 0; i < 5; i++) {
      linhas.push({ materia: "Ingles", segundos: 900, xp: 10, modo: "livre", criado_em: instante(60 + i, i < 3 ? 4 : 5) });
    }

    const ins = await req("/rest/v1/sessoes_estudo", {
      method: "POST", headers: { ...admin, Prefer: "return=minimal" },
      body: JSON.stringify(linhas.map((l) => ({ usuario_id: usuario.id, ...l }))),
    });
    if (ins.status >= 300) throw new Error("nao plantou: " + JSON.stringify(ins.corpo));
    ok("histórico plantado", `${linhas.length} sessões construídas`);

    await req("/rest/v1/rpc/salvar_progresso", {
      method: "POST",
      headers: { apikey: PUB, Authorization: `Bearer ${t}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        p_xp: 500, p_streak: 3, p_horas: 9, p_edital: { nome: "EEAR 2026" },
        p_materias: [
          { nome: "Matematica", peso: 3, progresso: 80 },
          { nome: "Portugues", peso: 3, progresso: 60 },
          { nome: "Fisica", peso: 2, progresso: 55 },
          { nome: "Ingles", peso: 1, progresso: 52 },   // a MENOS estudada (75 min)
        ],
        p_cronograma_hoje: [], p_badges: [], p_tag_escolhida: null,
      }),
    });

    const r = await req("/rest/v1/rpc/fatos_do_usuario", {
      method: "POST",
      headers: { apikey: PUB, Authorization: `Bearer ${t}`, "Content-Type": "application/json" },
      body: "{}",
    });
    const f = r.corpo;
    if (!f) { falha("a função não respondeu", JSON.stringify(r).slice(0, 100)); throw new Error("sem fatos"); }
    console.log("");

    conf("sessões",                 f.sessoes, linhas.length);
    conf("dias estudados",          f.diasEstudados, 3 + 9 + 1 + 5);
    conf("maior sessão (min)",      f.maiorSessaoMin, 95);
    conf("sessões no melhor dia",   f.sessoesNoDiaMax, 3);
    conf("matérias no melhor dia",  f.materiasNoDiaMax, 2);
    conf("mesma matéria seguida",   f.materiaSeguidaMax, 6);
    conf("maior retorno (dias)",    f.maiorRetornoDias, 20);
    conf("sessões na madrugada",    (Number(f.porHora?.["4"]) || 0) + (Number(f.porHora?.["5"]) || 0), 5);
    conf("sessões em pomodoro",     f.porModo?.pomodoro, 2);
    conf("sessões pelo cronograma", f.porModo?.cronograma, 1);
    conf("domínio mínimo",          f.dominioMinimo, 52);
    conf("domínio da menos estudada", f.dominioMenosEstudada, 52);

    if (f.temEdital === true) ok("reconhece que há edital");
    else falha("não reconheceu o edital", String(f.temEdital));

    // Horas: 3x30 + 8x30 + 95 + 2x60 + 30 + 5x15 = 90+240+95+120+30+75 = 650 min
    conf("horas acumuladas (x100)", Math.round(Number(f.horas) * 100), Math.round((650 / 60) * 100));

    if (f.atributos?.disciplina) ok("a ficha vem junto", `disciplina ${f.atributos.disciplina.valor}`);
    else falha("os atributos não vieram");

    // ── 🔴 Vazamento ──────────────────────────────────────────────────────
    const anon = await req("/rest/v1/rpc/fatos_do_usuario", {
      method: "POST", headers: { apikey: PUB, "Content-Type": "application/json" }, body: "{}",
    });
    if (anon.status >= 400) ok("sem login a função recusa", `status ${anon.status}`);
    else falha("🚨 respondeu sem login", `status ${anon.status}`);

  } finally {
    if (usuario) {
      await req(`/auth/v1/admin/users/${usuario.id}`, { method: "DELETE", headers: admin });
      console.log("\n  (usuário de teste apagado)");
    }
  }

  console.log("\n" + "=".repeat(70));
  console.log(falhas === 0
    ? "OS FATOS BATEM COM O HISTÓRICO — o motor pode confiar neles."
    : `🔴 ${falhas} FALHA(S).`);
  process.exit(falhas === 0 ? 0 : 1);
})();
