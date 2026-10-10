/* ═══════════════════════════════════════════════════════════════════════════
   TESTA-DUAS-ETAPAS -- o codigo do aplicativo (TOTP) protege a conta do dono?
   (10/10/2026, roadmap 4.4 -- MFA, da lista dos videos dele)

     1. SEM FATOR NADA MUDA: o dono que ainda nao ativou continua dono (a ordem de duas pontas: a trava
        entra antes de ele ativar e nao pode tranca-lo do lado de fora)
     2. COM O CODIGO: ativou e confirmou -> a sessao e de nivel 2 e o painel abre
     3. 🎯 SO A SENHA NAO BASTA: nova entrada sem o codigo -> sou_administrador = falso, o painel recusa,
        e desligar o codigo e recusado (quem roubou a senha nao tira a trava)
     4. 🎯 O PORTAO NA TELA: entrar sem o codigo -> a Minha conta pede o codigo ANTES de mostrar qualquer
        dado; codigo errado avisa; codigo certo libera
     5. 🎯 ATIVAR PELA TELA: o dono sem fator ve o cartao, le o QR (aqui: o segredo), digita o codigo e
        o servidor passa a ter o fator verificado; desligar pela tela tira o fator
     6. O ALUNO COMUM nao ve o cartao nem o portao

   Falha no codigo antigo: a parte 3 (o servidor aceitava a senha sozinha) e as 4-5 (nao havia tela).
   So no dev (cria administrador de teste).

   USO   ASTRAL_DEV=1 node tools/testa-duas-etapas.js
   ═══════════════════════════════════════════════════════════════════════════ */
const { execFileSync } = require("child_process");
const crypto = require("crypto");
const fs = require("fs");
const http = require("http");
const path = require("path");
const { REF, PUB, NO_DEV, chavesDoProjeto, reescrever, onde } = require("./testes/alvo");
if (!NO_DEV) { console.log("So no dev: ASTRAL_DEV=1 node tools/testa-duas-etapas.js"); process.exit(1); }
const BASE = `https://${REF}.supabase.co`;
const SK = chavesDoProjeto().find((k) => k.name === "service_role").api_key;
const admin = { apikey: SK, Authorization: `Bearer ${SK}`, "Content-Type": "application/json" };
const TOKEN = execFileSync("powershell", ["-NoProfile", "-File", path.join(__dirname, "token-supabase.ps1")], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
async function sql(query) {
  const r = await fetch(`https://api.supabase.com/v1/projects/${REF}/database/query`, { method: "POST", headers: { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json" }, body: JSON.stringify({ query }) });
  const t = await r.text(); if (!r.ok) throw new Error(`SQL HTTP ${r.status}: ${t.slice(0, 160)}`); return JSON.parse(t);
}
async function req(c, o = {}) { const r = await fetch(BASE + c, o); const t = await r.text(); let corpo = null; try { corpo = JSON.parse(t); } catch { corpo = t; } return { status: r.status, corpo }; }

let falhas = 0;
const ok = (t, d = "") => console.log(`  OK     ${t.padEnd(62)} ${d}`);
const falha = (t, d = "") => { console.log(`  FALHA  ${t.padEnd(62)} ${d}`); falhas++; };
const conferir = (t, c, d = "") => (c ? ok(t, d) : falha(t, d));

/* TOTP (RFC 6238): HMAC-SHA1 do contador de 30 s, 6 digitos -- o mesmo que o aplicativo do celular calcula */
function base32(s) {
  const A = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567"; let bits = "";
  for (const ch of s.replace(/=+$/, "").toUpperCase()) bits += A.indexOf(ch).toString(2).padStart(5, "0");
  const out = []; for (let i = 0; i + 8 <= bits.length; i += 8) out.push(parseInt(bits.slice(i, i + 8), 2));
  return Buffer.from(out);
}
function totp(segredo, janela = 0) {
  const cont = Math.floor(Date.now() / 1000 / 30) + janela;
  const b = Buffer.alloc(8); b.writeBigUInt64BE(BigInt(cont));
  const h = crypto.createHmac("sha1", base32(segredo)).update(b).digest();
  const o = h[h.length - 1] & 0xf;
  return String(((h.readUInt32BE(o) & 0x7fffffff) % 1e6)).padStart(6, "0");
}
const jwtAal = (t) => JSON.parse(Buffer.from(t.split(".")[1], "base64url").toString()).aal;

const RAIZ = path.resolve(__dirname, "..");
const tipos = { ".html": "text/html", ".css": "text/css", ".js": "text/javascript", ".mjs": "text/javascript", ".woff2": "font/woff2", ".svg": "image/svg+xml", ".png": "image/png", ".ico": "image/x-icon", ".webmanifest": "application/manifest+json" };
const PORTA = 5173;
const servidor = http.createServer((q, r) => {
  const u = decodeURIComponent(q.url.split("?")[0]); const a = path.join(RAIZ, u === "/" ? "index.html" : u);
  if (!path.resolve(a).startsWith(RAIZ) || !fs.existsSync(a) || fs.statSync(a).isDirectory()) { r.writeHead(404); return r.end(); }
  r.writeHead(200, { "Content-Type": tipos[path.extname(a)] || "text/plain" }); r.end(reescrever(a, fs.readFileSync(a)));
});

async function criarConta(email) {
  const u = await req("/auth/v1/admin/users", { method: "POST", headers: admin, body: JSON.stringify({ email, password: "T!" + crypto.randomUUID() + "a1", email_confirm: true }) });
  return { id: u.corpo.id, email };
}
/** Uma entrada nova (como digitar a senha): sessao de nivel 1, com a lista de fatores no usuario. */
async function entrar(c) {
  const link = await req("/auth/v1/admin/generate_link", { method: "POST", headers: admin, body: JSON.stringify({ type: "magiclink", email: c.email }) });
  const s = (await req("/auth/v1/verify", { method: "POST", headers: { apikey: PUB, "Content-Type": "application/json" }, body: JSON.stringify({ type: "magiclink", token_hash: link.corpo.hashed_token }) })).corpo;
  return comSessao(s);
}
const comSessao = (s) => ({ s, cab: { apikey: PUB, Authorization: `Bearer ${s.access_token}`, "Content-Type": "application/json" } });
const souAdmin = async (e) => (await req("/rest/v1/rpc/sou_administrador", { method: "POST", headers: e.cab, body: "{}" })).corpo;
const painel = (e) => req("/rest/v1/rpc/painel_de_negocio", { method: "POST", headers: e.cab, body: JSON.stringify({ p_dias: 30 }) });
const fatoresVerificados = async (id) => Number((await sql(`select count(*)::int n from auth.mfa_factors where user_id = '${id}' and status = 'verified'`))[0].n);

/** Desafio + codigo. Se o codigo da janela atual ja foi usado, tenta o da proxima (o servidor aceita a vizinha). */
async function confirmar(e, fatorId, segredo) {
  for (const janela of [0, 1]) {
    const ch = await req(`/auth/v1/factors/${fatorId}/challenge`, { method: "POST", headers: e.cab, body: "{}" });
    const v = await req(`/auth/v1/factors/${fatorId}/verify`, { method: "POST", headers: e.cab, body: JSON.stringify({ challenge_id: ch.corpo.id, code: totp(segredo, janela) }) });
    if (v.status === 200 && v.corpo.access_token) return comSessao(v.corpo);
  }
  return null;
}

(async () => {
  console.log(`\nTESTA-DUAS-ETAPAS  ${onde}\n`);
  const criadas = [], admins = [];
  let nav = null;
  try {
    const dono = await criarConta(`de-dono-${Date.now()}@astral-teste.local`); criadas.push(dono.id);
    await sql(`insert into public.administradores (usuario_id) values ('${dono.id}') on conflict do nothing`); admins.push(dono.id);

    console.log("== 1. SEM FATOR NADA MUDA ==");
    const e1 = await entrar(dono);
    conferir("dono sem duas etapas continua dono", (await souAdmin(e1)) === true);
    conferir("e o painel abre para ele", (await painel(e1)).status === 200);

    console.log("\n== 2. COM O CODIGO ==");
    const enr = await req("/auth/v1/factors", { method: "POST", headers: e1.cab, body: JSON.stringify({ factor_type: "totp", friendly_name: "teste" }) });
    conferir("o servidor deixa ativar (TOTP ligado no projeto)", enr.status === 200 && enr.corpo?.totp?.secret, `HTTP ${enr.status} ${enr.status !== 200 ? JSON.stringify(enr.corpo).slice(0, 80) : ""}`);
    const segredo = enr.corpo.totp.secret, fatorId = enr.corpo.id;
    // pela API crua o QR e o SVG; o supabase-js da tela poe o prefixo data:image/svg (conferido na parte 5)
    conferir("o QR vem como desenho (SVG)", /<svg[\s>]/.test(String(enr.corpo.totp.qr_code || "")));
    const e2 = await confirmar(e1, fatorId, segredo);
    conferir("o codigo calculado confirma o fator", !!e2);
    conferir("a sessao sobe para o nivel 2", e2 && jwtAal(e2.s.access_token) === "aal2");
    conferir("com o codigo, continua dono", e2 && (await souAdmin(e2)) === true);
    conferir("e o painel abre", e2 && (await painel(e2)).status === 200);

    console.log("\n== 3. SO A SENHA NAO BASTA ==");
    const e3 = await entrar(dono);
    conferir("entrada nova vem no nivel 1", jwtAal(e3.s.access_token) === "aal1");
    conferir("🎯 sem o codigo, NAO e dono", (await souAdmin(e3)) === false);
    const p3 = await painel(e3);
    conferir("🎯 o painel recusa", p3.status >= 400 && !p3.corpo?.contas, `HTTP ${p3.status}`);
    const des = await req(`/auth/v1/factors/${fatorId}`, { method: "DELETE", headers: e3.cab });
    conferir("🎯 desligar o codigo sem o codigo e recusado", des.status >= 400 && (await fatoresVerificados(dono.id)) === 1, `HTTP ${des.status}`);

    console.log("\n== 4. O PORTAO NA TELA ==");
    const npx = path.join(process.env.LOCALAPPDATA, "npm-cache", "_npx");
    let pw = null; for (const d of fs.readdirSync(npx)) { const p = path.join(npx, d, "node_modules", "playwright"); if (fs.existsSync(p)) { pw = require(p); break; } }
    if (!pw) throw new Error("playwright nao encontrado");
    await new Promise((r) => servidor.listen(PORTA, r));
    nav = await pw.chromium.launch();
    const abrir = async (sess, pagina = "conta.html") => {
      const ctx = await nav.newContext({ viewport: { width: 1280, height: 900 } });
      await ctx.addInitScript(require("./testes/aceite-de-teste.js").SCRIPT);
      await ctx.addInitScript(`localStorage.setItem("sb-${REF}-auth-token", ${JSON.stringify(JSON.stringify({ access_token: sess.access_token, refresh_token: sess.refresh_token, token_type: "bearer", expires_at: Math.floor(Date.now() / 1000) + 900, user: sess.user }))});`);
      const pg = await ctx.newPage();
      const erros = []; pg.on("pageerror", (e) => erros.push(e.message));
      pg.on("dialog", (d) => d.accept());
      await pg.goto(`http://localhost:${PORTA}/${pagina}`, { waitUntil: "load" });
      return { pg, erros };
    };
    const t4 = await abrir(e3.s);
    const portao = await t4.pg.waitForSelector(".de-fundo", { timeout: 20000 }).then(() => true).catch(() => false);
    conferir("🎯 entrar sem o codigo mostra o portao", portao);
    await t4.pg.waitForTimeout(1500);
    const vazio = await t4.pg.evaluate(() => document.getElementById("dados-grid").children.length === 0);
    conferir("🎯 e nenhum dado aparece antes do codigo", vazio);
    await t4.pg.fill("#de-codigo", totp(segredo) === "000000" ? "111111" : "000000");
    await t4.pg.waitForFunction(() => document.getElementById("de-erro")?.textContent.length > 0, null, { timeout: 15000 }).catch(() => {});
    conferir("codigo errado avisa e o portao fica", /errado/.test(await t4.pg.textContent("#de-erro").catch(() => "")) && !!(await t4.pg.$(".de-fundo")));
    await t4.pg.waitForTimeout(31000 - (Date.now() % 30000));   // codigo da janela seguinte: o da parte 2 ja foi usado
    await t4.pg.fill("#de-codigo", totp(segredo));
    const saiu = await t4.pg.waitForSelector(".de-fundo", { state: "detached", timeout: 15000 }).then(() => true).catch(() => false);
    conferir("🎯 codigo certo libera", saiu);
    const encheu = await t4.pg.waitForFunction(() => document.getElementById("dados-grid").children.length > 0, null, { timeout: 15000 }).then(() => true).catch(() => false);
    conferir("e a pagina carrega os dados", encheu);
    const cartao = await t4.pg.waitForSelector("#card-duas-etapas:not([hidden])", { timeout: 15000 }).then(() => true).catch(() => false);
    conferir("o cartao diz que esta ligada", cartao && /Ligada/.test(await t4.pg.textContent("#de-situacao")));
    t4.erros.length ? falha("erro de JavaScript", t4.erros[0].slice(0, 80)) : ok("nenhum erro de JavaScript");

    console.log("\n== 5. ATIVAR E DESLIGAR PELA TELA ==");
    const dono2 = await criarConta(`de-dono2-${Date.now()}@astral-teste.local`); criadas.push(dono2.id);
    await sql(`insert into public.administradores (usuario_id) values ('${dono2.id}') on conflict do nothing`); admins.push(dono2.id);
    const t5 = await abrir((await entrar(dono2)).s);
    const viuAtivar = await t5.pg.waitForSelector("#btn-de-ativar:not([hidden])", { timeout: 20000 }).then(() => true).catch(() => false);
    conferir("o dono sem fator ve o botao Ativar (e nenhum portao)", viuAtivar && !(await t5.pg.$(".de-fundo")));
    await t5.pg.click("#btn-de-ativar");
    await t5.pg.waitForSelector("#de-passos:not([hidden])", { timeout: 15000 }).catch(() => {});
    const qr = await t5.pg.getAttribute("#de-qr", "src");
    const seg2 = (await t5.pg.textContent("#de-segredo")).trim();
    conferir("aparece o QR e a chave para digitar", String(qr).startsWith("data:image/svg") && seg2.length >= 16);
    await t5.pg.fill("#de-codigo-novo", totp(seg2));
    await t5.pg.click("#btn-de-confirmar");
    const ligou = await t5.pg.waitForFunction(() => /Ligada/.test(document.getElementById("de-situacao").textContent), null, { timeout: 15000 }).then(() => true).catch(() => false);
    conferir("🎯 a tela diz Ligada", ligou);
    conferir("🎯 e o servidor tem o fator verificado", (await fatoresVerificados(dono2.id)) === 1);
    await t5.pg.click("#btn-de-desativar");
    const desligou = await t5.pg.waitForSelector("#btn-de-ativar:not([hidden])", { timeout: 15000 }).then(() => true).catch(() => false);
    conferir("desligar pela tela (com a sessao do codigo) tira o fator", desligou && (await fatoresVerificados(dono2.id)) === 0);
    t5.erros.length ? falha("erro de JavaScript", t5.erros[0].slice(0, 80)) : ok("nenhum erro de JavaScript");

    console.log("\n== 6. O ALUNO COMUM ==");
    const aluno = await criarConta(`de-aluno-${Date.now()}@astral-teste.local`); criadas.push(aluno.id);
    const t6 = await abrir((await entrar(aluno)).s);
    await t6.pg.waitForFunction(() => document.getElementById("dados-grid").children.length > 0, null, { timeout: 20000 }).catch(() => {});
    await t6.pg.waitForTimeout(2000);
    conferir("sem portao e sem o cartao", !(await t6.pg.$(".de-fundo")) && (await t6.pg.$eval("#card-duas-etapas", (c) => c.hidden)));
  } catch (e) {
    falha("o teste quebrou", e.message.slice(0, 140));
  } finally {
    if (nav) await nav.close();
    servidor.close();
    for (const id of admins) await sql(`delete from public.administradores where usuario_id = '${id}'`).catch(() => {});
    for (const id of criadas) await req(`/auth/v1/admin/users/${id}`, { method: "DELETE", headers: admin });
    console.log("\n  (contas de teste apagadas; os administradores de teste sairam)");
    console.log("\n" + "=".repeat(70));
    console.log(falhas === 0 ? "AS DUAS ETAPAS PROTEGEM O DONO: SO A SENHA NAO ABRE O PAINEL." : `🔴 ${falhas} FALHA(S).`);
    process.exitCode = falhas ? 1 : 0;
  }
})();
