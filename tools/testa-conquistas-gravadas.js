// TESTA-CONQUISTAS-GRAVADAS -- o servidor grava, e só ele?
//
// Guarda as três decisões dele de 20/09/2026:
//
//   1. GRAVAR quando cai (não recalcular)  -> a conquista sobrevive à troca
//      de concurso, que era o defeito medido em 19/09
//   2. "o servidor vai gravar, NÃO QUERO NINGUÉM ALTERANDO ISSO A NÃO SER NÓS"
//      -> ninguém escreve na tabela, nem com credencial válida
//   3. o XP validado no mesmo lugar
//
// 🔴 A CHECAGEM MAIS IMPORTANTE É A 2, e ela precisa ser feita COM CREDENCIAL
// VÁLIDA. O `CLAUDE.md` registra o dia em que um teste de invasão deu "tudo
// bloqueado" e nem estava autenticando -- resultado negativo em segurança não
// vale nada sem prova de que o ataque foi tentado de verdade.
const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const REF = "jjogmcacbdefwiwcyjxp";
const BASE = `https://${REF}.supabase.co`;
const RAIZ = path.resolve(__dirname, "..");

const chaves = JSON.parse(execSync(`supabase projects api-keys --project-ref ${REF} -o json`, {
  encoding: "utf8", stdio: ["ignore", "pipe", "ignore"],
}));
const SERVICE = chaves.find((k) => k.name === "service_role").api_key;
const PUB = (fs.readFileSync(path.join(RAIZ, "assets/js/astral.js"), "utf8")
  .match(/sb_publishable_[A-Za-z0-9_-]+/) || [])[0];

let falhas = 0;
const ok = (t, d = "") => console.log(`  OK     ${t.padEnd(48)} ${d}`);
const falha = (t, d = "") => { console.log(`  FALHA  ${t.padEnd(48)} ${d}`); falhas++; };

async function req(caminho, opts) {
  const r = await fetch(`${BASE}${caminho}`, opts);
  let corpo = null;
  try { corpo = await r.json(); } catch { /* sem corpo */ }
  return { status: r.status, corpo };
}
const admin = { apikey: SERVICE, Authorization: `Bearer ${SERVICE}`, "Content-Type": "application/json" };
const haDias = (n) => new Date(Date.now() - n * 86400000).toISOString();

async function criar(prefixo) {
  const email = `${prefixo}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}@astral-teste.local`;
  const c = await req("/auth/v1/admin/users", {
    method: "POST", headers: admin,
    body: JSON.stringify({ email, password: "T!" + crypto.randomUUID(), email_confirm: true }),
  });
  const link = await req("/auth/v1/admin/generate_link", {
    method: "POST", headers: admin, body: JSON.stringify({ type: "magiclink", email }),
  });
  const s = (await req("/auth/v1/verify", {
    method: "POST", headers: { apikey: PUB, "Content-Type": "application/json" },
    body: JSON.stringify({ type: "magiclink", token_hash: link.corpo?.hashed_token }),
  })).corpo;
  return {
    id: c.corpo.id, email,
    h: { apikey: PUB, Authorization: `Bearer ${s.access_token}`, "Content-Type": "application/json" },
  };
}

(async () => {
  let a = null, b = null;
  try {
    a = await criar("grav");
    console.log(`\nTESTA-CONQUISTAS-GRAVADAS  usuario ${a.id.slice(0, 8)}\n`);

    const sinc = () => req("/rest/v1/rpc/sincronizar_conquistas", { method: "POST", headers: a.h, body: "{}" });
    const lidas = async () => (await req(
      `/rest/v1/conquistas?usuario_id=eq.${a.id}&select=tipo,item_id`, { headers: a.h })).corpo;

    // ── 1. Conta nova: sincroniza e não ganha nada ──────────────────────────
    const vazio = (await sinc()).corpo;
    if (Array.isArray(vazio?.condecoracoes) && vazio.condecoracoes.length === 0) {
      ok("conta nova não ganha nada", "sincronizar não inventa conquista");
    } else {
      falha("conquista concedida a toa", JSON.stringify(vazio?.condecoracoes || []).slice(0, 70));
    }

    // ── 2. Estudar de verdade grava ─────────────────────────────────────────
    const linhas = [];
    for (let d = 0; d < 20; d++) {
      linhas.push({ usuario_id: a.id, materia: ["Matemática", "Física", "Português"][d % 3],
                    segundos: 3600, xp: 30, modo: "livre", criado_em: haDias(d) });
    }
    await req("/rest/v1/sessoes_estudo", {
      method: "POST", headers: { ...admin, Prefer: "return=minimal" }, body: JSON.stringify(linhas),
    });
    await req("/rest/v1/rpc/salvar_progresso", {
      method: "POST", headers: a.h,
      body: JSON.stringify({
        p_xp: 3000, p_streak: 20, p_horas: 20, p_edital: { nome: "EEAR 2026" },
        p_materias: [
          { nome: "Matemática", peso: 3, progresso: 85 },
          { nome: "Física", peso: 3, progresso: 80 },
          { nome: "Português", peso: 2, progresso: 75 },
        ],
        p_cronograma_hoje: [], p_badges: [], p_tag_escolhida: null,
      }),
    });

    const cheio = (await sinc()).corpo;
    const antes = cheio.condecoracoes.length;
    if (antes > 10) ok("estudar de verdade grava conquistas", `${antes} condecorações`);
    else falha("gravou de menos", `${antes}`);

    if (cheio.divisas.length > 0) ok("as divisas também são gravadas", `${cheio.divisas.length}`);
    else falha("nenhuma divisa gravada");

    // ── 3. O XP validado, no mesmo lugar ────────────────────────────────────
    // 20 sessões × 30 xp = 600. O `xp` informado pelo navegador era 3000.
    if (cheio.xpValidado === 600) ok("🎯 o XP validado é o das sessões", `${cheio.xpValidado} (o navegador dizia 3000)`);
    else falha("XP validado errado", `${cheio.xpValidado} (esperado 600)`);

    const prog = (await req(`/rest/v1/progresso?usuario_id=eq.${a.id}&select=xp,xp_validado`, { headers: a.h })).corpo?.[0];
    if (prog?.xp_validado === 600) ok("gravado na mesma linha do progresso", `xp=${prog.xp} · xp_validado=${prog.xp_validado}`);
    else falha("xp_validado não foi gravado", JSON.stringify(prog));

    // ── 4. Sincronizar de novo não duplica ──────────────────────────────────
    const denovo = (await sinc()).corpo;
    if (denovo.condecoracoes.length === antes && denovo.novas.length === 0) {
      ok("sincronizar duas vezes não duplica", `${denovo.condecoracoes.length}, 0 novas`);
    } else {
      falha("duplicou ao repetir", `${antes} -> ${denovo.condecoracoes.length}, ${denovo.novas.length} novas`);
    }

    // ── 5. 🔴 A TROCA DE CONCURSO — o defeito que isto conserta ─────────────
    await req("/rest/v1/rpc/salvar_progresso", {
      method: "POST", headers: a.h,
      body: JSON.stringify({
        p_xp: 3000, p_streak: 20, p_horas: 20, p_edital: { nome: "ESA 2027" },
        p_materias: [
          { nome: "Matemática", peso: 3, progresso: 0 },
          { nome: "História", peso: 2, progresso: 0 },
          { nome: "Geografia", peso: 2, progresso: 0 },
        ],
        p_cronograma_hoje: [], p_badges: [], p_tag_escolhida: null,
      }),
    });
    const depoisTroca = (await sinc()).corpo;
    if (depoisTroca.condecoracoes.length >= antes) {
      ok("🎯 TROCAR DE CONCURSO NÃO APAGA NADA", `${antes} -> ${depoisTroca.condecoracoes.length}`);
    } else {
      falha("🔴 ainda perde ao trocar de concurso", `${antes} -> ${depoisTroca.condecoracoes.length}`);
    }

    const guardadas = await lidas();
    const temDominio = guardadas.some((g) => ["dois_dominios", "primeiro_dominio", "meio_caminho"].includes(g.item_id));
    if (temDominio) ok("as de domínio continuam gravadas", "eram justamente as que sumiam");
    else falha("as conquistas de domínio sumiram", guardadas.map((g) => g.item_id).join(", ").slice(0, 60));

    // ── 6. 🔴 NINGUÉM ESCREVE, NEM COM LOGIN VÁLIDO ─────────────────────────
    const inventar = await req("/rest/v1/conquistas", {
      method: "POST", headers: { ...a.h, Prefer: "return=representation" },
      body: JSON.stringify([{ usuario_id: a.id, tipo: "condecoracao", item_id: "platina" }]),
    });
    if (inventar.status >= 400) ok("🎯 não consegue INSERIR conquista", `status ${inventar.status}`);
    else falha("🚨 conseguiu inventar uma conquista", JSON.stringify(inventar.corpo).slice(0, 70));

    const apagar = await req(`/rest/v1/conquistas?usuario_id=eq.${a.id}&item_id=eq.alistamento`, {
      method: "DELETE", headers: a.h,
    });
    const aindaTem = (await lidas()).some((g) => g.item_id === "alistamento");
    if (aindaTem) ok("não consegue APAGAR conquista", `status ${apagar.status}, a linha ficou`);
    else falha("🚨 conseguiu apagar uma conquista", `status ${apagar.status}`);

    const mexerXp = await req(`/rest/v1/progresso?usuario_id=eq.${a.id}`, {
      method: "PATCH", headers: { ...a.h, Prefer: "return=representation" },
      body: JSON.stringify({ xp_validado: 999999 }),
    });
    const xpDepois = (await req(`/rest/v1/progresso?usuario_id=eq.${a.id}&select=xp_validado`, { headers: a.h })).corpo?.[0];
    if (xpDepois?.xp_validado === 600) ok("🎯 não consegue forjar o XP validado", `continua ${xpDepois.xp_validado}`);
    else falha("🚨 forjou o XP validado", `${xpDepois?.xp_validado} (status ${mexerXp.status})`);

    // ── 7. 🔴 NÃO ALCANÇA A CONTA DE OUTRO ──────────────────────────────────
    b = await criar("bisbi");
    const alheias = (await req(`/rest/v1/conquistas?usuario_id=eq.${a.id}&select=item_id`, { headers: b.h })).corpo;
    if (Array.isArray(alheias) && alheias.length === 0) {
      ok("🎯 outro usuário não vê as conquistas alheias", "com credencial válida, lista vazia");
    } else {
      falha("🚨 VAZOU conquista para outro usuário", JSON.stringify(alheias).slice(0, 70));
    }

    // E sincronizar como B não pode gravar nada na conta de A.
    await req("/rest/v1/rpc/sincronizar_conquistas", { method: "POST", headers: b.h, body: "{}" });
    const deA = await lidas();
    const deB = (await req(`/rest/v1/conquistas?usuario_id=eq.${b.id}&select=item_id`, { headers: b.h })).corpo;
    if (deB.length === 0 && deA.length > 0) ok("sincronizar só mexe na própria conta", `A ${deA.length} · B ${deB.length}`);
    else falha("a sincronia cruzou contas", `A ${deA.length} · B ${deB.length}`);

    // ── 8. Deslogado não faz nada ───────────────────────────────────────────
    const anon = await req("/rest/v1/rpc/sincronizar_conquistas", {
      method: "POST", headers: { apikey: PUB, "Content-Type": "application/json" }, body: "{}",
    });
    if (anon.status >= 400) ok("sem login a sincronia recusa", `status ${anon.status}`);
    else falha("🚨 sincronizou sem login", `status ${anon.status}`);

  } finally {
    for (const u of [a, b]) {
      if (u) await req(`/auth/v1/admin/users/${u.id}`, { method: "DELETE", headers: admin });
    }
    console.log("\n  (usuários de teste apagados)");
  }

  console.log("\n" + "=".repeat(72));
  console.log(falhas === 0
    ? "O SERVIDOR GRAVA, E SÓ ELE — e conquista não se desconquista mais."
    : `🔴 ${falhas} FALHA(S).`);
  process.exit(falhas === 0 ? 0 : 1);
})();
