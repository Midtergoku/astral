/* ═══════════════════════════════════════════════════════════════════════════
   TESTA-DOMINIO -- o dominio de cada materia e medido pelo servidor?

   POR QUE EXISTE (30/09/2026)
   Ate aqui o dominio nunca era calculado: nascia 0 e o navegador podia gravar
   o que quisesse. A migration 20260930120000 passou a medi-lo no servidor
   (acertos de primeira no Banco + tempo de estudo). Este teste prova, contra a
   API real, com conta descartavel:

     1. a lista de materias do banco e a MESMA do prova.js (nada copiado a mao)
     2. o nome do edital casa com o do Banco ("Lingua Portuguesa" -> "Portugues")
        exatamente como o arrumarNome do navegador
     3. dominio forjado pelo navegador nao vale
     4. responder certo de primeira no Banco faz o dominio subir NA HORA
     5. errar e depois acertar NAO conta como de primeira
     6. materia sem Banco e medida pelo estudo
     7. ninguem le o dominio de outra pessoa

   USO   node tools/testa-dominio.js     (nao gasta credito)
   ═══════════════════════════════════════════════════════════════════════════ */

const { execSync, spawnSync } = require("child_process");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const { pathToFileURL } = require("url");

const REF = "jjogmcacbdefwiwcyjxp";
const BASE = `https://${REF}.supabase.co`;
const RAIZ = path.resolve(__dirname, "..");
const SK = JSON.parse(execSync(`supabase projects api-keys --project-ref ${REF} -o json`, { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }))
  .find((k) => k.name === "service_role").api_key;
const PUB = (fs.readFileSync(path.join(RAIZ, "assets/js/astral.js"), "utf8").match(/sb_publishable_[A-Za-z0-9_-]+/) || [])[0];
const admin = { apikey: SK, Authorization: `Bearer ${SK}`, "Content-Type": "application/json" };
async function req(c, o = {}) { const r = await fetch(BASE + c, o); const t = await r.text(); let corpo = null; try { corpo = JSON.parse(t); } catch { corpo = t; } return { status: r.status, corpo }; }

let falhas = 0;
const ok = (t, d = "") => console.log(`  OK     ${t.padEnd(58)} ${d}`);
const falha = (t, d = "") => { console.log(`  FALHA  ${t.padEnd(58)} ${d}`); falhas++; };

(async () => {
  const contas = [];
  const criar = async (p) => {
    const email = `dominio-${p}-${Date.now()}@astral-teste.local`;
    const c = await req("/auth/v1/admin/users", { method: "POST", headers: admin, body: JSON.stringify({ email, password: "T!" + crypto.randomUUID(), email_confirm: true }) });
    contas.push(c.corpo.id);
    const link = await req("/auth/v1/admin/generate_link", { method: "POST", headers: admin, body: JSON.stringify({ type: "magiclink", email }) });
    const s = (await req("/auth/v1/verify", { method: "POST", headers: { apikey: PUB, "Content-Type": "application/json" }, body: JSON.stringify({ type: "magiclink", token_hash: link.corpo.hashed_token }) })).corpo;
    return { id: c.corpo.id, cab: { apikey: PUB, Authorization: `Bearer ${s.access_token}`, "Content-Type": "application/json" } };
  };
  const rpc = (conta, f, corpo = {}) => req(`/rest/v1/rpc/${f}`, { method: "POST", headers: conta.cab, body: JSON.stringify(corpo) });
  const materias = async (id) => ((await req(`/rest/v1/progresso?usuario_id=eq.${id}&select=materias`, { headers: admin })).corpo?.[0]?.materias) || [];
  const dom = (lista, nome) => lista.find((m) => m.nome === nome) || {};

  try {
    console.log("\nTESTA-DOMINIO -- o dominio medido pelo servidor\n");

    console.log("== 1. A LISTA DE MATERIAS E A DO prova.js ==");
    const conf = spawnSync("node", [path.join(__dirname, "sincroniza-materias.js"), "--conferir"], { encoding: "utf8" });
    conf.status === 0 ? ok("materias_conhecidas igual ao prova.js", (conf.stdout || "").trim().slice(0, 40))
      : falha("a lista do banco divergiu do prova.js", (conf.stdout + conf.stderr).trim().slice(0, 80));

    console.log("\n== 2. O NOME DO EDITAL CASA COM O DO BANCO, IGUAL AO NAVEGADOR ==");
    const { arrumarNome } = await import(pathToFileURL(path.join(RAIZ, "assets/js/prova.js")).href);
    const NOMES = ["Língua Portuguesa", "LÍNGUA PORTUGUESA E INTERPRETAÇÃO", "Língua Inglesa", "Noções de Informática",
      "Matemática", "Raciocínio Lógico e Matemático", "Física", "Química Geral", "Biologia", "História do Brasil",
      "História e Geografia de Santa Catarina", "Geografia", "Direito Penal Militar", "Direito Penal",
      "Código de Trânsito Brasileiro", "Legislação Institucional do CBMERJ", "Conhecimentos Específicos",
      "Educação Física", "Redação", "Ética no Serviço Público", "Atualidades", "Matéria que não existe"];
    let iguais = 0; const diferentes = [];
    for (const n of NOMES) {
      const s = (await req("/rest/v1/rpc/materia_do_banco", { method: "POST", headers: admin, body: JSON.stringify({ p_nome: n }) })).corpo;
      const j = arrumarNome(n);
      if ((s ?? null) === (j ?? null)) iguais++; else diferentes.push(`${n}: banco=${s} navegador=${j}`);
    }
    diferentes.length ? falha("servidor e navegador casam nomes diferente", diferentes.join(" | ").slice(0, 160))
      : ok(`🎯 ${iguais} nomes casados igual nos dois lados`, `"Língua Portuguesa" -> ${(await req("/rest/v1/rpc/materia_do_banco", { method: "POST", headers: admin, body: JSON.stringify({ p_nome: "Língua Portuguesa" }) })).corpo}`);

    console.log("\n== 3. DOMINIO FORJADO PELO NAVEGADOR NAO VALE ==");
    const aluno = await criar("aluno");
    const MATERIAS = [
      { nome: "Língua Portuguesa", peso: 3, progresso: 99 },
      { nome: "Matemática", peso: 2, progresso: 95 },
      { nome: "Conhecimentos Específicos", peso: 1, progresso: 90 },
    ];
    await rpc(aluno, "salvar_progresso", { p_xp: 0, p_streak: 0, p_horas: 0, p_edital: { nome: "Teste Dominio" },
      p_materias: MATERIAS, p_cronograma_hoje: [], p_badges: [], p_tag_escolhida: null });
    let m = await materias(aluno.id);
    m.length === 3 && m.every((x) => x.progresso === 0)
      ? ok("🎯 o navegador mandou 99/95/90; o servidor gravou 0/0/0", "sem estudo, sem questao")
      : falha("dominio forjado passou", JSON.stringify(m.map((x) => [x.nome, x.progresso])));
    dom(m, "Língua Portuguesa").medida?.banco === "Português" ? ok("cada materia diz de onde vem a medida", "Língua Portuguesa -> Banco: Português")
      : falha("medida sem o casamento", JSON.stringify(dom(m, "Língua Portuguesa").medida));

    console.log("\n== 4. ACERTAR DE PRIMEIRA NO BANCO SOBE O DOMINIO NA HORA ==");
    const qs = (await req("/rest/v1/questoes?materia=eq.Portugu%C3%AAs&publicada=eq.true&select=id,gabarito&order=id&limit=12", { headers: admin })).corpo;
    // Servir pela chave de servico, como o sorteio faria; responder como o aluno.
    await req("/rest/v1/questoes_servidas", { method: "POST", headers: { ...admin, Prefer: "return=minimal" },
      body: JSON.stringify(qs.map((q) => ({ usuario_id: aluno.id, questao_id: q.id }))) });
    for (const q of qs.slice(0, 10)) await rpc(aluno, "registrar_resposta", { p_origem: "acervo", p_id: q.id, p_letra: q.gabarito });
    m = await materias(aluno.id);
    const pt = dom(m, "Língua Portuguesa");
    // 10 certas de 10, alvo 30: Q = 1 x 10/30 -> 60 x 0,333 = 20
    pt.progresso === 20 && pt.medida?.respondidas === 10 && pt.medida?.de_primeira === 10
      ? ok("🎯 10 de 10 de primeira: dominio 20, sem salvar nada", "60% x (10/30 de confiança)")
      : falha("dominio nao subiu como devia", JSON.stringify(pt));

    console.log("\n== 5. ERRAR E DEPOIS ACERTAR NAO E 'DE PRIMEIRA' ==");
    const [q11, q12] = qs.slice(10);
    const errada = ["a", "b", "c", "d", "e"].find((l) => l !== q11.gabarito);
    await rpc(aluno, "registrar_resposta", { p_origem: "acervo", p_id: q11.id, p_letra: errada });
    await rpc(aluno, "registrar_resposta", { p_origem: "acervo", p_id: q11.id, p_letra: q11.gabarito });
    m = await materias(aluno.id);
    const pt2 = dom(m, "Língua Portuguesa");
    pt2.medida?.respondidas === 11 && pt2.medida?.de_primeira === 10
      ? ok("🎯 a questão corrigida no caderno não conta como de primeira", `${pt2.medida.de_primeira} de ${pt2.medida.respondidas}`)
      : falha("revisar inflou o dominio", JSON.stringify(pt2.medida));
    void q12;

    console.log("\n== 6. MATERIA SEM BANCO E MEDIDA PELO ESTUDO ==");
    const ins = await req("/rest/v1/sessoes_estudo", { method: "POST", headers: { ...aluno.cab, Prefer: "return=minimal" },
      body: JSON.stringify({ usuario_id: aluno.id, materia: "Conhecimentos Específicos", segundos: 3 * 3600, xp: 0, modo: "cronograma" }) });
    m = await materias(aluno.id);
    const ce = dom(m, "Conhecimentos Específicos");
    // 180 min de 900, com teto de 70 (migration 20260930130000) -> 14
    ins.status < 300 && ce.progresso === 14 && ce.medida?.fonte === "estudo"
      ? ok("🎯 3 h de estudo numa matéria sem Banco: dominio 14", "70 x 180/900 — sem questão, o teto é 70")
      : falha("materia sem banco", `HTTP ${ins.status} ${JSON.stringify(ce)}`);

    console.log("\n== 7. O DOMINIO E SO DE QUEM E ==");
    const outro = await criar("outro");
    const r1 = await rpc(outro, "meu_dominio");
    Array.isArray(r1.corpo) && r1.corpo.length === 0 ? ok("meu_dominio devolve so o seu (vazio para quem não tem edital)") : falha("meu_dominio", JSON.stringify(r1.corpo).slice(0, 80));
    const r2 = await rpc(outro, "dominio_calculado", { p_uid: aluno.id, p_materias: MATERIAS });
    r2.status >= 400 ? ok("🎯 calcular o dominio de OUTRA pessoa é recusado", `HTTP ${r2.status}`) : falha("🚨 leu o dominio de outra pessoa", JSON.stringify(r2.corpo).slice(0, 80));
    const r3 = await req("/rest/v1/rpc/meu_dominio", { method: "POST", headers: { apikey: PUB, "Content-Type": "application/json" }, body: "{}" });
    r3.status >= 400 ? ok("sem login, recusado", `HTTP ${r3.status}`) : falha("respondeu sem login", String(r3.status));
  } catch (e) {
    falha("erro no teste: " + e.message);
  } finally {
    for (const id of contas) await req(`/auth/v1/admin/users/${id}`, { method: "DELETE", headers: admin });
    console.log(`\n  (${contas.length} contas descartaveis apagadas)`);
  }
  console.log("\n" + "=".repeat(74));
  console.log(falhas ? `🔴 ${falhas} FALHA(S).` : "O DOMINIO E MEDIDO PELO SERVIDOR, PELO BANCO E PELO ESTUDO.");
  process.exit(falhas ? 1 : 0);
})();
