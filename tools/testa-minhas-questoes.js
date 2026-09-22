// TESTA-MINHAS-QUESTOES -- o material que o aluno sobe fica SO DELE?
//
// Pedido dele em 22/09/2026: "ele mesmo consegue adicionar, mas isso SO PARA
// ELE. Eu quero que seja uma mecanica INDIVIDUAL."
//
// 🔴 E AQUI O ERRO TEM DONO. No acervo publico, uma falha mostra a questao
// errada. Aqui, uma falha mostra o material de UMA PESSOA para OUTRA -- e o
// que ela sobe pode ser apostila comprada, PDF de cursinho, material com dono.
// Vazar isso nao e defeito de produto, e quebra de confianca.
//
// Por isso metade deste arquivo sao tentativas de invasao com credencial
// VALIDA: nao adianta testar que o site "nao mostra", tem de testar que o
// BANCO recusa.
const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const REF = "jjogmcacbdefwiwcyjxp";
const BASE = `https://${REF}.supabase.co`;
const RAIZ = path.resolve(__dirname, "..");

const chaves = JSON.parse(execSync(`supabase projects api-keys --project-ref ${REF} -o json`,
  { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }));
const SERVICE = chaves.find((k) => k.name === "service_role").api_key;
const PUB = (fs.readFileSync(path.join(RAIZ, "assets/js/astral.js"), "utf8")
  .match(/sb_publishable_[A-Za-z0-9_-]+/) || [])[0];
const admin = { apikey: SERVICE, Authorization: `Bearer ${SERVICE}`, "Content-Type": "application/json" };

let falhas = 0;
const ok = (t, d = "") => console.log(`  OK     ${t.padEnd(54)} ${d}`);
const falha = (t, d = "") => { console.log(`  FALHA  ${t.padEnd(54)} ${d}`); falhas++; };

async function req(c, o) {
  const r = await fetch(`${BASE}${c}`, o);
  let corpo = null; try { corpo = await r.json(); } catch { /* sem corpo */ }
  return { status: r.status, corpo };
}

const questao = (origem, texto) => ({
  origem, materia: "Direito penal", assunto: null,
  enunciado: texto, alternativas: { a: "um", b: "dois", c: "tres", d: "quatro" },
  gabarito: "b",
});

(async () => {
  const contas = [];
  try {
    const criar = async (p) => {
      const email = `${p}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}@astral-teste.local`;
      const c = await req("/auth/v1/admin/users", { method: "POST", headers: admin,
        body: JSON.stringify({ email, password: "T!" + crypto.randomUUID(), email_confirm: true }) });
      const link = await req("/auth/v1/admin/generate_link", { method: "POST", headers: admin,
        body: JSON.stringify({ type: "magiclink", email }) });
      const s = (await req("/auth/v1/verify", { method: "POST",
        headers: { apikey: PUB, "Content-Type": "application/json" },
        body: JSON.stringify({ type: "magiclink", token_hash: link.corpo?.hashed_token }) })).corpo;
      const conta = { id: c.corpo.id,
        cab: { apikey: PUB, Authorization: `Bearer ${s.access_token}`, "Content-Type": "application/json" } };
      contas.push(conta);
      return conta;
    };

    const ana = await criar("ana");
    const bia = await criar("bia");
    console.log(`\nTESTA-MINHAS-QUESTOES  ana ${ana.id.slice(0, 8)} · bia ${bia.id.slice(0, 8)}\n`);

    // ── 1. Cada uma sobe as suas ──────────────────────────────────────────
    console.log("== 1. SUBIR O PROPRIO MATERIAL ==");
    const subir = (conta, corpo) => req("/rest/v1/questoes_minhas", {
      method: "POST", headers: { ...conta.cab, Prefer: "return=representation" },
      body: JSON.stringify({ ...corpo, usuario_id: conta.id }),
    });

    const daAna = await subir(ana, questao("Apostila da Ana", "Questao que a Ana subiu para estudar sozinha."));
    daAna.status < 300
      ? ok("a pessoa sobe a propria questao", `status ${daAna.status}`)
      : falha("nao conseguiu subir", `${daAna.status} ${JSON.stringify(daAna.corpo).slice(0, 80)}`);

    await subir(bia, questao("PDF da Bia", "Questao que a Bia subiu para estudar sozinha."));

    // ── 2. 🔴 UMA NAO VE A DA OUTRA ───────────────────────────────────────
    console.log("\n== 2. O QUE E DE UMA NAO CHEGA NA OUTRA ==");
    {
      const veAna = await req("/rest/v1/questoes_minhas?select=origem,enunciado", { headers: ana.cab });
      const lista = veAna.corpo || [];
      lista.length === 1 && lista[0].origem === "Apostila da Ana"
        ? ok("🎯 a Ana ve SO a dela", `${lista.length} questao`)
        : falha("a Ana viu material alheio", JSON.stringify(lista).slice(0, 110));

      const veBia = await req("/rest/v1/questoes_minhas?select=origem", { headers: bia.cab });
      (veBia.corpo || []).every((q) => q.origem === "PDF da Bia")
        ? ok("🎯 a Bia ve SO a dela", `${(veBia.corpo || []).length} questao`)
        : falha("a Bia viu material alheio", JSON.stringify(veBia.corpo).slice(0, 110));

      // Pedindo o id exato da outra, com credencial valida.
      const id = daAna.corpo?.[0]?.id;
      const espiar = await req(`/rest/v1/questoes_minhas?id=eq.${id}&select=enunciado`, { headers: bia.cab });
      (espiar.corpo || []).length === 0
        ? ok("🎯 nem pedindo o id exato da outra", "a linha simplesmente nao existe para ela")
        : falha("🔴 leu a questao da outra pelo id", JSON.stringify(espiar.corpo).slice(0, 90));
    }

    // ── 3. Nao da para escrever no nome da outra ──────────────────────────
    console.log("\n== 3. NINGUEM ESCREVE NO NOME DE OUTRO ==");
    {
      const forjar = await req("/rest/v1/questoes_minhas", {
        method: "POST", headers: bia.cab,
        body: JSON.stringify({ ...questao("forjada", "Questao enfiada na conta da Ana pela Bia."), usuario_id: ana.id }),
      });
      forjar.status >= 400
        ? ok("🎯 nao da para criar questao na conta alheia", `status ${forjar.status}`)
        : falha("🔴 a Bia criou questao na conta da Ana", `status ${forjar.status}`);

      const id = daAna.corpo?.[0]?.id;
      const editar = await req(`/rest/v1/questoes_minhas?id=eq.${id}`, {
        method: "PATCH", headers: { ...bia.cab, Prefer: "return=representation" },
        body: JSON.stringify({ enunciado: "TEXTO TROCADO PELA BIA" }),
      });
      (editar.corpo || []).length === 0
        ? ok("🎯 nem editar a da outra", "o PATCH nao alcanca linha nenhuma")
        : falha("🔴 editou a questao alheia", JSON.stringify(editar.corpo).slice(0, 80));

      const apagar = await req(`/rest/v1/questoes_minhas?id=eq.${id}`,
        { method: "DELETE", headers: { ...bia.cab, Prefer: "return=representation" } });
      (apagar.corpo || []).length === 0
        ? ok("🎯 nem apagar a da outra")
        : falha("🔴 apagou a questao alheia");

      // E a questao da Ana continua la, intacta.
      const conferir = await req(`/rest/v1/questoes_minhas?id=eq.${id}&select=enunciado`, { headers: ana.cab });
      /Ana subiu/.test(conferir.corpo?.[0]?.enunciado || "")
        ? ok("e a da Ana continua inteira depois de tudo isso")
        : falha("a questao da Ana foi mexida", JSON.stringify(conferir.corpo).slice(0, 80));

      // Transferir a propria questao para outra conta tambem nao.
      const transferir = await req(`/rest/v1/questoes_minhas?id=eq.${id}`, {
        method: "PATCH", headers: ana.cab, body: JSON.stringify({ usuario_id: bia.id }),
      });
      transferir.status >= 400
        ? ok("🎯 nem a dona transfere a questao para outra conta", `status ${transferir.status}`)
        : falha("deu para mudar o dono da questao", `status ${transferir.status}`);
    }

    // ── 4. Os dois mundos nao se tocam ────────────────────────────────────
    console.log("\n== 4. O QUE E DELA NAO ENTRA NO ACERVO PUBLICO ==");
    {
      const sorteio = await req("/rest/v1/rpc/sortear_questoes", {
        method: "POST", headers: ana.cab, body: JSON.stringify({ p_materia: "Direito penal", p_limite: 50 }),
      });
      const q = sorteio.corpo?.questoes || [];
      q.every((x) => !/Ana subiu/.test(x.enunciado))
        ? ok("🎯 a questao dela NAO aparece no acervo publico", "os dois mundos nao se tocam")
        : falha("🔴 material particular vazou para o acervo publico");

      const filtros = await req("/rest/v1/rpc/filtros_de_questoes",
        { method: "POST", headers: ana.cab, body: "{}" });
      const temPenal = (filtros.corpo?.materias || []).some((m) => m.nome === "Direito penal");
      !temPenal
        ? ok("e nem entra na contagem dos filtros", "o acervo publico nao sabe que ela existe")
        : falha("o filtro publico contou a questao particular");
    }

    // ── 5. Gabarito pode faltar -- aqui, e so aqui ────────────────────────
    console.log("\n== 5. PROVA SEM GABARITO AINDA SERVE, AQUI ==");
    {
      const semGab = await subir(ana, { ...questao("Prova sem gabarito", "Questao sem resposta conhecida, para treinar."), gabarito: null });
      semGab.status < 300
        ? ok("🎯 aceita questao sem gabarito", "muita prova de banca civil vem assim")
        : falha("recusou questao sem gabarito", `status ${semGab.status}`);

      const gabInvalido = await subir(ana, { ...questao("x", "Questao com gabarito fora da faixa a-e."), gabarito: "z" });
      gabInvalido.status >= 400
        ? ok("mas gabarito fora de a-e continua recusado", `status ${gabInvalido.status}`)
        : falha("aceitou gabarito invalido");
    }

    // ── 6. Apagar as proprias funciona ────────────────────────────────────
    console.log("\n== 6. A PESSOA MANDA NO QUE E DELA ==");
    {
      const antes = (await req("/rest/v1/questoes_minhas?select=id", { headers: ana.cab })).corpo || [];
      const r = await req(`/rest/v1/questoes_minhas?id=eq.${antes[0].id}`,
        { method: "DELETE", headers: { ...ana.cab, Prefer: "return=representation" } });
      const depois = (await req("/rest/v1/questoes_minhas?select=id", { headers: ana.cab })).corpo || [];
      (r.corpo || []).length === 1 && depois.length === antes.length - 1
        ? ok("apaga a propria questao quando quiser", `${antes.length} -> ${depois.length}`)
        : falha("nao conseguiu apagar a propria", `${antes.length} -> ${depois.length}`);
    }

  } finally {
    for (const c of contas) await req(`/auth/v1/admin/users/${c.id}`, { method: "DELETE", headers: admin });
    console.log(`\n  (${contas.length} contas de teste apagadas -- e as questoes junto, por cascade)`);
  }

  console.log("\n" + "=".repeat(72));
  console.log(falhas === 0
    ? "O MATERIAL DE CADA UM FICA SO DELE — e nao encosta no acervo publico."
    : `🔴 ${falhas} FALHA(S).`);
  process.exit(falhas === 0 ? 0 : 1);
})();
