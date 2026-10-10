// TESTA-EMAIL-CHEGA -- o e-mail do Astral CHEGA num endereco de fora? (10/10/2026, roadmap 4.1)
//
// A regra do smtp-configura.ps1: so ligar a confirmacao de cadastro (-ExigirConfirmacao) DEPOIS de provar que um
// e-mail chega num endereco de FORA (o do dono ja recebia pelo SMTP padrao). Provar sem pedir nada a ele:
//   1. abre uma caixa descartavel no mail.tm (servico publico, com API)
//   2. a PRODUCAO manda um convite para ela (admin/invite -- usa o mesmo SMTP do cadastro e do "esqueci a senha",
//      sem captcha, porque e pela chave de servico)
//   3. le a caixa pela API, ate 3 minutos
//   4. apaga a conta de teste do Astral e a caixa descartavel
// Gasta 1 do limite de e-mails por hora. Nao gasta dinheiro.
//   node tools/testa-email-chega.js            (producao -- e onde o SMTP importa)
const crypto = require("crypto");
const { REF, chavesDoProjeto } = require("./testes/alvo");
const BASE = `https://${REF}.supabase.co`;
const SK = chavesDoProjeto().find((k) => k.name === "service_role").api_key;
const admin = { apikey: SK, Authorization: `Bearer ${SK}`, "Content-Type": "application/json" };
const MAILTM = "https://api.mail.tm";
async function j(url, o = {}) { const r = await fetch(url, o); const t = await r.text(); let c = null; try { c = JSON.parse(t); } catch { c = t; } return { status: r.status, corpo: c }; }
const espera = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  console.log(`\nTESTA-EMAIL-CHEGA  ${REF === "jjogmcacbdefwiwcyjxp" ? "producao" : "astral-dev"}\n`);
  let uid = null, caixa = null, tokenCaixa = null, ok = false;
  try {
    const dom = (await j(`${MAILTM}/domains`)).corpo?.["hydra:member"]?.[0]?.domain;
    if (!dom) throw new Error("mail.tm sem dominio disponivel");
    const endereco = `astral-teste-${Date.now()}@${dom}`;
    const senha = "T!" + crypto.randomUUID();
    caixa = (await j(`${MAILTM}/accounts`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ address: endereco, password: senha }) })).corpo;
    tokenCaixa = (await j(`${MAILTM}/token`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ address: endereco, password: senha }) })).corpo?.token;
    if (!tokenCaixa) throw new Error("nao abri a caixa descartavel");
    console.log(`  caixa de fora: ${endereco.replace(/^[^@]+/, "astral-teste-…")}`);

    const conv = await j(`${BASE}/auth/v1/invite`, { method: "POST", headers: admin, body: JSON.stringify({ email: endereco }) });
    uid = conv.corpo?.id || null;
    if (conv.status >= 300) throw new Error(`o Astral nao mandou o convite: HTTP ${conv.status} ${JSON.stringify(conv.corpo).slice(0, 160)}`);
    console.log("  o Astral mandou o convite; esperando chegar…");

    const inicio = Date.now();
    while (Date.now() - inicio < 180000) {
      const m = (await j(`${MAILTM}/messages`, { headers: { Authorization: `Bearer ${tokenCaixa}` } })).corpo?.["hydra:member"] || [];
      if (m.length) {
        const msg = m[0];
        const seg = Math.round((Date.now() - inicio) / 1000);
        console.log(`  OK     🎯 CHEGOU em ${seg} s — de: ${msg.from?.name || ""} <${msg.from?.address}> · assunto: "${msg.subject}"`);
        ok = true;
        break;
      }
      await espera(5000);
    }
    if (!ok) console.log("  FALHA  nao chegou em 3 minutos");
  } catch (e) {
    console.log("  FALHA ", e.message);
  } finally {
    if (uid) await j(`${BASE}/auth/v1/admin/users/${uid}`, { method: "DELETE", headers: admin });
    if (caixa?.id && tokenCaixa) await j(`${MAILTM}/accounts/${caixa.id}`, { method: "DELETE", headers: { Authorization: `Bearer ${tokenCaixa}` } });
    console.log("  (conta de teste e caixa descartavel apagadas)");
    console.log("\n" + "=".repeat(70));
    console.log(ok ? "O E-MAIL DO ASTRAL CHEGA NUM ENDERECO DE FORA." : "🔴 O E-MAIL NAO CHEGOU -- NAO ligar a confirmacao de cadastro.");
    process.exitCode = ok ? 0 : 1;
  }
})();
