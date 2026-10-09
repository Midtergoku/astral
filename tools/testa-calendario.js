/* ═══════════════════════════════════════════════════════════════════════════
   TESTA-CALENDARIO -- a prova importada do edital, e o cartao do evento.

   POR QUE EXISTE (28/09/2026)
   Ele mandou a imagem: a prova aparecia DUAS vezes, com a palavra
   "documento" escrita por cima do icone e o botao de editar vazio.
   - duplicada: `criarEvento` descartava a `origem`, entao o calendario nunca
     achava a prova ja importada e importava de novo a cada visita
   - "documento": o cartao escrevia o NOME do icone em vez de desenha-lo
   - botao vazio: o icone entrava depois de os icones terem sido desenhados

   Abre o calendario TRES vezes com uma conta que tem edital com data de
   prova, e exige: uma prova so, icone desenhado, nenhum nome de icone como
   texto, e os dois botoes do mesmo tamanho.

   USO   node tools/testa-calendario.js [--foto caminho.png]
   ═══════════════════════════════════════════════════════════════════════════ */

const { execSync } = require("child_process");
const fs = require("fs");
const http = require("http");
const path = require("path");

const { REF, reescrever } = require("./testes/alvo");   // 09/10/2026 (COD-02): ASTRAL_DEV=1 -> astral-dev (tools/testes/alvo.js)
const BASE = `https://${REF}.supabase.co`;
const RAIZ = path.resolve(__dirname, "..");
const PORTA = 8890;
const FOTO = (() => { const i = process.argv.indexOf("--foto"); return i > 0 ? process.argv[i + 1] : null; })();

function acharPlaywright() {
  try { return require("playwright"); } catch { /* segue procurando */ }
  const base = process.env.LOCALAPPDATA
    ? path.join(process.env.LOCALAPPDATA, "npm-cache", "_npx")
    : path.join(require("os").homedir(), ".npm", "_npx");
  if (!fs.existsSync(base)) return null;
  for (const d of fs.readdirSync(base)) {
    const alvo = path.join(base, d, "node_modules", "playwright");
    if (fs.existsSync(alvo)) { try { return require(alvo); } catch { /* proximo */ } }
  }
  return null;
}
const pw = acharPlaywright();
if (!pw) { console.log("TESTA-CALENDARIO -- pulado: playwright nao encontrado."); process.exit(0); }

const chaves = JSON.parse(execSync(`supabase projects api-keys --project-ref ${REF} -o json`,
  { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }));
const SK = chaves.find((k) => k.name === "service_role").api_key;
const PUB = require("./testes/alvo").PUB;
const admin = { apikey: SK, Authorization: `Bearer ${SK}`, "Content-Type": "application/json" };
async function req(c, o) { const r = await fetch(BASE + c, o); const t = await r.text(); try { return JSON.parse(t); } catch { return null; } }

let falhas = 0;
const ok = (t, d = "") => console.log(`  OK     ${t.padEnd(52)} ${d}`);
const falha = (t, d = "") => { console.log(`  FALHA  ${t.padEnd(52)} ${d}`); falhas++; };

const tipos = { ".html": "text/html", ".css": "text/css", ".js": "text/javascript", ".woff2": "font/woff2", ".svg": "image/svg+xml" };
const servidor = http.createServer((q, r) => {
  const u = decodeURIComponent(q.url.split("?")[0]);
  const arq = path.join(RAIZ, u === "/" ? "/index.html" : u);
  if (!path.resolve(arq).startsWith(RAIZ) || !fs.existsSync(arq) || fs.statSync(arq).isDirectory()) { r.writeHead(404); return r.end("404"); }
  r.writeHead(200, { "Content-Type": tipos[path.extname(arq)] || "text/plain" });
  r.end(reescrever(arq, fs.readFileSync(arq)));
});

(async () => {
  const email = `calendario-${Date.now()}@astral-teste.local`;
  const u = await req("/auth/v1/admin/users", { method: "POST", headers: admin,
    body: JSON.stringify({ email, password: "T!" + crypto.randomUUID(), email_confirm: true }) });
  let nav = null;
  await new Promise((r) => servidor.listen(PORTA, r));
  try {
    console.log("\nTESTA-CALENDARIO -- a prova do edital e o cartao do evento\n");
    await req("/rest/v1/progresso", { method: "POST", headers: { ...admin, Prefer: "return=minimal" },
      body: JSON.stringify({ usuario_id: u.id, materias: [], edital: { nome: "Teste Bombeiro", dataProva: "06/12/2026" } }) });
    const link = await req("/auth/v1/admin/generate_link", { method: "POST", headers: admin, body: JSON.stringify({ type: "magiclink", email }) });
    const s = await req("/auth/v1/verify", { method: "POST", headers: { apikey: PUB, "Content-Type": "application/json" },
      body: JSON.stringify({ type: "magiclink", token_hash: link.hashed_token }) });

    nav = await pw.chromium.launch();
    const ctx = await nav.newContext({ viewport: { width: 1280, height: 900 } });
    await ctx.addInitScript(require("./testes/aceite-de-teste.js").SCRIPT);   // 02/10/2026: o aceite (LGL-01)
    await ctx.addInitScript(`localStorage.setItem("sb-${REF}-auth-token", ${JSON.stringify(JSON.stringify({
      access_token: s.access_token, refresh_token: s.refresh_token, token_type: "bearer",
      expires_at: Math.floor(Date.now() / 1000) + 3600, user: s.user }))});`);
    const pg = await ctx.newPage();
    const erros = [];
    pg.on("pageerror", (e) => erros.push(String(e.message)));

    for (let i = 0; i < 3; i++) {
      await pg.goto(`http://localhost:${PORTA}/calendario.html`, { waitUntil: "load" });
      await pg.waitForTimeout(2500);
    }
    const noBanco = await req(`/rest/v1/eventos?usuario_id=eq.${u.id}&select=id,origem`, { headers: admin });
    noBanco.length === 1 && noBanco[0].origem === "edital_prova"
      ? ok("🎯 3 visitas, UMA prova importada", "com a marca edital_prova")
      : falha("a prova duplicou ou perdeu a marca", JSON.stringify(noBanco));

    const tela = await pg.evaluate(() => {
      const item = document.querySelector(".evento-item");
      if (!item) return null;
      const b = [...item.querySelectorAll(".btn-acao")].map((x) => { const r = x.getBoundingClientRect(); return [Math.round(r.width), Math.round(r.height)]; });
      return {
        itens: document.querySelectorAll(".evento-item").length,
        iconeSvg: !!item.querySelector(".evento-icone svg"),
        textoNoIcone: item.querySelector(".evento-icone").textContent.trim(),
        lapisSvg: !!item.querySelector(".btn-acao svg"),
        botoes: b,
      };
    });
    if (FOTO) await pg.screenshot({ path: FOTO, fullPage: true });

    if (erros.length) falha("erro de JavaScript", erros[0].slice(0, 70));
    else ok("nenhum erro de JavaScript");
    tela?.itens === 1 ? ok("a tela mostra UM evento") : falha("eventos na tela", String(tela?.itens));
    tela?.iconeSvg && !tela.textoNoIcone
      ? ok("🎯 o icone e desenhado, nao escrito", "sem 'documento' na tela")
      : falha("icone do evento", JSON.stringify(tela));
    tela?.lapisSvg ? ok("o botao de editar tem o lapis") : falha("botao de editar vazio");
    const [a, b] = tela?.botoes || [];
    a && b && a[0] === b[0] && a[1] === b[1]
      ? ok("os dois botoes tem o mesmo tamanho", `${a[0]}x${a[1]}`)
      : falha("botoes de tamanhos diferentes", JSON.stringify(tela?.botoes));

    /* ── 2. A PROVA ACOMPANHA O EDITAL (03/10/2026, auditoria CAL-01/CAL-02) ──
       Antes: importada uma vez, nunca mudava. Quem trocava de edital ficava com
       a prova antiga, e o painel mostrava as duas. Apagar nao adiantava: ela
       voltava na visita seguinte. */
    console.log("\n== 2. TROCAR DE EDITAL, APAGAR A PROVA ==");
    pg.on("dialog", (d) => d.accept());
    const trocarEdital = (nome, dataProva) => req(`/rest/v1/progresso?usuario_id=eq.${u.id}`, { method: "PATCH",
      headers: { ...admin, Prefer: "return=minimal" }, body: JSON.stringify({ edital: { nome, dataProva } }) });
    const importadas = async () => (await req(`/rest/v1/eventos?usuario_id=eq.${u.id}&origem=eq.edital_prova&select=id,nome,data,categoria`, { headers: admin })) || [];
    await trocarEdital("Teste EEAR", "20/03/2027");
    // Um evento DEPOIS da prova: o "proximo evento" tem de ser a prova.
    await req("/rest/v1/eventos", { method: "POST", headers: { ...admin, Prefer: "return=minimal" },
      body: JSON.stringify({ usuario_id: u.id, nome: "Resultado final", data: "2027-04-30", categoria: "resultado" }) });
    await pg.goto(`http://localhost:${PORTA}/calendario.html`, { waitUntil: "load" });
    await pg.waitForTimeout(3000);
    let imp = await importadas();
    imp.length === 1 && imp[0].data === "2027-03-20" && imp[0].nome === "Prova — Teste EEAR"
      ? ok("🎯 trocou de edital: a prova do calendário é a NOVA", "20/03/2027, a mesma linha")
      : falha("a prova antiga ficou no calendário", JSON.stringify(imp));
    const proximo = await pg.evaluate(() => document.getElementById("proximo-evento")?.textContent || "");
    /Prova/.test(proximo) ? ok("'próximo evento' é o mais próximo", proximo) : falha("'próximo evento' pulou a prova", proximo);

    const pd = await ctx.newPage();
    await pd.goto(`http://localhost:${PORTA}/dashboard.html`, { waitUntil: "load" });
    await pd.waitForTimeout(6000);
    const chefe = await pd.evaluate(() => document.getElementById("chefe")?.textContent.replace(/\s+/g, " ") || "");
    /Teste EEAR/.test(chefe) && !/Teste Bombeiro/.test(chefe)
      ? ok("🎯 o quadro do chefe mostra a mesma prova", chefe.trim().slice(0, 60))
      : falha("o chefe mostra outra prova", chefe.trim().slice(0, 80) || "(vazio)");
    await pd.close();

    // Apagar a prova importada: some e NAO volta
    await pg.goto(`http://localhost:${PORTA}/calendario.html`, { waitUntil: "load" });
    await pg.waitForTimeout(3000);
    await pg.evaluate(() => {
      const i = [...document.querySelectorAll(".evento-item")].findIndex((x) => /Prova/.test(x.textContent));
      const b = document.querySelectorAll(".evento-item")[i]?.querySelector(".btn-acao.danger");
      b?.click();
    });
    await pg.waitForTimeout(2000);
    for (let i = 0; i < 2; i++) { await pg.goto(`http://localhost:${PORTA}/calendario.html`, { waitUntil: "load" }); await pg.waitForTimeout(2500); }
    const naTela = await pg.evaluate(() => [...document.querySelectorAll(".evento-item")].map((x) => x.textContent.replace(/\s+/g, " ").trim().slice(0, 30)));
    imp = await importadas();
    !naTela.some((t) => /Prova/.test(t)) && imp.length === 1 && imp[0].categoria === "dispensada"
      ? ok("🎯 a prova apagada NÃO volta", `2 visitas depois, só: ${naTela.join(" | ")}`)
      : falha("a prova apagada voltou", `${JSON.stringify(naTela)} ${JSON.stringify(imp)}`);
    // Edital novo: a prova dele aparece
    await trocarEdital("Teste EsPCEx", "10/10/2027");
    await pg.goto(`http://localhost:${PORTA}/calendario.html`, { waitUntil: "load" });
    await pg.waitForTimeout(3000);
    imp = await importadas();
    const naTela2 = await pg.evaluate(() => [...document.querySelectorAll(".evento-item")].some((x) => /Teste EsPCEx/.test(x.textContent)));
    naTela2 && imp[0]?.categoria === "prova" && imp[0]?.data === "2027-10-10"
      ? ok("trocou de edital de novo: a prova do novo aparece") : falha("a prova do edital novo não apareceu", JSON.stringify(imp));
    if (erros.length) falha("erro de JavaScript", erros[0].slice(0, 70));
    else ok("nenhum erro de JavaScript em toda a sequência");
  } catch (e) {
    falha("erro no teste: " + e.message);
  } finally {
    if (nav) await nav.close();
    servidor.close();
    await fetch(`${BASE}/auth/v1/admin/users/${u.id}`, { method: "DELETE", headers: admin });
    console.log("\n  (conta de teste apagada)");
  }
  console.log("\n" + "=".repeat(70));
  console.log(falhas ? `🔴 ${falhas} FALHA(S).` : "O CALENDARIO IMPORTA A PROVA UMA VEZ E DESENHA O CARTAO INTEIRO.");
  process.exit(falhas ? 1 : 0);
})();
