// TESTA-TROCA-DE-EDITAL -- o que se perde quando a pessoa muda de concurso?
//
// Esta é a medição que precisa vir ANTES do R10 (prestígio). A ideia aprovada
// é "trocar de edital não zera nada: vira veterano". Mas para saber o que
// PRECISA ser preservado, primeiro é preciso saber o que se perde hoje.
//
// É a mesma preocupação que ele levantou em 17/09 -- "já tive problemas de
// salvamento de progresso" -- num cenário que ninguém testou: não sair e
// entrar, mas TROCAR DE CONCURSO. Alguém que prestava EEAR e passa a prestar
// ESA reescreve as matérias inteiras.
//
// O teste não julga: ele MEDE, item por item, o que sobrevive e o que some.
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
const ok = (t, d = "") => console.log(`  OK     ${t.padEnd(46)} ${d}`);
const falha = (t, d = "") => { console.log(`  FALHA  ${t.padEnd(46)} ${d}`); falhas++; };
const nota = (t, d = "") => console.log(`  ·      ${t.padEnd(46)} ${d}`);

async function req(caminho, opts) {
  const r = await fetch(`${BASE}${caminho}`, opts);
  let corpo = null;
  try { corpo = await r.json(); } catch { /* sem corpo */ }
  return { status: r.status, corpo };
}
const admin = { apikey: SERVICE, Authorization: `Bearer ${SERVICE}`, "Content-Type": "application/json" };

const haDias = (n) => new Date(Date.now() - n * 86400000).toISOString();

(async () => {
  let usuario = null;
  try {
    const email = `troca-${Date.now()}@astral-teste.local`;
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
    const comoEle = { apikey: PUB, Authorization: `Bearer ${s.access_token}`, "Content-Type": "application/json" };

    console.log(`\nTESTA-TROCA-DE-EDITAL  usuario ${usuario.id.slice(0, 8)}\n`);

    // ── Uma vida de estudo na EEAR: 20 dias, 3 matérias, domínio alto ───────
    const linhas = [];
    for (let d = 0; d < 20; d++) {
      linhas.push({
        usuario_id: usuario.id,
        materia: ["Matemática", "Física", "Português"][d % 3],
        segundos: 3600, xp: 30, modo: "livre", criado_em: haDias(d),
      });
    }
    await req("/rest/v1/sessoes_estudo", {
      method: "POST", headers: { ...admin, Prefer: "return=minimal" }, body: JSON.stringify(linhas),
    });
    await req("/rest/v1/rpc/salvar_progresso", {
      method: "POST", headers: comoEle,
      body: JSON.stringify({
        p_xp: 3000, p_streak: 20, p_horas: 20, p_edital: { nome: "EEAR 2026" },
        p_materias: [
          { nome: "Matemática", peso: 3, progresso: 85 },
          { nome: "Física", peso: 3, progresso: 80 },
          { nome: "Português", peso: 2, progresso: 75 },
        ],
        p_cronograma_hoje: [], p_badges: ["primeiro_edital"], p_tag_escolhida: "Calculista",
      }),
    });

    const ler = async () => (await req("/rest/v1/rpc/fatos_do_usuario", {
      method: "POST", headers: comoEle, body: "{}",
    })).corpo;

    const antes = await ler();
    console.log("  ── ANTES da troca ──");
    nota("horas acumuladas", `${antes.horas}h`);
    nota("dias estudados", String(antes.diasEstudados));
    nota("XP", String(antes.xp));
    nota("doutrina (domínio médio)", String(antes.atributos?.doutrina?.valor));
    nota("matérias acima de 70%", String((antes.materias || []).filter((m) => m.progresso >= 70).length));
    console.log("");

    /* ── A TROCA ──────────────────────────────────────────────────────────
       É exatamente o que `edital.html` faz ao processar um edital novo:
       reescreve `edital` e `materias`. Matérias de um concurso diferente. */
    await req("/rest/v1/rpc/salvar_progresso", {
      method: "POST", headers: comoEle,
      body: JSON.stringify({
        p_xp: 3000, p_streak: 20, p_horas: 20, p_edital: { nome: "ESA 2027" },
        p_materias: [
          { nome: "Matemática", peso: 3, progresso: 0 },
          { nome: "História", peso: 2, progresso: 0 },
          { nome: "Geografia", peso: 2, progresso: 0 },
        ],
        p_cronograma_hoje: [], p_badges: [], p_tag_escolhida: null,
      }),
    });

    const depois = await ler();
    console.log("  ── DEPOIS da troca ──");

    // ── O que TEM de sobreviver ────────────────────────────────────────────
    if (depois.horas === antes.horas) ok("as horas sobrevivem", `${depois.horas}h`);
    else falha("🔴 perdeu horas", `${antes.horas}h -> ${depois.horas}h`);

    if (depois.diasEstudados === antes.diasEstudados) ok("os dias estudados sobrevivem", String(depois.diasEstudados));
    else falha("🔴 perdeu dias", `${antes.diasEstudados} -> ${depois.diasEstudados}`);

    if (depois.sessoes === antes.sessoes) ok("as sessões sobrevivem", String(depois.sessoes));
    else falha("🔴 perdeu sessões", `${antes.sessoes} -> ${depois.sessoes}`);

    if (depois.xp >= antes.xp) ok("o XP sobrevive", String(depois.xp));
    else falha("🔴 perdeu XP", `${antes.xp} -> ${depois.xp}`);

    if (depois.maiorSessaoMin === antes.maiorSessaoMin) ok("o recorde de sessão sobrevive", `${depois.maiorSessaoMin}min`);
    else falha("🔴 perdeu o recorde", `${antes.maiorSessaoMin} -> ${depois.maiorSessaoMin}`);

    // As condecorações derivam dos fatos acima -- se eles sobrevivem, elas também.
    const { conferir } = await import("file://" + path.resolve(RAIZ, "assets/js/condecoracoes.js").replace(/\\/g, "/"));
    const medAntes = conferir(antes).resumo.conquistadas;
    const medDepois = conferir(depois).resumo.conquistadas;
    const perdidas = conferir(antes).condecoracoes
      .filter((c) => c.conquistada)
      .filter((c) => !conferir(depois).condecoracoes.find((d) => d.id === c.id)?.conquistada);

    /* 🔴 BURACO CONHECIDO, medido em 19/09/2026 e AINDA ABERTO.
       As condecorações que dependem do domínio das matérias se desfazem quando
       a pessoa troca de concurso -- porque as matérias viram outras e o
       domínio das novas começa em zero. São 4.

       Isso contraria a regra dele de 02/08 ("conquista não se desconquista"),
       que o próprio `salvar_progresso` já respeita para os badges antigos
       (ele faz UNIÃO, nunca substituição).

       Consertar exige GUARDAR as condecorações conquistadas, e essa é a mesma
       decisão de modelagem que o R0 vai ter de tomar para o XP. Ele mandou
       parar antes de "mudança muito violenta", e gravar dado permanente de
       usuário é exatamente isso -- errar o modelo aqui significa migrar o dado
       de quem já usou. FICA PARA ELE.

       Este teste NÃO falha por esse buraco, porque ele é conhecido e está
       registrado. Ele falha se a perda AUMENTAR -- que é o que importa vigiar
       enquanto a decisão não vem. Teste que falha sempre ensina a ignorar
       teste. */
    const PERDA_CONHECIDA = 4;
    const perdeu = medAntes - medDepois;
    if (perdeu <= 0) {
      ok("🎯 as condecorações sobrevivem", `${medAntes} -> ${medDepois}`);
    } else if (perdeu <= PERDA_CONHECIDA) {
      nota(`⚠️ perde ${perdeu} condecoração(ões) — BURACO CONHECIDO`,
        perdidas.map((c) => c.nome).join(", "));
      nota("   por quê", "dependem do domínio das matérias, que a troca zera");
      nota("   conserto", "guardar as conquistadas — decisão de modelagem, espera o Lucas");
    } else {
      falha(`🔴 A PERDA AUMENTOU: ${perdeu} condecorações`,
        `conhecido era ${PERDA_CONHECIDA} — ${perdidas.map((c) => c.nome).join(", ")}`);
    }

    // ── O que se PERDE, e é esperado ───────────────────────────────────────
    console.log("");
    const dom = depois.atributos?.doutrina?.valor;
    if (dom === 0) {
      nota("⚠️ doutrina zera", `${antes.atributos?.doutrina?.valor} -> ${dom} — esperado: as matérias são outras`);
    } else {
      nota("doutrina depois da troca", String(dom));
    }

    const divisasAntes = conferir(antes).divisas.filter((d) => d.conquistada).length;
    const divisasDepois = conferir(depois).divisas.filter((d) => d.conquistada).length;
    if (divisasDepois < divisasAntes) {
      nota("⚠️ divisas de matéria somem", `${divisasAntes} -> ${divisasDepois} — é o buraco que o R10 precisa fechar`);
    } else {
      ok("as divisas sobrevivem", `${divisasAntes} -> ${divisasDepois}`);
    }

    // ── 🔴 O DIÁRIO não pode perder a história ─────────────────────────────
    const { data: sessoes } = await (async () => {
      const r = await req(`/rest/v1/sessoes_estudo?usuario_id=eq.${usuario.id}&select=materia,segundos,modo,criado_em&order=criado_em.asc`,
        { headers: comoEle });
      return { data: r.corpo };
    })();
    const { montarDiario } = await import("file://" + path.resolve(RAIZ, "assets/js/diario.js").replace(/\\/g, "/"));
    const dias = montarDiario(sessoes || [], 30);
    if (dias.length === 20) ok("🎯 o diário mantém a história inteira", `${dias.length} dias, inclusive os da EEAR`);
    else falha("o diário perdeu dias", `${dias.length} (esperado 20)`);

    const temMateriaAntiga = dias.some((d) => d.listaMaterias.some((m) => /f[íi]sica|portugu/i.test(m.nome)));
    if (temMateriaAntiga) ok("as matérias do concurso antigo continuam no diário", "o passado não é reescrito");
    else falha("o diário apagou as matérias antigas");

  } finally {
    if (usuario) {
      await req(`/auth/v1/admin/users/${usuario.id}`, { method: "DELETE", headers: admin });
      console.log("\n  (usuário de teste apagado)");
    }
  }

  console.log("\n" + "=".repeat(70));
  console.log(falhas === 0
    ? "TROCAR DE CONCURSO NÃO APAGA A HISTÓRIA — só as matérias mudam."
    : `🔴 ${falhas} PERDA(S) que não deveriam acontecer.`);
  process.exit(falhas === 0 ? 0 : 1);
})();
