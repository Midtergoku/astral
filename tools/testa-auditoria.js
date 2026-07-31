// Prova que a auditoria captura mudanca de plano e remocao de lead,
// inclusive quando feita por SQL direto -- que e como o Lucas promove beta
// tester hoje. Auditoria que so cobre o caminho do app nao serve.
const { execSync } = require("child_process");

const REF = "jjogmcacbdefwiwcyjxp";
const BASE = `https://${REF}.supabase.co`;
const chaves = JSON.parse(
  execSync(`supabase projects api-keys --project-ref ${REF} -o json`,
    { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }),
);
const SERVICE = chaves.find((k) => k.name === "service_role").api_key;
const h = { apikey: SERVICE, Authorization: `Bearer ${SERVICE}`, "Content-Type": "application/json" };

let falhas = 0;
const ok = (t) => console.log(`  OK     ${t}`);
const falha = (t) => { console.log(`  FALHA  ${t}`); falhas++; };

async function req(caminho, opts = {}) {
  const r = await fetch(`${BASE}${caminho}`, { headers: h, ...opts });
  let corpo = null;
  try { corpo = await r.json(); } catch { /* sem corpo */ }
  return { status: r.status, corpo };
}

(async () => {
  let uid = null;
  const email = `audit-${Date.now()}@astral-teste.local`;
  try {
    const c = await req("/auth/v1/admin/users", {
      method: "POST",
      body: JSON.stringify({ email, password: "SenhaDeTeste!2026", email_confirm: true }),
    });
    uid = c.corpo?.id;
    if (!uid) throw new Error("nao criou usuario");

    console.log("== 1. MUDANCA DE PLANO E REGISTRADA? ==");
    await req(`/rest/v1/perfis?id=eq.${uid}`, {
      method: "PATCH", headers: { ...h, Prefer: "return=minimal" },
      body: JSON.stringify({ tipo_plano: "beta" }),
    });
    const a1 = await req(
      `/rest/v1/auditoria?alvo_id=eq.${uid}&evento=eq.plano_alterado&select=*`);
    const reg = a1.corpo?.[0];
    reg?.detalhe?.de === "free" && reg?.detalhe?.para === "beta"
      ? ok(`registrou free -> beta (autor: ${reg.autor})`)
      : falha(`nao registrou: ${JSON.stringify(a1.corpo)}`);

    console.log("\n== 2. SEGUNDA MUDANCA GERA SEGUNDO REGISTRO? ==");
    await req(`/rest/v1/perfis?id=eq.${uid}`, {
      method: "PATCH", headers: { ...h, Prefer: "return=minimal" },
      body: JSON.stringify({ tipo_plano: "pro" }),
    });
    const a2 = await req(
      `/rest/v1/auditoria?alvo_id=eq.${uid}&evento=eq.plano_alterado&select=detalhe`);
    a2.corpo?.length === 2
      ? ok(`2 registros (${a2.corpo.map((r) => r.detalhe.de + "->" + r.detalhe.para).join(", ")})`)
      : falha(`esperava 2 registros, veio ${a2.corpo?.length}`);

    console.log("\n== 3. UPDATE QUE NAO MUDA O PLANO NAO POLUI O LOG? ==");
    await req(`/rest/v1/perfis?id=eq.${uid}`, {
      method: "PATCH", headers: { ...h, Prefer: "return=minimal" },
      body: JSON.stringify({ nome: "Nome Trocado" }),
    });
    const a3 = await req(`/rest/v1/auditoria?alvo_id=eq.${uid}&select=id`);
    a3.corpo?.length === 2
      ? ok("continua com 2 registros (trocar o nome nao gerou entrada)")
      : falha(`poluiu o log: ${a3.corpo?.length} registros`);

    console.log("\n== 4. REMOCAO DE LEAD E REGISTRADA? ==");
    const leadEmail = `lead-audit-${Date.now()}@astral-teste.local`;
    await req("/rest/v1/lista_espera", {
      method: "POST", headers: { ...h, Prefer: "return=minimal" },
      body: JSON.stringify({ nome: "Lead Teste", email: leadEmail, concurso: "CBMERJ" }),
    });
    await req(`/rest/v1/lista_espera?email=eq.${leadEmail}`, { method: "DELETE" });
    const a4 = await req(
      `/rest/v1/auditoria?evento=eq.lead_removido&alvo_email=eq.${leadEmail}&select=*`);
    a4.corpo?.length === 1
      ? ok(`registrou a remocao do lead (autor: ${a4.corpo[0].autor})`)
      : falha(`nao registrou a remocao: ${JSON.stringify(a4.corpo)}`);

    console.log("\n== 5. O USUARIO CONSEGUE LER OU APAGAR A PROPRIA AUDITORIA? ==");
    const PUB = (require("fs").readFileSync("assets/js/astral.js", "utf8")
      .match(/sb_publishable_[A-Za-z0-9_-]+/) || [])[0];
    const link = await req("/auth/v1/admin/generate_link", {
      method: "POST", body: JSON.stringify({ type: "magiclink", email }),
    });
    const sess = await req("/auth/v1/verify", {
      method: "POST", headers: { apikey: PUB, "Content-Type": "application/json" },
      body: JSON.stringify({ type: "magiclink", token_hash: link.corpo?.hashed_token }),
    });
    const comoUsuario = {
      apikey: PUB, Authorization: `Bearer ${sess.corpo?.access_token}`,
      "Content-Type": "application/json",
    };
    const leitura = await req("/rest/v1/auditoria?select=*", { headers: comoUsuario });
    Array.isArray(leitura.corpo)
      ? falha(`USUARIO LEU a auditoria! ${leitura.corpo.length} linhas`)
      : ok(`leitura negada (HTTP ${leitura.status})`);
    const apagar = await req(`/rest/v1/auditoria?alvo_id=eq.${uid}`,
      { method: "DELETE", headers: comoUsuario });
    apagar.status >= 400
      ? ok(`exclusao negada (HTTP ${apagar.status})`)
      : falha(`USUARIO APAGOU a propria auditoria! HTTP ${apagar.status}`);
  } catch (e) {
    falha("erro no teste: " + e.message);
  } finally {
    // Limpa: usuario, e as linhas de auditoria que este teste criou.
    if (uid) {
      await req(`/auth/v1/admin/users/${uid}`, { method: "DELETE" });
      await req(`/rest/v1/auditoria?alvo_id=eq.${uid}`, { method: "DELETE" });
    }
    await req(`/rest/v1/auditoria?alvo_email=like.*astral-teste.local`, { method: "DELETE" });
    console.log("\nlimpeza feita");
  }
  console.log(falhas === 0 ? "\nAUDITORIA FUNCIONANDO.\n" : `\n${falhas} FALHA(S).\n`);
  process.exit(falhas ? 1 : 0);
})();
