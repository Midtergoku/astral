// Teste de invasao: um usuario logado consegue ler/alterar dados de outro?
//
// Cria DOIS usuarios descartaveis, planta dado no primeiro, e tenta acessar
// com o token do segundo. Foco na tabela nova recursos_salvos.
//
// ⚠️ NAO faz login por senha: desde 31/07 o captcha esta ligado e o grant de
// senha exige token de captcha, que um script nao consegue produzir. A sessao
// vem de um magic link gerado pela API de admin -- que e a forma correta de um
// teste automatizado obter sessao sem furar a propria protecao.
const { execSync } = require("child_process");
const fs = require("fs");

const REF = "jjogmcacbdefwiwcyjxp";
const BASE = `https://${REF}.supabase.co`; // nao chamar de URL: sombreia o global

const chaves = JSON.parse(
  execSync(`supabase projects api-keys --project-ref ${REF} -o json`, {
    encoding: "utf8", stdio: ["ignore", "pipe", "ignore"],
  }),
);
const SERVICE = chaves.find((k) => k.name === "service_role").api_key;
// A chave 'anon' do CLI e o formato JWT antigo; o site usa a publishable nova.
// Ler do astral.js garante que o teste usa exatamente o que o site usa.
const PUB = (fs.readFileSync("assets/js/astral.js", "utf8")
  .match(/sb_publishable_[A-Za-z0-9_-]+/) || [])[0];

let falhas = 0;
const ok = (t) => console.log(`  OK     ${t}`);
const falha = (t) => { console.log(`  FALHA  ${t}`); falhas++; };

async function req(caminho, opts) {
  const r = await fetch(`${BASE}${caminho}`, opts);
  let corpo = null;
  try { corpo = await r.json(); } catch { /* sem corpo */ }
  return { status: r.status, corpo };
}

const admin = { apikey: SERVICE, Authorization: `Bearer ${SERVICE}`, "Content-Type": "application/json" };

async function criarUsuario(tag) {
  const email = `iso-${tag}-${Date.now()}@astral-teste.local`;

  const c = await req("/auth/v1/admin/users", {
    method: "POST", headers: admin,
    // Senha sorteada -- ver o mesmo comentario em testa-auditoria.js.
    body: JSON.stringify({ email, password: "T!" + crypto.randomUUID(), email_confirm: true }),
  });
  const id = c.corpo?.id;
  if (!id) throw new Error("nao criou usuario: " + JSON.stringify(c.corpo));

  // Magic link pela API de admin -> troca por sessao. Nao passa pelo captcha
  // porque nao e um grant de credencial.
  const link = await req("/auth/v1/admin/generate_link", {
    method: "POST", headers: admin,
    body: JSON.stringify({ type: "magiclink", email }),
  });
  const hashed = link.corpo?.hashed_token;
  if (!hashed) throw new Error("nao gerou magic link: " + JSON.stringify(link.corpo));

  const sessao = await req("/auth/v1/verify", {
    method: "POST", headers: { apikey: PUB, "Content-Type": "application/json" },
    // token_hash, nao token: com `token` a API exige email junto e recusa com
    // "Only an email address or phone number should be provided on verify".
    body: JSON.stringify({ type: "magiclink", token_hash: hashed }),
  });
  const token = sessao.corpo?.access_token;
  if (!token) throw new Error("nao obteve sessao: " + JSON.stringify(sessao.corpo));

  return { id, email, token };
}

(async () => {
  let vitima = null, atacante = null;
  try {
    vitima = await criarUsuario("vitima");
    atacante = await criarUsuario("atacante");
    console.log(`vitima=${vitima.id.slice(0, 8)}  atacante=${atacante.id.slice(0, 8)}`);
    console.log("(sessoes obtidas por magic link — o captcha bloqueia login por senha)\n");

    const comoAtacante = {
      apikey: PUB, Authorization: `Bearer ${atacante.token}`, "Content-Type": "application/json",
    };

    // Confere primeiro que o token do atacante FUNCIONA -- senao um 401 em
    // tudo pareceria protecao, quando seria so autenticacao falhando.
    const eu = await req(`/rest/v1/perfis?id=eq.${atacante.id}&select=id`, { headers: comoAtacante });
    if (!Array.isArray(eu.corpo)) {
      throw new Error("token do atacante nao autentica; teste invalido: " + JSON.stringify(eu.corpo));
    }
    ok(`token do atacante autentica (le o proprio perfil: ${eu.corpo.length} linha)`);

    // Planta dado na vitima com service_role (ignora RLS).
    await req("/rest/v1/recursos_salvos", {
      method: "POST", headers: { ...admin, Prefer: "return=minimal" },
      body: JSON.stringify({
        usuario_id: vitima.id, materia: "Portugues Secreto",
        concurso: "CBMERJ", dados: { segredo: "isto nao pode vazar" },
      }),
    });
    await req("/rest/v1/progresso", {
      method: "POST", headers: { ...admin, Prefer: "return=minimal,resolution=merge-duplicates" },
      body: JSON.stringify({ usuario_id: vitima.id, xp: 9999 }),
    });

    console.log("\n== O ATACANTE CONSEGUE LER O QUE E DA VITIMA? ==");
    for (const t of ["recursos_salvos", "progresso", "eventos", "sessoes_estudo", "perfis"]) {
      const chave = t === "perfis" ? "id" : "usuario_id";
      const r = await req(`/rest/v1/${t}?${chave}=eq.${vitima.id}&select=*`, { headers: comoAtacante });
      const n = Array.isArray(r.corpo) ? r.corpo.length : -1;
      n === 0 ? ok(`${t.padEnd(16)} devolveu 0 linhas`)
              : falha(`${t.padEnd(16)} VAZOU ${n} linha(s)! HTTP ${r.status} ${JSON.stringify(r.corpo).slice(0, 90)}`);
    }

    console.log("\n== O ATACANTE CONSEGUE ALTERAR/APAGAR O DA VITIMA? ==");
    for (const [metodo, corpo] of [["PATCH", { dados: { invadido: true } }], ["DELETE", null]]) {
      const r = await req(`/rest/v1/recursos_salvos?usuario_id=eq.${vitima.id}`, {
        method: metodo, headers: { ...comoAtacante, Prefer: "return=representation" },
        ...(corpo ? { body: JSON.stringify(corpo) } : {}),
      });
      const nada = (Array.isArray(r.corpo) && r.corpo.length === 0) || r.status >= 400;
      nada ? ok(`${metodo.padEnd(6)} bloqueado (HTTP ${r.status}, 0 linhas afetadas)`)
           : falha(`${metodo} MEXEU em dado alheio! HTTP ${r.status}`);
    }
    // Prova final: o dado da vitima continua intacto.
    const intacto = await req(
      `/rest/v1/recursos_salvos?usuario_id=eq.${vitima.id}&select=dados`, { headers: admin });
    intacto.corpo?.[0]?.dados?.segredo === "isto nao pode vazar"
      ? ok("dado da vitima intacto depois do ataque")
      : falha("DADO DA VITIMA FOI ALTERADO OU APAGADO!");

    console.log("\n== O ATACANTE CONSEGUE SE PROMOVER A PRO? ==");
    const promo = await req(`/rest/v1/perfis?id=eq.${atacante.id}`, {
      method: "PATCH", headers: { ...comoAtacante, Prefer: "return=representation" },
      body: JSON.stringify({ tipo_plano: "pro" }),
    });
    const plano = await req(`/rest/v1/perfis?id=eq.${atacante.id}&select=tipo_plano`, { headers: admin });
    plano.corpo?.[0]?.tipo_plano === "free"
      ? ok(`continua free (tentativa devolveu HTTP ${promo.status})`)
      : falha(`SE PROMOVEU para ${plano.corpo?.[0]?.tipo_plano}!`);

    console.log("\n== O ATACANTE ESCREVE NO REGISTRO DE USO/ERRO? ==");
    for (const t of ["uso_ia", "erros_cliente"]) {
      const r = await req(`/rest/v1/${t}`, {
        method: "POST", headers: { ...comoAtacante, Prefer: "return=minimal" },
        body: JSON.stringify(
          t === "uso_ia" ? { usuario_id: atacante.id, funcao: "gerar-questoes", unidades: 1 }
                         : { mensagem: "injetado" }),
      });
      r.status >= 400 ? ok(`${t.padEnd(14)} escrita bloqueada (HTTP ${r.status})`)
                      : falha(`${t.padEnd(14)} ACEITOU escrita! HTTP ${r.status}`);
    }
  } catch (e) {
    falha("erro no teste: " + e.message);
  } finally {
    for (const u of [vitima, atacante]) {
      if (u?.id) await req(`/auth/v1/admin/users/${u.id}`, { method: "DELETE", headers: admin });
    }
    console.log("\nusuarios de teste removidos");
  }

  console.log(falhas === 0 ? "\nISOLAMENTO INTACTO — nenhum vazamento.\n"
                           : `\n${falhas} FALHA(S).\n`);
  process.exit(falhas ? 1 : 0);
})();
