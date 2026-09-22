// ARRUMA-ACERVO -- tira do ar o que nao passa na barra de qualidade.
//
//   node tools/arruma-acervo.js             so mede
//   node tools/arruma-acervo.js --aplicar   tira do ar
//
// 🔴 NAO APAGA NADA. Marca `publicada = false` e escreve o motivo em `revisao`.
// Apagar linha do banco e decisao do Lucas (regra 8.1 do CLAUDE.md); tirar do
// ar e reversivel com um PATCH, e alcanca o mesmo resultado para quem estuda.
//
// ── POR QUE ELE PRECISA EXISTIR ─────────────────────────────────────────────
// A importacao tira as repetidas DENTRO do lote que esta importando. Mas o
// acervo vive entre importacoes: uma prova que entrou ontem pode repetir uma
// que entrou hoje, com numero e nome diferentes, e nenhuma das duas rodadas
// veria a outra. Medido em 22/09: 6 grupos repetidos sobraram assim.
//
// Regra de desempate quando ha copias: fica a de MENOR id -- a que chegou
// primeiro. Arbitraria, mas estavel: rodar duas vezes da o mesmo resultado.
const { execSync } = require("child_process");

const REF = "jjogmcacbdefwiwcyjxp";
const BASE = `https://${REF}.supabase.co`;
const APLICAR = process.argv.includes("--aplicar");

const chaves = JSON.parse(execSync(`supabase projects api-keys --project-ref ${REF} -o json`,
  { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }));
const SK = chaves.find((k) => k.name === "service_role").api_key;
const admin = { apikey: SK, Authorization: `Bearer ${SK}`, "Content-Type": "application/json" };

const chaveDe = (q) => String(q.enunciado).toLowerCase().replace(/\s+/g, " ").trim()
  + "|" + Object.values(q.alternativas || {}).join("|").toLowerCase().replace(/\s+/g, " ");

(async () => {
  const { NOMES_DE_MATERIA } = await import("../assets/js/prova.js");
  const validas = new Set(NOMES_DE_MATERIA);

  const todas = [];
  for (let off = 0; off < 60000; off += 1000) {
    const r = await fetch(
      `${BASE}/rest/v1/questoes?select=id,prova,numero,materia,enunciado,alternativas,gabarito&publicada=is.true&limit=1000&offset=${off}`,
      { headers: admin });
    const p = await r.json();
    if (!Array.isArray(p)) { console.log("🔴 nao consegui ler:", JSON.stringify(p).slice(0, 120)); process.exit(1); }
    todas.push(...p);
    if (p.length < 1000) break;
  }
  console.log(`\nARRUMA-ACERVO  ${todas.length} questoes no ar\n`);

  const tirar = new Map();   // id -> motivo
  const marcar = (q, motivo) => { if (!tirar.has(q.id)) tirar.set(q.id, motivo); };

  for (const q of todas) {
    const e = String(q.enunciado || "").trim();
    if (e.split(/\s+/).length < 3 || e.length < 15) marcar(q, "truncada");
    else if (!q.materia || !validas.has(q.materia)) marcar(q, "materia desconhecida");
    else if (Object.keys(q.alternativas || {}).length < 4) marcar(q, "poucas alternativas");
    else if (Object.values(q.alternativas).some((t) => !String(t).trim())) marcar(q, "alternativa vazia");
    else if (!q.gabarito || !q.alternativas[q.gabarito]) marcar(q, "sem resposta certa");
  }

  // Repetidas: fica a de menor id.
  const por = new Map();
  for (const q of todas) {
    if (tirar.has(q.id)) continue;
    const c = chaveDe(q);
    if (!por.has(c)) por.set(c, []);
    por.get(c).push(q);
  }
  let gruposRepetidos = 0;
  for (const grupo of por.values()) {
    if (grupo.length < 2) continue;
    gruposRepetidos++;
    grupo.sort((a, b) => a.id - b.id);
    for (const q of grupo.slice(1)) marcar(q, "repetida");
  }

  const porMotivo = {};
  for (const m of tirar.values()) porMotivo[m] = (porMotivo[m] || 0) + 1;
  console.log(`  para tirar do ar: ${tirar.size}`);
  for (const [m, n] of Object.entries(porMotivo).sort((a, b) => b[1] - a[1])) {
    console.log(`     ${m.padEnd(22)} ${n}`);
  }
  console.log(`  grupos repetidos: ${gruposRepetidos}`);

  if (!tirar.size) { console.log("\n  o acervo ja esta limpo.\n"); return; }
  if (!APLICAR) { console.log("\n  (so medindo -- use --aplicar)\n"); return; }

  let feitas = 0;
  for (const [id, motivo] of tirar) {
    const r = await fetch(`${BASE}/rest/v1/questoes?id=eq.${id}`, {
      method: "PATCH", headers: { ...admin, Prefer: "return=minimal" },
      body: JSON.stringify({ publicada: false, revisao: motivo }),
    });
    if (r.ok) feitas++;
  }
  const c = await fetch(`${BASE}/rest/v1/questoes?select=id&publicada=is.true`,
    { headers: { ...admin, Prefer: "count=exact", Range: "0-0" } });
  console.log(`\n  ${feitas} tiradas do ar (nao apagadas).`);
  console.log(`  ✔ o acervo tem ${(c.headers.get("content-range") || "").split("/")[1]} questoes no ar.\n`);
})();
