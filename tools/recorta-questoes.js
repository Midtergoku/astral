/* ═══════════════════════════════════════════════════════════════════════════
   RECORTA-QUESTOES -- a questao como foi IMPRESSA, recortada do PDF da prova.
   (03/10/2026 -- roadmap 3.4, caminho A escolhido por ele)

   POR QUE EXISTE
   248 questoes da EEAR ficaram fora do ar porque o TEXTO do PDF nao as
   reproduz: raiz, fracao, matriz e figura sao DESENHADAS no caderno, nao
   escritas; e em duas colunas o texto mistura uma questao com a vizinha.
   A imagem do caderno oficial nao tem nenhum desses problemas.

   COMO
   O pdf.js (o mesmo da tela importar.html) da a posicao de cada texto. A
   questao comeca no "61 –" e TERMINA na ultima alternativa ("d)" ou "e)",
   conforme a questao) -- nao na questao seguinte: entre as duas pode haver o
   texto de apoio da proxima (medido: a CFS 1/2023 #28 levava a letra de uma
   musica junto). Questao que vira de coluna ou de pagina vira 2+ pedacos,
   emendados.

   🔴 O GABARITO EM VERMELHO. Alguns cadernos (medido: CFS 2/2018) vem com a
   alternativa certa pintada de vermelho. A imagem entregaria a resposta.
   Todo pixel avermelhado e repintado de cinza na mesma intensidade -- e
   mesmo assim CADA imagem e conferida por olho antes de ir ao ar.

   NAO GRAVA NO BANCO. Le as questoes (chave de servico), escreve as imagens
   em img/questoes/<id>-<hash>.webp e um relatorio JSON. Publicar e outro passo.

   USO   node tools/recorta-questoes.js --ids 903,6519 [--saida relatorio.json]
         node tools/recorta-questoes.js --fora-do-ar  (todas fora do ar, menos repetidas)
   ═══════════════════════════════════════════════════════════════════════════ */
const { execSync } = require("child_process");
const crypto = require("crypto");
const fs = require("fs");
const http = require("http");
const path = require("path");

const RAIZ = path.resolve(__dirname, "..");
const PROVAS = path.resolve(RAIZ, "..", "ASTRAL-provas");
const DESTINO = path.join(RAIZ, "img", "questoes");
const REF = "jjogmcacbdefwiwcyjxp";
const BASE = `https://${REF}.supabase.co`;
const arg = (n) => { const i = process.argv.indexOf(n); return i > 0 ? process.argv[i + 1] : null; };

const nomeDe = (p) => `${p.banca}_${p.ano}_${p.prova}`.replace(/[^\w.-]+/g, "-") + ".pdf";
const provas = JSON.parse(fs.readFileSync(path.join(__dirname, "provas-conhecidas.json"), "utf8"));
const arquivoDa = (q) => { const p = provas.find((x) => x.banca === q.banca && x.prova === q.prova && Number(x.ano) === Number(q.ano)); return p ? nomeDe(p) : null; };

const tipos = { ".js": "text/javascript", ".mjs": "text/javascript", ".pdf": "application/pdf" };
const srv = http.createServer((q, r) => {
  const u = decodeURIComponent(q.url.split("?")[0]);
  const a = u.startsWith("/provas/") ? path.join(PROVAS, u.slice(8)) : path.join(RAIZ, u);
  if (!a.startsWith(RAIZ) && !a.startsWith(PROVAS)) { r.writeHead(403); return r.end(); }
  if (!fs.existsSync(a) || fs.statSync(a).isDirectory()) { r.writeHead(404); return r.end(); }
  r.writeHead(200, { "Content-Type": tipos[path.extname(a)] || "application/octet-stream" }); r.end(fs.readFileSync(a));
});

/* Roda DENTRO do navegador: recorta as questoes pedidas de UM pdf. */
async function recortarNoNavegador({ arquivo, pedidas }) {
  const pdfjs = await import("/assets/js/pdf-4.10.38.min.mjs");
  pdfjs.GlobalWorkerOptions.workerSrc = "/assets/js/pdf-worker-4.10.38.min.mjs";
  const doc = await pdfjs.getDocument({ url: "/provas/" + arquivo }).promise;
  const ESCALA = 2.4;
  const paginas = [];
  for (let i = 1; i <= doc.numPages; i++) {
    const p = await doc.getPage(i);
    const vp = p.getViewport({ scale: ESCALA });
    const brutos = (await p.getTextContent()).items.filter((it) => it.str && it.str.trim());
    const itens = brutos.map((it) => {
      const [x, y] = vp.convertToViewportPoint(it.transform[4], it.transform[5]);
      return { s: it.str, x, y, h: Math.max(8, Math.abs(it.transform[3]) * ESCALA), w: it.width * ESCALA };
    });
    const W = vp.width, H = vp.height;
    const duas = itens.some((it) => it.x > W * 0.55) && itens.some((it) => it.x < W * 0.4);
    // cabecalho e rodape da pagina ficam de fora de qualquer recorte
    const corpo = itens.filter((it) => it.y > H * 0.05 && it.y < H * 0.95 && !/^(Inscri[cç][aã]o|P[aá]gina\b|Rascunho|n[º°]\s*\d)/i.test(it.s.trim()));
    for (const it of corpo) it.col = duas ? (it.x < W / 2 ? 0 : 1) : 0;
    // onde comeca o rodape ("Inscricao no", "Pagina n"): a descida da figura para antes dele
    /* Cabecalho e rodape ("Pagina nº 4", "Inscricao nº"). 🔴 O rodape pode estar NA
       MESMA ALTURA da ultima linha e centralizado entre as colunas (CFS 1/2025 p5):
       por isso ele e APAGADO da imagem da pagina antes de recortar, nao so ignorado. */
    const fora = itens.filter((it) => !corpo.includes(it));
    paginas.push({ i, p, vp, W, H, duas, itens: corpo, fora });
  }
  // ordem de leitura: pagina, coluna, altura
  const ordem = [];
  for (const pg of paginas) for (const it of [...pg.itens].sort((a, b) => a.col - b.col || a.y - b.y)) ordem.push({ ...it, pg: pg.i });
  const ehMarca = (k, n) => {
    const it = ordem[k];
    let m = it.s.match(/^\s*0?(\d{1,3})\s*[–—-]/);
    if (!m) {
      const so = it.s.match(/^\s*0?(\d{1,3})\s*$/);
      const seg = ordem.slice(k + 1, k + 3).find((o) => o.s.trim());
      if (so && seg && /^\s*[–—-]/.test(seg.s) && Math.abs(seg.y - it.y) < 6 && seg.pg === it.pg) m = so;
    }
    return m && Number(m[1]) === n;
  };
  const renders = new Map();
  async function canvasDa(pg) {
    if (!renders.has(pg.i)) {
      const c = document.createElement("canvas"); c.width = pg.W; c.height = pg.H;
      const ctx = c.getContext("2d"); ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, c.width, c.height);
      await pg.p.render({ canvasContext: ctx, viewport: pg.vp }).promise;
      ctx.fillStyle = "#fff";
      for (const it of pg.fora) ctx.fillRect(it.x - 3, it.y - it.h - 3, it.w + 6, it.h * 1.45 + 6);
      // rodape no pe da pagina: a FAIXA inteira, porque a linha de preencher ("Inscricao nº ____") e desenho, nao texto
      const pe = pg.fora.filter((it) => it.y > pg.H * 0.92);
      if (pe.length) ctx.fillRect(0, Math.min(...pe.map((it) => it.y - it.h)) - 4, pg.W, pg.H);
      renders.set(pg.i, c);
    }
    return renders.get(pg.i);
  }
  const limites = (pg, col) => pg.duas ? (col === 0 ? [0, pg.W / 2] : [pg.W / 2, pg.W]) : [0, pg.W];

  const saida = [];
  for (const { id, numero, ultima } of pedidas) {
    const ini = ordem.findIndex((_, k) => ehMarca(k, numero));
    if (ini < 0) { saida.push({ id, erro: "inicio da questao nao achado" }); continue; }
    // a ultima alternativa: "d)" (ou "e)") depois do inicio, antes da proxima questao
    let fim = -1;
    for (let k = ini + 1; k < ordem.length && k < ini + 600; k++) {
      if (ehMarca(k, numero + 1)) break;
      if (new RegExp(`^\\s*${ultima}\\)`).test(ordem[k].s)) { fim = k; break; }
    }
    if (fim < 0) { saida.push({ id, erro: `alternativa ${ultima}) nao achada` }); continue; }
    // a ultima alternativa pode ter mais de uma linha: segue enquanto as linhas estao coladas
    let kFim = fim;
    for (let k = fim + 1; k < ordem.length; k++) {
      const a = ordem[kFim], b = ordem[k];
      if (b.pg !== a.pg || b.col !== a.col) break;
      if (b.y - a.y > a.h * 1.9) break;
      if (ehMarca(k, numero + 1) || /^(Read the text|Leia o texto|AS QUEST)/i.test(b.s.trim())) break;
      kFim = k;
    }
    const A = ordem[ini], Z = ordem[kFim];
    // pedacos: de (pagina, coluna) do inicio ate a do fim
    const pedacos = [];
    let pg = A.pg, col = A.col;
    for (let guarda = 0; guarda < 6; guarda++) {
      const P = paginas[pg - 1];
      const naCol = P.itens.filter((it) => it.col === col);
      const topo = (pg === A.pg && col === A.col) ? A.y - A.h - 6 : Math.min(...naCol.map((it) => it.y - it.h)) - 6;
      const ehUltimo = pg === Z.pg && col === Z.col;
      const base = ehUltimo ? Z.y + Z.h * 0.45 + 6 : Math.max(...naCol.map((it) => it.y)) + 10;
      pedacos.push({ pg, col, topo, base });
      if (ehUltimo) break;
      if (P.duas && col === 0) col = 1; else { pg++; col = 0; }
      if (pg > paginas.length) break;
    }
    // desenha os pedacos um embaixo do outro. A largura e a que o TEXTO ocupa
    // naquele trecho -- cortar no meio da pagina comia letra (medido: "rogramação"
    // na coluna da direita, "can'" na da esquerda).
    const imgs = [];
    for (const pd of pedacos) {
      const P = paginas[pd.pg - 1];
      const [c0, c1] = limites(P, pd.col);
      const dentro = P.itens.filter((it) => it.col === pd.col && it.y >= pd.topo && it.y - it.h <= pd.base);
      // folga de 4 px alem da coluna, nao mais: 30 px puxava lascas da coluna vizinha (CFS 1/2025 #17)
      const x0 = Math.max(c0 - 4, Math.min(...dentro.map((it) => it.x)) - 10);
      const x1 = Math.min(c1 + 4, Math.max(...dentro.map((it) => it.x + it.w)) + 10);
      imgs.push({ src: await canvasDa(P), x: x0, y: Math.max(0, pd.topo), w: x1 - x0, h: Math.min(P.H, pd.base) - Math.max(0, pd.topo) });
    }
    /* FIGURA AO LADO DAS ALTERNATIVAS: o texto acaba no "d)", mas o desenho
       pode descer mais (medido: CFS 2/2025 #63, o circuito cortado no meio).
       O ultimo pedaco segue para baixo enquanto houver tinta na coluna, ate
       uma faixa branca de 22 px (a borda, onde fica a moldura, nao conta) -- e nunca passa do inicio da proxima questao. */
    {
      const ult = imgs[imgs.length - 1], P = paginas[pedacos[pedacos.length - 1].pg - 1];
      const prox = ordem.find((o, k) => k > kFim && o.pg === P.i && o.col === pedacos[pedacos.length - 1].col && ehMarca(k, numero + 1));
      // ...e nunca passa da primeira LINHA DE TEXTO abaixo (12+ caracteres): rotulo
      // de figura ("x", "R", "A") e curto; "Read the text..." nao (medido: CFS 1/2023 #28)
      const colFim = pedacos[pedacos.length - 1].col;
      const linha = ordem.find((o, k) => k > kFim && o.pg === P.i && o.col === colFim && o.y > Z.y + 2 && o.s.trim().length >= 12);
      // rodape so conta se estiver ABAIXO da ultima linha da questao
      const rodAbaixo = P.fora.filter((it) => it.y > P.H * 0.5 && it.y - it.h > Z.y);
      const rodape = rodAbaixo.length ? Math.min(...rodAbaixo.map((it) => it.y - it.h)) - 8 : P.H * 0.95;
      const limite = Math.min(rodape, prox ? prox.y - prox.h - 6 : P.H, linha ? linha.y - linha.h - 6 : P.H);
      const px = ult.src.getContext("2d").getImageData(Math.round(ult.x), 0, Math.round(ult.w), Math.round(P.H)).data;
      const temTinta = (yy) => { for (let xx = 14; xx < Math.round(ult.w) - 14; xx++) { const k = (yy * Math.round(ult.w) + xx) * 4; if (px[k] < 200 || px[k + 1] < 200 || px[k + 2] < 200) return true; } return false; };
      let yy = Math.round(ult.y + ult.h), branco = 0;
      // linha horizontal que atravessa a coluna = regua do rodape: para ali
      const regua = (yy) => { let n = 0; const W = Math.round(ult.w); for (let xx = 14; xx < W - 14; xx++) { const k = (yy * W + xx) * 4; if (px[k] < 200) n++; } return n > (W - 28) * 0.7; };
      while (yy < limite && branco < 22) { if (regua(yy)) break; branco = temTinta(yy) ? 0 : branco + 1; yy++; }
      ult.h = Math.max(ult.h, yy - branco - ult.y + 6);
    }
    /* O INICIO SOBE COM A TINTA COLADA AO TITULO. Um sistema de 3 equacoes fica
       centralizado na altura do "42 –": a 1a equacao esta ACIMA do titulo
       (medido: CFS 2/2025 #42 saia sem ela, e a #41 a levava de brinde). */
    {
      const pri = imgs[0], P = paginas[pedacos[0].pg - 1];
      const W = Math.round(pri.w), cx = pri.src.getContext("2d");
      const px = cx.getImageData(Math.round(pri.x), 0, W, Math.round(P.H)).data;
      const tinta = (yy) => { for (let xx = 14; xx < W - 14; xx++) { const k = (yy * W + xx) * 4; if (px[k] < 200 || px[k + 1] < 200 || px[k + 2] < 200) return true; } return false; };
      let yy = Math.round(pri.y), branco = 0;
      // ...mas nunca acima da ultima linha ALINHADA A ESQUERDA antes do titulo: ela e o
      // fim da questao anterior (sem isto a CFS 1/2025 #17 levava a #16 inteira, porque
      // la nao ha faixa branca entre questoes). Equacao de sistema fica mais a direita.
      const acima = P.itens.filter((it) => it.col === A.col && it.y < A.y - A.h && it.x <= A.x + 40);
      const fimAnterior = acima.length ? Math.max(...acima.map((it) => it.y + it.h * 0.3)) : P.H * 0.05;
      const teto = Math.max(P.H * 0.05, pri.y - 400, fimAnterior + 2);
      while (yy > teto && branco < 16) { branco = tinta(yy) ? 0 : branco + 1; yy--; }
      const novo = yy + branco - 4;
      if (novo < pri.y) { pri.h += pri.y - novo; pri.y = novo; }
    }
    const larg = Math.max(...imgs.map((i) => i.w));
    const alt = imgs.reduce((s, i) => s + i.h, 0) + 14 * (imgs.length - 1);
    const c = document.createElement("canvas"); c.width = Math.round(larg); c.height = Math.round(alt);
    const ctx = c.getContext("2d"); ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, c.width, c.height);
    let y = 0;
    for (const i of imgs) { ctx.drawImage(i.src, i.x, i.y, i.w, i.h, 0, y, i.w, i.h); y += i.h + 14; }
    // 🔴 gabarito em vermelho -> cinza da mesma intensidade; e mede quanto havia
    const d = ctx.getImageData(0, 0, c.width, c.height);
    let vermelhos = 0, coloridos = 0;
    for (let k = 0; k < d.data.length; k += 4) {
      const r = d.data[k], g = d.data[k + 1], b = d.data[k + 2];
      if (r - g > 40 && r - b > 40) { vermelhos++; d.data[k] = d.data[k + 1] = d.data[k + 2] = Math.min(g, b); }
      else if (Math.max(r, g, b) - Math.min(r, g, b) > 60) coloridos++;
    }
    // a moldura da pagina: linha reta escura que atravessa quase toda a imagem,
    // encostada na borda (ate 24 px dela) -- apaga. Traco de fracao e sublinhado
    // sao curtos e ficam.
    // a moldura e cinza-claro, nao preta (medido nas 5 primeiras): limite 215
    const escuro = (k) => d.data[k] < 215 && d.data[k + 1] < 215 && d.data[k + 2] < 215;
    for (let yy = 0; yy < c.height; yy++) {
      if (yy > 24 && yy < c.height - 24) continue;
      let n = 0; for (let xx = 0; xx < c.width; xx++) if (escuro((yy * c.width + xx) * 4)) n++;
      if (n > c.width * 0.85) for (let xx = 0; xx < c.width; xx++) { const k = (yy * c.width + xx) * 4; d.data[k] = d.data[k + 1] = d.data[k + 2] = 255; }
    }
    for (let xx = 0; xx < c.width; xx++) {
      if (xx > 24 && xx < c.width - 24) continue;
      let n = 0; for (let yy = 0; yy < c.height; yy++) if (escuro((yy * c.width + xx) * 4)) n++;
      if (n > c.height * 0.6) for (let yy = 0; yy < c.height; yy++) { const k = (yy * c.width + xx) * 4; d.data[k] = d.data[k + 1] = d.data[k + 2] = 255; }
    }
    // apara o branco em volta
    let t = c.height, bt = 0, e = c.width, di = 0;
    for (let yy = 0; yy < c.height; yy++) for (let xx = 0; xx < c.width; xx++) {
      const k = (yy * c.width + xx) * 4;
      if (d.data[k] < 235 || d.data[k + 1] < 235 || d.data[k + 2] < 235) { if (yy < t) t = yy; if (yy > bt) bt = yy; if (xx < e) e = xx; if (xx > di) di = xx; }
    }
    ctx.putImageData(d, 0, 0);
    const PAD = 14;
    const f = document.createElement("canvas");
    f.width = Math.max(1, di - e + 1 + 2 * PAD); f.height = Math.max(1, bt - t + 1 + 2 * PAD);
    const fx = f.getContext("2d"); fx.fillStyle = "#fff"; fx.fillRect(0, 0, f.width, f.height);
    fx.drawImage(c, e, t, di - e + 1, bt - t + 1, PAD, PAD, di - e + 1, bt - t + 1);
    saida.push({ id, pedacos: pedacos.map((p) => `p${p.pg}c${p.col}`).join("+"), vermelhos, coloridos,
      largura: f.width, altura: f.height, webp: f.toDataURL("image/webp", 0.86) });
  }
  return saida;
}

(async () => {
  const SK = JSON.parse(execSync(`supabase projects api-keys --project-ref ${REF} -o json`, { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] })).find((k) => k.name === "service_role").api_key;
  const H = { apikey: SK, Authorization: `Bearer ${SK}` };
  const CAMPOS = "id,banca,prova,ano,numero,alternativas,publicada,revisao";
  let qs;
  if (arg("--ids")) qs = await (await fetch(`${BASE}/rest/v1/questoes?id=in.(${arg("--ids")})&select=${CAMPOS}`, { headers: H })).json();
  else if (process.argv.includes("--fora-do-ar")) qs = (await (await fetch(`${BASE}/rest/v1/questoes?publicada=is.false&select=${CAMPOS}&limit=2000`, { headers: H })).json()).filter((q) => !/^repetida/.test(q.revisao || ""));
  else { console.log("uso: --ids 1,2,3  ou  --fora-do-ar"); process.exit(0); }

  const npx = path.join(process.env.LOCALAPPDATA, "npm-cache", "_npx");
  let pw = null; for (const d of fs.readdirSync(npx)) { const p = path.join(npx, d, "node_modules", "playwright"); if (fs.existsSync(p)) { pw = require(p); break; } }
  if (!pw) { console.log("playwright nao encontrado"); process.exit(1); }
  fs.mkdirSync(DESTINO, { recursive: true });
  await new Promise((r) => srv.listen(5197, r));
  const nav = await pw.chromium.launch();
  const pg = await nav.newPage();
  await pg.goto("http://localhost:5197/robots.txt").catch(() => {});

  const porArquivo = new Map();
  const relatorio = [];
  for (const q of qs) {
    const a = arquivoDa(q);
    if (!a || !fs.existsSync(path.join(PROVAS, a))) { relatorio.push({ id: q.id, erro: "pdf da prova nao encontrado", prova: q.prova }); continue; }
    const letras = Object.keys(q.alternativas || {}).sort();
    (porArquivo.get(a) || porArquivo.set(a, []).get(a)).push({ id: q.id, numero: q.numero, ultima: letras[letras.length - 1] || "d" });
  }
  for (const [arquivo, pedidas] of porArquivo) {
    const r = await pg.evaluate(recortarNoNavegador, { arquivo, pedidas });
    for (const x of r) {
      if (x.erro) { relatorio.push({ id: x.id, arquivo, erro: x.erro }); continue; }
      const buf = Buffer.from(x.webp.split(",")[1], "base64");
      const nome = `${x.id}-${crypto.createHash("sha256").update(buf).digest("hex").slice(0, 8)}.webp`;
      for (const velho of fs.readdirSync(DESTINO).filter((f) => f.startsWith(x.id + "-"))) fs.unlinkSync(path.join(DESTINO, velho));
      fs.writeFileSync(path.join(DESTINO, nome), buf);
      relatorio.push({ id: x.id, arquivo, imagem: `img/questoes/${nome}`, pedacos: x.pedacos, vermelhos: x.vermelhos, coloridos: x.coloridos, largura: x.largura, altura: x.altura, kb: Math.round(buf.length / 1024) });
    }
    console.log(`  ${arquivo}: ${r.filter((x) => !x.erro).length}/${r.length}`);
  }
  await nav.close(); srv.close();
  const saida = arg("--saida") || path.join(require("os").tmpdir(), "recorta-questoes.json");
  fs.writeFileSync(saida, JSON.stringify(relatorio, null, 1));
  const ok = relatorio.filter((x) => x.imagem);
  console.log(`\n${ok.length} recortadas, ${relatorio.length - ok.length} com erro, ${ok.reduce((s, x) => s + x.kb, 0)} KB no total. Relatorio: ${saida}`);
  for (const x of relatorio.filter((x) => x.erro)) console.log(`  #${x.id} ${x.prova || x.arquivo}: ${x.erro}`);
})();
