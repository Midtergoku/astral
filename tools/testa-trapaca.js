/* ═══════════════════════════════════════════════════════════════════════════
   TESTA-TRAPACA -- os atalhos da auditoria ainda funcionam?
   (08/10/2026 -- auditoria GAM-02, GAM-03, GAM-09, GAM-13; roadmap 3.12)

   A auditoria criou a conta "farm" e, SEM ESTUDAR, pelo console do navegador:
     GAM-03  sorteou 10 questoes e o GABARITO veio junto: 10 de 10 de primeira,
             Portugues a 20% de dominio numa rodada
     GAM-02  declarou 3 sessoes de 4 h do cronograma: 22 condecoracoes em 2 min 45 s,
             entre elas "tres horas seguidas" e "oito horas num unico dia"
     GAM-09  a pagina de divisas mostrava o nome e a regra da condecoracao SECRETA
             "Reintegrado"; a tag generica tinha o nome de outra secreta
     GAM-13  "7 divisas de 33": o 33 contava divisas de materia fora do edital

   Este teste repete os ataques numa conta nova e confere que nao funcionam mais
   -- e que o estudo honesto continua valendo (35 min no cronometro contam).

   USO   node tools/testa-trapaca.js                (producao: servidor + tela)
         ASTRAL_DEV=1 node tools/testa-trapaca.js   (astral-dev: so o servidor)
   Nao gasta credito. Cria uma conta de teste e apaga no fim.
   ═══════════════════════════════════════════════════════════════════════════ */
const { execSync } = require("child_process");
const crypto = require("crypto");
const fs = require("fs");
const http = require("http");
const path = require("path");
const { pathToFileURL } = require("url");

const NO_DEV = process.env.ASTRAL_DEV === "1";
const REF = NO_DEV ? "vtluuezwfpqgryixaaea" : "jjogmcacbdefwiwcyjxp";
const BASE = `https://${REF}.supabase.co`;
const RAIZ = process.env.ASTRAL_RAIZ ? path.resolve(process.env.ASTRAL_RAIZ) : path.resolve(__dirname, "..");
const CHAVES = JSON.parse(execSync(`supabase projects api-keys --project-ref ${REF} -o json`, { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }));
const SK = CHAVES.find((k) => k.name === "service_role").api_key;
const PUB = NO_DEV ? (CHAVES.find((k) => k.type === "publishable") || CHAVES.find((k) => k.name === "anon")).api_key
  : (fs.readFileSync(path.join(RAIZ, "assets/js/astral.js"), "utf8").match(/sb_publishable_[A-Za-z0-9_-]+/) || [])[0];
const admin = { apikey: SK, Authorization: `Bearer ${SK}`, "Content-Type": "application/json" };
async function req(c, o = {}) { const r = await fetch(BASE + c, o); const t = await r.text(); let corpo = null; try { corpo = JSON.parse(t); } catch { corpo = t; } return { status: r.status, corpo }; }

let falhas = 0;
const ok = (t, d = "") => console.log(`  OK     ${t.padEnd(62)} ${d}`);
const falha = (t, d = "") => { console.log(`  FALHA  ${t.padEnd(62)} ${d}`); falhas++; };

(async () => {
  console.log(`\nTESTA-TRAPACA  ${NO_DEV ? "astral-dev" : "producao"}\n`);
  let uid = null;
  try {
    const email = `trapaca-${Date.now()}@astral-teste.local`;
    uid = (await req("/auth/v1/admin/users", { method: "POST", headers: admin, body: JSON.stringify({ email, password: "T!" + crypto.randomUUID(), email_confirm: true }) })).corpo.id;
    const link = await req("/auth/v1/admin/generate_link", { method: "POST", headers: admin, body: JSON.stringify({ type: "magiclink", email }) });
    const s = (await req("/auth/v1/verify", { method: "POST", headers: { apikey: PUB, "Content-Type": "application/json" }, body: JSON.stringify({ type: "magiclink", token_hash: link.corpo.hashed_token }) })).corpo;
    const cab = { apikey: PUB, Authorization: `Bearer ${s.access_token}`, "Content-Type": "application/json" };
    const rpc = (nome, corpo = {}) => req(`/rest/v1/rpc/${nome}`, { method: "POST", headers: cab, body: JSON.stringify(corpo) });
    const materias = [{ nome: "Português", peso: 50, progresso: 0 }, { nome: "Matemática", peso: 50, progresso: 0 }];
    await rpc("salvar_progresso", { p_xp: 0, p_streak: 0, p_horas: 0, p_edital: { nome: "Teste Trapaca", forca: "exercito", patenteInicial: null, hash: "d".repeat(64) },
      p_materias: materias, p_cronograma_hoje: [], p_badges: [], p_tag_escolhida: null });

    // ── GAM-03: o gabarito so depois da resposta ─────────────────────────────
    console.log("  gabarito (GAM-03):");
    const sorteio = (await rpc("sortear_questoes", { p_materia: null, p_limite: 5 })).corpo;
    const qs = sorteio?.questoes || [];
    if (!qs.length) throw new Error("o sorteio nao devolveu questoes: " + JSON.stringify(sorteio).slice(0, 120));
    const vazou = qs.filter((q) => "gabarito" in q || "explicacao" in q);
    !vazou.length ? ok("🎯 o sorteio NÃO traz gabarito nem explicação", `${qs.length} questões, 0 com gabarito`)
      : falha("o sorteio entrega o gabarito antes da resposta", `${vazou.length} de ${qs.length}`);
    qs.every((q) => q.tem_gabarito === true) ? ok("o sorteio diz que a questão TEM gabarito (sem dizer qual)") : falha("sem a marca tem_gabarito", JSON.stringify(Object.keys(qs[0])));

    const q = qs[0];
    const real = (await req(`/rest/v1/questoes?id=eq.${q.id}&select=gabarito,explicacao`, { headers: admin })).corpo[0];
    const errada = ["a", "b", "c", "d", "e"].find((l) => l !== real.gabarito && q.alternativas && q.alternativas[l]) || (real.gabarito === "a" ? "b" : "a");
    const r1 = (await rpc("registrar_resposta", { p_origem: "acervo", p_id: q.id, p_letra: errada })).corpo;
    r1 && r1.gabarito === real.gabarito && r1.acertou === false ? ok("🎯 a correção do servidor traz o gabarito, DEPOIS", `marcou ${errada}, certa ${r1.gabarito}`)
      : falha("a correcao nao trouxe o gabarito", JSON.stringify(r1).slice(0, 120));
    ("explicacao" in (r1 || {})) ? ok("e a explicação vem junto com a correção") : falha("a correcao nao traz o campo explicacao");
    // responder de novo, agora sabendo a certa, NAO conta como acerto de primeira (dominio)
    const r2 = (await rpc("registrar_resposta", { p_origem: "acervo", p_id: q.id, p_letra: real.gabarito })).corpo;
    const linha = (await req(`/rest/v1/respostas?usuario_id=eq.${uid}&questao_id=eq.${q.id}&select=vezes_errou,acertou`, { headers: admin })).corpo[0];
    r2?.acertou === true && linha?.vezes_errou >= 1 ? ok("🎯 acertar depois de ver o gabarito não vira \"de primeira\"", `vezes_errou ${linha.vezes_errou}`)
      : falha("a segunda resposta apagou o erro", JSON.stringify(linha));
    const cad = (await rpc("caderno_de_erros", { p_materia: null, p_limite: 10 })).corpo;
    const noCaderno = (cad?.questoes || []).filter((x) => x.origem === "acervo");
    // a questao acertada na revisao sai do caderno; erra outra para ver o caderno por dentro
    const q2 = qs[1];
    const real2 = (await req(`/rest/v1/questoes?id=eq.${q2.id}&select=gabarito`, { headers: admin })).corpo[0];
    await rpc("registrar_resposta", { p_origem: "acervo", p_id: q2.id, p_letra: real2.gabarito === "a" ? "b" : "a" });
    const cad2 = (await rpc("caderno_de_erros", { p_materia: null, p_limite: 10 })).corpo;
    const doAcervo = (cad2?.questoes || []).filter((x) => x.origem === "acervo");
    doAcervo.length && doAcervo.every((x) => !("gabarito" in x) && !("explicacao" in x)) ? ok("o caderno de erros também não entrega o gabarito", `${doAcervo.length} no caderno (${noCaderno.length} antes)`)
      : falha("o caderno entrega o gabarito", JSON.stringify(doAcervo[0] || cad2).slice(0, 120));

    // ── GAM-02: sessao longa e horas no dia so com tempo MEDIDO ─────────────
    console.log("\n  sessão longa (GAM-02):");
    const ontem = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    const plantar = (linhas) => req("/rest/v1/sessoes_estudo", { method: "POST", headers: { ...admin, Prefer: "return=minimal" }, body: JSON.stringify(linhas.map((l) => ({ usuario_id: uid, materia: "Português", ...l }))) });
    await plantar([0, 1, 2].map((i) => ({ segundos: 4 * 3600, xp: 240, modo: "cronograma", criado_em: `${ontem}T${String(10 + i * 4).padStart(2, "0")}:00:00-03:00` })));
    let f = (await rpc("fatos_do_usuario")).corpo;
    Number(f?.maiorSessaoMin) === 0 ? ok("🎯 3 × 4 h DECLARADAS não fazem \"sessão seguida\"", `maior sessão ${f.maiorSessaoMin} min`)
      : falha("tempo declarado conta como sessao seguida", `${f?.maiorSessaoMin} min`);
    Number(f?.horasNoDiaMax) === 0 ? ok("🎯 nem \"horas num único dia\"", `${f.horasNoDiaMax} h medidas`) : falha("tempo declarado conta como horas no dia", `${f?.horasNoDiaMax}`);
    Number(f?.horas) >= 12 ? ok("o tempo declarado continua valendo HORAS (decisão 13)", `${Number(f.horas).toFixed(1)} h`) : falha("as horas declaradas sumiram", `${f?.horas}`);
    await plantar([{ segundos: 35 * 60, xp: 70, modo: "livre", criado_em: `${ontem}T23:00:00-03:00` }]);
    f = (await rpc("fatos_do_usuario")).corpo;
    Number(f?.maiorSessaoMin) === 35 ? ok("🎯 35 min NO CRONÔMETRO contam", `maior sessão ${f.maiorSessaoMin} min`) : falha("o tempo medido nao contou", `${f?.maiorSessaoMin}`);
    const res = f?.atributos?.resistencia?.valor;
    Number(res) > 0 && Number(res) < 50 ? ok("a Resistência da ficha mede o cronômetro", `${res} (35 de 90 min)`) : falha("Resistencia nao bate com o medido", `${res}`);
    // O servidor grava as condecoracoes quando a tela pede (sincronizar_conquistas) -- pede aqui.
    // Sem isto a checagem passaria no codigo antigo tambem: nada gravado = nada errado (08/10).
    const sinc = await rpc("sincronizar_conquistas");
    const longas = ["maratona", "resistencia_total", "maratona_dupla", "hora_cheia", "hora_e_meia", "dia_cheio"];
    const lista = JSON.stringify(sinc.corpo || "");
    const longasGravadas = longas.filter((id) => lista.includes(`"${id}"`));
    sinc.status < 300 && lista.includes("meia_hora") && !longasGravadas.length
      ? ok("🎯 gravadas: Sentinela (35 min medidos) — nenhuma de sessão longa", "sincronizar_conquistas")
      : falha("condecoracoes de sessao longa gravadas sem cronometro (ou Sentinela nao gravada)", longasGravadas.join(", ") || lista.slice(0, 120));

    // ── GAM-09 e GAM-13: o segredo e o total de divisas ─────────────────────
    console.log("\n  divisas (GAM-09, GAM-13):");
    const div = (await req(`/rest/v1/catalogo_divisas?id=eq.reintegrado&select=secreta,como_ganha`, { headers: admin })).corpo[0];
    div?.secreta === true && div?.como_ganha === "secreta" ? ok("🎯 a divisa \"Reintegrado\" é secreta no servidor") : falha("divisa Reintegrado nao e secreta no servidor", JSON.stringify(div));
    const { DIVISAS } = await import(pathToFileURL(path.join(RAIZ, "assets/js/catalogo.js")).href);
    const dRe = (DIVISAS || []).find((d) => d.id === "reintegrado");
    dRe?.secreta === true ? ok("e na tela (catálogo)") : falha("divisa Reintegrado nao e secreta no catalogo", JSON.stringify(dRe));
    const { tagsConquistadas } = await import(pathToFileURL(path.join(RAIZ, "assets/js/divisa.js")).href);
    const generica = tagsConquistadas([{ nome: "Matéria Que Não Existe", progresso: 80 }])[0]?.nome;
    const secretas = new Set([...(DIVISAS || []).filter((d) => d.secreta).map((d) => d.nome)]);
    generica && !secretas.has(generica) ? ok("🎯 a tag genérica não usa nome de divisa secreta", generica) : falha("tag generica com nome de divisa secreta", String(generica));

    if (!NO_DEV) {
      const npx = path.join(process.env.LOCALAPPDATA || "", "npm-cache", "_npx");
      let pw = null; if (fs.existsSync(npx)) for (const d of fs.readdirSync(npx)) { const p = path.join(npx, d, "node_modules", "playwright"); if (fs.existsSync(p)) { pw = require(p); break; } }
      if (!pw) falha("playwright nao encontrado");
      else {
        const tipos = { ".html": "text/html", ".css": "text/css", ".js": "text/javascript", ".woff2": "font/woff2", ".svg": "image/svg+xml", ".png": "image/png", ".ico": "image/x-icon", ".webmanifest": "application/manifest+json" };
        const srv = http.createServer((q2r, r) => { const u = decodeURIComponent(q2r.url.split("?")[0]); const a = path.join(RAIZ, u === "/" ? "index.html" : u); if (!fs.existsSync(a) || fs.statSync(a).isDirectory()) { r.writeHead(404); return r.end(); } r.writeHead(200, { "Content-Type": tipos[path.extname(a)] || "text/plain" }); r.end(fs.readFileSync(a)); });
        await new Promise((r) => srv.listen(5173, r));
        const nav = await pw.chromium.launch();
        try {
          const ctx = await nav.newContext({ viewport: { width: 390, height: 844 } });
          await ctx.addInitScript(require("./testes/aceite-de-teste.js").SCRIPT);
          await ctx.route("**/functions/v1/registrar-erro", (r) => r.fulfill({ status: 204, body: "" }));
          await ctx.addInitScript(`localStorage.setItem("sb-${REF}-auth-token", ${JSON.stringify(JSON.stringify({ access_token: s.access_token, refresh_token: s.refresh_token, token_type: "bearer", expires_at: Math.floor(Date.now() / 1000) + 3600, user: s.user }))});`);
          const pg = await ctx.newPage();
          await pg.goto("http://localhost:5173/tags.html", { waitUntil: "load" });
          await pg.waitForTimeout(6000);
          const txt = (await pg.textContent("body")).replace(/\s+/g, " ");
          !/Voltar depois de mais de 14 dias/.test(txt) ? ok("🎯 a página de divisas não revela a regra secreta") : falha("a pagina revela a regra do Reintegrado");
          const m = txt.match(/de (\d+) possíveis no seu edital/);
          const total = (DIVISAS || []).length;
          m && Number(m[1]) < total ? ok("🎯 o total conta só as divisas possíveis no edital", `${m[1]} possíveis (catálogo: ${total})`)
            : falha("o total ainda conta divisas impossiveis", m ? `${m[1]} de ${total}` : txt.slice(txt.indexOf("Você tem"), txt.indexOf("Você tem") + 90));
        } finally { await nav.close(); srv.close(); }
      }
    }
  } catch (e) {
    falha("o teste quebrou", String(e.message || e).slice(0, 160));
  } finally {
    if (uid) await req(`/auth/v1/admin/users/${uid}`, { method: "DELETE", headers: admin });
    console.log("\n  (conta de teste apagada)");
    console.log("\n" + "=".repeat(70));
    console.log(falhas === 0 ? "OS ATALHOS DA AUDITORIA NÃO FUNCIONAM MAIS — E O ESTUDO HONESTO CONTINUA VALENDO." : `🔴 ${falhas} FALHA(S).`);
    process.exit(falhas ? 1 : 0);
  }
})();
