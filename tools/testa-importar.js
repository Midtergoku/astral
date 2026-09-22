// TESTA-IMPORTAR -- o Lucas consegue mesmo pôr uma prova no acervo sozinho?
//
// 🔴 A PERGUNTA QUE IMPORTA AQUI: ele nao roda terminal. Se a tela nao ler o
// PDF dentro do navegador, a via que ele escolheu em 21/09/2026 ("uma tela onde
// o PDF entra e sai questao classificada") nao existe -- existe uma tela bonita
// que depende de mim estar na frente, que e exatamente o que ele nao quis.
//
// Entao este teste NAO simula a leitura do PDF. Ele FABRICA UM PDF DE VERDADE,
// byte a byte, solta na tela como quem arrasta um arquivo, e confere o que
// aparece. Se o pdf.js nao funcionar, este teste falha.
//
// E confere o que mais importa depois disso: que a tela recusa quem nao e
// administrador, e que recusar na TELA nao e a defesa -- a defesa e o servidor.
const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");
const http = require("http");

const REF = "jjogmcacbdefwiwcyjxp";
const BASE = `https://${REF}.supabase.co`;
const RAIZ = path.resolve(__dirname, "..");
const PORTA = 8886;

function acharPlaywright() {
  try { return require("playwright"); } catch { /* segue procurando */ }
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
if (!pw) { console.log("TESTA-IMPORTAR -- pulado: playwright nao encontrado."); process.exit(0); }

const chaves = JSON.parse(execSync(`supabase projects api-keys --project-ref ${REF} -o json`, {
  encoding: "utf8", stdio: ["ignore", "pipe", "ignore"],
}));
const SERVICE = chaves.find((k) => k.name === "service_role").api_key;
const PUB = (fs.readFileSync(path.join(RAIZ, "assets/js/astral.js"), "utf8")
  .match(/sb_publishable_[A-Za-z0-9_-]+/) || [])[0];

let falhas = 0;
const ok = (t, d = "") => console.log(`  OK     ${t.padEnd(54)} ${d}`);
const falha = (t, d = "") => { console.log(`  FALHA  ${t.padEnd(54)} ${d}`); falhas++; };

async function req(caminho, opts) {
  const r = await fetch(`${BASE}${caminho}`, opts);
  let corpo = null;
  try { corpo = await r.json(); } catch { /* sem corpo */ }
  return { status: r.status, corpo };
}
const admin = { apikey: SERVICE, Authorization: `Bearer ${SERVICE}`, "Content-Type": "application/json" };

/* ── FABRICAR UM PDF DE VERDADE ──────────────────────────────────────────────
   Um PDF minimo, sem compressao, com o texto desenhado linha a linha. Nada de
   biblioteca: o projeto nao tem npm, e um PDF simples cabe em 40 linhas.

   O texto vai em WinAnsi (latin-1) porque e a codificacao que o Helvetica
   padrao usa -- sem isso "Português" chega no pdf.js como lixo, e o teste
   acusaria a tela por um defeito que seria meu. */
function fabricarPdf(linhas) {
  const conteudo = "BT /F1 9 Tf 40 800 Td 12 TL\n"
    + linhas.map((l) => `(${l.replace(/([\\()])/g, "\\$1")}) Tj T*`).join("\n")
    + "\nET";
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
  const posicoes = [];
  objetos.forEach((o, i) => {
    posicoes.push(buf(pdf).length);
    pdf += `${i + 1} 0 obj\n${o}\nendobj\n`;
  });
  const inicioXref = buf(pdf).length;
  pdf += `xref\n0 ${objetos.length + 1}\n0000000000 65535 f \n`
       + posicoes.map((p) => String(p).padStart(10, "0") + " 00000 n \n").join("")
       + `trailer\n<< /Size ${objetos.length + 1} /Root 1 0 R >>\n`
       + `startxref\n${inicioXref}\n%%EOF`;
  return buf(pdf);
}

// Uma prova de mentira, com os cabecalhos que a banca de verdade usa.
const LINHAS_DA_PROVA = [
  "MINISTERIO DA DEFESA - COMANDO DA AERONAUTICA",
  "GABARITO OFICIAL",
  "01 B   02 D   03 A   04 C",
  "",
  "AS QUESTOES DE 1 A 2 REFEREM-SE A LINGUA PORTUGUESA",
  "",
  "01 - Em qual alternativa o uso da crase esta correto?",
  "a) Fui a escola ontem.",
  "b) Refiro-me a aluna nova, aquela da sala ao fundo.",
  "c) Cheguei a as nove horas da manha.",
  "d) Voltei a casa dela depois do almoco.",
  "",
  "02 - Assinale a alternativa correta quanto a colocacao dos pronomes obliquos.",
  "a) Me disseram que sim, embora ninguem confirmasse.",
  "b) Disseram-me que sim, e por isso eu fui.",
  "c) Se fosse assim, tudo seria bem mais simples.",
  "d) Nos falaram disso na reuniao de ontem.",
  "",
  "AS QUESTOES DE 3 A 4 REFEREM-SE A MATEMATICA",
  "",
  "03 - O logaritmo de 1000 na base 10 e igual a:",
  "a) 3",
  "b) 2",
  "c) 10",
  "d) 1",
  "",
  "04 - Quantidade de senhas de 4 digitos distintos que podem ser formadas:",
  "a) 24",
  "b) 210",
  "c) 5040",
  "d) 4536",
];

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
  let dono = null, zeUsuario = null, nav = null;
  const paraApagar = [];
  await new Promise((r) => servidor.listen(PORTA, r));
  nav = await pw.chromium.launch();

  const criarConta = async (prefixo) => {
    const email = `${prefixo}-${Date.now()}@astral-teste.local`;
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
    return { id: c.corpo.id, email, sessao: s };
  };

  const abrir = async (conta, pagina = "importar.html") => {
    const ctx = await nav.newContext({ viewport: { width: 1280, height: 1000 } });
    await ctx.addInitScript(`(() => {
      localStorage.setItem("sb-${REF}-auth-token", JSON.stringify({
        access_token: ${JSON.stringify(conta.sessao.access_token)},
        refresh_token: ${JSON.stringify(conta.sessao.refresh_token)},
        token_type: "bearer",
        expires_at: Math.floor(Date.now()/1000) + 3600,
        user: ${JSON.stringify(conta.sessao.user)},
      }));
    })()`);
    const pg = await ctx.newPage();
    const erros = [];
    pg.on("pageerror", (e) => erros.push(String(e.message)));
    await pg.goto(`http://localhost:${PORTA}/${pagina}`, { waitUntil: "load" });
    // Espera a tela DECIDIR: ou a bancada, ou a recusa. Esperar um tempo fixo
    // media a velocidade da rede, nao o comportamento -- e foi o que aconteceu
    // na primeira execucao: as duas checagens deram falso porque a pagina
    // ainda mostrava o esqueleto.
    await pg.waitForSelector("#f-pdf, .negado", { timeout: 25000 }).catch(() => {});
    await pg.waitForTimeout(600);
    return { ctx, pg, erros };
  };

  try {
    dono = await criarConta("dono");
    zeUsuario = await criarConta("ze");
    console.log(`\nTESTA-IMPORTAR  dono ${dono.id.slice(0, 8)} · comum ${zeUsuario.id.slice(0, 8)}\n`);

    await req("/rest/v1/administradores", {
      method: "POST", headers: { ...admin, Prefer: "return=minimal" },
      body: JSON.stringify({ usuario_id: dono.id }),
    });

    // ── 1. QUEM NAO E DONO NAO VE A BANCADA ────────────────────────────────
    console.log("== 1. A PORTA ==");
    {
      const { ctx, pg } = await abrir(zeUsuario);
      const texto = await pg.textContent("#conteudo");
      const temBancada = await pg.$("#f-pdf");
      !temBancada && /não é para você/i.test(texto || "")
        ? ok("usuário comum não vê a bancada", "e a tela explica por quê")
        : falha("usuário comum viu a bancada", temBancada ? "o campo de PDF está lá" : "");
      await ctx.close();
    }

    // 🔴 E a defesa de verdade: esconder na tela nao protege nada.
    {
      const comoZe = { apikey: PUB, Authorization: `Bearer ${zeUsuario.sessao.access_token}`,
                       "Content-Type": "application/json" };
      const r = await req("/rest/v1/rpc/publicar_questoes", {
        method: "POST", headers: comoZe,
        body: JSON.stringify({ p_questoes: [{
          banca: "FRAUDE", prova: "x", ano: 2000, numero: 1, materia: "Matemática",
          enunciado: "questao enfiada na marra por quem nao e dono",
          alternativas: { a: "1", b: "2", c: "3", d: "4" }, gabarito: "a", publicada: true }] }),
      });
      r.status >= 400
        ? ok("🎯 e chamando a função direto, sem a tela?", `recusado, status ${r.status}`)
        : falha("🔴 usuário comum PUBLICOU questão", `status ${r.status}`);

      const sobrou = await req("/rest/v1/questoes?banca=eq.FRAUDE&select=id", { headers: admin });
      (sobrou.corpo || []).length === 0
        ? ok("e nada ficou gravado", "0 linhas com banca FRAUDE")
        : falha("a questão da fraude ficou no banco", `${sobrou.corpo.length} linhas`);

      const leu = await req("/rest/v1/questoes?select=id&limit=1", { headers: comoZe });
      leu.status >= 400
        ? ok("🎯 ninguém lê a tabela direto", `status ${leu.status} — o portão free/pro fica do lado de dentro`)
        : falha("🔴 a tabela é legível por PostgREST", "o acervo inteiro sairia numa requisição");
    }

    // ── 2. O DONO ABRE, E O PDF DE VERDADE E LIDO NO NAVEGADOR ─────────────
    console.log("\n== 2. O PDF ENTRA PELO NAVEGADOR ==");
    const pdf = fabricarPdf(LINHAS_DA_PROVA);
    const arquivoPdf = path.join(require("os").tmpdir(), `prova-teste-${Date.now()}.pdf`);
    fs.writeFileSync(arquivoPdf, pdf);
    paraApagar.push(arquivoPdf);
    ok("PDF fabricado para o teste", `${pdf.length} bytes, ${LINHAS_DA_PROVA.length} linhas`);

    const { ctx, pg, erros } = await abrir(dono);
    if (erros.length) falha("erro de JavaScript na tela", erros[0].slice(0, 70));

    const temCampo = await pg.$("#f-pdf");
    temCampo ? ok("o dono vê a bancada") : falha("o dono não viu a bancada");

    await pg.setInputFiles("#f-pdf", arquivoPdf);
    await pg.waitForSelector(".qcard", { timeout: 30000 }).catch(() => {});
    await pg.waitForTimeout(1500);

    const medida = await pg.evaluate(() => ({
      fichas: document.querySelectorAll(".qcard").length,
      prontas: document.querySelectorAll(".qcard.pronta").length,
      texto: document.getElementById("lote")?.textContent || "",
    }));

    medida.fichas === 4
      ? ok("🎉 o pdf.js leu o PDF DENTRO do navegador", "4 questões apareceram")
      : falha("as questões não apareceram", `${medida.fichas} fichas — ${medida.texto.slice(0, 90)}`);

    /Portugu/i.test(medida.texto) && /Matem/i.test(medida.texto)
      ? ok("a matéria saiu do próprio PDF", "Português e Matemática")
      : falha("matéria não foi lida do PDF", medida.texto.slice(0, 80));

    /Crase/i.test(medida.texto) && /Logaritmo/i.test(medida.texto)
      ? ok("🎯 e o assunto foi classificado, de graça", "Crase · Logaritmo")
      : falha("assunto não classificou", medida.texto.slice(0, 120));

    // ── 2b. ARRASTAR, E ARRASTAR TORTO ─────────────────────────────────────
    // 🔴 ELE TENTOU ARRASTAR E NAO FUNCIONOU (22/09/2026). A caixa tracejada
    // tinha 924x133px e fora dela o navegador ABRIA o PDF numa aba -- a pessoa
    // saia da pagina e parecia que nada acontecia. Agora a janela inteira
    // aceita, e este teste solta o arquivo NO CORPO DA PAGINA, de proposito
    // longe da caixa, que e o jeito errado que tem de funcionar.
    console.log("\n== 2b. ARRASTAR PARA QUALQUER LUGAR DA PAGINA ==");
    {
      await pg.reload({ waitUntil: "load" });
      await pg.waitForSelector("#f-pdf", { timeout: 25000 }).catch(() => {});
      await pg.waitForTimeout(600);

      const base64 = pdf.toString("base64");
      const soltou = await pg.evaluate(async (b64) => {
        const bin = atob(b64);
        const bytes = new Uint8Array(bin.length);
        for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
        const dt = new DataTransfer();
        dt.items.add(new File([bytes], "prova.pdf", { type: "application/pdf" }));

        // Longe da caixa: no topo da pagina, sobre o titulo.
        const alvo = document.querySelector(".page-title") || document.body;
        const over = new DragEvent("dragover", { bubbles: true, cancelable: true, dataTransfer: dt });
        alvo.dispatchEvent(over);
        const impediu = over.defaultPrevented;
        alvo.dispatchEvent(new DragEvent("drop", { bubbles: true, cancelable: true, dataTransfer: dt }));
        return { impediu };
      }, base64);

      soltou.impediu
        ? ok("🎯 o navegador NAO abre mais o PDF numa aba", "preventDefault no documento inteiro")
        : falha("🔴 soltar fora da caixa ainda tira a pessoa da pagina");

      await pg.waitForSelector(".qcard", { timeout: 30000 }).catch(() => {});
      await pg.waitForTimeout(1200);
      const lidas = await pg.evaluate(() => document.querySelectorAll(".qcard").length);
      lidas === 4
        ? ok("🎉 e o PDF solto LONGE da caixa foi lido", `${lidas} questoes, soltando sobre o titulo`)
        : falha("soltar fora da caixa nao leu o PDF", `${lidas} fichas`);
    }

    // ── 3. GRAVAR ──────────────────────────────────────────────────────────
    console.log("\n== 3. GRAVAR NO ACERVO ==");
    const marca = `TESTE-${Date.now()}`;
    await pg.fill("#f-banca", marca);
    await pg.fill("#f-prova", "CFS 1/2020");
    await pg.fill("#f-ano", "2020");
    await pg.click("#btn-gravar");
    await pg.waitForTimeout(3500);

    const gravadas = await req(
      `/rest/v1/questoes?banca=eq.${marca}&select=numero,materia,assunto,gabarito,publicada&order=numero`,
      { headers: admin });
    const linhas = gravadas.corpo || [];
    paraApagar.push(async () => req(`/rest/v1/questoes?banca=eq.${marca}`, { method: "DELETE", headers: admin }));

    linhas.length === 4
      ? ok("🎉 as 4 questões foram para o acervo", "pelo navegador, sem terminal nenhum")
      : falha("não gravou", `${linhas.length} linhas`);

    linhas.every((l) => l.publicada)
      ? ok("as marcadas entraram publicadas")
      : falha("alguma entrou despublicada");

    const q1 = linhas.find((l) => l.numero === 1);
    q1?.gabarito === "b" && q1?.materia === "Português"
      ? ok("gabarito e matéria corretos", `questão 1: ${q1.materia}, gabarito ${q1.gabarito}`)
      : falha("gabarito/matéria errados", JSON.stringify(q1));

    // Reimportar a mesma prova CORRIGE, nao duplica.
    await pg.setInputFiles("#f-pdf", arquivoPdf);
    await pg.waitForSelector(".qcard", { timeout: 30000 }).catch(() => {});
    await pg.waitForTimeout(1200);
    await pg.fill("#f-banca", marca);
    await pg.fill("#f-prova", "CFS 1/2020");
    await pg.fill("#f-ano", "2020");
    await pg.click("#btn-gravar");
    await pg.waitForTimeout(3500);

    const dePois = await req(`/rest/v1/questoes?banca=eq.${marca}&select=id`, { headers: admin });
    (dePois.corpo || []).length === 4
      ? ok("🎯 reimportar a mesma prova corrige, não duplica", "continuam 4")
      : falha("duplicou ao reimportar", `${(dePois.corpo || []).length} linhas`);

    // ── 4. E O USUARIO COMUM CONSEGUE ESTUDAR COM ELAS ─────────────────────
    console.log("\n== 4. O QUE O CONCURSEIRO RECEBE ==");
    {
      const comoZe = { apikey: PUB, Authorization: `Bearer ${zeUsuario.sessao.access_token}`,
                       "Content-Type": "application/json" };
      const r = await req("/rest/v1/rpc/sortear_questoes", {
        method: "POST", headers: comoZe,
        body: JSON.stringify({ p_banca: marca, p_limite: 10 }),
      });
      const q = r.corpo?.questoes || [];
      q.length > 0
        ? ok("o usuário comum recebe questão da amostra", `${q.length} de ${linhas.length}, plano ${r.corpo.plano}`)
        : falha("não recebeu questão nenhuma", JSON.stringify(r.corpo).slice(0, 120));

      q.every((x) => x.gabarito)
        ? ok("cada questão vem com o gabarito", "dá para corrigir na hora")
        : falha("questão sem gabarito");

      const filtros = await req("/rest/v1/rpc/filtros_de_questoes",
        { method: "POST", headers: comoZe, body: "{}" });
      const mats = (filtros.corpo?.materias || []);
      const comAssunto = mats.filter((m) => (m.assuntos || []).length);
      mats.length >= 2 && comAssunto.length >= 1
        ? ok("🎯 o filtro por ASSUNTO dentro da matéria existe",
             comAssunto.map((m) => `${m.nome}: ${m.assuntos.map((a) => a.nome).join(", ")}`).join(" | ").slice(0, 60))
        : falha("filtros vieram vazios", JSON.stringify(filtros.corpo).slice(0, 120));
    }

    await ctx.close();

  } finally {
    for (const x of paraApagar) {
      if (typeof x === "function") { try { await x(); } catch { /* segue */ } }
      else if (fs.existsSync(x)) fs.unlinkSync(x);
    }
    for (const u of [dono, zeUsuario]) {
      if (u) await req(`/auth/v1/admin/users/${u.id}`, { method: "DELETE", headers: admin });
    }
    console.log("\n  (contas e questões de teste apagadas)");
    if (nav) await nav.close();
    servidor.close();
  }

  console.log("\n" + "=".repeat(72));
  console.log(falhas === 0
    ? "ELE CONSEGUE SOZINHO — o PDF entra pelo navegador e sai no acervo."
    : `🔴 ${falhas} FALHA(S).`);
  process.exit(falhas === 0 ? 0 : 1);
})();
