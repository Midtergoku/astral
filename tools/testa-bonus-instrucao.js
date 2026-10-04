/* ═══════════════════════════════════════════════════════════════════════════
   TESTA-BONUS-INSTRUCAO -- o bonus das especializacoes vale da escolha em diante?
   (03/10/2026 -- auditoria GAM-01 + GAM-12, roadmap 3.7)

   A auditoria, na conta `constante`: escolher 6 especializacoes SEM ESTUDAR levou
   o XP de 10.800 a 15.756 (Subtenente -> Aspirante); "Recomeçar" devolveu a
   Subtenente (a patente DESCEU). E os degraus de um ramo somavam (40+60+90 min:
   5+10+15 = 30%). Decisao dele: bonus so daqui para frente; patente nao desce.

     1. escolher especializacoes NAO muda o XP do que ja foi estudado
     2. a sessao nova ganha o bonus -- e no mesmo ramo vale o MAIOR degrau (15%, nao 30%)
     3. a sessao grava as especializacoes do momento; o navegador nao as forja
     4. "Recomeçar" NAO tira o XP ja ganho

   USO   node tools/testa-bonus-instrucao.js                (producao)
         ASTRAL_DEV=1 node tools/testa-bonus-instrucao.js   (astral-dev)
   Nao gasta credito. Cria 1 conta de teste e apaga no fim.
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
const PUB = NO_DEV ? (CHAVES.find((k) => k.type === "publishable") || CHAVES.find((k) => k.name === "anon")).api_key
  : (fs.readFileSync(path.join(__dirname, "..", "assets/js/astral.js"), "utf8").match(/sb_publishable_[A-Za-z0-9_-]+/) || [])[0];
const admin = { apikey: SK, Authorization: `Bearer ${SK}`, "Content-Type": "application/json" };
const TOKEN = execFileSync("powershell", ["-NoProfile", "-File", path.join(__dirname, "token-supabase.ps1")], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
async function sql(query) {
  const r = await fetch(`https://api.supabase.com/v1/projects/${REF}/database/query`, { method: "POST", headers: { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json" }, body: JSON.stringify({ query }) });
  const t = await r.text(); if (!r.ok) throw new Error(`SQL HTTP ${r.status}: ${t.slice(0, 160)}`); return JSON.parse(t);
}
async function req(c, o = {}) { const r = await fetch(BASE + c, o); const t = await r.text(); let corpo = null; try { corpo = JSON.parse(t); } catch { corpo = t; } return { status: r.status, corpo }; }

let falhas = 0;
const ok = (t, d = "") => console.log(`  OK     ${t.padEnd(62)} ${d}`);
const falha = (t, d = "") => { console.log(`  FALHA  ${t.padEnd(62)} ${d}`); falhas++; };
const dia = (n) => new Date(Date.now() - n * 86400000).toISOString();

(async () => {
  let uid = null;
  try {
    const email = `bonus-instrucao-${Date.now()}@astral-teste.local`;
    const u = await req("/auth/v1/admin/users", { method: "POST", headers: admin, body: JSON.stringify({ email, password: "T!" + crypto.randomUUID(), email_confirm: true }) });
    uid = u.corpo.id;
    const link = await req("/auth/v1/admin/generate_link", { method: "POST", headers: admin, body: JSON.stringify({ type: "magiclink", email }) });
    const token = (await req("/auth/v1/verify", { method: "POST", headers: { apikey: PUB, "Content-Type": "application/json" }, body: JSON.stringify({ type: "magiclink", token_hash: link.corpo.hashed_token }) })).corpo.access_token;
    const cab = { apikey: PUB, Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
    const rpc = (f, corpo = {}) => req(`/rest/v1/rpc/${f}`, { method: "POST", headers: cab, body: JSON.stringify(corpo) });
    const xp = async () => (await sql(`select (public.xp_com_bonus('${uid}')->>'comBonus')::int as x`))[0].x;
    console.log(`\nTESTA-BONUS-INSTRUCAO  ${NO_DEV ? "astral-dev" : "producao"}  usuario ${uid.slice(0, 8)}\n`);

    await rpc("salvar_progresso", { p_xp: 0, p_streak: 0, p_horas: 0, p_edital: { nome: "Teste Bonus" },
      p_materias: [{ nome: "Matemática", peso: 50, progresso: 0 }, { nome: "Física", peso: 50, progresso: 0 }],
      p_cronograma_hoje: [], p_badges: [], p_tag_escolhida: null });
    // 30 dias de estudo ja feitos (3.600 XP de base -> 3 pontos de especializacao)
    const plantadas = Array.from({ length: 30 }, (_, i) => ({ usuario_id: uid, materia: "Matemática", segundos: 3600, xp: 120, modo: "livre", criado_em: dia(40 - i) }));
    const ins = await req("/rest/v1/sessoes_estudo", { method: "POST", headers: { ...admin, Prefer: "return=minimal" }, body: JSON.stringify(plantadas) });
    if (ins.status >= 300) throw new Error("nao plantou: " + JSON.stringify(ins.corpo).slice(0, 120));

    // ── 1. escolher nao mexe no passado ───────────────────────────────────
    const xp0 = await xp();
    for (const id of ["art_1", "art_2", "art_3"]) {
      const r = await rpc("escolher_habilidade", { p_id: id });
      if (r.status >= 300) throw new Error(`escolher ${id}: ${JSON.stringify(r.corpo).slice(0, 100)}`);
    }
    const xp1 = await xp();
    xp1 === xp0 ? ok("🎯 escolher 3 especializações NÃO mexe no XP já estudado", `${xp0} -> ${xp1}`)
                : falha("o XP do passado mudou ao escolher", `${xp0} -> ${xp1} (sem estudar nada)`);

    // ── 2. a sessao nova ganha o bonus; no ramo vale o maior degrau ───────
    const nova = await req("/rest/v1/sessoes_estudo", { method: "POST", headers: { ...cab, Prefer: "return=representation" },
      body: JSON.stringify({ usuario_id: uid, materia: "Física", segundos: 5400, modo: "cronograma",
        habilidades: ["int_4", "inf_4"], regra_bonus: 1, alvo: true }) });   // tenta forjar
    const linha = Array.isArray(nova.corpo) ? nova.corpo[0] : null;
    if (!linha) throw new Error("sessao nova recusada: " + JSON.stringify(nova.corpo).slice(0, 120));
    const xp2 = await xp();
    const base = Number(linha.xp);                      // 90 min declarados
    const esperado = base * 1.15;                       // so o maior degrau da Artilharia (Bateria Pesada)
    Math.abs((xp2 - xp1) - esperado) <= 1 ? ok("🎯 a sessão nova ganha o bônus: maior degrau do ramo (15%)", `+${xp2 - xp1} (base ${base})`)
      : falha("o bonus da sessao nova esta errado", `+${xp2 - xp1}, esperado ~${esperado.toFixed(1)} (30% seria ${(base * 1.3).toFixed(1)})`);

    // ── 3. o retrato gravado e o do servidor, nao o do navegador ──────────
    const hab = [...(linha.habilidades || [])].sort().join(",");
    hab === "art_1,art_2,art_3" && linha.regra_bonus === 2 && linha.alvo === false
      ? ok("a sessão grava as especializações do momento; o navegador não forja", hab)
      : falha("o retrato da sessao veio errado ou forjado", JSON.stringify({ hab, regra: linha.regra_bonus, alvo: linha.alvo }));

    // ── 4. recomecar nao tira o que foi ganho ──────────────────────────────
    const r = await rpc("esquecer_habilidades");
    const xp3 = await xp();
    r.status < 300 && xp3 === xp2 ? ok("🎯 \"Recomeçar do zero\" NÃO tira o XP já ganho", `${xp2} -> ${xp3}`)
      : falha("recomecar mexeu no XP", `${xp2} -> ${xp3}`);
    const nova2 = await req("/rest/v1/sessoes_estudo", { method: "POST", headers: { ...cab, Prefer: "return=representation" },
      body: JSON.stringify({ usuario_id: uid, materia: "Física", segundos: 5400, modo: "cronograma" }) });
    const xp4 = await xp();
    const base2 = Number(nova2.corpo?.[0]?.xp);
    xp4 - xp3 === base2 ? ok("depois de recomeçar, a sessão nova vem sem bônus", `+${xp4 - xp3}`) : falha("sessao depois de recomecar com bonus", `+${xp4 - xp3}, base ${base2}`);
  } catch (e) {
    falha("o teste quebrou", e.message.slice(0, 140));
  } finally {
    if (uid) await req(`/auth/v1/admin/users/${uid}`, { method: "DELETE", headers: admin });
    console.log("\n  (conta de teste apagada)");
    console.log("\n" + "=".repeat(70));
    console.log(falhas === 0 ? "O BÔNUS VALE DA ESCOLHA EM DIANTE — E A PATENTE NÃO DESCE." : `🔴 ${falhas} FALHA(S).`);
    process.exit(falhas ? 1 : 0);
  }
})();
