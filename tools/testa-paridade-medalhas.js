/* ═══════════════════════════════════════════════════════════════════════════
   TESTA-PARIDADE-MEDALHAS -- o servidor e a tela dao o MESMO progresso em cada
   condecoracao e divisa? (10/10/2026 -- auditoria COD-01, roadmap 3.21)

   Desde 10/10 a tela MOSTRA o progresso que o servidor calcula
   (fatos_do_usuario -> progresso / progressoDivisas, pela avaliar_condicao que
   concede). A copia da regra no navegador (progressoDe, condecoracoes.js) so
   roda sem o servidor -- no testa-motor. Este teste e o que impede as duas de
   divergirem caladas: para cada conta de auditoria do dev (as f3-*, com
   historicos de madrugada, folga, retorno...), compara as duas contas item por
   item. Diferenca = alguem consertou um lado e esqueceu o outro.

   USO   ASTRAL_DEV=1 node tools/testa-paridade-medalhas.js   (o roda-testes ja liga)
         precisa das contas f3-* (node tools/dev-semear.js)
   ═══════════════════════════════════════════════════════════════════════════ */
const path = require("path");
const { pathToFileURL } = require("url");
const { REF, PUB, NO_DEV, chavesDoProjeto, onde } = require("./testes/alvo");   // 10/10/2026 (COD-02)
const BASE = `https://${REF}.supabase.co`;

let falhas = 0;
const ok = (t, d = "") => console.log(`  OK     ${t.padEnd(58)} ${d}`);
const falha = (t, d = "") => { console.log(`  FALHA  ${t.padEnd(58)} ${d}`); falhas++; };
async function req(c, o = {}) { const r = await fetch(BASE + c, o); const t = await r.text(); let corpo = null; try { corpo = JSON.parse(t); } catch { corpo = t; } return { status: r.status, corpo }; }

(async () => {
  console.log(`\nTESTA-PARIDADE-MEDALHAS  ${onde}\n`);
  if (!NO_DEV) { console.log("  (só no dev: usa as contas de auditoria f3-*)"); return; }
  const SK = chavesDoProjeto().find((k) => k.name === "service_role").api_key;
  const admin = { apikey: SK, Authorization: `Bearer ${SK}`, "Content-Type": "application/json" };
  const motor = await import(pathToFileURL(path.join(__dirname, "..", "assets", "js", "condecoracoes.js")).href);
  try {
    const contas = ((await req("/auth/v1/admin/users?per_page=1000", { headers: admin })).corpo.users || []).filter((u) => /^f3-/.test(u.email || ""));
    if (!contas.length) return falha("sem contas f3-* no dev", "rode node tools/dev-semear.js");
    let comparados = 0, comProgresso = 0;
    for (const u of contas) {
      const link = await req("/auth/v1/admin/generate_link", { method: "POST", headers: admin, body: JSON.stringify({ type: "magiclink", email: u.email }) });
      const s = (await req("/auth/v1/verify", { method: "POST", headers: { apikey: PUB, "Content-Type": "application/json" }, body: JSON.stringify({ type: "magiclink", token_hash: link.corpo.hashed_token }) })).corpo;
      const fatos = (await req("/rest/v1/rpc/fatos_do_usuario", { method: "POST", headers: { apikey: PUB, Authorization: `Bearer ${s.access_token}`, "Content-Type": "application/json" }, body: "{}" })).corpo;
      const nome = u.email.replace(/^f3-/, "").replace(/-\d+@.*$/, "");
      if (!fatos?.progresso || !fatos?.progressoDivisas) { falha(`${nome}: o servidor não mandou o progresso`); continue; }
      // a conta da TELA, sem os numeros do servidor e sem as gravadas: a regra crua
      const { progresso, progressoDivisas, ...cru } = fatos;
      const tela = motor.conferir(cru, null);
      const difs = [];
      for (const c of tela.condecoracoes) {
        if (!(c.id in progresso)) continue;
        comparados++;
        if (Number(progresso[c.id]) > 0) comProgresso++;
        if (Math.abs(Number(progresso[c.id]) - c.progresso) > 0.001) difs.push(`${c.id} servidor ${progresso[c.id]} x tela ${c.progresso.toFixed(4)}`);
      }
      for (const d of tela.divisas) {
        if (!(d.id in progressoDivisas)) continue;
        comparados++;
        if (Math.abs(Number(progressoDivisas[d.id]) - d.progresso) > 0.001) difs.push(`divisa ${d.id} servidor ${progressoDivisas[d.id]} x tela ${d.progresso.toFixed(4)}`);
      }
      difs.length ? falha(`🎯 ${nome}: servidor e tela discordam`, difs.slice(0, 3).join(" · ")) : ok(`${nome}: servidor e tela dão o mesmo número`, `${Object.keys(progresso).length + Object.keys(progressoDivisas).length} itens`);
    }
    // um teste de paridade com tudo em zero nao provaria nada
    comProgresso > 20 ? ok("🎯 a comparação pegou progresso de verdade (não só zeros)", `${comProgresso} condecorações com progresso > 0`)
      : falha("quase tudo zerado: a comparação não prova nada", `${comProgresso} com progresso > 0`);
    console.log(`  (${comparados} comparações em ${contas.length} contas)`);
  } catch (e) {
    falha("o teste quebrou", e.message.slice(0, 140));
  } finally {
    console.log("\n" + "=".repeat(70));
    console.log(falhas === 0 ? "SERVIDOR E TELA DÃO O MESMO PROGRESSO EM CADA MEDALHA." : `🔴 ${falhas} FALHA(S).`);
    process.exitCode = falhas ? 1 : 0;
  }
})();
