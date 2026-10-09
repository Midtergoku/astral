/* ═══════════════════════════════════════════════════════════════════════════
   TESTA-BARRA-LATERAL -- da para chegar em todas as opcoes do menu numa tela baixa?
   (09/10/2026 -- pedido dele, roadmap 3.28)

   Ele: "a barra lateral se adequar a qualquer tela; na tela do servico ela ficou
   pequena e sumiram algumas opcoes, tambem nao podendo rolar para baixo."
   A barra e FIXA na tela. Com min-height: 100vh e sem rolagem propria, numa tela
   baixa (notebook, zoom do Windows) o fim dela ficava fora da tela, para sempre.

   Abre TODA pagina com barra lateral (descobertas na pasta) em telas de computador
   baixas e confere que o ULTIMO item da barra ("Encerrar sessao") fica alcancavel:
   ou a barra cabe, ou ela rola -- e rolada ate o fim, o item aparece inteiro.

   USO   node tools/testa-barra-lateral.js
         ASTRAL_RAIZ=<pasta> ...   (outra copia do site, ex.: o commit antigo)
   Nao precisa de conta: a barra e a mesma com o banco vazio.
   ═══════════════════════════════════════════════════════════════════════════ */
const fs = require("fs");
const http = require("http");
const path = require("path");

const RAIZ = process.env.ASTRAL_RAIZ ? path.resolve(process.env.ASTRAL_RAIZ) : path.resolve(__dirname, "..");
const PORTA = 5193;
const TELAS = [
  { nome: "notebook 1366x600", w: 1366, h: 600 },
  { nome: "zoom 125% (1093x520)", w: 1093, h: 520 },
  { nome: "bem baixa 1024x460", w: 1024, h: 460 },
];
const npx = path.join(process.env.LOCALAPPDATA || "", "npm-cache", "_npx");
let pw = null; if (fs.existsSync(npx)) for (const d of fs.readdirSync(npx)) { const p = path.join(npx, d, "node_modules", "playwright"); if (fs.existsSync(p)) { pw = require(p); break; } }
if (!pw) { console.log("TESTA-BARRA-LATERAL -- pulado: playwright nao encontrado."); process.exit(0); }

const tipos = { ".html": "text/html", ".css": "text/css", ".js": "text/javascript", ".woff2": "font/woff2", ".svg": "image/svg+xml", ".png": "image/png", ".ico": "image/x-icon", ".webmanifest": "application/manifest+json" };
const servidor = http.createServer((q, r) => {
  const u = decodeURIComponent(q.url.split("?")[0]); const a = path.join(RAIZ, u === "/" ? "index.html" : u);
  if (!path.resolve(a).startsWith(RAIZ) || !fs.existsSync(a) || fs.statSync(a).isDirectory()) { r.writeHead(404); return r.end(); }
  r.writeHead(200, { "Content-Type": tipos[path.extname(a)] || "text/plain" }); r.end(fs.readFileSync(a));
});
const SESSAO = `(() => { const d = Math.floor(Date.now()/1000) + 7200;
  localStorage.setItem("sb-jjogmcacbdefwiwcyjxp-auth-token", JSON.stringify({ access_token:"f", refresh_token:"f", token_type:"bearer", expires_at:d,
    user:{ id:"00000000-0000-0000-0000-000000000001", email:"t@e.com", user_metadata:{ full_name:"Teste Silva" }, aud:"authenticated" } })); })()`;
// as paginas com barra lateral se descobrem (nunca lista a mao -- paginas.md 8.11)
const PAGINAS = fs.readdirSync(RAIZ).filter((f) => f.endsWith(".html") && /class="sidebar/.test(fs.readFileSync(path.join(RAIZ, f), "utf8"))).sort();

let falhas = 0;
(async () => {
  await new Promise((r) => servidor.listen(PORTA, r));
  const nav = await pw.chromium.launch();
  console.log(`\nTESTA-BARRA-LATERAL  ${PAGINAS.length} paginas x ${TELAS.length} telas\n`);
  try {
    for (const tela of TELAS) {
      const ruins = [];
      for (const pagina of PAGINAS) {
        const ctx = await nav.newContext({ viewport: { width: tela.w, height: tela.h } });
        const pg = await ctx.newPage();
        await pg.addInitScript(require("./testes/aceite-de-teste.js").SCRIPT);
        await pg.addInitScript(SESSAO);
        await pg.route("**/rest/v1/**", (r) => r.fulfill({ status: 200, contentType: "application/json", body: "[]" }));
        await pg.route("**/functions/v1/**", (r) => r.fulfill({ status: 200, contentType: "application/json", body: '{"success":true,"data":{}}' }));
        await require("./testes/aceite-de-teste.js").fingirAceite(pg);
        await pg.goto(`http://localhost:${PORTA}/${pagina}`, { waitUntil: "load" }).catch(() => {});
        await pg.waitForTimeout(1200);
        const r = await pg.evaluate(() => {
          const sb = document.querySelector(".sidebar");
          if (!sb) return { sem: true };
          const itens = [...sb.querySelectorAll("a[href], button")].filter((e) => e.getBoundingClientRect().height > 0);
          const ultimo = itens[itens.length - 1];
          const rola = /(auto|scroll)/.test(getComputedStyle(sb).overflowY);
          sb.scrollTop = sb.scrollHeight;   // rola a BARRA ate o fim (a pagina nao leva a barra fixa junto)
          const b = ultimo ? ultimo.getBoundingClientRect() : null;
          return { itens: itens.length, ultimo: ultimo ? (ultimo.innerText || ultimo.getAttribute("aria-label") || "").trim().slice(0, 24) : "",
                   rola, cabe: sb.scrollHeight <= sb.clientHeight + 1, fundo: b ? Math.round(b.bottom) : null, topo: b ? Math.round(b.top) : null, altura: innerHeight };
        });
        await ctx.close();
        if (r.sem) continue;
        const alcanca = r.fundo !== null && r.fundo <= r.altura && r.topo >= 0;
        if (!alcanca) ruins.push(`${pagina} ("${r.ultimo}" em ${r.topo}-${r.fundo}px de ${r.altura}; ${r.rola ? "rola" : "NAO rola"})`);
      }
      if (ruins.length) { console.log(`  FALHA  ${tela.nome.padEnd(24)} ${ruins.length} de ${PAGINAS.length} paginas com o fim da barra fora de alcance`); for (const x of ruins.slice(0, 4)) console.log(`           ${x}`); falhas++; }
      else console.log(`  OK     ${tela.nome.padEnd(24)} o ultimo item da barra alcancavel nas ${PAGINAS.length} paginas`);
    }
  } catch (e) {
    console.log("  FALHA  o teste quebrou:", e.message.slice(0, 140)); falhas++;
  } finally {
    await nav.close(); servidor.close();
    console.log("\n" + "=".repeat(70));
    console.log(falhas === 0 ? "A BARRA LATERAL ALCANÇA TODAS AS OPÇÕES EM QUALQUER TELA." : `🔴 ${falhas} TELA(S) COM OPÇÃO FORA DE ALCANCE.`);
    process.exit(falhas ? 1 : 0);
  }
})();
