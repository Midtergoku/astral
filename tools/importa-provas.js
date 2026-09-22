// IMPORTA-PROVAS -- le a pasta de PDFs baixados e grava no acervo.
//
//   node tools/importa-provas.js            mede, mostra o relatorio, NAO grava
//   node tools/importa-provas.js --gravar   grava de verdade
//
// 🔴 O PADRAO E NAO GRAVAR. Publicar e ato deliberado, nunca efeito colateral
// de rodar uma ferramenta -- questao truncada e PIOR que questao ausente para
// quem estuda, e um lote errado gravado calado seria trabalho manual depois.
//
// Usa EXATAMENTE o mesmo entendimento da tela `importar.html`: os modulos
// `assets/js/prova.js` e `assets/js/assuntos.js`. Se os dois discordassem, o
// acervo teria questao classificada de um jeito por aqui e de outro por la.
const fs = require("fs");
const path = require("path");
const { execFileSync, execSync } = require("child_process");

const RAIZ = path.resolve(__dirname, "..");
const PASTA = path.resolve(RAIZ, "..", "ASTRAL-provas");
const LISTA = path.join(RAIZ, "tools", "provas-conhecidas.json");
const GRAVAR = process.argv.includes("--gravar");
const REF = "jjogmcacbdefwiwcyjxp";
const BASE = `https://${REF}.supabase.co`;

if (!fs.existsSync(PASTA)) {
  console.log(`🔴 ${PASTA} nao existe. Rode antes: node tools/baixa-provas.js`);
  process.exit(1);
}

const nomeDe = (p) => `${p.banca}_${p.ano}_${p.prova}`.replace(/[^\w.-]+/g, "-") + ".pdf";
const provas = JSON.parse(fs.readFileSync(LISTA, "utf8"));

// ── Extrair texto, de tres jeitos (a mesma tecnica da tela) ────────────────
const os = require("os");
function leituras(pdf) {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "imp-"));
  const um = (args, nome) => {
    const alvo = path.join(tmp, nome);
    try {
      execFileSync("pdftotext", ["-enc", "UTF-8", ...args, pdf, alvo], { stdio: "pipe" });
      return fs.readFileSync(alvo, "utf8");
    } catch { return ""; }
  };
  const r = [um([], "f.txt"), um(["-marginr", "300"], "e.txt"), um(["-marginl", "295"], "d.txt")];
  fs.rmSync(tmp, { recursive: true, force: true });
  return r.filter(Boolean);
}

(async () => {
  const { montarQuestoes } = await import("../assets/js/prova.js");
  const { classificarLista } = await import("../assets/js/assuntos.js");

  console.log(`\nIMPORTA-PROVAS  ${PASTA}`);
  console.log(GRAVAR ? "MODO: GRAVAR\n" : "MODO: so medir (use --gravar para publicar)\n");

  const lote = [];
  const relatorio = [];

  for (const p of provas) {
    const arq = path.join(PASTA, nomeDe(p));
    if (!fs.existsSync(arq)) { relatorio.push({ ...p, estado: "sem o arquivo" }); continue; }

    const r = montarQuestoes(leituras(arq), { incluirSemGabarito: false });
    const classificadas = classificarLista(r.prontas);

    /* 🔴 A TRAVA QUE IMPEDE RESPOSTA ERRADA DE ENTRAR NO ACERVO.
       Medido em 22/09/2026: os PDFs de 2013 a 2016 sao o GABARITO, nao o
       caderno. Eles rendiam 4 a 8 questoes com 4 a 9 gabaritos encontrados --
       e esses poucos "gabaritos" eram casamento POR ACASO do padrao
       `\b(\d{2})\s+([A-E])\b` com qualquer numero seguido de letra no texto.

       Ou seja: as questoes que passavam vinham com resposta INVENTADA. Isso e
       pior que nao ter a prova -- quem estuda aprende errado e culpa o site.

       Entao: se o PDF nao traz gabarito para a maioria das questoes que ele
       proprio tem, o arquivo inteiro e recusado. */
    const confiavel = r.total > 0 && r.gabaritos >= r.total * 0.5;

    relatorio.push({
      ...p, estado: confiavel ? "ok" : "recusada",
      achadas: r.total, prontas: confiavel ? r.prontas.length : 0, revisar: r.revisar.length,
      gabaritos: r.gabaritos, cobertura: classificadas.cobertura,
      materias: r.faixas.map((f) => f.materia),
      motivo: confiavel ? null
        : `so ${r.gabaritos} gabaritos para ${r.total} questoes — e o gabarito, nao o caderno`,
    });
    if (!confiavel) continue;

    for (const q of classificadas.questoes) {
      // Peneiras finais. Sem gabarito ou sem materia nao publica.
      if (!q.gabarito || !q.materia) continue;
      const alts = Object.entries(q.alternativas || {});
      if (alts.length < 4) continue;
      // 🔴 22/09/2026: uma questao chegou com enunciado "Se de" e alternativas
      // "3 4", " 3 4". E formula matematica que o pdftotext desmontou -- o
      // texto existe mas nao diz nada. O banco recusou (CHECK de 10 caracteres)
      // e DERRUBOU A FATIA INTEIRA de 200 questoes boas junto.
      // Duas licoes: peneirar antes de mandar, e nao deixar uma linha ruim
      // levar as vizinhas (ver o envio uma a uma mais abaixo).
      // ⚠️ O criterio aqui JA ESTEVE ERRADO, na primeira tentativa: eu cortei
      // por "enunciado com menos de 40 caracteres" e joguei fora 31 questoes
      // BOAS -- "According to the text, scientists" tem 33 e e uma questao de
      // interpretacao perfeitamente valida, porque as alternativas completam a
      // frase. Tamanho nao separa questao curta de lixo.
      //
      // O que separa e ter FRASE: a questao quebrada era "Se de" -- duas
      // palavras, resto de formula que o pdftotext desmontou.
      const palavras = q.enunciado.trim().split(/\s+/).length;
      if (palavras < 3 || q.enunciado.trim().length < 15) continue;
      if (alts.some(([, t]) => !String(t).trim())) continue;
      // ⚠️ AQUI EU ERREI DE NOVO, e do mesmo jeito: cortei "alternativa com
      // menos de 2 caracteres", achando que era formula desmontada. Matematica
      // caiu de 268 para 179 questoes -- porque resposta de matematica E um
      // numero de um digito. "a) 3  b) 5  c) 10  d) 12" e uma questao perfeita.
      //
      // E o pior: essa regra nem pegava o lixo que a motivou ("3 4" tem tres
      // caracteres). Ela so cobrava o preco, sem entregar o beneficio.
      // Quem separa lixo aqui e a contagem de palavras do ENUNCIADO, acima.
      if (!q.gabarito || !q.alternativas[q.gabarito]) continue;
      lote.push({
        banca: p.banca, prova: p.prova, ano: p.ano,
        numero: q.numero, materia: q.materia, assunto: q.assunto || null,
        enunciado: q.enunciado, alternativas: q.alternativas,
        gabarito: q.gabarito, publicada: true, revisao: "ok",
      });
    }
  }

  /* ── TIRAR AS REPETIDAS ─────────────────────────────────────────────────
     🔴 MEDIDO EM 22/09/2026, e sem isto o acervo seria uma mentira educada.
     O EAGS tem uma prova por ESPECIALIDADE (Administracao, Enfermagem,
     Eletronica...), 24 no mesmo ano -- e TODAS trazem o mesmo bloco de
     Portugues. Conferido em 6 provas de 2024: 45 questoes de Portugues
     apareciam nas 6, identicas.

     Publicar tudo daria "2.681 questoes de Portugues" quando as distintas sao
     poucas centenas. O numero ficaria grande e o produto ficaria pior: quem
     estudasse veria a mesma pergunta a tarde inteira.

     Fica a PRIMEIRA ocorrencia. As outras somem, e o relatorio diz quantas. */
  const vistas = new Map();
  const unicas = [];
  let repetidas = 0;
  for (const q of lote) {
    const chave = String(q.enunciado).toLowerCase().replace(/\s+/g, " ").trim()
      + "|" + Object.values(q.alternativas).join("|").toLowerCase().replace(/\s+/g, " ");
    if (vistas.has(chave)) { repetidas++; continue; }
    vistas.set(chave, true);
    unicas.push(q);
  }
  lote.length = 0;
  lote.push(...unicas);

  // ── Relatorio ────────────────────────────────────────────────────────────
  console.log("  PROVA                 ACHADAS  PRONTAS  REVISAR  GABARITO  ASSUNTO");
  for (const r of relatorio) {
    if (r.estado !== "ok") {
      console.log(`  ${String(r.banca + " " + r.prova).padEnd(20)} 🔴 ${r.estado}`
        + (r.motivo ? ` — ${r.motivo}` : ""));
      continue;
    }
    const alerta = r.prontas === 0 ? "  🔴" : "";
    console.log(`  ${String(r.banca + " " + r.prova).padEnd(20)} `
      + `${String(r.achadas).padStart(7)} ${String(r.prontas).padStart(8)} `
      + `${String(r.revisar).padStart(8)} ${String(r.gabaritos).padStart(9)} `
      + `${String(r.cobertura + "%").padStart(8)}${alerta}`);
  }

  const boas = relatorio.filter((r) => r.estado === "ok" && r.prontas > 0);
  const vazias = relatorio.filter((r) => r.estado === "ok" && r.prontas === 0);
  const achadas = boas.reduce((s, r) => s + r.achadas, 0);

  console.log(`\n  provas que renderam    ${boas.length} de ${relatorio.length}`);
  console.log(`  questoes encontradas   ${achadas}`);
  console.log(`  repetidas descartadas  ${repetidas}  (mesma questao em varias especialidades)`);
  console.log(`  QUESTOES UTILIZAVEIS   ${lote.length}`);
  if (achadas) console.log(`  aproveitamento         ${Math.round((lote.length / achadas) * 100)}%`);
  const comAss = lote.filter((q) => q.assunto).length;
  console.log(`  com assunto marcado    ${comAss}  (${lote.length ? Math.round((comAss / lote.length) * 100) : 0}%)`);

  if (vazias.length) {
    console.log(`\n  🔴 ${vazias.length} PDF(s) nao renderam questao nenhuma:`);
    for (const v of vazias) console.log(`       ${v.banca} ${v.prova} — provavelmente so o gabarito, ou formato diferente`);
  }

  // Quantas matérias e assuntos distintos -- e o que o filtro vai oferecer.
  const porMateria = {};
  for (const q of lote) (porMateria[q.materia] ||= new Set()).add(q.assunto || "(sem assunto)");
  console.log("\n  O QUE O FILTRO VAI OFERECER");
  for (const [m, s] of Object.entries(porMateria).sort()) {
    const n = lote.filter((q) => q.materia === m).length;
    console.log(`     ${m.padEnd(14)} ${String(n).padStart(4)} questoes, ${[...s].filter((x) => x !== "(sem assunto)").length} assuntos`);
  }

  if (!GRAVAR) {
    console.log("\n  🔴 NADA foi gravado. Para publicar: node tools/importa-provas.js --gravar\n");
    return;
  }

  // ── Gravar ───────────────────────────────────────────────────────────────
  const chaves = JSON.parse(execSync(`supabase projects api-keys --project-ref ${REF} -o json`,
    { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }));
  const SK = chaves.find((k) => k.name === "service_role").api_key;
  const admin = { apikey: SK, Authorization: `Bearer ${SK}`, "Content-Type": "application/json" };

  console.log(`\n  gravando ${lote.length} questoes...`);
  let gravadas = 0;
  const recusadas = [];
  // A funcao aceita 500 por chamada; fatias menores dao erro mais legivel.
  for (let i = 0; i < lote.length; i += 200) {
    const fatia = lote.slice(i, i + 200);
    const r = await fetch(`${BASE}/rest/v1/questoes?on_conflict=banca,ano,prova,numero`, {
      method: "POST",
      headers: { ...admin, Prefer: "resolution=merge-duplicates,return=minimal" },
      body: JSON.stringify(fatia),
    });
    if (!r.ok) {
      // 🔴 Uma linha ruim NAO pode derrubar as vizinhas. Quando a fatia cai,
      // manda-se uma a uma: o que presta entra, e o que nao presta e nomeado.
      console.log(`\n  fatia ${i}: ${r.status} — reenviando uma a uma...`);
      for (const q of fatia) {
        const u = await fetch(`${BASE}/rest/v1/questoes?on_conflict=banca,ano,prova,numero`, {
          method: "POST",
          headers: { ...admin, Prefer: "resolution=merge-duplicates,return=minimal" },
          body: JSON.stringify([q]),
        });
        if (u.ok) gravadas++;
        else recusadas.push({ prova: q.prova, numero: q.numero,
                              porque: (await u.text()).slice(0, 90) });
      }
      continue;
    }
    gravadas += fatia.length;
    process.stdout.write(`\r  ${gravadas}/${lote.length}`);
  }

  const conta = await fetch(`${BASE}/rest/v1/questoes?select=id&publicada=is.true`,
    { headers: { ...admin, Prefer: "count=exact", Range: "0-0" } });
  const total = (conta.headers.get("content-range") || "").split("/")[1];
  if (recusadas.length) {
    console.log(`\n\n  🔴 ${recusadas.length} recusadas pelo banco:`);
    for (const x of recusadas.slice(0, 8)) console.log(`       ${x.prova} n${x.numero} — ${x.porque}`);
  }
  console.log(`\n  ✔ o acervo tem ${total} questoes publicadas.\n`);
})();
