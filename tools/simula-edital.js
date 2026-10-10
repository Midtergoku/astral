/* ═══════════════════════════════════════════════════════════════════════════
   SIMULA-EDITAL -- poe numa conta um edital de bombeiro e ~2 meses de estudo.

   POR QUE EXISTE (27/09/2026)
   Pedido dele: "simule como se eu tivesse colocado um edital dos bombeiros e
   me de acesso a tudo como se eu ja estivesse avancado, apenas para testar as
   coisas, ja que ainda nao consegui colocar dinheiro. Depois vamos reverter
   isso e colocar um edital real."

   Sem credito na Anthropic, o processar-edital nao roda -- e sem edital o
   dashboard, o cronograma, o calendario e o RPG ficam vazios. Esta ferramenta
   faz o que o edital + 2 meses de cronometro fariam, por fora da IA.

   USO
     node tools/simula-edital.js --email X             so mostra o plano
     node tools/simula-edital.js --email X --aplicar   guarda copia e aplica
     node tools/simula-edital.js --email X --reverter  volta a conta como era

   🔴 O e-mail entra por argumento e NUNCA fica neste arquivo: o repositorio e
   publico. A copia de seguranca vai para ../ASTRAL-BACKUPS/simulacao/, fora
   do repositorio, e e dela que o --reverter le.

   O QUE E GRAVADO, e por que cada coisa parece de verdade:
   - progresso: o edital (marcado "SIMULACAO" no nome, para ninguem confundir
     com um edital real), as materias com peso e progresso, o cronograma do
     dia montado pela MESMA funcao do site (plano.js)
   - sessoes_estudo: ~60 dias de sessoes com data no passado, XP pela MESMA
     regra do cronometro (2 por minuto). E daqui que o SERVIDOR calcula a
     ficha, a patente, os pontos de habilidade e as conquistas -- entao tudo
     isso aparece sozinho, sem ser forjado a parte.
   - conquistas e habilidades: nada e gravado. Aparecem quando a conta abrir
     o site (sincronizar_conquistas), e os pontos ficam para ele gastar.
   ═══════════════════════════════════════════════════════════════════════════ */

const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");
const url = require("url");

// 09/10/2026 (COD-02): segue o alvo -- os testes que a chamam rodam no astral-dev (ASTRAL_DEV=1,
// herdado). Sem ASTRAL_DEV, continua na producao (e assim que se simula na conta de alguem).
const { REF } = require("./testes/alvo");
const BASE = `https://${REF}.supabase.co`;
const RAIZ = path.resolve(__dirname, "..");
const PASTA = path.resolve(RAIZ, "..", "ASTRAL-BACKUPS", "simulacao");

const arg = (n) => { const i = process.argv.indexOf(n); return i > 0 ? process.argv[i + 1] : null; };
const EMAIL = arg("--email");
const APLICAR = process.argv.includes("--aplicar");
const REVERTER = process.argv.includes("--reverter");
if (!EMAIL) { console.log("Uso: node tools/simula-edital.js --email X [--aplicar | --reverter]"); process.exit(1); }

const chaves = JSON.parse(execSync(`supabase projects api-keys --project-ref ${REF} -o json`,
  { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }));
const SK = chaves.find((k) => k.name === "service_role").api_key;
const admin = { apikey: SK, Authorization: `Bearer ${SK}`, "Content-Type": "application/json" };
async function req(c, o = {}) {
  const r = await fetch(BASE + c, { headers: admin, ...o });
  let corpo = null; try { corpo = await r.json(); } catch {}
  if (r.status >= 400) throw new Error(`${o.method || "GET"} ${c.split("?")[0]} -> HTTP ${r.status} ${JSON.stringify(corpo).slice(0, 160)}`);
  return corpo;
}

// As tabelas que a simulacao pode tocar, e a coluna que diz de quem e a linha.
const TABELAS = ["progresso", "sessoes_estudo", "eventos", "conquistas", "habilidades_escolhidas", "recursos_salvos"];
const GUIA = process.argv.includes("--guia");
const RESPOSTAS = process.argv.includes("--respostas");

/* ── AS RESPOSTAS DO BANCO SIMULADAS (30/09/2026) ───────────────────────────
   Desde 30/09 o DOMINIO de cada materia e medido pelo servidor: acertos de
   primeira no Banco (60%) + tempo de estudo (40%). O `progresso` que esta
   ferramenta escrevia a mao deixou de valer -- o servidor recalcula. Para a
   conta simulada continuar "avancada", ela ganha respostas de verdade a
   questoes de verdade do acervo, na proporcao que leva cada materia perto do
   dominio que a simulacao tinha (MATERIAS[].progresso).

   🔴 Os ids das respostas plantadas vao para um arquivo AO LADO da copia
   (`<uid>.respostas.json`), e o --reverter apaga SO ELAS. Assim uma resposta
   que o dono deu de verdade no Banco nunca e apagada por engano. */
async function plantarRespostas(uid) {
  const arq = path.join(PASTA, `${uid}.respostas.json`);
  if (fs.existsSync(arq)) { console.log("  respostas              ja plantadas antes -- nada a fazer"); return; }
  const minutos = {};
  for (const s of await req(`/rest/v1/sessoes_estudo?usuario_id=eq.${uid}&select=materia,segundos`)) {
    minutos[s.materia] = (minutos[s.materia] || 0) + s.segundos / 60;
  }
  const ids = [];
  // Questao que ele ja respondeu de verdade fica de fora: a dele vale, nao a simulada.
  const jaRespondidas = new Set((await req(`/rest/v1/respostas?usuario_id=eq.${uid}&questao_id=not.is.null&select=questao_id`)).map((x) => x.questao_id));
  for (const m of MATERIAS) {
    const banco = (await req(`/rest/v1/rpc/materia_do_banco`, { method: "POST", body: JSON.stringify({ p_nome: m.nome }) }));
    if (!banco) continue;
    const acervo = (await req(`/rest/v1/questoes?materia=eq.${encodeURIComponent(banco)}&publicada=eq.true&select=id&order=id&limit=60`))
      .filter((x) => !jaRespondidas.has(x.id)).slice(0, 30);
    if (acervo.length < 10) continue;                       // sem Banco: o servidor mede so o estudo
    const s = Math.min(1, (minutos[m.nome] || 0) / 600);
    const q = Math.max(0, Math.min(1, (m.progresso - 40 * s) / 60));
    const certas = Math.round(q * acervo.length);
    const linhas = acervo.map((x, i) => ({
      usuario_id: uid, questao_id: x.id, letra: "a", acertou: i < certas,
      vezes_errou: i < certas ? 0 : 1, vezes_acertou: i < certas ? 1 : 0,
    }));
    const feitas = await req("/rest/v1/respostas?select=id", { method: "POST",
      headers: { ...admin, Prefer: "return=representation" }, body: JSON.stringify(linhas) });
    ids.push(...feitas.map((x) => x.id));
    console.log(`  respostas              ${m.nome.padEnd(12)} ${certas} de ${acervo.length} de primeira`);
  }
  fs.writeFileSync(arq, JSON.stringify({ quando: new Date().toISOString(), ids }));
  // Pela chave de servico o gatilho nao recalcula (de proposito); recalcula aqui.
  const prog = (await req(`/rest/v1/progresso?usuario_id=eq.${uid}&select=materias`))[0];
  const medidas = await req("/rest/v1/rpc/dominio_calculado", { method: "POST",
    body: JSON.stringify({ p_uid: uid, p_materias: prog?.materias || [] }) });
  await req(`/rest/v1/progresso?usuario_id=eq.${uid}`, { method: "PATCH",
    headers: { ...admin, Prefer: "return=minimal" }, body: JSON.stringify({ materias: medidas }) });
  console.log(`  dominio medido         ${medidas.map((x) => `${x.nome} ${x.progresso}`).join(", ")}`);
}

/* ── O GUIA DE ESTUDO SIMULADO (29/09/2026) ─────────────────────────────────
   Pedido dele: "gostaria de saber como vai ser uma simulacao dos professores
   (...) mesmo que a gente nao tenha a IA". Sem credito, o guia de verdade nao
   e gerado. Isto poe no lugar dele um guia de DEMONSTRACAO:
   - professores com nome de EXEMPLO, de proposito -- inventar indicacao de
     professor real seria por palavras na boca de gente que existe;
   - dicas de estudo verdadeiras, e materiais gratis REAIS (Khan Academy,
     Brasil Escola, Planalto), que existem e sao abertos;
   - tudo marcado "[Simulação]", e apagado pelo --reverter. */
const MATERIAL = {
  "Português":   [["Gramática — Brasil Escola", "https://brasilescola.uol.com.br/gramatica", "Site", "Teoria de gramática por tópico, com exemplos."]],
  "Matemática":  [["Matemática — Khan Academy", "https://pt.khanacademy.org/math", "Site", "Aulas em vídeo e exercícios, do básico ao ensino médio."]],
  "Física":      [["Física — Khan Academy", "https://pt.khanacademy.org/science/physics", "Site", "Mecânica, eletricidade e ondas, com exercícios."]],
  "Química":     [["Química — Khan Academy", "https://pt.khanacademy.org/science/chemistry", "Site", "Química geral em vídeo e exercício."]],
  "Biologia":    [["Biologia — Khan Academy", "https://pt.khanacademy.org/science/biology", "Site", "Citologia, genética, ecologia e fisiologia."]],
  "Legislação":  [["Legislação federal — Planalto", "https://www.planalto.gov.br/ccivil_03/", "Site", "O texto oficial das leis. É daqui que a prova cobra."]],
  "História":    [["História do Brasil — Brasil Escola", "https://brasilescola.uol.com.br/historiab", "Site", "Da colônia à república, por período."]],
  "Geografia":   [["Geografia — Brasil Escola", "https://brasilescola.uol.com.br/geografia", "Site", "Geografia física e humana do Brasil."]],
  "Informática": [["Computação — Khan Academy", "https://pt.khanacademy.org/computing", "Site", "Fundamentos de computação e internet."]],
};
function guiaDemo(materia) {
  return {
    dica: `[Simulação] Em ${materia}, alterne teoria curta com questões de provas anteriores da mesma banca — é o que mostra o que ela costuma cobrar.`,
    professores: ["A", "B", "C"].map((l, i) => ({
      nome: `Professor(a) de ${materia} — exemplo ${l}`,
      canal: "Canal de demonstração",
      url: "https://www.youtube.com/",
      descricao: i === 0
        ? `Aqui entra um professor real de ${materia}, pesquisado pela IA para o seu edital, e por que ele é bom nesta matéria.`
        : "Exemplo de indicação. Com a IA ligada, o nome, o canal e o motivo são de verdade.",
    })),
    materiais_gratuitos: (MATERIAL[materia] || []).map(([nome, url, tipo, descricao]) => ({ nome, url, tipo, descricao })),
    cursos_pagos: [],
  };
}

// ── O edital simulado ─────────────────────────────────────────────────────
// Materias com os nomes que o banco de questoes usa, para o filtro do Banco
// casar com o edital. Pesos de uma prova de soldado de 100 questoes.
const MATERIAS = [
  { nome: "Português",   peso: 20, progresso: 72 },
  { nome: "Matemática",  peso: 15, progresso: 55 },
  { nome: "Física",      peso: 12, progresso: 38 },
  { nome: "Química",     peso: 10, progresso: 30 },
  { nome: "Biologia",    peso: 10, progresso: 64 },
  { nome: "Legislação",  peso: 10, progresso: 50 },
  { nome: "História",    peso: 8,  progresso: 80 },
  { nome: "Geografia",   peso: 8,  progresso: 45 },
  { nome: "Informática", peso: 7,  progresso: 25 },
].map((m) => ({ ...m, questoes: m.peso }));

const EDITAL = {
  nome: "SIMULAÇÃO — Soldado Bombeiro Militar (teste do dono)",
  materias: MATERIAS.length,
  dataProva: "06/12/2026",
  forca: "bombeiros",
  patenteInicial: "Aluno-Soldado BM",
};

// Sorteio com semente fixa: rodar duas vezes gera a MESMA historia.
let semente = 20260927;
const sorte = () => ((semente = (semente * 1103515245 + 12345) % 2147483648) / 2147483648);

function montarSessoes(uid) {
  const sessoes = [];
  const hoje = new Date();
  const pesoTotal = MATERIAS.reduce((s, m) => s + m.peso, 0);
  const materiaSorteada = () => {
    let x = sorte() * pesoTotal;
    for (const m of MATERIAS) { if ((x -= m.peso) < 0) return m.nome; }
    return MATERIAS[0].nome;
  };
  for (let dia = 60; dia >= 1; dia--) {
    // Os ultimos 14 dias sem falta (ofensiva ativa); antes disso, falta 1 dia em 6.
    if (dia > 14 && sorte() < 0.17) continue;
    const quantas = 1 + Math.floor(sorte() * 3);
    let hora = 18 + Math.floor(sorte() * 3);            // comeca entre 18h e 20h
    for (let k = 0; k < quantas; k++) {
      const minutos = 25 + Math.floor(sorte() * 36);    // 25 a 60 minutos
      const fim = new Date(hoje);
      fim.setDate(fim.getDate() - dia);
      fim.setHours(hora, minutos, 0, 0);
      hora += 1;
      sessoes.push({
        usuario_id: uid, materia: materiaSorteada(), segundos: minutos * 60,
        xp: minutos * 2,                                 // a regra do cronometro.html
        modo: sorte() < 0.5 ? "pomodoro" : "livre",
        criado_em: fim.toISOString(),
      });
    }
  }
  return sessoes;
}

(async () => {
  const perfil = (await req(`/rest/v1/perfis?email=eq.${encodeURIComponent(EMAIL)}&select=id,nome,tipo_plano`))[0];
  if (!perfil) { console.log("Nenhuma conta com esse e-mail -- nada feito."); process.exitCode = 1; return; }
  const uid = perfil.id;
  const arqCopia = path.join(PASTA, `${uid}.json`);
  console.log(`\nSIMULA-EDITAL  conta ${perfil.nome} (${perfil.tipo_plano})\n`);

  // ── REVERTER ────────────────────────────────────────────────────────────
  if (REVERTER) {
    if (!fs.existsSync(arqCopia)) { console.log("Nao ha copia desta conta -- nada a reverter."); process.exitCode = 1; return; }
    const copia = JSON.parse(fs.readFileSync(arqCopia, "utf8"));
    // As respostas plantadas saem pelo id guardado -- nunca as que ele deu de verdade.
    const arqResp = path.join(PASTA, `${uid}.respostas.json`);
    if (fs.existsSync(arqResp)) {
      const { ids } = JSON.parse(fs.readFileSync(arqResp, "utf8"));
      for (let i = 0; i < ids.length; i += 100) {
        await req(`/rest/v1/respostas?id=in.(${ids.slice(i, i + 100).join(",")})`, { method: "DELETE", headers: { ...admin, Prefer: "return=minimal" } });
      }
      fs.renameSync(arqResp, arqResp.replace(/\.json$/, `.revertida-${Date.now()}.json`));
      console.log(`  respostas                ${ids.length} resposta(s) da simulacao removidas`);
    }
    for (const t of TABELAS.filter((t) => t !== "progresso")) {
      const antes = new Set((copia.linhas[t] || []).map((l) => String(l.id ?? JSON.stringify(l))));
      const agora = await req(`/rest/v1/${t}?usuario_id=eq.${uid}&select=*`);
      const novas = agora.filter((l) => !antes.has(String(l.id ?? JSON.stringify(l))));
      for (const l of novas) {
        const filtro = l.id != null ? `id=eq.${l.id}`
          : Object.entries(l).filter(([, v]) => v !== null && typeof v !== "object").map(([k, v]) => `${k}=eq.${encodeURIComponent(v)}`).join("&");
        await req(`/rest/v1/${t}?${filtro}`, { method: "DELETE", headers: { ...admin, Prefer: "return=minimal" } });
      }
      console.log(`  ${t.padEnd(24)} ${novas.length} linha(s) da simulacao removidas`);
    }
    const p = copia.linhas.progresso?.[0];
    if (p) {
      const { usuario_id, criado_em, atualizado_em, ...campos } = p;
      await req(`/rest/v1/progresso?usuario_id=eq.${uid}`, { method: "PATCH",
        headers: { ...admin, Prefer: "return=minimal" }, body: JSON.stringify(campos) });
      console.log("  progresso                progresso de antes restaurado");
    } else {
      await req(`/rest/v1/progresso?usuario_id=eq.${uid}`, { method: "DELETE", headers: { ...admin, Prefer: "return=minimal" } });
      console.log("  progresso                nao existia antes -- removido");
    }
    fs.renameSync(arqCopia, arqCopia.replace(/\.json$/, `.revertida-${Date.now()}.json`));
    console.log("\n✔ conta de volta ao que era. A copia foi mantida, renomeada como revertida.");
    return;
  }

  // ── GUIA DE DEMONSTRACAO (so em conta com a simulacao ativa) ───────────
  if (GUIA) {
    // Sem a copia, o --reverter nao saberia apagar o guia: recusa.
    if (!fs.existsSync(arqCopia)) { console.log("🔴 Aplique a simulacao antes (--aplicar): sem copia, o guia nao teria como ser desfeito."); process.exitCode = 1; return; }
    const prog = (await req(`/rest/v1/progresso?usuario_id=eq.${uid}&select=edital,materias`))[0] || {};
    const concurso = prog.edital?.nome;
    const nomes = (prog.materias || []).map((m) => m.nome).filter(Boolean);
    if (!concurso || !nomes.length) { console.log("A conta nao tem edital com materias."); process.exitCode = 1; return; }
    await req("/rest/v1/recursos_salvos?on_conflict=usuario_id,materia", { method: "POST",
      headers: { ...admin, Prefer: "return=minimal,resolution=merge-duplicates" },
      body: JSON.stringify(nomes.map((materia) => ({ usuario_id: uid, materia, concurso, dados: guiaDemo(materia) }))) });
    const n = (await req(`/rest/v1/recursos_salvos?usuario_id=eq.${uid}&select=materia`)).length;
    console.log(`✔ guia de demonstracao em ${n} materia(s). Sai junto no --reverter.`);
    return;
  }

  // ── RESPOSTAS DO BANCO (so em conta com a simulacao ativa) ─────────────
  if (RESPOSTAS) {
    if (!fs.existsSync(arqCopia)) { console.log("🔴 Aplique a simulacao antes (--aplicar)."); process.exitCode = 1; return; }
    await plantarRespostas(uid);
    return;
  }

  // ── O PLANO ─────────────────────────────────────────────────────────────
  const sessoes = montarSessoes(uid);
  const xp = sessoes.reduce((s, x) => s + x.xp, 0);
  const segundos = sessoes.reduce((s, x) => s + x.segundos, 0);
  const dias = new Set(sessoes.map((s) => s.criado_em.slice(0, 10))).size;
  console.log(`  edital     ${EDITAL.nome}`);
  console.log(`  materias   ${MATERIAS.map((m) => `${m.nome} ${m.peso}%`).join(", ")}`);
  console.log(`  sessoes    ${sessoes.length} em ${dias} dias, ${(segundos / 3600).toFixed(1)} h, ${xp} XP`);

  if (!APLICAR) { console.log("\n  (so mostrando -- use --aplicar)\n"); return; }

  // ── COPIA ANTES DE TUDO ─────────────────────────────────────────────────
  if (fs.existsSync(arqCopia)) {
    console.log("🔴 Ja existe uma copia desta conta: a simulacao ja foi aplicada. Reverta antes de aplicar de novo,");
    console.log("   senao a copia guardaria a SIMULACAO como se fosse o estado original.");
    process.exitCode = 1; return;
  }
  const linhas = {};
  for (const t of TABELAS) linhas[t] = await req(`/rest/v1/${t}?usuario_id=eq.${uid}&select=*`);
  fs.mkdirSync(PASTA, { recursive: true });
  fs.writeFileSync(arqCopia, JSON.stringify({ quando: new Date().toISOString(), uid, linhas }, null, 1));
  console.log(`\n  copia guardada: ${arqCopia}`);
  console.log(`    ${TABELAS.map((t) => `${t}=${linhas[t].length}`).join("  ")}`);

  // ── APLICAR ─────────────────────────────────────────────────────────────
  for (let i = 0; i < sessoes.length; i += 100) {
    await req("/rest/v1/sessoes_estudo", { method: "POST",
      headers: { ...admin, Prefer: "return=minimal" }, body: JSON.stringify(sessoes.slice(i, i + 100)) });
  }
  const velho = linhas.progresso[0] || {};
  const badges = [...new Set([...(velho.badges || []), "primeiro_edital"])];
  const progresso = {
    usuario_id: uid, xp, streak: 14, horas: +(segundos / 3600).toFixed(1),
    edital: EDITAL, materias: MATERIAS.map(({ nome, questoes, peso, progresso }) => ({ nome, questoes, peso, progresso })),
    cronograma_hoje: [], badges,   // 09/10/2026 (3.21): o painel monta o do dia sozinho
  };
  await req("/rest/v1/progresso?on_conflict=usuario_id", { method: "POST",
    headers: { ...admin, Prefer: "return=minimal,resolution=merge-duplicates" }, body: JSON.stringify(progresso) });

  await plantarRespostas(uid);
  const conf = await req(`/rest/v1/sessoes_estudo?usuario_id=eq.${uid}&select=xp`);
  console.log(`\n✔ aplicado: ${conf.length} sessoes na conta, edital "${EDITAL.nome}".`);
  console.log("  Para desfazer: node tools/simula-edital.js --email X --reverter");
})().catch((e) => { console.error("🔴 " + e.message); process.exitCode = 1; return; });
