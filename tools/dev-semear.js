// DEV-SEMEAR (04/10/2026, veio do rascunho da sessao): recria no astral-dev as 8 contas da auditoria
// (f3-*, com historicos conhecidos, ex.: madrugada). Rodar depois da bateria, depois do dev-acervo.js.
// FASE 3 -- os 8 usuarios da secao 13, no DEV, com historicos conhecidos.
// Sessoes gravadas pela chave de servico (o gatilho deixa a data no passado e o XP dado),
// sempre com o XP pela regra do cronometro (2/min) -- o mesmo que o servidor daria.
const { execSync } = require("child_process");
const crypto = require("crypto");
const fs = require("fs");
const DEV = "vtluuezwfpqgryixaaea";
const BASE = `https://${DEV}.supabase.co`;
const ch = JSON.parse(execSync(`supabase projects api-keys --project-ref ${DEV} -o json`, { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }));
const SK = ch.find((k) => k.name === "service_role").api_key;
const PUB = (ch.find((k) => k.type === "publishable") || ch.find((k) => k.name === "anon")).api_key;
const admin = { apikey: SK, Authorization: `Bearer ${SK}`, "Content-Type": "application/json" };
const req = async (c, o = {}) => { const r = await fetch(BASE + c, o); const t = await r.text(); let corpo = null; try { corpo = JSON.parse(t); } catch { corpo = t; } return { status: r.status, corpo }; };

// "Hoje" no fuso de Sao Paulo, e um instante SP -> ISO UTC.
const hojeSP = new Date(Date.now() - 3 * 3600e3).toISOString().slice(0, 10);
const diaSP = (delta) => { const d = new Date(hojeSP + "T12:00:00Z"); d.setUTCDate(d.getUTCDate() + delta); return d.toISOString().slice(0, 10); };
const instante = (delta, hhmm) => new Date(`${diaSP(delta)}T${hhmm}:00-03:00`).toISOString();

const BOMBEIROS = [
  { nome: "Português", peso: 20, questoes: 20 }, { nome: "Matemática", peso: 15, questoes: 15 },
  { nome: "Física", peso: 12, questoes: 12 }, { nome: "Química", peso: 10, questoes: 10 },
  { nome: "Biologia", peso: 10, questoes: 10 }, { nome: "Legislação", peso: 10, questoes: 10 },
  { nome: "História", peso: 8, questoes: 8 }, { nome: "Geografia", peso: 8, questoes: 8 },
  { nome: "Informática", peso: 7, questoes: 7 },
].map((m) => ({ ...m, progresso: 0 }));
const EEAR = [
  { nome: "Português", peso: 25, questoes: 24 }, { nome: "Matemática", peso: 25, questoes: 24 },
  { nome: "Física", peso: 25, questoes: 24 }, { nome: "Inglês", peso: 25, questoes: 24 },
].map((m) => ({ ...m, progresso: 0 }));
const ED_BM = { nome: "TESTE CBM Soldado 2026", forca: "bombeiros", patenteInicial: null, dataProva: "06/12/2026" };
const ED_EEAR = { nome: "TESTE EEAR CFS 2027", forca: "aeronautica", patenteInicial: null, dataProva: "20/03/2027" };
const ROTINA = { dias: [1, 2, 3, 4, 5, 6], minutosUtil: 120, minutosFds: 120, bloco: 40, respondidoEm: new Date().toISOString() };

const sess = (uid, delta, fimHHMM, minutos, materia, modo = "pomodoro") =>
  ({ usuario_id: uid, materia, segundos: minutos * 60, xp: minutos * 2, modo, criado_em: instante(delta, fimHHMM) });

const PLANOS = {
  novo: { edital: null },
  constante: { edital: ED_BM, materias: BOMBEIROS, sessoes: (uid) => {
    const s = []; let k = 0;
    for (let d = -44; d <= 0; d++) for (const h of ["08:00", "08:45", "09:30"]) s.push(sess(uid, d, h, 40, BOMBEIROS[k++ % 9].nome));
    return s; }, respostas: [["Português", 30, 24], ["Matemática", 30, 15]] },
  quebrou: { edital: ED_BM, materias: BOMBEIROS, sessoes: (uid) => {
    const s = []; let k = 0;
    for (let d = -35; d <= -4; d++) s.push(sess(uid, d, "20:00", 60, BOMBEIROS[k++ % 9].nome));
    for (const d of [-2, -1]) s.push(sess(uid, d, "20:00", 60, BOMBEIROS[k++ % 9].nome));
    return s; } },
  sumido: { edital: ED_BM, materias: BOMBEIROS, sessoes: (uid) => {
    const s = []; let k = 0;
    for (let d = -34; d <= -15; d++) s.push(sess(uid, d, "20:00", 60, BOMBEIROS[k++ % 9].nome));
    return s; } },
  desequilibrado: { edital: ED_BM, materias: BOMBEIROS, sessoes: (uid) => {
    const s = [];
    for (let d = -19; d <= 0; d++) { s.push(sess(uid, d, "08:00", 60, "Português")); s.push(sess(uid, d, "09:30", 60, "Matemática")); }
    return s; }, respostas: [["Português", 30, 30]] },
  fim_de_trial: { edital: ED_BM, materias: BOMBEIROS, sessoes: (uid) => [sess(uid, -1, "20:00", 30, "Português")] },
  trocou_edital: { edital: ED_BM, materias: BOMBEIROS, troca: { edital: ED_EEAR, materias: EEAR }, sessoes: (uid) => {
    const s = []; let k = 0;
    for (let d = -40; d <= -11; d++) s.push(sess(uid, d, "20:00", 60, BOMBEIROS[k++ % 9].nome));
    return s; } },
  madrugada: { edital: ED_BM, materias: BOMBEIROS, sessoes: (uid) => {
    const s = [];
    // 10 noites: uma sessao 23:10->23:50 e outra 23:50->00:40 (termina no dia seguinte)
    for (let d = -10; d <= -1; d++) { s.push(sess(uid, d, "23:50", 40, "Física", "livre")); s.push(sess(uid, d + 1, "00:40", 50, "Química", "livre")); }
    return s; } },
};

(async () => {
  // recomeca do zero: apaga os f3-* anteriores (so no DEV)
  const velhos = (await req("/auth/v1/admin/users?per_page=1000", { headers: admin })).corpo.users.filter((u) => u.email.startsWith("f3-"));
  for (const u of velhos) await req(`/auth/v1/admin/users/${u.id}`, { method: "DELETE", headers: admin });
  console.log("apagados:", velhos.length);
  const usuarios = {};
  const qs = {};
  for (const [nome, p] of Object.entries(PLANOS)) {
    const email = `f3-${nome.replace(/_/g, "-")}-${Date.now()}@astral-teste.local`;
    const c = await req("/auth/v1/admin/users", { method: "POST", headers: admin, body: JSON.stringify({ email, password: "T!" + crypto.randomUUID(), email_confirm: true, user_metadata: { full_name: "Teste " + nome } }) });
    const uid = c.corpo.id;
    const link = await req("/auth/v1/admin/generate_link", { method: "POST", headers: admin, body: JSON.stringify({ type: "magiclink", email }) });
    const s = (await req("/auth/v1/verify", { method: "POST", headers: { apikey: PUB, "Content-Type": "application/json" }, body: JSON.stringify({ type: "magiclink", token_hash: link.corpo.hashed_token }) })).corpo;
    const cab = { apikey: PUB, Authorization: `Bearer ${s.access_token}`, "Content-Type": "application/json" };
    usuarios[nome] = { uid, email, sessao: s };
    if (!p.edital) { console.log(nome, "criado (sem nada)"); continue; }
    const sessoes = p.sessoes(uid);
    for (let i = 0; i < sessoes.length; i += 100) {
      const r = await req("/rest/v1/sessoes_estudo", { method: "POST", headers: { ...admin, Prefer: "return=minimal" }, body: JSON.stringify(sessoes.slice(i, i + 100)) });
      if (r.status >= 300) console.log("sessoes", nome, r.status, JSON.stringify(r.corpo).slice(0, 120));
    }
    for (const [mat, n, certas] of p.respostas || []) {
      qs[mat] ||= (await req(`/rest/v1/questoes?materia=eq.${encodeURIComponent(mat)}&publicada=eq.true&select=id&order=id&limit=40`, { headers: admin })).corpo;
      const linhas = qs[mat].slice(0, n).map((q, i) => ({ usuario_id: uid, questao_id: q.id, letra: "a", acertou: i < certas, vezes_errou: i < certas ? 0 : 1, vezes_acertou: i < certas ? 1 : 0 }));
      const rr = await req("/rest/v1/respostas", { method: "POST", headers: { ...admin, Prefer: "return=minimal" }, body: JSON.stringify(linhas) });
      if (rr.status >= 300 || !linhas.length) console.log("  respostas", nome, mat, rr.status, linhas.length, JSON.stringify(rr.corpo).slice(0, 160));
    }
    // Como o painel faria: o ALUNO grava o progresso (o servidor recalcula XP, horas, sequencia, dominio).
    const salvar = (edital, materias) => req("/rest/v1/rpc/salvar_progresso", { method: "POST", headers: cab, body: JSON.stringify({ p_xp: 0, p_streak: 0, p_horas: 0, p_edital: edital, p_materias: materias, p_cronograma_hoje: [], p_badges: [], p_tag_escolhida: null }) });
    const gravou = await salvar(p.edital, p.materias);
    if (gravou.status >= 300) console.log("  salvar_progresso", nome, gravou.status, JSON.stringify(gravou.corpo).slice(0, 200));
    await req(`/rest/v1/progresso?usuario_id=eq.${uid}`, { method: "PATCH", headers: { ...admin, Prefer: "return=minimal" }, body: JSON.stringify({ rotina: ROTINA }) });
    await req("/rest/v1/rpc/sincronizar_conquistas", { method: "POST", headers: cab, body: "{}" });
    if (p.troca) { await salvar(p.troca.edital, p.troca.materias); await req("/rest/v1/rpc/sincronizar_conquistas", { method: "POST", headers: cab, body: "{}" }); }
    console.log(nome, "criado:", sessoes.length, "sessões", (p.respostas || []).map((r) => `${r[0]} ${r[2]}/${r[1]}`).join(" "));
  }
  fs.writeFileSync(process.env.TEMP + "/f3-usuarios.json", JSON.stringify({ hojeSP, usuarios }, null, 1));
  console.log("hoje (SP):", hojeSP);
})();
