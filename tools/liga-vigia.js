/* ═══════════════════════════════════════════════════════════════════════════
   LIGA-VIGIA -- liga o alerta da operacao por e-mail num projeto
   (09/10/2026 -- auditoria OPS-03, roadmap 3.15)

   O despertador (pg_cron 'astral-vigia', migration 20261009140000) chama a
   funcao `vigia` de hora em hora com um SEGREDO no cabecalho. O repositorio e
   publico, entao o segredo e o endereco moram no COFRE do banco (vault), nao
   na migration. Este script:
     1. sorteia um segredo novo (32 bytes) -- NUNCA impresso
     2. grava em Supabase Secrets (VIGIA_SEGREDO), por arquivo temporario
        apagado logo em seguida (o segredo nunca vai na linha de comando)
     3. grava no cofre: astral_vigia_url e astral_vigia_segredo (cria ou troca)
     4. chama o vigia uma vez pelo MESMO caminho do despertador
        (chamar_vigia) e mostra a resposta
   Rodar de novo troca o segredo dos dois lados juntos -- nada fica fora de par.

   USO   node tools/liga-vigia.js --projeto <ref>           liga (ou troca o segredo)
         node tools/liga-vigia.js --projeto <ref> --teste   so chama, com e-mail de TESTE
         node tools/liga-vigia.js --projeto <ref> --chamar  so chama (manda e-mail se houver alerta)
   ═══════════════════════════════════════════════════════════════════════════ */
const { execFileSync, execSync } = require("child_process");
const crypto = require("crypto");
const fs = require("fs");
const os = require("os");
const path = require("path");

const i = process.argv.indexOf("--projeto");
const REF = i > 0 ? process.argv[i + 1] : null;
const SO_TESTE = process.argv.includes("--teste");
const SO_CHAMAR = process.argv.includes("--chamar");
if (!REF || !/^[a-z]{20}$/.test(REF)) { console.log("Uso: node tools/liga-vigia.js --projeto <ref de 20 letras> [--teste | --chamar]"); process.exit(1); }
const TOKEN = execFileSync("powershell", ["-NoProfile", "-File", path.join(__dirname, "token-supabase.ps1")], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
async function sql(query) {
  const r = await fetch(`https://api.supabase.com/v1/projects/${REF}/database/query`, {
    method: "POST", headers: { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json" }, body: JSON.stringify({ query }) });
  const t = await r.text();
  if (!r.ok) throw new Error(t.replace(/\s+/g, " ").slice(0, 200));
  return JSON.parse(t);
}
const espera = (ms) => new Promise((r) => setTimeout(r, ms));

async function gravarNoCofre(nome, valor) {
  // valor so tem [0-9a-f:/._-]: hex do segredo ou o endereco da funcao. Conferido antes de ir para o SQL.
  if (!/^[0-9A-Za-z:/._-]+$/.test(valor)) throw new Error("valor fora do formato esperado para o cofre");
  const ja = await sql(`select id from vault.secrets where name = '${nome}'`);
  if (ja.length) await sql(`select vault.update_secret('${ja[0].id}', '${valor}')`);
  else await sql(`select vault.create_secret('${valor}', '${nome}')`);
}

async function chamar(teste) {
  const [{ id }] = await sql(`select public.chamar_vigia(${teste ? "true" : "false"}) as id`);
  if (id === null) { console.log("  O cofre está vazio neste projeto: o vigia está DESLIGADO (rode sem --teste para ligar)."); return false; }
  for (let k = 0; k < 20; k++) {
    await espera(1500);
    const r = await sql(`select status_code, left(content::text, 300) as corpo, error_msg from net._http_response where id = ${Number(id)}`);
    if (r.length) {
      const x = r[0];
      console.log(`  resposta do vigia: HTTP ${x.status_code ?? "-"} ${x.corpo || x.error_msg || ""}`);
      return x.status_code === 200;
    }
  }
  console.log("  sem resposta em 30 s (o pg_net guarda a resposta por algumas horas; ver net._http_response)");
  return false;
}

(async () => {
  if (SO_TESTE || SO_CHAMAR) { process.exit((await chamar(SO_TESTE)) ? 0 : 1); }
  const segredo = crypto.randomBytes(32).toString("hex");
  const arq = path.join(os.tmpdir(), `astral-vigia-${process.pid}.env`);
  try {
    fs.writeFileSync(arq, `VIGIA_SEGREDO=${segredo}\n`, { mode: 0o600 });
    // Pelo shell: no Windows o `supabase` e um .cmd/.exe que o execFile nao acha.
    execSync(`supabase secrets set --env-file "${arq}" --project-ref ${REF}`, { stdio: ["ignore", "ignore", "pipe"] });
  } finally {
    try { fs.unlinkSync(arq); } catch { /* ja apagado */ }
  }
  await gravarNoCofre("astral_vigia_url", `https://${REF}.supabase.co/functions/v1/vigia`);
  await gravarNoCofre("astral_vigia_segredo", segredo);
  console.log(`Vigia ligado em ${REF}: segredo novo nos Secrets e no cofre (não mostrado).`);
  // os Secrets levam alguns segundos para chegar na funcao
  await espera(8000);
  process.exit((await chamar(false)) ? 0 : 1);
})().catch((e) => { console.log("FALHOU:", e.message); process.exit(1); });
