/* ═══════════════════════════════════════════════════════════════════════════
   TESTA-LIMITE-ERROS -- a tabela de erros ainda e uma porta aberta?
   (03/10/2026 -- auditoria SEG-01, roadmap 3.5)

   A auditoria mandou 25 erros sem login e os 25 foram gravados (ate 16 KB
   cada; o unico freio era um teto global de 500/hora). Aqui a mesma inundacao,
   e mais tres:
     1. 25 sem login, todos diferentes  -> no maximo 15 gravados (por IP, por hora)
     2. 10 iguais, com login            -> no maximo 5 gravados (o mesmo erro)
     3. mensagem enorme                 -> gravada CORTADA em 500; corpo > 16 KB -> nada
     4. o IP nao aparece em lugar nenhum (so o codigo embaralhado)
   No fim, os contadores voltam ao que eram: rodar o teste nao "bloqueia" esta
   maquina por uma hora, nem conta no teto do dia.

   USO   node tools/testa-limite-erros.js                (producao)
         ASTRAL_DEV=1 node tools/testa-limite-erros.js   (astral-dev)
   Nao gasta credito. Cria 1 conta de teste e apaga no fim, com os erros de teste.
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
const enviar = (corpo, token) => fetch(`${BASE}/functions/v1/registrar-erro`, { method: "POST",
  headers: { apikey: PUB, "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: typeof corpo === "string" ? corpo : JSON.stringify(corpo) }).then((r) => r.status);

let falhas = 0;
const ok = (t, d = "") => console.log(`  OK     ${t.padEnd(60)} ${d}`);
const falha = (t, d = "") => { console.log(`  FALHA  ${t.padEnd(60)} ${d}`); falhas++; };
const MARCA = `teste-limite-${Date.now()}`;
const quantas = async (filtro) => (await sql(`select count(*)::int n from public.erros_cliente where mensagem like '${MARCA}%' ${filtro || ""}`))[0].n;

(async () => {
  const antes = await sql("select chave, janela, n from public.erros_cliente_limite");
  let conta = null;
  try {
    console.log(`\nTESTA-LIMITE-ERROS  ${NO_DEV ? "astral-dev" : "producao"}\n`);
    const email = `limite-erros-${Date.now()}@astral-teste.local`;
    const u = await req("/auth/v1/admin/users", { method: "POST", headers: admin, body: JSON.stringify({ email, password: "T!" + crypto.randomUUID(), email_confirm: true }) });
    conta = u.corpo.id;
    const link = await req("/auth/v1/admin/generate_link", { method: "POST", headers: admin, body: JSON.stringify({ type: "magiclink", email }) });
    const token = (await req("/auth/v1/verify", { method: "POST", headers: { apikey: PUB, "Content-Type": "application/json" }, body: JSON.stringify({ type: "magiclink", token_hash: link.corpo.hashed_token }) })).corpo.access_token;

    // 1. inundacao sem login
    const st = [];
    for (let i = 0; i < 25; i++) st.push(await enviar({ mensagem: `${MARCA} anonimo ${i}`, pagina: "/teste" }));
    const anon = await quantas("and usuario_id is null");
    st.every((s) => s === 204) ? ok("a função responde 204 sempre (não vira erro na tela)", "25 × 204") : falha("resposta diferente de 204", JSON.stringify([...new Set(st)]));
    anon <= 15 && anon >= 1 ? ok("🎯 25 envios sem login: no máximo 15 gravados", `${anon} gravados`) : falha("a inundação sem login passou", `${anon} de 25`);

    // 2. o mesmo erro, com login
    for (let i = 0; i < 10; i++) await enviar({ mensagem: `${MARCA} o mesmo erro`, pagina: "/teste" }, token);
    const iguais = await quantas(`and usuario_id = '${conta}'`);
    iguais === 5 ? ok("🎯 10 vezes o mesmo erro: 5 gravados", "o resto não ensina nada") : falha("o mesmo erro repetido passou do limite", `${iguais} de 10`);

    // 3. tamanho
    await enviar({ mensagem: `${MARCA} grande ` + "x".repeat(5000), pilha: "y".repeat(9000), pagina: "/teste-grande" }, token);
    const grande = (await sql(`select length(mensagem) m, length(pilha) p from public.erros_cliente where mensagem like '${MARCA} grande%'`))[0];
    grande && grande.m <= 500 && grande.p <= 2000 ? ok("mensagem e pilha gravadas cortadas", `${grande.m} e ${grande.p} caracteres`) : falha("o corte de tamanho falhou", JSON.stringify(grande));
    await enviar(JSON.stringify({ mensagem: `${MARCA} enorme`, pilha: "z".repeat(17000) }), token);
    (await quantas("and mensagem like '%enorme%'")) === 0 ? ok("corpo acima de 16 KB não é gravado") : falha("corpo enorme gravado");

    // 4. o IP nao fica guardado
    const chaves = await sql("select chave from public.erros_cliente_limite where janela >= date_trunc('day', now())");
    const comIp = chaves.filter((c) => /\d+\.\d+\.\d+\.\d+|:[0-9a-f]{0,4}:/i.test(c.chave));
    comIp.length === 0 ? ok("🎯 nenhum IP guardado (só o código embaralhado)", `${chaves.length} contadores`) : falha("🚨 IP guardado na contagem", comIp[0].chave);
    const linhaIp = await sql(`select count(*)::int n from public.erros_cliente where mensagem like '${MARCA}%' and (coalesce(origem,'') ~ '\\d+\\.\\d+\\.\\d+\\.\\d+')`);
    linhaIp[0].n === 0 ? ok("o erro gravado também não leva IP") : falha("IP no erro gravado");

    // 5. sem permissao pela API publica
    const pub = await req("/rest/v1/erros_cliente_limite?select=chave", { headers: { apikey: PUB, Authorization: `Bearer ${token}` } });
    pub.status >= 400 || (Array.isArray(pub.corpo) && pub.corpo.length === 0) ? ok("aluno não lê os contadores", `HTTP ${pub.status}`) : falha("🚨 aluno lê os contadores", `HTTP ${pub.status}`);
    const rpc = await req("/rest/v1/rpc/contar_erro_cliente", { method: "POST", headers: { apikey: PUB, Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify({ p_limites: [] }) });
    rpc.status >= 400 ? ok("aluno não chama a contagem direto", `HTTP ${rpc.status}`) : falha("🚨 aluno chama contar_erro_cliente", `HTTP ${rpc.status}`);
  } catch (e) {
    falha("o teste quebrou", e.message.slice(0, 120));
  } finally {
    // os contadores voltam ao que eram, e os erros de teste saem
    await sql(`delete from public.erros_cliente where mensagem like '${MARCA}%'`);
    await sql("delete from public.erros_cliente_limite where janela >= now() - interval '2 days'");
    if (antes.length) {
      const valores = antes.map((l) => `('${String(l.chave).replace(/'/g, "''")}', '${l.janela}', ${Number(l.n)})`).join(",");
      await sql(`insert into public.erros_cliente_limite (chave, janela, n) values ${valores} on conflict (chave, janela) do update set n = excluded.n`);
    }
    if (conta) await req(`/auth/v1/admin/users/${conta}`, { method: "DELETE", headers: admin });
    console.log("\n  (contadores devolvidos ao que eram; conta e erros de teste apagados)");
    console.log("\n" + "=".repeat(70));
    console.log(falhas === 0 ? "A TABELA DE ERROS TEM PORTA, NÃO É MAIS UMA ESCANCARADA." : `🔴 ${falhas} FALHA(S).`);
    process.exit(falhas ? 1 : 0);
  }
})();
