// COMPARA-ESTILO -- a tela ficou IGUAL depois de mexer no CSS? Elemento por elemento.
//
// 10/10/2026 (Lote D, V2). O valida-css compara REGRAS (seletor por seletor). Isso
// nao basta quando a mudanca e trocar a regra de lugar: tirar a `.main` da pagina e
// deixar a `.sidebar ~ .main` do base.css valer da o mesmo desenho com seletor
// diferente -- e o valida-css acusa diferenca onde nao ha nenhuma. Aqui se mede o
// que a pessoa ve: o estilo CALCULADO e a caixa de cada elemento, nas duas versoes.
//
// E o metodo que provou o item 8 em 16/09 (paginas.md 7): print-contra-print NAO
// serve neste site (o controle deu diferenca de pixel com o mesmo codigo dos dois
// lados). Estilo calculado e deterministico.
//
//   node tools/compara-estilo.js                 disco x HEAD, todas as paginas com barra lateral
//   node tools/compara-estilo.js HEAD~2          disco x outro ref
//   node tools/compara-estilo.js --controle      HEAD x HEAD (deve dar ZERO -- prova que a regua presta)
//   node tools/compara-estilo.js -- conta tags   so essas paginas
//   node tools/compara-estilo.js --resumo        cada mudanca uma vez, sem a caixa que so andou de lugar
//
// O banco e fingido (lista vazia), a sessao tambem: compara a CASCA e o que a pagina
// desenha sem dado. Duas larguras: 1280 (computador) e 375 (iPhone SE).
const fs = require("fs");
const path = require("path");
const http = require("http");
const { execFileSync } = require("child_process");

const RAIZ = path.resolve(__dirname, "..");
const args = process.argv.slice(2);
const sep = args.indexOf("--");
const soPaginas = sep >= 0 ? args.slice(sep + 1) : [];
const opcoes = sep >= 0 ? args.slice(0, sep) : args;
const CONTROLE = opcoes.includes("--controle");
const RESUMO = opcoes.includes("--resumo");   // agrupa mudancas iguais e esconde a caixa que so andou
const REF = opcoes.find((a) => !a.startsWith("--")) || "HEAD";

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
if (!pw) { console.log("COMPARA-ESTILO -- pulado: playwright nao encontrado (npx --yes playwright install chromium)"); process.exit(0); }

const tipos = { ".html": "text/html", ".css": "text/css", ".js": "text/javascript", ".mjs": "text/javascript", ".woff2": "font/woff2", ".svg": "image/svg+xml", ".png": "image/png", ".json": "application/json", ".webmanifest": "application/manifest+json" };
const cacheGit = new Map();
function doGit(rel) {
  if (!cacheGit.has(rel)) {
    try { cacheGit.set(rel, execFileSync("git", ["show", `${REF}:${rel}`], { cwd: RAIZ, maxBuffer: 64 << 20 })); }
    catch { cacheGit.set(rel, null); }
  }
  return cacheGit.get(rel);
}
function servidor(ler) {
  return http.createServer((q, r) => {
    const u = decodeURIComponent(q.url.split("?")[0]).replace(/^\/+/, "") || "index.html";
    if (u.includes("..")) { r.writeHead(404); return r.end(); }
    const corpo = ler(u);
    if (!corpo) { r.writeHead(404); return r.end("404"); }
    r.writeHead(200, { "Content-Type": tipos[path.extname(u)] || "text/plain" });
    r.end(corpo);
  });
}
const lerDisco = (u) => { const a = path.join(RAIZ, u); return fs.existsSync(a) && fs.statSync(a).isFile() ? fs.readFileSync(a) : null; };
const ANTES = { porta: 8931, ler: doGit };
const DEPOIS = { porta: 8932, ler: CONTROLE ? doGit : lerDisco };

const PAGINAS = (soPaginas.length ? soPaginas.map((p) => p.replace(/\.html$/, "") + ".html") :
  fs.readdirSync(RAIZ).filter((f) => f.endsWith(".html") && /class="sidebar/.test(fs.readFileSync(path.join(RAIZ, f), "utf8")))).sort();
const LARGURAS = [{ nome: "1280", w: 1280, h: 900, movel: false }, { nome: "375", w: 375, h: 812, movel: true }];

const SESSAO = `(() => {
  const d = Math.floor(Date.now()/1000) + 7200;
  localStorage.setItem("sb-jjogmcacbdefwiwcyjxp-auth-token", JSON.stringify({
    access_token:"f", refresh_token:"f", token_type:"bearer", expires_at:d,
    user:{ id:"00000000-0000-0000-0000-000000000001", email:"t@e.com",
           user_metadata:{ full_name:"Teste Silva" }, aud:"authenticated" },
  }));
  Math.random = () => 0.42;   // o dashboard sorteia um raio; os dois lados sorteiam igual
})()`;

// o que a pessoa ve. Animacao e transicao ficam de fora: o estado final e o que importa
const PROPS = ["display", "position", "color", "background-color", "background-image", "border-top-color", "border-top-width", "border-top-style",
  "border-right-width", "border-bottom-color", "border-bottom-width", "border-bottom-style", "border-left-color", "border-left-width",
  "border-top-left-radius", "border-bottom-right-radius", "padding-top", "padding-right", "padding-bottom", "padding-left",
  "margin-top", "margin-right", "margin-bottom", "margin-left", "font-family", "font-size", "font-weight", "font-style", "line-height",
  "letter-spacing", "text-transform", "text-align", "box-shadow", "opacity", "gap", "align-items", "justify-content", "flex-wrap",
  "flex-direction", "max-width", "visibility", "z-index", "overflow-x", "overflow-y"];

async function medir(nav, lado, pagina, larg) {
  const ctx = await nav.newContext({ viewport: { width: larg.w, height: larg.h }, isMobile: larg.movel, hasTouch: larg.movel, reducedMotion: "reduce" });
  const pg = await ctx.newPage();
  await pg.addInitScript(require("./testes/aceite-de-teste.js").SCRIPT);
  await pg.addInitScript(SESSAO);
  await pg.route("**/rest/v1/**", (r) => r.fulfill({ status: 200, contentType: "application/json", body: "[]" }));
  await pg.route("**/functions/v1/**", (r) => r.fulfill({ status: 200, contentType: "application/json", body: '{"success":true,"data":{}}' }));
  await pg.route("**/auth/v1/**", (r) => r.fulfill({ status: 200, contentType: "application/json", body: '{"id":"00000000-0000-0000-0000-000000000001","email":"t@e.com","user_metadata":{"full_name":"Teste Silva"},"aud":"authenticated"}' }));
  await require("./testes/aceite-de-teste.js").fingirAceite(pg);
  await pg.route("**/rest/v1/progresso**", (r) => r.fulfill({ status: 200, contentType: "application/json",
    body: JSON.stringify([{ usuario_id: "00000000-0000-0000-0000-000000000001", materias: [], rotina: { dias: [1, 2, 3, 4, 5, 6] } }]) }));
  await pg.goto(`http://localhost:${lado.porta}/${pagina}`, { waitUntil: "load" }).catch(() => {});
  await pg.waitForTimeout(1500);
  const r = await pg.evaluate((PROPS) => {
    const caminho = (el) => { const p = []; for (let e = el; e && e !== document.body; e = e.parentElement) { const i = [...e.parentElement.children].indexOf(e); p.unshift(e.tagName.toLowerCase() + (e.id ? "#" + e.id : "") + ":" + i); } return p.join(">"); };
    const out = {};
    for (const el of document.querySelectorAll("body *")) {
      if (/^(SCRIPT|STYLE|LINK|META|NOSCRIPT|TEMPLATE)$/.test(el.tagName)) continue;
      const cs = getComputedStyle(el);
      const b = el.getBoundingClientRect();
      const v = { caixa: [b.x, b.y, b.width, b.height].map((n) => Math.round(n)).join(",") };
      for (const p of PROPS) v[p] = cs.getPropertyValue(p);
      out[caminho(el)] = { classe: String(el.className && el.className.baseVal !== undefined ? el.className.baseVal : el.className).split(" ")[0], v };
    }
    return out;
  }, PROPS);
  await ctx.close();
  return r;
}

(async () => {
  const srvA = servidor(ANTES.ler), srvB = servidor(DEPOIS.ler);
  await new Promise((r) => srvA.listen(ANTES.porta, r));
  await new Promise((r) => srvB.listen(DEPOIS.porta, r));
  const nav = await pw.chromium.launch();
  console.log(`COMPARA-ESTILO -- ${CONTROLE ? `CONTROLE (${REF} x ${REF})` : `disco x ${REF}`}, ${PAGINAS.length} paginas x ${LARGURAS.length} larguras\n`);
  let total = 0, diferentes = 0, paginasRuins = 0;
  for (const pagina of PAGINAS) {
    const linhas = [];
    const grupos = new Map();
    let n = 0;
    for (const larg of LARGURAS) {
      const [a, b] = [await medir(nav, ANTES, pagina, larg), await medir(nav, DEPOIS, pagina, larg)];
      const chaves = new Set([...Object.keys(a), ...Object.keys(b)]);
      for (const k of chaves) {
        n++;
        if (!a[k] || !b[k]) { diferentes++; linhas.push(`  [${larg.nome}] ${a[k] ? "SUMIU" : "NOVO"} ${k.split(">").slice(-2).join(">")}`); continue; }
        // so a caixa mudou: e efeito de outra mudanca (o vizinho cresceu), nao conta como causa no resumo
        const d = Object.keys(a[k].v).filter((p) => a[k].v[p] !== b[k].v[p] && !(RESUMO && p === "caixa"));
        if (d.length) {
          diferentes++;
          const texto = `.${a[k].classe || k.split(">").pop()}  ` + d.map((p) => `${p}: ${a[k].v[p]} -> ${b[k].v[p]}`).join(" | ");
          if (RESUMO) grupos.set(texto, (grupos.get(texto) || new Set()).add(larg.nome));
          else if (linhas.length < 40) linhas.push(`  [${larg.nome}] ${texto}`);
        }
      }
    }
    total += n;
    for (const [texto, largs] of grupos) linhas.push(`  [${[...largs].join("+")}] ${texto}`);
    if (linhas.length) paginasRuins++;
    console.log(`${linhas.length ? "DIFERE" : "igual "}  ${pagina.padEnd(18)} ${n} elementos`);
    for (const l of linhas) console.log(l);
  }
  await nav.close(); srvA.close(); srvB.close();
  console.log(`\n${total} elementos medidos; ${diferentes} com diferenca, em ${paginasRuins} de ${PAGINAS.length} paginas`);
  console.log(paginasRuins === 0 ? "ESTILO CALCULADO IDENTICO" : "HA DIFERENCA -- conferir se e so a pretendida");
  process.exit(paginasRuins === 0 ? 0 : 1);
})();
