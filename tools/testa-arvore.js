// TESTA-ARVORE -- o quadro de operações é coerente, e é NOSSO?
//
// Duas camadas, e a segunda é a que vale o pedido dele.
//
// 1. LÓGICA: toda condecoração tem lugar, a ordem dentro da frente é crescente,
//    e não existe degrau conquistado com o anterior vazio -- isso é impossível
//    por construção (quem tem 100 horas passou por 50), então se aparecer é
//    defeito.
//
// 2. FORMA: ele mandou uma árvore de talentos de jogo de fantasia como exemplo
//    e pediu para NÃO ser daquele jeito -- "quero nossas cores, com relação
//    com a parte do militar". Então o teste cobra isso: cor só de token do
//    design system, e nenhum vocabulário de fantasia.
const path = require("path");
const fs = require("fs");
const { execSync } = require("child_process");
const http = require("http");
const { pathToFileURL } = require("url");

const REF = "jjogmcacbdefwiwcyjxp";
const BASE = `https://${REF}.supabase.co`;
const RAIZ = path.resolve(__dirname, "..");
const PORTA = 8885;

let falhas = 0;
const ok = (t, d = "") => console.log(`  OK     ${t.padEnd(48)} ${d}`);
const falha = (t, d = "") => { console.log(`  FALHA  ${t.padEnd(48)} ${d}`); falhas++; };

(async () => {
  const A = await import(pathToFileURL(path.join(RAIZ, "assets/js/arvore.js")).href);
  const C = await import(pathToFileURL(path.join(RAIZ, "assets/js/condecoracoes.js")).href);
  const cat = await import(pathToFileURL(path.join(RAIZ, "assets/js/catalogo.js")).href);

  console.log("\nTESTA-ARVORE\n");

  const ZERO = {
    sessoes: 0, horas: 0, xp: 0, streak: 0, maiorSessaoMin: 0, diasEstudados: 0,
    meses: 0, sessoesNoDiaMax: 0, horasNoDiaMax: 0, materiasNoDiaMax: 0,
    semanasPerfeitas: 0, materiaSeguidaMax: 0, maiorRetornoDias: 0,
    temEdital: false, dominioMinimo: 0, dominioMenosEstudada: 0, materias: [],
    porHora: {}, porDiaSemana: {}, porModo: {},
    atributos: { disciplina: { valor: 0 }, resistencia: { valor: 0 },
                 amplitude: { valor: 0 }, doutrina: { valor: 0 }, precisao: { valor: null } },
  };

  const vazio = A.montarQuadro(C.conferir(ZERO).condecoracoes);

  // ── 1. 🔴 Toda condecoração tem lugar no quadro ──────────────────────────
  // Uma órfã seria conquistada e sem onde aparecer -- invisível para sempre.
  if (!vazio.orfas.length) ok("🎯 toda condecoração tem uma frente", `${vazio.resumo.total} nós`);
  else falha("condecoração sem frente", vazio.orfas.join(", "));

  if (vazio.resumo.total === cat.CONDECORACOES.length) {
    ok("nenhuma se perdeu no caminho", `${vazio.resumo.total} de ${cat.CONDECORACOES.length}`);
  } else {
    falha("o quadro perdeu condecorações", `${vazio.resumo.total} de ${cat.CONDECORACOES.length}`);
  }

  // Nenhuma pode estar em DUAS frentes -- apareceria duplicada.
  const todosIds = vazio.frentes.flatMap((f) => f.nós.map((n) => n.id));
  if (new Set(todosIds).size === todosIds.length) ok("nenhuma aparece em duas frentes");
  else falha("condecoração duplicada", "aparece em mais de uma frente");

  // ── 2. A ordem dentro da frente é CRESCENTE em exigência ────────────────
  let foraDeOrdem = [];
  for (const f of vazio.frentes) {
    const def = A.FRENTES.find((x) => x.id === f.id);
    const custos = f.nós.map((n) => def.ordena(n.condicao) || 0);
    for (let i = 1; i < custos.length; i++) {
      if (custos[i] < custos[i - 1]) foraDeOrdem.push(`${f.id}: ${f.nós[i - 1].nome} → ${f.nós[i].nome}`);
    }
  }
  if (!foraDeOrdem.length) ok("cada frente sobe em exigência", `${vazio.frentes.length} frentes conferidas`);
  else falha("degrau fora de ordem", foraDeOrdem.slice(0, 3).join(" | "));

  // Toda frente tem pelo menos 3 degraus -- com menos, não é frente, é item
  // solto, e a forma de árvore não se sustenta.
  const curtas = vazio.frentes.filter((f) => f.nós.length < 3).map((f) => `${f.id} (${f.nós.length})`);
  if (!curtas.length) ok("toda frente tem pelo menos 3 degraus", vazio.frentes.map((f) => `${f.id}:${f.nós.length}`).join(" "));
  else falha("frente curta demais", curtas.join(", "));

  // ── 3. Quadro vazio: nada conquistado, e o atual é o primeiro ───────────
  if (vazio.resumo.conquistadas === 0) ok("quem nunca estudou tem o quadro apagado", "0 conquistadas");
  else falha("nó aceso sem estudo", String(vazio.resumo.conquistadas));

  const atuaisCertos = vazio.frentes.every((f) => f.atual?.id === f.nós[0].id);
  if (atuaisCertos) ok("o próximo degrau é o primeiro de cada frente", vazio.frentes.map((f) => f.atual.nome).slice(0, 3).join(" · ") + "…");
  else falha("o degrau atual está errado no quadro vazio");

  // ── 4. 🔴 NUNCA um degrau aceso com o anterior apagado ──────────────────
  // Isso é impossível na vida real: quem tem 100 horas passou por 50. Se o
  // quadro mostrar um buraco, a ordem da frente está errada -- e o jogador
  // veria um caminho que não existe.
  const TUDO = {
    ...ZERO,
    sessoes: 9999, horas: 9999, xp: 999999, streak: 9999, maiorSessaoMin: 9999,
    diasEstudados: 9999, meses: 9999, sessoesNoDiaMax: 99, horasNoDiaMax: 24,
    materiasNoDiaMax: 99, semanasPerfeitas: 999, materiaSeguidaMax: 999,
    maiorRetornoDias: 999, temEdital: true, dominioMinimo: 100, dominioMenosEstudada: 100,
    materias: ["Português", "Matemática", "Física", "Inglês", "Direito", "Geografia"]
      .map((nome) => ({ nome, progresso: 100 })),
    porHora: Object.fromEntries([...Array(24)].map((_, h) => [h, 999])),
    porDiaSemana: Object.fromEntries([...Array(7)].map((_, d) => [d, 999])),
    porModo: { livre: 999, pomodoro: 999, cronograma: 999 },
    atributos: { disciplina: { valor: 100 }, resistencia: { valor: 100 },
                 amplitude: { valor: 100 }, doutrina: { valor: 100 }, precisao: { valor: null } },
  };
  const cheio = A.montarQuadro(C.conferir(TUDO).condecoracoes);
  if (cheio.resumo.conquistadas === cheio.resumo.total) ok("🏆 quem faz tudo acende o quadro inteiro", `${cheio.resumo.conquistadas} nós`);
  else falha("nó que nunca acende", `${cheio.resumo.conquistadas} de ${cheio.resumo.total}`);
  if (cheio.resumo.frentesCompletas === cheio.resumo.frentes) ok("todas as frentes fecham", String(cheio.resumo.frentes));
  else falha("frente que nunca fecha", `${cheio.resumo.frentesCompletas} de ${cheio.resumo.frentes}`);

  /* Meio do caminho: um usuário com 60 horas. Na frente do TEMPO, os degraus
     até 50h acendem e os de 100h+ não -- sem buraco no meio. */
  const meio = A.montarQuadro(C.conferir({ ...ZERO, horas: 60 }).condecoracoes);
  const tempo = meio.frentes.find((f) => f.id === "tempo");
  let buraco = null;
  for (let i = 1; i < tempo.nós.length; i++) {
    if (tempo.nós[i].conquistada && !tempo.nós[i - 1].conquistada) {
      buraco = `${tempo.nós[i - 1].nome} apagado, ${tempo.nós[i].nome} aceso`;
    }
  }
  if (!buraco) ok("🎯 nenhum degrau aceso com o anterior apagado", `60h acende ${tempo.feitos} de ${tempo.total}`);
  else falha("buraco no caminho", buraco);

  if (tempo.atual && /cem horas/i.test(tempo.atual.nome)) ok("o próximo degrau é o certo", `com 60h, falta ${tempo.atual.nome}`);
  else falha("próximo degrau errado", String(tempo.atual?.nome));

  // ── 5. 🔴 A FORMA É NOSSA, não a do exemplo que ele mandou ──────────────
  const pagina = fs.readFileSync(path.join(RAIZ, "arvore.html"), "utf8");

  // Cor só por token. Um hex solto na página quebra a paleta inteira depois.
  const hexes = (pagina.match(/#[0-9a-fA-F]{3,8}\b/g) || []);
  if (!hexes.length) ok("🎯 nenhuma cor fora do design system", "só tokens");
  else falha("cor solta na página", hexes.slice(0, 5).join(", "));

  // Vocabulário: militar, não fantasia. Ele foi explícito sobre isso em 01/08.
  const FANTASIA = /\b(talento|magia|m[áa]gico|mago|feiti[çc]|drag[ãa]o|elfo|orc|masmorra|skill tree|build)\b/i;
  if (!FANTASIA.test(pagina)) ok("nenhum vocabulário de fantasia", "militar, como ele pediu");
  else falha("palavra de fantasia na página", (pagina.match(FANTASIA) || [])[0]);

  // A forma tem de ser hexagonal -- grade de mapa tático, não círculo de jogo.
  if (/clip-path:\s*polygon/.test(pagina)) ok("os nós são hexágonos", "forma de mapa tático, não círculo");
  else falha("os nós não são hexagonais");

  // E o nome das frentes tem de ser do nosso mundo.
  const nomes = A.FRENTES.map((f) => f.nome).join(" ");
  if (/marcha|vig[íi]lia|terreno|comando|f[ôo]lego/i.test(nomes)) ok("as frentes têm nome militar", nomes);
  else falha("nomes genéricos nas frentes", nomes);

  // ── 6. A TELA ────────────────────────────────────────────────────────────
  function acharPlaywright() {
    try { return require("playwright"); } catch { /* segue */ }
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
    console.log("\n  (playwright não encontrado -- a parte de TELA foi pulada)");
  } else {
    const chaves = JSON.parse(execSync(`supabase projects api-keys --project-ref ${REF} -o json`, {
      encoding: "utf8", stdio: ["ignore", "pipe", "ignore"],
    }));
    const SERVICE = chaves.find((k) => k.name === "service_role").api_key;
    const PUB = (fs.readFileSync(path.join(RAIZ, "assets/js/astral.js"), "utf8")
      .match(/sb_publishable_[A-Za-z0-9_-]+/) || [])[0];
    const admin = { apikey: SERVICE, Authorization: `Bearer ${SERVICE}`, "Content-Type": "application/json" };
    const req = async (c, o) => {
      const r = await fetch(`${BASE}${c}`, o);
      let corpo = null; try { corpo = await r.json(); } catch { /* sem corpo */ }
      return { status: r.status, corpo };
    };

    const tipos = { ".html": "text/html", ".css": "text/css", ".js": "text/javascript", ".woff2": "font/woff2" };
    const servidor = http.createServer((q, r) => {
      const u = decodeURIComponent(q.url.split("?")[0]);
      const arq = path.join(RAIZ, u === "/" ? "/index.html" : u);
      if (!path.resolve(arq).startsWith(RAIZ) || !fs.existsSync(arq) || fs.statSync(arq).isDirectory()) {
        r.writeHead(404); return r.end("404");
      }
      r.writeHead(200, { "Content-Type": tipos[path.extname(arq)] || "text/plain" });
      r.end(fs.readFileSync(arq));
    });
    await new Promise((r) => servidor.listen(PORTA, r));
    const nav = await pw.chromium.launch();
    let usuario = null;

    try {
      const email = `arvore-${Date.now()}@astral-teste.local`;
      const c = await req("/auth/v1/admin/users", {
        method: "POST", headers: admin,
        body: JSON.stringify({ email, password: "T!" + crypto.randomUUID(), email_confirm: true }),
      });
      usuario = { id: c.corpo.id, email };
      const link = await req("/auth/v1/admin/generate_link", {
        method: "POST", headers: admin, body: JSON.stringify({ type: "magiclink", email }),
      });
      const s = (await req("/auth/v1/verify", {
        method: "POST", headers: { apikey: PUB, "Content-Type": "application/json" },
        body: JSON.stringify({ type: "magiclink", token_hash: link.corpo?.hashed_token }),
      })).corpo;

      // Um histórico que acende parte do quadro.
      const linhas = [];
      for (let d = 0; d < 15; d++) {
        linhas.push({ usuario_id: usuario.id, materia: "Matemática", segundos: 3600,
                      xp: 30, modo: "livre", criado_em: new Date(Date.now() - d * 86400000).toISOString() });
      }
      await req("/rest/v1/sessoes_estudo", {
        method: "POST", headers: { ...admin, Prefer: "return=minimal" }, body: JSON.stringify(linhas),
      });
      await req("/rest/v1/rpc/salvar_progresso", {
        method: "POST",
        headers: { apikey: PUB, Authorization: `Bearer ${s.access_token}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          p_xp: 900, p_streak: 15, p_horas: 15, p_edital: { nome: "EEAR 2026" },
          p_materias: [{ nome: "Matemática", peso: 3, progresso: 75 }],
          p_cronograma_hoje: [], p_badges: [], p_tag_escolhida: null,
        }),
      });

      const ctx = await nav.newContext({ viewport: { width: 1440, height: 1000 } });
      await ctx.addInitScript(`(() => {
        localStorage.setItem("sb-${REF}-auth-token", JSON.stringify({
          access_token: ${JSON.stringify(s.access_token)},
          refresh_token: ${JSON.stringify(s.refresh_token)},
          token_type: "bearer",
          expires_at: Math.floor(Date.now()/1000) + 3600,
          user: ${JSON.stringify(s.user)},
        }));
      })()`);

      const pg = await ctx.newPage();
      const erros = [];
      pg.on("pageerror", (e) => erros.push(String(e.message)));
      await pg.goto(`http://localhost:${PORTA}/arvore.html`, { waitUntil: "load" });
      await pg.waitForSelector(".no", { timeout: 20000 }).catch(() => {});
      await pg.waitForTimeout(1500);

      const m = await pg.evaluate(() => ({
        nos: document.querySelectorAll(".no").length,
        feitos: document.querySelectorAll(".no.feito").length,
        frentes: document.querySelectorAll(".frente").length,
        elos: document.querySelectorAll(".elo").length,
        elosAcesos: document.querySelectorAll(".elo.aceso").length,
        atuais: document.querySelectorAll(".no.atual").length,
        ocultas: [...document.querySelectorAll(".no.oculta .no-grau")].length,
        resumo: (document.querySelector(".resumo-valor") || {}).textContent,
        html: document.documentElement.innerHTML,
        // rola para o lado em vez de estourar a tela?
        rolaPagina: document.documentElement.scrollWidth > document.documentElement.clientWidth + 2,
      }));
      await pg.close();
      await ctx.close();

      if (erros.length) falha("erro de JavaScript na tela", erros[0].slice(0, 60));
      else ok("nenhum erro de JavaScript na tela");

      if (m.nos === cat.CONDECORACOES.length) ok("os 74 nós aparecem na tela", `${m.nos} hexágonos`);
      else falha("nós na tela", `${m.nos} (esperado ${cat.CONDECORACOES.length})`);

      if (m.frentes === vazio.frentes.length) ok("as frentes aparecem", `${m.frentes} colunas`);
      else falha("frentes na tela", `${m.frentes}`);

      if (m.feitos > 0 && m.feitos < m.nos) ok("parte do quadro acesa", `${m.feitos} conquistadas`);
      else falha("estado do quadro", `${m.feitos} de ${m.nos}`);

      if (m.elosAcesos > 0) ok("🎯 o caminho percorrido aparece aceso", `${m.elosAcesos} elos`);
      else falha("nenhum elo aceso", `de ${m.elos}`);

      if (m.atuais > 0) ok("o próximo degrau está destacado", `${m.atuais} frente(s) com próximo passo`);
      else falha("nenhum degrau atual destacado");

      // Nome de secreta não pode estar no HTML, como na sala.
      const vazou = ["Marcha Forçada", "Ferro em Brasa", "Um Ano de Farda"].filter((n) => m.html.includes(n));
      if (!vazou.length) ok("🎯 nenhuma secreta vazou no quadro", "continuam para descobrir");
      else falha("🚨 secreta visível no quadro", vazou.join(", "));

      if (!m.rolaPagina) ok("o quadro rola por dentro, não estoura a página", "a rolagem é da caixa");
      else falha("a página rola para o lado", "o quadro estourou a largura");

    } finally {
      if (usuario) {
        await req(`/auth/v1/admin/users/${usuario.id}`, { method: "DELETE", headers: admin });
        console.log("\n  (usuário de teste apagado)");
      }
      await nav.close();
      servidor.close();
    }
  }

  console.log("\n" + "=".repeat(72));
  console.log(falhas === 0
    ? "O QUADRO DE OPERAÇÕES ESTÁ DE PÉ — e é nosso, não o do exemplo."
    : `🔴 ${falhas} FALHA(S).`);
  process.exit(falhas === 0 ? 0 : 1);
})();
