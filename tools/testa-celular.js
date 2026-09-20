// TESTA-CELULAR -- o Astral e usavel no telefone, de verdade?
//
// Nao basta "nao quebrou". No celular o que mata usabilidade e diferente:
// alvo de toque pequeno demais para o dedo, texto miudo, conteudo vazando
// para fora da tela, e -- o pior deles, ja aconteceu aqui em 30/07 -- ficar
// PRESO numa pagina porque a barra lateral some e nao ha como traze-la.
//
// Aparelhos escolhidos pelos extremos reais: o menor Android comum (360),
// o iPhone SE (375, o menor iPhone ainda em uso) e o iPhone 14 (390).
//
// Referencia de alvo de toque: 44x44 CSS px (Apple HIG) / 48x48 (Material).
// Falha so quando o alvo e pequeno nos DOIS lados -- um botao de 207x37 e
// apertado, mas a largura salva e ninguem erra; um de 32x32 o dedo erra mesmo.
// 40-43px de altura conta como aviso.
const fs = require("fs");
const path = require("path");
const http = require("http");

const RAIZ = path.resolve(__dirname, "..");
const PORTA = 8896;

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
if (!pw) {
  console.log("TESTA-CELULAR -- pulado: playwright nao encontrado.");
  console.log("  npx --yes playwright install chromium");
  process.exit(0);
}

const tipos = { ".html": "text/html", ".css": "text/css", ".js": "text/javascript", ".woff2": "font/woff2" };
const servidor = http.createServer((q, r) => {
  const u = decodeURIComponent(q.url.split("?")[0]);
  const a = path.join(RAIZ, u === "/" ? "/index.html" : u);
  if (!path.resolve(a).startsWith(RAIZ) || !fs.existsSync(a) || fs.statSync(a).isDirectory()) {
    r.writeHead(404); return r.end("404");
  }
  r.writeHead(200, { "Content-Type": tipos[path.extname(a)] || "text/plain" });
  r.end(fs.readFileSync(a));
});

const APARELHOS = [
  { nome: "Android 360", w: 360, h: 740 },
  { nome: "iPhone SE 375", w: 375, h: 667 },
  { nome: "iPhone 14 390", w: 390, h: 844 },
];
const PAGINAS = fs.readdirSync(RAIZ).filter((f) => f.endsWith(".html"));

let falhas = 0, avisos = 0;
const problemas = [];

const SESSAO = `(() => {
  const d = Math.floor(Date.now()/1000) + 7200;
  localStorage.setItem("sb-jjogmcacbdefwiwcyjxp-auth-token", JSON.stringify({
    access_token:"f", refresh_token:"f", token_type:"bearer", expires_at:d,
    user:{ id:"00000000-0000-0000-0000-000000000001", email:"t@e.com",
           user_metadata:{ full_name:"Teste Silva" }, aud:"authenticated" },
  }));
})()`;

async function abrir(nav, ap, pagina) {
  const ctx = await nav.newContext({
    viewport: { width: ap.w, height: ap.h }, isMobile: true, hasTouch: true, deviceScaleFactor: 2,
  });
  const pg = await ctx.newPage();
  await pg.addInitScript(SESSAO);
  await pg.route("**/rest/v1/**", (r) => r.fulfill({ status: 200, contentType: "application/json", body: "[]" }));
  await pg.route("**/functions/v1/**", (r) => r.fulfill({ status: 200, contentType: "application/json", body: '{"success":true,"data":{}}' }));
  await pg.goto(`http://localhost:${PORTA}/${pagina}`, { waitUntil: "load" }).catch(() => {});
  await pg.waitForTimeout(800);
  return { ctx, pg };
}

(async () => {
  await new Promise((r) => servidor.listen(PORTA, r));
  const nav = await pw.chromium.launch();

  console.log("\n== 1. CONTEUDO VAZANDO / ROLAGEM HORIZONTAL ==");
  for (const ap of APARELHOS) {
    let ruins = 0;
    for (const pagina of PAGINAS) {
      const { ctx, pg } = await abrir(nav, ap, pagina);
      const m = await pg.evaluate(() => {
        const de = document.documentElement;
        const vaza = [];
        for (const el of document.querySelectorAll("body *")) {
          const r = el.getBoundingClientRect();
          const cs = getComputedStyle(el);
          if (cs.display === "none" || cs.visibility === "hidden" || r.width < 1) continue;
          if (cs.position === "fixed") continue;              // menu/toast fora da tela e de proposito
          if (r.right > de.clientWidth + 2) vaza.push(el.tagName.toLowerCase() + "." + String(el.className).split(" ")[0]);
        }
        return { rola: de.scrollWidth > de.clientWidth + 1, scrollW: de.scrollWidth, clientW: de.clientWidth, vaza: [...new Set(vaza)].slice(0, 3) };
      });
      await ctx.close();
      if (m.rola) {
        ruins++; falhas++;
        problemas.push(`${ap.nome} ${pagina}: rola ${m.scrollW} > tela ${m.clientW} | ${m.vaza.join(", ")}`);
      }
    }
    console.log(ruins === 0 ? `  OK     ${ap.nome.padEnd(16)} nenhuma das ${PAGINAS.length} paginas vaza`
                            : `  FALHA  ${ap.nome.padEnd(16)} ${ruins} pagina(s) com rolagem horizontal`);
  }

  console.log("\n== 2. ALVO DE TOQUE (44px e o minimo do dedo) ==");
  {
    const ap = APARELHOS[0];
    let pequenos = 0, apertados = 0, total = 0;
    const exemplos = [];
    for (const pagina of PAGINAS) {
      const { ctx, pg } = await abrir(nav, ap, pagina);
      const m = await pg.evaluate(() => {
        const out = [];
        for (const el of document.querySelectorAll('button, a, [role="button"], input, select')) {
          const cs = getComputedStyle(el);
          if (cs.display === "none" || cs.visibility === "hidden") continue;
          const r = el.getBoundingClientRect();
          if (r.width < 1 || r.height < 1) continue;
          const nome = (el.textContent || el.getAttribute("aria-label") || el.tagName).trim().replace(/\s+/g, " ").slice(0, 22);
          // Um link no meio de uma frase nao segue a regra dos 44px -- ele tem
          // o tamanho da palavra, e aumenta-lo estragaria o paragrafo. So conta
          // como controle o que esta sozinho.
          const pai = el.parentElement;
          const irmaoTexto = pai ? [...pai.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim().length > 2) : false;
          const emLinha = cs.display.startsWith("inline") && irmaoTexto;
          // Caixa com rotulo: quem toca o rotulo marca a caixa, entao o alvo de
          // verdade e o rotulo, nao o quadradinho de 18px. Vale nas duas formas
          // -- <label for="id"> e <label><input>texto</label> (implicito).
          const temRotulo = (el.type === "checkbox" || el.type === "radio")
            && ((el.id && !!document.querySelector(`label[for="${el.id}"]`)) || !!el.closest("label"));
          out.push({ nome, w: Math.round(r.width), h: Math.round(r.height), emLinha, temRotulo });
        }
        return out;
      });
      await ctx.close();
      for (const t of m) {
        if (t.emLinha || t.temRotulo) continue;
        total++;
        const menor = Math.min(t.w, t.h);
        // Abaixo de 32px em AMBOS os lados o dedo erra de verdade. Um botao
        // de 207x37 e apertado, mas ninguem erra: largura salva.
        if (t.w < 44 && t.h < 40) { pequenos++; if (exemplos.length < 6) exemplos.push(`${pagina} "${t.nome}" ${t.w}x${t.h}`); }
        else if (menor < 44) apertados++;
      }
    }
    falhas += pequenos;
    avisos += apertados;
    console.log(`  ${pequenos === 0 ? "OK    " : "FALHA "} controles medidos: ${total} | pequeno nos dois lados: ${pequenos} | apertado (<44px de altura): ${apertados}`);
    for (const e of exemplos) console.log(`           ${e}`);
  }

  console.log("\n== 3. NAO FICAR PRESO: o menu abre e fecha? ==");
  {
    const ap = APARELHOS[0];
    // 🔴 A lista NAO se escreve a mao. Ela ja envelheceu calada uma vez: tags e
    // cronograma nasceram depois do conserto de 30/07 e ficaram de fora, entao o
    // teste passava verde enquanto a barra cobria 2/3 do celular. Quem tem barra
    // lateral diz isso no proprio arquivo -- perguntar a ele, nao a uma lista.
    const comSidebar = PAGINAS.filter((f) =>
      /class\s*=\s*["'][^"']*\bsidebar\b/.test(fs.readFileSync(path.join(RAIZ, f), "utf8")));
    console.log(`  (${comSidebar.length} paginas tem barra lateral: ${comSidebar.join(" ")})`);
    let ruins = 0;
    for (const pagina of comSidebar) {
      const { ctx, pg } = await abrir(nav, ap, pagina);
      const antes = await pg.evaluate(() => {
        const s = document.querySelector(".sidebar");
        return s ? Math.round(s.getBoundingClientRect().right) : null;
      });
      // A barra tem de estar ESCONDIDA antes de o botao abrir. Em 17/09 tags e
      // cronograma falharam aqui: fixed, 240px, sem translate -- cobriam 240 de
      // 360px de tela, e o botao "nao abria" porque ja estava aberta.
      if (antes > 4) {
        ruins++; falhas++;
        problemas.push(`${pagina}: a barra lateral NAO se esconde no celular -- cobre ${antes}px de ${ap.w}`);
        await ctx.close(); continue;
      }
      const temBotao = await pg.$("#astral-menu-btn");
      if (!temBotao) { ruins++; falhas++; problemas.push(`${pagina}: sem botao de menu no celular`); await ctx.close(); continue; }
      await pg.click("#astral-menu-btn").catch(() => {});
      await pg.waitForTimeout(500);
      const aberto = await pg.evaluate(() => {
        const s = document.querySelector(".sidebar");
        return s ? Math.round(s.getBoundingClientRect().right) : null;
      });
      // fecha no Escape
      await pg.keyboard.press("Escape").catch(() => {});
      await pg.waitForTimeout(500);
      const fechado = await pg.evaluate(() => {
        const s = document.querySelector(".sidebar");
        return s ? Math.round(s.getBoundingClientRect().right) : null;
      });
      await ctx.close();
      const abriu = aberto > antes;
      const fechou = fechado <= antes + 2;
      if (!abriu || !fechou) {
        ruins++; falhas++;
        problemas.push(`${pagina}: menu ${abriu ? "abre" : "NAO ABRE"}, ${fechou ? "fecha" : "NAO FECHA"} (${antes} -> ${aberto} -> ${fechado})`);
      }
    }
    console.log(ruins === 0 ? `  OK     as ${comSidebar.length} paginas do app: menu abre e fecha`
                            : `  FALHA  ${ruins} pagina(s) com problema no menu`);
  }

  console.log("\n== 4. TEXTO LEGIVEL (abaixo de 12px cansa no celular) ==");
  {
    const ap = APARELHOS[0];
    let miudos = 0, total = 0, rotulos = 0;
    const exemplos = [];
    for (const pagina of PAGINAS) {
      const { ctx, pg } = await abrir(nav, ap, pagina);
      const m = await pg.evaluate(() => {
        const out = [];
        for (const el of document.querySelectorAll("body *")) {
          const tem = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim().length > 3);
          if (!tem) continue;
          const cs = getComputedStyle(el);
          if (cs.display === "none" || cs.visibility === "hidden") continue;
          // "DIAS ATE A PROVA" em caixa alta com espacamento, acima de um numero
          // grande, e rotulo -- e o padrao de insignia que o design escolheu, nao
          // texto de leitura. A regra dos 12px vale para o que a pessoa LE.
          const rotulo = cs.textTransform === "uppercase" || parseFloat(cs.letterSpacing) > 0.5;
          out.push({ px: parseFloat(cs.fontSize), rotulo, txt: el.textContent.trim().replace(/\s+/g, " ").slice(0, 26) });
        }
        return out;
      });
      await ctx.close();
      for (const t of m) {
        if (t.rotulo) { rotulos++; continue; }
        total++;
        if (t.px < 12) { miudos++; if (exemplos.length < 5) exemplos.push(`${pagina} ${t.px}px "${t.txt}"`); }
      }
    }
    avisos += miudos;
    console.log(`  ${miudos === 0 ? "OK    " : "AVISO "} texto de leitura: ${total} | abaixo de 12px: ${miudos}`);
    console.log(`           (${rotulos} rotulos em caixa alta nao contam -- ver comentario no codigo)`);
    for (const e of exemplos) console.log(`           ${e}`);
  }

  await nav.close();
  servidor.close();

  if (problemas.length) { console.log("\ndetalhe:"); for (const p of problemas.slice(0, 12)) console.log("  " + p); }
  console.log("\n" + "=".repeat(70));
  console.log(falhas === 0
    ? `O ASTRAL E USAVEL NO CELULAR.${avisos ? `  (${avisos} aviso(s) -- ver acima)` : ""}`
    : `🔴 ${falhas} FALHA(S) no celular.`);
  process.exit(falhas === 0 ? 0 : 1);
})();
