/* ═══════════════════════════════════════════════════════════════════════════
   TESTA-DIA-DA-SESSAO -- a sessao conta no dia em que COMECOU, e o "hoje" e um so?
   (04/10/2026 -- auditoria NUM-05 + NUM-06 + NUM-07, roadmap 3.9)

   A auditoria, na conta `madrugada`: 10 noites de estudo e sequencia de 11;
   a Quimica 23h50 -> 00h40 aparecia "hoje"; no pior caso, quem estuda as 20h
   numa noite e 23h30 -> 00h10 na outra PULA um dia e QUEBRA a sequencia. E no
   Acre o cronometro dizia "0 min hoje" com as Missoes dizendo "cumprida".

   SERVIDOR (cria contas de teste, apaga no fim):
     1. 20h, 23h30->00h10, 20h em tres noites seguidas -> sequencia 3 (era 1)
     2. a coluna sessoes_estudo.dia e o dia em que a sessao comecou
     3. as estatisticas mandam a sessao 23h50->00h40 no dia em que comecou
     4. Amplitude "nos ultimos 30 dias" = 30 DATAS (a 31a nao entra)
   NAVEGADOR (modulos de verdade, aparelho no fuso do Acre, 22h30 de domingo
   = 00h30 de segunda em Sao Paulo):
     5. o bloco de hoje do cronograma e o de SEGUNDA
     6. dias ate a prova contam de segunda
     7. o diario poe a sessao 23h50->00h40 no dia em que comecou
     8. a revisao de 7 dias conta do dia em que comecou

   USO   node tools/testa-dia-da-sessao.js                (producao)
         ASTRAL_DEV=1 node tools/testa-dia-da-sessao.js   (astral-dev)
         ASTRAL_RAIZ=<pasta> ...   os modulos do navegador de outra copia do site
   Nao gasta credito.
   ═══════════════════════════════════════════════════════════════════════════ */
const { execSync, execFileSync } = require("child_process");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const { pathToFileURL } = require("url");

const RAIZ = process.env.ASTRAL_RAIZ || path.join(__dirname, "..");

/* ── O FILHO: roda os modulos do navegador com o relogio parado no Acre ──── */
if (process.env.TESTA_DIA_FILHO === "1") {
  // 2026-10-05 03:30 UTC = domingo 22h30 no Acre = segunda 00h30 em Sao Paulo
  const AGORA = Date.parse("2026-10-05T03:30:00Z");
  const DataReal = Date;
  class DataParada extends DataReal {
    constructor(...a) { if (a.length) super(...a); else super(AGORA); }
    static now() { return AGORA; }
  }
  global.Date = DataParada;
  const mod = (f) => import(pathToFileURL(path.join(RAIZ, "assets/js", f)).href);
  (async () => {
    const r = {};
    r.aparelhoNoAcre = new Date().getDay() === 0 && new Date().getHours() === 22;
    const { blocosDeHoje } = await mod("cronograma.js");
    const semana = Array.from({ length: 7 }, (_, i) => ({ dia: i, estuda: true, blocos: [{ materia: `Dia${i}`, minutos: 30, xp: 15 }] }));
    r.blocoDeHoje = (blocosDeHoje(semana, [], new Date())[0] || {}).materia;
    const { diasAte } = await mod("chefe.js");
    r.diasAteProva = diasAte("2026-10-10");
    const { montarDiario } = await mod("diario.js");
    r.diaDoDiario = (montarDiario([{ materia: "Química", segundos: 3000, modo: "livre", criado_em: "2026-10-05T03:40:00Z" }])[0] || {}).dia;
    const { revisoesDeHoje } = await mod("revisao.js");
    const rev = revisoesDeHoje([{ materia: "Química", segundos: 3000, criado_em: "2026-09-28T03:40:00Z" }], "2026-10-04");
    r.revisao = rev.length ? rev[0].haDias : null;
    process.stdout.write(JSON.stringify(r));
  })().catch((e) => { process.stdout.write(JSON.stringify({ erro: String(e && e.message || e) })); });
  return;
}

const NO_DEV = process.env.ASTRAL_DEV === "1";
const REF = NO_DEV ? "vtluuezwfpqgryixaaea" : "jjogmcacbdefwiwcyjxp";
const BASE = `https://${REF}.supabase.co`;

let falhas = 0;
const ok = (t, d = "") => console.log(`  OK     ${t.padEnd(62)} ${d}`);
const falha = (t, d = "") => { console.log(`  FALHA  ${t.padEnd(62)} ${d}`); falhas++; };
const pular = (t, d = "") => console.log(`  --     ${t.padEnd(62)} ${d}`);

/* O dia de N dias atras NO FUSO DE SAO PAULO (o fuso das funcoes), AAAA-MM-DD. */
const diaSP = (n) => new Date(Date.now() - n * 86400000).toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });
const minutoDoDiaSP = () => { const d = new Date(Date.now() - 3 * 3600000); return d.getUTCHours() * 60 + d.getUTCMinutes(); };

(async () => {
  console.log(`\nTESTA-DIA-DA-SESSAO  ${NO_DEV ? "astral-dev" : "producao"}${process.env.ASTRAL_RAIZ ? "  (modulos de " + RAIZ + ")" : ""}\n`);

  // ── NAVEGADOR ─────────────────────────────────────────────────────────────
  console.log("  navegador, aparelho no Acre (domingo 22h30 = segunda 00h30 em SP):");
  let r = {};
  try {
    r = JSON.parse(execFileSync(process.execPath, [__filename], { encoding: "utf8",
      env: { ...process.env, TZ: "America/Rio_Branco", TESTA_DIA_FILHO: "1", ASTRAL_RAIZ: RAIZ } }));
  } catch (e) { r = { erro: e.message.slice(0, 140) }; }
  if (r.erro) falha("os modulos nao rodaram", r.erro);
  else {
    r.aparelhoNoAcre ? ok("o aparelho simulado esta mesmo no Acre", "domingo, 22h") : falha("o fuso simulado nao pegou", "TZ ignorado");
    r.blocoDeHoje === "Dia1" ? ok("🎯 o bloco de hoje do cronograma é o de SEGUNDA", r.blocoDeHoje)
      : falha("cronograma no dia do aparelho", `${r.blocoDeHoje}, esperado Dia1 (segunda)`);
    r.diasAteProva === 5 ? ok("🎯 prova em 10/10: faltam 5 dias (de segunda)", String(r.diasAteProva))
      : falha("dias ate a prova pelo relogio do aparelho", `${r.diasAteProva}, esperado 5`);
    r.diaDoDiario === "2026-10-04" ? ok("🎯 diário: 23h50->00h40 fica no dia em que começou", r.diaDoDiario)
      : falha("diario no dia em que a sessao terminou", `${r.diaDoDiario}, esperado 2026-10-04`);
    r.revisao === 7 ? ok("revisão de 7 dias conta do dia em que começou", `${r.revisao} dias`)
      : falha("revisao contada do fim da sessao", `${r.revisao}, esperado 7`);
  }

  // ── SERVIDOR ──────────────────────────────────────────────────────────────
  console.log("\n  servidor:");
  const CHAVES = JSON.parse(execSync(`supabase projects api-keys --project-ref ${REF} -o json`, { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }));
  const SK = CHAVES.find((k) => k.name === "service_role").api_key;
  const PUB = NO_DEV ? (CHAVES.find((k) => k.type === "publishable") || CHAVES.find((k) => k.name === "anon")).api_key
    : (fs.readFileSync(path.join(__dirname, "..", "assets/js/astral.js"), "utf8").match(/sb_publishable_[A-Za-z0-9_-]+/) || [])[0];
  const admin = { apikey: SK, Authorization: `Bearer ${SK}`, "Content-Type": "application/json" };
  const TOKEN = execFileSync("powershell", ["-NoProfile", "-File", path.join(__dirname, "token-supabase.ps1")], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
  async function sql(query) {
    const x = await fetch(`https://api.supabase.com/v1/projects/${REF}/database/query`, { method: "POST", headers: { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json" }, body: JSON.stringify({ query }) });
    const t = await x.text(); if (!x.ok) throw new Error(`SQL HTTP ${x.status}: ${t.slice(0, 160)}`); return JSON.parse(t);
  }
  async function req(c, o = {}) { const x = await fetch(BASE + c, o); const t = await x.text(); let corpo = null; try { corpo = JSON.parse(t); } catch { corpo = t; } return { status: x.status, corpo }; }

  const contas = [];
  const TODOS = { dias: [0, 1, 2, 3, 4, 5, 6], minutosUtil: 120, minutosFds: 120, bloco: 40 };   // sem folga: so o dia importa
  async function conta(sessoes) {
    const email = `dia-sessao-${Date.now()}-${contas.length}@astral-teste.local`;
    const u = await req("/auth/v1/admin/users", { method: "POST", headers: admin, body: JSON.stringify({ email, password: "T!" + crypto.randomUUID(), email_confirm: true }) });
    const id = u.corpo.id; contas.push(id);
    await req("/rest/v1/progresso", { method: "POST", headers: { ...admin, Prefer: "return=minimal,resolution=merge-duplicates" },
      body: JSON.stringify({ usuario_id: id, xp: 0, streak: 0, horas: 0, materias: [{ nome: "Matemática", peso: 50, progresso: 0 }, { nome: "Física", peso: 50, progresso: 0 }], rotina: TODOS }) });
    await req(`/rest/v1/progresso?usuario_id=eq.${id}`, { method: "PATCH", headers: admin, body: JSON.stringify({ rotina: TODOS }) });
    const p = await req("/rest/v1/sessoes_estudo", { method: "POST", headers: { ...admin, Prefer: "return=minimal" },
      body: JSON.stringify(sessoes.map((s) => ({ usuario_id: id, modo: "livre", xp: Math.round(s.segundos / 30), ...s }))) });
    if (p.status >= 300) throw new Error("nao plantou: " + JSON.stringify(p.corpo).slice(0, 140));
    const link = await req("/auth/v1/admin/generate_link", { method: "POST", headers: admin, body: JSON.stringify({ type: "magiclink", email }) });
    const tok = (await req("/auth/v1/verify", { method: "POST", headers: { apikey: PUB, "Content-Type": "application/json" }, body: JSON.stringify({ type: "magiclink", token_hash: link.corpo.hashed_token }) })).corpo.access_token;
    const est = (await req("/rest/v1/rpc/estatisticas_do_usuario", { method: "POST", headers: { apikey: PUB, Authorization: `Bearer ${tok}`, "Content-Type": "application/json" }, body: "{}" })).corpo;
    return { id, est };
  }

  try {
    // 1-3. tres noites seguidas, a do meio passando da meia-noite (+ uma Quimica 23h50->00h40 antes)
    const [n5, n4, n3, n2, n1] = [5, 4, 3, 2, 1].map(diaSP);
    const a = await conta([
      { materia: "Física",     segundos: 3000, criado_em: `${n4}T00:40:00-03:00` },   // comecou 23h50 de n5
      { materia: "Matemática", segundos: 3600, criado_em: `${n3}T21:00:00-03:00` },   // 20h -> 21h
      { materia: "Matemática", segundos: 2400, criado_em: `${n1}T00:10:00-03:00` },   // 23h30 de n2 -> 00h10 de n1
      { materia: "Matemática", segundos: 3600, criado_em: `${n1}T21:00:00-03:00` },   // 20h -> 21h
    ]);
    const seq = Number((await sql(`select public.sequencia_do_usuario('${a.id}') as s`))[0].s);
    seq === 3 ? ok("🎯 20h, 23h30->00h10, 20h: três noites, sequência 3", `${seq} (o pior caso da auditoria dava 1)`)
      : falha("a noite que passou da meia-noite quebrou a sequencia", `${seq}, esperado 3`);
    Number(a.est?.fatos?.melhorSequencia) === 3 ? ok("a melhor sequência das condecorações também", String(a.est.fatos.melhorSequencia))
      : falha("melhor sequencia errada", String(a.est?.fatos?.melhorSequencia));
    const col = await sql(`select dia::text as d from public.sessoes_estudo where usuario_id = '${a.id}' and segundos = 2400`)
      .catch(() => [{ d: "coluna dia nao existe" }]);
    col[0]?.d === n2 ? ok("🎯 a coluna `dia` é o dia em que a sessão começou", col[0].d)
      : falha("coluna dia errada ou ausente", `${col[0]?.d}, esperado ${n2}`);
    const quim = (a.est?.sessoes || []).find((s) => s.materia === "Física");
    quim?.dia === n5 ? ok("🎯 estatísticas: 23h50->00h40 no dia em que começou", quim.dia)
      : falha("estatisticas no dia do fim da sessao", `${quim?.dia}, esperado ${n5}`);

    // 4. Amplitude: "nos ultimos 30 dias" sao 30 DATAS
    const m = minutoDoDiaSP();
    if (m < 10 || m > 23 * 60 + 45) pular("Amplitude em 30 datas", "rode fora da virada do dia (23h45-00h10)");
    else {
      const agora = Date.now();
      const b = await conta([
        { materia: "Matemática", segundos: 120, criado_em: new Date(agora - 60000).toISOString() },
        { materia: "Física",     segundos: 60,  criado_em: new Date(agora - 30 * 86400000 + 180000).toISOString() },   // 31a data
      ]);
      const amp = b.est?.fatos?.atributos?.amplitude?.valor;
      Number(amp) === 50 ? ok("🎯 Amplitude: a matéria de 30 datas atrás não conta", `${amp} (seriam 100)`)
        : falha("a 31a data entrou nos ultimos 30 dias", `${amp}, esperado 50`);
    }
  } catch (err) {
    falha("o teste quebrou", err.message.slice(0, 140));
  } finally {
    for (const id of contas) await req(`/auth/v1/admin/users/${id}`, { method: "DELETE", headers: admin });
    console.log(`\n  (${contas.length} contas de teste apagadas)`);
    console.log("\n" + "=".repeat(70));
    console.log(falhas === 0 ? "A SESSÃO CONTA NO DIA EM QUE COMEÇOU — E O \"HOJE\" É UM SÓ." : `🔴 ${falhas} FALHA(S).`);
    process.exit(falhas ? 1 : 0);
  }
})();
