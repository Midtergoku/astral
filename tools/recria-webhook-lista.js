/* ═══════════════════════════════════════════════════════════════════════════
   RECRIA-WEBHOOK-LISTA -- o gatilho "lead novo -> e-mail para o dono", numa
   restauracao do banco

   POR QUE EXISTE (02/10/2026)
   Achado OPS-01 da auditoria. O gatilho `notificar-novo-cadastro` em
   `lista_espera` chama a funcao `notificar-cadastro` com um SEGREDO no
   cabecalho (`x-astral-webhook-secret`). O repositorio e publico, entao esse
   gatilho nao pode morar numa migration. Num banco restaurado do zero
   (tools/testa-migrations-do-zero.js), ele e a UNICA peca que falta.

   O QUE FAZ
     1. recusa se o gatilho ja existe (nao troca o segredo de quem funciona)
     2. sorteia um segredo novo (32 bytes) -- NUNCA impresso
     3. grava o segredo em Supabase Secrets (WEBHOOK_SECRET), por arquivo
        temporario apagado logo em seguida
     4. cria o gatilho com o mesmo segredo

   USO   node tools/recria-webhook-lista.js --projeto <ref>
         (exige --projeto explicito: e uma acao de restauracao, nao de rotina)
   ═══════════════════════════════════════════════════════════════════════════ */

const { execFileSync, execSync } = require("child_process");
const crypto = require("crypto");
const fs = require("fs");
const os = require("os");
const path = require("path");

const i = process.argv.indexOf("--projeto");
const REF = i > 0 ? process.argv[i + 1] : null;
if (!REF || !/^[a-z]{20}$/.test(REF)) { console.log("Uso: node tools/recria-webhook-lista.js --projeto <ref de 20 letras>"); process.exit(1); }

const TOKEN = execFileSync("powershell", ["-NoProfile", "-File", path.join(__dirname, "token-supabase.ps1")], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
async function sql(query) {
  const r = await fetch(`https://api.supabase.com/v1/projects/${REF}/database/query`, {
    method: "POST", headers: { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json" }, body: JSON.stringify({ query }) });
  const t = await r.text();
  if (!r.ok) throw new Error(t.replace(/\s+/g, " ").slice(0, 200));
  return JSON.parse(t);
}

(async () => {
  const existe = await sql(`select count(*)::int n from pg_trigger
    where tgname = 'notificar-novo-cadastro' and tgrelid = 'public.lista_espera'::regclass`);
  if (existe[0].n > 0) { console.log("O gatilho ja existe neste projeto. Nada a fazer (o segredo atual continua valendo)."); return; }

  const segredo = crypto.randomBytes(32).toString("hex");
  const arq = path.join(os.tmpdir(), `astral-webhook-${process.pid}.env`);
  try {
    fs.writeFileSync(arq, `WEBHOOK_SECRET=${segredo}\n`, { mode: 0o600 });
    // Pelo shell: no Windows o `supabase` e um .cmd/.exe que o execFile nao acha.
    // O segredo vai pelo ARQUIVO, nunca na linha de comando.
    execSync(`supabase secrets set --env-file "${arq}" --project-ref ${REF}`, { stdio: ["ignore", "ignore", "pipe"] });
  } finally {
    try { fs.unlinkSync(arq); } catch { /* ja apagado */ }
  }

  const url = `https://${REF}.supabase.co/functions/v1/notificar-cadastro`;
  const temWebhooks = (await sql(`select count(*)::int n from pg_namespace where nspname = 'supabase_functions'`))[0].n > 0;
  if (temWebhooks) {
    // Igual a producao: o "Database Webhook" da Supabase.
    const cabecalhos = JSON.stringify({ "Content-type": "application/json", "x-astral-webhook-secret": segredo }).replace(/'/g, "''");
    await sql(`create trigger "notificar-novo-cadastro" after insert on public.lista_espera
      for each row execute function supabase_functions.http_request('${url}', 'POST', '${cabecalhos}', '{}', '5000')`);
  } else {
    /* Projeto novo, restaurado do zero, pode nao ter os Database Webhooks ligados
       (o esquema supabase_functions so nasce quando alguem liga no painel). Entao:
       o segredo no COFRE do banco (Vault) e a chamada pelo pg_net, com o mesmo
       corpo que o webhook manda ({ type, table, schema, record, old_record }).
       Vantagem de brinde: o segredo nao fica escrito no texto do gatilho. */
    await sql(`create extension if not exists pg_net with schema extensions`);
    await sql(`do $$ begin
      if exists (select 1 from vault.secrets where name = 'astral_webhook_lista') then
        perform vault.update_secret((select id from vault.secrets where name = 'astral_webhook_lista'), '${segredo}');
      else
        perform vault.create_secret('${segredo}', 'astral_webhook_lista');
      end if; end $$`);
    await sql(`create or replace function public.notificar_lead_novo()
      returns trigger language plpgsql security definer set search_path = public as $f$
      declare v_segredo text;
      begin
        select decrypted_secret into v_segredo from vault.decrypted_secrets where name = 'astral_webhook_lista';
        perform net.http_post(
          url := '${url}',
          headers := jsonb_build_object('Content-type', 'application/json', 'x-astral-webhook-secret', v_segredo),
          body := jsonb_build_object('type', 'INSERT', 'table', 'lista_espera', 'schema', 'public',
                                     'record', to_jsonb(new), 'old_record', null),
          timeout_milliseconds := 5000);
        return new;
      end; $f$`);
    await sql(`revoke all on function public.notificar_lead_novo() from public, anon, authenticated`);
    await sql(`create trigger "notificar-novo-cadastro" after insert on public.lista_espera
      for each row execute function public.notificar_lead_novo()`);
  }

  const conf = await sql(`select count(*)::int n from pg_trigger
    where tgname = 'notificar-novo-cadastro' and tgrelid = 'public.lista_espera'::regclass`);
  console.log(conf[0].n === 1
    ? "Gatilho recriado e WEBHOOK_SECRET gravado em Supabase Secrets (o valor nao foi mostrado)."
    : "FALHOU: o gatilho nao apareceu.");
  process.exitCode = conf[0].n === 1 ? 0 : 1;
})().catch((e) => { console.log("FALHOU:", e.message); process.exitCode = 1; });
