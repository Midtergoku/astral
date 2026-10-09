/* ═══════════════════════════════════════════════════════════════════════════
   TESTA-ESCADA -- a escada de patentes dura o mesmo em todo edital? a mesma hora
   vale o mesmo XP, cronometrada ou marcada?
   (09/10/2026 -- auditoria GAM-07 + GAM-08, roadmap 3.13; decisoes dele 13, 14, 15)

   A auditoria:
     GAM-07  com o mesmo XP o topo chegava em momentos muito diferentes: edital de
             Soldado (14 degraus) -> Coronel com 70.000 XP (~11 meses); edital de
             Cadete (8 degraus) -> Coronel com 14.000 XP (~10 semanas)
     GAM-08  o bloco de 40 min do cronograma dava "+20 XP"; os mesmos 40 min no
             cronometro, 80

   Confere:
     1. todo edital (forca x patente de entrada) chega ao topo com o MESMO XP (70.000)
     2. a escada completa (14 nomes) ficou IDENTICA -- ninguem nela muda de posto
     3. ninguem desce: ganhar XP nunca baixa o posto (0 a 100.000, de 250 em 250)
     4. a passagem praca -> oficial por XP continua (decisao 15)
     5. 40 min marcados = 40 min cronometrados = 80 XP (tela e servidor)

   USO   node tools/testa-escada.js               (modulos + servidor de producao)
         ASTRAL_DEV=1 node tools/testa-escada.js  (servidor do astral-dev)
         ASTRAL_RAIZ=<pasta> ...                  (modulos de outra copia do site)
   Nao gasta credito. Cria uma conta de teste e apaga no fim.
   ═══════════════════════════════════════════════════════════════════════════ */
const { execSync } = require("child_process");
const crypto = require("crypto");
const path = require("path");
const { pathToFileURL } = require("url");

const NO_DEV = process.env.ASTRAL_DEV === "1";
const REF = NO_DEV ? "vtluuezwfpqgryixaaea" : "jjogmcacbdefwiwcyjxp";
const BASE = `https://${REF}.supabase.co`;
const RAIZ = process.env.ASTRAL_RAIZ ? path.resolve(process.env.ASTRAL_RAIZ) : path.resolve(__dirname, "..");

let falhas = 0;
const ok = (t, d = "") => console.log(`  OK     ${t.padEnd(62)} ${d}`);
const falha = (t, d = "") => { console.log(`  FALHA  ${t.padEnd(62)} ${d}`); falhas++; };

const ENTRADAS = [
  ["exercito", null], ["exercito", "Cadete"], ["exercito", "Aluno-Sargento"], ["exercito", "3º Sargento"],
  ["aeronautica", null], ["aeronautica", "3º Sargento"], ["marinha", "Marinheiro"], ["marinha", null],
  ["pm", "Soldado PM"], ["pm", "Aluno-Oficial"], ["bombeiros", "Aluno-Soldado BM"], ["bombeiros", null], [null, null],
];
// a escada completa ANTES desta mudanca (XP_POR_DEGRAU do degrau 0 ao 13) -- tem de ficar igual
const COMPLETA = [0, 500, 1200, 2500, 4500, 7000, 10000, 14000, 19000, 25000, 32000, 42000, 55000, 70000];

(async () => {
  console.log(`\nTESTA-ESCADA  ${NO_DEV ? "astral-dev" : "producao"}${process.env.ASTRAL_RAIZ ? "  (modulos de " + RAIZ + ")" : ""}\n`);
  const { nivelDe } = await import(pathToFileURL(path.join(RAIZ, "assets/js/divisa.js")).href);
  const { xpDoBloco } = await import(pathToFileURL(path.join(RAIZ, "assets/js/cronograma.js")).href);
  const topoDe = (forca, pat) => { for (let xp = 0; xp <= 200000; xp += 250) { const n = nivelDe(xp, "", forca, pat); if (!n.proximo) return { xp, nome: n.nome, total: n.total }; } return { xp: null }; };

  // 1. o topo no mesmo XP
  console.log("  a escada (GAM-07):");
  const topos = ENTRADAS.map(([f, p]) => ({ f, p, ...topoDe(f, p) }));
  const diferentes = topos.filter((t) => t.xp !== 70000);
  !diferentes.length ? ok("🎯 todo edital chega ao topo com 70.000 XP", `${topos.length} combinações de força e entrada`)
    : falha("o topo depende do edital", diferentes.map((t) => `${t.f || "?"}/${t.p || "-"}: ${t.xp} (${t.total} degraus)`).join("; "));
  const cadete = topos.find((t) => t.p === "Cadete");
  cadete && cadete.xp === 70000 ? ok("🎯 Cadete não chega mais a Coronel em ~10 semanas", `topo com ${cadete.xp} XP (era 14.000)`) : falha("Cadete ainda chega cedo", `${cadete?.xp}`);

  // 2. a escada completa ficou identica
  const completas = ENTRADAS.filter(([f, p]) => nivelDe(0, "", f, p).total === 14);
  let mexeu = [];
  for (const [f, p] of completas) {
    for (let i = 0; i < COMPLETA.length; i++) {
      const antes = nivelDe(COMPLETA[i] - 1, "", f, p).indice, em = nivelDe(COMPLETA[i], "", f, p).indice;
      if (em !== i || (i > 0 && antes !== i - 1)) mexeu.push(`${f}/${p || "-"} degrau ${i}`);
    }
  }
  !mexeu.length ? ok("🎯 a escada completa (14 nomes) ficou IDÊNTICA", `${completas.length} escadas, ninguém muda de posto`) : falha("a escada completa mudou", mexeu.slice(0, 4).join("; "));

  // 3. ninguem desce
  const desce = [];
  for (const [f, p] of ENTRADAS) {
    let antes = -1;
    for (let xp = 0; xp <= 100000; xp += 250) { const i = nivelDe(xp, "", f, p).indice; if (i < antes) { desce.push(`${f}/${p || "-"} em ${xp}`); break; } antes = i; }
  }
  !desce.length ? ok("ganhar XP nunca baixa o posto", "0 a 100.000 XP") : falha("o posto desce ganhando XP", desce.join("; "));

  // 4. praca -> oficial por XP continua (decisao 15)
  const ex = nivelDe(40000, "", "exercito", null).nome;
  /Tenente|Capit|Aspirante/.test(ex) ? ok("a passagem praça → oficial por XP continua", `40.000 XP = ${ex}`) : falha("a passagem praca -> oficial mudou", ex);

  // 5. a mesma hora, o mesmo XP
  console.log("\n  o XP (GAM-08):");
  xpDoBloco(40) === 80 ? ok("🎯 a tela: o bloco de 40 min vale 80 XP", `xpDoBloco(40) = ${xpDoBloco(40)} (era 20)`) : falha("o bloco de 40 min nao vale 80", String(xpDoBloco(40)));

  const SK = JSON.parse(execSync(`supabase projects api-keys --project-ref ${REF} -o json`, { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] })).find((k) => k.name === "service_role").api_key;
  const admin = { apikey: SK, Authorization: `Bearer ${SK}`, "Content-Type": "application/json" };
  const req = async (c, o = {}) => { const r = await fetch(BASE + c, o); const t = await r.text(); let corpo = null; try { corpo = JSON.parse(t); } catch { corpo = t; } return { status: r.status, corpo }; };
  let uid = null;
  try {
    // Pela CONTA DO ALUNO, como o site grava (a chave de servico guarda o XP que se manda --
    // e assim que os testes plantam historico -- e nao provaria nada).
    const email = `escada-${Date.now()}@astral-teste.local`;
    uid = (await req("/auth/v1/admin/users", { method: "POST", headers: admin, body: JSON.stringify({ email, password: "T!" + crypto.randomUUID(), email_confirm: true }) })).corpo.id;
    const chaves = JSON.parse(execSync(`supabase projects api-keys --project-ref ${REF} -o json`, { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }));
    const PUB = NO_DEV ? (chaves.find((k) => k.type === "publishable") || chaves.find((k) => k.name === "anon")).api_key
      : (require("fs").readFileSync(path.join(RAIZ, "assets/js/astral.js"), "utf8").match(/sb_publishable_[A-Za-z0-9_-]+/) || [])[0];
    const link = await req("/auth/v1/admin/generate_link", { method: "POST", headers: admin, body: JSON.stringify({ type: "magiclink", email }) });
    const tok = (await req("/auth/v1/verify", { method: "POST", headers: { apikey: PUB, "Content-Type": "application/json" }, body: JSON.stringify({ type: "magiclink", token_hash: link.corpo.hashed_token }) })).corpo.access_token;
    const p = await req("/rest/v1/sessoes_estudo?select=modo,xp,segundos", { method: "POST", headers: { apikey: PUB, Authorization: `Bearer ${tok}`, "Content-Type": "application/json", Prefer: "return=representation" },
      body: JSON.stringify({ usuario_id: uid, materia: "Português", segundos: 2400, xp: 9999, modo: "cronograma" }) });
    const s = Array.isArray(p.corpo) ? p.corpo[0] : null;
    // o cronometro ja pagava 2 por minuto inteiro (floor(segundos/60)*2): 40 min = 80
    s && s.xp === 80 ? ok("🎯 o servidor: 40 min MARCADOS valem 80 — o mesmo do cronômetro", `gravado ${s.xp} XP (mandei 9999)`)
      : falha("o servidor paga o marcado diferente do cronometrado", JSON.stringify(p.corpo).slice(0, 140));
  } catch (e) {
    falha("o teste quebrou", String(e.message || e).slice(0, 140));
  } finally {
    if (uid) await req(`/auth/v1/admin/users/${uid}`, { method: "DELETE", headers: admin });
  }
  console.log("\n" + "=".repeat(70));
  console.log(falhas === 0 ? "A ESCADA DURA O MESMO EM TODO EDITAL — E A MESMA HORA VALE O MESMO XP." : `🔴 ${falhas} FALHA(S).`);
  process.exit(falhas ? 1 : 0);
})();
