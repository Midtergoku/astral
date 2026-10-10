/* ═══════════════════════════════════════════════════════════════════════════
   TESTA-NUMEROS-MENORES -- os quatro numeros pequenos que confundiam
   (09/10/2026 -- auditoria NUM-08, NUM-11, NUM-12, NUM-13; roadmap 3.20)

     NUM-08  a Doutrina (ficha) e a "Doutrina Consolidada" usam a media
             PONDERADA pelo peso -- a mesma do Progresso. Era a simples
             (49% na ficha x 55% no Progresso, para a mesma pessoa)
     NUM-11  estudou ha 30 E ha 3 dias: a revisao diz os dois, nao "ha 30 dias"
             (a parte da frase mora no testa-revisao; aqui so a tela usa)
     NUM-12  o grafico dos ultimos 7 dias: 7 rotulos DIFERENTES (era S S D S T Q Q)
     NUM-13  a tag ainda nao conquistada diz "em formacao" no topo

   USO   ASTRAL_DEV=1 node tools/testa-numeros-menores.js   (o roda-testes ja liga)
         sem ASTRAL_DEV: so as partes que nao usam o banco (12 e 13)
   ═══════════════════════════════════════════════════════════════════════════ */
const crypto = require("crypto");
const path = require("path");
const { pathToFileURL } = require("url");
const { REF, PUB, NO_DEV, chavesDoProjeto, onde } = require("./testes/alvo");   // 09/10/2026 (COD-02)
const { fixarDominio } = require("./testes/dominio-plantado");
const BASE = `https://${REF}.supabase.co`;

let falhas = 0;
const ok = (t, d = "") => console.log(`  OK     ${t.padEnd(58)} ${d}`);
const falha = (t, d = "") => { console.log(`  FALHA  ${t.padEnd(58)} ${d}`); falhas++; };
const conferir = (t, c, d = "") => (c ? ok(t, d) : falha(t, d));
async function req(c, o = {}) { const r = await fetch(BASE + c, o); const t = await r.text(); let corpo = null; try { corpo = JSON.parse(t); } catch { corpo = t; } return { status: r.status, corpo }; }

(async () => {
  console.log(`\nTESTA-NUMEROS-MENORES  ${onde}\n`);
  const modulo = (n) => import(pathToFileURL(path.join(__dirname, "..", "assets", "js", n)).href);

  console.log("== NUM-12. OS DIAS DO GRÁFICO ==");
  const { graficoSemanaHTML } = await modulo("grafico.js");
  const sete = Array.from({ length: 7 }, (_, i) => ({ data: new Date(2026, 9, 5 + i, 12), segundos: i * 600, hoje: i === 6 }));
  const rotulos = [...graficoSemanaHTML(sete, "x").matchAll(/class="gsemana-dia">([^<]+)</g)].map((m) => m[1]);
  conferir("🎯 os 7 dias do gráfico têm rótulos diferentes", rotulos.length === 7 && new Set(rotulos).size === 7, rotulos.join(" "));

  console.log("\n== NUM-13. A TAG EM FORMAÇÃO ==");
  const { divisaHTML } = await modulo("divisa.js");
  const mats = [{ nome: "Português", peso: 3, progresso: 45 }, { nome: "Matemática", peso: 3, progresso: 20 }];
  const cheia = divisaHTML({ xp: 100, edital: "Teste", materias: mats });
  const curta = divisaHTML({ xp: 100, edital: "Teste", materias: mats, compacta: true });
  conferir("🎯 no topo, a tag ainda não conquistada diz \"em formação\"", /tag emformacao/.test(cheia) && /em formação:/.test(cheia), cheia.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim());
  conferir("na barra lateral (curta) não aperta o texto", /tag emformacao/.test(curta) && !/em formação:/.test(curta));
  const dono = divisaHTML({ xp: 100, edital: "Teste", materias: [{ nome: "Português", peso: 3, progresso: 82 }] });
  conferir("tag conquistada não ganha o rótulo", !/em formação/.test(dono));

  if (!NO_DEV) { console.log("\n  (NUM-08 só no dev: planta domínio numa conta)"); }
  else {
    console.log("\n== NUM-08. UMA MÉDIA SÓ (dev) ==");
    const SK = chavesDoProjeto().find((k) => k.name === "service_role").api_key;
    const admin = { apikey: SK, Authorization: `Bearer ${SK}`, "Content-Type": "application/json" };
    const email = `numeros-${Date.now()}@astral-teste.local`;
    const uid = (await req("/auth/v1/admin/users", { method: "POST", headers: admin, body: JSON.stringify({ email, password: "T!" + crypto.randomUUID() + "a1", email_confirm: true }) })).corpo.id;
    try {
      const link = await req("/auth/v1/admin/generate_link", { method: "POST", headers: admin, body: JSON.stringify({ type: "magiclink", email }) });
      const s = (await req("/auth/v1/verify", { method: "POST", headers: { apikey: PUB, "Content-Type": "application/json" }, body: JSON.stringify({ type: "magiclink", token_hash: link.corpo.hashed_token }) })).corpo;
      const cab = { apikey: PUB, Authorization: `Bearer ${s.access_token}`, "Content-Type": "application/json" };
      // peso 8 em 90% e peso 2 em 10%: simples 50, ponderada 74
      const materias = [{ nome: "Português", peso: 8, progresso: 90 }, { nome: "História", peso: 2, progresso: 10 }];
      await req("/rest/v1/rpc/salvar_progresso", { method: "POST", headers: cab, body: JSON.stringify({ p_xp: 0, p_streak: 0, p_horas: 0,
        p_edital: { nome: "Teste Números" }, p_materias: materias.map((m) => ({ ...m, progresso: 0 })), p_cronograma_hoje: [], p_badges: [], p_tag_escolhida: null }) });
      await fixarDominio(BASE, SK, uid, materias);
      const ficha = (await req("/rest/v1/rpc/ficha_do_usuario", { method: "POST", headers: cab, body: "{}" })).corpo;
      const doutrina = ficha?.atributos?.doutrina?.valor;
      conferir("🎯 a Doutrina é a média PELO PESO (74), não a simples (50)", doutrina === 74, `Doutrina ${doutrina} · "${ficha?.atributos?.doutrina?.porque || ""}"`);
      const fatos = (await req("/rest/v1/rpc/fatos_do_usuario", { method: "POST", headers: cab, body: "{}" })).corpo;
      conferir("a Doutrina Consolidada (no teto) também pelo peso", Number(fatos?.dominioNoTeto) === 74, `dominioNoTeto ${fatos?.dominioNoTeto}`);
    } catch (e) {
      falha("o teste quebrou", e.message.slice(0, 140));
    } finally {
      await req(`/auth/v1/admin/users/${uid}`, { method: "DELETE", headers: admin });
    }
  }

  console.log("\n" + "=".repeat(70));
  console.log(falhas === 0 ? "UMA MÉDIA SÓ, DIAS SEM AMBIGUIDADE, TAG COM RÓTULO." : `🔴 ${falhas} FALHA(S).`);
  process.exitCode = falhas ? 1 : 0;
})();
