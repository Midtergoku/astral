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

const REF = "jjogmcacbdefwiwcyjxp";
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
const PUB = (fs.readFileSync(path.join(RAIZ, "assets/js/astral.js"), "utf8")
  .match(/sb_publishable_[A-Za-z0-9_-]+/) || [])[0];

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
  r.end(fs.readFileSync(arq));
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
    await req("/rest/v1/rpc/publicar_questoes",
      { method: "POST", headers: dono.cabecalho, body: JSON.stringify({ p_questoes: linhas }) });

    console.log("\n== 2. OS FILTROS ==");
    const { ctx: c2, pg, erros } = await abrir(ze);
    ctx = c2;
    if (erros.length) falha("erro de JavaScript na tela", erros[0].slice(0, 70));

    const temFiltros = await pg.$("#f-materia");
    temFiltros ? ok("a tela de filtros apareceu") : falha("filtros nao apareceram");

    // 🔴 O ASSUNTO SO ABRE DEPOIS DA MATERIA -- o pedido de 18/09.
    const antes = await pg.evaluate(() => ({
      desabilitado: document.getElementById('f-assunto')?.disabled,
      texto: document.getElementById('f-assunto')?.textContent || '',
    }));
    antes.desabilitado && /matéria primeiro/i.test(antes.texto)
      ? ok("🎯 o assunto começa fechado, e diz o porquê", "escolha a matéria primeiro")
      : falha("o assunto ja vem aberto", JSON.stringify(antes));

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

    // ── 4. NENHUMA COR FORA DO SISTEMA ───────────────────────────────────
    console.log("\n== 4. A CASA ==");
    const html = fs.readFileSync(path.join(RAIZ, "banco.html"), "utf8");
    const hexes = (html.match(/#[0-9a-fA-F]{3,8}\b/g) || []);
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
