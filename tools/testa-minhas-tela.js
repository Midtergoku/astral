// TESTA-MINHAS-TELA -- o aluno consegue trazer a prova dele, sozinho?
//
// O `testa-minhas-questoes` ja provou que o BANCO isola. Aqui se prova a outra
// metade: que a tela existe, que o PDF entra pelo navegador, e que o que ele
// guarda aparece SO para ele.
//
// 🔴 Como no teste da bancada do Lucas, este NAO simula a leitura do PDF: ele
// FABRICA um PDF de verdade, byte a byte, e solta na pagina. Se o pdf.js nao
// funcionasse na aba particular, o teste falharia.
const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");
const http = require("http");

const REF = "jjogmcacbdefwiwcyjxp";
const BASE = `https://${REF}.supabase.co`;
const RAIZ = path.resolve(__dirname, "..");
const PORTA = 8893;

function acharPlaywright() {
  try { return require("playwright"); } catch { /* segue */ }
  const base = process.env.LOCALAPPDATA
    ? path.join(process.env.LOCALAPPDATA, "npm-cache", "_npx")
    : path.join(require("os").homedir(), ".npm", "_npx");
  if (!fs.existsSync(base)) return null;
  for (const d of fs.readdirSync(base)) {
    const alvo = path.join(base, d, "node_modules", "playwright");
    if (fs.existsSync(alvo)) { try { return require(alvo); } catch { /* proximo */ } }
  }
  return null;
}
const pw = acharPlaywright();
if (!pw) { console.log("TESTA-MINHAS-TELA -- pulado: playwright nao encontrado."); process.exit(0); }

const chaves = JSON.parse(execSync(`supabase projects api-keys --project-ref ${REF} -o json`,
  { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }));
const SERVICE = chaves.find((k) => k.name === "service_role").api_key;
const PUB = (fs.readFileSync(path.join(RAIZ, "assets/js/astral.js"), "utf8")
  .match(/sb_publishable_[A-Za-z0-9_-]+/) || [])[0];
const admin = { apikey: SERVICE, Authorization: `Bearer ${SERVICE}`, "Content-Type": "application/json" };

let falhas = 0;
const ok = (t, d = "") => console.log(`  OK     ${t.padEnd(54)} ${d}`);
const falha = (t, d = "") => { console.log(`  FALHA  ${t.padEnd(54)} ${d}`); falhas++; };

async function req(c, o) {
  const r = await fetch(`${BASE}${c}`, o);
  let corpo = null; try { corpo = await r.json(); } catch { /* sem corpo */ }
  return { status: r.status, corpo };
}

/* Um PDF de verdade, sem biblioteca -- o projeto nao tem npm. WinAnsi porque
   e a codificacao do Helvetica padrao; sem isso os acentos chegam como lixo e
   o teste acusaria a tela por um defeito que seria meu. */
function fabricarPdf(linhas) {
  const conteudo = "BT /F1 9 Tf 40 800 Td 12 TL\n"
    + linhas.map((l) => `(${l.replace(/([\\()])/g, "\\$1")}) Tj T*`).join("\n") + "\nET";
  const buf = (s) => Buffer.from(s, "latin1");
  const objetos = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] "
      + "/Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>",
    `<< /Length ${buf(conteudo).length} >>\nstream\n${conteudo}\nendstream`,
  ];
  let pdf = "%PDF-1.4\n";
  const pos = [];
  objetos.forEach((o, i) => { pos.push(buf(pdf).length); pdf += `${i + 1} 0 obj\n${o}\nendobj\n`; });
  const xref = buf(pdf).length;
  pdf += `xref\n0 ${objetos.length + 1}\n0000000000 65535 f \n`
       + pos.map((p) => String(p).padStart(10, "0") + " 00000 n \n").join("")
       + `trailer\n<< /Size ${objetos.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return buf(pdf);
}

// Uma prova de bombeiro de mentira, no formato "Questao NN" + "(A)".
const PROVA = (() => {
  const l = ["CORPO DE BOMBEIROS MILITAR - PROVA DE ADMISSAO", "", "Língua Portuguesa", ""];
  for (let n = 1; n <= 6; n++) {
    l.push(`Questão 0${n}`,
      `Enunciado da questao ${n} sobre lingua portuguesa, com tamanho suficiente para valer.`,
      `(A) Primeira alternativa da questao ${n}, com texto de verdade.`,
      `(B) Segunda alternativa da questao ${n}, com texto de verdade.`,
      `(C) Terceira alternativa da questao ${n}, com texto de verdade.`,
      `(D) Quarta alternativa da questao ${n}, com texto de verdade.`, "");
  }
  return l;
})();

const tipos = { ".html": "text/html", ".css": "text/css", ".js": "text/javascript",
                ".mjs": "text/javascript", ".woff2": "font/woff2" };
const servidor = http.createServer((q, r) => {
  const u = decodeURIComponent(q.url.split("?")[0]);
  const arq = path.join(RAIZ, u === "/" ? "/index.html" : u);
  if (!path.resolve(arq).startsWith(RAIZ) || !fs.existsSync(arq) || fs.statSync(arq).isDirectory()) {
    r.writeHead(404); return r.end("404");
  }
  r.writeHead(200, { "Content-Type": tipos[path.extname(arq)] || "text/plain" });
  r.end(fs.readFileSync(arq));
});

(async () => {
  const contas = [];
  let nav = null, ctx = null, arquivoPdf = null;
  await new Promise((r) => servidor.listen(PORTA, r));
  nav = await pw.chromium.launch();

  const criar = async (p) => {
    const email = `${p}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}@astral-teste.local`;
    const c = await req("/auth/v1/admin/users", { method: "POST", headers: admin,
      body: JSON.stringify({ email, password: "T!" + crypto.randomUUID(), email_confirm: true }) });
    const link = await req("/auth/v1/admin/generate_link", { method: "POST", headers: admin,
      body: JSON.stringify({ type: "magiclink", email }) });
    const s = (await req("/auth/v1/verify", { method: "POST",
      headers: { apikey: PUB, "Content-Type": "application/json" },
      body: JSON.stringify({ type: "magiclink", token_hash: link.corpo?.hashed_token }) })).corpo;
    const conta = { id: c.corpo.id, sessao: s,
      cab: { apikey: PUB, Authorization: `Bearer ${s.access_token}`, "Content-Type": "application/json" } };
    contas.push(conta);
    return conta;
  };

  const abrir = async (conta) => {
    const c = await nav.newContext({ viewport: { width: 1280, height: 1000 } });
    await c.addInitScript(`(() => {
      localStorage.setItem("sb-${REF}-auth-token", JSON.stringify({
        access_token: ${JSON.stringify(conta.sessao.access_token)},
        refresh_token: ${JSON.stringify(conta.sessao.refresh_token)},
        token_type: "bearer", expires_at: Math.floor(Date.now()/1000) + 3600,
        user: ${JSON.stringify(conta.sessao.user)} }));
      localStorage.setItem("astral_aba_questoes", "minhas");
    })()`);
    const pg = await c.newPage();
    const erros = [];
    pg.on("pageerror", (e) => erros.push(String(e.message)));
    await pg.goto(`http://localhost:${PORTA}/banco.html`, { waitUntil: "load" });
    await pg.waitForSelector("#m-pdf, .empty-title", { timeout: 25000 }).catch(() => {});
    await pg.waitForTimeout(700);
    return { ctx: c, pg, erros };
  };

  try {
    const ana = await criar("ana");
    const bia = await criar("bia");
    console.log(`\nTESTA-MINHAS-TELA  ana ${ana.id.slice(0, 8)} · bia ${bia.id.slice(0, 8)}\n`);

    const pdf = fabricarPdf(PROVA);
    arquivoPdf = path.join(require("os").tmpdir(), `minha-prova-${Date.now()}.pdf`);
    fs.writeFileSync(arquivoPdf, pdf);

    // ── 1. A ABA EXISTE E DIZ QUE E PARTICULAR ────────────────────────────
    console.log("== 1. A ABA PARTICULAR ==");
    const { ctx: c1, pg, erros } = await abrir(ana);
    ctx = c1;
    if (erros.length) falha("erro de JavaScript na tela", erros[0].slice(0, 70));

    const inicio = await pg.evaluate(() => ({
      abas: document.querySelectorAll(".aba").length,
      temCampo: !!document.getElementById("m-pdf"),
      texto: document.getElementById("painel")?.textContent || "",
    }));
    inicio.abas === 2 ? ok("as duas abas aparecem", "Acervo · Minhas questões")
                      : falha("abas na tela", String(inicio.abas));
    inicio.temCampo ? ok("a area de subir PDF esta la") : falha("sem area de subir PDF");
    /só você vê/i.test(inicio.texto)
      ? ok("🎯 a tela DIZ que é particular", "não só o banco de dados")
      : falha("a tela nao diz que e particular", inicio.texto.slice(0, 60));

    // ── 2. O PDF ENTRA, E LONGE DA CAIXA ──────────────────────────────────
    console.log("\n== 2. O PDF DELE ENTRA PELO NAVEGADOR ==");
    await pg.fill("#m-origem", "CBMERJ 2024 (teste)");
    const b64 = pdf.toString("base64");
    const soltou = await pg.evaluate(async (dados) => {
      const bin = atob(dados);
      const bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      const dt = new DataTransfer();
      dt.items.add(new File([bytes], "prova.pdf", { type: "application/pdf" }));
      const alvo = document.querySelector(".page-title") || document.body;
      const over = new DragEvent("dragover", { bubbles: true, cancelable: true, dataTransfer: dt });
      alvo.dispatchEvent(over);
      const impediu = over.defaultPrevented;
      alvo.dispatchEvent(new DragEvent("drop", { bubbles: true, cancelable: true, dataTransfer: dt }));
      return { impediu };
    }, b64);
    soltou.impediu ? ok("soltar em qualquer lugar da página funciona", "o navegador nao abre o PDF numa aba")
                   : falha("soltar fora da caixa tira a pessoa da pagina");

    await pg.waitForSelector("#btn-guardar", { timeout: 30000 }).catch(() => {});
    await pg.waitForTimeout(1200);
    const lido = await pg.evaluate(() => document.getElementById("m-lote")?.textContent || "");
    /6 questões/.test(lido)
      ? ok("🎉 leu a prova de bombeiro (formato 'Questão NN')", "6 questoes")
      : falha("nao leu a prova", lido.slice(0, 90));

    // ── 3. GUARDAR ────────────────────────────────────────────────────────
    console.log("\n== 3. GUARDAR NA CONTA ==");
    await pg.click("#btn-guardar");
    await pg.waitForTimeout(3000);

    const naConta = await req(
      `/rest/v1/questoes_minhas?usuario_id=eq.${ana.id}&select=origem,materia,enunciado`,
      { headers: admin });
    const linhas = naConta.corpo || [];
    linhas.length === 6
      ? ok("🎉 as 6 questões foram para a conta dela", "sem terminal, sem administrador")
      : falha("nao guardou", `${linhas.length} linhas`);
    linhas.every((l) => l.origem === "CBMERJ 2024 (teste)")
      ? ok("com a origem que ela escreveu")
      : falha("origem errada", JSON.stringify(linhas[0] || {}).slice(0, 70));
    linhas.every((l) => l.materia === "Português")
      ? ok("e a matéria saiu do próprio PDF", "Português")
      : falha("materia errada", String(linhas[0]?.materia));

    // ── 4. 🔴 A OUTRA CONTA NAO VE NADA ───────────────────────────────────
    console.log("\n== 4. A OUTRA PESSOA NAO VE ==");
    const { ctx: c2, pg: pg2 } = await abrir(bia);
    const daBia = await pg2.evaluate(() => document.getElementById("painel")?.textContent || "");
    !/CBMERJ 2024 \(teste\)/.test(daBia)
      ? ok("🎯 a tela da outra conta nao mostra nada disso", "os dois mundos nao se tocam")
      : falha("🔴 o material da Ana apareceu para a Bia");
    /0/.test((await pg2.evaluate(() => document.querySelectorAll(".aba-conta")[1]?.textContent || "")))
      ? ok("e o contador da aba dela marca zero")
      : falha("o contador da outra conta nao esta zerado");
    await c2.close();

    // ── 5. E O ACERVO PUBLICO NAO MUDOU ───────────────────────────────────
    console.log("\n== 5. O ACERVO PUBLICO SEGUE INTACTO ==");
    const pub = await req("/rest/v1/rpc/filtros_de_questoes",
      { method: "POST", headers: ana.cab, body: "{}" });
    const total = pub.corpo?.total || 0;
    const noAcervo = await req(
      "/rest/v1/questoes?select=id&enunciado=like.*lingua%20portuguesa,%20com%20tamanho*",
      { headers: admin });
    (noAcervo.corpo || []).length === 0
      ? ok("🎯 nada do material particular entrou no acervo", `o acervo segue com ${total}`)
      : falha("🔴 material particular vazou para o acervo publico");

    // ── 6. ESTUDAR COM AS PROPRIAS ────────────────────────────────────────
    console.log("\n== 6. DA PARA ESTUDAR COM ELAS ==");
    await pg.reload({ waitUntil: "load" });
    await pg.waitForSelector("#btn-estudar-minhas", { timeout: 25000 }).catch(() => {});
    await pg.waitForTimeout(800);
    await pg.click("#btn-estudar-minhas");
    await pg.waitForSelector(".questao", { timeout: 15000 }).catch(() => {});
    await pg.waitForTimeout(600);
    const naRodada = await pg.evaluate(() => document.querySelectorAll(".questao").length);
    naRodada === 6
      ? ok("🎉 a rodada usa as questões dela", `${naRodada} na tela`)
      : falha("rodada com as proprias", `${naRodada} questoes`);

    // Responder revela a resposta -- a mecanica que ele descreveu.
    await pg.evaluate(() => document.querySelector('.questao .alt[data-letra="a"]')?.click());
    await pg.waitForTimeout(400);
    const depois = await pg.evaluate(() => {
      const q = document.querySelector(".questao");
      return { veredito: q.querySelector(".veredito")?.textContent || "",
               travou: [...q.querySelectorAll(".alt")].every((b) => b.disabled) };
    });
    // 🔴 A prova deste teste vem SEM gabarito, de proposito: e o caso comum na
    // aba particular. Antes de 22/09/2026 a tela escrevia "a certa era null"
    // -- imprimir o valor interno na cara de quem estuda.
    depois.veredito && depois.travou && !/null/.test(depois.veredito)
      ? ok("🎯 responde primeiro, e só então vê o retorno", `"${depois.veredito}"`)
      : falha("a mecanica de responder nao funcionou", JSON.stringify(depois));

    /sem gabarito/i.test(depois.veredito)
      ? ok("🎯 e prova sem gabarito DIZ isso", "em vez de imprimir 'null'")
      : falha("sem gabarito mostrou outra coisa", depois.veredito);

    // ── 7. APAGAR ─────────────────────────────────────────────────────────
    console.log("\n== 7. ELA MANDA NO QUE E DELA ==");
    await pg.evaluate(() => document.querySelector("[data-apagar]")?.click());
    await pg.waitForTimeout(2500);
    const sobrou = await req(`/rest/v1/questoes_minhas?usuario_id=eq.${ana.id}&select=id`, { headers: admin });
    (sobrou.corpo || []).length === 5
      ? ok("apaga a que quiser, pela tela", "6 -> 5")
      : falha("nao apagou pela tela", `${(sobrou.corpo || []).length} sobraram`);

  } finally {
    if (ctx) await ctx.close();
    if (arquivoPdf && fs.existsSync(arquivoPdf)) fs.unlinkSync(arquivoPdf);
    for (const c of contas) await req(`/auth/v1/admin/users/${c.id}`, { method: "DELETE", headers: admin });
    console.log(`\n  (${contas.length} contas de teste apagadas)`);
    if (nav) await nav.close();
    servidor.close();
  }

  console.log("\n" + "=".repeat(72));
  console.log(falhas === 0
    ? "O ALUNO TRAZ A PROVA DELE — e ela fica so dele."
    : `🔴 ${falhas} FALHA(S).`);
  process.exit(falhas === 0 ? 0 : 1);
})();
