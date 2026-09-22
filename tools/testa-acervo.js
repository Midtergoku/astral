// TESTA-ACERVO -- o portao free/pro do banco de questoes faz o que foi
// prometido, e nada alem disso?
//
// 🔴 ESTE E O TESTE DA REGRA DE NEGOCIO, e por isso e o que menos pode falhar
// calado. Ordem dele em 18/09/2026: "so sera liberado totalmente as questoes
// para os pros", com "alguma maneira da pessoa ter uma amostra gratis".
//
// Errar para o lado frouxo entrega de graca o que sustenta o plano pago.
// Errar para o lado apertado faz o produto parecer quebrado para quem ainda
// nao paga. As duas pontas sao medidas aqui.
//
// E a trava que vale mais que as outras: NINGUEM LE A TABELA DIRETO. Se o
// PostgREST servisse `questoes`, o acervo inteiro sairia numa requisicao e
// todo o resto deste arquivo seria teatro.
const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const REF = "jjogmcacbdefwiwcyjxp";
const BASE = `https://${REF}.supabase.co`;
const RAIZ = path.resolve(__dirname, "..");

const chaves = JSON.parse(execSync(`supabase projects api-keys --project-ref ${REF} -o json`, {
  encoding: "utf8", stdio: ["ignore", "pipe", "ignore"],
}));
const SERVICE = chaves.find((k) => k.name === "service_role").api_key;
const PUB = (fs.readFileSync(path.join(RAIZ, "assets/js/astral.js"), "utf8")
  .match(/sb_publishable_[A-Za-z0-9_-]+/) || [])[0];

let falhas = 0;
const ok = (t, d = "") => console.log(`  OK     ${t.padEnd(56)} ${d}`);
const falha = (t, d = "") => { console.log(`  FALHA  ${t.padEnd(56)} ${d}`); falhas++; };

async function req(caminho, opts) {
  const r = await fetch(`${BASE}${caminho}`, opts);
  let corpo = null;
  try { corpo = await r.json(); } catch { /* sem corpo */ }
  return { status: r.status, corpo };
}
const admin = { apikey: SERVICE, Authorization: `Bearer ${SERVICE}`, "Content-Type": "application/json" };

const ANO = new Date().getFullYear();
const MARCA = `ACERVO-${Date.now()}`;

// 30 questoes antigas (dentro da amostra) e 8 recentes (so no Pro).
function fabricar() {
  const linhas = [];
  for (let i = 1; i <= 30; i++) {
    linhas.push({
      banca: MARCA, prova: "ANTIGA", ano: ANO - 6, numero: i,
      materia: i <= 20 ? "Matemática" : "Português",
      assunto: i <= 10 ? "Logaritmo" : (i <= 20 ? "Porcentagem" : "Crase"),
      enunciado: `Questao antiga numero ${i}, com texto suficiente para passar no check.`,
      alternativas: { a: "um", b: "dois", c: "tres", d: "quatro" },
      gabarito: "a", publicada: true, revisao: "ok",
    });
  }
  for (let i = 1; i <= 8; i++) {
    linhas.push({
      banca: MARCA, prova: "RECENTE", ano: ANO, numero: 100 + i,
      materia: "Matemática", assunto: "Logaritmo",
      enunciado: `Questao recente numero ${i}, que so o Pro pode ver.`,
      alternativas: { a: "um", b: "dois", c: "tres", d: "quatro" },
      gabarito: "b", publicada: true, revisao: "ok",
    });
  }
  return linhas;
}

(async () => {
  const contas = [];
  try {
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
      const conta = { id, plano, cabecalho: { apikey: PUB, Authorization: `Bearer ${s.access_token}`,
                                              "Content-Type": "application/json" } };
      contas.push(conta);
      return conta;
    };

    // O dono publica o acervo de teste.
    const dono = await criar("dono", "free");
    await req("/rest/v1/administradores", {
      method: "POST", headers: { ...admin, Prefer: "return=minimal" },
      body: JSON.stringify({ usuario_id: dono.id }),
    });
    const pub = await req("/rest/v1/rpc/publicar_questoes", {
      method: "POST", headers: dono.cabecalho, body: JSON.stringify({ p_questoes: fabricar() }),
    });

    console.log(`\nTESTA-ACERVO  ${MARCA}\n`);
    pub.corpo?.gravadas === 38
      ? ok("acervo de teste publicado", "30 antigas + 8 recentes")
      : falha("nao publicou o acervo de teste", JSON.stringify(pub.corpo).slice(0, 90));

    const zeFree = await criar("free", "free");
    const zePro  = await criar("pro", "pro");
    const zeBeta = await criar("beta", "beta");

    const sortear = (conta, corpo) => req("/rest/v1/rpc/sortear_questoes",
      { method: "POST", headers: conta.cabecalho, body: JSON.stringify(corpo) });

    // ── 1. A AMOSTRA GRATIS ────────────────────────────────────────────────
    console.log("== 1. A AMOSTRA GRATIS ==");
    {
      const r = await sortear(zeFree, { p_banca: MARCA, p_limite: 50 });
      const q = r.corpo?.questoes || [];
      q.length === 10
        ? ok("🎯 o free recebe 10, mesmo pedindo 50", `pediu 50, veio ${q.length}`)
        : falha("a amostra nao e de 10", `veio ${q.length}`);

      q.every((x) => x.ano <= ANO - 4)
        ? ok("🎯 e nenhuma e de prova recente", `todas de ${ANO - 6}, o teto e ${ANO - 4}`)
        : falha("prova recente vazou para o free", q.map((x) => x.ano).join(","));

      r.corpo?.fora_da_amostra === 8
        ? ok("a tela sabe quantas ficaram de fora", "8 — e pode dizer isso sem mentir")
        : falha("o numero de fora veio errado", String(r.corpo?.fora_da_amostra));
    }

    // ── 2. A COTA DO DIA ───────────────────────────────────────────────────
    console.log("\n== 2. A COTA DO DIA ==");
    {
      const r = await sortear(zeFree, { p_banca: MARCA, p_limite: 10 });
      (r.corpo?.questoes || []).length === 0 && r.corpo?.acabou === true
        ? ok("🎯 gastou os 10, o dia acabou", "e a resposta diz por que")
        : falha("a cota do dia nao segurou", `${(r.corpo?.questoes || []).length} questoes a mais`);

      /Pro/i.test(r.corpo?.motivo || "")
        ? ok("e o aviso aponta o caminho, sem empurrar", r.corpo.motivo.slice(0, 52))
        : falha("aviso sem explicacao", String(r.corpo?.motivo));
    }

    // ── 3. O PRO, E O BETA JUNTO ───────────────────────────────────────────
    console.log("\n== 3. O PRO ==");
    {
      const r = await sortear(zePro, { p_banca: MARCA, p_limite: 50 });
      const q = r.corpo?.questoes || [];
      q.length === 38
        ? ok("🎯 o pro recebe o acervo inteiro", `${q.length} de 38`)
        : falha("o pro nao recebeu tudo", `${q.length} de 38`);

      q.some((x) => x.ano === ANO)
        ? ok("inclusive as provas recentes", "que sao as que mais importam")
        : falha("o pro nao viu prova recente");

      // Pedir de novo nao esbarra em cota nenhuma.
      const r2 = await sortear(zePro, { p_banca: MARCA, p_limite: 50 });
      (r2.corpo?.questoes || []).length === 38 && r2.corpo?.acabou === false
        ? ok("e pedir de novo nao esbarra em cota", "ilimitado e ilimitado")
        : falha("o pro esbarrou em cota", JSON.stringify(r2.corpo).slice(0, 80));

      const rb = await sortear(zeBeta, { p_banca: MARCA, p_limite: 50 });
      (rb.corpo?.questoes || []).length === 38
        ? ok("🎯 beta tem o mesmo que o pro", "promessa vitalicia, como esta escrito no comum.ts")
        : falha("beta foi tratado como free", `${(rb.corpo?.questoes || []).length} de 38`);
    }

    // ── 4. REVER NAO GASTA ─────────────────────────────────────────────────
    console.log("\n== 4. REVER QUESTAO ANTIGA NAO GASTA A COTA ==");
    {
      const outro = await criar("rever", "free");
      const r1 = await sortear(outro, { p_banca: MARCA, p_materia: "Matemática", p_limite: 3 });
      const ids1 = (r1.corpo?.questoes || []).map((q) => q.id);

      // Forca o mesmo sorteio: filtra por assunto com poucas questoes e pede de novo.
      const r2 = await sortear(outro, { p_banca: MARCA, p_materia: "Matemática", p_limite: 3 });
      const ids2 = (r2.corpo?.questoes || []).map((q) => q.id);
      const repetidas = ids2.filter((i) => ids1.includes(i)).length;

      const servidas = await req(
        `/rest/v1/questoes_servidas?usuario_id=eq.${outro.id}&select=questao_id`, { headers: admin });
      const distintas = new Set((servidas.corpo || []).map((x) => x.questao_id)).size;
      distintas === (servidas.corpo || []).length
        ? ok("a cota conta questao DISTINTA, nao requisicao", `${distintas} linhas, ${repetidas} repetidas no sorteio`)
        : falha("a mesma questao contou duas vezes");

      r2.corpo?.vistas_hoje <= 6
        ? ok("🎯 rever nao consome a amostra de amanha", `${r2.corpo.vistas_hoje} vistas hoje`)
        : falha("a contagem inflou", String(r2.corpo?.vistas_hoje));
    }

    // ── 5. OS FILTROS ──────────────────────────────────────────────────────
    console.log("\n== 5. OS FILTROS QUE ELE PEDIU ==");
    {
      const p = await sortear(zePro, { p_banca: MARCA, p_materia: "Matemática", p_assunto: "Logaritmo", p_limite: 50 });
      const q = p.corpo?.questoes || [];
      q.length > 0 && q.every((x) => x.materia === "Matemática" && x.assunto === "Logaritmo")
        ? ok("🎯 assunto DENTRO da materia — o pedido de 18/09", `${q.length} questoes, so de Logaritmo`)
        : falha("o filtro por assunto vazou", q.map((x) => x.assunto).join(","));

      const porAno = await sortear(zePro, { p_banca: MARCA, p_ano: ANO, p_limite: 50 });
      (porAno.corpo?.questoes || []).every((x) => x.ano === ANO)
        ? ok("filtro por ano", `${(porAno.corpo.questoes || []).length} de ${ANO}`)
        : falha("filtro por ano vazou");

      const f = await req("/rest/v1/rpc/filtros_de_questoes",
        { method: "POST", headers: zePro.cabecalho, body: "{}" });
      const mat = (f.corpo?.materias || []).find((m) => m.nome === "Matemática");
      const assuntos = (mat?.assuntos || []).map((a) => a.nome);
      assuntos.includes("Logaritmo") && assuntos.includes("Porcentagem")
        ? ok("a lista de filtros traz os assuntos que EXISTEM", assuntos.join(", "))
        : falha("lista de assuntos incompleta", assuntos.join(", "));
    }

    // ── 6. NADA VAZA ENTRE CONTAS ──────────────────────────────────────────
    console.log("\n== 6. UMA CONTA NAO ALCANCA A OUTRA ==");
    {
      const bisbilhoteiro = await criar("bisbilhota", "free");
      const r = await req(`/rest/v1/questoes_servidas?select=usuario_id&limit=5`,
        { headers: bisbilhoteiro.cabecalho });
      r.status >= 400
        ? ok("🎯 ninguem le o historico de ninguem", `status ${r.status}`)
        : falha("🔴 o historico de outra conta e legivel", JSON.stringify(r.corpo).slice(0, 80));

      const adm = await req("/rest/v1/rpc/acervo_do_administrador",
        { method: "POST", headers: bisbilhoteiro.cabecalho, body: "{}" });
      adm.status >= 400
        ? ok("e o painel do administrador recusa quem nao e", `status ${adm.status}`)
        : falha("🔴 usuario comum viu o painel do dono");

      const tenta = await req(`/rest/v1/administradores`, {
        method: "POST", headers: bisbilhoteiro.cabecalho,
        body: JSON.stringify({ usuario_id: bisbilhoteiro.id }),
      });
      tenta.status >= 400
        ? ok("🎯 e ninguem se promove a administrador", `status ${tenta.status}`)
        : falha("🔴 usuario se promoveu sozinho");
    }

    // ── 7. QUESTAO DESPUBLICADA NAO APARECE ────────────────────────────────
    console.log("\n== 7. O QUE AINDA NAO FOI CONFERIDO NAO APARECE ==");
    {
      await req("/rest/v1/rpc/publicar_questoes", {
        method: "POST", headers: dono.cabecalho,
        body: JSON.stringify({ p_questoes: [{
          banca: MARCA, prova: "RASCUNHO", ano: ANO - 8, numero: 200,
          materia: "Física", assunto: "Cinemática",
          enunciado: "Questao que entrou como rascunho, ainda nao conferida.",
          alternativas: { a: "um", b: "dois", c: "tres", d: "quatro" },
          gabarito: "c", publicada: false, revisao: "truncada" }] }),
      });
      const r = await sortear(zePro, { p_banca: MARCA, p_materia: "Física", p_limite: 50 });
      (r.corpo?.questoes || []).length === 0
        ? ok("🎯 questao despublicada nao chega a ninguem", "nem ao pro")
        : falha("🔴 rascunho vazou para o acervo", `${r.corpo.questoes.length} questoes`);

      // ⚠️ ESTA CHECAGEM JA FOI ESCRITA ERRADA. Ate 22/09/2026 ela dizia "o
      // filtro nao pode oferecer Fisica" -- o que so valia enquanto o acervo
      // REAL estava vazio. No dia em que entraram 1.100 questoes de verdade,
      // com Fisica entre elas, o teste falhou acusando o produto certo.
      //
      // Teste que so passa em banco vazio nao e teste, e sorte. A pergunta
      // certa e sobre O RASCUNHO DESTE TESTE, nao sobre o acervo do mundo:
      // ele nao pode aparecer em contagem nenhuma.
      const f = await req("/rest/v1/rpc/filtros_de_questoes",
        { method: "POST", headers: zePro.cabecalho, body: "{}" });
      const fisica = (f.corpo?.materias || []).find((m) => m.nome === "Física");
      const cinematica = (fisica?.assuntos || []).find((a) => a.nome === "Cinemática");
      const doAcervoReal = await req(
        "/rest/v1/questoes?select=id&publicada=is.true&materia=eq.F%C3%ADsica&assunto=eq.Cinem%C3%A1tica",
        { headers: admin });
      const reais = (doAcervoReal.corpo || []).length;
      const contado = cinematica?.quantas ?? 0;
      contado === reais
        ? ok("o filtro conta so o que esta no ar", `Cinematica: ${contado} publicadas, e o rascunho fora`)
        : falha("o rascunho entrou na contagem do filtro", `filtro diz ${contado}, publicadas sao ${reais}`);
    }

  } finally {
    await req(`/rest/v1/questoes?banca=eq.${MARCA}`, { method: "DELETE", headers: admin });
    for (const c of contas) {
      await req(`/auth/v1/admin/users/${c.id}`, { method: "DELETE", headers: admin });
    }
    console.log(`\n  (acervo de teste e ${contas.length} contas apagados)`);
  }

  console.log("\n" + "=".repeat(74));
  console.log(falhas === 0
    ? "O PORTAO FAZ O PROMETIDO — amostra de graca, acervo inteiro no Pro."
    : `🔴 ${falhas} FALHA(S).`);
  process.exit(falhas === 0 ? 0 : 1);
})();
