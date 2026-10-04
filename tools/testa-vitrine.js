/* ═══════════════════════════════════════════════════════════════════════════
   TESTA-VITRINE -- o link do Astral aparece com imagem e descricao? Tem icone?
   Da para por na tela inicial do celular?
   (04/10/2026 -- auditoria NEG-03 + UX-06, roadmap 3.11)

   A auditoria: no WhatsApp o link ia sem imagem e sem descricao; no Google sem
   descricao; na aba sem icone (favicon 404); e nenhum manifesto.

   Confere, contra o SITE NO AR (ou contra a pasta, com --local):
     1. TODA pagina tem icone, manifesto e cor da barra; e e OU publica (descricao,
        endereco canonico e previa do link) OU marcada "noindex" -- nunca nenhum dos dois
     2. a imagem da previa existe, e PNG, 1200 x 630 e < 300 KB (o WhatsApp recusa maior)
     3. o manifesto abre, tem nome, inicio, "standalone" e os icones 192/512/mascara --
        e cada icone existe e tem o tamanho que diz ter
     4. /favicon.ico e /img/icone.svg respondem
     5. robots.txt aponta o sitemap; cada endereco do sitemap abre; toda pagina
        publica esta no sitemap e nenhuma "noindex" esta
     6. com --local: o que esta no disco e o que o gerador gera hoje (gera-vitrine --conferir)

   USO   node tools/testa-vitrine.js            (producao)
         node tools/testa-vitrine.js --local    (a pasta, num servidor local)
   Nao gasta credito, nao cria conta.
   ═══════════════════════════════════════════════════════════════════════════ */
const fs = require("fs");
const http = require("http");
const path = require("path");
const { execFileSync } = require("child_process");

const RAIZ = path.resolve(__dirname, "..");
const LOCAL = process.argv.includes("--local");
const PORTA = 5192;
const BASE = LOCAL ? `http://localhost:${PORTA}` : "https://astral-psi.vercel.app";

let falhas = 0;
const ok = (t, d = "") => console.log(`  OK     ${t.padEnd(60)} ${d}`);
const falha = (t, d = "") => { console.log(`  FALHA  ${t.padEnd(60)} ${d}`); falhas++; };

const tipos = { ".html": "text/html", ".css": "text/css", ".js": "text/javascript", ".png": "image/png", ".svg": "image/svg+xml", ".ico": "image/x-icon", ".webmanifest": "application/manifest+json", ".txt": "text/plain", ".xml": "application/xml" };
const servidor = http.createServer((q, r) => {
  const u = decodeURIComponent(q.url.split("?")[0]); const a = path.join(RAIZ, u === "/" ? "index.html" : u);
  if (!path.resolve(a).startsWith(RAIZ) || !fs.existsSync(a) || fs.statSync(a).isDirectory()) { r.writeHead(404); return r.end(); }
  r.writeHead(200, { "Content-Type": tipos[path.extname(a)] || "application/octet-stream" }); r.end(fs.readFileSync(a));
});

// o endereco do site no ar vira o do servidor local (as tags levam o endereco de producao)
const local = (u) => (LOCAL ? String(u).replace(/^https:\/\/astral-psi\.vercel\.app/, BASE) : u);
async function baixar(u) {
  const r = await fetch(local(u.startsWith("http") ? u : BASE + u), { redirect: "follow" });
  const buf = Buffer.from(await r.arrayBuffer());
  return { status: r.status, tipo: r.headers.get("content-type") || "", buf };
}
const ladoPNG = (buf) => (buf.slice(1, 4).toString() === "PNG" ? { w: buf.readUInt32BE(16), h: buf.readUInt32BE(20) } : null);
const meta = (html, chave, valor) => { const m = html.match(new RegExp(`<meta ${chave}="${valor}" content="([^"]*)"`)); return m ? m[1] : null; };

(async () => {
  if (LOCAL) await new Promise((r) => servidor.listen(PORTA, r));
  console.log(`\nTESTA-VITRINE  ${BASE}\n`);
  try {
    // ── 1. cada pagina ────────────────────────────────────────────────────
    const paginas = fs.readdirSync(RAIZ).filter((f) => f.endsWith(".html")).sort();
    const publicas = [], ocultas = [];
    let semIcone = [], indecisas = [], semPrevia = [];
    for (const f of paginas) {
      const html = (await baixar(f === "index.html" ? "/" : "/" + f)).buf.toString("utf8");
      if (!/rel="icon"/.test(html) || !/rel="manifest"/.test(html) || !/name="theme-color"/.test(html)) semIcone.push(f);
      const desc = meta(html, "name", "description"), noindex = /<meta name="robots" content="[^"]*noindex/.test(html);
      if (!!desc === noindex) indecisas.push(f);
      else if (noindex) ocultas.push(f);
      else {
        publicas.push(f);
        if (!meta(html, "property", "og:image") || !meta(html, "property", "og:title") || !meta(html, "property", "og:description") || !/rel="canonical"/.test(html)) semPrevia.push(f);
      }
    }
    semIcone.length ? falha("pagina sem icone/manifesto/cor da barra", semIcone.join(", ")) : ok(`🎯 as ${paginas.length} páginas têm ícone, manifesto e cor da barra`);
    indecisas.length ? falha("pagina sem descricao E sem noindex (ou com os dois)", indecisas.join(", ")) : ok("cada página é pública OU fora da busca", `${publicas.length} públicas, ${ocultas.length} noindex`);
    semPrevia.length ? falha("pagina publica sem previa completa", semPrevia.join(", ")) : ok("🎯 as públicas têm descrição, endereço e prévia do link", publicas.join(" "));

    // ── 2. a imagem da previa ─────────────────────────────────────────────
    const inicio = (await baixar("/")).buf.toString("utf8");
    const img = meta(inicio, "property", "og:image");
    if (!img || !/^https:\/\//.test(img)) falha("og:image ausente ou relativo (o WhatsApp exige endereco completo)", String(img));
    else {
      const p = await baixar(img); const d = ladoPNG(p.buf);
      p.status === 200 && d && d.w === 1200 && d.h === 630 && p.buf.length < 300 * 1024
        ? ok("🎯 a imagem do link: PNG 1200 x 630", `${(p.buf.length / 1024).toFixed(0)} KB`)
        : falha("imagem da previa errada", `HTTP ${p.status} ${d ? d.w + "x" + d.h : "nao e PNG"} ${(p.buf.length / 1024).toFixed(0)} KB`);
    }

    // ── 3. o manifesto ────────────────────────────────────────────────────
    const man = await baixar("/manifest.webmanifest");
    let m = null; try { m = JSON.parse(man.buf.toString("utf8")); } catch { /* abaixo */ }
    if (man.status !== 200 || !m) falha("manifesto nao abre ou nao e JSON", `HTTP ${man.status}`);
    else {
      m.name && m.short_name && m.start_url && m.display === "standalone" ? ok("🎯 manifesto: nome, início e tela cheia", `${m.short_name} · ${m.start_url}`) : falha("manifesto incompleto", JSON.stringify(m).slice(0, 100));
      /json/.test(man.tipo) ? ok("o manifesto vai com o tipo certo", man.tipo) : falha("manifesto com tipo errado", man.tipo);
      const tem = (lado, prop) => (m.icons || []).find((i) => i.sizes === `${lado}x${lado}` && (prop ? i.purpose === prop : !i.purpose));
      for (const [lado, prop] of [[192], [512], [512, "maskable"]]) {
        const i = tem(lado, prop);
        if (!i) { falha(`manifesto sem icone ${lado}${prop ? " " + prop : ""}`); continue; }
        const p = await baixar(i.src); const d = ladoPNG(p.buf);
        p.status === 200 && d && d.w === lado && d.h === lado ? ok(`ícone ${lado} x ${lado}${prop ? " (máscara)" : ""}`, i.src) : falha(`icone ${i.src} nao confere`, `HTTP ${p.status} ${d ? d.w + "x" + d.h : "nao e PNG"}`);
      }
      const inicioApp = await baixar(m.start_url);
      inicioApp.status === 200 ? ok("o endereço de início abre", m.start_url) : falha("start_url nao abre", `HTTP ${inicioApp.status}`);
    }

    // ── 4. favicon ────────────────────────────────────────────────────────
    const ico = await baixar("/favicon.ico");
    ico.status === 200 && ico.buf.readUInt16LE(0) === 0 && ico.buf.readUInt16LE(2) === 1 ? ok("🎯 /favicon.ico existe (era 404)", `${ico.buf.readUInt16LE(4)} tamanhos`) : falha("favicon.ico", `HTTP ${ico.status}`);
    const svg = await baixar("/img/icone.svg");
    svg.status === 200 && /<svg/.test(svg.buf.toString()) ? ok("ícone em SVG", "/img/icone.svg") : falha("icone.svg", `HTTP ${svg.status}`);
    const apple = await baixar("/img/icone-180.png");
    apple.status === 200 && (ladoPNG(apple.buf) || {}).w === 180 ? ok("ícone do iPhone 180 x 180") : falha("icone do iPhone", `HTTP ${apple.status}`);

    // ── 5. robots e sitemap ───────────────────────────────────────────────
    const rob = await baixar("/robots.txt");
    rob.status === 200 && /Sitemap: https:\/\//.test(rob.buf.toString()) ? ok("robots.txt aponta o sitemap") : falha("robots.txt", `HTTP ${rob.status}`);
    const sm = await baixar("/sitemap.xml");
    const locs = [...sm.buf.toString().matchAll(/<loc>([^<]+)<\/loc>/g)].map((x) => x[1]);
    if (sm.status !== 200 || !locs.length) falha("sitemap.xml", `HTTP ${sm.status}, ${locs.length} enderecos`);
    else {
      const quebrados = []; for (const u of locs) if ((await baixar(u)).status !== 200) quebrados.push(u);
      quebrados.length ? falha("endereco do sitemap nao abre", quebrados.join(" ")) : ok(`os ${locs.length} endereços do sitemap abrem`);
      const nome = (u) => u.replace(/^https?:\/\/[^/]+\//, "") || "index.html";
      const fora = publicas.filter((f) => !locs.map(nome).includes(f)), demais = locs.map(nome).filter((f) => ocultas.includes(f));
      fora.length || demais.length ? falha("sitemap nao bate com as paginas", `faltam: ${fora.join(",")} | sobram: ${demais.join(",")}`) : ok("sitemap = exatamente as páginas públicas");
    }

    // ── 6. o disco bate com o gerador ─────────────────────────────────────
    if (LOCAL) {
      try { execFileSync(process.execPath, [path.join(__dirname, "gera-vitrine.js"), "--conferir"], { stdio: "pipe" }); ok("o disco bate com o gerador (gera-vitrine --conferir)"); }
      catch (e) { falha("vitrine defasada", String(e.stdout || "").trim().slice(0, 120)); }
    }
  } catch (e) {
    falha("o teste quebrou", e.message.slice(0, 140));
  } finally {
    if (LOCAL) servidor.close();
    console.log("\n" + "=".repeat(70));
    console.log(falhas === 0 ? "O LINK DO ASTRAL CHEGA COM IMAGEM, DESCRIÇÃO E ÍCONE — E VAI PARA A TELA INICIAL." : `🔴 ${falhas} FALHA(S).`);
    process.exit(falhas ? 1 : 0);
  }
})();
