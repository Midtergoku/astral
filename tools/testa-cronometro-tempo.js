/* ═══════════════════════════════════════════════════════════════════════════
   TESTA-CRONOMETRO-TEMPO -- o cronometro conta o tempo de verdade?
   (03/10/2026 -- auditoria CRN-01 + GAM-11, roadmap 3.1)

   A auditoria mediu, com o relogio simulado: recarregar apagou 3 min, fechar
   o pomodoro no foco apagou 10, a tela bloqueada contou 2 de 12, 25 min
   parado viraram 48 XP, e a 2a aba mostrou XP que o servidor recusou. Este
   teste refaz cada caso com o relogio simulado do navegador (page.clock).

   O relogio do SERVIDOR nao e simulado -- por isso a gravacao e INTERCEPTADA:
   o teste confere a sessao que o cronometro manda gravar (duracao, modo) e
   simula a recusa do servidor. A regra do servidor (< 1 min) e conferida a parte.

   USO   node tools/testa-cronometro-tempo.js    (producao; nao gasta credito)
   ═══════════════════════════════════════════════════════════════════════════ */
const { execSync } = require("child_process");
const fs = require("fs");
const http = require("http");
const path = require("path");

const REF = "jjogmcacbdefwiwcyjxp";
const BASE = `https://${REF}.supabase.co`;
const RAIZ = path.resolve(__dirname, "..");
const SK = JSON.parse(execSync(`supabase projects api-keys --project-ref ${REF} -o json`, { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }))
  .find((k) => k.name === "service_role").api_key;
const PUB = (fs.readFileSync(path.join(RAIZ, "assets/js/astral.js"), "utf8").match(/sb_publishable_[A-Za-z0-9_-]+/) || [])[0];
const admin = { apikey: SK, Authorization: `Bearer ${SK}`, "Content-Type": "application/json" };
async function req(c, o = {}) { const r = await fetch(BASE + c, o); const t = await r.text(); let corpo = null; try { corpo = JSON.parse(t); } catch { corpo = t; } return { status: r.status, corpo }; }

let falhas = 0;
const ok = (t, d = "") => console.log(`  OK     ${t.padEnd(60)} ${d}`);
const falha = (t, d = "") => { console.log(`  FALHA  ${t.padEnd(60)} ${d}`); falhas++; };
const MIN = 60000;
// O relogio simulado comeca no horario REAL: adiantado, o login pareceria vencido.
const T0 = Date.now();

const tipos = { ".html": "text/html", ".css": "text/css", ".js": "text/javascript", ".woff2": "font/woff2", ".svg": "image/svg+xml" };
const PORTA = 5179;
const servidor = http.createServer((q, r) => {
  const u = decodeURIComponent(q.url.split("?")[0]); const a = path.join(RAIZ, u === "/" ? "index.html" : u);
  if (!fs.existsSync(a) || fs.statSync(a).isDirectory()) { r.writeHead(404); return r.end(); }
  r.writeHead(200, { "Content-Type": tipos[path.extname(a)] || "text/plain" }); r.end(fs.readFileSync(a));
});

(async () => {
  const npx = path.join(process.env.LOCALAPPDATA, "npm-cache", "_npx");
  let pw = null; for (const d of fs.readdirSync(npx)) { const p = path.join(npx, d, "node_modules", "playwright"); if (fs.existsSync(p)) { pw = require(p); break; } }
  if (!pw) { console.log("playwright nao encontrado"); process.exit(0); }
  const email = `crono-tempo-${Date.now()}@astral-teste.local`;
  const u = await req("/auth/v1/admin/users", { method: "POST", headers: admin, body: JSON.stringify({ email, password: "T!" + crypto.randomUUID(), email_confirm: true }) });
  const link = await req("/auth/v1/admin/generate_link", { method: "POST", headers: admin, body: JSON.stringify({ type: "magiclink", email }) });
  const s = (await req("/auth/v1/verify", { method: "POST", headers: { apikey: PUB, "Content-Type": "application/json" }, body: JSON.stringify({ type: "magiclink", token_hash: link.corpo.hashed_token }) })).corpo;
  await req("/rest/v1/rpc/salvar_progresso", { method: "POST", headers: { apikey: PUB, Authorization: `Bearer ${s.access_token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ p_xp: 0, p_streak: 0, p_horas: 0, p_edital: { nome: "Teste Crono" }, p_materias: [{ nome: "Física", peso: 2, progresso: 0 }], p_cronograma_hoje: [], p_badges: [], p_tag_escolhida: null }) });
  await new Promise((r) => servidor.listen(PORTA, r));
  const nav = await pw.chromium.launch();

  // Um contexto novo por caso, com o relogio simulado e a gravacao interceptada.
  async function abrir({ recusar = false } = {}) {
    const ctx = await nav.newContext({ viewport: { width: 1280, height: 900 } });
    await ctx.addInitScript(require("./testes/aceite-de-teste.js").SCRIPT);
    await ctx.addInitScript(`localStorage.setItem("sb-${REF}-auth-token", ${JSON.stringify(JSON.stringify({ access_token: s.access_token, refresh_token: s.refresh_token, token_type: "bearer", expires_at: Math.floor(Date.now() / 1000) + 7200, user: s.user }))});`);
    const gravadas = [];
    await ctx.route("**/rest/v1/sessoes_estudo**", async (r) => {
      if (r.request().method() !== "POST") return r.continue();
      const b = JSON.parse(r.request().postData() || "{}");
      gravadas.push(b);
      if (recusar) return r.fulfill({ status: 400, contentType: "application/json", body: JSON.stringify({ code: "22023", message: "sessao mais longa que o tempo que passou" }) });
      r.fulfill({ status: 201, contentType: "application/json", body: JSON.stringify({ id: gravadas.length, materia: b.materia, segundos: b.segundos, modo: b.modo, xp: Math.floor(b.segundos / 60) * 2, criado_em: new Date().toISOString() }) });
    });
    const pg = await ctx.newPage();
    const erros = []; pg.on("pageerror", (e) => erros.push(e.message));
    await pg.clock.install({ time: new Date(T0) });
    await pg.goto(`http://localhost:${PORTA}/cronometro.html`, { waitUntil: "load" });
    await pg.clock.runFor(4000);
    await pg.waitForTimeout(2500);
    return { ctx, pg, gravadas, erros };
  }
  const tela = (pg) => pg.evaluate(() => document.getElementById("crono-tempo").textContent);
  const minutos = (txt) => { const [m, s2] = String(txt).split(":").map(Number); return m + s2 / 60; };

  try {
    console.log("\nTESTA-CRONOMETRO-TEMPO -- o tempo de estudo e o do relogio\n");

    // 1. Livre, 3 min, recarrega a pagina
    console.log("== 1. RECARREGAR NÃO APAGA A SESSÃO ==");
    {
      const { ctx, pg, erros } = await abrir();
      await pg.click("#btn-play");
      await pg.clock.runFor(3 * MIN);
      const antes = await tela(pg);
      await pg.reload({ waitUntil: "load" });
      await pg.clock.runFor(3000); await pg.waitForTimeout(1500);
      const depois = await tela(pg);
      minutos(depois) >= 3 ? ok("🎯 recarregou com 3 min: a sessão continua", `${antes} → ${depois} (antes: 00:00)`) : falha("recarregar zerou a sessão", `${antes} → ${depois}`);
      erros.length ? falha("erro de JS", erros[0].slice(0, 80)) : ok("nenhum erro de JavaScript");
      await ctx.close();
    }

    // 2. Tela bloqueada: o relogio anda 10 min sem nenhum tique
    console.log("\n== 2. TELA BLOQUEADA ==");
    for (const resposta of ["sim", "parei"]) {
      const { ctx, pg, gravadas } = await abrir();
      await pg.click("#btn-play");
      await pg.clock.runFor(1 * MIN);                       // 1 min aberto
      await pg.clock.setSystemTime(await pg.evaluate(() => Date.now()) + 10 * MIN);   // +10 min sem tique (bloqueado)
      await pg.evaluate(() => document.dispatchEvent(new Event("visibilitychange")));   // desbloqueou
      await pg.waitForTimeout(500);
      const pergunta = await pg.evaluate(() => document.querySelector(".crono-pergunta h3")?.textContent || "");
      if (resposta === "sim") {
        /estudou esse tempo/i.test(pergunta) ? ok("🎯 ao voltar, PERGUNTA se estudou o tempo sem sinal", pergunta) : falha("não perguntou ao voltar", pergunta || "(nada)");
        await pg.click('[data-cp="sim"]');
        await pg.clock.runFor(1 * MIN);                     // +1 min aberto
        const t = await tela(pg);
        minutos(t) >= 11.9 ? ok("🎯 'sim': conta os 12 min (1 + 10 bloqueado + 1)", `${t} (antes: 02:00)`) : falha("tempo bloqueado não contou", t);
        await pg.click("#btn-finalizar"); await pg.waitForTimeout(1500);
        gravadas.length === 1 && gravadas[0].segundos >= 715 && gravadas[0].modo === "livre"
          ? ok("e grava os 12 min", `${gravadas[0].segundos} s`) : falha("gravou errado", JSON.stringify(gravadas));
      } else {
        await pg.click('[data-cp="parei"]'); await pg.waitForTimeout(1500);
        gravadas.length === 1 && gravadas[0].segundos >= 55 && gravadas[0].segundos <= 70
          ? ok("🎯 'parei': grava só até o último sinal", `${gravadas[0].segundos} s`) : falha("'parei' gravou errado", JSON.stringify(gravadas));
      }
      await ctx.close();
    }

    // 3. Pomodoro: fecha a aba no meio do foco e volta
    console.log("\n== 3. POMODORO: FECHAR A ABA NO MEIO DO FOCO ==");
    {
      const { ctx, pg } = await abrir();
      await pg.click("#btn-pomodoro");
      await pg.click("#btn-play");
      await pg.clock.runFor(10 * MIN);
      const antes = await tela(pg);
      const estado = await pg.evaluate(() => Object.entries(localStorage).find(([k]) => k.startsWith("astral_crono_")));
      await pg.close();
      const pg2 = await ctx.newPage();
      await pg2.clock.install({ time: new Date(await pg.evaluate(() => Date.now()).catch(() => T0 + 10 * MIN)) });
      await pg2.addInitScript(([k, v]) => localStorage.setItem(k, v), estado);
      await pg2.goto(`http://localhost:${PORTA}/cronometro.html`, { waitUntil: "load" });
      await pg2.clock.runFor(3000); await pg2.waitForTimeout(1500);
      const depois = await tela(pg2);
      minutos(depois) <= 15.1 && minutos(depois) >= 14.5 ? ok("🎯 reabriu: o foco continua de onde estava", `${antes} → ${depois} (contagem regressiva)`) : falha("o foco se perdeu", `${antes} → ${depois}`);
      await ctx.close();
    }

    // 4. Presenca: aba esquecida aberta
    console.log("\n== 4. ABA ESQUECIDA ==");
    {
      const { ctx, pg, gravadas } = await abrir();
      await pg.click("#btn-play");
      await pg.clock.runFor(50 * MIN + 2000);
      const pergunta = await pg.evaluate(() => document.querySelector(".crono-pergunta h3")?.textContent || "");
      /Ainda estudando/i.test(pergunta) ? ok("🎯 aos 50 min pergunta 'Ainda estudando?'", pergunta) : falha("não perguntou aos 50 min", pergunta || "(nada)");
      await pg.clock.runFor(6 * MIN);
      const t = await tela(pg);
      const fase = await pg.evaluate(() => document.getElementById("crono-fase").textContent);
      minutos(t) <= 50.1 && /PAUSADO/.test(fase) ? ok("🎯 sem resposta: pausa na hora da pergunta", `${t} · ${fase} (antes: contava sem fim)`) : falha("não pausou", `${t} · ${fase}`);
      await pg.clock.runFor(60 * MIN);
      const t2 = await tela(pg);
      t2 === t ? ok("e não conta mais nada enquanto ninguém volta", `1 h depois: ${t2}`) : falha("continuou contando", `${t} → ${t2}`);
      gravadas.length === 0 ? ok("nada gravado sozinho") : falha("gravou sem ninguém", JSON.stringify(gravadas));
      await ctx.close();
    }

    // 5. Pomodoro nao emenda focos sozinho
    console.log("\n== 5. POMODORO NÃO EMENDA FOCO NO FOCO ==");
    {
      const { ctx, pg, gravadas } = await abrir();
      await pg.click("#btn-pomodoro");
      await pg.click("#btn-play");
      await pg.clock.runFor(25 * MIN + 2000);             // foco acabou
      await pg.waitForTimeout(1200);
      await pg.clock.runFor(5 * MIN + 2000);              // pausa acabou
      await pg.clock.runFor(60 * MIN);                    // ninguem voltou
      await pg.waitForTimeout(1200);
      gravadas.length === 1 && gravadas[0].segundos === 1500 && gravadas[0].modo === "pomodoro"
        ? ok("🎯 1 foco = 1 sessão de 25 min; o seguinte espera o clique", `${gravadas.length} gravada(s) em 1h30`) : falha("emendou focos sozinho", JSON.stringify(gravadas.map((g) => g.segundos)));
      await ctx.close();
    }

    // 6. O servidor recusa: a tela avisa e nao mostra XP
    console.log("\n== 6. O SERVIDOR RECUSOU ==");
    {
      const { ctx, pg } = await abrir({ recusar: true });
      await pg.click("#btn-play");
      await pg.clock.runFor(30 * MIN);
      const xpAntes = await pg.evaluate(() => document.getElementById("stat-xp").textContent);
      await pg.click("#btn-finalizar"); await pg.waitForTimeout(1500);
      const xpDepois = await pg.evaluate(() => document.getElementById("stat-xp").textContent);
      const aviso = await pg.evaluate(() => document.body.innerText.match(/não foi aceita[^\n]*/)?.[0] || "");
      xpAntes === xpDepois && /não foi aceita/.test(aviso)
        ? ok("🎯 recusada: a tela avisa e o XP não muda", `${xpAntes} → ${xpDepois} · "${aviso.slice(0, 60)}"`) : falha("mostrou XP que não existe", `${xpAntes} → ${xpDepois} · ${aviso}`);
      await ctx.close();
    }

    // 7. O servidor recusa sessao de menos de 1 minuto (GAM-10)
    console.log("\n== 7. SESSÃO DE MENOS DE 1 MINUTO ==");
    {
      const r = await req("/rest/v1/sessoes_estudo", { method: "POST", headers: { apikey: PUB, Authorization: `Bearer ${s.access_token}`, "Content-Type": "application/json", Prefer: "return=minimal" },
        body: JSON.stringify({ usuario_id: u.corpo.id, materia: "Física", segundos: 20, xp: 0, modo: "cronograma" }) });
      r.status >= 400 ? ok("🎯 o servidor recusa sessão de 20 s", `HTTP ${r.status}`) : falha("aceitou sessão de 20 s (sustentava a sequência)", `HTTP ${r.status}`);
    }
  } catch (e) {
    falha("o teste quebrou", e.message.slice(0, 160));
  } finally {
    await nav.close(); servidor.close();
    await req(`/auth/v1/admin/users/${u.corpo.id}`, { method: "DELETE", headers: admin });
    console.log("\n  (conta de teste apagada)");
    console.log("\n" + "=".repeat(78));
    console.log(falhas ? `${falhas} FALHA(S).` : "O CRONÔMETRO CONTA O TEMPO DO RELÓGIO, PERGUNTA QUANDO NÃO SABE, E NÃO INVENTA XP.");
    process.exit(falhas ? 1 : 0);
  }
})();
