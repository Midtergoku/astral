/* ═══════════════════════════════════════════════════════════════════════════
   TESTA-PLANO-FORJADO — alguem de fora consegue se dar Pro de graca?

   POR QUE EXISTE (27/09/2026)
   Pedido dele, ao ter a propria conta passada para Pro: "as pessoas de fora
   nao tem como ter acesso a isso, ne? Mudar para Pro. Seria uma falha de
   seguranca absurda. Da uma verificada para mim."

   O testa-isolamento ja tentava UMA porta (editar o proprio plano). Aqui
   estao todas as que se acharam, em duas metades:

   A. O QUE ESTA EM PRODUCAO (SQL, lido do banco real, nao dos arquivos):
      quem pode escrever na coluna do plano, e que funcao do banco escreve nela.
   B. ATAQUE DE VERDADE, com uma conta gratis logada -- sessao real, chave
      publica real, igual a quem abre o console do navegador.

   Regra do projeto: resultado negativo so vale com prova de que o ataque
   foi tentado com credencial valida. Por isso o bloco B primeiro PROVA que a
   sessao do atacante funciona (ele consegue mudar o proprio nome).

   USO   node tools/testa-plano-forjado.js
   Cria 2 contas descartaveis e apaga as duas no fim.
   ═══════════════════════════════════════════════════════════════════════════ */

const { execSync, execFileSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const REF = "jjogmcacbdefwiwcyjxp";
const BASE = `https://${REF}.supabase.co`;
const RAIZ = path.resolve(__dirname, "..");
const chaves = JSON.parse(execSync(`supabase projects api-keys --project-ref ${REF} -o json`,
  { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }));
const SK = chaves.find((k) => k.name === "service_role").api_key;
const PUB = (fs.readFileSync(path.join(RAIZ, "assets/js/astral.js"), "utf8").match(/sb_publishable_[A-Za-z0-9_-]+/) || [])[0];
const admin = { apikey: SK, Authorization: `Bearer ${SK}`, "Content-Type": "application/json" };

// O token de gerenciamento, lido pelo script isolado; nunca vai para arquivo.
const TOKEN = execFileSync("powershell", ["-NoProfile", "-File", path.join(__dirname, "token-supabase.ps1")],
  { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
async function sql(query) {
  const r = await fetch(`https://api.supabase.com/v1/projects/${REF}/database/query`, {
    method: "POST", headers: { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify({ query }),
  });
  const t = await r.text();
  if (!r.ok) throw new Error("SQL falhou (HTTP " + r.status + "): " + t.slice(0, 200));
  return JSON.parse(t);
}

let falhas = 0;
const ok = (t, d = "") => console.log(`  OK     ${t.padEnd(58)} ${d}`);
const falha = (t, d = "") => { console.log(`  FALHA  ${t.padEnd(58)} ${d}`); falhas++; };
async function req(c, o) { const r = await fetch(BASE + c, o); let corpo = null; try { corpo = await r.json(); } catch {} return { status: r.status, corpo }; }

(async () => {
  const contas = [];
  const planoDe = async (id) => (await req(`/rest/v1/perfis?id=eq.${id}&select=tipo_plano`, { headers: admin })).corpo?.[0]?.tipo_plano;
  const criar = async (p, metadados) => {
    const email = `${p}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}@astral-teste.local`;
    const c = await req("/auth/v1/admin/users", { method: "POST", headers: admin,
      body: JSON.stringify({ email, password: "T!" + crypto.randomUUID(), email_confirm: true,
        ...(metadados ? { user_metadata: metadados } : {}) }) });
    const id = c.corpo.id; contas.push(id);
    const link = await req("/auth/v1/admin/generate_link", { method: "POST", headers: admin, body: JSON.stringify({ type: "magiclink", email }) });
    const s = (await req("/auth/v1/verify", { method: "POST", headers: { apikey: PUB, "Content-Type": "application/json" },
      body: JSON.stringify({ type: "magiclink", token_hash: link.corpo?.hashed_token }) })).corpo;
    return { id, token: s.access_token, cab: { apikey: PUB, Authorization: `Bearer ${s.access_token}`, "Content-Type": "application/json" } };
  };

  try {
    console.log("\nTESTA-PLANO-FORJADO — alguem de fora consegue se dar Pro?\n");

    // ── A. O QUE ESTA EM PRODUCAO ────────────────────────────────────────
    console.log("== A. AS REGRAS QUE ESTAO NO AR (lidas do banco real) ==");
    {
      const col = await sql(`select grantee, privilege_type, column_name
        from information_schema.column_privileges
        where table_schema='public' and table_name='perfis' and grantee in ('anon','authenticated')
          and privilege_type in ('INSERT','UPDATE','DELETE')`);
      const naColunaDoPlano = col.filter((c) => c.column_name === "tipo_plano");
      !naColunaDoPlano.length
        ? ok("🎯 ninguem de fora tem permissao de escrever o plano", "coluna tipo_plano")
        : falha("ALGUEM PODE ESCREVER O PLANO", JSON.stringify(naColunaDoPlano));
      const escrita = col.map((c) => `${c.grantee}:${c.privilege_type}(${c.column_name})`).sort();
      escrita.join(",") === "authenticated:UPDATE(nome)"
        ? ok("a unica escrita permitida no perfil e o proprio nome", escrita.join(", "))
        : falha("escrita inesperada no perfil", escrita.join(", "));

      // Funcao do banco que escreve no perfil e que alguem de fora pode chamar
      // seria uma porta dos fundos, mesmo com a tabela trancada.
      const fns = await sql(`select p.proname as nome,
          has_function_privilege('authenticated', p.oid, 'execute') as logado,
          has_function_privilege('anon', p.oid, 'execute') as anonimo,
          pg_get_function_result(p.oid) as devolve, p.prosrc as fonte
        from pg_proc p join pg_namespace n on n.oid = p.pronamespace
        where n.nspname = 'public'
          and p.prosrc ~* '(update|insert\\s+into)\\s+(public\\.)?perfis'`);
      /* 03/10/2026 (roadmap 3.6): registrar_nascimento escreve no perfil -- e a
         trava acusou, como devia. Em vez de desligar a trava, ela ficou PRECISA:
         funcao chamavel pode escrever no perfil SO nas colunas liberadas aqui,
         uma a uma, com o motivo. Insert no perfil por funcao chamavel: nunca. */
      const COLUNAS_LIBERADAS = {
        nascimento: "registrar_nascimento (3.6): grava a data uma vez, nada mais",
      };
      const colunasEscritas = (fonte) => {
        const cols = [];
        const re = /update\s+(?:public\.)?perfis\s+set\s+([\s\S]+?)\s+where/gi;
        let m;
        while ((m = re.exec(fonte))) for (const parte of m[1].split(",")) cols.push(parte.split("=")[0].trim().toLowerCase());
        return cols;
      };
      const temInsert = (fonte) => /insert\s+into\s+(?:public\.)?perfis/i.test(fonte);
      const chamaveis = fns.filter((f) => f.devolve !== "trigger" && (f.logado || f.anonimo))
        .filter((f) => temInsert(f.fonte) || colunasEscritas(f.fonte).some((c) => !(c in COLUNAS_LIBERADAS)) || !colunasEscritas(f.fonte).length);
      const liberadas = fns.filter((f) => f.devolve !== "trigger" && (f.logado || f.anonimo) && !chamaveis.includes(f));
      if (liberadas.length) ok("funcao chamavel que escreve no perfil so mexe em coluna liberada",
        liberadas.map((f) => `${f.nome} -> ${colunasEscritas(f.fonte).join(", ")}`).join("; "));
      !chamaveis.length
        ? ok("🎯 nenhuma funcao chamavel de fora escreve no perfil",
            `${fns.length} escrevem, gatilho interno ou coluna liberada: ${fns.map((f) => f.nome).join(", ")}`)
        : falha("FUNCAO CHAMAVEL ESCREVE NO PERFIL", chamaveis.map((f) => f.nome).join(", "));

      // O plano nunca pode vir de algo que a propria pessoa escreve (metadados
      // do login). Procura-se nas funcoes do banco...
      const meta = await sql(`select p.proname as nome from pg_proc p
        join pg_namespace n on n.oid = p.pronamespace
        where n.nspname = 'public' and p.prosrc ~* 'tipo_plano'
          and p.prosrc ~* '(user_metadata|raw_user_meta_data|auth\\.jwt)'
          and p.prosrc ~* '(user_metadata|raw_user_meta_data)[^;]*plano'`);
      !meta.length
        ? ok("o plano nunca e lido dos dados que a pessoa escreve", "funcoes do banco")
        : falha("PLANO LIDO DE METADADO", meta.map((f) => f.nome).join(", "));
      // ...e nas funcoes do servidor (edge functions).
      const ts = fs.readdirSync(path.join(RAIZ, "supabase/functions"))
        .flatMap((d) => { try { return fs.readdirSync(path.join(RAIZ, "supabase/functions", d)).map((f) => path.join(RAIZ, "supabase/functions", d, f)); } catch { return []; } })
        .filter((f) => f.endsWith(".ts"));
      const suspeitos = ts.filter((f) => /user_metadata[^\n]*plano|plano[^\n]*user_metadata|body[^\n]*\.plano\b/.test(fs.readFileSync(f, "utf8")));
      !suspeitos.length
        ? ok("e o servidor le o plano so da tabela, nunca do pedido", `${ts.length} arquivos .ts`)
        : falha("servidor pode ler plano do pedido", suspeitos.map((f) => path.basename(path.dirname(f))).join(", "));

      const aud = await sql(`select count(*)::int as n from pg_trigger t
        join pg_class c on c.oid = t.tgrelid where c.relname = 'perfis' and not t.tgisinternal`);
      aud[0].n > 0
        ? ok("mudanca de plano fica gravada na auditoria", `${aud[0].n} gatilho(s) no perfil`)
        : falha("nenhum gatilho de auditoria no perfil");
    }

    // ── B. ATAQUE DE VERDADE ─────────────────────────────────────────────
    console.log("\n== B. UMA CONTA GRATIS TENTA SE DAR PRO ==");
    const at = await criar("atacante");
    const comoAt = { ...at.cab, Prefer: "return=representation" };

    // Prova de que a credencial e valida: sem isto, "tudo bloqueado" nao vale nada.
    {
      const r = await req(`/rest/v1/perfis?id=eq.${at.id}`, { method: "PATCH", headers: comoAt,
        body: JSON.stringify({ nome: "Nome Trocado" }) });
      r.status === 200 && r.corpo?.[0]?.nome === "Nome Trocado"
        ? ok("🔑 a sessao do atacante e real", "ele consegue mudar o proprio nome")
        : falha("sessao do atacante nao funciona -- o teste nao provaria nada", `HTTP ${r.status}`);
      (await planoDe(at.id)) === "free"
        ? ok("e comeca no plano gratis") : falha("atacante nao comecou free");
    }

    const tentativas = [
      ["1. editar o proprio plano", () => req(`/rest/v1/perfis?id=eq.${at.id}`, { method: "PATCH", headers: comoAt,
        body: JSON.stringify({ tipo_plano: "pro" }) })],
      ["2. editar o nome e o plano juntos", () => req(`/rest/v1/perfis?id=eq.${at.id}`, { method: "PATCH", headers: comoAt,
        body: JSON.stringify({ nome: "Outro", tipo_plano: "pro" }) })],
      ["3. regravar o perfil inteiro (upsert)", () => req(`/rest/v1/perfis`, { method: "POST",
        headers: { ...comoAt, Prefer: "return=representation,resolution=merge-duplicates" },
        body: JSON.stringify({ id: at.id, nome: "X", tipo_plano: "pro" }) })],
      ["4. apagar o perfil para recriar", () => req(`/rest/v1/perfis?id=eq.${at.id}`, { method: "DELETE", headers: comoAt })],
      ["5. virar 'beta' em vez de 'pro'", () => req(`/rest/v1/perfis?id=eq.${at.id}`, { method: "PATCH", headers: comoAt,
        body: JSON.stringify({ tipo_plano: "beta" }) })],
      ["6. escrever 'pro' nos dados do proprio login", () => req(`/auth/v1/user`, { method: "PUT", headers: at.cab,
        body: JSON.stringify({ data: { tipo_plano: "pro", plano: "pro" } }) })],
      ["7. se colocar na lista de administradores", () => req(`/rest/v1/administradores`, { method: "POST", headers: comoAt,
        body: JSON.stringify({ usuario_id: at.id }) })],
      ["8. sem login: promover todo mundo", () => req(`/rest/v1/perfis?tipo_plano=eq.free`, { method: "PATCH",
        headers: { apikey: PUB, "Content-Type": "application/json", Prefer: "return=representation" },
        body: JSON.stringify({ tipo_plano: "pro" }) })],
    ];
    for (const [nome, fazer] of tentativas) {
      const r = await fazer();
      const plano = await planoDe(at.id);
      plano === "free"
        ? ok(`${nome}`, `continua free (HTTP ${r.status})`)
        : falha(`${nome} -> VIROU ${plano}!`, `HTTP ${r.status}`);
    }
    // O 7 nao mexe no plano; o que importa e se ele entrou na lista.
    const virouAdmin = (await req(`/rest/v1/administradores?usuario_id=eq.${at.id}&select=usuario_id`, { headers: admin })).corpo || [];
    !virouAdmin.length ? ok("   ...e nao entrou na lista de administradores") : falha("ATACANTE VIROU ADMINISTRADOR");

    // O teste que importa: o SERVIDOR trata ele como que? (depois da tentativa 6,
    // o login dele carrega "pro" nos metadados -- e o servidor tem de ignorar).
    {
      const r = await fetch(`${BASE}/functions/v1/minha-quota`, { method: "POST", headers: at.cab, body: "{}" });
      const q = await r.json().catch(() => ({}));
      // A resposta vem como { success, data: { plano, completo, ... } }.
      const plano = q?.data?.plano;
      const completo = q?.data?.completo;
      r.status === 200 && plano === "free" && completo === false
        ? ok("🎯 o servidor continua tratando ele como gratis", "mesmo com 'pro' no proprio login")
        : falha("servidor tratou o atacante diferente", `HTTP ${r.status} ${JSON.stringify(q).slice(0, 80)}`);
    }

    // 9. Cadastro ja pedindo pro: o gatilho que cria o perfil tem de ignorar.
    {
      const nova = await criar("cadastro-pro", { tipo_plano: "pro", plano: "pro" });
      const plano = await planoDe(nova.id);
      plano === "free"
        ? ok("9. criar conta ja dizendo que e pro", "nasceu free")
        : falha(`9. conta nova nasceu ${plano}!`);
    }
  } catch (e) {
    falha("erro no teste: " + e.message);
  } finally {
    for (const id of contas) await req(`/auth/v1/admin/users/${id}`, { method: "DELETE", headers: admin });
    console.log(`\n  (${contas.length} contas de teste apagadas)`);
  }

  console.log("\n" + "=".repeat(74));
  console.log(falhas ? `🔴 ${falhas} FALHA(S).` : "NINGUEM SE DA PRO SOZINHO — so quem tem a chave de servico muda plano.");
  process.exit(falhas ? 1 : 0);
})();
