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

const REF = "jjogmcacbdefwiwcyjxp";
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
const TABELAS = ["progresso", "sessoes_estudo", "eventos", "conquistas", "habilidades_escolhidas"];

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

  // ── O PLANO ─────────────────────────────────────────────────────────────
  const { montarCronograma } = await import(url.pathToFileURL(path.join(RAIZ, "assets/js/plano.js")).href);
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
    cronograma_hoje: montarCronograma(MATERIAS), badges,
  };
  await req("/rest/v1/progresso?on_conflict=usuario_id", { method: "POST",
    headers: { ...admin, Prefer: "return=minimal,resolution=merge-duplicates" }, body: JSON.stringify(progresso) });

  const conf = await req(`/rest/v1/sessoes_estudo?usuario_id=eq.${uid}&select=xp`);
  console.log(`\n✔ aplicado: ${conf.length} sessoes na conta, edital "${EDITAL.nome}".`);
  console.log("  Para desfazer: node tools/simula-edital.js --email X --reverter");
})().catch((e) => { console.error("🔴 " + e.message); process.exitCode = 1; return; });
