// TESTA-BANCO-TELA -- a tela de questoes funciona para quem vai estudar nela?
//
// A regra de negocio ja foi provada sozinha (testa-acervo, 19 checagens contra
// o banco). Aqui se prova o que ela nao alcanca: que a tela desenha, que o
// filtro de ASSUNTO depende da MATERIA (o pedido dele de 18/09), que responder
// mostra a resposta certa, e que o acervo vazio DIZ que esta vazio em vez de
// mostrar uma tela de filtros que nao filtra nada.
const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");
const http = require("http");

const { REF, reescrever } = require("./testes/alvo");   // 09/10/2026 (COD-02): ASTRAL_DEV=1 -> astral-dev (tools/testes/alvo.js)
const BASE = `https://${REF}.supabase.co`;
const RAIZ = path.resolve(__dirname, "..");
const PORTA = 8887;

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
if (!pw) { console.log("TESTA-BANCO-TELA -- pulado: playwright nao encontrado."); process.exit(0); }

const chaves = JSON.parse(execSync(`supabase projects api-keys --project-ref ${REF} -o json`, {
  encoding: "utf8", stdio: ["ignore", "pipe", "ignore"],
}));
const SERVICE = chaves.find((k) => k.name === "service_role").api_key;
const PUB = require("./testes/alvo").PUB;

let falhas = 0;
const ok = (t, d = "") => console.log(`  OK     ${t.padEnd(54)} ${d}`);
const falha = (t, d = "") => { console.log(`  FALHA  ${t.padEnd(54)} ${d}`); falhas++; };

async function req(caminho, opts) {
  const r = await fetch(`${BASE}${caminho}`, opts);
  let corpo = null;
  try { corpo = await r.json(); } catch { /* sem corpo */ }
  return { status: r.status, corpo };
}
const admin = { apikey: SERVICE, Authorization: `Bearer ${SERVICE}`, "Content-Type": "application/json" };

const tipos = { ".html": "text/html", ".css": "text/css", ".js": "text/javascript",
                ".mjs": "text/javascript", ".woff2": "font/woff2" };
const servidor = http.createServer((q, r) => {
  const u = decodeURIComponent(q.url.split("?")[0]);
  const arq = path.join(RAIZ, u === "/" ? "/index.html" : u);
  if (!path.resolve(arq).startsWith(RAIZ) || !fs.existsSync(arq) || fs.statSync(arq).isDirectory()) {
    r.writeHead(404); return r.end("404");
  }
  r.writeHead(200, { "Content-Type": tipos[path.extname(arq)] || "text/plain" });
  r.end(reescrever(arq, fs.readFileSync(arq)));
});

const ANO = new Date().getFullYear();
const MARCA = `TELA-${Date.now()}`;

(async () => {
  const contas = [];
  let nav = null, ctx = null;
  await new Promise((r) => servidor.listen(PORTA, r));
  nav = await pw.chromium.launch();

  const criar = async (prefixo, plano) => {
    const email = `${prefixo}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}@astral-teste.local`;
    const c = await req("/auth/v1/admin/users", {
      method: "POST", headers: admin,
      body: JSON.stringify({ email, password: "T!" + crypto.randomUUID(), email_confirm: true }),
    });
    const id = c.corpo.id;
    if (plano !== "free") {
      await req(`/rest/v1/perfis?id=eq.${id}`, {
        method: "PATCH", headers: { ...admin, Prefer: "return=minimal" },
        body: JSON.stringify({ tipo_plano: plano }),
      });
    }
    const link = await req("/auth/v1/admin/generate_link", {
      method: "POST", headers: admin, body: JSON.stringify({ type: "magiclink", email }),
    });
    const s = (await req("/auth/v1/verify", {
      method: "POST", headers: { apikey: PUB, "Content-Type": "application/json" },
      body: JSON.stringify({ type: "magiclink", token_hash: link.corpo?.hashed_token }),
    })).corpo;
    const conta = { id, sessao: s,
      cabecalho: { apikey: PUB, Authorization: `Bearer ${s.access_token}`, "Content-Type": "application/json" } };
    contas.push(conta);
    return conta;
  };

  const abrir = async (conta) => {
    const c = await nav.newContext({ viewport: { width: 1280, height: 1000 } });
    await c.addInitScript(require("./testes/aceite-de-teste.js").SCRIPT);   // 02/10/2026: o aceite (LGL-01)
    await c.addInitScript(`(() => {
      localStorage.setItem("sb-${REF}-auth-token", JSON.stringify({
        access_token: ${JSON.stringify(conta.sessao.access_token)},
        refresh_token: ${JSON.stringify(conta.sessao.refresh_token)},
        token_type: "bearer",
        expires_at: Math.floor(Date.now()/1000) + 3600,
        user: ${JSON.stringify(conta.sessao.user)},
      }));
    })()`);
    const pg = await c.newPage();
    const erros = [];
    pg.on("pageerror", (e) => erros.push(String(e.message)));
    await pg.goto(`http://localhost:${PORTA}/banco.html`, { waitUntil: "load" });
    await pg.waitForSelector("#f-materia, .empty-title", { timeout: 25000 }).catch(() => {});
    await pg.waitForTimeout(700);
    return { ctx: c, pg, erros };
  };

  try {
    const ze = await criar("ze", "pro");
    console.log(`\nTESTA-BANCO-TELA  usuario ${ze.id.slice(0, 8)}\n`);

    // ── 1. ACERVO VAZIO ──────────────────────────────────────────────────
    // 🔴 Roda ANTES de publicar qualquer coisa. Se o acervo real ja tiver
    // questoes, este bloco nao se aplica e o teste DIZ isso em vez de mentir.
    console.log("== 1. QUANDO NAO HA NADA ==");
    {
      const f = await req("/rest/v1/rpc/filtros_de_questoes",
        { method: "POST", headers: ze.cabecalho, body: "{}" });
      if ((f.corpo?.total || 0) > 0) {
        console.log(`  (pulado: o acervo real ja tem ${f.corpo.total} questoes publicadas)`);
      } else {
        const { ctx: c, pg } = await abrir(ze);
        const texto = await pg.textContent("#conteudo");
        const temFiltro = await pg.$("#f-materia");
        !temFiltro && /sendo montado/i.test(texto || "")
          ? ok("🎯 acervo vazio DIZ que esta vazio", "em vez de filtro que nao filtra nada")
          : falha("tela vazia errada", (texto || "").slice(0, 70));
        await c.close();
      }
    }

    // ── 2. COM ACERVO ────────────────────────────────────────────────────
    const dono = await criar("dono", "free");
    await req("/rest/v1/administradores", {
      method: "POST", headers: { ...admin, Prefer: "return=minimal" },
      body: JSON.stringify({ usuario_id: dono.id }),
    });
    const linhas = [];
    for (let i = 1; i <= 12; i++) {
      linhas.push({
        banca: MARCA, prova: "TELA", ano: ANO - 6, numero: i,
        materia: i <= 8 ? "Matemática" : "Português",
        assunto: i <= 4 ? "Logaritmo" : (i <= 8 ? "Porcentagem" : "Crase"),
        enunciado: `Enunciado da questao ${i}, com tamanho suficiente para o check do banco.`,
        alternativas: { a: "alternativa a", b: "alternativa b", c: "alternativa c", d: "alternativa d" },
        gabarito: "c", publicada: true, revisao: "ok",
        // So as pares tem explicacao -- e assim se prova que a tela NAO
        // inventa bloco para quem nao tem.
        explicacao: i % 2 === 0 ? `Porque a alternativa c e a unica que fecha a conta da questao ${i}.` : null,
      });
    }
    // Dois itens do formato Cebraspe: afirmacao + texto de apoio, gabarito c/e.
    for (const [n, g] of [[50, "c"], [51, "e"]]) {
      linhas.push({
        banca: MARCA, prova: "TELA", ano: ANO - 6, numero: n,
        materia: "Direito penal", assunto: null, tipo: "certo_errado",
        texto_apoio: "Texto de apoio do cenario: em uma blitz, o policial constatou alteracao no chassi.",
        enunciado: `Afirmacao ${n} sobre o cenario, para julgar como certa ou errada.`,
        alternativas: { c: "Certo", e: "Errado" }, gabarito: g, publicada: true, revisao: "ok",
      });
    }
    await req("/rest/v1/rpc/publicar_questoes",
      { method: "POST", headers: dono.cabecalho, body: JSON.stringify({ p_questoes: linhas }) });

    console.log("\n== 2. OS FILTROS ==");
    const { ctx: c2, pg, erros } = await abrir(ze);
    ctx = c2;
    if (erros.length) falha("erro de JavaScript na tela", erros[0].slice(0, 70));

    const temFiltros = await pg.$("#f-materia");
    temFiltros ? ok("a tela de filtros apareceu") : falha("filtros nao apareceram");

    // 🔴 O ASSUNTO SO APARECE DEPOIS DA MATERIA -- o pedido de 18/09.
    // 29/09/2026: antes a caixa ficava fechada com um aviso; agora ela SOME ate
    // haver materia com assunto (pedido dele: nada de "ainda nao tem assunto").
    const antes = await pg.evaluate(() => ({
      escondido: !!document.getElementById('f-assunto')?.closest('.filtro')?.hidden,
      desabilitado: document.getElementById('f-assunto')?.disabled,
    }));
    antes.escondido && antes.desabilitado
      ? ok("🎯 sem matéria, a caixa de assunto nem aparece")
      : falha("o assunto ja vem aberto", JSON.stringify(antes));

    /* 🔴 FILTROS ENCADEADOS (29/09/2026). Pedido dele: "escolho biologia, que
       tem 18 questoes, quero que os filtros subsequentes se adequem". Escolher
       uma materia tem de estreitar banca, concurso e ano ao que EXISTE com ela,
       e a soma das contagens tem de bater com a da materia. */
    {
      const opcoes = (id) => [...document.getElementById(id).options].filter((o) => o.value).map((o) => o.value);
      const todasBancas = await pg.evaluate(() => [...document.getElementById('f-banca').options].filter((o) => o.value).length);
      const mats = await pg.evaluate(() => [...document.getElementById('f-materia').options]
        .filter((o) => o.value).map((o) => ({ v: o.value, n: +(o.textContent.match(/\((\d+)\)\s*$/) || [])[1] })));
      // A materia com MENOS questoes e a que mais estreita.
      const pequena = mats.sort((x, y) => x.n - y.n)[0];
      await pg.selectOption("#f-materia", pequena.v);
      await pg.waitForTimeout(300);
      const depois = await pg.evaluate(() => {
        const soma = (id) => [...document.getElementById(id).options].filter((o) => o.value)
          .reduce((t, o) => t + +((o.textContent.match(/\((\d+)\)\s*$/) || [])[1] || 0), 0);
        return { bancas: [...document.getElementById('f-banca').options].filter((o) => o.value).length,
                 somaBancas: soma('f-banca'), assuntoEscondido: !!document.getElementById('f-assunto').closest('.filtro').hidden,
                 temAssunto: document.getElementById('f-assunto').options.length > 1 };
      });
      depois.somaBancas === pequena.n
        ? ok("🎯 escolher a matéria estreita as bancas ao que existe", `${pequena.v}: ${depois.bancas} de ${todasBancas} bancas, somam ${depois.somaBancas}`)
        : falha("bancas não se adequaram à matéria", `${pequena.v} (${pequena.n}) -> soma ${depois.somaBancas}`);
      depois.assuntoEscondido !== depois.temAssunto
        ? ok("matéria sem assunto marcado: a caixa some, sem aviso", depois.temAssunto ? "(esta tem assunto)" : "")
        : falha("assunto mostrado sem ter o que mostrar", JSON.stringify(depois));
      // Volta para "Todas". (selectOption com "" nao acha a opcao vazia.)
      await pg.evaluate(() => {
        const el = document.getElementById('f-materia');
        el.value = '';
        el.dispatchEvent(new Event('change'));
      });
      await pg.waitForTimeout(300);
      void opcoes;
    }

    await pg.selectOption("#f-materia", "Matemática");
    await pg.waitForTimeout(400);
    const depois = await pg.evaluate(() => ({
      desabilitado: document.getElementById('f-assunto')?.disabled,
      opcoes: [...document.querySelectorAll('#f-assunto option')].map((o) => o.value).filter(Boolean),
    }));
    !depois.desabilitado && depois.opcoes.includes("Logaritmo") && depois.opcoes.includes("Porcentagem")
      ? ok("🎯 escolher a matéria abre os assuntos DELA", depois.opcoes.join(", "))
      : falha("assuntos da materia nao abriram", JSON.stringify(depois));

    // E trocar para Portugues troca a lista -- nao mistura.
    await pg.selectOption("#f-materia", "Português");
    await pg.waitForTimeout(400);
    const pt = await pg.evaluate(() =>
      [...document.querySelectorAll('#f-assunto option')].map((o) => o.value).filter(Boolean));
    pt.includes("Crase") && !pt.includes("Logaritmo")
      ? ok("trocar de matéria troca os assuntos, não mistura", pt.join(", "))
      : falha("os assuntos vazaram entre materias", pt.join(", "));

    // ── 3. RESPONDER ─────────────────────────────────────────────────────
    console.log("\n== 3. ESTUDAR DE VERDADE ==");
    await pg.selectOption("#f-materia", "Matemática");
    await pg.selectOption("#f-assunto", "Logaritmo");
    await pg.waitForTimeout(300);
    await pg.click("#btn-sortear");
    await pg.waitForSelector(".questao", { timeout: 20000 }).catch(() => {});
    await pg.waitForTimeout(900);

    const rodada = await pg.evaluate(() => ({
      questoes: document.querySelectorAll('.questao').length,
      selos: [...document.querySelectorAll('.selo.assunto')].map((s) => s.textContent.trim()),
    }));
    // ⚠️ Esta checagem exigia EXATAMENTE 4 ate 22/09/2026 -- as 4 que o proprio
    // teste publica. Funcionava so enquanto o acervo real estava vazio; no dia
    // em que entraram 1.100 questoes de verdade, vieram 10 e o teste acusou o
    // produto certo. O que se quer saber e que a rodada TEM questao e respeita
    // o filtro, nao que o mundo tenha exatamente o tamanho do teste.
    rodada.questoes >= 4 && rodada.questoes <= 10
      ? ok("🎉 as questões do assunto escolhido apareceram", `${rodada.questoes} de Logaritmo`)
      : falha("questoes na tela", String(rodada.questoes));

    rodada.selos.length && rodada.selos.every((s) => s === "Logaritmo")
      ? ok("🎯 o filtro valeu — só veio o assunto pedido", rodada.selos.join(", "))
      : falha("veio assunto de fora do filtro", rodada.selos.join(", "));

    // Responder errado de proposito: a tela tem de mostrar a certa.
    await pg.evaluate(() => {
      const b = document.querySelector('.questao .alt[data-letra="a"]');
      if (b) b.click();
    });
    await pg.waitForTimeout(500);
    const resposta = await pg.evaluate(() => {
      const q = document.querySelector('.questao');
      return {
        errada: !!q.querySelector('.alt.errada'),
        certa: !!q.querySelector('.alt.certa'),
        veredito: q.querySelector('.veredito')?.textContent || '',
        travadas: [...q.querySelectorAll('.alt')].every((b) => b.disabled),
      };
    });
    resposta.errada && resposta.certa
      ? ok("errou: mostra a sua e mostra a certa", "as duas, não só o vermelho")
      : falha("o retorno da resposta falhou", JSON.stringify(resposta));

    /a certa era c/i.test(resposta.veredito)
      ? ok("🎯 e diz por PALAVRA, não só por cor", `"${resposta.veredito}"`)
      : falha("veredito sem palavra", resposta.veredito);

    resposta.travadas
      ? ok("depois de responder não dá para trocar a resposta")
      : falha("dava para responder de novo");

    // ── 3b. O FILTRO POR CONCURSO ────────────────────────────────────────
    // Pedido dele em 23/09: "la no filtro ja e bom colocar de todas as provas
    // de todos os concursos que tem". Banca e a instituicao; concurso e o que
    // a pessoa tem na cabeca quando diz "a prova de bombeiro de 2022".
    console.log("\n== 3b. O FILTRO POR CONCURSO ==");
    {
      const temProva = await pg.evaluate(() => {
        const s = document.getElementById("f-prova");
        if (!s) return null;
        return [...s.options].map((o) => o.textContent.trim()).filter((t) => t && t !== "Todos");
      });
      temProva && temProva.length
        ? ok("🎯 da para escolher o CONCURSO pelo nome", `${temProva.length} provas, ex: ${temProva[0].slice(0, 40)}`)
        : falha("nao ha filtro por concurso", JSON.stringify(temProva));
    }

    // ── 3c. A EXPLICACAO DO GABARITO ─────────────────────────────────────
    console.log("\n== 3c. A EXPLICACAO ==");
    {
      /* 🔴 A CHECAGEM QUE MAIS IMPORTA DESTE BLOCO: antes de responder, a
         explicacao NAO pode estar no HTML. Desenha-la escondida poria a
         resposta na pagina, e quem abrisse o inspetor leria o gabarito sem
         responder -- o que acaba com a graca de estudar. */
      await pg.click("#btn-sortear");
      await pg.waitForSelector(".questao", { timeout: 20000 }).catch(() => {});
      await pg.waitForTimeout(800);

      const antes = await pg.evaluate(() =>
        document.getElementById("rodada").innerHTML.includes("fecha a conta da questao"));
      !antes
        ? ok("🎯 antes de responder, a explicacao NAO esta no HTML", "nem escondida")
        : falha("🔴 a explicacao vaza no HTML antes de responder");

      // Responde TODAS, para pegar pelo menos uma com explicacao.
      await pg.evaluate(() => {
        document.querySelectorAll(".questao").forEach((q) => q.querySelector('.alt[data-letra="a"]')?.click());
      });
      await pg.waitForTimeout(900);

      const depois = await pg.evaluate(() => ({
        blocos: document.querySelectorAll(".explicacao").length,
        questoes: document.querySelectorAll(".questao").length,
        texto: document.querySelector(".explicacao-texto")?.textContent || "",
      }));
      depois.blocos > 0
        ? ok("🎉 depois de responder, a explicacao aparece", `${depois.blocos} de ${depois.questoes} questoes`)
        : falha("a explicacao nao apareceu", JSON.stringify(depois));

      /fecha a conta/.test(depois.texto)
        ? ok("e e o texto da banca, nao um palpite", depois.texto.slice(0, 44))
        : falha("texto da explicacao errado", depois.texto.slice(0, 50));

      depois.blocos < depois.questoes
        ? ok("🎯 quem nao tem explicacao nao ganha bloco vazio", "nada e inventado")
        : falha("apareceu explicacao onde nao havia", `${depois.blocos} blocos para ${depois.questoes} questoes`);
    }

    // ── 3d. CERTO OU ERRADO ──────────────────────────────────────────────
    // Pedido dele em 27/09. O item do Cebraspe e uma AFIRMACAO: dois botoes,
    // e o texto de apoio -- sem ele o item nao se responde.
    console.log("\n== 3d. CERTO OU ERRADO ==");
    {
      // Os filtros sao encadeados (29/09): o concurso escolhido em 3b esconderia
      // Direito penal. "Limpar" volta tudo para Todos -- e prova o botao.
      await pg.click("#btn-limpar");
      await pg.waitForTimeout(200);
      await pg.selectOption("#f-materia", "Direito penal");
      await pg.waitForTimeout(300);
      await pg.click("#btn-sortear");
      await pg.waitForSelector(".alts.ce", { timeout: 15000 }).catch(() => {});
      await pg.waitForTimeout(600);
      const ce = await pg.evaluate(() => {
        const q = document.querySelector(".questao");
        return q ? {
          botoes: [...q.querySelectorAll(".alts.ce .alt")].map((b) => b.textContent.trim()),
          apoio: q.querySelector(".apoio-texto")?.textContent || "",
          letraSolta: !!q.querySelector(".alt-letra"),
        } : null;
      });
      ce && ce.botoes.join("|") === "Certo|Errado"
        ? ok("🎯 item Certo/Errado vira DOIS botoes", "Certo · Errado")
        : falha("certo/errado desenhado errado", JSON.stringify(ce));
      ce && !ce.letraSolta
        ? ok("e sem letra 'c)' / 'e)' parecendo alternativa") : falha("apareceu letra de alternativa");
      // Nao se procura o texto semeado: desde 27/09 o acervo real tem os itens
      // da PRF 2021, e o primeiro cartao pode ser um deles. Vale o apoio existir.
      ce && ce.apoio.trim().length > 30
        ? ok("🎯 o texto de apoio aparece junto", "sem ele o item nao se responde")
        : falha("texto de apoio ausente", ce ? ce.apoio.slice(0, 40) : "");

      // Responde errado de proposito e le o veredito.
      await pg.evaluate(() => {
        document.querySelectorAll(".questao").forEach((q) => {
          const gabC = !!q.querySelector('.alts.ce');
          if (gabC) q.querySelector('.alt[data-letra="c"]').click();
        });
      });
      await pg.waitForTimeout(500);
      const vs = await pg.evaluate(() => [...document.querySelectorAll(".veredito")].map((v) => v.textContent.trim()));
      vs.some((v) => /o gabarito é Errado/.test(v))
        ? ok("🎯 o veredito diz a PALAVRA", "\"o gabarito é Errado\"")
        : falha("veredito do certo/errado", vs.join(" | "));
    }

    // ── 3e. CADERNO DE ERROS ─────────────────────────────────────────────
    // Pedido dele em 27/09. Os blocos acima ERRARAM questoes de proposito
    // (marcaram "a" onde o gabarito e "c"). Elas tem de estar no caderno -- e
    // tem de SAIR dele quando a pessoa acerta na revisao.
    console.log("\n== 3e. CADERNO DE ERROS ==");
    {
      await pg.waitForTimeout(1500);   // a gravacao da resposta acontece por tras
      await pg.reload({ waitUntil: "load" });
      await pg.waitForSelector('[data-aba="caderno"]', { timeout: 20000 });
      await pg.waitForTimeout(700);
      const naAba = await pg.evaluate(() =>
        parseInt(document.querySelector('[data-aba="caderno"] .aba-conta')?.textContent || "0", 10));
      naAba > 0
        ? ok("🎯 o que ele errou entrou no caderno sozinho", `${naAba} na aba`)
        : falha("o caderno nao recebeu os erros", String(naAba));

      await pg.click('[data-aba="caderno"]');
      await pg.waitForSelector("#btn-revisar", { timeout: 15000 }).catch(() => {});
      await pg.click("#btn-revisar");
      await pg.waitForSelector("#rodada-caderno .questao", { timeout: 15000 }).catch(() => {});
      await pg.waitForTimeout(600);
      const rev = await pg.evaluate(() => ({
        n: document.querySelectorAll("#rodada-caderno .questao").length,
        selo: document.querySelector("#rodada-caderno .questao")?.textContent || "",
      }));
      rev.n > 0 && /errou \d+×/.test(rev.selo)
        ? ok("a revisão mostra as questões e quantas vezes errou", `${rev.n} questoes`)
        : falha("revisao do caderno", JSON.stringify(rev).slice(0, 90));

      // Acerta TODAS na revisao (o gabarito das semeadas e "c"; certo/errado "c" ou "e").
      await pg.evaluate(() => {
        document.querySelectorAll("#rodada-caderno .questao").forEach((q) => {
          const certa = q.querySelector('.alt[data-letra="c"]');
          if (certa) certa.click();
        });
      });
      await pg.waitForTimeout(2000);
      await pg.reload({ waitUntil: "load" });
      await pg.waitForSelector('[data-aba="caderno"]', { timeout: 20000 });
      await pg.waitForTimeout(700);
      const depois = await pg.evaluate(() =>
        parseInt(document.querySelector('[data-aba="caderno"] .aba-conta')?.textContent || "0", 10));
      depois < naAba
        ? ok("🎯 acertou na revisão -> SAIU do caderno", `${naAba} -> ${depois}`)
        : falha("acertar nao tirou do caderno", `${naAba} -> ${depois}`);
    }

    // ── 3f. REPORTAR ERRO (03/10/2026, auditoria BAN-02) ─────────────────
    // Antes nao havia NENHUM jeito de avisar que a questao estava errada.
    console.log("\n== 3f. REPORTAR ERRO NA QUESTÃO ==");
    {
      await pg.click('[data-aba="acervo"]').catch(() => {});
      await pg.waitForSelector("#btn-sortear", { timeout: 15000 }).catch(() => {});
      await pg.click("#btn-limpar").catch(() => {});
      await pg.click("#btn-sortear");
      await pg.waitForSelector("[data-reportar] .reportar-abrir", { timeout: 15000 }).catch(() => {});
      const alvo = await pg.evaluate(() => document.querySelector("[data-reportar]")?.dataset.reportar);
      alvo ? ok("toda questão do acervo tem 'Achou um erro? Avise'") : falha("o botão de reportar não apareceu");
      await pg.click("[data-reportar] .reportar-abrir").catch(() => {});
      await pg.click('[data-reportar] [data-motivo="gabarito"]').catch(() => {});
      await pg.waitForTimeout(2000);
      const msg = await pg.evaluate(() => document.querySelector("[data-reportar]")?.textContent.trim());
      const linhas = (await req(`/rest/v1/questoes_reportadas?usuario_id=eq.${ze.id}&select=questao_id,motivo`, { headers: admin })).corpo || [];
      linhas.length === 1 && String(linhas[0].questao_id) === String(alvo) && linhas[0].motivo === "gabarito" && /Obrigado/.test(msg || "")
        ? ok("🎯 o relato chega ao banco: questão, motivo e quem", `#${alvo} · gabarito`)
        : falha("o relato não foi gravado", `${JSON.stringify(linhas)} · ${msg}`);
      // Ninguem reporta em nome de outro, nem le o relato alheio
      const outro = await criar("outro", "free");
      const forjado = await req("/rest/v1/questoes_reportadas", { method: "POST", headers: { ...outro.cabecalho, Prefer: "return=minimal" },
        body: JSON.stringify({ usuario_id: ze.id, questao_id: Number(alvo), motivo: "outro" }) });
      const leu = (await req(`/rest/v1/questoes_reportadas?select=questao_id`, { headers: outro.cabecalho })).corpo || [];
      forjado.status >= 400 && Array.isArray(leu) && leu.length === 0
        ? ok("ninguém reporta em nome de outro, nem lê o relato alheio", `insert forjado ${forjado.status}, leu ${leu.length}`)
        : falha("dá para forjar ou ler relato de outro", `${forjado.status} · ${JSON.stringify(leu).slice(0, 60)}`);
    }

    // ── 4. NENHUMA COR FORA DO SISTEMA ───────────────────────────────────
    console.log("\n== 4. A CASA ==");
    const html = fs.readFileSync(path.join(RAIZ, "banco.html"), "utf8");
    const hexes = (html.replace(/<meta name="theme-color"[^>]*>/, "").match(/#[0-9a-fA-F]{3,8}\b/g) || []);   // a cor da barra do celular so aceita valor escrito (04/10, 3.11)
    !hexes.length ? ok("nenhuma cor fora do design system", "só tokens")
                  : falha("cor solta na pagina", hexes.slice(0, 4).join(", "));

  } finally {
    if (ctx) await ctx.close();
    await req(`/rest/v1/questoes?banca=eq.${MARCA}`, { method: "DELETE", headers: admin });
    for (const c of contas) await req(`/auth/v1/admin/users/${c.id}`, { method: "DELETE", headers: admin });
    console.log(`\n  (${contas.length} contas e o acervo de teste apagados)`);
    if (nav) await nav.close();
    servidor.close();
  }

  console.log("\n" + "=".repeat(72));
  console.log(falhas === 0
    ? "DA PARA ESTUDAR — e o filtro por assunto dentro da materia funciona."
    : `🔴 ${falhas} FALHA(S).`);
  process.exit(falhas === 0 ? 0 : 1);
})();
