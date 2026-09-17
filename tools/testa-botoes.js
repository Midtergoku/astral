// TESTA-BOTOES -- cada botao do site FAZ alguma coisa quando clicado?
//
// Clica em cada botao num navegador real e observa se algo mudou: DOM, URL,
// pedido de rede ou seletor de arquivo. Botao que nao faz NADA e botao morto.
//
// Rede toda interceptada e sessao falsa: nada sai para producao.
// Botoes destrutivos (excluir conta, sair) sao PULADOS de proposito.
//
// 🔴 TRES ARMADILHAS QUE ESTE TESTE JA CAIU, e que estao resolvidas aqui.
// Se for mexer, herde as tres -- cada uma gerou um falso positivo grande:
//
//   1. VISIBILIDADE. Usar offsetParent acusou os 11 botoes de menu mobile
//      como mortos: eles existem, mas ficam escondidos acima de 768px.
//      Agora confere display/visibility/opacity/tamanho e os ancestrais.
//   2. OVERLAY. Clicar em sequencia sem fechar o que abriu faz o primeiro
//      modal cobrir a tela -- e TODO botao seguinte parece morto. Agora
//      aperta Escape entre um clique e outro, e clique que nao chega vira
//      "pulado", nunca "morto".
//   3. ESTADO JA ATIVO. Clicar no modo que ja esta selecionado nao muda
//      nada, corretamente. Sem essa regra, o botao "Livre" do cronometro
//      aparecia morto.
//
// Primeira execucao (17/09/2026): 85 botoes, 0 mortos de verdade. Os 3 que
// sobram sao amostras de estilo em estilo.html -- a pagina existe para
// mostrar COMO o botao e, e eles nao tem handler de proposito.
const http = require("http");
const fs = require("fs");
const path = require("path");

function acharPlaywright() {
  try { return require("playwright"); } catch {}
  const base = process.env.LOCALAPPDATA
    ? path.join(process.env.LOCALAPPDATA, "npm-cache", "_npx")
    : path.join(require("os").homedir(), ".npm", "_npx");
  if (!fs.existsSync(base)) return null;
  for (const d of fs.readdirSync(base)) {
    const alvo = path.join(base, d, "node_modules", "playwright");
    if (fs.existsSync(alvo)) { try { return require(alvo); } catch {} }
  }
  return null;
}
const pw = acharPlaywright();
if (!pw) { console.log("playwright nao encontrado"); process.exit(0); }
const { chromium } = pw;

const RAIZ = path.resolve("C:/Users/Lucas/Documents/ASTRAL");
const PORTA = 8890;
const tipos = { ".html": "text/html", ".css": "text/css", ".js": "text/javascript", ".woff2": "font/woff2" };

const servidor = http.createServer((q, r) => {
  const u = decodeURIComponent(q.url.split("?")[0]);
  const a = path.join(RAIZ, u === "/" ? "/index.html" : u);
  if (!path.resolve(a).startsWith(RAIZ) || !fs.existsSync(a) || fs.statSync(a).isDirectory()) { r.writeHead(404); return r.end("404"); }
  r.writeHead(200, { "Content-Type": tipos[path.extname(a)] || "text/plain" });
  r.end(fs.readFileSync(a));
});

// nunca clicar nestes: apagam conta, deslogam, ou levam para fora
const PERIGOSOS = /excluir|deletar|apagar|sair|logout|confirmar exclus|cancelar conta/i;

const PAGINAS = fs.readdirSync(RAIZ).filter((f) => f.endsWith(".html"));

(async () => {
  await new Promise((r) => servidor.listen(PORTA, r));
  const nav = await chromium.launch();

  let totBotoes = 0, totMortos = 0, totPulados = 0, totErros = 0;
  const mortos = [], comErro = [];

  for (const pagina of PAGINAS) {
    const ctx = await nav.newContext({ viewport: { width: 1280, height: 900 } });
    const pg = await ctx.newPage();
    await pg.addInitScript(() => {
      const d = Math.floor(Date.now() / 1000) + 7200;
      localStorage.setItem("sb-jjogmcacbdefwiwcyjxp-auth-token", JSON.stringify({
        access_token: "f", token_type: "bearer", expires_at: d, refresh_token: "f",
        user: { id: "00000000-0000-0000-0000-000000000001", email: "t@e.com",
                user_metadata: { full_name: "Teste Silva" }, aud: "authenticated" },
      }));
    });
    await pg.route("**/rest/v1/**", (r) => r.fulfill({ status: 200, contentType: "application/json", body: "[]" }));
    await pg.route("**/functions/v1/**", (r) => r.fulfill({ status: 200, contentType: "application/json", body: '{"success":true,"data":{}}' }));
    await pg.route("**/auth/v1/**", (r) => r.fulfill({ status: 200, contentType: "application/json", body: "{}" }));

    const errosJs = [];
    pg.on("pageerror", (e) => errosJs.push(String(e.message).slice(0, 70)));

    await pg.goto(`http://localhost:${PORTA}/${pagina}`, { waitUntil: "domcontentloaded" }).catch(() => {});
    await pg.waitForTimeout(900);
    const urlInicial = pg.url();

    const botoes = await pg.$$('button, [role="button"], input[type="submit"]');
    const nesta = [];

    for (let i = 0; i < botoes.length; i++) {
      const b = botoes[i];
      const info = await b.evaluate((el) => ({
        txt: (el.textContent || el.value || el.getAttribute("aria-label") || "").trim().replace(/\s+/g, " ").slice(0, 34),
        id: el.id || "", cls: (el.className || "").toString().split(" ")[0],
        visivel: (() => {
          const cs = getComputedStyle(el); const r = el.getBoundingClientRect();
          if (cs.display === "none" || cs.visibility === "hidden" || cs.opacity === "0") return false;
          if (r.width < 1 || r.height < 1) return false;
          for (let p = el.parentElement; p; p = p.parentElement) {
            const c = getComputedStyle(p);
            if (c.display === "none" || c.visibility === "hidden") return false;
          }
          return true;
        })(),
        abreArquivo: !!el.closest("label") || /arquivo|upload|edital|pdf/i.test(el.id + " " + el.className),
        jaAtivo: /active|selecionad/.test(el.className),
        desativado: el.disabled,
      })).catch(() => null);
      if (!info) continue;
      totBotoes++;
      const nome = info.txt || info.id || info.cls || `botao#${i}`;

      if (PERIGOSOS.test(nome) || PERIGOSOS.test(info.id) || PERIGOSOS.test(info.cls)) {
        totPulados++; nesta.push({ nome, r: "pulado (destrutivo)" }); continue;
      }
      if (!info.visivel) { totPulados++; nesta.push({ nome, r: "pulado (invisivel)" }); continue; }
      if (info.desativado) { totPulados++; nesta.push({ nome, r: "pulado (desativado)" }); continue; }
      if (info.jaAtivo) { totPulados++; nesta.push({ nome, r: "pulado (ja e o estado atual)" }); continue; }

      // fecha overlay aberto pelo clique anterior -- senao ele bloqueia o proximo
      // clique e o botao seguinte parece morto. Foi o que aconteceu na 1a versao.
      await pg.keyboard.press("Escape").catch(() => {});
      await pg.waitForTimeout(250);
      const bloqueado = await pg.evaluate(() => document.querySelectorAll("[data-aberta],[data-aberto],.aberto,.aberta,.modal.show,[open]").length);
      if (bloqueado) { totPulados++; nesta.push({ nome, r: "pulado (overlay aberto na frente)" }); continue; }

      // estado antes
      const antes = await pg.evaluate(() => ({ html: document.body.innerHTML.length, url: location.href }));
      let pediuRede = false, abriuArquivo = false;
      const ouvinteArq = () => { abriuArquivo = true; };
      pg.on("filechooser", ouvinteArq);
      const ouvinte = () => { pediuRede = true; };
      pg.on("request", ouvinte);

      let clicou = true;
      await b.click({ timeout: 1500 }).catch(() => { clicou = false; });
      await pg.waitForTimeout(450);
      pg.off("request", ouvinte);
      pg.off("filechooser", ouvinteArq);

      const depois = await pg.evaluate(() => ({ html: document.body.innerHTML.length, url: location.href })).catch(() => null);
      if (!depois) { nesta.push({ nome, r: "navegou (pagina trocou)" }); continue; }

      const mudouDom = Math.abs(depois.html - antes.html) > 0;
      const navegou = depois.url !== antes.url;
      const fezAlgo = mudouDom || navegou || pediuRede || abriuArquivo;

      if (!clicou) { totPulados++; nesta.push({ nome, r: "pulado (clique nao chegou -- coberto)" }); continue; }
      if (!fezAlgo) { totMortos++; mortos.push(`${pagina}: "${nome}"`); nesta.push({ nome, r: "🔴 NADA ACONTECEU" }); }
      else nesta.push({ nome, r: navegou ? "navegou" : abriuArquivo ? "abriu seletor de arquivo" : mudouDom ? "mudou a tela" : "chamou a rede" });

      // volta se navegou
      if (navegou) { await pg.goto(`http://localhost:${PORTA}/${pagina}`, { waitUntil: "domcontentloaded" }).catch(() => {}); await pg.waitForTimeout(700); }
    }

    if (errosJs.length) { totErros += errosJs.length; comErro.push(`${pagina}: ${[...new Set(errosJs)].join(" | ")}`); }

    const m = nesta.filter((x) => x.r.startsWith("🔴")).length;
    console.log(`  ${pagina.padEnd(22)} ${String(botoes.length).padStart(2)} botoes | ${m ? "🔴 " + m + " mortos" : "todos respondem"}${errosJs.length ? " | " + errosJs.length + " erro(s) JS" : ""}`);
    for (const x of nesta.filter((y) => y.r.startsWith("🔴"))) console.log(`      "${x.nome}"`);
    await ctx.close();
  }

  console.log("");
  console.log(`botoes encontrados: ${totBotoes} | pulados: ${totPulados} | 🔴 mortos: ${totMortos} | erros de JS: ${totErros}`);
  if (mortos.length) { console.log("\nbotoes que nao fizeram nada:"); for (const x of mortos) console.log("  " + x); }
  if (comErro.length) { console.log("\npaginas com erro de JS:"); for (const x of comErro) console.log("  " + x); }

  await nav.close();
  servidor.close();
})();
