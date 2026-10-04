/* ═══════════════════════════════════════════════════════════════════════════
   GERA-VITRINE -- o que o mundo ve do Astral antes de entrar
   (04/10/2026 -- auditoria NEG-03 + UX-06, roadmap 3.11)

   A auditoria: mandado no WhatsApp, o link aparecia SEM imagem e SEM
   descricao; no Google, sem descricao; na aba, sem icone (favicon 404); e nao
   havia como "Adicionar a tela inicial" de um produto de uso diario.

   Este programa GERA, a partir de uma fonte so (o desenho abaixo e as paginas):
     img/icone.svg            o icone (estrela + divisa, latao sobre breu)
     img/icone-180.png        iPhone ("Adicionar a Tela de Inicio")
     img/icone-192.png        Android
     img/icone-512.png        Android, tela de abertura
     img/icone-mascara-512.png  Android recorta em circulo/gota: o desenho fica na zona segura
     favicon.ico              16/32/48 -- o navegador pede /favicon.ico sozinho
     img/previa.png           1200 x 630, a imagem do link no WhatsApp/Google
     manifest.webmanifest     nome, cores, icones, atalhos
     robots.txt, sitemap.xml  o sitemap SE DESCOBRE: pagina com <meta name="description">
                              e sem "noindex" -- nunca lista escrita a mao

   USO   node tools/gera-vitrine.js          gera tudo
         node tools/gera-vitrine.js --conferir  so diz se o que esta no disco bate
                                                (o verifica e o testa-vitrine usam)
   🔴 DOMINIO PROPRIO: trocar SITE abaixo e rodar de novo (o previa.png e o
      sitemap levam o endereco). Hoje e o da Vercel.
   ═══════════════════════════════════════════════════════════════════════════ */
const fs = require("fs");
const http = require("http");
const path = require("path");

const SITE = "https://astral-psi.vercel.app";
const RAIZ = path.resolve(__dirname, "..");
const CONFERIR = process.argv.includes("--conferir");

const BREU = "#0E1620", LATAO = "#C08A2E", LATAO_C = "#E0AE55";

/* ── O desenho: estrela de 5 pontas sobre uma divisa (a insignia) ───────── */
function estrela(cx, cy, R, r) {
  const p = [];
  for (let i = 0; i < 10; i++) {
    const ang = -Math.PI / 2 + (i * Math.PI) / 5;
    const raio = i % 2 ? r : R;
    p.push(`${(cx + raio * Math.cos(ang)).toFixed(1)},${(cy + raio * Math.sin(ang)).toFixed(1)}`);
  }
  return p.join(" ");
}
// `mascara`: fundo sem cantos e desenho em 76% (a zona segura do Android e o circulo de 80%)
function iconeSVG({ mascara = false } = {}) {
  const fundo = mascara ? `<rect width="512" height="512" fill="${BREU}"/>` : `<rect width="512" height="512" rx="104" fill="${BREU}"/>`;
  const escala = mascara ? 0.76 : 1;
  const desl = (512 - 512 * escala) / 2;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <defs><linearGradient id="metal" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${LATAO_C}"/><stop offset="1" stop-color="${LATAO}"/></linearGradient></defs>
  ${fundo}
  <g transform="translate(${desl} ${desl}) scale(${escala})">
    <polygon points="${estrela(256, 206, 128, 52)}" fill="url(#metal)"/>
    <path d="M132 334 L256 404 L380 334" fill="none" stroke="url(#metal)" stroke-width="42" stroke-linejoin="miter" stroke-miterlimit="10"/>
  </g>
</svg>
`;
}

/* ── A previa do link: o mesmo titulo da pagina inicial, nenhuma promessa nova ── */
const PREVIA_HTML = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8">
<link rel="stylesheet" href="/assets/css/base.css">
<style>
  html, body { margin: 0; width: 1200px; height: 630px; overflow: hidden; background: var(--breu); }
  .quadro { position: relative; width: 1200px; height: 630px; box-sizing: border-box; padding: 72px 80px;
            display: grid; grid-template-columns: 260px 1fr; gap: 64px; align-items: center;
            background: radial-gradient(circle at 18% 40%, color-mix(in srgb, var(--latao) 14%, transparent), transparent 55%), var(--breu); }
  .quadro::before { content: ''; position: absolute; inset: 0 0 auto 0; height: 8px; background: var(--latao); }
  .icone { width: 260px; height: 260px; }
  .rot { font-family: var(--dado); font-size: 22px; letter-spacing: .16em; text-transform: uppercase; color: var(--latao-c); }
  .marca { font-family: var(--display); font-weight: 800; font-size: 92px; letter-spacing: -.02em; color: var(--papel); margin: 10px 0 6px; line-height: 1; }
  .marca span { color: var(--latao-c); }
  .titulo { font-family: var(--display); font-weight: 800; font-size: 50px; line-height: 1.08; color: var(--texto); letter-spacing: -.01em; }
  .titulo em { font-style: normal; color: var(--latao-c); }
  .pe { font-family: var(--corpo); font-size: 26px; color: var(--texto-2); margin-top: 22px; }
</style></head><body><div class="quadro">
  <img class="icone" src="/img/icone.svg" alt="">
  <div>
    <div class="rot">Para concurseiro de carreira militar</div>
    <div class="marca">Ast<span>r</span>al</div>
    <div class="titulo">Seu edital vira <em>plano de estudo</em> em poucos minutos</div>
    <div class="pe">Patente, XP e conquistas para você não largar no meio.</div>
  </div>
</div></body></html>`;

/* ── favicon.ico: cabecalho + PNGs dentro (formato aceito desde o Windows Vista) ── */
function ico(pngs) {
  const cab = Buffer.alloc(6); cab.writeUInt16LE(0, 0); cab.writeUInt16LE(1, 2); cab.writeUInt16LE(pngs.length, 4);
  let off = 6 + 16 * pngs.length; const ent = [];
  for (const { lado, buf } of pngs) {
    const e = Buffer.alloc(16);
    e.writeUInt8(lado >= 256 ? 0 : lado, 0); e.writeUInt8(lado >= 256 ? 0 : lado, 1);
    e.writeUInt8(0, 2); e.writeUInt8(0, 3); e.writeUInt16LE(1, 4); e.writeUInt16LE(32, 6);
    e.writeUInt32LE(buf.length, 8); e.writeUInt32LE(off, 12); off += buf.length; ent.push(e);
  }
  return Buffer.concat([cab, ...ent, ...pngs.map((p) => p.buf)]);
}

/* ── O que se descobre das paginas ──────────────────────────────────────── */
function paginas() {
  return fs.readdirSync(RAIZ).filter((f) => f.endsWith(".html")).sort().map((f) => {
    const t = fs.readFileSync(path.join(RAIZ, f), "utf8");
    return { arquivo: f, publica: /<meta name="description"/.test(t) && !/<meta name="robots" content="[^"]*noindex/.test(t), titulo: (t.match(/<title>([^<]*)<\/title>/) || [])[1] || f };
  });
}
const url = (f) => (f === "index.html" ? `${SITE}/` : `${SITE}/${f}`);

function textos() {
  const pubs = paginas().filter((p) => p.publica);
  const manifesto = {
    id: "/",
    name: "Astral — plano de aprovação para carreira militar",
    short_name: "Astral",
    description: "Seu edital vira plano de estudo: o que vale mais na prova, a semana montada, patente, XP e conquistas.",
    lang: "pt-BR",
    start_url: "/dashboard.html",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: BREU,
    theme_color: BREU,
    icons: [
      { src: "/img/icone-192.png", sizes: "192x192", type: "image/png" },
      { src: "/img/icone-512.png", sizes: "512x512", type: "image/png" },
      { src: "/img/icone-mascara-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
      { src: "/img/icone.svg", sizes: "any", type: "image/svg+xml" },
    ],
    shortcuts: [
      { name: "Cronômetro", url: "/cronometro.html", icons: [{ src: "/img/icone-192.png", sizes: "192x192" }] },
      { name: "Banco de questões", url: "/banco.html", icons: [{ src: "/img/icone-192.png", sizes: "192x192" }] },
    ],
  };
  const robots = `# Gerado por tools/gera-vitrine.js -- nao editar a mao.\n` +
    `# As paginas da area logada pedem "noindex" no proprio <head>; aqui so o que e ferramenta interna.\n` +
    `User-agent: *\nAllow: /\nDisallow: /importar.html\nDisallow: /estilo.html\n\nSitemap: ${SITE}/sitemap.xml\n`;
  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<!-- Gerado por tools/gera-vitrine.js: paginas com descricao e sem noindex. -->\n` +
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    pubs.map((p) => `  <url><loc>${url(p.arquivo)}</loc></url>\n`).join("") + `</urlset>\n`;
  return {
    "img/icone.svg": iconeSVG(),
    "manifest.webmanifest": JSON.stringify(manifesto, null, 2) + "\n",
    "robots.txt": robots,
    "sitemap.xml": sitemap,
  };
}

(async () => {
  const t = textos();
  if (CONFERIR) {
    const fora = Object.entries(t).filter(([arq, conteudo]) => !fs.existsSync(path.join(RAIZ, arq)) || fs.readFileSync(path.join(RAIZ, arq), "utf8") !== conteudo).map(([a]) => a);
    const imagens = ["img/icone-180.png", "img/icone-192.png", "img/icone-512.png", "img/icone-mascara-512.png", "favicon.ico", "img/previa.png"].filter((a) => !fs.existsSync(path.join(RAIZ, a)));
    if (fora.length || imagens.length) { console.log("🔴 vitrine defasada:", [...fora, ...imagens].join(", "), "-- rode: node tools/gera-vitrine.js"); process.exit(1); }
    console.log("vitrine em dia"); return;
  }
  for (const [arq, conteudo] of Object.entries(t)) fs.writeFileSync(path.join(RAIZ, arq), conteudo);

  // As imagens: desenhadas pelo navegador, com as fontes do proprio site
  const npx = path.join(process.env.LOCALAPPDATA || "", "npm-cache", "_npx");
  let pw = null; if (fs.existsSync(npx)) for (const d of fs.readdirSync(npx)) { const p = path.join(npx, d, "node_modules", "playwright"); if (fs.existsSync(p)) { pw = require(p); break; } }
  if (!pw) { console.log("playwright nao encontrado: textos gerados, imagens NAO"); process.exit(1); }
  const tipos = { ".html": "text/html", ".css": "text/css", ".woff2": "font/woff2", ".svg": "image/svg+xml" };
  const srv = http.createServer((q, r) => {
    const u = decodeURIComponent(q.url.split("?")[0]);
    if (u === "/previa.html") { r.writeHead(200, { "Content-Type": "text/html" }); return r.end(PREVIA_HTML); }
    if (u.startsWith("/mascara.svg")) { r.writeHead(200, { "Content-Type": "image/svg+xml" }); return r.end(iconeSVG({ mascara: true })); }
    const a = path.join(RAIZ, u);
    if (!fs.existsSync(a) || fs.statSync(a).isDirectory()) { r.writeHead(404); return r.end(); }
    r.writeHead(200, { "Content-Type": tipos[path.extname(a)] || "application/octet-stream" }); r.end(fs.readFileSync(a));
  });
  await new Promise((r) => srv.listen(5191, r));
  const nav = await pw.chromium.launch();
  const pg = await nav.newPage();
  async function png(src, lado) {
    await pg.setViewportSize({ width: lado, height: lado });
    await pg.setContent(`<html><body style="margin:0;background:transparent"><img src="http://localhost:5191${src}" style="width:${lado}px;height:${lado}px;display:block"></body></html>`);
    await pg.waitForFunction(() => document.images[0].complete);
    return pg.screenshot({ omitBackground: true, clip: { x: 0, y: 0, width: lado, height: lado } });
  }
  const gravar = (arq, buf) => { fs.writeFileSync(path.join(RAIZ, arq), buf); console.log(`  ${arq.padEnd(26)} ${(buf.length / 1024).toFixed(1)} KB`); };
  gravar("img/icone-180.png", await png("/img/icone.svg", 180));
  gravar("img/icone-192.png", await png("/img/icone.svg", 192));
  gravar("img/icone-512.png", await png("/img/icone.svg", 512));
  gravar("img/icone-mascara-512.png", await png("/mascara.svg", 512));
  const pequenos = [];
  for (const lado of [16, 32, 48]) pequenos.push({ lado, buf: await png("/img/icone.svg", lado) });   // um por vez: a pagina e uma so
  gravar("favicon.ico", ico(pequenos));
  await pg.setViewportSize({ width: 1200, height: 630 });
  await pg.goto("http://localhost:5191/previa.html", { waitUntil: "networkidle" });
  await pg.evaluate(() => document.fonts.ready);
  gravar("img/previa.png", await pg.screenshot({ clip: { x: 0, y: 0, width: 1200, height: 630 } }));
  await nav.close(); srv.close();
  for (const arq of Object.keys(t)) console.log(`  ${arq}`);
  console.log(`\npaginas publicas no sitemap: ${paginas().filter((p) => p.publica).map((p) => p.arquivo).join(", ") || "(nenhuma -- falta <meta name=\"description\">)"}`);
})();
