// TESTA-DEPOIMENTOS -- a pagina inicial mostra SO o que a pessoa autorizou, e so com 3 ou mais? (10/10/2026, guardado 2)
//
//   - 2 autorizados: a funcao devolve [] e a secao NAO aparece
//   - 3 autorizados: aparecem os 3, so com PRIMEIRO NOME e TEXTO (a caixa do "Passei!" autoriza isso e nada mais)
//   - nao autorizado, depoimento vazio e conta de teste ficam de fora
//   - depoimento com HTML aparece como TEXTO (e dado digitado: nao confiavel)
//   - o endereco e a chave publica do depoimentos.js sao os do astral.js
//   node tools/testa-depoimentos.js     (so no astral-dev; cria e apaga as contas)
process.env.ASTRAL_DEV = "1";
const fs = require("fs"), path = require("path"), http = require("http"), crypto = require("crypto");
const R = path.resolve(process.env.ASTRAL_RAIZ || path.join(__dirname, ".."));
const { REF, PUB, reescrever, chavesDoProjeto } = require("./testes/alvo");
const BASE = `https://${REF}.supabase.co`;
const SK = chavesDoProjeto().find((k) => k.name === "service_role").api_key;
const admin = { apikey: SK, Authorization: `Bearer ${SK}`, "Content-Type": "application/json" };
async function req(c, o = {}) { const r = await fetch(BASE + c, o); const t = await r.text(); let corpo = null; try { corpo = JSON.parse(t); } catch { corpo = t; } return { status: r.status, corpo }; }
const tipos = { ".html": "text/html", ".css": "text/css", ".js": "text/javascript", ".woff2": "font/woff2", ".svg": "image/svg+xml", ".png": "image/png", ".webmanifest": "application/manifest+json", ".ico": "image/x-icon" };
const PORTA = 8983;
const srv = http.createServer((q, r) => {
  const u = decodeURIComponent(q.url.split("?")[0]); const a = path.join(R, u === "/" ? "index.html" : u);
  if (!path.resolve(a).startsWith(R) || !fs.existsSync(a) || fs.statSync(a).isDirectory()) { r.writeHead(404); return r.end(); }
  r.writeHead(200, { "Content-Type": tipos[path.extname(a)] || "text/plain" }); r.end(reescrever(a, fs.readFileSync(a)));
});
let pw = null; try { pw = require("playwright"); } catch { /* cache do npx */ }
const npx = path.join(process.env.LOCALAPPDATA || "", "npm-cache", "_npx");
if (!pw && fs.existsSync(npx)) for (const d of fs.readdirSync(npx)) { const a = path.join(npx, d, "node_modules", "playwright"); if (fs.existsSync(a)) { pw = require(a); break; } }

let falhas = 0;
const ok = (t, d = "") => console.log(`  OK     ${t.padEnd(64)} ${d}`);
const falha = (t, d = "") => { console.log(`  FALHA  ${t.padEnd(64)} ${d}`); falhas++; };
const conferir = (t, c, d = "") => (c ? ok(t, d) : falha(t, d));
const anon = { apikey: PUB, "Content-Type": "application/json" };
const publicos = async () => (await req("/rest/v1/rpc/depoimentos_publicos", { method: "POST", headers: anon, body: "{}" })).corpo;

async function aluno(email, nome, aprov) {
  const u = await req("/auth/v1/admin/users", { method: "POST", headers: admin, body: JSON.stringify({ email, password: "T!" + crypto.randomUUID() + "a1", email_confirm: true, user_metadata: { full_name: nome } }) });
  if (aprov) await req("/rest/v1/aprovacoes", { method: "POST", headers: { ...admin, Prefer: "return=minimal" }, body: JSON.stringify({ usuario_id: u.corpo.id, ...aprov }) });
  return u.corpo.id;
}

(async () => {
  console.log("\nTESTA-DEPOIMENTOS  astral-dev\n");
  const ids = []; let nav = null;
  try {
    const astral = fs.readFileSync(path.join(R, "assets/js/astral.js"), "utf8"), dep = fs.readFileSync(path.join(R, "assets/js/depoimentos.js"), "utf8");
    const pega = (t, k) => (t.match(new RegExp(`${k} = '([^']+)'`)) || [])[1];
    conferir("endereço e chave pública iguais aos do astral.js", pega(astral, "SUPABASE_URL") === pega(dep, "SUPABASE_URL") && pega(astral, "SUPABASE_KEY") === pega(dep, "SUPABASE_KEY"));

    const base = (await publicos()) || [];
    if (Array.isArray(base) && base.length) { falha("o dev já tem depoimentos autorizados (rodar com o dev limpo)", String(base.length)); throw new Error("dev sujo"); }
    const dom = `dep-${Date.now()}`;
    ids.push(await aluno(`${dom}-a@exemplo-astral.dev`, "Ana Souza Lima", { concurso: "CBMERJ 2026", depoimento: "O cronograma me salvou na reta final.", pode_publicar: true }));
    ids.push(await aluno(`${dom}-b@exemplo-astral.dev`, "Bruno Alves", { concurso: "EsSA 2026", depoimento: "<img src=x onerror=alert(1)> passei!", pode_publicar: true }));
    ids.push(await aluno(`${dom}-x@exemplo-astral.dev`, "Xavier Oculto", { concurso: "PMERJ", depoimento: "Não quero que mostrem isto.", pode_publicar: false }));
    ids.push(await aluno(`${dom}-t@astral-teste.local`, "Teste Robo", { concurso: "Teste", depoimento: "Conta de teste autorizada.", pode_publicar: true }));
    let l = await publicos();
    conferir("🎯 com 2 autorizados reais: lista vazia (a seção nem aparece)", Array.isArray(l) && l.length === 0, JSON.stringify(l).slice(0, 60));

    ids.push(await aluno(`${dom}-c@exemplo-astral.dev`, "Carla Mendes", { concurso: "EEAR 2027", depoimento: "Estudei todo dia com o cronômetro.", pode_publicar: true }));
    l = (await publicos()) || [];
    conferir("🎯 com 3 autorizados: aparecem os 3", l.length === 3, `${l.length}`);
    conferir("só PRIMEIRO NOME e TEXTO (nem concurso, nem sobrenome)", l.every((d) => Object.keys(d).sort().join() === "depoimento,nome") && l.some((d) => d.nome === "Ana") && !JSON.stringify(l).includes("Souza") && !JSON.stringify(l).includes("CBMERJ"));
    conferir("o não autorizado fica de fora", !JSON.stringify(l).includes("Xavier") && !JSON.stringify(l).includes("Não quero"));
    conferir("a conta de teste fica de fora", !JSON.stringify(l).includes("Robo"));

    console.log("\n== na página inicial ==");
    if (!pw) throw new Error("playwright nao encontrado");
    await new Promise((r) => srv.listen(PORTA, r));
    nav = await pw.chromium.launch();
    const pg = await nav.newPage();
    let alertou = false; pg.on("dialog", async (d) => { alertou = true; await d.dismiss(); });
    await pg.goto(`http://localhost:${PORTA}/index.html`, { waitUntil: "load" });
    await pg.waitForFunction(() => !document.getElementById("depoimentos")?.hidden, null, { timeout: 10000 }).catch(() => {});
    const tela = await pg.evaluate(() => ({ visivel: !document.getElementById("depoimentos")?.hidden,
      cartoes: document.querySelectorAll("#dep-grade .dep-cartao").length, imgs: document.querySelectorAll("#dep-grade img").length,
      texto: document.getElementById("dep-grade")?.innerText || "" }));
    conferir("🎯 a seção aparece com os 3 cartões", tela.visivel && tela.cartoes === 3, `${tela.cartoes} cartões`);
    conferir("🎯 HTML no depoimento vira TEXTO (nenhuma imagem, nenhum alerta)", tela.imgs === 0 && !alertou && tela.texto.includes("<img src=x"));
  } catch (e) {
    if (!/dev sujo/.test(e.message)) falha("o teste quebrou", e.message.slice(0, 140));
  } finally {
    if (nav) await nav.close();
    srv.close();
    for (const id of ids) await req(`/auth/v1/admin/users/${id}`, { method: "DELETE", headers: admin });
    const depois = await publicos();
    if (Array.isArray(depois) && depois.length === 0) console.log("\n  (contas apagadas; a lista pública voltou a ficar vazia)");
    console.log("\n" + "=".repeat(70));
    console.log(falhas ? `🔴 ${falhas} FALHA(S).` : "A PÁGINA MOSTRA SÓ O QUE A PESSOA AUTORIZOU — E SÓ COM 3 OU MAIS.");
    process.exitCode = falhas ? 1 : 0;
  }
})();
