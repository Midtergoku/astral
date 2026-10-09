/* ═══════════════════════════════════════════════════════════════════════════
   TESTA-ACESSIVEL -- o Astral se le e se toca no celular?
   (04/10/2026 -- auditoria UX-02 + UX-03 + UX-08, roadmap 3.10)

   A auditoria, medindo a producao a mao:
     UX-02  texto branco sobre o dourado: 3,04:1 ("Comecar agora", "Cadastrar").
            O minimo para texto desse tamanho e 4,5:1 (WCAG 1.4.3).
     UX-03  campo com letra menor que 16 px faz o Safari do iPhone AMPLIAR a
            tela ao tocar (Entrar 2, Criar conta 3, Lista 4, Banco 5, TAF 4...).
     UX-08  alvo de toque menor que 24 x 24 px (WCAG 2.5.8): caixas de 13 x 13
            no TAF, botoes de 22 x 22 no painel.

   Abre TODAS as paginas (descobertas na pasta, nunca lista a mao) em 375 px,
   com uma conta de teste de verdade (edital, materias, sessoes, rotina), e mede:
     1. contraste de todo BOTAO (button, .btn*, [role=button], input de envio)
        e de todo rotulo pequeno em MAIUSCULAS -- >= 4,5:1 (3:1 se texto grande)
     2. fonte de todo campo (input, select, textarea) -- >= 16 px
     3. tamanho de todo alvo de toque -- >= 24 x 24 px. Excecoes da propria
        WCAG: link no meio de uma frase; caixa/opcao cujo <label> clicavel
        tem 24 px (o rotulo tambem marca a caixa).

   O fundo e achado subindo os ancestrais e misturando as transparencias. Em
   degrade, vale o PIOR contraste entre as cores dele. Fundo com foto nao da para
   medir assim: conta como "nao medido" e aparece na saida -- nunca aprovado em silencio.

   USO   node tools/testa-acessivel.js            (producao; cria e apaga a conta)
         node tools/testa-acessivel.js --tudo     (lista cada elemento reprovado)
         ASTRAL_RAIZ=<pasta> ...                  (paginas de outra copia do site)
   Nao gasta credito.
   ═══════════════════════════════════════════════════════════════════════════ */
const { execSync } = require("child_process");
const crypto = require("crypto");
const fs = require("fs");
const http = require("http");
const path = require("path");

const { REF, reescrever } = require("./testes/alvo");   // 09/10/2026 (COD-02): ASTRAL_DEV=1 -> astral-dev (tools/testes/alvo.js)
const BASE = `https://${REF}.supabase.co`;
const RAIZ = process.env.ASTRAL_RAIZ ? path.resolve(process.env.ASTRAL_RAIZ) : path.resolve(__dirname, "..");
const TUDO = process.argv.includes("--tudo");
const SK = JSON.parse(execSync(`supabase projects api-keys --project-ref ${REF} -o json`, { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] })).find((k) => k.name === "service_role").api_key;
const PUB = require("./testes/alvo").PUB;
const admin = { apikey: SK, Authorization: `Bearer ${SK}`, "Content-Type": "application/json" };
async function req(c, o = {}) { const r = await fetch(BASE + c, o); const t = await r.text(); let corpo = null; try { corpo = JSON.parse(t); } catch { corpo = t; } return { status: r.status, corpo }; }

const tipos = { ".html": "text/html", ".css": "text/css", ".js": "text/javascript", ".mjs": "text/javascript", ".woff2": "font/woff2", ".svg": "image/svg+xml", ".webp": "image/webp", ".png": "image/png" };
const PORTA = 5173;   // uma das portas que as funcoes aceitam (CORS)
const servidor = http.createServer((q, r) => {
  const u = decodeURIComponent(q.url.split("?")[0]); const a = path.join(RAIZ, u === "/" ? "index.html" : u);
  if (!path.resolve(a).startsWith(RAIZ) || !fs.existsSync(a) || fs.statSync(a).isDirectory()) { r.writeHead(404); return r.end(); }
  r.writeHead(200, { "Content-Type": tipos[path.extname(a)] || "text/plain" }); r.end(reescrever(a, fs.readFileSync(a)));
});
const PAGINAS = fs.readdirSync(RAIZ).filter((f) => f.endsWith(".html")).sort();

/* ── A medicao, dentro da pagina ─────────────────────────────────────────── */
function medirNaPagina() {
  // rgb()/rgba() e tambem color(srgb r g b / a) -- e assim que o navegador devolve o color-mix
  const rgba = (s) => {
    const m = String(s).match(/rgba?\(([^)]+)\)/);
    if (m) { const p = m[1].split(/[\s,\/]+/).filter(Boolean).map(Number); return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 }; }
    const c = String(s).match(/color\(srgb ([^)]+)\)/);
    if (c) { const p = c[1].split(/[\s\/]+/).filter(Boolean).map(Number); return { r: p[0] * 255, g: p[1] * 255, b: p[2] * 255, a: p.length > 3 ? p[3] : 1 }; }
    return null;
  };
  const sobre = (c, f) => ({ r: c.r * c.a + f.r * (1 - c.a), g: c.g * c.a + f.g * (1 - c.a), b: c.b * c.a + f.b * (1 - c.a), a: 1 });
  const lum = (c) => { const t = [c.r, c.g, c.b].map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }); return 0.2126 * t[0] + 0.7152 * t[1] + 0.0722 * t[2]; };
  const razao = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
  // visivel = tem tamanho, nao esta escondido e a opacidade ACUMULADA dos ancestrais nao e ~0
  // (a dica da Arvore so aparece no toque: opacidade 0 no pai, nao e texto na tela)
  const visivel = (el) => {
    const r = el.getBoundingClientRect(); if (r.width < 1 || r.height < 1) return false;
    const cs = getComputedStyle(el); if (cs.visibility === "hidden" || cs.display === "none") return false;
    let op = 1; for (let e = el; e; e = e.parentElement) op *= Number(getComputedStyle(e).opacity);
    return op > 0.1 && !el.closest("[hidden],[aria-hidden=true],dialog:not([open])");
  };
  const nome = (el) => { const t = (el.innerText || el.value || el.getAttribute("aria-label") || el.title || "").replace(/\s+/g, " ").trim().slice(0, 34); return `${el.tagName.toLowerCase()}${el.id ? "#" + el.id : ""}${el.classList.length ? "." + [...el.classList].slice(0, 2).join(".") : ""} "${t}"`; };

  // o fundo de verdade: sobe misturando as camadas; imagem/gradiente = nao da para medir
  // Devolve a LISTA de fundos possiveis atras do texto. Cor lisa: um so. Degrade: um por
  // cor do degrade (o texto passa por todas) -- e o contraste vale o PIOR deles.
  function fundos(el) {
    const camadas = [];   // cada camada: lista de cores (1 = lisa; varias = degrade)
    for (let e = el; e; e = e.parentElement) {
      const cs = getComputedStyle(e);
      const img = cs.backgroundImage || "none";
      if (/url\(/.test(img)) return null;                          // foto: nao da para medir assim
      const c = rgba(cs.backgroundColor);
      if (!c && cs.backgroundColor !== "rgba(0, 0, 0, 0)") return null;   // formato de cor que nao sei ler
      if (/gradient/.test(img)) {
        const cores = (img.match(/rgba?\([^)]*\)|color\(srgb[^)]*\)/g) || []).map(rgba).filter(Boolean);
        if (!cores.length || img.match(/(oklab|oklch|lab|lch|hsl)\(/)) return null;
        camadas.push(cores);
        if (cores.every((x) => x.a >= 1)) break;
      }
      if (c && c.a > 0) { camadas.push([c]); if (c.a >= 1) break; }
    }
    let fs = [{ r: 255, g: 255, b: 255, a: 1 }];
    for (let i = camadas.length - 1; i >= 0; i--) fs = camadas[i].flatMap((cor) => fs.map((f) => sobre(cor, f)));
    return fs;
  }
  function contraste(el) {
    const cs = getComputedStyle(el);
    const fs = fundos(el); if (!fs) return { naoMedido: true };
    const c0 = rgba(cs.color); if (!c0) return { naoMedido: true };
    // opacidade herdada dos ancestrais esmaece o texto
    let op = 1; for (let e = el; e; e = e.parentElement) op *= Number(getComputedStyle(e).opacity);
    const r = Math.min(...fs.map((f) => razao(sobre({ ...c0, a: c0.a * op }, f), f)));
    const px = parseFloat(cs.fontSize), peso = Number(cs.fontWeight) || 400;
    const grande = px >= 24 || (px >= 18.66 && peso >= 700);
    return { r, min: grande ? 3 : 4.5, px };
  }
  const temTextoProprio = (el) => [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim());

  const out = { botoes: [], rotulos: [], campos: [], alvos: [], naoMedidos: [] };
  // 1. botoes
  const BOT = "button, .btn, .btn-roxo, .btn-fantasma, .btn-primary, .btn-1, [role=button], input[type=submit], input[type=button]";
  for (const el of document.querySelectorAll(BOT)) {
    if (!visivel(el) || el.disabled) continue;
    const alvoTxt = temTextoProprio(el) || el.tagName === "INPUT" ? el : [...el.querySelectorAll("*")].find((x) => temTextoProprio(x) && visivel(x));
    if (!alvoTxt) continue;   // botao so de icone: o contraste do icone e outra regra (3:1)
    const m = contraste(alvoTxt);
    if (m.naoMedido) out.naoMedidos.push(nome(el));
    else if (m.r < m.min) out.botoes.push(`${nome(el)} ${m.r.toFixed(2)}:1 (${m.px}px)`);
  }
  // 1b. rotulos pequenos em maiusculas (a auditoria: "SESSOES", "MATERIA" a 4,2:1)
  for (const el of document.querySelectorAll("body *")) {
    if (!temTextoProprio(el) || !visivel(el) || el.closest(BOT)) continue;
    const cs = getComputedStyle(el);
    if (cs.textTransform !== "uppercase" || parseFloat(cs.fontSize) > 14) continue;
    const m = contraste(el);
    if (m.naoMedido) continue;
    if (m.r < m.min) out.rotulos.push(`${nome(el)} ${m.r.toFixed(2)}:1 (${m.px}px)`);
  }
  // 2. campos que dao zoom no iPhone
  for (const el of document.querySelectorAll("input, select, textarea")) {
    if (["checkbox", "radio", "range", "hidden", "submit", "button", "file", "color"].includes(el.type) || !visivel(el)) continue;
    const px = parseFloat(getComputedStyle(el).fontSize);
    if (px < 16) out.campos.push(`${nome(el)} ${px}px`);
    else if (px > 16.5) out.camposGrandes = [...(out.camposGrandes || []), `${nome(el)} ${px}px`];   // so informativo
  }
  // 3. alvos de toque
  // O <label> de um campo de texto nao e um alvo a parte: o alvo e o proprio campo (e ele e
  // medido). O rotulo de caixa/opcao entra pela excecao abaixo.
  const ALVO = "a[href], button, input:not([type=hidden]), select, textarea, summary, [role=button], [role=tab], [onclick]";
  for (const el of document.querySelectorAll(ALVO)) {
    if (!visivel(el) || el.disabled) continue;
    const r = el.getBoundingClientRect();
    if (r.width >= 24 && r.height >= 24) continue;
    const cs = getComputedStyle(el);
    // excecao WCAG: link dentro de uma frase
    if (el.tagName === "A" && cs.display === "inline" && el.parentElement && (el.parentElement.innerText || "").trim().length > (el.innerText || "").trim().length + 10) continue;
    // excecao: caixa/opcao com rotulo clicavel de 24 px
    if (el.tagName === "INPUT" && ["checkbox", "radio"].includes(el.type)) {
      const lab = el.closest("label") || (el.id && document.querySelector(`label[for="${CSS.escape(el.id)}"]`));
      if (lab) { const lr = lab.getBoundingClientRect(); if (lr.width >= 24 && lr.height >= 24) continue; }
    }
    out.alvos.push(`${nome(el)} ${Math.round(r.width)}x${Math.round(r.height)}`);
  }
  return out;
}

let falhas = 0;
(async () => {
  let uid = null, nav = null;
  await new Promise((r) => servidor.listen(PORTA, r));
  const total = { botoes: 0, rotulos: 0, campos: 0, alvos: 0, naoMedidos: 0, interface: 0 };
  const porRegra = {};
  const { regrasDeInterface } = require("./testes/regras-de-interface.js");
  try {
    const npx = path.join(process.env.LOCALAPPDATA, "npm-cache", "_npx");
    let pw = null; for (const d of fs.readdirSync(npx)) { const p = path.join(npx, d, "node_modules", "playwright"); if (fs.existsSync(p)) { pw = require(p); break; } }
    if (!pw) throw new Error("playwright nao encontrado");

    // conta de verdade, com edital, materias, sessoes e rotina: as telas cheias
    const email = `acessivel-${Date.now()}@astral-teste.local`;
    const u = await req("/auth/v1/admin/users", { method: "POST", headers: admin, body: JSON.stringify({ email, password: "T!" + crypto.randomUUID(), email_confirm: true }) });
    uid = u.corpo.id;
    const link = await req("/auth/v1/admin/generate_link", { method: "POST", headers: admin, body: JSON.stringify({ type: "magiclink", email }) });
    const s = (await req("/auth/v1/verify", { method: "POST", headers: { apikey: PUB, "Content-Type": "application/json" }, body: JSON.stringify({ type: "magiclink", token_hash: link.corpo.hashed_token }) })).corpo;
    const cab = { apikey: PUB, Authorization: `Bearer ${s.access_token}`, "Content-Type": "application/json" };
    const materias = [{ nome: "Português", peso: 40, progresso: 0 }, { nome: "Matemática", peso: 40, progresso: 0 }, { nome: "História", peso: 20, progresso: 0 }];
    const salvar = () => req("/rest/v1/rpc/salvar_progresso", { method: "POST", headers: cab, body: JSON.stringify({ p_xp: 0, p_streak: 0, p_horas: 0,
      p_edital: { nome: "Teste Acessivel ESA", forca: "exercito", patenteInicial: null, hash: "b".repeat(64) }, p_materias: materias, p_cronograma_hoje: [], p_badges: [], p_tag_escolhida: null }) });
    await salvar();
    await req(`/rest/v1/progresso?usuario_id=eq.${uid}`, { method: "PATCH", headers: admin, body: JSON.stringify({ rotina: { dias: [0, 1, 2, 3, 4, 5, 6], minutosUtil: 120, minutosFds: 120, bloco: 40 } }) });
    await req("/rest/v1/sessoes_estudo", { method: "POST", headers: { ...admin, Prefer: "return=minimal" },
      body: JSON.stringify(Array.from({ length: 12 }, (_, i) => ({ usuario_id: uid, materia: materias[i % 3].nome, segundos: 3600, xp: 120, modo: "livre", criado_em: new Date(Date.now() - (12 - i) * 86400000).toISOString() }))) });
    await salvar();

    nav = await pw.chromium.launch();
    const sessao = `localStorage.setItem("sb-${REF}-auth-token", ${JSON.stringify(JSON.stringify({ access_token: s.access_token, refresh_token: s.refresh_token, token_type: "bearer", expires_at: Math.floor(Date.now() / 1000) + 3600, user: s.user }))});`;
    async function abrir(pagina, logado) {
      const ctx = await nav.newContext({ viewport: { width: 375, height: 667 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
      await ctx.addInitScript(require("./testes/aceite-de-teste.js").SCRIPT);
      if (logado) await ctx.addInitScript(sessao);
      // nada de IA, nada de registro de erro de verdade
      await ctx.route("**/functions/v1/buscar-recursos", (r) => r.fulfill({ status: 402, contentType: "application/json", body: '{"error":"sem credito (teste)"}' }));
      await ctx.route("**/functions/v1/gerar-questoes", (r) => r.fulfill({ status: 402, contentType: "application/json", body: '{"error":"sem credito (teste)"}' }));
      await ctx.route("**/functions/v1/registrar-erro", (r) => r.fulfill({ status: 204, body: "" }));
      const pg = await ctx.newPage();
      await pg.goto(`http://localhost:${PORTA}/${pagina}`, { waitUntil: "load" }).catch(() => {});
      await pg.waitForTimeout(3000);
      // rola a pagina inteira (as entradas "ao aparecer na tela" disparam) e termina as
      // animacoes: medir um elemento no meio do surgimento dava 1:1 de mentira
      await pg.evaluate(async () => {
        for (let y = 0; y < document.body.scrollHeight; y += 400) { window.scrollTo(0, y); await new Promise((r) => setTimeout(r, 60)); }
        await new Promise((r) => setTimeout(r, 900));
        for (const a of document.getAnimations()) { try { a.finish(); } catch { /* infinita */ } }
        window.scrollTo(0, 0);
      }).catch(() => {});
      await pg.waitForTimeout(300);
      return { ctx, pg };
    }

    console.log(`\nTESTA-ACESSIVEL  ${PAGINAS.length} paginas em 375 px${process.env.ASTRAL_RAIZ ? "  (" + RAIZ + ")" : ""}\n`);
    console.log(`  ${"pagina".padEnd(22)} botao  rotulo  campo  alvo  interf. (reprovados; interf. = regras da Vercel)`);
    for (const pagina of PAGINAS) {
      // primeiro como visitante; se a pagina manda para o login, entra logado
      let { ctx, pg } = await abrir(pagina, false);
      if (!pg.url().includes(pagina)) { await ctx.close(); ({ ctx, pg } = await abrir(pagina, true)); }
      // pagina antiga que so redireciona (edital.html, recursos.html -> painel): o destino ja e medido
      if (!pg.url().includes(pagina)) { console.log(`  --     ${pagina.padEnd(22)} redireciona para ${pg.url().split("/").pop()}`); await ctx.close(); continue; }
      const m = await pg.evaluate(medirNaPagina).catch((e) => ({ erro: e.message }));
      // 08/10/2026 (3.10b): as regras da Vercel que dao para medir (tools/testes/regras-de-interface.js)
      if (!m.erro) m.interface = (await pg.evaluate(regrasDeInterface).catch((e) => [{ regra: "erro", onde: e.message.slice(0, 80) }])).map((x) => `${x.regra.padEnd(22)} ${x.onde}`);
      // ASTRAL_FOTOS=<pasta>: guarda a pagina inteira para conferir a olho (o numero nao diz se ficou bonito)
      if (process.env.ASTRAL_FOTOS) await pg.screenshot({ path: path.join(process.env.ASTRAL_FOTOS, pagina.replace(".html", ".png")), fullPage: true }).catch(() => {});
      await ctx.close();
      if (m.erro) { console.log(`  FALHA  ${pagina}: ${m.erro.slice(0, 100)}`); falhas++; continue; }
      for (const k of Object.keys(total)) total[k] += m[k].length;
      const n = (k) => String(m[k].length).padStart(5);
      for (const x of m.interface) { const r = x.split(" ")[0]; porRegra[r] = (porRegra[r] || 0) + 1; }
      const ruim = m.botoes.length + m.rotulos.length + m.campos.length + m.alvos.length + m.interface.length;
      console.log(`  ${ruim ? "FALHA" : "OK   "}  ${pagina.padEnd(22)}${n("botoes")}  ${n("rotulos")}  ${n("campos")}  ${n("alvos")}  ${n("interface")}${m.naoMedidos.length ? `   (${m.naoMedidos.length} botao(oes) sobre imagem, nao medidos)` : ""}`);
      if (ruim) falhas++;
      if (TUDO) for (const k of ["botoes", "rotulos", "campos", "alvos", "interface", "naoMedidos", "camposGrandes"]) for (const x of (m[k] || [])) console.log(`           ${k.padEnd(10)} ${x}`);
    }
    console.log(`\n  total: ${total.botoes} botoes sem contraste · ${total.rotulos} rotulos pequenos sem contraste · ${total.campos} campos < 16 px · ${total.alvos} alvos < 24 px · ${total.interface} regras da Vercel · ${total.naoMedidos} nao medidos`);
    if (total.interface) console.log(`  regras da Vercel, por regra: ${Object.entries(porRegra).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} (${v})`).join(", ")}`);
  } catch (e) {
    console.log("  FALHA  o teste quebrou:", e.message.slice(0, 140)); falhas++;
  } finally {
    if (nav) await nav.close();
    servidor.close();
    if (uid) await req(`/auth/v1/admin/users/${uid}`, { method: "DELETE", headers: admin });
    console.log("\n  (conta de teste apagada)");
    console.log("\n" + "=".repeat(70));
    console.log(falhas === 0 ? "TODA PÁGINA SE LÊ E SE TOCA NO CELULAR." : `🔴 ${falhas} PÁGINA(S) COM PROBLEMA.`);
    process.exit(falhas ? 1 : 0);
  }
})();
