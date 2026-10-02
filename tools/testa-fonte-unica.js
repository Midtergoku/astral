/* ═══════════════════════════════════════════════════════════════════════════
   TESTA-FONTE-UNICA -- as regras de plano e as estatisticas vem de UM lugar so?

   POR QUE EXISTE (01/10/2026)
   Dois pedidos dele no mesmo dia, depois da auditoria:
     - "a funcao unica (...) para cada trava nao virar um if espalhado"
       -> public.regras_do_plano() / meu_plano() / pode() (migration 20261001100000)
     - a fonte unica de estatisticas (o "user_stats" da auditoria)
       -> public.estatisticas_do_usuario() (migration 20261001110000)
   Este teste prova, contra a API real, com contas descartaveis, que:

     1. a tabela de regras devolve os limites de cada plano (os de 01/10/2026),
        e plano desconhecido cai no MENOR acesso
     2. as funcoes do servidor (minha-quota) leem os limites DESSA tabela
     3. o sorteio de questoes obedece a tabela: gratis 10/dia e so prova antiga;
        Pro sem teto e com prova recente
     4. pode(): recurso conhecido responde pelo plano; desconhecido = nao
     5. estatisticas_do_usuario(): o dia de cada sessao e o de SAO PAULO --
        inclusive uma sessao as 23h30 de Brasilia, que em UTC ja e o dia seguinte
     6. os fatos que ela entrega sao os de fatos_do_usuario(), sem copia
     7. ninguem le a estatistica de outro; anonimo nao le nada
     8. o formatador unico de horas (assets/js/formato.js)
     9. nenhuma pagina voltou a ler sessoes ou fatos por conta propria, nem a
        decidir plano com `if` solto

   USO   node tools/testa-fonte-unica.js     (nao gasta credito: nenhuma IA)
         ASTRAL_DEV=1 node tools/testa-fonte-unica.js   -- no projeto de
         desenvolvimento (astral-dev), para provar ANTES de publicar
   ═══════════════════════════════════════════════════════════════════════════ */

const { execSync } = require("child_process");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const { pathToFileURL } = require("url");

const NO_DEV = process.env.ASTRAL_DEV === "1";
const REF = NO_DEV ? "vtluuezwfpqgryixaaea" : "jjogmcacbdefwiwcyjxp";
const BASE = `https://${REF}.supabase.co`;
const RAIZ = path.resolve(__dirname, "..");
const CHAVES = JSON.parse(execSync(`supabase projects api-keys --project-ref ${REF} -o json`, { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }));
const SK = CHAVES.find((k) => k.name === "service_role").api_key;
const PUB = NO_DEV
  ? (CHAVES.find((k) => k.type === "publishable") || CHAVES.find((k) => k.name === "anon")).api_key
  : (fs.readFileSync(path.join(RAIZ, "assets/js/astral.js"), "utf8").match(/sb_publishable_[A-Za-z0-9_-]+/) || [])[0];
const admin = { apikey: SK, Authorization: `Bearer ${SK}`, "Content-Type": "application/json" };
async function req(c, o = {}) { const r = await fetch(BASE + c, o); const t = await r.text(); let corpo = null; try { corpo = JSON.parse(t); } catch { corpo = t; } return { status: r.status, corpo }; }

let falhas = 0;
const ok = (t, d = "") => console.log(`  OK     ${t.padEnd(60)} ${d}`);
const falha = (t, d = "") => { console.log(`  FALHA  ${t.padEnd(60)} ${d}`); falhas++; };
const igual = (a, b) => JSON.stringify(a) === JSON.stringify(b);

// O que a tabela TEM de dizer -- os numeros de 01/10/2026 (gap-analysis-planos.md, sec. 5).
const ESPERADO = {
  free: { "processar-edital": 2, "gerar-questoes": 10, "buscar-recursos": 12, editais_30_dias: 2, questoes_por_dia: 10, questoes_anos_minimo: 4 },
  beta: { "processar-edital": 10, "gerar-questoes": 60, "buscar-recursos": 30, editais_30_dias: 3, questoes_por_dia: null, questoes_anos_minimo: 0 },
  pro:  { "processar-edital": 10, "gerar-questoes": 60, "buscar-recursos": 60, editais_30_dias: 3, questoes_por_dia: null, questoes_anos_minimo: 0 },
};

(async () => {
  const contas = [];
  const criar = async (p) => {
    const email = `fonte-${p}-${Date.now()}@astral-teste.local`;
    const c = await req("/auth/v1/admin/users", { method: "POST", headers: admin, body: JSON.stringify({ email, password: "T!" + crypto.randomUUID(), email_confirm: true }) });
    contas.push(c.corpo.id);
    const link = await req("/auth/v1/admin/generate_link", { method: "POST", headers: admin, body: JSON.stringify({ type: "magiclink", email }) });
    const s = (await req("/auth/v1/verify", { method: "POST", headers: { apikey: PUB, "Content-Type": "application/json" }, body: JSON.stringify({ type: "magiclink", token_hash: link.corpo.hashed_token }) })).corpo;
    return { id: c.corpo.id, cab: { apikey: PUB, Authorization: `Bearer ${s.access_token}`, "Content-Type": "application/json" } };
  };
  const rpc = (conta, f, corpo = {}) => req(`/rest/v1/rpc/${f}`, { method: "POST", headers: conta.cab, body: JSON.stringify(corpo) });
  const plano = (conta, p) => req(`/rest/v1/perfis?id=eq.${conta.id}`, { method: "PATCH", headers: { ...admin, Prefer: "return=minimal" }, body: JSON.stringify({ tipo_plano: p }) });

  try {
    console.log(`\nTESTA-FONTE-UNICA -- regras de plano e estatisticas num lugar so  [${NO_DEV ? "DESENVOLVIMENTO" : "PRODUCAO"}]\n`);

    console.log("== 1. A TABELA DE REGRAS ==");
    for (const p of ["free", "beta", "pro"]) {
      const r = (await req("/rest/v1/rpc/regras_do_plano", { method: "POST", headers: admin, body: JSON.stringify({ p_plano: p }) })).corpo;
      r?.limites && Object.keys(ESPERADO[p]).every((k) => r.limites[k] === ESPERADO[p][k])
        ? ok(`${p}: limites de 01/10/2026`, JSON.stringify(ESPERADO[p]).slice(0, 60))
        : falha(`${p}: limites diferentes do esperado`, JSON.stringify(r?.limites).slice(0, 90));
    }
    const desc = (await req("/rest/v1/rpc/regras_do_plano", { method: "POST", headers: admin, body: JSON.stringify({ p_plano: "vip-inventado" }) })).corpo;
    desc?.plano === "free" ? ok("plano desconhecido cai no gratis (o menor acesso)") : falha("plano desconhecido nao caiu no gratis", JSON.stringify(desc).slice(0, 80));

    console.log("\n== 2. AS FUNCOES DO SERVIDOR LEEM A TABELA ==");
    const a = await criar("a");
    for (const p of ["free", "pro"]) {
      await plano(a, p);
      const q = await req("/functions/v1/minha-quota", { method: "POST", headers: a.cab, body: "{}" });
      const f = q.corpo?.data?.funcoes || {};
      const e = ESPERADO[p];
      const bate = f["gerar-questoes"]?.limite === e["gerar-questoes"] && f["buscar-recursos"]?.limite === e["buscar-recursos"]
        && f["processar-edital"]?.limite === e.editais_30_dias && q.corpo?.data?.completo === (p !== "free");
      bate ? ok(`minha-quota como ${p}: os limites da tabela`, `edital ${f["processar-edital"]?.limite}/30d · guia ${f["buscar-recursos"]?.limite}/dia`)
        : falha(`minha-quota como ${p} divergiu da tabela`, `${q.status} ${JSON.stringify(f).slice(0, 90)}`);
    }

    console.log("\n== 3. O SORTEIO DE QUESTOES OBEDECE A TABELA ==");
    const anoTeto = Number(new Date(Date.now() - 3 * 3600e3).toISOString().slice(0, 4)) - 4;
    await plano(a, "free");
    let n = 0, recentes = 0, acabou = null;
    for (let i = 0; i < 3; i++) {
      const r = (await rpc(a, "sortear_questoes", { p_limite: 50 })).corpo || {};
      n += (r.questoes || []).length; recentes += (r.questoes || []).filter((x) => x.ano > anoTeto).length;
      if (r.acabou) { acabou = r; break; }
    }
    n === 10 && recentes === 0 && acabou?.limite_do_dia === 10
      ? ok("gratis: 10 no dia, nenhuma prova com menos de 4 anos", `"${acabou.motivo}"`)
      : falha("gratis fora da regra", `${n} questoes, ${recentes} recentes, acabou=${!!acabou}`);
    const b = await criar("b");
    await plano(b, "pro");
    const pr = (await rpc(b, "sortear_questoes", { p_limite: 50 })).corpo || {};
    (pr.questoes || []).length === 50 && pr.limite_do_dia === null
      ? ok("Pro: 50 de uma vez, sem teto", `${(pr.questoes || []).filter((x) => x.ano > anoTeto).length} de prova recente`)
      : falha("Pro fora da regra", `${(pr.questoes || []).length} questoes, limite ${pr.limite_do_dia}`);

    console.log("\n== 4. pode() ==");
    const pc = (await rpc(a, "pode", { p_recurso: "caderno_de_erros" })).corpo;
    const pa = (await rpc(a, "pode", { p_recurso: "acervo_completo" })).corpo;
    const pb = (await rpc(b, "pode", { p_recurso: "acervo_completo" })).corpo;
    const pi = (await rpc(b, "pode", { p_recurso: "recurso-inventado" })).corpo;
    pc === true && pa === false && pb === true && pi === false
      ? ok("caderno para todos; acervo completo so no Pro; inventado = nao")
      : falha("pode() respondeu errado", `caderno=${pc} acervo(gratis)=${pa} acervo(pro)=${pb} inventado=${pi}`);

    console.log("\n== 5. O DIA DE CADA SESSAO E O DE SAO PAULO ==");
    // 23h30 de Brasilia de ontem = 02h30 UTC de hoje: em UTC seria "hoje", em SP e "ontem".
    const hojeSP = new Date(Date.now() - 3 * 3600e3).toISOString().slice(0, 10);
    const ontemSP = new Date(Date.parse(`${hojeSP}T12:00:00Z`) - 864e5).toISOString().slice(0, 10);
    const instante = new Date(`${ontemSP}T23:30:00-03:00`).toISOString();
    await req("/rest/v1/sessoes_estudo", { method: "POST", headers: { ...admin, Prefer: "return=minimal" },
      body: JSON.stringify([{ usuario_id: a.id, materia: "Português", segundos: 1800, xp: 60, modo: "livre", criado_em: instante }]) });
    const est = (await rpc(a, "estatisticas_do_usuario")).corpo || {};
    const s = (est.sessoes || []).find((x) => x.criado_em && new Date(x.criado_em).toISOString() === instante);
    s?.dia === ontemSP ? ok("sessao das 23h30 de Brasilia conta no dia de Brasilia", `${instante.slice(0, 16)} UTC -> ${s.dia}`)
      : falha("o dia da sessao nao e o de Sao Paulo", `${instante} -> ${s?.dia}`);
    est.hoje?.dia === hojeSP ? ok("'hoje' e o de Sao Paulo", est.hoje.dia) : falha("'hoje' nao e o de Sao Paulo", `${est.hoje?.dia} x ${hojeSP}`);
    est.plano?.plano === "free" ? ok("o plano vem junto, da mesma tabela") : falha("o plano nao veio junto", JSON.stringify(est.plano).slice(0, 60));

    console.log("\n== 6. OS FATOS SAO OS DE fatos_do_usuario, SEM COPIA ==");
    const fatos = (await rpc(a, "fatos_do_usuario")).corpo;
    igual(est.fatos, fatos) ? ok("estatisticas.fatos == fatos_do_usuario()", `${Object.keys(fatos || {}).length} campos`)
      : falha("os fatos divergem", "estatisticas_do_usuario recalculou algo por conta propria");

    console.log("\n== 7. NINGUEM LE A DE OUTRO ==");
    const deB = (await rpc(b, "estatisticas_do_usuario")).corpo || {};
    (deB.sessoes || []).length === 0 ? ok("a conta B nao ve as sessoes da A", "0 sessoes") : falha("a conta B viu sessoes que nao sao dela", `${deB.sessoes.length}`);
    const anon = await req("/rest/v1/rpc/estatisticas_do_usuario", { method: "POST", headers: { apikey: PUB, "Content-Type": "application/json" }, body: "{}" });
    anon.status === 401 || anon.status === 403 ? ok("anonimo nao le", `HTTP ${anon.status}`) : falha("anonimo leu estatistica", `HTTP ${anon.status}`);

    console.log("\n== 8. O FORMATADOR UNICO DE HORAS ==");
    const { duracao, duracaoSeg, duracaoHoras } = await import(pathToFileURL(path.join(RAIZ, "assets/js/formato.js")).href);
    const casos = [[duracao(0), "0 min"], [duracao(45), "45 min"], [duracao(59.6), "1h"], [duracao(60), "1h"], [duracao(125), "2h05"],
      [duracaoSeg(3599), "1h"], [duracaoSeg(35400), "9h50"], [duracaoHoras(0.5), "30 min"], [duracaoHoras(90), "90h"], [duracaoHoras(12.2), "12h12"]];
    const erradas = casos.filter(([v, e]) => v !== e);
    erradas.length ? falha("formato de hora errado", erradas.map(([v, e]) => `${v}≠${e}`).join(" ")) : ok(`${casos.length} formatos certos`, "45 min · 2h05 · 90h · 30 min");

    console.log("\n== 9. NENHUMA PAGINA VOLTOU A FAZER POR CONTA PROPRIA ==");
    const arquivos = fs.readdirSync(RAIZ).filter((f) => f.endsWith(".html")).concat(fs.readdirSync(path.join(RAIZ, "assets/js")).filter((f) => f.endsWith(".js") && !/^supabase-|^pdf-/.test(f)).map((f) => "assets/js/" + f));
    const leituras = [], planos = [];
    for (const f of arquivos) {
      const t = fs.readFileSync(path.join(RAIZ, f), "utf8");
      t.split("\n").forEach((l, i) => {
        if (/^\s*(\/\/|\*)/.test(l)) return;
        if (/rpc\(\s*'(fatos_do_usuario|fatos_de_hoje)'/.test(l) || (/from\(\s*'sessoes_estudo'\s*\)\s*\.select/.test(l) && f !== "conta.html")) leituras.push(`${f}:${i + 1}`);
        if (/tipo_plano\s*===|'premium'/.test(l) || (/plano\s*===\s*'(pro|beta)'/.test(l) && f !== "assets/js/astral.js")) planos.push(`${f}:${i + 1}`);
      });
    }
    leituras.length ? falha("tela lendo sessoes/fatos por conta propria", leituras.join(" ")) : ok("so a fonte unica le sessoes e fatos", "(a exportacao da Conta e a excecao)");
    planos.length ? falha("`if` de plano solto", planos.join(" ")) : ok("nenhum `if` de plano fora do astral.js");
  } catch (e) {
    falha("o teste quebrou", e.message);
  } finally {
    for (const id of contas) await req(`/auth/v1/admin/users/${id}`, { method: "DELETE", headers: admin });
    console.log(`\n  (${contas.length} contas de teste apagadas)`);
  }

  console.log("\n" + "=".repeat(76));
  console.log(falhas ? `${falhas} FALHA(S).` : "REGRAS E ESTATISTICAS VEM DE UM LUGAR SO -- e o dia e o de Sao Paulo.");
  process.exitCode = falhas ? 1 : 0;
})();
