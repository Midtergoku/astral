// TESTA-HABILIDADES -- a árvore respeita a trava que ele mesmo pôs? (R2)
//
// 🔴 A TRAVA, dita por ele em 18/09: "os ramos mudam COMO se joga, nunca O QUE
// se aprende". Numa árvore de RPG comum uma escolha ruim deixa o personagem
// fraco. Aqui isso seria inaceitável -- ninguém pode estudar PIOR por ter
// gasto um ponto no ramo errado.
//
// Então o teste cobra, entre outras coisas, que NENHUMA habilidade possa
// diminuir o XP de ninguém: todo bônus é positivo, e escolher só pode fazer o
// número subir ou ficar igual.
//
// E cobra as travas de escrita, com credencial válida: pré-requisito, ponto
// disponível e conta alheia são conferidos no SERVIDOR, não na tela.
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
  return { id: c.corpo.id, h: { apikey: PUB, Authorization: `Bearer ${s.access_token}`, "Content-Type": "application/json" } };
}

(async () => {
  let a = null, b = null;
  try {
    a = await criar("hab");
    const sinc = async () => (await req("/rest/v1/rpc/sincronizar_conquistas",
      { method: "POST", headers: a.h, body: "{}" })).corpo;
    const escolher = (id) => req("/rest/v1/rpc/escolher_habilidade",
      { method: "POST", headers: a.h, body: JSON.stringify({ p_id: id }) });
    const esquecer = () => req("/rest/v1/rpc/esquecer_habilidades",
      { method: "POST", headers: a.h, body: "{}" });

    console.log(`\nTESTA-HABILIDADES  usuario ${a.id.slice(0, 8)}\n`);

    // ── 1. O catálogo está lá ───────────────────────────────────────────────
    const cat = (await req("/rest/v1/catalogo_habilidades?select=id,ramo,degrau,bonus&order=ramo,degrau",
      { headers: a.h })).corpo;
    if (Array.isArray(cat) && cat.length === 12) ok("as 12 habilidades existem", "3 ramos × 4 degraus");
    else falha("catálogo errado", `${cat?.length}`);

    // 🔴 A TRAVA DELE: nenhum bônus pode ser negativo ou zero.
    const ruins = (cat || []).filter((h) => Number(h.bonus) <= 0).map((h) => h.id);
    if (!ruins.length) ok("🎯 nenhuma habilidade tira nada", "todo bônus é positivo — ninguém estuda pior");
    else falha("🚨 habilidade com efeito negativo", ruins.join(", "));

    const ramos = [...new Set((cat || []).map((h) => h.ramo))];
    if (ramos.length === 3) ok("os três ramos existem", ramos.join(" · "));
    else falha("ramos errados", ramos.join(", "));

    // ── 2. Conta nova: zero ponto, e escolher é recusado ───────────────────
    await req("/rest/v1/rpc/salvar_progresso", {
      method: "POST", headers: a.h,
      body: JSON.stringify({
        p_xp: 0, p_streak: 0, p_horas: 0, p_edital: { nome: "EEAR 2026" },
        p_materias: [{ nome: "Matemática", peso: 3, progresso: 20 },
                     { nome: "Física", peso: 2, progresso: 5 }],
        p_cronograma_hoje: [], p_badges: [], p_tag_escolhida: null,
      }),
    });
    const zero = await sinc();
    if (zero.pontos === 0) ok("conta nova não tem ponto", "0 pontos");
    else falha("ponto dado a toa", String(zero.pontos));

    const semPonto = await escolher("inf_1");
    if (semPonto.status >= 400) ok("🎯 sem ponto, escolher é recusado", `status ${semPonto.status}`);
    else falha("🚨 escolheu sem ter ponto", JSON.stringify(semPonto.corpo).slice(0, 60));

    // ── 3. Estudar dá pontos ───────────────────────────────────────────────
    // 40 dias seguidos, 60 min, 100 xp cada = 4000 xp base -> 4 pontos
    // (limiares 500, 1200, 2500, 4500 -> passa de 3, falta o 4500).
    const linhas = [];
    for (let d = 0; d < 40; d++) {
      linhas.push({ usuario_id: a.id, materia: d % 4 === 0 ? "Física" : "Matemática",
                    segundos: 3600, xp: 100, modo: "livre", criado_em: haDias(d) });
    }
    await req("/rest/v1/sessoes_estudo", {
      method: "POST", headers: { ...admin, Prefer: "return=minimal" }, body: JSON.stringify(linhas),
    });

    const comXp = await sinc();
    if (comXp.xpBase === 4000) ok("o XP base é a soma crua das sessões", `${comXp.xpBase}`);
    else falha("XP base errado", `${comXp.xpBase} (esperado 4000)`);
    if (comXp.pontos === 3) ok("os pontos vêm das patentes", `${comXp.pontos} pontos com ${comXp.xpBase} XP`);
    else falha("pontos errados", `${comXp.pontos} (esperado 3)`);

    // 🔴 SEM habilidade nenhuma, o XP com bônus é IGUAL ao base.
    if (comXp.xpValidado === comXp.xpBase) ok("sem habilidade, não há bônus", `${comXp.xpValidado}`);
    else falha("bônus aplicado sem habilidade", `${comXp.xpValidado} ≠ ${comXp.xpBase}`);

    // ── 4. 🔴 O PRÉ-REQUISITO É CONFERIDO NO SERVIDOR ──────────────────────
    const pulou = await escolher("inf_3");
    if (pulou.status >= 400) ok("🎯 não dá para pular degrau", `status ${pulou.status}`);
    else falha("🚨 pulou o pré-requisito", JSON.stringify(pulou.corpo).slice(0, 60));

    const primeiro = await escolher("inf_1");
    if (primeiro.status < 400 && primeiro.corpo?.ok) ok("o primeiro degrau é aceito", primeiro.corpo.id);
    else falha("recusou o primeiro degrau", JSON.stringify(primeiro.corpo).slice(0, 60));

    const repetido = await escolher("inf_1");
    if (repetido.status >= 400) ok("não dá para escolher duas vezes", `status ${repetido.status}`);
    else falha("🚨 escolheu a mesma duas vezes");

    // ── 5. 🎯 O BÔNUS APARECE NO XP ────────────────────────────────────────
    // 40 dias seguidos, então todas as sessões estão em dias de sequência ≥ 3
    // (menos as duas primeiras). inf_1 dá +5%.
    const comBonus = await sinc();
    if (comBonus.xpValidado > comBonus.xpBase) {
      ok("🎉 gastar um ponto AUMENTA o XP", `${comBonus.xpBase} -> ${comBonus.xpValidado}`);
    } else {
      falha("o bônus não apareceu", `${comBonus.xpBase} -> ${comBonus.xpValidado}`);
    }

    // ⚠️ E os PONTOS não podem subir junto -- seria a circularidade.
    if (comBonus.pontos === comXp.pontos && comBonus.xpBase === comXp.xpBase) {
      ok("🎯 o bônus NÃO gera mais pontos", "habilidade não compra habilidade");
    } else {
      falha("🚨 circularidade: o bônus virou ponto", `${comXp.pontos} -> ${comBonus.pontos}`);
    }

    // ── 6. Os bônus SOMAM ──────────────────────────────────────────────────
    await escolher("inf_2");                       // +10% para sequência ≥ 7
    const doisNiveis = await sinc();
    if (doisNiveis.xpValidado > comBonus.xpValidado) {
      ok("dois degraus rendem mais que um", `${comBonus.xpValidado} -> ${doisNiveis.xpValidado}`);
    } else {
      falha("o segundo degrau não somou", `${doisNiveis.xpValidado}`);
    }

    // ── 7. Gastar todos e tentar mais um ───────────────────────────────────
    await escolher("art_1");                       // 3º ponto
    const semMais = await escolher("art_2");
    if (semMais.status >= 400) ok("acabaram os pontos, e o servidor recusa", `status ${semMais.status}`);
    else falha("🚨 gastou ponto que não tinha", JSON.stringify(semMais.corpo).slice(0, 60));

    // ── 8. Esquecer devolve tudo ───────────────────────────────────────────
    const esq = await esquecer();
    if (esq.corpo?.esquecidas === 3) ok("esquecer devolve os pontos", `${esq.corpo.esquecidas} habilidades`);
    else falha("esquecer errado", JSON.stringify(esq.corpo));

    const depoisEsq = await sinc();
    if (depoisEsq.gastos === 0 && depoisEsq.xpValidado === depoisEsq.xpBase) {
      ok("depois de esquecer, o XP volta ao base", `${depoisEsq.xpValidado}`);
    } else {
      falha("esquecer não limpou o bônus", `gastos ${depoisEsq.gastos}, xp ${depoisEsq.xpValidado}`);
    }

    // E dá para reescolher em OUTRO ramo -- é a razão de esquecer existir.
    const outroRamo = await escolher("int_1");
    if (outroRamo.status < 400) ok("dá para recomeçar em outro ramo", "explorar não é punido");
    else falha("não deixou reescolher", JSON.stringify(outroRamo.corpo).slice(0, 60));

    // ── 9. 🔴 NINGUÉM ESCREVE NA TABELA ────────────────────────────────────
    const inserir = await req("/rest/v1/habilidades_escolhidas", {
      method: "POST", headers: { ...a.h, Prefer: "return=representation" },
      body: JSON.stringify([{ usuario_id: a.id, habilidade_id: "inf_4" }]),
    });
    if (inserir.status >= 400) ok("🎯 não consegue inserir habilidade na mão", `status ${inserir.status}`);
    else falha("🚨 inseriu habilidade direto na tabela", JSON.stringify(inserir.corpo).slice(0, 60));

    const mexerCatalogo = await req("/rest/v1/catalogo_habilidades?id=eq.inf_1", {
      method: "PATCH", headers: { ...a.h, Prefer: "return=representation" },
      body: JSON.stringify({ bonus: 0.5 }),
    });
    const bonusAgora = (await req("/rest/v1/catalogo_habilidades?id=eq.inf_1&select=bonus", { headers: a.h })).corpo?.[0];
    if (Number(bonusAgora?.bonus) === 0.05) ok("🎯 não consegue turbinar o próprio bônus", `continua ${bonusAgora.bonus}`);
    else falha("🚨 alterou o catálogo", `${bonusAgora?.bonus} (status ${mexerCatalogo.status})`);

    // ── 10. Conta alheia ───────────────────────────────────────────────────
    b = await criar("outro");
    const alheias = (await req(`/rest/v1/habilidades_escolhidas?usuario_id=eq.${a.id}&select=habilidade_id`,
      { headers: b.h })).corpo;
    if (Array.isArray(alheias) && alheias.length === 0) {
      ok("🎯 outro usuário não vê as habilidades alheias", "com credencial válida, lista vazia");
    } else {
      falha("🚨 VAZOU", JSON.stringify(alheias).slice(0, 60));
    }

    const anon = await req("/rest/v1/rpc/escolher_habilidade", {
      method: "POST", headers: { apikey: PUB, "Content-Type": "application/json" },
      body: JSON.stringify({ p_id: "inf_1" }),
    });
    if (anon.status >= 400) ok("sem login não escolhe nada", `status ${anon.status}`);
    else falha("🚨 escolheu sem login", `status ${anon.status}`);

  } finally {
    for (const u of [a, b]) {
      if (u) await req(`/auth/v1/admin/users/${u.id}`, { method: "DELETE", headers: admin });
    }
    console.log("\n  (usuários de teste apagados)");
  }

  console.log("\n" + "=".repeat(72));
  console.log(falhas === 0
    ? "A ÁRVORE FUNCIONA — e nenhuma escolha faz ninguém estudar pior."
    : `🔴 ${falhas} FALHA(S).`);
  process.exit(falhas === 0 ? 0 : 1);
})();
