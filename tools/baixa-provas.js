// BAIXA-PROVAS -- traz os PDFs de provas militares antigas para o disco.
//
//   node tools/baixa-provas.js            baixa o que falta
//   node tools/baixa-provas.js --listar   so mostra o que ja tem, sem baixar
//
// 🔴 ONDE OS ARQUIVOS FICAM, e por que NAO e dentro do projeto:
// `../ASTRAL-provas`, irmao da pasta do projeto. O repositorio e PUBLICO e
// cada prova tem ~500 KB -- cem provas seriam 50 MB de binario num repositorio
// de HTML. E o git nao sabe versionar PDF: cada nova versao guarda o arquivo
// inteiro de novo. Mesma decisao do `tools/backup.js`.
//
// ── SOBRE A ORIGEM ──────────────────────────────────────────────────────────
// Prova de concurso publico e DOCUMENTO PUBLICO. A maioria destes enderecos e
// do proprio servidor da instituicao (ingresso.eear.fab.mil.br, esa.eb.mil.br).
// Onde nao havia copia oficial acessivel, o endereco aponta para onde a prova
// esta publicada abertamente.
//
// ── COMO ELE SE COMPORTA ────────────────────────────────────────────────────
// - Pausa entre os pedidos. Nao se martela servidor de orgao publico.
// - Nao rebaixa o que ja esta no disco -- rodar de novo so busca o que falta.
// - Confere que o que chegou COMECA COM %PDF. Servidor fora do ar costuma
//   devolver uma pagina de erro com status 200, e um HTML salvo com nome .pdf
//   e pior que arquivo nenhum: ele passa despercebido ate a hora de ler.
const fs = require("fs");
const path = require("path");

const RAIZ = path.resolve(__dirname, "..");
const DESTINO = path.resolve(RAIZ, "..", "ASTRAL-provas");
const LISTA = path.join(RAIZ, "tools", "provas-conhecidas.json");
const SO_LISTAR = process.argv.includes("--listar");

if (!fs.existsSync(LISTA)) {
  console.log("🔴 falta tools/provas-conhecidas.json -- e ele que diz o que baixar.");
  process.exit(1);
}
const provas = JSON.parse(fs.readFileSync(LISTA, "utf8"));

fs.mkdirSync(DESTINO, { recursive: true });

const pausa = (ms) => new Promise((r) => setTimeout(r, ms));
const nomeDe = (p) => `${p.banca}_${p.ano}_${p.prova}`.replace(/[^\w.-]+/g, "-") + ".pdf";

async function baixar(url) {
  const c = new AbortController();
  const t = setTimeout(() => c.abort(), 90000);
  try {
    const r = await fetch(url, {
      signal: c.signal,
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" },
    });
    if (!r.ok) return { erro: `HTTP ${r.status}` };
    const buf = Buffer.from(await r.arrayBuffer());
    // 🔴 A checagem que evita salvar pagina de erro com nome de PDF.
    if (buf.slice(0, 4).toString() !== "%PDF") {
      return { erro: `nao e PDF (comeca com ${JSON.stringify(buf.slice(0, 8).toString("latin1"))})` };
    }
    if (buf.length < 20000) return { erro: `PDF pequeno demais (${buf.length} bytes)` };
    return { buf };
  } catch (e) {
    return { erro: String(e.message || e).slice(0, 60) };
  } finally { clearTimeout(t); }
}

(async () => {
  console.log(`\nBAIXA-PROVAS  ${provas.length} enderecos conhecidos`);
  console.log(`destino: ${DESTINO}\n`);

  let jaTinha = 0, baixadas = 0, falharam = 0, bytes = 0;
  const problemas = [];

  for (const p of provas) {
    const alvo = path.join(DESTINO, nomeDe(p));

    if (fs.existsSync(alvo) && fs.statSync(alvo).size > 20000) {
      jaTinha++; bytes += fs.statSync(alvo).size;
      if (SO_LISTAR) console.log(`  ja tem  ${p.banca} ${p.prova} ${p.ano}`);
      continue;
    }
    if (SO_LISTAR) { console.log(`  FALTA   ${p.banca} ${p.prova} ${p.ano}`); continue; }

    const r = await baixar(p.url);
    if (r.erro) {
      falharam++;
      problemas.push({ ...p, erro: r.erro });
      console.log(`  🔴 ${String(p.banca).padEnd(8)} ${String(p.prova).padEnd(12)} ${p.ano}  ${r.erro}`);
    } else {
      fs.writeFileSync(alvo, r.buf);
      baixadas++; bytes += r.buf.length;
      console.log(`  ✔  ${String(p.banca).padEnd(8)} ${String(p.prova).padEnd(12)} ${p.ano}  ${(r.buf.length / 1024).toFixed(0)} KB`);
    }
    await pausa(700);   // nao martelar servidor publico
  }

  console.log(`\n  ja tinha    ${jaTinha}`);
  if (!SO_LISTAR) {
    console.log(`  baixadas    ${baixadas}`);
    console.log(`  falharam    ${falharam}`);
  }
  console.log(`  no disco    ${((bytes) / 1024 / 1024).toFixed(1)} MB em ${DESTINO}`);

  if (problemas.length) {
    const arq = path.join(DESTINO, "_nao-baixaram.json");
    fs.writeFileSync(arq, JSON.stringify(problemas, null, 2), "utf8");
    console.log(`\n  🔴 ${problemas.length} nao vieram. A lista esta em ${arq}`);
    console.log("     Endereco de prova antiga muda de lugar; isto e esperado, nao e defeito.");
  }
  console.log("\n  Proximo passo: node tools/importa-provas.js\n");
})();
