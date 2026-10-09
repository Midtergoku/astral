// TESTA-FICHA -- os atributos batem com o que a pessoa realmente estudou?
//
// A ficha (R1) e o primeiro numero do Astral calculado pelo SERVIDOR a partir
// de registros, em vez de informado pelo navegador. Isso so vale alguma coisa
// se duas perguntas tiverem resposta sim:
//
//   1. O numero corresponde ao esforco de verdade?
//      Um atributo que nao reage ao estudo e enfeite. Aqui o teste PLANTA
//      sessoes conhecidas e confere se o atributo sobe do jeito esperado.
//
//   2. A ficha e SO minha?
//      A funcao e `security invoker`, entao a RLS vale. Mas isso precisa ser
//      PROVADO com credencial valida -- o CLAUDE.md registra o dia em que um
//      teste de invasao deu "tudo bloqueado" sem nem estar autenticando.
const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");
const http = require("http");

const { REF, reescrever } = require("./testes/alvo");   // 09/10/2026 (COD-02): ASTRAL_DEV=1 -> astral-dev (tools/testes/alvo.js)
const BASE = `https://${REF}.supabase.co`;
const RAIZ = path.resolve(__dirname, "..");
const PORTA = 8893;

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

const tipos = { ".html": "text/html", ".css": "text/css", ".js": "text/javascript", ".woff2": "font/woff2" };
const servidor = http.createServer((q, r) => {
  const u = decodeURIComponent(q.url.split("?")[0]);
  const arq = path.join(RAIZ, u === "/" ? "/index.html" : u);
  if (!path.resolve(arq).startsWith(RAIZ) || !fs.existsSync(arq) || fs.statSync(arq).isDirectory()) {
    r.writeHead(404); return r.end("404");
  }
  r.writeHead(200, { "Content-Type": tipos[path.extname(arq)] || "text/plain" });
  r.end(reescrever(arq, fs.readFileSync(arq)));
});

function scriptSessao(s) {
  return `(() => {
    localStorage.setItem("sb-${REF}-auth-token", JSON.stringify({
      access_token: ${JSON.stringify(s.access_token)},
      refresh_token: ${JSON.stringify(s.refresh_token)},
      token_type: "bearer",
      expires_at: Math.floor(Date.now()/1000) + 3600,
      user: ${JSON.stringify(s.user)},
    }));
  })()`;
}

const chaves = JSON.parse(execSync(`supabase projects api-keys --project-ref ${REF} -o json`, {
  encoding: "utf8", stdio: ["ignore", "pipe", "ignore"],
}));
const SERVICE = chaves.find((k) => k.name === "service_role").api_key;
const PUB = require("./testes/alvo").PUB;

let falhas = 0;
const ok = (t, d = "") => console.log(`  OK     ${t.padEnd(46)} ${d}`);
const falha = (t, d = "") => { console.log(`  FALHA  ${t.padEnd(46)} ${d}`); falhas++; };

async function req(caminho, opts) {
  const r = await fetch(`${BASE}${caminho}`, opts);
  let corpo = null;
  try { corpo = await r.json(); } catch { /* sem corpo */ }
  return { status: r.status, corpo };
}
const admin = { apikey: SERVICE, Authorization: `Bearer ${SERVICE}`, "Content-Type": "application/json" };

async function criarUsuario(prefixo) {
  const email = `${prefixo}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}@astral-teste.local`;
  const c = await req("/auth/v1/admin/users", {
    method: "POST", headers: admin,
    body: JSON.stringify({ email, password: "T!" + crypto.randomUUID(), email_confirm: true }),
  });
  if (!c.corpo?.id) throw new Error("nao criou usuario: " + JSON.stringify(c.corpo));
  return { id: c.corpo.id, email };
}

// Devolve a SESSAO inteira, nao so o token: a parte de navegador precisa do
// refresh_token e do objeto user para montar o localStorage do supabase-js.
async function sessaoDe(email) {
  const link = await req("/auth/v1/admin/generate_link", {
    method: "POST", headers: admin, body: JSON.stringify({ type: "magiclink", email }),
  });
  const s = await req("/auth/v1/verify", {
    method: "POST", headers: { apikey: PUB, "Content-Type": "application/json" },
    body: JSON.stringify({ type: "magiclink", token_hash: link.corpo?.hashed_token }),
  });
  if (!s.corpo?.access_token) throw new Error("nao obteve sessao");
  return s.corpo;
}
const token = async (email) => (await sessaoDe(email)).access_token;

const comoUsuario = (t) => ({ apikey: PUB, Authorization: `Bearer ${t}`, "Content-Type": "application/json" });

async function ficha(t) {
  const r = await req("/rest/v1/rpc/ficha_do_usuario", { method: "POST", headers: comoUsuario(t), body: "{}" });
  return r.corpo;
}

// Planta sessoes direto na tabela, como admin, para poder escolher a DATA --
// o teste precisa de dias distintos e o cliente so consegue gravar "agora".
async function plantarSessoes(uid, linhas) {
  const r = await req("/rest/v1/sessoes_estudo", {
    method: "POST", headers: { ...admin, Prefer: "return=minimal" },
    body: JSON.stringify(linhas.map((l) => ({ usuario_id: uid, ...l }))),
  });
  if (r.status >= 300) throw new Error("nao plantou sessoes: " + JSON.stringify(r.corpo));
}

const diasAtras = (n) => new Date(Date.now() - n * 24 * 3600 * 1000).toISOString();

(async () => {
  let a = null, b = null, nav = null;
  await new Promise((r) => servidor.listen(PORTA, r));
  if (pw) nav = await pw.chromium.launch();
  else console.log("\n  (playwright nao encontrado -- a checagem de TELA sera pulada)");

  try {
    a = await criarUsuario("ficha");
    const sessaoA = await sessaoDe(a.email);
    const tA = sessaoA.access_token;
    console.log(`\nTESTA-FICHA  usuario ${a.id.slice(0, 8)}\n`);

    // ── 1. Conta nova: a ficha responde, e responde ZERO ─────────────────────
    const vazia = await ficha(tA);
    if (vazia?.atributos) ok("conta nova: a ficha responde", "nao quebra sem dados");
    else { falha("conta nova: a ficha nao respondeu", JSON.stringify(vazia).slice(0, 80)); }

    const zeros = ["disciplina", "resistencia", "amplitude", "doutrina"]
      .map((k) => vazia?.atributos?.[k]?.valor);
    if (zeros.every((v) => v === 0)) ok("conta nova: todos os atributos em 0", zeros.join(", "));
    else falha("conta nova deveria ser tudo zero", zeros.join(", "));

    if (vazia?.atributos?.precisao?.valor === null) {
      ok("PRECISAO vem null numa conta sem respostas", "nao inventa numero");
    } else {
      falha("🔴 PRECISAO inventou um numero", String(vazia?.atributos?.precisao?.valor));
    }

    // ── 2. Plantar estudo de verdade e ver os atributos reagirem ─────────────
    // 12 dias distintos, 3 materias, maior sessao de 60 min.
    const linhas = [];
    for (let d = 0; d < 12; d++) {
      linhas.push({
        materia: ["Matematica", "Portugues", "Fisica"][d % 3],
        segundos: d === 5 ? 3600 : 1800,          // um dia de 60 min, o resto 30
        xp: 40, modo: d % 4 === 0 ? "cronograma" : "livre",
        criado_em: diasAtras(d),
      });
    }
    await plantarSessoes(a.id, linhas);
    await req("/rest/v1/rpc/salvar_progresso", {
      method: "POST", headers: comoUsuario(tA),
      body: JSON.stringify({
        p_xp: 480, p_streak: 5, p_horas: 6.5, p_edital: null,
        p_materias: [
          { nome: "Matematica", peso: 3, progresso: 60 },
          { nome: "Portugues", peso: 3, progresso: 40 },
          { nome: "Fisica", peso: 2, progresso: 20 },
          { nome: "Ingles", peso: 1, progresso: 0 },
        ],
        p_cronograma_hoje: [], p_badges: [], p_tag_escolhida: null,
      }),
    });
    // 30/09/2026: o dominio e do servidor; o teste o fixa pela chave de servico.
    await require("./testes/dominio-plantado.js").fixarDominio(BASE, SERVICE, a.id, [
      { nome: "Matematica", peso: 3, progresso: 60 },
      { nome: "Portugues", peso: 3, progresso: 40 },
      { nome: "Fisica", peso: 2, progresso: 20 },
      { nome: "Ingles", peso: 1, progresso: 0 },
    ]);

    const f = await ficha(tA);
    const at = f?.atributos || {};
    console.log("");
    for (const k of ["disciplina", "resistencia", "amplitude", "doutrina"]) {
      console.log(`  ${k.toUpperCase().padEnd(13)} ${String(at[k]?.valor).padStart(3)}   ${at[k]?.porque || ""}`);
    }
    console.log("");

    // As contas, conferidas uma a uma contra o que foi plantado:
    //   DISCIPLINA  12 dias de 20 = 0,6 -> 39,6  +  sequencia 12 de 7 = 1 -> 34     = 74
    //     (28/09/2026: a sequencia passou a vir das SESSOES -- os 12 dias plantados
    //      sao seguidos e terminam hoje. Antes vinha o "5" que o navegador mandava
    //      em p_streak, e o esperado era 64. Ver a migration 20260928100000.)
    //   RESISTENCIA 60 min de 90 = 0,667 -> 67
    //   AMPLITUDE   3 materias de 4 do edital = 75
    //   DOUTRINA    media(60,40,20,0) = 30
    const esperado = { disciplina: 74, resistencia: 67, amplitude: 75, doutrina: 30 };
    for (const [k, v] of Object.entries(esperado)) {
      const got = Number(at[k]?.valor);
      if (Math.abs(got - v) <= 1) ok(`${k} bate com o esforco plantado`, `${got} (esperado ~${v})`);
      else falha(`${k} nao bate`, `${got}, esperado ~${v}`);
    }

    // Cada atributo explica de onde veio -- numero sem explicacao nao ajuda
    // ninguem a saber o que fazer amanha.
    const semPorque = ["disciplina", "resistencia", "amplitude", "doutrina"]
      .filter((k) => !at[k]?.porque || at[k].porque.length < 8);
    if (!semPorque.length) ok("todo atributo diz de onde veio");
    else falha("atributo sem explicacao", semPorque.join(", "));

    // ── 3. XP medido x declarado, separados ──────────────────────────────────
    // 12 sessoes de 40 xp; as de indice 0,4,8 sao 'cronograma' = 3 x 40 = 120
    if (f?.xp?.declarado === 120 && f?.xp?.medido === 360) {
      ok("XP medido e declarado vem SEPARADOS", `medido ${f.xp.medido}, declarado ${f.xp.declarado}`);
    } else {
      falha("XP medido/declarado errado", JSON.stringify(f?.xp));
    }

    // ── 3a. AMPLITUDE so com materia do edital (03/10/2026, auditoria NUM-01) ─
    // Antes: estudo de materia fora do edital (de um edital antigo, "Geral",
    // ou inventada) contava -- "9 de 4 do edital" = 100. Planto 2 sessoes de
    // materias que NAO estao no edital e uma de "Geral": tem de continuar 75.
    // O codigo antigo daria 100 aqui (5 distintas de 4, teto 100).
    await plantarSessoes(a.id, [
      { materia: "Quimica", segundos: 1200, xp: 0, modo: "livre", criado_em: diasAtras(2) },
      { materia: "Biologia", segundos: 1200, xp: 0, modo: "livre", criado_em: diasAtras(3) },
      { materia: "Geral", segundos: 1200, xp: 0, modo: "livre", criado_em: diasAtras(4) },
    ]);
    const fFora = await ficha(tA);
    if (fFora?.atributos?.amplitude?.valor === 75)
      ok("🎯 AMPLITUDE ignora materia fora do edital e 'Geral'", `75 — ${fFora.atributos.amplitude.porque}`);
    else falha("AMPLITUDE contou materia fora do edital", JSON.stringify(fFora?.atributos?.amplitude));
    // E o servidor nao aceita mais a materia inventada: ela vira "Geral" (o
    // tempo fica -- recusar faria perder estudo de verdade).
    const inventada = await req("/rest/v1/sessoes_estudo", {
      method: "POST", headers: { ...comoUsuario(tA), Prefer: "return=representation" },
      body: JSON.stringify({ usuario_id: a.id, materia: "Materia Inventada", segundos: 600, xp: 0, modo: "cronograma" }),
    });
    const gravada = Array.isArray(inventada.corpo) ? inventada.corpo[0] : null;
    if (inventada.status === 201 && gravada?.materia === "Geral" && gravada?.segundos === 600)
      ok("🎯 sessao de materia fora do edital vira 'Geral'", "o tempo fica, a materia inventada nao");
    else falha("o servidor aceitou a materia inventada", `HTTP ${inventada.status} ${JSON.stringify(inventada.corpo).slice(0, 90)}`);
    const doEdital = await req("/rest/v1/sessoes_estudo", {
      method: "POST", headers: { ...comoUsuario(tA), Prefer: "return=representation" },
      body: JSON.stringify({ usuario_id: a.id, materia: "fisica", segundos: 600, xp: 0, modo: "cronograma" }),
    });
    const gd = Array.isArray(doEdital.corpo) ? doEdital.corpo[0] : null;
    if (doEdital.status === 201 && gd?.materia === "fisica")
      ok("materia do edital passa (sem diferenciar maiuscula)", "fisica = Fisica");
    else falha("materia do edital foi trocada", `HTTP ${doEdital.status} ${JSON.stringify(doEdital.corpo).slice(0, 90)}`);
    // ── 3b. A SEQUENCIA E A DE HOJE (03/10/2026, auditoria NUM-14) ─────────
    // progresso.streak so muda quando a pagina salva. Estraga o guardado e a
    // ficha tem de continuar dizendo a sequencia REAL (12 dias plantados).
    await req(`/rest/v1/progresso?usuario_id=eq.${a.id}`, { method: "PATCH",
      headers: { ...admin, Prefer: "return=minimal" }, body: JSON.stringify({ streak: 99 }) });
    const fSeq = await ficha(tA);
    const seqHoje = (await req("/rest/v1/rpc/minha_sequencia", { method: "POST", headers: comoUsuario(tA), body: "{}" })).corpo;
    /sequência de 12\b/.test(fSeq?.atributos?.disciplina?.porque || "") && seqHoje === 12
      ? ok("🎯 a sequência é a de HOJE, não a guardada", `guardado 99 · mostrado 12`)
      : falha("a ficha mostrou a sequência guardada", `${fSeq?.atributos?.disciplina?.porque} · minha_sequencia ${seqHoje}`);

    // Sessao nova dispara o recalculo do dominio (gatilho dominio_apos_sessao,
    // 30/09) e apaga o dominio fixado acima -- a comparacao com a TELA, mais
    // abaixo, espera DOUTRINA 30. Fixa de novo. (03/10: sem isto a tela deu 7.)
    await require("./testes/dominio-plantado.js").fixarDominio(BASE, SERVICE, a.id, [
      { nome: "Matematica", peso: 3, progresso: 60 },
      { nome: "Portugues", peso: 3, progresso: 40 },
      { nome: "Fisica", peso: 2, progresso: 20 },
      { nome: "Ingles", peso: 1, progresso: 0 },
    ]);

    // ── 3b. A ficha APARECE NA TELA? ────────────────────────────────────────
    // A funcao responder nao basta: em 04/08 o dashboard inteiro deixou de
    // desenhar por um erro que nenhum teste de API teria visto.
    if (pw) {
      const ctx = await nav.newContext({ viewport: { width: 1280, height: 950 } });
      const pg = await ctx.newPage();
      const errosDeTela = [];
      pg.on("pageerror", (e) => errosDeTela.push(String(e.message)));
      await pg.addInitScript(require("./testes/aceite-de-teste.js").SCRIPT);   // 02/10/2026: o aceite (LGL-01)
      await pg.addInitScript(scriptSessao(sessaoA));
      await pg.goto(`http://localhost:${PORTA}/dashboard.html`, { waitUntil: "load" });
      await pg.waitForTimeout(3500);

      const naTela = await pg.evaluate(() => {
        const cartoes = [...document.querySelectorAll(".atributo")];
        return {
          quantos: cartoes.length,
          nomes: cartoes.map((c) => (c.querySelector(".atributo-nome") || {}).textContent),
          valores: cartoes.map((c) => (c.querySelector(".atributo-valor") || {}).textContent),
          // a regua cresceu de verdade? (scaleX diferente de 0)
          reguas: cartoes.map((c) => {
            const f = c.querySelector(".atributo-preenche");
            return f ? getComputedStyle(f).transform : "sem regua";
          }),
          trancados: cartoes.filter((c) => c.classList.contains("trancado")).length,
        };
      });
      await ctx.close();

      if (errosDeTela.length) falha("a tela deu erro de JavaScript", errosDeTela[0].slice(0, 70));
      else ok("nenhum erro de JavaScript na tela");

      if (naTela.quantos === 5) ok("os 5 atributos apareceram na tela", naTela.nomes.join(", "));
      else falha("atributos na tela", `${naTela.quantos} (esperado 5)`);

      /* Comparacao por LISTA, nao por expressao regular.
         A versao anterior testava /\b64\b/ e falhava com a tela CERTA: o
         \b nao sobreviveu a ferramenta que gravou o arquivo -- virou o
         caractere de controle BACKSPACE (0x08), que nunca casa com nada.
         E a terceira vez que uma barra invertida se perde no caminho ate o
         disco (ver historico/erros.md). Comparar valor a valor nao tem
         barra invertida nenhuma, entao nao tem como se perder. */
      const valoresNaTela = naTela.valores.map((v) => String(v).trim());
      const esperadoNaTela = ["74", "67", "75", "30", "—"];
      const iguais = esperadoNaTela.every((v, i) => valoresNaTela[i] === v);
      if (iguais) ok("os numeros da tela batem com o banco", valoresNaTela.join(" "));
      else falha("numeros da tela nao batem",
        `${valoresNaTela.join(" ")} (esperado ${esperadoNaTela.join(" ")})`);

      if (naTela.trancados === 1) ok("PRECISAO aparece trancada, nao escondida", "o 5o atributo continua visivel");
      else falha("estado de PRECISAO na tela", `${naTela.trancados} trancado(s)`);

      const cresceu = naTela.reguas.filter((t) => t && t !== "none" && !/matrix\(0,/.test(t)).length;
      if (cresceu >= 4) ok("as reguas cresceram", `${cresceu} de 5 com transform aplicado`);
      else falha("reguas nao animaram", naTela.reguas.join(" | ").slice(0, 80));
    }

    // ── 3c. PRECISAO: acertou de primeira ───────────────────────────────────
    // 28/09/2026. 20 questoes do acervo respondidas: 15 de primeira (nunca
    // errou), 5 com erro. Tem de dar 75 -- e com 19 tem de continuar null.
    {
      const qs = (await req("/rest/v1/questoes?publicada=is.true&select=id&limit=20", { headers: admin })).corpo || [];
      const linhasR = qs.map((q, i) => ({
        usuario_id: a.id, questao_id: q.id, letra: "a", acertou: i < 15,
        vezes_errou: i < 15 ? 0 : 1, vezes_acertou: i < 15 ? 1 : 0,
      }));
      await req("/rest/v1/respostas", { method: "POST", headers: { ...admin, Prefer: "return=minimal" },
        body: JSON.stringify(linhasR.slice(0, 19)) });
      const f19 = await ficha(tA);
      if (f19?.atributos?.precisao?.valor === null) ok("com 19 respostas, PRECISAO ainda null", f19.atributos.precisao.porque);
      else falha("PRECISAO com amostra pequena demais", String(f19?.atributos?.precisao?.valor));
      await req("/rest/v1/respostas", { method: "POST", headers: { ...admin, Prefer: "return=minimal" },
        body: JSON.stringify(linhasR.slice(19)) });
      const f20 = await ficha(tA);
      if (qs.length === 20 && f20?.atributos?.precisao?.valor === 75) ok("🎯 PRECISAO = acertou de primeira", `75 — ${f20.atributos.precisao.porque}`);
      else falha("PRECISAO errada", JSON.stringify(f20?.atributos?.precisao));
    }

    // ── 4. 🔴 A ficha e SO minha? ────────────────────────────────────────────
    b = await criarUsuario("bisbilhoteiro");
    const tB = await token(b.email);
    const fB = await ficha(tB);          // B chama a MESMA funcao, autenticado
    const somaB = ["disciplina", "resistencia", "amplitude", "doutrina"]
      .reduce((s, k) => s + Number(fB?.atributos?.[k]?.valor || 0), 0);
    if (somaB === 0 && Number(fB?.xp?.medido || 0) === 0) {
      ok("🎯 outro usuario NAO ve a ficha alheia", "com credencial valida, ficha zerada");
    } else {
      falha("🚨 VAZAMENTO: a ficha de B veio com dados de A", JSON.stringify(fB?.xp));
    }

    // ── 5. Deslogado nao le nada ─────────────────────────────────────────────
    const anon = await req("/rest/v1/rpc/ficha_do_usuario", {
      method: "POST", headers: { apikey: PUB, "Content-Type": "application/json" }, body: "{}",
    });
    if (anon.status >= 400) ok("sem login a funcao recusa", `status ${anon.status}`);
    else falha("🚨 funcao respondeu sem login", `status ${anon.status}`);

  } finally {
    for (const u of [a, b]) {
      if (u) await req(`/auth/v1/admin/users/${u.id}`, { method: "DELETE", headers: admin });
    }
    if (nav) await nav.close();
    servidor.close();
    console.log("\n  (usuarios de teste apagados)");
  }

  console.log("\n" + "=".repeat(70));
  console.log(falhas === 0
    ? "A FICHA E CALCULADA PELO SERVIDOR, bate com o esforco, e nao vaza."
    : `🔴 ${falhas} FALHA(S).`);
  process.exit(falhas === 0 ? 0 : 1);
})();
