// Varredura do site em PRODUCAO. Nao testa logica de negocio -- testa que
// tudo o que deveria estar no ar esta no ar, e que o que deveria estar
// fechado esta fechado.
const fs = require("fs");
const { execSync } = require("child_process");

const SITE = "https://astral-psi.vercel.app";
const REF = "jjogmcacbdefwiwcyjxp";
const API = `https://${REF}.supabase.co`;

const PAGINAS = [
  "index.html", "login.html", "criar-conta.html", "cadastro.html",
  "redefinir-senha.html", "dashboard.html", "progresso.html", "conquistas.html",
  "edital.html", "calendario.html", "recursos.html", "questoes.html",
  "cronometro.html", "conta.html", "privacidade.html", "termos.html",
];
const ASSETS = ["assets/css/app.css", "assets/js/astral.js", "assets/js/estado.js", "assets/js/transicao.js"];
const FUNCOES = ["processar-edital", "gerar-questoes", "buscar-recursos", "minha-quota", "excluir-conta"];
const TABELAS = ["perfis", "lista_espera", "uso_ia", "progresso", "eventos", "sessoes_estudo"];

const CHAVE_PUB = (fs.readFileSync("assets/js/astral.js", "utf8")
  .match(/sb_publishable_[A-Za-z0-9_-]+/) || [])[0];

let falhas = 0;
const linha = (ok, txt) => { if (!ok) falhas++; console.log(`  ${ok ? "OK  " : "FALHA"}  ${txt}`); };

async function status(url, opts) {
  try { return (await fetch(url, opts)).status; } catch { return 0; }
}

(async () => {
  console.log("\n== 1. PAGINAS NO AR ==");
  for (const p of PAGINAS) {
    const s = await status(`${SITE}/${p}`);
    linha(s === 200, `${p.padEnd(22)} HTTP ${s}`);
  }

  console.log("\n== 2. ARQUIVOS COMPARTILHADOS (CSS/JS) ==");
  for (const a of ASSETS) {
    const s = await status(`${SITE}/${a}`);
    linha(s === 200, `${a.padEnd(28)} HTTP ${s}`);
  }

  console.log("\n== 3. CABECALHOS DE SEGURANCA ==");
  const r = await fetch(`${SITE}/index.html`);
  const esperados = {
    "content-security-policy": null,
    "strict-transport-security": null,
    "x-frame-options": "DENY",
    "x-content-type-options": "nosniff",
    "referrer-policy": null,
    "permissions-policy": null,
  };
  for (const [h, valor] of Object.entries(esperados)) {
    const v = r.headers.get(h);
    const ok = valor ? v === valor : !!v;
    linha(ok, `${h.padEnd(28)} ${v ? (v.length > 42 ? v.slice(0, 42) + "..." : v) : "AUSENTE"}`);
  }

  console.log("\n== 4. EDGE FUNCTIONS RECUSAM A CHAVE PUBLICA ==");
  for (const f of FUNCOES) {
    const s = await status(`${API}/functions/v1/${f}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${CHAVE_PUB}`, "Content-Type": "application/json" },
      body: "{}",
    });
    linha(s === 401, `${f.padEnd(20)} HTTP ${s} (esperado 401)`);
  }

  console.log("\n== 5. LEITURA ANONIMA DAS TABELAS E NEGADA ==");
  for (const t of TABELAS) {
    const s = await status(`${API}/rest/v1/${t}?select=*&limit=1`, {
      headers: { apikey: CHAVE_PUB, Authorization: `Bearer ${CHAVE_PUB}` },
    });
    linha(s === 401 || s === 403 || s === 404, `${t.padEnd(16)} HTTP ${s} (esperado 401/403)`);
  }

  console.log("\n== 6. CAPTACAO DE LEADS: DADO INVALIDO E RECUSADO ==");
  // NAO insere linha valida de proposito: um INSERT valido dispara o webhook
  // do Resend e manda e-mail de "novo cadastro" para o Lucas -- alarme falso.
  // Mandar dado invalido prova que a rota existe E que a validacao funciona.
  //
  // A recusa vem como 401 com codigo 42501, nao 400: a validacao mora na
  // POLICY de RLS (migration ..120200), e o Postgres trata violacao de policy
  // como falta de permissao. Esperar 400 aqui da falso negativo -- ja deu.
  const rInv = await fetch(`${API}/rest/v1/lista_espera`, {
    method: "POST",
    headers: {
      apikey: CHAVE_PUB, Authorization: `Bearer ${CHAVE_PUB}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ nome: "x", email: "nao-e-email", concurso: "t" }),
  });
  const corpoInv = await rInv.json().catch(() => ({}));
  linha(rInv.status === 401 && corpoInv.code === "42501",
    `INSERT invalido recusado    HTTP ${rInv.status} codigo ${corpoInv.code ?? "?"}`);

  console.log("\n== 7. PROVEDORES DE LOGIN ==");
  try {
    const cfg = await (await fetch(`${API}/auth/v1/settings`, { headers: { apikey: CHAVE_PUB } })).json();
    linha(cfg?.external?.email === true, `login por e-mail/senha  ${cfg?.external?.email}`);
    linha(cfg?.external?.google === true, `login com Google        ${cfg?.external?.google}`);
  } catch (e) {
    linha(false, "nao consegui ler /auth/v1/settings");
  }

  console.log(`\n${falhas === 0 ? "TUDO CERTO" : falhas + " FALHA(S)"} — varredura concluida.\n`);
  process.exit(falhas ? 1 : 0);
})();
