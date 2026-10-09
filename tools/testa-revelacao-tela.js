/* ═══════════════════════════════════════════════════════════════════════════
   TESTA-REVELACAO-TELA -- o que a pessoa ve ao subir o edital e HONESTO?

   POR QUE EXISTE (30/09/2026)
   Em 29/09 a tela segurava o "lendo seu edital" por 12 s no minimo, com 5
   etapas fingidas, para o edital ja guardado parecer feito na hora. Em 30/09
   ele mudou a decisao: nada de simular a IA trabalhando. No lugar, uma
   revelacao de 2 a 4 s em que cada linha e um dado REAL do edital da pessoa.

   Este teste sobe um PDF cujo resultado ja esta guardado (nao gasta credito:
   nenhuma IA e chamada; o guia de professores e bloqueado na rede) e mede:

     1. nao ha mais espera artificial: a revelacao comeca em poucos segundos
     2. cada linha traz o dado real: concurso, data e dias, 2 materias,
        as 15 sessoes e 7h30 da rotina plantada, a patente
     3. nao aparece "Edital verificado" (nao existe revisao humana)
     4. a revelacao dura de 2 a 4,5 s e o painel aparece no fim
     5. nenhum erro de JavaScript -- em 1280px e em 390px (celular)

   USO   node tools/testa-revelacao-tela.js    (fotos no scratch do sistema)
   ═══════════════════════════════════════════════════════════════════════════ */

const { execSync } = require("child_process");
const crypto = require("crypto");
const fs = require("fs");
const http = require("http");
const os = require("os");
const path = require("path");

const REF = "jjogmcacbdefwiwcyjxp";
const BASE = `https://${REF}.supabase.co`;
const RAIZ = path.resolve(__dirname, "..");
// 5173: uma das origens que o servidor aceita (CORS em _shared/comum.ts).
const PORTA = 5173;

function acharPlaywright() {
  try { return require("playwright"); } catch { /* segue procurando */ }
  const base = process.env.LOCALAPPDATA
    ? path.join(process.env.LOCALAPPDATA, "npm-cache", "_npx")
    : path.join(os.homedir(), ".npm", "_npx");
  if (!fs.existsSync(base)) return null;
  for (const d of fs.readdirSync(base)) {
    const alvo = path.join(base, d, "node_modules", "playwright");
    if (fs.existsSync(alvo)) { try { return require(alvo); } catch { /* proximo */ } }
  }
  return null;
}
const pw = acharPlaywright();
if (!pw) { console.log("TESTA-REVELACAO-TELA -- pulado: playwright nao encontrado."); process.exit(0); }

const chaves = JSON.parse(execSync(`supabase projects api-keys --project-ref ${REF} -o json`,
  { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }));
const SK = chaves.find((k) => k.name === "service_role").api_key;
const PUB = (fs.readFileSync(path.join(RAIZ, "assets/js/astral.js"), "utf8").match(/sb_publishable_[A-Za-z0-9_-]+/) || [])[0];
const admin = { apikey: SK, Authorization: `Bearer ${SK}`, "Content-Type": "application/json" };
async function req(c, o) { const r = await fetch(BASE + c, o); const t = await r.text(); try { return JSON.parse(t); } catch { return null; } }

let falhas = 0;
const ok = (t, d = "") => console.log(`  OK     ${t.padEnd(56)} ${d}`);
const falha = (t, d = "") => { console.log(`  FALHA  ${t.padEnd(56)} ${d}`); falhas++; };

const tipos = { ".html": "text/html", ".css": "text/css", ".js": "text/javascript", ".woff2": "font/woff2", ".svg": "image/svg+xml" };
const servidor = http.createServer((q, r) => {
  const u = decodeURIComponent(q.url.split("?")[0]);
  const arq = path.join(RAIZ, u === "/" ? "/index.html" : u);
  if (!path.resolve(arq).startsWith(RAIZ) || !fs.existsSync(arq) || fs.statSync(arq).isDirectory()) { r.writeHead(404); return r.end("404"); }
  r.writeHead(200, { "Content-Type": tipos[path.extname(arq)] || "text/plain" });
  r.end(fs.readFileSync(arq));
});

// Prova daqui a 60 dias, no formato que a IA devolve (dd/mm/aaaa).
const prova = new Date(new Date().toDateString()); prova.setDate(prova.getDate() + 60);
const DATA = `${String(prova.getDate()).padStart(2, "0")}/${String(prova.getMonth() + 1).padStart(2, "0")}/${prova.getFullYear()}`;
const RESULTADO = { concurso: "Teste Revelacao CBM 2026", dataProva: DATA, forca: "bombeiros", patenteInicial: null,
  materias: [{ nome: "Física", questoes: 10, peso: 50 }, { nome: "Química", questoes: 10, peso: 50 }] };
// A rotina e respondida PELA TELA, no questionario da primeira vez, com o padrao:
// seg a sab, 2h, sessoes de 40 min -- o proprio questionario diz "18 sessoes e 12h".

(async () => {
  const pdf = Buffer.from(`%PDF-1.4\n% revelacao-${Date.now()}\n1 0 obj << /Type /Pages /Count 3 >> endobj\n%%EOF\n`);
  const hash = crypto.createHash("sha256").update(pdf).digest("hex");
  const pdfArq = path.join(os.tmpdir(), `astral-revelacao-${Date.now()}.pdf`);
  fs.writeFileSync(pdfArq, pdf);
  const fotos = path.join(os.tmpdir(), "astral-revelacao");
  fs.mkdirSync(fotos, { recursive: true });

  const contas = [];
  let nav = null;
  await new Promise((r) => servidor.listen(PORTA, r));
  try {
    console.log("\nTESTA-REVELACAO-TELA -- o edital lido mostra dado real, sem espera fingida\n");
    await req("/rest/v1/editais_lidos", { method: "POST", headers: { ...admin, Prefer: "return=minimal" },
      body: JSON.stringify({ hash, resultado: RESULTADO, paginas: 3 }) });
    nav = await pw.chromium.launch();

    for (const [largura, altura] of [[1280, 1000], [390, 844]]) {
      console.log(`== ${largura}px ==`);
      // 03/10/2026 (2.15): no celular o guia de Fisica ja esta guardado -- a
      // linha do guia tem de dizer "1 de 2", nao "sendo montado".
      if (largura === 390) await req("/rest/v1/guias_por_edital", { method: "POST", headers: { ...admin, Prefer: "return=minimal" },
        body: JSON.stringify({ edital_hash: hash, materia: "Física", dados: { professores: [] } }) });
      const email = `revela-${largura}-${Date.now()}@astral-teste.local`;
      const u = await req("/auth/v1/admin/users", { method: "POST", headers: admin,
        body: JSON.stringify({ email, password: "T!" + crypto.randomUUID(), email_confirm: true }) });
      contas.push(u.id);
      const link = await req("/auth/v1/admin/generate_link", { method: "POST", headers: admin, body: JSON.stringify({ type: "magiclink", email }) });
      const s = await req("/auth/v1/verify", { method: "POST", headers: { apikey: PUB, "Content-Type": "application/json" },
        body: JSON.stringify({ type: "magiclink", token_hash: link.hashed_token }) });

      const ctx = await nav.newContext({ viewport: { width: largura, height: altura } });
      await ctx.addInitScript(require("./testes/aceite-de-teste.js").SCRIPT);   // 02/10/2026: o aceite (LGL-01)
      await ctx.addInitScript(`localStorage.setItem("sb-${REF}-auth-token", ${JSON.stringify(JSON.stringify({
        access_token: s.access_token, refresh_token: s.refresh_token, token_type: "bearer",
        expires_at: Math.floor(Date.now() / 1000) + 3600, user: s.user }))});`);
      const pg = await ctx.newPage();
      const erros = [];
      pg.on("pageerror", (e) => erros.push(String(e.message)));
      // O guia de professores chamaria a IA: bloqueado aqui, o teste nao gasta credito.
      let guiaPedido = 0;
      await pg.route("**/functions/v1/buscar-recursos", (r) => { guiaPedido++; r.fulfill({ status: 402, contentType: "application/json", body: '{"error":"sem credito (teste)"}' }); });

      await pg.goto(`http://localhost:${PORTA}/dashboard.html`, { waitUntil: "load" });
      await pg.waitForSelector("#upload-area", { state: "visible", timeout: 15000 });
      /* 09/10/2026 (3.14, EDI-04): o questionario de rotina NAO abre mais antes do edital --
         abria por cima e se misturava com a falha da leitura. Ele vem depois da 1a leitura certa. */
      await pg.waitForTimeout(1500);
      (await pg.$(".rotina-fundo")) === null ? ok("sem edital, o questionário de rotina espera") : falha("o questionário abriu antes do edital");
      // Todo titulo que aparecer durante a espera (2.15): edital guardado nao e lido.
      await pg.evaluate(() => {
        window.__titulos = [];
        const h = document.querySelector("[data-ai-titulo]");
        new MutationObserver(() => window.__titulos.push(h.textContent)).observe(h, { childList: true, characterData: true, subtree: true });
      });
      const t0 = Date.now();
      await pg.setInputFiles("#file-input", pdfArq);

      await pg.waitForSelector(".ai-revela li", { timeout: 20000 }).catch(() => null);
      const inicio = Date.now() - t0;
      await pg.waitForTimeout(2600);
      await pg.screenshot({ path: path.join(fotos, `revelacao-${largura}.png`) });
      const texto = ((await pg.textContent("[data-ai-lista]").catch(() => "")) || "").replace(/\s+/g, " ");
      const titulo = (await pg.textContent("[data-ai-titulo]").catch(() => "")) || "";

      inicio < 8000 ? ok("sem espera fingida: a revelação começa rápido", `${(inicio / 1000).toFixed(1)} s (era 12 s no mínimo)`)
        : falha("a revelação demorou", `${(inicio / 1000).toFixed(1)} s`);
      /pronto/i.test(titulo) ? ok("título muda para o plano pronto", titulo.trim()) : falha("título", titulo);
      const esperados = [
        [RESULTADO.concurso, "o concurso"],
        [DATA, "a data da prova"],
        ["(60 dias)", "os dias que faltam"],
        ["2 matérias", "o número de matérias"],
        ["18 sessões", "as sessões da rotina dela"],
        ["12h por semana", "as horas por semana"],
        // 09/10/2026 (3.14): a rotina e perguntada DEPOIS -- a revelacao usa o padrao e diz isso
        ["a seguir você conta a sua", "que a rotina dela vem a seguir"],
        ["Aluno-Soldado BM", "a patente inicial de bombeiro"],
      ];
      for (const [trecho, oque] of esperados) {
        texto.includes(trecho) ? ok(`mostra ${oque}`, trecho) : falha(`não mostrou ${oque}`, texto.slice(-110));
      }
      /verificad/i.test(texto) ? falha("🚨 diz 'verificado' sem existir revisão") : ok("não promete 'edital verificado'");
      const titulos = await pg.evaluate(() => window.__titulos || []);
      !titulos.some((x) => /Lendo/i.test(x))
        ? ok("🎯 edital guardado: nunca diz 'Lendo seu edital'", titulos.filter((x, i, a) => a.indexOf(x) === i).join(" → "))
        : falha("disse 'Lendo' sem ler nada", titulos.join(" → "));
      const linhaGuia = (texto.match(/Guia de professores:[^.]*?(painel|agora)/) || [""])[0];
      (largura === 390 ? /1 de 2/.test(linhaGuia) : /sendo montado agora/.test(linhaGuia))
        ? ok("🎯 a linha do guia diz o que é verdade", linhaGuia)
        : falha("a linha do guia mente", linhaGuia || texto.slice(-120));

      // O painel ja aparece para conta nova; o fim da revelacao e a secao de upload sumir.
      await pg.waitForSelector("#upload-section", { state: "hidden", timeout: 8000 }).catch(() => null);
      const total = Date.now() - t0 - inicio;
      const painel = (await pg.isVisible("#main-content")) && !(await pg.isVisible("#upload-section"));
      painel && total >= 2000 && total <= 4500 + 1500
        ? ok("a revelação dura pouco e o painel aparece", `~${(total / 1000).toFixed(1)} s até o painel`)
        : falha("duração da revelação", `${(total / 1000).toFixed(1)} s, painel ${painel}`);
      const faixa = (await pg.textContent("#edital-nome").catch(() => "")) || "";
      faixa.includes(RESULTADO.concurso) ? ok("o painel mostra o edital novo") : falha("faixa do edital", faixa);
      // e AGORA o questionario de rotina, uma vez so (3.14)
      const pergunta = await pg.waitForSelector("#rotina-ok", { timeout: 8000 }).then(() => true).catch(() => false);
      pergunta ? ok("🎯 depois do edital lido, o questionário de rotina abre") : falha("o questionário de rotina não abriu depois do edital");
      if (pergunta) await pg.click("#rotina-ok");
      await pg.waitForTimeout(2500);
      guiaPedido > 0 ? ok("o guia de professores começa na hora", `${guiaPedido} pedido(s), bloqueados no teste`)
        : falha("o guia não começou depois do edital");
      erros.length ? falha("erro de JavaScript", erros[0].slice(0, 80)) : ok("nenhum erro de JavaScript");
      await pg.screenshot({ path: path.join(fotos, `painel-${largura}.png`) });
      await ctx.close();
    }

    /* 03/10/2026 (2.15): o outro lado -- edital NOVO, que a IA le de verdade e
       demora. A resposta e segurada 9 s: "Lendo seu edital" TEM de aparecer
       (depois de 8 s). Resposta fingida pelo teste: nao chama a IA. */
    console.log("== edital novo (resposta lenta) ==");
    {
      const email = `revela-lento-${Date.now()}@astral-teste.local`;
      const u = await req("/auth/v1/admin/users", { method: "POST", headers: admin,
        body: JSON.stringify({ email, password: "T!" + crypto.randomUUID(), email_confirm: true }) });
      contas.push(u.id);
      const link = await req("/auth/v1/admin/generate_link", { method: "POST", headers: admin, body: JSON.stringify({ type: "magiclink", email }) });
      const s = await req("/auth/v1/verify", { method: "POST", headers: { apikey: PUB, "Content-Type": "application/json" },
        body: JSON.stringify({ type: "magiclink", token_hash: link.hashed_token }) });
      const ctx = await nav.newContext({ viewport: { width: 1280, height: 1000 } });
      await ctx.addInitScript(require("./testes/aceite-de-teste.js").SCRIPT);
      await ctx.addInitScript(`localStorage.setItem("sb-${REF}-auth-token", ${JSON.stringify(JSON.stringify({
        access_token: s.access_token, refresh_token: s.refresh_token, token_type: "bearer",
        expires_at: Math.floor(Date.now() / 1000) + 3600, user: s.user }))});`);
      const pg = await ctx.newPage();
      await pg.route("**/functions/v1/buscar-recursos", (r) => r.fulfill({ status: 402, contentType: "application/json", body: '{"error":"teste"}' }));
      await pg.route("**/functions/v1/processar-edital", async (r) => {
        await new Promise((ok) => setTimeout(ok, 9000));
        r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ success: true, data: { ...RESULTADO, hash: "f".repeat(64) } }) });
      });
      await pg.goto(`http://localhost:${PORTA}/dashboard.html`, { waitUntil: "load" });
      await pg.waitForSelector("#upload-area", { state: "visible", timeout: 15000 });
      await pg.waitForTimeout(800);       // 3.14: sem questionario antes do edital
      await pg.evaluate(() => {
        window.__titulos = [];
        const h = document.querySelector("[data-ai-titulo]");
        new MutationObserver(() => window.__titulos.push(h.textContent)).observe(h, { childList: true, characterData: true, subtree: true });
      });
      await pg.setInputFiles("#file-input", pdfArq);
      await pg.waitForSelector(".ai-revela li", { timeout: 25000 }).catch(() => null);
      await pg.waitForTimeout(1500);
      const titulos = await pg.evaluate(() => window.__titulos || []);
      const vistos = titulos.filter((x, i, a) => a.indexOf(x) === i);
      vistos[0] === "Recebendo seu edital." && vistos.includes("Lendo seu edital.") && vistos.includes("Seu plano está pronto.")
        ? ok("🎯 edital novo e lento: aí sim diz 'Lendo seu edital'", vistos.join(" → "))
        : falha("a sequência de títulos do edital novo", vistos.join(" → "));
      await ctx.close();
    }
  } catch (e) {
    falha("erro no teste: " + e.message);
  } finally {
    if (nav) await nav.close();
    servidor.close();
    await fetch(`${BASE}/rest/v1/editais_lidos?hash=eq.${hash}`, { method: "DELETE", headers: admin });
    await fetch(`${BASE}/rest/v1/guias_por_edital?edital_hash=eq.${hash}`, { method: "DELETE", headers: admin });
    for (const id of contas) await fetch(`${BASE}/auth/v1/admin/users/${id}`, { method: "DELETE", headers: admin });
    try { fs.unlinkSync(pdfArq); } catch { /* temporario */ }
    console.log(`\n  (${contas.length} contas e o edital plantado apagados · fotos em ${fotos})`);
  }
  console.log("\n" + "=".repeat(74));
  console.log(falhas ? `🔴 ${falhas} FALHA(S).` : "A REVELAÇÃO É HONESTA: dado real do edital, sem espera fingida.");
  process.exit(falhas ? 1 : 0);
})();
