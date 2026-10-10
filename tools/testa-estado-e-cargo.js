/* ═══════════════════════════════════════════════════════════════════════════
   TESTA-ESTADO-E-CARGO -- o Banco respeita o estado do concurso?
   (10/10/2026 -- pedido dele de 03/10, roadmap 3.25)

   Ele: "e desnecessario uma pessoa do Rio de Janeiro (...) cair uma materia que
   so cai na prova de oficial do Acre".

     1. O ESTADO PELO NOME: CBMERJ -> RJ, PMESP -> SP, "Bombeiro Militar do
        Espirito Santo" -> ES, EEAR/EsPCEx/PRF -> nacional (null)
     2. O ACERVO MARCADO: as provas do CBMES sao ES/soldado; EEAR e ESA, sargento
     3. O SORTEIO: o aluno do RJ NUNCA recebe Historia/Geografia do Espirito
        Santo (nem pedindo a prova do CBMES); continua recebendo a Geografia
        nacional (ESA); o aluno do ES recebe as do ES, e elas vem primeiro

   USO   ASTRAL_DEV=1 node tools/testa-estado-e-cargo.js   (o roda-testes ja liga)
   ═══════════════════════════════════════════════════════════════════════════ */
const { execFileSync } = require("child_process");
const crypto = require("crypto");
const path = require("path");
const { REF, PUB, NO_DEV, chavesDoProjeto, onde } = require("./testes/alvo");   // 10/10/2026 (COD-02)
const BASE = `https://${REF}.supabase.co`;
const SK = chavesDoProjeto().find((k) => k.name === "service_role").api_key;
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
const conferir = (t, c, d = "") => (c ? ok(t, d) : falha(t, d));

async function aluno(edital) {
  const email = `estado-${Date.now()}-${Math.random().toString(36).slice(2, 6)}@astral-teste.local`;
  const u = await req("/auth/v1/admin/users", { method: "POST", headers: admin, body: JSON.stringify({ email, password: "T!" + crypto.randomUUID() + "a1", email_confirm: true }) });
  const link = await req("/auth/v1/admin/generate_link", { method: "POST", headers: admin, body: JSON.stringify({ type: "magiclink", email }) });
  const s = (await req("/auth/v1/verify", { method: "POST", headers: { apikey: PUB, "Content-Type": "application/json" }, body: JSON.stringify({ type: "magiclink", token_hash: link.corpo.hashed_token }) })).corpo;
  const cab = { apikey: PUB, Authorization: `Bearer ${s.access_token}`, "Content-Type": "application/json" };
  await req("/rest/v1/rpc/salvar_progresso", { method: "POST", headers: cab, body: JSON.stringify({ p_xp: 0, p_streak: 0, p_horas: 0,
    p_edital: { nome: edital }, p_materias: [{ nome: "Geografia", peso: 50, progresso: 0 }, { nome: "Português", peso: 50, progresso: 0 }], p_cronograma_hoje: [], p_badges: [], p_tag_escolhida: null }) });
  // Pro: o gratis so ve prova de 4 anos ou mais e 10 por dia -- aqui o que se testa e o estado
  await req(`/rest/v1/perfis?id=eq.${u.corpo.id}`, { method: "PATCH", headers: { ...admin, Prefer: "return=minimal" }, body: JSON.stringify({ tipo_plano: "pro" }) });
  return { id: u.corpo.id, cab };
}
const sortear = async (a, filtro) => (await req("/rest/v1/rpc/sortear_questoes", { method: "POST", headers: a.cab, body: JSON.stringify({ p_limite: 50, ...filtro }) })).corpo?.questoes || [];

(async () => {
  console.log(`\nTESTA-ESTADO-E-CARGO  ${onde}\n`);
  if (!NO_DEV) { console.log("  (só no dev: cria alunos de teste e sorteia questões)"); return; }
  const contas = [];
  try {
    console.log("== 1. O ESTADO PELO NOME ==");
    const casos = { "CBMERJ 2026 Soldado": "RJ", "PMESP Soldado 2a Classe": "SP", "Concurso Bombeiro Militar do Espírito Santo": "ES",
      "Polícia Militar de Minas Gerais": "MG", "PMDF": "DF", "Corpo de Bombeiros de Mato Grosso do Sul": "MS", "Polícia Militar do Paraná": "PR",
      "Polícia Militar do Pará": "PA", "EEAR CFS 2/2026": null, "EsPCEx 2026": null, "PRF Policial Rodoviário Federal": null };
    const r = await sql(`select x nome, public.estado_do_concurso(x) uf from unnest(array[${Object.keys(casos).map((k) => `'${k.replace(/'/g, "''")}'`).join(",")}]) x`);
    const erradas = r.filter((x) => (x.uf ?? null) !== casos[x.nome]).map((x) => `${x.nome} → ${x.uf}`);
    conferir("🎯 o estado sai do nome do concurso", erradas.length === 0, erradas.length ? erradas.join(" · ") : `${r.length} nomes certos`);

    console.log("\n== 2. O ACERVO MARCADO ==");
    const m = await sql("select banca, estado, cargo, count(*)::int n from public.questoes where publicada group by 1,2,3 order by 4 desc");
    const cbmes = m.filter((x) => x.banca === "CBMES");
    conferir("as provas do CBMES são do Espírito Santo, de soldado", cbmes.length > 0 && cbmes.every((x) => x.estado === "ES" && x.cargo === "soldado"), cbmes.map((x) => `${x.estado}/${x.cargo} ${x.n}`).join(" "));
    conferir("EEAR e ESA são nacionais, de sargento", m.filter((x) => ["EEAR", "ESA"].includes(x.banca)).every((x) => x.estado === null && x.cargo === "sargento"));

    console.log("\n== 3. O SORTEIO ==");
    const rj = await aluno("CBMERJ 2026 Soldado"); contas.push(rj.id);
    const es = await aluno("CBMES CFSd Soldado 2026"); contas.push(es.id);
    const geoRJ = await sortear(rj, { p_materia: "Geografia" });
    conferir("🎯 o aluno do RJ não recebe Geografia do Espírito Santo", geoRJ.length > 0 && !geoRJ.some((q) => q.banca === "CBMES"),
      `${geoRJ.length} questões: ${[...new Set(geoRJ.map((q) => q.banca))].join(", ")}`);
    const pedindo = await sortear(rj, { p_materia: "Geografia", p_banca: "CBMES" });
    conferir("🎯 nem pedindo a prova do CBMES", pedindo.length === 0, `${pedindo.length} questões`);
    const portRJ = await sortear(rj, { p_banca: "CBMES", p_materia: "Português" });
    conferir("Português do CBMES serve a todos (não é regional)", portRJ.length > 0, `${portRJ.length} questões`);
    // a preferencia vale na ESCOLHA (o servidor entrega em ordem de numero): pedindo poucas, vem as do ES
    const doES = (await sql("select count(*)::int n from public.questoes where publicada and estado = 'ES' and materia = 'Geografia'"))[0].n;
    const geoES = await sortear(es, { p_materia: "Geografia", p_limite: Math.min(5, doES) });
    conferir("🎯 o aluno do ES recebe as do ES primeiro (pedindo poucas, só vêm elas)", doES > 0 && geoES.length > 0 && geoES.every((q) => q.banca === "CBMES"),
      `${geoES.filter((q) => q.banca === "CBMES").length} do ES de ${geoES.length} (o ES tem ${doES})`);

    console.log("\n== 4. A PROVA NOVA JÁ ENTRA MARCADA ==");
    // o mesmo caminho do importar.html: publicar_questoes, como administrador (de teste, so no dev)
    const adm = await aluno("EEAR CFS 2026"); contas.push(adm.id);
    await sql(`insert into public.administradores (usuario_id) values ('${adm.id}') on conflict do nothing`);
    const BANCA = `CBMERJ-T${Date.now() % 100000}`;
    try {
      const pub = await req("/rest/v1/rpc/publicar_questoes", { method: "POST", headers: adm.cab, body: JSON.stringify({ p_questoes: [{
        banca: BANCA, prova: "CFSd Soldado 2026", ano: 2026, numero: 1, materia: "Português", enunciado: "Questão de teste do 3.25.",
        alternativas: { a: "um", b: "dois", c: "três", d: "quatro" }, gabarito: "a", publicada: false }] }) });
      const gravada = (await sql(`select estado, cargo from public.questoes where banca = '${BANCA}'`))[0];
      conferir("🎯 prova estadual importada já sai com estado e cargo", pub.status === 200 && gravada?.estado === "RJ" && gravada?.cargo === "soldado",
        `HTTP ${pub.status} · ${gravada ? gravada.estado + "/" + gravada.cargo : "não gravou"}`);
    } finally {
      await sql(`delete from public.questoes where banca = '${BANCA}'`).catch(() => {});
      await sql(`delete from public.administradores where usuario_id = '${adm.id}'`).catch(() => {});
    }
  } catch (e) {
    falha("o teste quebrou", e.message.slice(0, 140));
  } finally {
    for (const id of contas) await req(`/auth/v1/admin/users/${id}`, { method: "DELETE", headers: admin });
    console.log("\n" + "=".repeat(70));
    console.log(falhas === 0 ? "CADA ESTADO É UM CONCURSO: O BANCO NÃO MISTURA OS REGIONAIS." : `🔴 ${falhas} FALHA(S).`);
    process.exitCode = falhas ? 1 : 0;
  }
})();
