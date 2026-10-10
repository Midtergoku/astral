/* LIGA DUAS ETAPAS -- o codigo do aplicativo autenticador (TOTP) na autenticacao do Supabase (10/10/2026, roadmap 4.4).

   USO   node tools/liga-duas-etapas.js [--dev]             so LE e mostra como esta
         node tools/liga-duas-etapas.js [--dev] --aplicar   liga ativar + conferir o codigo

   Gratis no Supabase (TOTP; o SMS e o telefone e que sao pagos). Ligar NAO obriga ninguem: so deixa quem
   quiser ativar em Minha conta (assets/js/duas-etapas.js). Banco restaurado em projeto novo: rodar com --aplicar. */
const { execFileSync } = require("child_process");
const path = require("path");
const REF = process.argv.includes("--dev") ? "vtluuezwfpqgryixaaea" : "jjogmcacbdefwiwcyjxp";
const APLICAR = process.argv.includes("--aplicar");
const TOKEN = execFileSync("powershell", ["-NoProfile", "-File", path.join(__dirname, "token-supabase.ps1")],
  { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
const URL = `https://api.supabase.com/v1/projects/${REF}/config/auth`;
const CAMPOS = ["mfa_totp_enroll_enabled", "mfa_totp_verify_enabled", "mfa_max_enrolled_factors", "mfa_phone_enroll_enabled", "mfa_phone_verify_enabled"];

async function ler() {
  const r = await fetch(URL, { headers: { Authorization: `Bearer ${TOKEN}` } });
  if (!r.ok) throw new Error(`HTTP ${r.status} ${(await r.text()).slice(0, 200)}`);
  const c = await r.json();
  return Object.fromEntries(CAMPOS.map((k) => [k, c[k]]));
}

(async () => {
  console.log(`projeto ${REF}${REF === "jjogmcacbdefwiwcyjxp" ? " (PRODUCAO)" : " (dev)"}`);
  const antes = await ler();
  console.table(antes);
  if (!APLICAR) return;
  if (antes.mfa_totp_enroll_enabled && antes.mfa_totp_verify_enabled) { console.log("ja ligado -- nada a fazer"); return; }
  const r = await fetch(URL, {
    method: "PATCH", headers: { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify({ mfa_totp_enroll_enabled: true, mfa_totp_verify_enabled: true }),
  });
  if (!r.ok) { console.log("HTTP", r.status, (await r.text()).slice(0, 300)); process.exit(1); }
  const depois = await ler();
  console.table(depois);
  if (!depois.mfa_totp_enroll_enabled || !depois.mfa_totp_verify_enabled) { console.log("FALHOU: nao ligou"); process.exit(1); }
  console.log("ligado");
})().catch((e) => { console.log("erro:", e.message); process.exit(1); });
