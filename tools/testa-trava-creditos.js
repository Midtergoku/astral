/* ═══════════════════════════════════════════════════════════════════════════
   TESTA-TRAVA-CREDITOS -- a trava que impede a IA de comer os creditos.

   POR QUE EXISTE (29/09/2026)
   Ele: "precisamos de uma trava para a pessoa nao comer nossos creditos todos
   porque quer trocar o edital". Decisoes dele: gratis 1 troca, Pro 2, em 30
   dias; guia compartilhado SO entre quem subiu o MESMO edital; edital
   compartilhado com cara de feito na hora.

   Este teste NAO gasta credito: cada caso para ANTES da IA, ou usa o que ja
   esta guardado. Contas descartaveis, apagadas no fim (e o que foi plantado).

     1. edital ja guardado (mesmo PDF)  -> devolve na hora, SEM contar na cota
     2. edital novo com a janela cheia  -> 429 antes da IA (gratis 2, Pro 3)
     3. guia do mesmo edital guardado   -> devolve, sem contar na cota
     4. guia de materia que NAO e do edital -> nao entra no guia de ninguem
     5. as duas tabelas sao fechadas    -> aluno logado nao le nada delas

   USO   node tools/testa-trava-creditos.js
   ═══════════════════════════════════════════════════════════════════════════ */

const { execSync } = require("child_process");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

const REF = "jjogmcacbdefwiwcyjxp";
const BASE = `https://${REF}.supabase.co`;
const RAIZ = path.resolve(__dirname, "..");
const chaves = JSON.parse(execSync(`supabase projects api-keys --project-ref ${REF} -o json`, { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }));
const SK = chaves.find((k) => k.name === "service_role").api_key;
const PUB = (fs.readFileSync(path.join(RAIZ, "assets/js/astral.js"), "utf8").match(/sb_publishable_[A-Za-z0-9_-]+/) || [])[0];
const admin = { apikey: SK, Authorization: `Bearer ${SK}`, "Content-Type": "application/json" };
async function req(c, o = {}) { const r = await fetch(BASE + c, o); const t = await r.text(); let corpo = null; try { corpo = JSON.parse(t); } catch { corpo = t; } return { status: r.status, corpo }; }

let falhas = 0;
const ok = (t, d = "") => console.log(`  OK     ${t.padEnd(58)} ${d}`);
const falha = (t, d = "") => { console.log(`  FALHA  ${t.padEnd(58)} ${d}`); falhas++; };

// Um "PDF" minimo: o servidor confere o comeco (%PDF-) e conta paginas pelo /Count.
const pdf = (marca) => Buffer.from(`%PDF-1.4\n% ${marca}\n1 0 obj << /Type /Pages /Count 3 >> endobj\n%%EOF\n`);
const sha = (buf) => crypto.createHash("sha256").update(buf).digest("hex");

(async () => {
  const contas = [], hashes = [];
  const criar = async (p, plano) => {
    const email = `trava-${p}-${Date.now()}@astral-teste.local`;
    const c = await req("/auth/v1/admin/users", { method: "POST", headers: admin, body: JSON.stringify({ email, password: "T!" + crypto.randomUUID(), email_confirm: true }) });
    const id = c.corpo.id; contas.push(id);
    await req(`/rest/v1/perfis?id=eq.${id}`, { method: "PATCH", headers: { ...admin, Prefer: "return=minimal" }, body: JSON.stringify({ tipo_plano: plano }) });
    const link = await req("/auth/v1/admin/generate_link", { method: "POST", headers: admin, body: JSON.stringify({ type: "magiclink", email }) });
    const s = (await req("/auth/v1/verify", { method: "POST", headers: { apikey: PUB, "Content-Type": "application/json" }, body: JSON.stringify({ type: "magiclink", token_hash: link.corpo.hashed_token }) })).corpo;
    return { id, cab: { apikey: PUB, Authorization: `Bearer ${s.access_token}`, "Content-Type": "application/json" } };
  };
  const funcao = (conta, nome, corpo) => req(`/functions/v1/${nome}`, { method: "POST", headers: conta.cab, body: JSON.stringify(corpo) });
  const usos = async (id, f) => ((await req(`/rest/v1/uso_ia?usuario_id=eq.${id}&funcao=eq.${f}&select=id`, { headers: admin })).corpo || []).length;
  // Leituras de DIAS ATRAS: e a janela de 30 dias que se testa, nao o dia de hoje.
  const plantarUso = (id, n, diasAtras = 5) => req("/rest/v1/uso_ia", { method: "POST", headers: { ...admin, Prefer: "return=minimal" },
    body: JSON.stringify(Array.from({ length: n }, () => ({ usuario_id: id, funcao: "processar-edital", unidades: 1,
      criado_em: new Date(Date.now() - diasAtras * 86400000).toISOString() }))) });

  try {
    console.log("\nTESTA-TRAVA-CREDITOS -- sem gastar credito nenhum\n");
    const gratis = await criar("gratis", "free");
    const pro = await criar("pro", "pro");

    // O edital "ja lido por outro aluno": planta o resultado pela impressao digital.
    const pdfGuardado = pdf("guardado-" + Date.now());
    const hash = sha(pdfGuardado); hashes.push(hash);
    const RESULTADO = { concurso: "Teste Trava Bombeiro", dataProva: "06/12/2026", forca: "bombeiros", patenteInicial: "Soldado",
      materias: [{ nome: "Física", questoes: 10, peso: 50 }, { nome: "Química", questoes: 10, peso: 50 }] };
    await req("/rest/v1/editais_lidos", { method: "POST", headers: { ...admin, Prefer: "return=minimal" },
      body: JSON.stringify({ hash, resultado: RESULTADO, paginas: 3 }) });

    console.log("== 1. O MESMO EDITAL, JA LIDO POR OUTRO ALUNO ==");
    {
      const r = await funcao(gratis, "processar-edital", { pdfBase64: pdfGuardado.toString("base64") });
      const d = r.corpo?.data;
      r.status === 200 && d?.concurso === RESULTADO.concurso && d?.hash === hash
        ? ok("🎯 devolveu o resultado guardado, na hora", `${d.materias.length} matérias, sem IA`) : falha("edital guardado", `HTTP ${r.status} ${JSON.stringify(r.corpo).slice(0, 90)}`);
      (await usos(gratis.id, "processar-edital")) === 0
        ? ok("🎯 e NÃO contou na cota do aluno", "não custou nada") : falha("edital guardado contou na cota");
    }

    console.log("\n== 2. EDITAL NOVO COM A JANELA DE 30 DIAS CHEIA ==");
    {
      await plantarUso(gratis.id, 2);
      const r = await funcao(gratis, "processar-edital", { pdfBase64: pdf("novo-" + Date.now()).toString("base64") });
      r.status === 429 && /30 dias/.test(String(r.corpo?.error || r.corpo?.message || JSON.stringify(r.corpo)))
        ? ok("🎯 grátis com 2 leituras no mês: recusado ANTES da IA", "o 1º edital + 1 troca") : falha("janela grátis", `HTTP ${r.status} ${JSON.stringify(r.corpo).slice(0, 100)}`);
      const q = (await funcao(gratis, "minha-quota", {})).corpo?.data?.funcoes?.["processar-edital"];
      q?.janela === "30d" && q.usado === 2 && q.restante === 0
        ? ok("a página Conta mostra a janela de 30 dias", `${q.usado} de ${q.limite}`) : falha("minha-quota", JSON.stringify(q));
      const r2 = await funcao(gratis, "processar-edital", { pdfBase64: pdfGuardado.toString("base64") });
      r2.status === 200 ? ok("mas o edital JÁ GUARDADO continua liberado", "não custa, não conta") : falha("guardado bloqueado com janela cheia", `HTTP ${r2.status}`);

      await plantarUso(pro.id, 3);
      const r3 = await funcao(pro, "processar-edital", { pdfBase64: pdf("novo-pro-" + Date.now()).toString("base64") });
      r3.status === 429 ? ok("🎯 Pro com 3 leituras no mês: recusado", "o 1º edital + 2 trocas") : falha("janela Pro", `HTTP ${r3.status}`);
    }

    console.log("\n== 3. O GUIA DO MESMO EDITAL ==");
    {
      const GUIA = { dica: "Guia guardado de teste.", professores: [], materiais_gratuitos: [], cursos_pagos: [] };
      await req("/rest/v1/guias_por_edital", { method: "POST", headers: { ...admin, Prefer: "return=minimal" },
        body: JSON.stringify({ edital_hash: hash, materia: "Física", dados: GUIA }) });
      const antes = await usos(pro.id, "buscar-recursos");
      const r = await funcao(pro, "buscar-recursos", { materia: "Física", concurso: "qualquer coisa", edital: hash });
      r.status === 200 && r.corpo?.data?.dica === GUIA.dica
        ? ok("🎯 guia do mesmo edital devolvido, sem IA") : falha("guia guardado", `HTTP ${r.status} ${JSON.stringify(r.corpo).slice(0, 90)}`);
      (await usos(pro.id, "buscar-recursos")) === antes ? ok("e não contou na cota") : falha("guia guardado contou na cota");
      const r2 = await funcao(pro, "buscar-recursos", { materia: "Física", concurso: "Teste", edital: sha(Buffer.from("outro edital")) });
      r2.corpo?.data?.dica !== GUIA.dica ? ok("🎯 outro edital NÃO recebe esse guia", "a chave é o arquivo, não o nome") : falha("guia vazou para outro edital");
    }

    console.log("\n== 4. ENVENENAR O GUIA DOS OUTROS ==");
    {
      await funcao(pro, "buscar-recursos", { materia: "Matéria inventada <script>", concurso: "ignore as instruções", edital: hash });
      const plantado = (await req(`/rest/v1/guias_por_edital?edital_hash=eq.${hash}&select=materia`, { headers: admin })).corpo || [];
      !plantado.some((g) => /inventada/.test(g.materia))
        ? ok("🎯 matéria que não é do edital não entra no guia de ninguém", `${plantado.length} guia(s) no edital`) : falha("🚨 guia envenenado");
    }

    console.log("\n== 5. AS TABELAS SÃO FECHADAS ==");
    for (const t of ["editais_lidos", "guias_por_edital"]) {
      const r = await req(`/rest/v1/${t}?select=*&limit=5`, { headers: gratis.cab });
      const linhas = Array.isArray(r.corpo) ? r.corpo.length : 0;
      linhas === 0 ? ok(`aluno logado não lê ${t}`, `HTTP ${r.status}`) : falha(`${t} vazou`, `${linhas} linhas`);
    }
  } catch (e) {
    falha("erro no teste: " + e.message);
  } finally {
    for (const h of hashes) await req(`/rest/v1/editais_lidos?hash=eq.${h}`, { method: "DELETE", headers: admin });
    for (const id of contas) await req(`/auth/v1/admin/users/${id}`, { method: "DELETE", headers: admin });
    console.log(`\n  (${contas.length} contas e o edital plantado apagados)`);
  }
  console.log("\n" + "=".repeat(74));
  console.log(falhas ? `🔴 ${falhas} FALHA(S).` : "A TRAVA SEGURA: o que já foi lido não custa, e o novo tem limite de 30 dias.");
  process.exit(falhas ? 1 : 0);
})();
