/* ═══════════════════════════════════════════════════════════════════════════
   TESTA-REVISAR-LINKS -- os links do guia sao conferidos de novo, toda semana?
   (10/10/2026 -- auditoria CE-08, roadmap 3.24; decisao P8 dele: "sim")

     1. FECHADO: a funcao revisar-links recusa quem nao tem o segredo
     2. LIGADO: o despertador semanal existe e esta ativo
     3. (so no dev) FUNCIONA: um guia com um canal REAL, um video que nao existe
        e um site que nao existe passa pelo mesmo caminho do despertador
        (chamar_revisao_links -> funcao): o canal fica, os dois mortos saem, e o
        guia ganha revisado_em. Usa a rede de verdade (YouTube) -- sem chave.

   USO   node tools/testa-revisar-links.js              producao (1 e 2)
         ASTRAL_DEV=1 node tools/testa-revisar-links.js astral-dev (1, 2 e 3)
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
const espera = (ms) => new Promise((r) => setTimeout(r, ms));

let falhas = 0;
const ok = (t, d = "") => console.log(`  OK     ${t.padEnd(58)} ${d}`);
const falha = (t, d = "") => { console.log(`  FALHA  ${t.padEnd(58)} ${d}`); falhas++; };
const conferir = (t, c, d = "") => (c ? ok(t, d) : falha(t, d));

(async () => {
  console.log(`\nTESTA-REVISAR-LINKS  ${onde}\n`);
  let uid = null;
  try {
    console.log("== 1. FECHADO ==");
    const r = await req("/functions/v1/revisar-links", { method: "POST", headers: { "Content-Type": "application/json", "x-astral-vigia": "chute" }, body: "{}" });
    conferir("🎯 a função recusa quem não tem o segredo", r.status === 401, `HTTP ${r.status}`);

    console.log("\n== 2. LIGADO ==");
    const cron = await sql("select schedule, active from cron.job where jobname = 'astral-revisar-links'");
    conferir("🎯 o despertador semanal existe e está ativo", cron.length === 1 && cron[0].active, cron[0] ? cron[0].schedule : "não existe");
    if (!NO_DEV) { console.log("\n  (parte 3 só no dev: planta um guia e chama a função de verdade)"); return; }

    console.log("\n== 3. FUNCIONA (dev, rede de verdade) ==");
    const email = `revisar-${Date.now()}@astral-teste.local`;
    uid = (await req("/auth/v1/admin/users", { method: "POST", headers: admin, body: JSON.stringify({ email, password: "T!" + crypto.randomUUID() + "a1", email_confirm: true }) })).corpo.id;
    const REAL = "https://www.youtube.com/@YouTube";
    const VIDEO_MORTO = "https://www.youtube.com/watch?v=zZ9zZ9zZ9zZ";
    const SITE_MORTO = "https://astral-nao-existe-este-dominio.invalid/aula";
    const dados = { dica: "teste", professores: [{ nome: "Canal real", url: REAL }, { nome: "Vídeo que não existe", url: VIDEO_MORTO }],
      materiais_gratuitos: [{ titulo: "Site que não existe", url: SITE_MORTO }], cursos_pagos: [] };
    const ins = await req("/rest/v1/recursos_salvos", { method: "POST", headers: { ...admin, Prefer: "return=representation" },
      body: JSON.stringify({ usuario_id: uid, materia: "Português", concurso: "Teste revisar links", dados }) });
    const id = ins.corpo?.[0]?.id;
    if (!id) throw new Error("nao plantei o guia: " + JSON.stringify(ins.corpo).slice(0, 120));
    // os outros guias do dev ja contam como revisados agora: o nosso e o primeiro da fila (so no DEV)
    await sql(`update public.recursos_salvos set revisado_em = now() where id <> ${Number(id)}`);
    await sql("update public.guias_por_edital set revisado_em = now()");
    const [{ id: pedido }] = await sql("select public.chamar_revisao_links() as id");
    let resp = null;
    for (let k = 0; k < 60 && !resp; k++) { await espera(2000); const x = await sql(`select status_code, content::text c from net._http_response where id = ${Number(pedido)}`); if (x.length && x[0].status_code) resp = x[0]; }
    conferir("o despertador chamou a função", resp?.status_code === 200, resp ? `HTTP ${resp.status_code} ${String(resp.c).slice(0, 90)}` : "sem resposta em 120 s");
    const depois = (await req(`/rest/v1/recursos_salvos?id=eq.${id}&select=dados,revisado_em`, { headers: admin })).corpo?.[0];
    const urls = [...(depois?.dados?.professores || []), ...(depois?.dados?.materiais_gratuitos || [])].map((x) => x.url);
    conferir("🎯 o canal real fica", urls.includes(REAL), urls.join(" · "));
    conferir("🎯 o vídeo que não existe sai", !urls.includes(VIDEO_MORTO));
    conferir("🎯 o site que não existe sai", !urls.includes(SITE_MORTO));
    conferir("o guia ganha a data da revisão", !!depois?.revisado_em, depois?.revisado_em || "");
  } catch (e) {
    falha("o teste quebrou", e.message.slice(0, 140));
  } finally {
    if (uid) await req(`/auth/v1/admin/users/${uid}`, { method: "DELETE", headers: admin });
    console.log("\n" + "=".repeat(70));
    console.log(falhas === 0 ? "OS LINKS DO GUIA SÃO CONFERIDOS DE NOVO TODA SEMANA." : `🔴 ${falhas} FALHA(S).`);
    process.exitCode = falhas ? 1 : 0;
  }
})();
