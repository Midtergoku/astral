/* ═══════════════════════════════════════════════════════════════════════════
   TESTA-MIGRATIONS-DO-ZERO -- um banco VAZIO sobe so com as migrations do git,
   e fica igual a producao?

   POR QUE EXISTE (02/10/2026)
   Auditoria pre-lancamento, achado OPS-01 (S0): 9 das 43 migrations falhavam
   num banco vazio, porque `perfis`, `lista_espera` e o gatilho de criar perfil
   nasceram no painel. O backup diz, no passo 2 da restauracao, "rodar as
   migrations do git" -- e isso quebraria no dia em que mais importasse.
   A migration 20260729000000_base_inicial.sql traz essa base. Este teste prova:

     1. num banco vazio, TODAS as migrations rodam, em ordem, sem erro
     2. a estrutura que sai e a MESMA da producao: tabelas, colunas, restricoes,
        indices, politicas (RLS), grants de tabela e de coluna, funcoes (o texto
        inteiro), permissao de executar, gatilhos
     3. a unica diferenca permitida e o gatilho do webhook de leads, que leva
        segredo e e recriado por tools/recria-webhook-lista.js

   🔴 SO RODA NO astral-dev. Ele ESVAZIA o esquema public do projeto (as
   tabelas, funcoes e tipos -- os dados de teste vao junto). Recusa a producao.
   Para repovoar o dev depois: scratchpad dev-acervo.js e f3-semear.js (Fase 3).

   USO   node tools/testa-migrations-do-zero.js
         node tools/testa-migrations-do-zero.js --so-comparar   (nao esvazia)
   ═══════════════════════════════════════════════════════════════════════════ */

const { execFileSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const DEV = "vtluuezwfpqgryixaaea";
const PROD = "jjogmcacbdefwiwcyjxp";
if (DEV === PROD) throw new Error("o projeto de teste nao pode ser a producao");
const RAIZ = path.resolve(__dirname, "..");
const TOKEN = execFileSync("powershell", ["-NoProfile", "-File", path.join(__dirname, "token-supabase.ps1")], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
async function sql(ref, query) {
  const r = await fetch(`https://api.supabase.com/v1/projects/${ref}/database/query`, {
    method: "POST", headers: { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json" }, body: JSON.stringify({ query }) });
  const t = await r.text();
  if (!r.ok) throw new Error(t.replace(/\s+/g, " ").slice(0, 300));
  return JSON.parse(t);
}

// Esvazia o esquema public SEM apagar o esquema (as permissoes padrao da Supabase
// moram no esquema e nao poderiam ser recriadas pelo nosso papel).
const ESVAZIAR = `
do $$ declare r record; begin
  drop trigger if exists ao_criar_usuario on auth.users;
  for r in select viewname from pg_views where schemaname = 'public' loop
    execute format('drop view if exists public.%I cascade', r.viewname); end loop;
  for r in select tablename from pg_tables where schemaname = 'public' loop
    execute format('drop table if exists public.%I cascade', r.tablename); end loop;
  for r in select p.oid::regprocedure::text f from pg_proc p join pg_namespace n on n.oid = p.pronamespace
           where n.nspname = 'public' loop
    execute 'drop function if exists ' || r.f || ' cascade'; end loop;
  for r in select t.typname from pg_type t join pg_namespace n on n.oid = t.typnamespace
           where n.nspname = 'public' and t.typtype in ('e', 'c', 'd') loop
    execute format('drop type if exists public.%I cascade', r.typname); end loop;
  for r in select sequence_name from information_schema.sequences where sequence_schema = 'public' loop
    execute format('drop sequence if exists public.%I cascade', r.sequence_name); end loop;
end $$;`;

// A "impressao digital" da estrutura: uma linha por peca, "tipo | nome | definicao".
const DIGITAL = `
select * from (
  select 'tabela' tipo, c.relname nome, 'rls=' || c.relrowsecurity def
    from pg_class c join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'public' and c.relkind = 'r'
  union all
  select 'coluna', table_name || '.' || column_name, data_type || ' | ' || coalesce(column_default, '-') || ' | ' || is_nullable
    from information_schema.columns where table_schema = 'public'
  union all
  select 'restricao', conrelid::regclass::text || '.' || conname, pg_get_constraintdef(oid)
    from pg_constraint where connamespace = 'public'::regnamespace
  union all
  select 'indice', indexname, indexdef from pg_indexes where schemaname = 'public'
  union all
  select 'politica', tablename || '.' || policyname, cmd || ' | ' || roles::text || ' | ' || coalesce(qual, '-') || ' | ' || coalesce(with_check, '-')
    from pg_policies where schemaname = 'public'
  union all
  select 'grant', table_name || '.' || grantee, string_agg(privilege_type, ',' order by privilege_type)
    from information_schema.role_table_grants
   where table_schema = 'public' and grantee in ('anon', 'authenticated', 'service_role')
   group by table_name, grantee
  union all
  select 'grant_coluna', table_name || '.' || column_name || '.' || grantee, string_agg(privilege_type, ',' order by privilege_type)
    from information_schema.column_privileges
   where table_schema = 'public' and grantee in ('anon', 'authenticated')
   group by table_name, column_name, grantee
  union all
  select 'funcao', p.oid::regprocedure::text, md5(pg_get_functiondef(p.oid))
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and p.prokind = 'f'
  union all
  select 'executar', p.oid::regprocedure::text, coalesce(p.proacl::text, '(padrao)')
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and p.prokind = 'f'
  union all
  select 'gatilho', t.tgrelid::regclass::text || '.' || t.tgname,
         regexp_replace(pg_get_triggerdef(t.oid), 'x-astral-webhook-secret[^,}]*', 'x-astral-webhook-secret:***')
    from pg_trigger t join pg_class c on c.oid = t.tgrelid join pg_namespace n on n.oid = c.relnamespace
   where not t.tgisinternal and (n.nspname = 'public' or (n.nspname = 'auth' and c.relname = 'users'))
  union all
  select 'view', viewname, md5(definition) from pg_views where schemaname = 'public'
) x order by tipo, nome;`;

// O webhook de leads (com segredo) fica fora das migrations. Recriado por
// tools/recria-webhook-lista.js, ele pode ter DUAS formas: a da producao
// (supabase_functions.http_request) ou, sem Database Webhooks ligados, a do cofre
// (funcao notificar_lead_novo + pg_net). As duas sao a mesma peca.
const DIFERENCA_PERMITIDA = (linha) =>
  (linha.tipo === "gatilho" && /notificar-novo-cadastro/.test(linha.nome)) ||
  (["funcao", "executar"].includes(linha.tipo) && /^notificar_lead_novo\(/.test(linha.nome));

(async () => {
  let falhas = 0;
  const ok = (t, d = "") => console.log(`  OK     ${t.padEnd(60)} ${d}`);
  const falha = (t, d = "") => { console.log(`  FALHA  ${t.padEnd(60)} ${d}`); falhas++; };
  console.log(`\nTESTA-MIGRATIONS-DO-ZERO -- o banco sobe so com o git?  [${DEV}]\n`);

  if (!process.argv.includes("--so-comparar")) {
    console.log("== 1. ESVAZIA O PROJETO DE TESTE E APLICA AS MIGRATIONS, EM ORDEM ==");
    await sql(DEV, ESVAZIAR);
    const resto = await sql(DEV, "select count(*)::int n from pg_tables where schemaname = 'public'");
    resto[0].n === 0 ? ok("esquema public vazio", "0 tabelas") : falha("o esquema nao esvaziou", `${resto[0].n} tabelas`);
    const pasta = path.join(RAIZ, "supabase/migrations");
    const arquivos = fs.readdirSync(pasta).filter((f) => f.endsWith(".sql")).sort();
    const erradas = [];
    for (const f of arquivos) {
      try { await sql(DEV, fs.readFileSync(path.join(pasta, f), "utf8")); }
      catch (e) { erradas.push(`${f}: ${e.message.slice(0, 120)}`); }
    }
    erradas.length
      ? falha(`${erradas.length} de ${arquivos.length} migrations falharam`, erradas.slice(0, 3).join(" || "))
      : ok(`as ${arquivos.length} migrations rodaram num banco vazio`, `${arquivos[0]} ... ${arquivos.at(-1)}`);
  }

  console.log("\n== 2. A ESTRUTURA E A MESMA DA PRODUCAO ==");
  const [dev, prod] = [await sql(DEV, DIGITAL), await sql(PROD, DIGITAL)];
  const chave = (l) => `${l.tipo}|${l.nome}`;
  const mDev = new Map(dev.map((l) => [chave(l), l])), mProd = new Map(prod.map((l) => [chave(l), l]));
  const so_prod = prod.filter((l) => !mDev.has(chave(l)));
  const so_dev = dev.filter((l) => !mProd.has(chave(l)));
  const diferentes = prod.filter((l) => mDev.has(chave(l)) && mDev.get(chave(l)).def !== l.def);
  const porTipo = {}; for (const l of prod) porTipo[l.tipo] = (porTipo[l.tipo] || 0) + 1;
  console.log(`         ${prod.length} pecas na producao: ${Object.entries(porTipo).map(([t, n]) => `${n} ${t}`).join(" · ")}`);
  const permitidas = so_prod.filter(DIFERENCA_PERMITIDA);
  const reais = [...so_prod.filter((l) => !DIFERENCA_PERMITIDA(l)).map((l) => `so na producao: ${chave(l)}`),
    ...so_dev.filter((l) => !DIFERENCA_PERMITIDA(l)).map((l) => `so no zero: ${chave(l)}`),
    ...diferentes.filter((l) => !DIFERENCA_PERMITIDA(l)).map((l) => `diferente: ${chave(l)}  prod=[${String(l.def).slice(0, 70)}] zero=[${String(mDev.get(chave(l)).def).slice(0, 70)}]`)];
  reais.length ? falha(`${reais.length} diferenca(s) de estrutura`, "") : ok(`estrutura identica: ${prod.length - permitidas.length} pecas conferidas`);
  for (const r of reais.slice(0, 25)) console.log(`         - ${r}`);
  for (const p of permitidas) console.log(`         (permitido) ${chave(p)} -- leva segredo; recriar com tools/recria-webhook-lista.js`);

  console.log("\n" + "=".repeat(76));
  console.log(falhas ? `${falhas} FALHA(S).` : "O BANCO SOBE DO ZERO SO COM O GIT -- e fica igual a producao.");
  // 03/10/2026: rodei este teste no meio de um trabalho, depois testei uma
  // tela no dev vazio, e o "aviso escondido" que vi era falta de dado, nao
  // comportamento. O aviso abaixo existe para eu nao confundir de novo.
  console.log("\n⚠️  O astral-dev ficou VAZIO: sem questoes e sem os usuarios de teste da auditoria.");
  console.log("   Antes de testar tela no dev, ressemear (acervo copiado da producao + usuarios f3).");
  process.exitCode = falhas ? 1 : 0;
})();
