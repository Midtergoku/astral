/* ═══════════════════════════════════════════════════════════════════════════
   TESTA-FOLGA -- a folga planejada da rotina quebra a sequencia?
   (04/10/2026 -- auditoria GAM-04, roadmap 3.8, decisao dele: "Concordo")

   A auditoria, na conta `folga` (segunda a sabado, como o cronograma manda):
   30 dias de estudo, melhor sequencia 6 -- e 10 condecoracoes, 5 divisas e o
   bonus de 3 especializacoes impossiveis para quem SEGUE a rotina.

   A regra: a folga da rotina e um feriado para a sequencia -- nao quebra e nao
   conta. Estudar na folga conta. Faltar num dia de estudo quebra.

     1. seg a sab por 3 semanas, nenhum domingo -> sequencia = todos os dias estudados
     2. melhor sequencia e semanas sem brecha contam isso tambem
     3. faltar numa quarta (dia de estudo) QUEBRA
     4. estudar no domingo (folga) CONTA +1
     5. rotina de 7 dias: o domingo vazio volta a quebrar (nada de ponte sem folga)

   USO   node tools/testa-folga.js                (producao)
         ASTRAL_DEV=1 node tools/testa-folga.js   (astral-dev)
   Nao gasta credito. Cria contas de teste e apaga no fim.
   ═══════════════════════════════════════════════════════════════════════════ */
const { execSync, execFileSync } = require("child_process");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

const NO_DEV = process.env.ASTRAL_DEV === "1";
const REF = NO_DEV ? "vtluuezwfpqgryixaaea" : "jjogmcacbdefwiwcyjxp";
const BASE = `https://${REF}.supabase.co`;
const CHAVES = JSON.parse(execSync(`supabase projects api-keys --project-ref ${REF} -o json`, { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }));
const SK = CHAVES.find((k) => k.name === "service_role").api_key;
const admin = { apikey: SK, Authorization: `Bearer ${SK}`, "Content-Type": "application/json" };
const TOKEN = execFileSync("powershell", ["-NoProfile", "-File", path.join(__dirname, "token-supabase.ps1")], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
async function sql(query) {
  const r = await fetch(`https://api.supabase.com/v1/projects/${REF}/database/query`, { method: "POST", headers: { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json" }, body: JSON.stringify({ query }) });
  const t = await r.text(); if (!r.ok) throw new Error(`SQL HTTP ${r.status}: ${t.slice(0, 160)}`); return JSON.parse(t);
}
async function req(c, o = {}) { const r = await fetch(BASE + c, o); const t = await r.text(); let corpo = null; try { corpo = JSON.parse(t); } catch { corpo = t; } return { status: r.status, corpo }; }

let falhas = 0;
const ok = (t, d = "") => console.log(`  OK     ${t.padEnd(60)} ${d}`);
const falha = (t, d = "") => { console.log(`  FALHA  ${t.padEnd(60)} ${d}`); falhas++; };

/* O dia de N dias atras NO FUSO DE SAO PAULO (o fuso das funcoes), e o dia da semana dele. */
function diaSP(n) {
  const s = new Date(Date.now() - n * 86400000).toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });
  const [a, m, d] = s.split("-").map(Number);
  return { iso: s, dow: new Date(Date.UTC(a, m - 1, d)).getUTCDay() };
}
const SEG_SAB = { dias: [1, 2, 3, 4, 5, 6], minutosUtil: 120, minutosFds: 120, bloco: 40 };
const TODOS = { dias: [0, 1, 2, 3, 4, 5, 6], minutosUtil: 120, minutosFds: 120, bloco: 40 };

const contas = [];
async function conta(rotina, dias) {
  const email = `folga-${Date.now()}-${contas.length}@astral-teste.local`;
  const u = await req("/auth/v1/admin/users", { method: "POST", headers: admin, body: JSON.stringify({ email, password: "T!" + crypto.randomUUID(), email_confirm: true }) });
  const id = u.corpo.id; contas.push(id);
  await req("/rest/v1/progresso", { method: "POST", headers: { ...admin, Prefer: "return=minimal,resolution=merge-duplicates" },
    body: JSON.stringify({ usuario_id: id, xp: 0, streak: 0, horas: 0, materias: [{ nome: "Matemática", peso: 100, progresso: 0 }], rotina }) });
  await req(`/rest/v1/progresso?usuario_id=eq.${id}`, { method: "PATCH", headers: admin, body: JSON.stringify({ rotina }) });
  if (dias.length) {
    const r = await req("/rest/v1/sessoes_estudo", { method: "POST", headers: { ...admin, Prefer: "return=minimal" },
      body: JSON.stringify(dias.map((d) => ({ usuario_id: id, materia: "Matemática", segundos: 3600, xp: 120, modo: "livre", criado_em: `${d}T14:00:00-03:00` }))) });
    if (r.status >= 300) throw new Error("nao plantou: " + JSON.stringify(r.corpo).slice(0, 120));
  }
  return id;
}
// So pelo que existe antes e depois da mudanca: assim o teste roda contra o servidor antigo
// e mostra o defeito (a melhor sequencia vem dos fatos, pelo caminho da tela).
const medir = async (id) => (await sql(`select public.sequencia_do_usuario('${id}') as seq`))[0];

(async () => {
  try {
    console.log(`\nTESTA-FOLGA  ${NO_DEV ? "astral-dev" : "producao"}\n`);
    // 3 semanas para tras, a partir de ONTEM: todo dia de segunda a sabado, nenhum domingo
    const janela = Array.from({ length: 21 }, (_, i) => diaSP(21 - i));          // de 21 dias atras ate ontem
    const segSab = janela.filter((x) => x.dow !== 0).map((x) => x.iso);

    // 1 e 2
    const a = await conta(SEG_SAB, segSab);
    const ma = await medir(a);
    Number(ma.seq) === segSab.length ? ok("🎯 seg a sáb por 3 semanas: a sequência conta todos", `${ma.seq} dias (eram no máximo 6)`)
      : falha("a folga quebrou a sequencia", `${ma.seq}, esperado ${segSab.length}`);
    // semanas sem brecha, pelo mesmo caminho da tela (fatos_do_usuario, com a conta do aluno)
    const email = (await req(`/auth/v1/admin/users/${a}`, { headers: admin })).corpo.email;
    const link = await req("/auth/v1/admin/generate_link", { method: "POST", headers: admin, body: JSON.stringify({ type: "magiclink", email }) });
    const PUB = NO_DEV ? (CHAVES.find((k) => k.type === "publishable") || CHAVES.find((k) => k.name === "anon")).api_key
      : (fs.readFileSync(path.join(__dirname, "..", "assets/js/astral.js"), "utf8").match(/sb_publishable_[A-Za-z0-9_-]+/) || [])[0];
    const tok = (await req("/auth/v1/verify", { method: "POST", headers: { apikey: PUB, "Content-Type": "application/json" }, body: JSON.stringify({ type: "magiclink", token_hash: link.corpo.hashed_token }) })).corpo.access_token;
    const fatos = (await req("/rest/v1/rpc/fatos_do_usuario", { method: "POST", headers: { apikey: PUB, Authorization: `Bearer ${tok}`, "Content-Type": "application/json" }, body: "{}" })).corpo;
    Number(fatos?.semanasPerfeitas) >= 2 ? ok("🎯 semanas sem brecha contam seg a sáb completas", `${fatos.semanasPerfeitas} semanas (eram 0)`)
      : falha("semana sem brecha ainda exige os 7 dias", String(fatos?.semanasPerfeitas));
    Number(fatos?.melhorSequencia) === segSab.length ? ok("os fatos das condecorações veem a mesma sequência", `melhorSequencia ${fatos.melhorSequencia}`)
      : falha("fatos com outra sequencia", String(fatos?.melhorSequencia));
    const sem = await sql(`select public.dias_de_folga('${a}') as f`).catch(() => [{ f: "funcao dias_de_folga nao existe" }]);
    JSON.stringify(sem[0].f) === "[0]" ? ok("a folga lida da rotina é o domingo", "[0]") : falha("folga lida errada", JSON.stringify(sem[0].f));

    // 3. faltar numa quarta quebra
    const quartas = segSab.filter((iso) => janela.find((x) => x.iso === iso).dow === 3);
    const semQuarta = segSab.filter((iso) => iso !== quartas[quartas.length - 1]);
    const b = await conta(SEG_SAB, semQuarta);
    const mb = await medir(b);
    const depoisDaQuarta = semQuarta.filter((iso) => iso > quartas[quartas.length - 1]).length;
    Number(mb.seq) === depoisDaQuarta ? ok("🎯 faltar numa quarta (dia de estudo) QUEBRA", `sequência ${mb.seq}`)
      : falha("faltar num dia de estudo nao quebrou", `${mb.seq}, esperado ${depoisDaQuarta}`);

    // 4. estudar no domingo conta
    const domingos = janela.filter((x) => x.dow === 0).map((x) => x.iso);
    const c = await conta(SEG_SAB, [...segSab, domingos[domingos.length - 1]]);
    const mc = await medir(c);
    Number(mc.seq) === segSab.length + 1 ? ok("estudar no domingo (folga) conta +1", `${mc.seq}`) : falha("estudo na folga nao contou", `${mc.seq}, esperado ${segSab.length + 1}`);

    // 5. rotina de 7 dias: domingo vazio quebra
    const d = await conta(TODOS, segSab);
    const md = await medir(d);
    const depoisDoDomingo = segSab.filter((iso) => iso > domingos[domingos.length - 1]).length;
    Number(md.seq) === depoisDoDomingo ? ok("🎯 rotina de 7 dias: o domingo vazio quebra (sem ponte)", `sequência ${md.seq}`)
      : falha("ponte sem folga na rotina", `${md.seq}, esperado ${depoisDoDomingo}`);

    // 6. sem rotina: vale a padrao (seg a sab), a mesma que o painel mostra
    const e = await conta(null, segSab);
    const me = await medir(e);
    Number(me.seq) === segSab.length ? ok("sem rotina: vale a padrão (domingo é folga)", `${me.seq}`) : falha("sem rotina, folga padrao nao valeu", `${me.seq}`);
  } catch (err) {
    falha("o teste quebrou", err.message.slice(0, 140));
  } finally {
    for (const id of contas) await req(`/auth/v1/admin/users/${id}`, { method: "DELETE", headers: admin });
    console.log(`\n  (${contas.length} contas de teste apagadas)`);
    console.log("\n" + "=".repeat(70));
    console.log(falhas === 0 ? "A FOLGA DA ROTINA NÃO QUEBRA A SEQUÊNCIA — E FALTAR AINDA QUEBRA." : `🔴 ${falhas} FALHA(S).`);
    process.exit(falhas ? 1 : 0);
  }
})();
