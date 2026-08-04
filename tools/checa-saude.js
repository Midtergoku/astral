// =============================================================================
// CHECAGEM DE SAUDE — rodar SEMPRE ao abrir uma sessao, antes de qualquer coisa.
//
// POR QUE EXISTE: o Lucas foi explicito em 31/07/2026 -- "eu nao vou abrir
// nada... voce vai consertar pra mim, eu nao vou mexer em nada". Ele nao vai
// rodar comando nenhum, entao a deteccao tem de ser minha.
//
// Isto NAO e monitoramento 24 horas -- so roda quando eu rodo. O que ele
// garante e que nenhuma sessao comece em cima de um site quebrado sem eu saber.
//
// Foco em UMA pergunta por checagem: "o usuario consegue usar o Astral agora?"
// Nao substitui tools/testa-site.js, que e a varredura ampla.
//
//   node tools/checa-saude.js
//
// Saida 0 = tudo certo. Saida 1 = tem coisa quebrada, e a saida diz o que fazer.
// =============================================================================
const fs = require("fs");

const SITE = "https://astral-psi.vercel.app";
const API = "https://jjogmcacbdefwiwcyjxp.supabase.co";
// User-Agent de navegador: a Vercel bloqueia como robo quem consulta demais
// sem isso (aconteceu em 31/07 e me fez diagnosticar um problema inexistente).
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36";

const problemas = [];
const ok = (t) => console.log(`  OK     ${t}`);
const falha = (t, conserto) => {
  console.log(`  FALHA  ${t}`);
  problemas.push({ t, conserto });
};

const astralJs = fs.readFileSync("assets/js/astral.js", "utf8");
const CHAVE_PUB = (astralJs.match(/sb_publishable_[A-Za-z0-9_-]+/) || [])[0];
const SITEKEY_LOCAL = (astralJs.match(/HCAPTCHA_SITEKEY\s*=\s*'([^']*)'/) || [])[1] ?? "";

async function json(url, opts) {
  const r = await fetch(url, opts);
  let corpo = null;
  try { corpo = await r.json(); } catch { /* sem corpo */ }
  return { status: r.status, corpo };
}

(async () => {
  console.log("\n=== 1. O SITE ESTA NO AR ===");
  try {
    const r = await fetch(`${SITE}/login.html`, { headers: { "User-Agent": UA } });
    r.status === 200
      ? ok(`login.html responde ${r.status}`)
      : falha(`login.html responde ${r.status}`, "conferir o deploy na Vercel");
  } catch (e) {
    falha(`site inacessivel (${e.message})`, "conferir a Vercel");
  }

  console.log("\n=== 2. LOGIN POR SENHA ===");
  // Credencial proposital invalida. O que importa NAO e o sucesso: e QUAL erro
  // volta. "invalid_credentials" = o caminho de login esta saudavel.
  const login = await json(`${API}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: CHAVE_PUB, "Content-Type": "application/json" },
    // Senha SORTEADA. Ela tem de FALHAR -- e esse o teste: o que importa nao e
    // entrar, e qual erro volta ("invalid_credentials" = login saudavel).
    // Sorteada em vez de fixa porque este repositorio e PUBLICO: senha escrita
    // em arquivo aqui fica visivel para o mundo, mesmo sendo de mentira.
    body: JSON.stringify({
      email: "checagem@astral-saude.local",
      password: "nao-existe-" + crypto.randomUUID(),
    }),
  });
  const cod = login.corpo?.error_code ?? "";

  if (cod === "invalid_credentials") {
    ok("endpoint saudavel (recusou credencial invalida, como esperado)");
    if (SITEKEY_LOCAL) {
      falha(
        "captcha DESLIGADO no servidor, mas o site manda token (sitekey preenchida)",
        "estado seguro, mas o captcha nao esta protegendo nada. Religar com:\n" +
        "           powershell -File tools\\captcha-toggle.ps1 -Ligar",
      );
    }
  } else if (cod === "captcha_failed") {
    // O servidor exige captcha. Isso so e correto se o site estiver mandando.
    if (SITEKEY_LOCAL) {
      ok("captcha exigido pelo servidor E sitekey publicada no site (par correto)");
    } else {
      falha(
        "🔴 LOGIN QUEBRADO: servidor exige captcha e o site NAO manda token",
        "CONSERTO IMEDIATO (devolve o login a todos em ~30s):\n" +
        "           powershell -File tools\\captcha-toggle.ps1\n" +
        "           depois preencher HCAPTCHA_SITEKEY em assets/js/astral.js,\n" +
        "           publicar, e so entao religar com -Ligar",
      );
    }
  } else {
    falha(`resposta inesperada do login: ${cod || login.status}`, "ler o corpo e investigar");
  }

  console.log("\n=== 3. LOGIN COM GOOGLE (rota da maioria dos usuarios) ===");
  const g = await fetch(
    `${API}/auth/v1/authorize?provider=google&redirect_to=${encodeURIComponent(SITE + "/dashboard.html")}`,
    { redirect: "manual" },
  );
  const destino = g.headers.get("location") ?? "";
  g.status === 302 && destino.includes("accounts.google.com")
    ? ok("redireciona para o Google")
    : falha(`Google OAuth respondeu ${g.status}`, "conferir external_google_enabled no Supabase");

  console.log("\n=== 4. FUNCOES DO SERVIDOR ===");
  const esperado = {
    "processar-edital": 401,
    "buscar-recursos": 401,
    "minha-quota": 401,
    "excluir-conta": 401,
    "gerar-questoes": 503, // desligada de proposito em 31/07 (ver CLAUDE.md 8.15)
    "entrar-lista-espera": 400, // sem captcha nem dados: recusa com 400
  };
  for (const [f, cod] of Object.entries(esperado)) {
    const r = await fetch(`${API}/functions/v1/${f}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${CHAVE_PUB}`, "Content-Type": "application/json" },
      body: "{}",
    });
    r.status === cod
      ? ok(`${f} responde ${r.status}`)
      : falha(`${f} responde ${r.status}, esperado ${cod}`, "ver os logs da funcao");
  }

  console.log("\n=== 5. CAPTACAO DE LEADS ===");
  // Dado invalido de proposito: nao cria linha nem dispara e-mail para o Lucas.
  // Nome VALIDO e e-mail invalido -- a funcao valida o nome primeiro, entao um
  // nome curto mascararia a checagem do e-mail (foi o que me enganou na
  // primeira versao deste script).
  const lead = await json(`${API}/functions/v1/entrar-lista-espera`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ nome: "Checagem Saude", email: "nao-e-email", concurso: "CBMERJ" }),
  });
  lead.status === 400 && /e-?mail/i.test(lead.corpo?.error ?? "")
    ? ok(`formulario valida os dados e recusa lixo ("${lead.corpo.error}")`)
    : falha(
        `lista de espera respondeu ${lead.status}: ${lead.corpo?.error ?? "(sem corpo)"}`,
        "testar um cadastro valido por fora antes de concluir que quebrou",
      );

  console.log("\n" + "=".repeat(66));
  if (!problemas.length) {
    console.log("TUDO CERTO — o Astral esta utilizavel agora.\n");
    process.exit(0);
  }
  console.log(`${problemas.length} PROBLEMA(S) — o que fazer:\n`);
  for (const p of problemas) console.log(`  • ${p.t}\n    → ${p.conserto}\n`);
  process.exit(1);
})();
