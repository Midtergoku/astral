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

  // 02/10/2026 (auditoria SEG-06): o uso de IA de hoje contra o TETO GLOBAL do
  // dia (teto_global_de_ia, migration 20261002110000). Bater no teto e falha:
  // os alunos estao recebendo "limite de hoje" -- ou alguem esta abusando.
  try {
    const sk = JSON.parse(require("child_process").execSync("supabase projects api-keys --project-ref jjogmcacbdefwiwcyjxp -o json",
      { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] })).find((k) => k.name === "service_role").api_key;
    const ia = await json(`${API}/rest/v1/rpc/uso_de_ia_hoje`, { method: "POST",
      headers: { apikey: sk, Authorization: `Bearer ${sk}`, "Content-Type": "application/json" }, body: "{}" });
    const linhas = Object.entries(ia.corpo || {}).map(([f, v]) => `${f} ${v.usado}/${v.teto}`);
    const cheio = Object.entries(ia.corpo || {}).filter(([, v]) => Number(v.usado) >= Number(v.teto));
    if (ia.status !== 200) falha(`nao consegui ler o uso de IA de hoje (HTTP ${ia.status})`, "a migration 20261002110000 esta aplicada?");
    else if (cheio.length) falha(`TETO GLOBAL DE IA ATINGIDO hoje: ${cheio.map(([f]) => f).join(", ")}`, "ver quem gastou em uso_ia; o teto mora em teto_global_de_ia()");
    else ok(`IA hoje, contra o teto global: ${linhas.join(" · ")}`);
  } catch (e) { console.log(`  (uso de IA de hoje nao conferido: ${e.message.slice(0, 60)})`); }

  // 09/10/2026 (auditoria OPS-03, roadmap 3.15): os MESMOS alertas que o vigia
  // manda por e-mail (saude_operacao: IA perto do teto, banco e arquivos perto
  // do limite gratis, funcoes falhando, erros nos navegadores). E se o vigia
  // esta ligado (cron + cofre) -- desligado, ninguem e avisado entre sessoes.
  try {
    const sk = JSON.parse(require("child_process").execSync("supabase projects api-keys --project-ref jjogmcacbdefwiwcyjxp -o json",
      { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] })).find((k) => k.name === "service_role").api_key;
    const r = await json(`${API}/rest/v1/rpc/saude_operacao`, { method: "POST",
      headers: { apikey: sk, Authorization: `Bearer ${sk}`, "Content-Type": "application/json" }, body: "{}" });
    const s = r.corpo || {};
    if (r.status !== 200) falha(`nao consegui ler a saude da operacao (HTTP ${r.status})`, "a migration 20261009140000 esta aplicada?");
    else if ((s.alertas || []).length) for (const a of s.alertas) falha(`VIGIA: ${a.texto}`, "o mesmo alerta foi (ou vai) por e-mail ao Lucas");
    else ok(`operacao: banco ${s.banco_mb} MB de 500 · arquivos ${s.arquivos_mb ?? "?"} MB · falhas de funcao (24 h): ${Object.values(s.falhas_24h || {}).reduce((a, b) => a + b, 0)} · erros no navegador (24 h): ${s.erros_navegador_24h}`);
  } catch (e) { console.log(`  (saude da operacao nao conferida: ${e.message.slice(0, 60)})`); }

  // 03/10/2026 (auditoria BAN-02): questao que um aluno reportou como errada.
  // Nao e falha do site -- e trabalho para fazer: AVISAR O LUCAS e revisar a
  // questao (historico/revisao-de-questoes.md). Marcar resolvido_em depois.
  try {
    const sk = JSON.parse(require("child_process").execSync("supabase projects api-keys --project-ref jjogmcacbdefwiwcyjxp -o json",
      { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] })).find((k) => k.name === "service_role").api_key;
    const r = await json(`${API}/rest/v1/questoes_reportadas?resolvido_em=is.null&select=questao_id,motivo&usuario_id=not.is.null`,
      { headers: { apikey: sk, Authorization: `Bearer ${sk}` } });
    const abertos = Array.isArray(r.corpo) ? r.corpo : [];
    if (r.status !== 200) console.log(`  (relatos de questao nao conferidos: HTTP ${r.status})`);
    else if (abertos.length) console.log(`  🔔 ${abertos.length} relato(s) de questao com erro esperando revisao -- AVISAR O LUCAS: questoes #${[...new Set(abertos.map((x) => x.questao_id))].slice(0, 8).join(" #")}`);
    else ok("nenhuma questao reportada esperando revisao");
  } catch (e) { console.log(`  (relatos de questao nao conferidos: ${e.message.slice(0, 60)})`); }

  // 03/10/2026 (auditoria EDI-03, roadmap 3.3): "a leitura do edital esta
  // errada". A leitura guardada serve a todos que sobem o mesmo PDF -- e NAO
  // e apagada sozinha (cada releitura custa credito). AVISAR O LUCAS; conferir
  // o resultado em editais_lidos; marcar resolvido_em depois.
  try {
    const sk = JSON.parse(require("child_process").execSync("supabase projects api-keys --project-ref jjogmcacbdefwiwcyjxp -o json",
      { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] })).find((k) => k.name === "service_role").api_key;
    const r = await json(`${API}/rest/v1/editais_reportados?resolvido_em=is.null&select=edital_hash,concurso`,
      { headers: { apikey: sk, Authorization: `Bearer ${sk}` } });
    const abertos = Array.isArray(r.corpo) ? r.corpo : [];
    if (r.status !== 200) console.log(`  (avisos de edital nao conferidos: HTTP ${r.status})`);
    else if (abertos.length) console.log(`  🔔 ${abertos.length} aviso(s) de "leitura do edital errada" -- AVISAR O LUCAS: ${[...new Set(abertos.map((x) => x.concurso || x.edital_hash.slice(0, 10)))].slice(0, 5).join(" · ")}`);
    else ok("nenhuma leitura de edital contestada");
  } catch (e) { console.log(`  (avisos de edital nao conferidos: ${e.message.slice(0, 60)})`); }

  // 10/10/2026 (roadmap 4.4): o dono ja ativou as duas etapas? Enquanto nao, quem tiver a senha dele abre o
  // painel do negocio e o importador. Nao e falha do site -- e um passo DELE (Minha conta > Ativar, ler o QR).
  // auth.mfa_factors nao sai pela API REST: vai pela API de gerenciamento (so leitura).
  try {
    const tk = require("child_process").execFileSync("powershell", ["-NoProfile", "-File", require("path").join(__dirname, "token-supabase.ps1")],
      { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
    const r = await fetch("https://api.supabase.com/v1/projects/jjogmcacbdefwiwcyjxp/database/query", {
      method: "POST", headers: { Authorization: `Bearer ${tk}`, "Content-Type": "application/json" },
      body: JSON.stringify({ query: "select count(*)::int as sem from public.administradores a where not exists (select 1 from auth.mfa_factors f where f.user_id = a.usuario_id and f.status = 'verified')" }),
    });
    const sem = r.ok ? (await r.json())[0]?.sem : null;
    if (sem === null) console.log(`  (duas etapas do dono nao conferidas: HTTP ${r.status})`);
    else if (sem > 0) console.log(`  🔔 o dono ainda NAO ativou as duas etapas -- AVISAR O LUCAS: Minha conta > Verificacao em duas etapas > Ativar (ler o QR no Google Authenticator)`);
    else ok("o dono entra com senha + codigo do aplicativo (duas etapas ativas)");
  } catch (e) { console.log(`  (duas etapas do dono nao conferidas: ${e.message.slice(0, 60)})`); }

  // 02/10/2026 (auditoria OPS-02): o backup diario agendado
  // (tools/agenda-backup.ps1) esta rodando? Backup que para calado e o mesmo
  // que backup nenhum -- o plano gratis do Supabase nao faz o dele.
  try {
    const status = require("path").resolve(__dirname, "..", "..", "ASTRAL-BACKUPS", "ultimo-backup.json");
    const u = JSON.parse(require("fs").readFileSync(status, "utf8"));
    const horas = (Date.now() - Date.parse(u.em)) / 36e5;
    if (!u.ok) falha(`o ultimo backup FALHOU (${u.em.slice(0, 16)}): ${(u.falhas || []).join(", ") || u.erro || "sem detalhe"}`,
      "rodar node tools/backup.js e ler o erro; ver ..\\ASTRAL-BACKUPS\\backup-agendado.log");
    else if (horas > 48) falha(`o ultimo backup tem ${Math.round(horas / 24)} dia(s)`,
      "conferir a tarefa: powershell -File tools\\agenda-backup.ps1 -Ver (o PC ficou desligado?)");
    else ok(`backup automatico em dia (ha ${Math.round(horas)} h, ${u.linhas} linhas)`);
  } catch (e) {
    falha("nao achei o registro do backup automatico (ultimo-backup.json)",
      "criar a tarefa: powershell -File tools\\agenda-backup.ps1 -Agora");
  }

  // Os lembretes que ele mandou guardar, com gatilho MEDIDO. Ficam aqui porque
  // este arquivo e a primeira coisa de toda sessao -- combinado que depende de
  // eu lembrar sozinho nao e combinado, e um esquecimento com data marcada.
  try { await require("./lembretes.js").rodar({ silencioseLonge: true }); }
  catch (e) { console.log(`  (lembretes nao rodaram: ${e.message})`); }

  console.log("\n" + "=".repeat(66));
  if (!problemas.length) {
    console.log("TUDO CERTO — o Astral esta utilizavel agora.\n");
    process.exit(0);
  }
  console.log(`${problemas.length} PROBLEMA(S) — o que fazer:\n`);
  for (const p of problemas) console.log(`  • ${p.t}\n    → ${p.conserto}\n`);
  process.exit(1);
})();
