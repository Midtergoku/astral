/* ═══════════════════════════════════════════════════════════════════════════
   TESTA-LIGHTHOUSE -- a auditoria oficial do Google (Lighthouse), pagina por pagina
   (08/10/2026 -- pedido dele: refazer o 3.10 e o 3.11 com o Chrome DevTools)

   O testa-acessivel mede contraste, campo e alvo de toque. O Lighthouse mede
   o que ele nao pergunta: ordem dos titulos, regiao principal da pagina, nome
   acessivel de botao/link, rotulo de campo, lingua, idioma, boas praticas
   (erros no console, imagem esticada, HTTPS) e busca (titulo, descricao,
   indexavel). Na primeira passada (pagina inicial, 08/10): acessibilidade 93 --
   titulos fora de ordem e sem a regiao <main>. Nenhum teste nosso pegava.

   Roda pelo modo de linha de comando do chrome-devtools-mcp (o navegador e o
   Chromium do Playwright -- nao ha Chrome instalado), CELULAR, contra o SITE NO AR:
     - pagina publica: auditoria completa (abre do zero)
     - pagina logada: conta de teste de verdade (criada e apagada), sessao no
       navegador, e auditoria do estado da tela ja carregada
   Pagina que so redireciona (edital, recursos) e pulada.

   USO   node tools/testa-lighthouse.js              (todas as paginas)
         node tools/testa-lighthouse.js index login  (so as que casam)
         --tudo   lista cada elemento reprovado
   Nao gasta credito. Envio de estatistica ao Google DESLIGADO
   (--no-usage-statistics --no-performance-crux).
   ═══════════════════════════════════════════════════════════════════════════ */
const { execSync, execFileSync } = require("child_process");
const crypto = require("crypto");
const fs = require("fs");
const os = require("os");
const path = require("path");

const SITE = "https://astral-psi.vercel.app";
const REF = "jjogmcacbdefwiwcyjxp";
const BASE = `https://${REF}.supabase.co`;
const RAIZ = path.resolve(__dirname, "..");
const TUDO = process.argv.includes("--tudo");
const FILTRO = process.argv.slice(2).filter((a) => !a.startsWith("--"));

// O CLI do chrome-devtools-mcp, chamado pelo node (no Windows o atalho .cmd nao roda sem shell)
const GLOBAL = execSync("npm root -g", { encoding: "utf8" }).trim();
const CLI = path.join(GLOBAL, "chrome-devtools-mcp", "build", "src", "bin", "chrome-devtools.js");
if (!fs.existsSync(CLI)) { console.log("TESTA-LIGHTHOUSE -- pulado: rode  npm i chrome-devtools-mcp@latest -g"); process.exit(0); }
const cdt = (args, timeout = 180000) => execFileSync(process.execPath, [CLI, ...args], { encoding: "utf8", timeout, stdio: ["ignore", "pipe", "pipe"] });
function chromium() {
  const base = path.join(process.env.LOCALAPPDATA || "", "ms-playwright");
  if (!fs.existsSync(base)) return null;
  for (const d of fs.readdirSync(base).filter((x) => /^chromium-\d+$/.test(x)).sort().reverse()) {
    for (const sub of ["chrome-win64", "chrome-win"]) { const p = path.join(base, d, sub, "chrome.exe"); if (fs.existsSync(p)) return p; }
  }
  return null;
}

const SK = JSON.parse(execSync(`supabase projects api-keys --project-ref ${REF} -o json`, { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] })).find((k) => k.name === "service_role").api_key;
const PUB = (fs.readFileSync(path.join(RAIZ, "assets/js/astral.js"), "utf8").match(/sb_publishable_[A-Za-z0-9_-]+/) || [])[0];
const admin = { apikey: SK, Authorization: `Bearer ${SK}`, "Content-Type": "application/json" };
async function req(c, o = {}) { const r = await fetch(BASE + c, o); const t = await r.text(); let corpo = null; try { corpo = JSON.parse(t); } catch { corpo = t; } return { status: r.status, corpo }; }

let falhas = 0;
const relatorio = path.join(os.tmpdir(), `astral-lighthouse-${Date.now()}`);
fs.mkdirSync(relatorio, { recursive: true });

/* Onde o navegador esta. O CLI devolve TEXTO: 'Script ran on page and returned:' + um bloco json.
   Se nao der para ler, PARA -- na 1a versao, "nao li" virava "redireciona" e a pagina passava
   sem ser auditada (o teste deu verde sem medir nada, 08/10). */
function caminho(aba) {
  const txt = cdt(["evaluate_script", "() => location.pathname", "--pageId", aba]);
  const m = txt.match(/```json\s*([\s\S]*?)```/);
  if (!m) throw new Error("nao consegui ler onde a pagina esta: " + txt.slice(0, 120));
  const v = JSON.parse(m[1]);
  if (typeof v !== "string" || !v.startsWith("/")) throw new Error("caminho estranho: " + m[1]);
  return v;
}

// A pagina atual do navegador (o numero que o CLI da a cada aba)
function abaAtual() {
  const lista = cdt(["list_pages"]);
  const m = lista.match(/^(\d+):.*\[selected\]/m) || lista.match(/^(\d+):/m);
  return m ? m[1] : "1";
}
function auditar(aba, modo) {
  const pasta = path.join(relatorio, `${Date.now()}`); fs.mkdirSync(pasta);
  cdt(["lighthouse_audit", aba, "--mode", modo, "--device", "mobile", "--outputDirPath", pasta], 240000);
  return JSON.parse(fs.readFileSync(path.join(pasta, "report.json"), "utf8"));
}
/* Reprovacoes ACEITAS, com o motivo (08/10/2026). Nao e para esconder: aparecem na saida como "aceito".
   - captcha: o hCaptcha (protecao contra robo no login e no cadastro) usa cookie de terceiro e uma API
     do navegador em desuso. E codigo DELES; tirar o captcha devolveria o risco de robo (astral-operacao).
   - deslocamento ate 0,1: e o limite "bom" do Google (Core Web Vitals); o Lighthouse tira ponto acima de 0. */
const SO_DO_CAPTCHA = (a) => {
  const itens = (a.details && a.details.items) || [];
  return itens.length > 0 && itens.every((it) => /hcaptcha\.com/.test(JSON.stringify(it)));
};
function aceito(id, a) {
  if (["deprecations", "third-party-cookies"].includes(id) && SO_DO_CAPTCHA(a)) return "codigo do captcha (hCaptcha)";
  if (id === "cumulative-layout-shift" && Number(a.numericValue) <= 0.1) return `deslocamento ${Number(a.numericValue).toFixed(3)} <= 0,1 (limite bom do Google)`;
  return null;
}
function reprovados(r) {
  const out = [];
  // "inspector-issues" so repete os problemas do captcha quando eles sao os unicos
  const soCaptcha = ["deprecations", "third-party-cookies"].every((id) => !r.audits[id] || r.audits[id].score === 1 || SO_DO_CAPTCHA(r.audits[id]));
  for (const [id, a] of Object.entries(r.audits)) {
    if (a.score === null || a.score >= 1 || ["informative", "notApplicable", "manual"].includes(a.scoreDisplayMode)) continue;
    const motivo = aceito(id, a) || (id === "inspector-issues" && soCaptcha ? "avisos do captcha (hCaptcha)" : null);
    if (motivo) { if (TUDO) console.log(`           (aceito) ${id}: ${motivo}`); continue; }
    const itens = ((a.details && a.details.items) || []).map((it) => `${((it.node && it.node.snippet) || it.url || it.source || "").toString().slice(0, 110)}`);
    out.push({ id, titulo: a.title, itens });
  }
  return out;
}

(async () => {
  let uid = null;
  try {
    const exe = chromium();
    if (!exe) throw new Error("Chromium do Playwright nao encontrado (npx playwright install chromium)");
    try { cdt(["stop"], 30000); } catch { /* nao estava rodando */ }
    cdt(["start", "--executablePath", exe, "--headless", "--isolated", "--no-usage-statistics", "--no-performance-crux"], 90000);

    // conta de verdade com edital, materias, rotina e sessoes: as telas cheias
    const email = `lighthouse-${Date.now()}@astral-teste.local`;
    const u = await req("/auth/v1/admin/users", { method: "POST", headers: admin, body: JSON.stringify({ email, password: "T!" + crypto.randomUUID(), email_confirm: true }) });
    uid = u.corpo.id;
    const link = await req("/auth/v1/admin/generate_link", { method: "POST", headers: admin, body: JSON.stringify({ type: "magiclink", email }) });
    const s = (await req("/auth/v1/verify", { method: "POST", headers: { apikey: PUB, "Content-Type": "application/json" }, body: JSON.stringify({ type: "magiclink", token_hash: link.corpo.hashed_token }) })).corpo;
    const cab = { apikey: PUB, Authorization: `Bearer ${s.access_token}`, "Content-Type": "application/json" };
    const materias = [{ nome: "Português", peso: 40, progresso: 0 }, { nome: "Matemática", peso: 40, progresso: 0 }, { nome: "História", peso: 20, progresso: 0 }];
    const salvar = () => req("/rest/v1/rpc/salvar_progresso", { method: "POST", headers: cab, body: JSON.stringify({ p_xp: 0, p_streak: 0, p_horas: 0,
      p_edital: { nome: "Teste Lighthouse ESA", forca: "exercito", patenteInicial: null, hash: "c".repeat(64) }, p_materias: materias, p_cronograma_hoje: [], p_badges: [], p_tag_escolhida: null }) });
    await salvar();
    await req(`/rest/v1/progresso?usuario_id=eq.${uid}`, { method: "PATCH", headers: admin, body: JSON.stringify({ rotina: { dias: [0, 1, 2, 3, 4, 5, 6], minutosUtil: 120, minutosFds: 120, bloco: 40 } }) });
    await req("/rest/v1/sessoes_estudo", { method: "POST", headers: { ...admin, Prefer: "return=minimal" },
      body: JSON.stringify(Array.from({ length: 12 }, (_, i) => ({ usuario_id: uid, materia: materias[i % 3].nome, segundos: 3600, xp: 120, modo: "livre", criado_em: new Date(Date.now() - (12 - i) * 86400000).toISOString() }))) });
    await salvar();
    /* 09/10/2026: o painel monta o GUIA de professores por tras (buscar-recursos, IA de verdade) para
       toda materia sem guia salvo. No 1o dia do vigia (3.15) este teste gerou 18 "IA indisponivel" na
       producao -- custo zero so porque nao ha credito. Com credito, cada rodada GASTARIA. A conta de
       teste ja nasce com o guia salvo: o painel pula, e o site no ar nao chama a IA. */
    await req("/rest/v1/recursos_salvos", { method: "POST", headers: { ...admin, Prefer: "return=minimal" },
      body: JSON.stringify(materias.map((m) => ({ usuario_id: uid, materia: m.nome, concurso: "Teste Lighthouse ESA", dados: { professores: [] } }))) });
    const inicioIso = new Date().toISOString();
    const sessao = JSON.stringify({ access_token: s.access_token, refresh_token: s.refresh_token, token_type: "bearer", expires_at: Math.floor(Date.now() / 1000) + 3600, user: s.user });

    const paginas = fs.readdirSync(RAIZ).filter((f) => f.endsWith(".html")).sort()
      .filter((f) => !FILTRO.length || FILTRO.some((x) => f.includes(x)));
    console.log(`\nTESTA-LIGHTHOUSE  ${paginas.length} paginas, celular, ${SITE}\n`);
    console.log(`  ${"pagina".padEnd(22)} acess. pratic. busca  (reprovados)`);
    const total = {};
    let logado = false;
    cdt(["new_page", `${SITE}/`], 90000);
    const aba = abaAtual();
    for (const pagina of paginas) {
      const url = pagina === "index.html" ? `${SITE}/` : `${SITE}/${pagina}`;
      // 1. como visitante
      if (logado) { cdt(["evaluate_script", "() => { localStorage.clear(); return true; }", "--pageId", aba]); logado = false; }
      cdt(["navigate_page", aba, "--url", url, "--timeout", "60000"], 90000);
      await new Promise((r) => setTimeout(r, 2500));
      let onde = caminho(aba);
      let modo = "navigation";
      if (!onde.endsWith("/" + pagina) && !(pagina === "index.html" && onde === "/")) {
        // 2. pagina da area logada: a sessao e o aceite no navegador, como depois de entrar
        cdt(["evaluate_script", `() => { localStorage.setItem("sb-${REF}-auth-token", ${JSON.stringify(sessao)});
          localStorage.setItem("astral_aceite_pendente", JSON.stringify({ origem: "google", email: null, em: Date.now() }));
          localStorage.setItem("astral_nascimento_pendente", "2000-01-01"); return true; }`, "--pageId", aba]);
        logado = true;
        cdt(["navigate_page", aba, "--url", url, "--timeout", "60000"], 90000);
        await new Promise((r) => setTimeout(r, 6000));   // o painel busca no banco antes de desenhar
        onde = caminho(aba);
        if (!onde.endsWith("/" + pagina)) { console.log(`  --     ${pagina.padEnd(22)} redireciona para ${onde}`); continue; }
        modo = "snapshot";   // a auditoria "do zero" limparia a sessao: mede a tela como o aluno a ve
      }
      const r = auditar(aba, modo);
      const nota = (k) => (r.categories[k] && r.categories[k].score != null ? String(Math.round(r.categories[k].score * 100)) : "--").padStart(5);
      // Pagina "noindex" (area logada, roadmap 3.11) esta fora da busca DE PROPOSITO: a nota de
      // busca dela nao vale (o Lighthouse cobraria descricao de uma tela que ninguem acha no Google).
      const noindex = /<meta name="robots" content="[^"]*noindex/.test(fs.readFileSync(path.join(RAIZ, pagina), "utf8"));
      const daBusca = new Set(noindex ? (r.categories.seo?.auditRefs || []).map((x) => x.id) : []);
      const ruins = reprovados(r).filter((x) => !daBusca.has(x.id));
      if (noindex && r.categories.seo) r.categories.seo.score = null;   // mostra "--" na coluna busca
      for (const x of ruins) total[x.id] = (total[x.id] || 0) + 1;
      console.log(`  ${ruins.length ? "FALHA" : "OK   "}  ${pagina.padEnd(22)}${nota("accessibility")}  ${nota("best-practices")}  ${nota("seo")}   ${ruins.map((x) => x.id).join(", ")}`);
      if (ruins.length) falhas++;
      if (TUDO) for (const x of ruins) { console.log(`           ${x.id} -- ${x.titulo}`); for (const it of x.itens.slice(0, 6)) console.log(`              ${it}`); }
    }
    console.log(`\n  reprovacoes por regra: ${Object.entries(total).sort((a, b) => b[1] - a[1]).map(([k, n]) => `${k} (${n})`).join(", ") || "nenhuma"}`);
    console.log(`  relatorios completos (HTML): ${relatorio}`);
    // o site no ar NAO pode ter chamado a IA para a conta de teste (o guia ja nasceu salvo)
    const ia = await req(`/rest/v1/falhas_servidor?funcao=eq.buscar-recursos&criado_em=gte.${encodeURIComponent(inicioIso)}&select=id`, { headers: admin });
    const chamou = Array.isArray(ia.corpo) ? ia.corpo.length : -1;
    if (chamou === 0) console.log("  OK     a conta de teste não chamou a IA (guia já salvo)");
    else { console.log(`  FALHA  o site chamou a IA ${chamou} vez(es) para a conta de teste -- com crédito, isto GASTA`); falhas++; }
  } catch (e) {
    console.log("  FALHA  o teste quebrou:", String(e.message || e).slice(0, 200)); falhas++;
  } finally {
    try { cdt(["stop"], 30000); } catch { /* ja parado */ }
    if (uid) await req(`/auth/v1/admin/users/${uid}`, { method: "DELETE", headers: admin });
    console.log("\n  (conta de teste apagada)");
    console.log("\n" + "=".repeat(70));
    console.log(falhas === 0 ? "O LIGHTHOUSE APROVA TODAS AS PÁGINAS NO CELULAR." : `🔴 ${falhas} PÁGINA(S) COM REPROVAÇÃO NO LIGHTHOUSE.`);
    process.exit(falhas ? 1 : 0);
  }
})();
