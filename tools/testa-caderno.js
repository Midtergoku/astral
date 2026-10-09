// TESTA-CADERNO -- o caderno de erros guarda o que a pessoa errou, e so isso?
//
// Pedido dele em 27/09/2026: "o caderno de erros (...) muitas pessoas utilizam
// so o caderno de erros para estudar". A regra: o que voce errou volta ate
// voce acertar.
//
// 🔴 As tres travas que este teste cobra, com credencial VALIDA:
//   1. quem decide se errou e o SERVIDOR -- a tela so manda a letra
//   2. so entra questao que a pessoa JA RECEBEU -- senao o caderno viraria
//      porta dos fundos para as provas recentes do Pro
//   3. uma pessoa nao ve o caderno da outra
const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const { REF, reescrever } = require("./testes/alvo");   // 09/10/2026 (COD-02): ASTRAL_DEV=1 -> astral-dev (tools/testes/alvo.js)
const BASE = `https://${REF}.supabase.co`;
const RAIZ = path.resolve(__dirname, "..");
const chaves = JSON.parse(execSync(`supabase projects api-keys --project-ref ${REF} -o json`,
  { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }));
const SK = chaves.find((k) => k.name === "service_role").api_key;
const PUB = require("./testes/alvo").PUB;
const admin = { apikey: SK, Authorization: `Bearer ${SK}`, "Content-Type": "application/json" };

let falhas = 0;
const ok = (t, d = "") => console.log(`  OK     ${t.padEnd(56)} ${d}`);
const falha = (t, d = "") => { console.log(`  FALHA  ${t.padEnd(56)} ${d}`); falhas++; };
async function req(c, o) { const r = await fetch(BASE + c, o); let corpo = null; try { corpo = await r.json(); } catch {} return { status: r.status, corpo }; }

const ANO = new Date().getFullYear();
const MARCA = `CADERNO-${Date.now()}`;

(async () => {
  const contas = [];
  const criar = async (p, plano = "free") => {
    const email = `${p}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}@astral-teste.local`;
    const c = await req("/auth/v1/admin/users", { method: "POST", headers: admin,
      body: JSON.stringify({ email, password: "T!" + crypto.randomUUID(), email_confirm: true }) });
    const id = c.corpo.id; contas.push(id);
    if (plano !== "free") await req(`/rest/v1/perfis?id=eq.${id}`, { method: "PATCH",
      headers: { ...admin, Prefer: "return=minimal" }, body: JSON.stringify({ tipo_plano: plano }) });
    const link = await req("/auth/v1/admin/generate_link", { method: "POST", headers: admin, body: JSON.stringify({ type: "magiclink", email }) });
    const s = (await req("/auth/v1/verify", { method: "POST", headers: { apikey: PUB, "Content-Type": "application/json" },
      body: JSON.stringify({ type: "magiclink", token_hash: link.corpo?.hashed_token }) })).corpo;
    return { id, cab: { apikey: PUB, Authorization: `Bearer ${s.access_token}`, "Content-Type": "application/json" } };
  };
  const rpc = (conta, nome, corpo) => req(`/rest/v1/rpc/${nome}`, { method: "POST", headers: conta.cab, body: JSON.stringify(corpo) });

  try {
    // Acervo de teste: 3 antigas de Matematica (gratis ve), 1 recente (so Pro).
    const dono = await criar("dono");
    await req("/rest/v1/administradores", { method: "POST", headers: { ...admin, Prefer: "return=minimal" },
      body: JSON.stringify({ usuario_id: dono.id }) });
    const linhas = [1, 2, 3].map((n) => ({
      banca: MARCA, prova: "ANTIGA", ano: ANO - 6, numero: n, materia: "Matemática", assunto: null,
      enunciado: `Questao antiga ${n} do caderno de teste, com texto suficiente.`,
      alternativas: { a: "um", b: "dois", c: "tres", d: "quatro" }, gabarito: "b", publicada: true, revisao: "ok" }));
    linhas.push({ banca: MARCA, prova: "RECENTE", ano: ANO, numero: 9, materia: "Física", assunto: null,
      enunciado: "Questao recente, que o plano gratis nao alcanca.",
      alternativas: { a: "um", b: "dois", c: "tres", d: "quatro" }, gabarito: "c", publicada: true, revisao: "ok" });
    await rpc(dono, "publicar_questoes", { p_questoes: linhas });
    const ids = (await req(`/rest/v1/questoes?banca=eq.${MARCA}&select=id,prova,numero&order=numero`, { headers: admin })).corpo;
    const antigas = ids.filter((x) => x.prova === "ANTIGA").map((x) => x.id);
    const recente = ids.find((x) => x.prova === "RECENTE").id;

    const ana = await criar("ana");
    const bia = await criar("bia");
    console.log(`\nTESTA-CADERNO  ana ${ana.id.slice(0, 8)} · bia ${bia.id.slice(0, 8)}\n`);

    // A Ana recebe as 3 antigas pelo caminho normal.
    await rpc(ana, "sortear_questoes", { p_banca: MARCA, p_materia: null, p_assunto: null, p_prova: null, p_ano: null, p_limite: 10 });

    // ── 1. Errar entra, acertar sai ───────────────────────────────────────
    console.log("== 1. O QUE ERROU VOLTA ATE ACERTAR ==");
    await rpc(ana, "registrar_resposta", { p_origem: "acervo", p_id: antigas[0], p_letra: "a" }); // erra
    await rpc(ana, "registrar_resposta", { p_origem: "acervo", p_id: antigas[1], p_letra: "d" }); // erra
    await rpc(ana, "registrar_resposta", { p_origem: "acervo", p_id: antigas[2], p_letra: "b" }); // acerta
    let cad = (await rpc(ana, "caderno_de_erros", { p_materia: null, p_limite: 50 })).corpo;
    cad?.total === 2
      ? ok("🎯 errou 2, acertou 1 -> o caderno tem 2", `total ${cad.total}`)
      : falha("contagem do caderno", JSON.stringify(cad).slice(0, 100));

    await rpc(ana, "registrar_resposta", { p_origem: "acervo", p_id: antigas[0], p_letra: "b" }); // acerta na revisao
    cad = (await rpc(ana, "caderno_de_erros", { p_materia: null, p_limite: 50 })).corpo;
    cad?.total === 1
      ? ok("🎯 acertou na revisão -> a questão SAI do caderno", `2 -> ${cad.total}`)
      : falha("acertar nao tirou do caderno", String(cad?.total));

    await rpc(ana, "registrar_resposta", { p_origem: "acervo", p_id: antigas[1], p_letra: "c" }); // erra de novo
    cad = (await rpc(ana, "caderno_de_erros", { p_materia: null, p_limite: 50 })).corpo;
    const q2 = (cad?.questoes || []).find((q) => q.id === antigas[1]);
    q2?.vezes_errou === 2
      ? ok("errou de novo -> fica, e conta quantas vezes", `vezes_errou = ${q2.vezes_errou}`)
      : falha("contador de erros", JSON.stringify(q2));

    const pm = cad?.por_materia || [];
    pm.length === 1 && pm[0].nome === "Matemática"
      ? ok("🎯 o caderno separa por matéria", `Matemática: ${pm[0].quantas}`)
      : falha("por materia", JSON.stringify(pm));

    // ── 2. 🔴 O servidor decide, nao a tela ───────────────────────────────
    console.log("\n== 2. QUEM DECIDE SE ERROU E O SERVIDOR ==");
    // ⚠️ Na primeira versao deste teste eu esperava que o servidor ACEITASSE o
    // campo forjado e o ignorasse. Ele faz melhor: nem aceita a chamada, porque
    // a funcao nao tem esse parametro -- nao ha por onde injetar o resultado.
    const forja = await rpc(ana, "registrar_resposta", { p_origem: "acervo", p_id: antigas[1], p_letra: "b", acertou: false });
    forja.status >= 400
      ? ok("🎯 mandar 'acertou' junto nem é aceito", `status ${forja.status} — não existe campo para forjar`)
      : falha("🔴 aceitou um campo 'acertou' vindo da tela", JSON.stringify(forja.corpo).slice(0, 80));

    const certa = await rpc(ana, "registrar_resposta", { p_origem: "acervo", p_id: antigas[1], p_letra: "b" });
    certa.corpo?.acertou === true
      ? ok("🎯 e com a letra certa, é o servidor que diz 'acertou'", "comparou com o gabarito")
      : falha("servidor nao computou o acerto", JSON.stringify(certa.corpo));

    const invalida = await rpc(ana, "registrar_resposta", { p_origem: "acervo", p_id: antigas[1], p_letra: "z" });
    invalida.status >= 400 ? ok("letra fora de a-e e recusada", `status ${invalida.status}`) : falha("aceitou letra z");

    // ── 3. 🔴 Porta dos fundos fechada ────────────────────────────────────
    console.log("\n== 3. O CADERNO NAO E PORTA DOS FUNDOS ==");
    const furar = await rpc(ana, "registrar_resposta", { p_origem: "acervo", p_id: recente, p_letra: "a" });
    furar.status >= 400
      ? ok("🎯 nao da para responder questão que não recebeu", `status ${furar.status}`)
      : falha("🔴 registrou resposta de questao nao servida");
    cad = (await rpc(ana, "caderno_de_erros", { p_materia: null, p_limite: 50 })).corpo;
    !(cad?.questoes || []).some((q) => q.id === recente)
      ? ok("🎯 e a prova recente (só Pro) não aparece no caderno", "o gate free/pro continua de pé")
      : falha("🔴 a questao recente vazou pelo caderno");

    // ── 4. 🔴 Uma pessoa nao ve o caderno da outra ────────────────────────
    console.log("\n== 4. CADA UM VE SO O SEU ==");
    const daBia = (await rpc(bia, "caderno_de_erros", { p_materia: null, p_limite: 50 })).corpo;
    daBia?.total === 0 && (daBia?.questoes || []).length === 0
      ? ok("🎯 o caderno da Bia vem vazio", "os erros da Ana nao aparecem")
      : falha("🔴 caderno alheio vazou", JSON.stringify(daBia).slice(0, 90));
    const tabela = await req("/rest/v1/respostas?select=usuario_id&limit=5", { headers: bia.cab });
    tabela.status >= 400
      ? ok("🎯 ninguém lê a tabela de respostas direto", `status ${tabela.status}`)
      : falha("🔴 a tabela de respostas e legivel", JSON.stringify(tabela.corpo).slice(0, 80));
    const escrever = await req("/rest/v1/respostas", { method: "POST", headers: bia.cab,
      body: JSON.stringify({ usuario_id: ana.id, questao_id: antigas[2], letra: "a", acertou: false }) });
    escrever.status >= 400
      ? ok("🎯 nem escrever erro no caderno de outra pessoa", `status ${escrever.status}`)
      : falha("🔴 escreveu no caderno alheio");

    // ── 5. Questoes dela tambem entram ────────────────────────────────────
    console.log("\n== 5. AS QUESTOES QUE ELA TROUXE TAMBEM ==");
    const minha = await req("/rest/v1/questoes_minhas", { method: "POST",
      headers: { ...ana.cab, Prefer: "return=representation" },
      body: JSON.stringify({ usuario_id: ana.id, origem: "Apostila", materia: "Química",
        enunciado: "Questao que a Ana trouxe de uma apostila dela.",
        alternativas: { a: "um", b: "dois", c: "tres", d: "quatro" }, gabarito: "d" }) });
    const mid = minha.corpo?.[0]?.id;
    await rpc(ana, "registrar_resposta", { p_origem: "minha", p_id: mid, p_letra: "a" });
    cad = (await rpc(ana, "caderno_de_erros", { p_materia: "Química", p_limite: 50 })).corpo;
    (cad?.questoes || []).some((q) => q.origem === "minha" && q.id === mid)
      ? ok("🎯 errou uma questão dela -> entra no caderno", "Química, da apostila")
      : falha("questao propria nao entrou", JSON.stringify(cad).slice(0, 90));
    const alheia = await rpc(bia, "registrar_resposta", { p_origem: "minha", p_id: mid, p_letra: "a" });
    alheia.status >= 400
      ? ok("e a Bia não consegue responder a questão da Ana", `status ${alheia.status}`)
      : falha("🔴 respondeu questao particular alheia");

  } finally {
    await req(`/rest/v1/questoes?banca=eq.${MARCA}`, { method: "DELETE", headers: admin });
    for (const id of contas) await req(`/auth/v1/admin/users/${id}`, { method: "DELETE", headers: admin });
    console.log(`\n  (acervo de teste e ${contas.length} contas apagados -- as respostas vao junto, por cascade)`);
  }
  console.log("\n" + "=".repeat(74));
  console.log(falhas === 0 ? "O CADERNO GUARDA O QUE A PESSOA ERROU — e so dela, e so o que ela recebeu." : `🔴 ${falhas} FALHA(S).`);
  process.exit(falhas === 0 ? 0 : 1);
})();
